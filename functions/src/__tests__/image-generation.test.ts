import { generateImage } from '../image-generation';

// Mock fetch globally
global.fetch = jest.fn();

describe('Image Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateImage', () => {
    it('should generate image successfully', async () => {
      // Set API key for this test
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-api-key';

      const mockResponse = {
        output: [
          {
            type: 'image_generation_call',
            result: 'base64-encoded-image-data',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateImage({
        prompt: { id: 'test-prompt-id' },
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Create an image' },
            ],
          },
        ],
      });

      expect(result).toBe('base64-encoded-image-data');
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
        generateImage({
          prompt: { id: 'test-prompt-id' },
          input: [
            {
              role: 'user',
              content: [{ type: 'input_text', text: 'Create an image' }],
            },
          ],
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
        generateImage({
          prompt: { id: 'test-prompt-id' },
          input: [
            {
              role: 'user',
              content: [{ type: 'input_text', text: 'Create an image' }],
            },
          ],
        })
      ).rejects.toThrow('OpenAI API error: 400 - Invalid request');

      // Restore original key
      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should throw error when no image result in response', async () => {
      // Set API key for this test
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'Some text' }],
            },
          ],
        }),
      });

      await expect(
        generateImage({
          prompt: { id: 'test-prompt-id' },
          input: [
            {
              role: 'user',
              content: [{ type: 'input_text', text: 'Create an image' }],
            },
          ],
        })
      ).rejects.toThrow('No image result found in response');

      // Restore original key
      process.env.OPENAI_API_KEY = originalKey;
    });
  });
});

