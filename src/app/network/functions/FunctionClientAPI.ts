import { httpsCallable, FunctionsError } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { functions } from '../../../../firebase';
import { getFirebaseEnvironment } from '../../../config/build-config';

/**
 * Function Client API
 * Provides a clean, type-safe interface to call Firebase Cloud Functions
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the function name based on Firebase environment
 * Returns dev{BaseName} if environment is "development", otherwise returns baseName
 * 
 * This uses getFirebaseEnvironment() which checks:
 * 1. NEXT_PUBLIC_FIREBASE_ENV environment variable
 * 2. Hostname (staging domains use development functions)
 * 3. NODE_ENV as fallback
 */
function getFunctionName(baseName: string): string {
  const environment = getFirebaseEnvironment();
  if (environment === 'development') {
    // Convert to camelCase: generateStoryTitles -> devGenerateStoryTitles
    const capitalizedBase = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    return `dev${capitalizedBase}`;
  }
  return baseName;
}

// ============================================================================
// TYPES
// ============================================================================

export interface StoryPagesTextRequest {
  name: string;
  problemDescription: string;
  title: string;
  age: number;
  advantages: string;
  disadvantages: string;
  accountId: string;
  userId: string;
  storyId?: string; // Optional: not available when initially generating the story
}

export interface StoryPagesTextResponse {
  success: boolean;
  text: string;
  storyId?: string; // Optional: may not be available when initially generating the story
}

export interface StoryImagePromptRequest {
  pageText: string;
  pageType: 'normal' | 'good_choice' | 'bad_choice' | 'good' | 'bad';
  pageNum: number;
  gender?: 'male' | 'female';
  age?: number;
  // Optional parameters for saving prompt to Firestore
  accountId?: string;
  userId?: string;
  storyId?: string;
  updatePath?: string;
}

export interface StoryImagePromptResponse {
  success: boolean;
  imagePrompt: string;
}

export interface MultipleStoryImagePromptsRequest {
  pages: Array<{
    pageNum: number;
    pageType: string;
    storyText: string;
  }>;
}

export interface MultipleStoryImagePromptsResult {
  pageNum: number;
  pageType: string;
  storyText: string;
  imagePrompt: string;
  success: boolean;
  error?: string;
}

export interface MultipleStoryImagePromptsResponse {
  success: boolean;
  results: MultipleStoryImagePromptsResult[];
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  pages?: Array<{
    pageNum: number;
    pageType: string;
    storyText?: string;
    text?: string; // Handle both field names from AI response
    imagePrompt: string;
  }>; // Complete parsed pages array returned by AI
}

export interface KidAvatarImageRequest {
  imageUrl: string;
  accountId: string;
  userId: string;
}

export interface KidAvatarImageResponse {
  success: boolean;
  imageUrl: string;
}

export interface StoryPageImageRequest {
  imagePrompt: string;
  imageUrl: string;
  accountId: string;
  userId: string;
  storyId: string;
  pageNum?: number;
  updatePath?: string; // Add updatePath parameter
}

export interface StoryPageImageResponse {
  success: boolean;
  imageUrl: string;
}

export interface StoryCoverImageRequest {
  title: string;
  characterDescription: string;
  imageUrl: string;
  accountId: string;
  userId: string;
  storyId: string;
}

export interface StoryCoverImageResponse {
  success: boolean;
  imageUrl: string;
}

export interface StoryTitlesRequest {
  name: string;
  gender: 'male' | 'female';
  problemDescription: string;
  age: number;
  advantages?: string;
  disadvantages?: string;
}

export interface StoryTitlesResponse {
  success: boolean;
  titles: string[];
}

export interface GenerateImagePromptAndImageRequest {
  // Image prompt generation parameters
  pageText: string;
  pageNum?: number;
  gender?: 'male' | 'female';
  age?: number;
  
  // Image generation parameters
  imageUrl: string;
  accountId: string;
  userId: string;
  storyId: string;
  updatePath?: string;
}

export interface GenerateImagePromptAndImageResponse {
  success: boolean;
  imagePrompt: string;
  imageUrl: string;
}

export interface GenerateFullStoryRequest {
  userId: string;
  kidId: string;
  problemDescription: string;
  advantages?: string;
  disadvantages?: string;
}

export interface GenerateFullStoryResponse {
  success: boolean;
  storyId: string;
  title: string;
  pagesCount: number;
  imagesGenerated?: number;
  imageResults?: Array<{
    pageNum: number;
    success: boolean;
    imageUrl?: string;
    error?: string;
  }>;
  message: string;
}

// ============================================================================
// FUNCTION CLIENT CLASS
// ============================================================================

export class FunctionClientAPI {
  private functionsInstance: ReturnType<typeof import('firebase/functions').getFunctions> | null;

  constructor() {
    this.functionsInstance = functions;
  }

  private ensureFunctionsInitialized() {
    if (!this.functionsInstance) {
      throw new Error('Firebase Functions is not initialized. Please check your Firebase configuration.');
    }
    return this.functionsInstance;
  }

