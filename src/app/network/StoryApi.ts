import { apiClient } from './NetworkClient';
import { PageType, Story, StoryPage, StoryStatus, ApiResponse } from '@/models';

/**
 * Response for story generation
 */
export interface GenerateStoryResponse {
  story: Story;
  message?: string;
}

/**
 * Response for story listing
 */
export interface StoriesListResponse {
  stories: Story[];
}

/**
 * StoryApi for handling all story-related API calls
 */
export class StoryApi {
  private static readonly BASE_ENDPOINT = '/api/story';
  private static readonly STORY_PAGES_ENDPOINT = '/api/story/story-pages';

  /**
   * Create a new story or update an existing one
   * @param data Story request data
   * @returns API response with the created/updated story
   */
  static async uploadStory(story: Story): Promise<ApiResponse<GenerateStoryResponse>> {
    // Validate required fields according to the API's expected schema
    
    if (!story.userId) throw new Error('Missing user ID');
    if (!story.kidId) throw new Error('Missing kid ID');
    if (!story.title) throw new Error('Missing story title');
    if (!story.problemDescription) throw new Error('Missing problem description');

    // Debug log the request data
    console.log('[StoryApi] Sending story request:', story);
    
    // Send story data
    return apiClient.post<GenerateStoryResponse>(this.BASE_ENDPOINT, story);
  }
  
  /**
   * Get all stories for a kid
   * @param userId User ID
   * @param kidId Kid ID
   * @returns API response with list of stories
   */
  static async getStoriesByKid(userId: string, kidId: string): Promise<ApiResponse<StoriesListResponse>> {
    return apiClient.get<StoriesListResponse>(this.BASE_ENDPOINT, {
      params: { userId, kidId }
    });
  }
  
  /**
   * Get a story by ID
   * @param storyId Story ID
   * @returns API response with the story
   */
  static async getStoryById(storyId: string): Promise<ApiResponse<Story>> {
    const response = await apiClient.get<{ success: boolean; story: Story }>(this.BASE_ENDPOINT, {
      params: { storyId }
    });

    if (!response.success || !response.data?.story) {
      return {
        success: false,
        error: 'error' in response ? response.error : 'Story not found'
      };
    }

    return {
      success: true,
      data: response.data.story
    };
  }
  
  /**
   * Delete a story
   * @param userId User ID
   * @param storyId Story ID
   * @param kidId Kid ID
   * @returns API response
   */
  static async deleteStory(userId: string, storyId: string, kidId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>(this.BASE_ENDPOINT, {
      params: { userId, storyId, kidId }
    });
  }
  
  /**
   * Get all stories for a user
   * @param userId User ID
   * @returns API response with list of stories
   */
  static async getAllStoriesByUser(userId: string): Promise<ApiResponse<StoriesListResponse>> {
    return apiClient.get<StoriesListResponse>(this.BASE_ENDPOINT, {
      params: { userId }
    });
  }

  /**
   * Update a story partially
   * @param storyId Story ID
   * @param updateData Data to update
   * @returns API response
   */
  static async updateStoryPartial(storyId: string, updateData: Partial<Story>): Promise<ApiResponse<{ story: Story }>> {
    return apiClient.patch<{ story: Story }>(this.BASE_ENDPOINT, JSON.stringify(updateData), {
      params: { storyId }
    });
  }

  /**
   * Update story status
   * @param storyId Story ID
   * @param status New status
   * @returns API response
   */
  static async updateStoryStatus(storyId: string, status: StoryStatus): Promise<ApiResponse<{ story: Story }>> {
    return this.updateStoryPartial(storyId, { status });
  }

  /**
   * Update story pages
   * @param params Parameters for updating story pages
   * @returns API response with update status
   */
  static async updateStoryPages(params: {
    userId: string;
    kidId: string;
    storyId: string;
    pages: StoryPage[];
  }): Promise<ApiResponse<{
    success: boolean;
    message?: string;
  }>> {
    // Use the patch endpoint to update only the pages
    return apiClient.patch<{ success: boolean; message?: string }>(
      this.BASE_ENDPOINT, 
      JSON.stringify({ pages: params.pages }),
      { params: { storyId: params.storyId } }
    );
  }

  /**
   * Generate complete story pages (text and images) in one call
   * @param params Parameters for story pages generation
   * @returns API response with generated pages (text and images)
   */
  static async generateStoryPagesComplete(params: {
    story: {
      id: string;
      kidId: string;
      userId: string;
      title: string;
      problemDescription: string;
      pages: Array<{
        pageType: string;
        storyText: string;
        imageUrl?: string;
        pageNum?: number;
        imagePrompt?: string;
      }>
    },
    prompt?: string;
  }): Promise<ApiResponse<{
    success: boolean;
    normalPages: Array<{ text: string; imageUrl: string } | string>;
    goodPages: Array<{ text: string; imageUrl: string } | string>;
    badPages: Array<{ text: string; imageUrl: string } | string>;
    message?: string;
  }>> {
    return apiClient.post(this.STORY_PAGES_ENDPOINT, params);
  }

