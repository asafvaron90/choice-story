import { Gender, KidDetails, Name } from '@/models';
import { apiClient } from './NetworkClient';
import { ApiResponse } from '@/models';
import { PromptTemplates } from '../_lib/services/prompt-templates';
import functionClientAPI from './functions/FunctionClientAPI';

export interface ImageGenerationResult {
  success: boolean;
  data?: string[];
  error?: string;
}

export interface ImageGenerationOptions {
  userId: string;
  kidDetails: KidDetails;
  storyId?: string; // Make optional since not all generation requires a story
  prompt: string;
  outputCount?: number;
  parameters?: {
    size?: string;
    style?: string;
    quality?: string;
    model?: string;
  };
  folderPath?: string;
  updatePath?: string; // Add updatePath parameter
  environment?: 'development' | 'production'; // Required for story images
}

export interface CombinedImageGenerationOptions {
  userId: string;
  kidDetails: KidDetails;
  storyId: string;
  pageText: string;
  pageNum?: number;
  updatePath?: string;
  environment: 'development' | 'production';
}

/**
 * ImageGenerationApi - Single entry point for all image generation using new AI bot API
 * Uses the same API as ai-bots-test page for consistency
 */
export class ImageGenerationApi {
  private static readonly AI_BOT_STORY_IMAGE_ENDPOINT = '/api/ai-bots/story-image';
  private static readonly AI_BOT_AVATAR_ENDPOINT = '/api/ai-bots/avatar';
  
