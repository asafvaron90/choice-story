import { KidDetails, PageType, Story, StoryPage } from "@/models";
import { TextGenerationApi } from "@/app/network/TextGenerationApi";
import { ImageGenerationApi } from "@/app/network/ImageGenerationApi";
import { StoryApi } from "@/app/network/StoryApi";
import { GenerateImageResponse } from "@/app/api/story/generate-images/types";
import { ApiResponse } from "@/models";
import { getFirebaseEnvironment } from "@/config/build-config";

export class PageOperationsService {
  /**
   * Regenerate the text for a specific page
   */
  static async regeneratePageText(
    page: StoryPage,
    story: Story,
    userId: string
  ): Promise<string> {
    // Create a prompt for the specific page
    const choiceType = page.pageType === PageType.GOOD_CHOICE ? 'good choice' : page.pageType === PageType.BAD_CHOICE ? 'bad choice' : 'introduction';
    const prompt = `Rewrite the ${choiceType} page (page ${page.pageNum}) for a children's story about a kid trying to choose between "${story.pages.find(p => p.pageType === PageType.GOOD_CHOICE)?.storyText || 'a good choice'}" and "${story.pages.find(p => p.pageType === PageType.BAD_CHOICE)?.storyText || 'a bad choice'}". 
    The story addresses the problem: ${story.problemDescription}. 
    Keep the same theme but create new content for just this one page.`;
    
    // Call the text generation API
    try {
      const response = await TextGenerationApi.generateText({
        prompt,
        userId,
        language: "en"
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.text || '';
    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  }

  /**
   * Regenerate the image for a specific page
   */
  static async regeneratePageImage(
    page: StoryPage,
    userId: string,
    kid: KidDetails
  ): Promise<string> {
    // Get environment explicitly
    const environment = getFirebaseEnvironment();
    
    // Use the unified ImageGenerationApi
    const result = await ImageGenerationApi.generateStoryImage(
      userId,
      kid,
      page.imagePrompt || `Generate image for ${page.pageType} page`,
    );
    
    // Check if the API call was successful
    if (!result.success) {
      throw new Error(result.error || "Failed to generate image");
    }

    // Validate image data
    if (!result.data || result.data.length === 0) {
      throw new Error("No images were generated");
    }
    
    // Return the new image URL
    return result.data[0];
  }

  /**
   * Save a specific page
   */
  static async savePage(
    page: StoryPage,
    story: Story,
    userId: string
  ): Promise<boolean> {
    // Format the page for the API
    const pageToUpdate = {
      pageNum: page.pageNum,
      pageType: page.pageType,
      storyText: page.storyText ,
      imageUrl: page.selectedImageUrl ,
      imagePrompt: ''
    };
    
    // Call API to update just this page
    const response = await StoryApi.updateStoryPages({
      userId,
      kidId: story.kidId,
      storyId: story.id,
      pages: [pageToUpdate]
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to save page');
    }
    
    return true;
  }

  /**
   * Delete a specific page
   */
  static async deletePage(
    page: StoryPage,
    story: Story,
    userId: string
  ): Promise<boolean> {
    // We'll implement the deletion by sending an update with all pages except the one to delete
    const updatedPages = story.pages
      .filter(p => 
        !(p.pageNum === page.pageNum && 
          (p.pageType === PageType.GOOD_CHOICE && page.pageType === PageType.GOOD_CHOICE ||
           p.pageType === PageType.BAD_CHOICE && page.pageType === PageType.BAD_CHOICE ||
           p.pageType === PageType.NORMAL && (page.pageType === PageType.NORMAL || !page.pageType)))
      )
      .map(p => ({
        pageNum: p.pageNum,
        pageType: p.pageType,
        storyText: p.storyText ,
        imageUrl: p.selectedImageUrl ,
        imagePrompt: p.imagePrompt 
      }));
    
    // Call API to update with the filtered pages
    const response = await StoryApi.updateStoryPages({
      userId,
      kidId: story.kidId,
      storyId: story.id,
      pages: updatedPages
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete page');
    }
    
    return true;
  }
} 