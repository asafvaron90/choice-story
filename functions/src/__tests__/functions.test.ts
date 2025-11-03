import { generateStoryPagesText, generateKidAvatarImage, generateStoryPageImage, generateStoryCoverImage } from '../index';

// Mock the helper functions
jest.mock('../text-generation', () => ({
  generateText: jest.fn(),
}));

jest.mock('../image-generation', () => ({
  generateImage: jest.fn(),
}));

import { generateText } from '../text-generation';
import { generateImage } from '../image-generation';

// Mock admin first before importing index
jest.mock('firebase-admin', () => {
  const mockFirestore: any = {
    collection: jest.fn(() => mockFirestore),
    doc: jest.fn(() => mockFirestore),
    add: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  };

  const mockStorage = {
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        save: jest.fn(),
        makePublic: jest.fn(),
      })),
    })),
  };

  const mockApp = {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => mockFirestore),
    storage: jest.fn(() => mockStorage),
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
  };

  return {
    __esModule: true,
    default: mockApp,
    initializeApp: jest.fn(() => mockApp),
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => 'server-timestamp'),
      },
    },
  };
});

describe('Cloud Functions', () => {
  const mockContext = {
    auth: {
      uid: 'test-user-id',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateStoryPagesText', () => {
    it('should generate and save story text successfully', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        name: 'John',
        problemDescription: 'Test problem',
        title: 'Test Story',
        age: 8,
        advantages: 'Good things',
        disadvantages: 'Bad things',
        accountId: 'account-123',
        userId: 'user-456',
        storyId: 'story-789',
      };

      (generateText as jest.Mock).mockResolvedValue('Generated story text');

      const result = await (generateStoryPagesText as any).run(mockData, mockContext);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Generated story text');
      expect(result.storyId).toBe('story-789');
      expect(generateText).toHaveBeenCalledWith({
        prompt: { id: 'test-prompt-id' },
        input: expect.stringContaining('John'),
      });
    });

    it('should throw error when user is not authenticated', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        name: 'John',
        problemDescription: 'Test problem',
        title: 'Test Story',
        age: 8,
        advantages: 'Good things',
        disadvantages: 'Bad things',
        accountId: 'account-123',
        userId: 'user-456',
        storyId: 'story-789',
      };

      await expect(
        (generateStoryPagesText as any).run(mockData, { auth: null })
      ).rejects.toThrow('User must be authenticated');
    });

    it('should throw error when required fields are missing', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        // Missing other required fields
      };

      await expect(
        (generateStoryPagesText as any).run(mockData, mockContext)
      ).rejects.toThrow('All fields are required');
    });
  });

  describe('generateKidAvatarImage', () => {
    it('should generate and save avatar successfully', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        imageUrl: 'https://example.com/kid-photo.jpg',
        accountId: 'account-123',
        userId: 'user-456',
      };

      (generateImage as jest.Mock).mockResolvedValue('base64-image-data');

      const result = await (generateKidAvatarImage as any).run(mockData, mockContext);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('storage.googleapis.com');
      expect(generateImage).toHaveBeenCalled();
    });

    it('should throw error when required fields are missing', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        // Missing other required fields
      };

      await expect(
        (generateKidAvatarImage as any).run(mockData, mockContext)
      ).rejects.toThrow('promptId, imageUrl, accountId, and userId are required');
    });
  });

  describe('generateStoryPageImage', () => {
    it('should generate and save page image successfully', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        imagePrompt: 'A beautiful scene',
        accountId: 'account-123',
        userId: 'user-456',
        storyId: 'story-789',
        pageNum: 1,
      };

      (generateImage as jest.Mock).mockResolvedValue('base64-image-data');

      const result = await (generateStoryPageImage as any).run(mockData, mockContext);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('storage.googleapis.com');
      expect(result.pageNum).toBe(1);
      expect(generateImage).toHaveBeenCalled();
    });

    it('should throw error when required fields are missing', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        // Missing other required fields
      };

      await expect(
        (generateStoryPageImage as any).run(mockData, mockContext)
      ).rejects.toThrow('promptId, imagePrompt, accountId, userId, storyId, and pageNum are required');
    });
  });

  describe('generateStoryCoverImage', () => {
    it('should generate and save cover image successfully', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        title: 'Test Story',
        characterDescription: 'A brave kid',
        accountId: 'account-123',
        userId: 'user-456',
        storyId: 'story-789',
      };

      (generateImage as jest.Mock).mockResolvedValue('base64-image-data');

      const result = await (generateStoryCoverImage as any).run(mockData, mockContext);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('storage.googleapis.com');
      expect(generateImage).toHaveBeenCalled();
    });

    it('should throw error when required fields are missing', async () => {
      const mockData = {
        promptId: 'test-prompt-id',
        // Missing other required fields
      };

      await expect(
        (generateStoryCoverImage as any).run(mockData, mockContext)
      ).rejects.toThrow('promptId, title, characterDescription, accountId, userId, and storyId are required');
    });
  });
});

