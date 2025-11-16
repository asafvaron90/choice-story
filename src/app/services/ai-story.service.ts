/**
 * AI Story Service - Integration layer for new AI bot system
 * 
 * This service provides a bridge between the existing story creation workflow
 * and the new AI bot system, maintaining backward compatibility while
 * leveraging the improved AI capabilities.
 */

import * as Sentry from "@sentry/nextjs";
import { Story, PageType, StoryStatus, KidDetails } from "@/models";
import { AIErrorHandlerService } from "./ai-error-handler.service";
import { StoryTemplates } from "@/app/_lib/services/prompt_templats";
import { functionClientAPI } from "@/app/network/functions";
import { getFirebaseEnvironment } from "@/config/build-config";


export interface AIStoryGenerationRequest {
  title: string;
  problemDescription: string;
  kidDetails: KidDetails;
  language?: string;
  userId: string;
  advantages?: string;
  disadvantages?: string;
}

export interface AIStoryGenerationResponse {
  success: boolean;
  story?: Story;
  error?: string;
}

export interface AIStoryImageRequest {
  imagePrompt: string;
  kidDetails: KidDetails;
  pageType: PageType;
  userId: string;
}

export interface AIStoryImageResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}


/**
 * AI Story Service Class
 */
export class AIStoryService {
  /**
   * Generate a complete story using Firebase Functions
   */
  static async generateFullStory(request: AIStoryGenerationRequest): Promise<AIStoryGenerationResponse> {
    console.log("🚀 AIStoryService.generateFullStory - Using Firebase Functions!");
    return Sentry.startSpan(
      {
        op: "ai.story.generate_full",
        name: "Generate Full Story with Firebase Functions",
      },
      async (span) => {
        span.setAttribute("kid_id", request.kidDetails.id);
        span.setAttribute("user_id", request.userId);
        span.setAttribute("title", request.title);
        span.setAttribute("language", request.language || "en");

        try {
          console.log("AIStoryService.generateFullStory called with request:", request);
          
          const result = await AIErrorHandlerService.withRetry(async () => {
            // Generate a unique story ID
            const storyId = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Prepare the request for Firebase function
            const functionRequest = {
              name: request.kidDetails.name || "Child",
              problemDescription: request.problemDescription,
              title: request.title,
              age: request.kidDetails.age,
              advantages: request.advantages || "",
              disadvantages: request.disadvantages || "",
              accountId: request.userId, // Using userId as accountId for now
              userId: request.userId,
              storyId: storyId
            };
            
            console.log("Calling Firebase generateStoryPagesText with:", functionRequest);
            
            // Call the Firebase function
            const response = await functionClientAPI.generateStoryPagesText(functionRequest);
            console.log("Firebase function returned:", response);

            if (!response.success || !response.text) {
              throw new Error("Failed to generate story text from Firebase function");
            }

            // Use the existing story text generation response converter
            const storyPages = StoryTemplates.fullStoryTextGenerationResponseConvertor(response.text);
            if (!storyPages || storyPages.length === 0) {
              throw new Error("Failed to parse Firebase function response into story pages");
            }

            console.log("Parsed story pages:", storyPages.length);

            // Create a story object with the parsed pages
            const story: Story = {
              id: storyId,
              accountId: request.userId,
              kidId: request.kidDetails.id,
              userId: request.userId,
              title: request.title,
              problemDescription: request.problemDescription,
              advantages: request.advantages || "",
              disadvantages: request.disadvantages || "",
              status: StoryStatus.INCOMPLETE, // Images still need to be generated
              pages: storyPages,
              createdAt: new Date(),
              lastUpdated: new Date()
            };

            return story;
          }, {
            operation: 'story_generation',
            userId: request.userId,
            kidId: request.kidDetails.id
          });

          span.setAttribute("pages_generated", result.pages.length);
          span.setAttribute("response_status", "success");

          return {
            success: true,
            story: result
          };

        } catch (error) {
          span.setAttribute("response_status", "error");
          
          const aiError = AIErrorHandlerService.handleError(error, {
            operation: 'story_generation',
            userId: request.userId,
            kidId: request.kidDetails.id
          });
          
          return {
            success: false,
            error: aiError.userMessage
          };
        }
      }
    );
  }

