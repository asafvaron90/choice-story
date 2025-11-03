/**
 * Image Analysis AI Client
 * 
 * Client-side wrapper for AI-powered image analysis endpoints
 * that use OpenAI's vision capabilities for detailed image analysis.
 */

import * as Sentry from "@sentry/nextjs";

export interface ImageAnalysisResponse {
  success: boolean;
  analysis?: string; // Raw JSON string, not parsed object
  imageUrl?: string;
  error?: string;
}

/**
 * Image Analysis AI Client
 */
export class ImageAnalysisAI {
  /**
   * Analyze a general image for detailed visual characteristics
   * Used for analyzing kid photos for avatar generation
   */
  static async analyzeImage(imageUrl: string): Promise<ImageAnalysisResponse> {
    return Sentry.startSpan(
      {
        op: "ai.image_analysis.general",
        name: "Analyze Image with AI",
      },
      async (span) => {
        span.setAttribute("image_url", imageUrl);

        try {
          const response = await fetch('/api/ai-bots/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze image');
          }

          // Get raw JSON string without parsing
          const rawJsonString = await response.text();

          span.setAttribute("response_status", "success");
          span.setAttribute("analysis_length", rawJsonString.length);

          return {
            success: true,
            analysis: rawJsonString,
            imageUrl: imageUrl
          };

        } catch (error) {
          span.setAttribute("response_status", "error");
          Sentry.captureException(error);
          
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          
          return {
            success: false,
            error: errorMessage
          };
        }
      }
    );
  }

  /**
   * Analyze a generated avatar for character consistency
   * Used for analyzing generated avatars to create character descriptions
   */
  static async analyzeAvatar(imageUrl: string): Promise<ImageAnalysisResponse> {
    return Sentry.startSpan(
      {
        op: "ai.image_analysis.avatar",
        name: "Analyze Avatar with AI",
      },
      async (span) => {
        span.setAttribute("avatar_url", imageUrl);

        try {
          const response = await fetch('/api/ai-bots/analyze-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze avatar');
          }

          // Get raw JSON string without parsing
          const rawJsonString = await response.text();

          span.setAttribute("response_status", "success");
          span.setAttribute("analysis_length", rawJsonString.length);

          return {
            success: true,
            analysis: rawJsonString,
            imageUrl: imageUrl
          };

        } catch (error) {
          span.setAttribute("response_status", "error");
          Sentry.captureException(error);
          
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          
          return {
            success: false,
            error: errorMessage
          };
        }
      }
    );
  }

  /**
   * Analyze an image with custom prompt
   * For specialized analysis needs
   */
  static async analyzeImageWithPrompt(
    imageUrl: string, 
    prompt: string,
    analysisType: 'general' | 'avatar' = 'general'
  ): Promise<ImageAnalysisResponse> {
    return Sentry.startSpan(
      {
        op: `ai.image_analysis.custom_${analysisType}`,
        name: "Analyze Image with Custom Prompt",
      },
      async (span) => {
        span.setAttribute("image_url", imageUrl);
        span.setAttribute("custom_prompt", prompt);
        span.setAttribute("analysis_type", analysisType);

        try {
          // For now, we'll use the standard endpoints
          // In the future, we could create a custom endpoint that accepts prompts
          const endpoint = analysisType === 'avatar' 
            ? '/api/ai-bots/analyze-avatar' 
            : '/api/ai-bots/analyze-image';

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze image with custom prompt');
          }

          // Get raw JSON string without parsing
          const rawJsonString = await response.text();

          span.setAttribute("response_status", "success");

          return {
            success: true,
            analysis: rawJsonString,
            imageUrl: imageUrl
          };

        } catch (error) {
          span.setAttribute("response_status", "error");
          Sentry.captureException(error);
          
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          
          return {
            success: false,
            error: errorMessage
          };
        }
      }
    );
  }
}