  /**
   * Generate image with prompt in one call using the new combined Firebase function
   * This method generates both the image prompt and the image in a single API call
   * 
   * @param options Combined image generation options including pageText
   * @returns Promise with success/error result and image URLs
   */
  static async generateImageWithPrompt(options: CombinedImageGenerationOptions): Promise<ImageGenerationResult> {
    const { userId, kidDetails, storyId, pageText, pageNum, updatePath, environment } = options;

    // Validate required parameters
    if (!userId || !kidDetails || !pageText || !storyId || !environment) {
      return {
        success: false,
        error: "Missing required parameters: userId, kidDetails, pageText, storyId, or environment"
      };
    }

    try {
      console.log("[ImageGeneration] Using combined generateImagePromptAndImage function");
      
      const request = {
        // Image prompt generation parameters
        pageText,
        pageNum,
        gender: kidDetails.gender,
        age: kidDetails.age,
        
        // Image generation parameters
        imageUrl: kidDetails.avatarUrl || "",
        accountId: userId,
        userId: userId,
        storyId: storyId,
        updatePath: updatePath,
        environment: environment
      };
      
      console.log("[ImageGeneration] Calling Firebase generateImagePromptAndImage with:", request);
      const response = await functionClientAPI.generateImagePromptAndImage(request);
      
      console.log("[ImageGeneration] Firebase combined function response:", response);
      
      if (!response.success || !response.imageUrl) {
        return {
          success: false,
          error: "Failed to generate image with combined function"
        };
      }

      console.log("[ImageGeneration] Successfully generated image:", response.imageUrl);
      console.log("[ImageGeneration] Generated prompt:", response.imagePrompt);

      // Return array format for consistency with existing code
      return {
        success: true,
        data: [response.imageUrl]
      };
    } catch (error) {
      console.error("[ImageGeneration] Error generating image with combined function:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Main image generation function using Firebase Functions
   * 
   * @param options Image generation options
   * @returns Promise with success/error result and image URLs
   */
  static async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const { userId, kidDetails, storyId, prompt, parameters, folderPath } = options;

    // Validate required parameters
    if (!userId || !kidDetails || !prompt) {
      return {
        success: false,
        error: "Missing required parameters: userId, kidDetails, or prompt"
      };
    }

    try {
      console.log("[ImageGeneration] Using Firebase Functions with prompt:", prompt.substring(0, 100) + "...");
      
      // Determine if this is avatar generation or story image generation
      const isAvatarGeneration = folderPath?.includes('avatar') || prompt.toLowerCase().includes('avatar');
      
      let response;
      if (isAvatarGeneration) {
        // Generate avatar using Firebase function
        const avatarRequest = {
          imageUrl: kidDetails.avatarUrl || "", // Use kid's avatar as reference
          accountId: userId, // Using userId as accountId for now
          userId: userId
        };
        
        console.log("[ImageGeneration] Calling Firebase generateKidAvatarImage with:", avatarRequest);
        response = await functionClientAPI.generateKidAvatarImage(avatarRequest);
      } else {
        // Generate story image using Firebase function
        // Validate that storyId is present for story image generation
        if (!storyId) {
          return {
            success: false,
            error: "storyId is required for story image generation"
          };
        }
        
        // Validate that environment is present for story image generation
        if (!options.environment) {
          return {
            success: false,
            error: "environment is required for story image generation"
          };
        }
        
        const storyImageRequest = {
          imagePrompt: prompt,
          imageUrl: kidDetails.avatarUrl || "", // Use kid's avatar as reference
          accountId: userId, // Using userId as accountId for now
          userId: userId,
          storyId: storyId,
          updatePath: options.updatePath, // Pass updatePath if provided
          environment: options.environment
        };
        
        console.log("[ImageGeneration] Calling Firebase generateStoryPageImage with:", storyImageRequest);
        console.log("[ImageGeneration] storyId received:", storyId, "type:", typeof storyId);
        response = await functionClientAPI.generateStoryPageImage(storyImageRequest);
      }
      
      console.log("[ImageGeneration] Firebase function response:", response);
      
      if (!response.success || !response.imageUrl) {
        return {
          success: false,
          error: "Failed to generate image with Firebase function"
        };
      }

      console.log("[ImageGeneration] Successfully generated image:", response.imageUrl);

      // Return array format for consistency with existing code
      return {
        success: true,
        data: [response.imageUrl]
      };
    } catch (error) {
      console.error("[ImageGeneration] Error generating image with Firebase function:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Generate avatar image
   */
  static async generateAvatarImage(userId: string, kidDetails: KidDetails, characteristics: string): Promise<ImageGenerationResult> {
    const prompt = PromptTemplates.AVATAR_BASE_PROMPT(kidDetails.age, kidDetails.gender, characteristics);
    
    return this.generateImage({
      userId,
      kidDetails,
      prompt,
      outputCount: 2,
      folderPath: `users/${userId}/avatars`,
      parameters: {
        model: 'dall-e-3',
        quality: 'hd',
        style: 'vivid',
        size: '1024x1024'
      }
    });
  }

  /**
   * Generate story image (cover, pages, etc.)
   */
  static async generateStoryImage(
    userId: string, 
    kidDetails: KidDetails, 
    customPrompt: string
  ): Promise<ImageGenerationResult> {
    const finalPrompt = `Create img vibrant, Pixar-like 3D style: ${customPrompt}. Make it engaging and appropriate for a ${kidDetails.age}-year-old ${kidDetails.gender}.`;
    
    return this.generateImage({
      userId,
      kidDetails,
      prompt: finalPrompt,
      outputCount: 1,
      folderPath: `users/${userId}/stories`,
      parameters: {
        model: 'dall-e-3',
        quality: 'hd',
        style: 'vivid',
        size: '1024x1024'
      }
    });
  }

  /**
   * Generate choice images for a story
   */
  static async generateChoiceImages(params: {
    choiceDescription: string;
    problemDescription: string;
    kidName: string;
    kidAge: number;
    kidGender: 'male' | 'female';
    kidAvatarUrl?: string;
    isGoodChoice: boolean;
    userId?: string;
    kidId?: string;
  }): Promise<ImageGenerationResult> {
    const { 
      choiceDescription, 
      problemDescription, 
      kidName, 
      kidAge, 
      kidGender,
      isGoodChoice,
      userId,
      kidId
    } = params;

    if (!userId || !kidId) {
      return {
        success: false,
        error: "Missing userId or kidId for choice image generation"
      };
    }

    const kidDetails: KidDetails = {
      id: kidId,
      age: kidAge,
      gender: kidGender as Gender,
      names: [kidName as unknown as Name],
      avatarUrl: params.kidAvatarUrl
    };

    const prompt = `Create img vibrant, Pixar like 3D: ${kidName}, a ${kidAge} year old ${kidGender === 'male' ? 'boy' : 'girl'}, ${choiceDescription}. This illustration relates to the problem of ${problemDescription} and shows the ${isGoodChoice ? 'positive, good' : 'negative, bad'} choice.`;
    
    return this.generateImage({
      userId,
      kidDetails,
      prompt,
      outputCount: 1,
      folderPath: `users/${userId}/choices`,
      parameters: {
        model: 'dall-e-3',
        quality: 'hd',
        style: 'vivid',
        size: '1024x1024'
      }
    });
  }

  // Legacy method for backward compatibility - will be removed
  static async generateImages(request: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
    console.log("[DEPRECATED] generateImages - use generateImage instead");
    // This method is deprecated and will be removed
    return {
      success: false,
      error: "This method is deprecated. Use generateImage instead."
    };
  }
} 