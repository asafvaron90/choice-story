import { ensurePromptLength, MAX_PROMPT_LENGTH } from '../prompt-summarizer';

// Mock the environment variable for testing
process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-key';

describe('Prompt Summarizer', () => {
  describe('ensurePromptLength', () => {
    it('should return original prompt if under limit', async () => {
      const shortPrompt = 'A beautiful children\'s book illustration showing a happy child playing in the garden.';
      const result = await ensurePromptLength(shortPrompt);
      expect(result).toBe(shortPrompt);
    });

    it('should handle prompts at exactly the limit', async () => {
      const exactLimitPrompt = 'A'.repeat(MAX_PROMPT_LENGTH);
      const result = await ensurePromptLength(exactLimitPrompt);
      expect(result).toBe(exactLimitPrompt);
    });

    it('should provide fallback truncation when Gemini API fails', async () => {
      // Create a prompt that's over the limit
      const longPrompt = 'A'.repeat(MAX_PROMPT_LENGTH + 1000);
      
      // Mock the Gemini API to throw an error
      jest.mock('@google/generative-ai', () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockImplementation(() => ({
            generateContent: jest.fn().mockRejectedValue(new Error('API Error'))
          }))
        }))
      }));

      const result = await ensurePromptLength(longPrompt);
      
      // Should fallback to truncation
      expect(result.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('MAX_PROMPT_LENGTH constant', () => {
    it('should be set to 4000', () => {
      expect(MAX_PROMPT_LENGTH).toBe(4000);
    });
  });
});

// Example of a long prompt that would trigger summarization
export const EXAMPLE_LONG_PROMPT = `
Create a vibrant, detailed children's book illustration in a whimsical, colorful cartoon style. The scene shows a curious 8-year-old girl with curly brown hair wearing a bright red dress with white polka dots and yellow sneakers. She is standing in a magical enchanted forest filled with towering ancient oak trees with thick, gnarled trunks covered in emerald green moss and tiny glowing mushrooms that emit a soft blue light. The forest floor is carpeted with fallen autumn leaves in brilliant shades of orange, red, gold, and amber, creating a crunchy pathway that winds through the trees.

In the background, there are majestic mountains with snow-capped peaks that stretch up into a clear azure sky dotted with fluffy white clouds that look like cotton balls. A gentle stream meanders through the forest, its crystal-clear water reflecting the dappled sunlight that filters through the canopy of leaves above. Along the stream's banks grow wild flowers in every color imaginable - purple violets, yellow daffodils, pink roses, and white daisies that sway gently in the warm breeze.

The girl is reaching out her hand toward a magnificent butterfly with iridescent wings that shimmer with rainbow colors - deep blues, vibrant purples, emerald greens, and golden yellows that catch the light and sparkle like precious gems. The butterfly appears to be dancing in the air, creating a magical moment of connection between the child and nature.

Scattered around the forest scene are various woodland creatures: a friendly red squirrel with a bushy tail sitting on a low branch holding an acorn, a family of rabbits with soft gray fur hopping playfully among the ferns, and a wise old owl with large amber eyes perched high in the trees, watching over the peaceful scene with a gentle expression.

The lighting in the illustration should be warm and inviting, with golden sunbeams streaming through the leaves, creating a dappled pattern of light and shadow on the forest floor. The overall atmosphere should convey wonder, magic, and the joy of discovering nature's beauty. The art style should be reminiscent of classic children's book illustrations with soft, rounded shapes, bright but harmonious colors, and an overall sense of warmth and safety that would appeal to young readers.

Include small magical details throughout the scene: tiny fairy lights twinkling among the leaves, flower petals floating gently through the air, and perhaps a rainbow arcing across the sky in the distance. The composition should draw the viewer's eye to the central interaction between the girl and the butterfly while also inviting exploration of all the wonderful details hidden throughout the magical forest setting.

The illustration should capture a moment of pure childhood wonder and curiosity, encouraging young readers to appreciate the beauty and magic that can be found in the natural world around them. Every element should contribute to creating a sense of adventure, discovery, and the timeless appeal of exploring the great outdoors.
`.trim();

console.log(`Example long prompt length: ${EXAMPLE_LONG_PROMPT.length} characters`);
