import { generateText } from '../text-generation';

// Mock fetch globally
global.fetch = jest.fn();

describe('Text Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      // Set API key for this test
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-api-key';

      const mockResponse = {
        output: [
          {
            content: [
              {
                text: 'Generated story text',
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateText({
        prompt: { id: 'test-prompt-id' },
        input: 'Test input',
      });

      expect(result).toBe('Generated story text');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
        })
      );

      // Restore original key
      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should throw error when API key is missing', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      await expect(
        generateText({
          prompt: { id: 'test-prompt-id' },
          input: 'Test input',
        })
      ).rejects.toThrow('OPENAI_API_KEY is not set');

      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should throw error when API returns error', async () => {
      // Set API key for this test
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid request' },
        }),
      });

      await expect(
        generateText({
          prompt: { id: 'test-prompt-id' },
          input: 'Test input',
        })
      ).rejects.toThrow('OpenAI API error: 400 - Invalid request');

      // Restore original key
      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should throw error when no text content in response', async () => {
      // Set API key for this test
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: [],
        }),
      });

      await expect(
        generateText({
          prompt: { id: 'test-prompt-id' },
          input: 'Test input',
        })
      ).rejects.toThrow('No text content found in response');

      // Restore original key
      process.env.OPENAI_API_KEY = originalKey;
    });
  });
});