  /**
   * Generate a story image using Firebase Functions
   */
  static async generateStoryImage(request: AIStoryImageRequest): Promise<AIStoryImageResponse> {
    return Sentry.startSpan(
      {
        op: "ai.story.generate_image",
        name: "Generate Story Image with Firebase Functions",
      },
      async (span) => {
        span.setAttribute("kid_id", request.kidDetails.id);
        span.setAttribute("user_id", request.userId);
        span.setAttribute("page_type", request.pageType);

        try {
          const imageUrl = await AIErrorHandlerService.withRetry(async () => {
            // For standalone image generation, we don't need a real story ID
            // The Firebase function will handle this case by not updating Firestore
            
            // Prepare the request for Firebase function
            const functionRequest = {
              imagePrompt: request.imagePrompt,
              imageUrl: request.kidDetails.avatarUrl || "", // Use kid's avatar as reference
              accountId: request.userId, // Using userId as accountId for now
              userId: request.userId,
              storyId: '' // No story ID for standalone generation
            };
            
            console.log("Calling Firebase generateStoryPageImage with:", functionRequest);
            
            // Call the Firebase function
            const response = await functionClientAPI.generateStoryPageImage(functionRequest);
            console.log("Firebase function returned:", response);

            if (!response.success || !response.imageUrl) {
              throw new Error("Failed to generate story image from Firebase function");
            }

            return response.imageUrl;
          }, {
            operation: 'image_generation',
            userId: request.userId,
            kidId: request.kidDetails.id,
            pageType: request.pageType
          });

          span.setAttribute("response_status", "success");

          return {
            success: true,
            imageUrl
          };

        } catch (error) {
          span.setAttribute("response_status", "error");
          
          const aiError = AIErrorHandlerService.handleError(error, {
            operation: 'image_generation',
            userId: request.userId,
            kidId: request.kidDetails.id,
            pageType: request.pageType
          });
          
          return {
            success: false,
            error: aiError.userMessage
          };
        }
      }
    );
  }

  /**
   * Generate an avatar image using Firebase Functions
   */
  static async generateAvatarImage(kidDetails: KidDetails, userId: string): Promise<AIStoryImageResponse> {
    return Sentry.startSpan(
      {
        op: "ai.story.generate_avatar",
        name: "Generate Avatar Image with Firebase Functions",
      },
      async (span) => {
        span.setAttribute("kid_id", kidDetails.id);
        span.setAttribute("user_id", userId);
        const environment = process.env.NODE_ENV || 'production';
        span.setAttribute("environment", environment);

        try {
          const imageUrl = await AIErrorHandlerService.withRetry(async () => {
            // Prepare the request for Firebase function
            const functionRequest = {
              imageUrl: kidDetails.avatarUrl || "", // Use kid's avatar as reference
              accountId: userId, // Using userId as accountId for now
              userId: userId
            };
            
            console.log("Calling Firebase generateKidAvatarImage with:", functionRequest);
            
            // Call the Firebase function
            const response = await functionClientAPI.generateKidAvatarImage(functionRequest);
            console.log("Firebase function returned:", response);

            if (!response.success || !response.imageUrl) {
              throw new Error("Failed to generate avatar image from Firebase function");
            }

            return response.imageUrl;
          }, {
            operation: 'avatar_generation',
            userId: userId,
            kidId: kidDetails.id
          });

          span.setAttribute("response_status", "success");

          return {
            success: true,
            imageUrl
          };

        } catch (error) {
          span.setAttribute("response_status", "error");
          
          const aiError = AIErrorHandlerService.handleError(error, {
            operation: 'avatar_generation',
            userId: userId,
            kidId: kidDetails.id
          });
          
          return {
            success: false,
            error: aiError.userMessage
          };
        }
      }
    );
  }

}