  /**
   * Generate Story Pages Text
   * Generates complete story pages with text and image prompts
   */
  async generateStoryPagesText(
    request: StoryPagesTextRequest
  ): Promise<StoryPagesTextResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateStoryPagesText = httpsCallable<
        StoryPagesTextRequest,
        StoryPagesTextResponse
      >(functionsInstance, getFunctionName('generateStoryPagesText'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateStoryPagesText(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Story Image Prompt
   * Generates image prompt for a specific story page
   */
  async generateStoryImagePrompt(
    request: StoryImagePromptRequest
  ): Promise<StoryImagePromptResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateStoryImagePrompt = httpsCallable<
        StoryImagePromptRequest,
        StoryImagePromptResponse
      >(functionsInstance, getFunctionName('generateStoryImagePrompt'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateStoryImagePrompt(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Multiple Story Image Prompts
   * Generates image prompts for multiple story pages at once
   * Uses the unified generateStoryImagePrompt function with pages parameter
   */
  async generateMultipleStoryImagePrompts(
    request: MultipleStoryImagePromptsRequest
  ): Promise<MultipleStoryImagePromptsResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateStoryImagePrompt = httpsCallable<
        MultipleStoryImagePromptsRequest,
        MultipleStoryImagePromptsResponse
      >(functionsInstance, getFunctionName('generateStoryImagePrompt'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateStoryImagePrompt(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Kid Avatar Image
   * Generates a Pixar-style avatar image for a kid
   */
  async generateKidAvatarImage(
    request: KidAvatarImageRequest
  ): Promise<KidAvatarImageResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateKidAvatarImage = httpsCallable<
        KidAvatarImageRequest,
        KidAvatarImageResponse
      >(functionsInstance, getFunctionName('generateKidAvatarImage'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateKidAvatarImage(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Story Page Image
   * Generates an image for a specific story page
   */
  async generateStoryPageImage(
    request: StoryPageImageRequest
  ): Promise<StoryPageImageResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateStoryPageImage = httpsCallable<
        StoryPageImageRequest,
        StoryPageImageResponse
      >(functionsInstance, getFunctionName('generateStoryPageImage'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateStoryPageImage(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Story Cover Image
   * Generates a cover image for a story
   */
  async generateStoryCoverImage(
    request: StoryCoverImageRequest
  ): Promise<StoryCoverImageResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateStoryCoverImage = httpsCallable<
        StoryCoverImageRequest,
        StoryCoverImageResponse
      >(functionsInstance, getFunctionName('generateStoryCoverImage'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateStoryCoverImage(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Story Titles
   * Generates story titles using the STORY_TITLES_TEXT agent
   */
  async generateStoryTitles(
    request: StoryTitlesRequest
  ): Promise<StoryTitlesResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateStoryTitles = httpsCallable<
        StoryTitlesRequest,
        StoryTitlesResponse
      >(functionsInstance, getFunctionName('generateStoryTitles'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateStoryTitles(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Image Prompt and Image (Combined)
   * First generates an image prompt for a story page, then generates the image using that prompt
   * This combines generateStoryImagePrompt and generateStoryPageImage into a single call
   */
  async generateImagePromptAndImage(
    request: GenerateImagePromptAndImageRequest
  ): Promise<GenerateImagePromptAndImageResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateImagePromptAndImage = httpsCallable<
        GenerateImagePromptAndImageRequest,
        GenerateImagePromptAndImageResponse
      >(functionsInstance, getFunctionName('generateImagePromptAndImage'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateImagePromptAndImage(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate Full Story (Complete End-to-End)
   * Generates a complete story including title generation, story text, saving to Firestore,
   * and all page images in a single Firebase function call
   */
  async generateFullStory(
    request: GenerateFullStoryRequest
  ): Promise<GenerateFullStoryResponse> {
    try {
      const functionsInstance = this.ensureFunctionsInitialized();
      const generateFullStory = httpsCallable<
        GenerateFullStoryRequest,
        GenerateFullStoryResponse
      >(functionsInstance, getFunctionName('generateFullStory'), {
        timeout: 540000 // 540 seconds (9 minutes) to match server timeout
      });

      const result = await generateFullStory(request);
      return result.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle Firebase Functions errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof FunctionsError) {
      // Firebase Functions specific error
      switch (error.code) {
        case 'unauthenticated':
          return new Error('You must be logged in to perform this action');
        case 'permission-denied':
          return new Error('You do not have permission to perform this action');
        case 'invalid-argument':
          return new Error(error.message || 'Invalid request parameters');
        case 'not-found':
          return new Error('Function not found');
        case 'already-exists':
          return new Error('Resource already exists');
        case 'resource-exhausted':
          return new Error('Service temporarily unavailable. Please try again later');
        case 'failed-precondition':
          return new Error('Operation cannot be completed at this time');
        case 'aborted':
          return new Error('Operation was cancelled');
        case 'out-of-range':
          return new Error('Request is out of valid range');
        case 'unimplemented':
          return new Error('This feature is not yet implemented');
        case 'internal':
          return new Error('An internal error occurred. Please try again');
        case 'unavailable':
          return new Error('Service is currently unavailable. Please try again later');
        case 'data-loss':
          return new Error('Data loss occurred. Please try again');
        case 'deadline-exceeded':
          return new Error('Request timed out. Please try again');
        default:
          return new Error(error.message || 'An unknown error occurred');
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('An unknown error occurred');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const auth = getAuth();
    return auth.currentUser !== null;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    const auth = getAuth();
    return auth.currentUser?.uid || null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let functionClientAPIInstance: FunctionClientAPI | null = null;

/**
 * Get the singleton instance of FunctionClientAPI
 */
export function getFunctionClientAPI(): FunctionClientAPI {
  if (!functionClientAPIInstance) {
    functionClientAPIInstance = new FunctionClientAPI();
  }
  return functionClientAPIInstance;
}

// Export singleton instance as default
export default getFunctionClientAPI();

