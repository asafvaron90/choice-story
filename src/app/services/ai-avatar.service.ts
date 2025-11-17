/**
 * AI Avatar Service - Integration layer for avatar generation with AI bots
 * 
 * This service provides enhanced avatar capabilities using the new AI bot system
 * while maintaining backward compatibility with the existing avatar analysis workflow.
 */

import * as Sentry from "@sentry/nextjs";
import { AIStoryService } from './ai-story.service';
import { AvatarApi, AvatarAnalysisResponse } from '@/app/network/AvatarApi';
import { ImageAnalysisAI } from '@/app/network/ai-bots';
import { KidDetails, ApiResponse } from '@/models';

export interface AIAvatarGenerationRequest {
  kidDetails: KidDetails;
  userId: string;
  sourceImageUrl?: string; // Optional source image for reference
  environment?: string; // Firebase environment (development, production, etc.)
}

export interface AIAvatarGenerationResponse {
  success: boolean;
  avatarUrl?: string;
  analysis?: string;
  error?: string;
}

export interface AIAvatarAnalysisRequest {
  imageUrl: string;
  kidDetails: KidDetails;
  useAIBots?: boolean;
}

export interface AIAvatarAnalysisResponse {
  success: boolean;
  analysis?: string;
  error?: string;
}

/**
 * Enhanced Avatar Service with AI bot integration
 */
