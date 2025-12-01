/**
 * Analytics Integration Service
 * Helper methods to integrate analytics tracking into API responses
 */

import { FirebaseAnalyticsService } from './firebase-analytics.service';
import { calculateImageGenerationCost, extractTokenUsage, calculateTextGenerationCost } from '@/app/utils/openai-cost-calculator';
import * as Sentry from '@sentry/nextjs';

export class AnalyticsIntegrationService {
  /**
   * Track OpenAI text generation with cost calculation
   */
  static trackTextGeneration(
    userId: string,
    operation: 'title_generation' | 'story_generation' | 'text_regeneration',
    response: any,
    model: string = 'gpt-4o-mini',
    storyId?: string,
    durationMs?: number
  ): void {
    try {
      const { inputTokens, outputTokens } = extractTokenUsage(response);
      
      if (inputTokens > 0 || outputTokens > 0) {
        const costBreakdown = calculateTextGenerationCost(model, inputTokens, outputTokens);
        
        FirebaseAnalyticsService.trackOpenAICost(
          userId,
          operation,
          costBreakdown.totalCost,
          model,
          inputTokens + outputTokens,
          storyId
        );

        // Also log to Sentry for monitoring
        Sentry.addBreadcrumb({
          category: 'analytics.cost',
          message: `${operation} cost tracked`,
          data: {
            model,
            inputTokens,
            outputTokens,
            cost: costBreakdown.totalCost,
            durationMs
          },
          level: 'info'
        });
      }
    } catch (error) {
      console.error('[Analytics Integration] Error tracking text generation:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Track DALL-E image generation with cost
   */
  static trackImageGeneration(
    userId: string,
    storyId: string,
    pageType: string,
    model: 'dall-e-3' | 'dall-e-2' = 'dall-e-3',
    quality: 'standard' | 'hd' = 'hd',
    isRegeneration: boolean = false,
    durationMs?: number
  ): void {
    try {
      const cost = calculateImageGenerationCost(model, quality, 1);
      
      const operation = isRegeneration ? 'image_regeneration' : 'image_generation';
      
      FirebaseAnalyticsService.trackOpenAICost(
        userId,
        operation,
        cost,
        model,
        undefined,
        storyId
      );

      if (durationMs) {
        if (isRegeneration) {
          FirebaseAnalyticsService.trackImageRegeneration(
            userId,
            storyId,
            pageType,
            durationMs,
            cost
          );
        } else {
          FirebaseAnalyticsService.trackImageGenerationComplete(
            userId,
            storyId,
            pageType,
            cost,
            isRegeneration,
            undefined, // storyTitle
            undefined, // kidId
            durationMs
          );
        }
      }

      // Also log to Sentry for monitoring
      Sentry.addBreadcrumb({
        category: 'analytics.cost',
        message: `Image ${operation} cost tracked`,
        data: {
          model,
          quality,
          cost,
          pageType,
          isRegeneration,
          durationMs
        },
        level: 'info'
      });
    } catch (error) {
      console.error('[Analytics Integration] Error tracking image generation:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Track API performance
   */
  static trackAPICall(
    endpoint: string,
    startTime: number,
    success: boolean,
    statusCode?: number
  ): void {
    try {
      const duration = Date.now() - startTime;
      FirebaseAnalyticsService.trackAPIPerformance(endpoint, duration, success, statusCode);
    } catch (error) {
      console.error('[Analytics Integration] Error tracking API call:', error);
      Sentry.captureException(error);
    }
  }
}



