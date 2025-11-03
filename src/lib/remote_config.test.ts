import { getRemoteConfigValue } from './remote_config';

// Mock the window object for testing
const mockWindow = global.window;

describe('Remote Config', () => {
  beforeEach(() => {
    // Reset window object before each test
    delete (global as Record<string, unknown>).window;
  });

  afterEach(() => {
    // Restore window object after each test
    if (mockWindow) {
      (global as Record<string, unknown>).window = mockWindow;
    }
  });

  describe('Server-side execution', () => {
    it('should return default values when window is undefined', async () => {
      // Simulate server-side environment
      delete (global as Record<string, unknown>).window;
      
      const result = await getRemoteConfigValue('ai_full_story_text_request_prompt');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty string for unknown keys', async () => {
      // Simulate server-side environment
      delete (global as Record<string, unknown>).window;
      
      const result = await getRemoteConfigValue('unknown_key');
      
      expect(result).toBe('');
    });
  });

  describe('Client-side execution', () => {
    it('should work when window is defined', async () => {
      // Simulate client-side environment
      (global as Record<string, unknown>).window = {};
      
      const result = await getRemoteConfigValue('ai_full_story_text_request_prompt');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
}); 