export class AIAvatarService {
  /**
   * Generate a new avatar using AI bots
   */
  static async generateAvatar(request: AIAvatarGenerationRequest): Promise<AIAvatarGenerationResponse> {
    return Sentry.startSpan(
      {
        op: "ai.avatar.generate",
        name: "Generate Avatar with AI Bot",
      },
      async (span) => {
        span.setAttribute("kid_id", request.kidDetails.id);
        span.setAttribute("user_id", request.userId);
        span.setAttribute("has_source_image", !!request.sourceImageUrl);

        try {
          // Generate avatar using the AI bot system
          const aiResponse = await AIStoryService.generateAvatarImage(
            request.kidDetails, 
            request.userId
          );

          if (!aiResponse.success || !aiResponse.imageUrl) {
            throw new Error(aiResponse.error || "Failed to generate avatar with AI bot");
          }

          span.setAttribute("response_status", "success");

          return {
            success: true,
            avatarUrl: aiResponse.imageUrl
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
   * Analyze an avatar image with optional AI bot enhancement
   */
  static async analyzeAvatar(request: AIAvatarAnalysisRequest): Promise<AIAvatarAnalysisResponse> {
    return Sentry.startSpan(
      {
        op: "ai.avatar.analyze",
        name: "Analyze Avatar Image",
      },
      async (span) => {
        span.setAttribute("kid_id", request.kidDetails.id);
        span.setAttribute("use_ai_bots", request.useAIBots || false);

        try {
          let analysis: string;

          if (request.useAIBots) {
            // Use AI bot for enhanced analysis
            analysis = await this.analyzeWithAIBot(request);
          } else {
            // Use legacy analysis system
            analysis = await this.analyzeWithLegacySystem(request);
          }

          span.setAttribute("response_status", "success");
          span.setAttribute("analysis_length", analysis.length);

          return {
            success: true,
            analysis
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
   * Generate avatar and analyze it in one workflow
   */
  static async generateAndAnalyzeAvatar(request: AIAvatarGenerationRequest): Promise<AIAvatarGenerationResponse> {
    return Sentry.startSpan(
      {
        op: "ai.avatar.generate_and_analyze",
        name: "Generate and Analyze Avatar",
      },
      async (span) => {
        span.setAttribute("kid_id", request.kidDetails.id);
        span.setAttribute("user_id", request.userId);

        try {
          // Step 1: Generate avatar
          const generateResponse = await this.generateAvatar(request);
          
          if (!generateResponse.success || !generateResponse.avatarUrl) {
            return generateResponse;
          }

          // Step 2: Analyze the generated avatar
          const analysisResponse = await this.analyzeAvatar({
            imageUrl: generateResponse.avatarUrl,
            kidDetails: request.kidDetails,
            useAIBots: true
          });

          if (!analysisResponse.success) {
            // Return the avatar even if analysis fails
            console.warn("Avatar analysis failed, but avatar generation succeeded");
          }

          span.setAttribute("response_status", "success");

          return {
            success: true,
            avatarUrl: generateResponse.avatarUrl,
            analysis: analysisResponse.analysis,
            error: analysisResponse.success ? undefined : `Avatar generated but analysis failed: ${analysisResponse.error}`
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
   * Analyze avatar using AI bot system
   */
  private static async analyzeWithAIBot(request: AIAvatarAnalysisRequest): Promise<string> {
    const response = await ImageAnalysisAI.analyzeImage(request.imageUrl);
    
    if (!response.success || !response.analysis) {
      throw new Error(response.error || 'Failed to analyze image with AI bot');
    }
    
    // Enhance the analysis with kid-specific context
    const enhancedAnalysis = `AI Analysis for ${request.kidDetails.name} (age ${request.kidDetails.age}, ${request.kidDetails.gender}):

${response.analysis}

This analysis is optimized for creating consistent character avatars in children's stories.`;
    
    return enhancedAnalysis;
  }

  /**
   * Analyze avatar using legacy system
   */
  private static async analyzeWithLegacySystem(request: AIAvatarAnalysisRequest): Promise<string> {
    const response: ApiResponse<AvatarAnalysisResponse> = await AvatarApi.analyzeAvatar({
      imageUrl: request.imageUrl,
      name: request.kidDetails.name || '',
      age: request.kidDetails.age,
      gender: request.kidDetails.gender as 'male' | 'female'
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to analyze avatar');
    }

    if (!response.data?.analysis) {
      throw new Error('No analysis returned from avatar API');
    }

    return JSON.stringify(response.data.analysis);
  }

  /**
   * Update kid details with generated avatar and analysis
   */
  static async updateKidWithGeneratedAvatar(
    kidDetails: KidDetails, 
    userId: string,
    sourceImageUrl?: string
  ): Promise<KidDetails> {
    return Sentry.startSpan(
      {
        op: "ai.avatar.update_kid",
        name: "Update Kid with Generated Avatar",
      },
      async (span) => {
        span.setAttribute("kid_id", kidDetails.id);
        span.setAttribute("user_id", userId);

        try {
          // Generate and analyze avatar
          const result = await this.generateAndAnalyzeAvatar({
            kidDetails,
            userId,
            sourceImageUrl
          });

          if (!result.success) {
            throw new Error(result.error || "Failed to generate avatar");
          }

          // Update kid details with new avatar and analysis
          const updatedKidDetails: KidDetails = {
            ...kidDetails,
            kidSelectedAvatar: result.avatarUrl,
            imageAnalysis: result.analysis,
            lastUpdated: new Date()
          };

          span.setAttribute("response_status", "success");
          
          return updatedKidDetails;

        } catch (error) {
          span.setAttribute("response_status", "error");
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  }

  /**
   * Check if avatar generation is available for a kid
   */
  static canGenerateAvatar(kidDetails: KidDetails): boolean {
    return !!(kidDetails.name && kidDetails.age && kidDetails.gender);
  }

  /**
   * Get avatar generation prompt for a kid
   */
  static getAvatarPrompt(kidDetails: KidDetails, sourceImageAnalysis?: string): string {
    let prompt = `Create a friendly cartoon avatar for ${kidDetails.name || "a child"}, age ${kidDetails.age}, ${kidDetails.gender}.`;
    
    if (sourceImageAnalysis) {
      prompt += ` Based on this description: ${sourceImageAnalysis}`;
    }
    
    prompt += " Style: Child-friendly, colorful, suitable for children's story illustrations. The avatar should be consistent and recognizable across different story scenes.";
    
    return prompt;
  }
}