  /**
   * Generates all images for a story in a single batch operation and updates the story
   * @param params Parameters for batch image generation
   * @returns API response with the updated story and generated image URLs
   */
  // static async generateStoryImagesInBatch(story: Story): Promise<ApiResponse<{
  //   success: boolean;
  //   story: Story;
  //   message?: string;
  // }>> {
  //   try {
  //     console.log('[StoryApi] Starting batch image generation for story:', story.id);
      
  //     const coverPage = story.pages.find(page => page.pageType === PageType.COVER);
  //     // First, generate cover image if it doesn't exist
  //     if (!coverPage?.selectedImageUrl) {
  //       console.log('[StoryApi] Generating cover image');
  //       const coverImageResponse = await ImageGenerationApi.generateImages({
  //         prompt: coverPage?.imagePrompt ?? "",
  //         outputCount: 1,
  //         userId: story.userId,
  //         kidId: story.kidId
  //       });
        
  //       if (!coverImageResponse.success) {
  //         console.warn('[StoryApi] Failed to generate cover image:', coverImageResponse.error);
  //       } else if (coverImageResponse.data && coverPage) {
  //         coverPage.imagesUrls = coverImageResponse.data.imageUrls;
  //       }
  //     }
      
  //     // Next, generate images for all pages that need them
  //     const pagesNeedingImages = story.pages.filter(page => 
  //       !page.selectedImageUrl || page.selectedImageUrl === '');
      
  //     if (pagesNeedingImages.length > 0) {
  //       console.log(`[StoryApi] Generating images for ${pagesNeedingImages.length} pages`);
        
  //       // Process pages in parallel for efficiency
  //       const pageImagePromises = pagesNeedingImages.map(async (page, index) => {
  //         // Construct a good prompt based on page type and content
  //         const pageType = page.pageType;
  //         const isGoodChoice = pageType === 'good' || pageType === 'good_choice';
  //         const isBadChoice = pageType === 'bad' || pageType === 'bad_choice';
  //         const _choiceType = isGoodChoice ? 'positive, good' : 
  //                           isBadChoice ? 'negative, bad' : 'normal';
          
  //         const prompt = page.imagePrompt;
  //         // Add delay between requests to avoid rate limiting (200ms per request)
  //         await new Promise(resolve => setTimeout(resolve, index * 200));
          
  //         // Generate image for this page
  //         const imageResponse = await ImageGenerationApi.generateImages({
  //           prompt,
  //           outputCount: 1,
  //           userId: story.userId,
  //           kidId: story.kidId
  //         });
          
  //         if (!imageResponse.success) {
  //           console.warn(`[StoryApi] Failed to generate image for page ${page.pageNum}:`, imageResponse.error);
  //           return page;
  //         }
          
  //         if (imageResponse.data && imageResponse.data.imageUrls.length > 0) {
  //           return {
  //             ...page,
  //             selectedImageUrl: imageResponse.data.imageUrls[0]
  //           };
  //         }
          
  //         return page;
  //       });
        
  //       // Wait for all page image generations to complete
  //       const updatedPages = await Promise.all(pageImagePromises);
        
  //       // Update the story with the new pages
  //       const pageMap = new Map(updatedPages.map(page => [page.pageNum, page]));
        
  //       // Create a new array of pages, preserving the original pages not needing images
  //       story.pages = story.pages.map(page => 
  //         pageMap.has(page.pageNum) ? pageMap.get(page.pageNum)! : page
  //       );
  //     }
      
  //     // Update story status based on image generation completion
  //     const allImagesGenerated = coverPage?.selectedImageUrl && 
  //       story.pages.every(page => page.selectedImageUrl && page.selectedImageUrl !== '');
      
  //     if (allImagesGenerated) {
  //       story.status = StoryStatus.COMPLETE;
  //     } else if (coverPage?.selectedImageUrl) {
  //       story.status = StoryStatus.GENERATING;
  //     }
      
  //     // Update the story in the database
  //     const updateResponse = await this.uploadStory(story);
      
  //     if (!updateResponse.success) {
  //       return {
  //         success: false,
  //         error: updateResponse.error,
  //         message: 'Failed to update story with generated images'
  //       };
  //     }
      
  //     return {
  //       success: true,
  //       data: {
  //         success: true,
  //         story: story,
  //         message: 'Story images generated and updated successfully'
  //       }
  //     };
  //   } catch (error) {
  //     console.error('[StoryApi] Error in batch image generation:', error);
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Failed to generate story images',
  //       message: 'Failed to generate story images'
  //     };
  //   }
  // }

  static async uploadImageToFirebaseStorage(imageUrl: string, userId: string, kidId: string, storyId: string, pageType: PageType): Promise<string> {
    // Use the existing upload API endpoint
    const response = await apiClient.post<{ url: string }>('/api/upload_image', {
      imageUrl,
      path: `users/${userId}/${kidId}/stories/${storyId}/${pageType}_${Date.now()}.png`
    });
    
    if (!response.success || !response.data?.url) {
      throw new Error('Failed to upload image to Firebase Storage');
    }
    
    return response.data.url;
  }
} 