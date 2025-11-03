/**
 * AI Error Handler Service
 * 
 * Provides centralized error handling and retry logic for AI operations
 * with user-friendly error messages and recovery options.
 */

import * as Sentry from "@sentry/nextjs";
import { toast } from "@/components/ui/use-toast";

export interface AIError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

export interface AIRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface AIOperationContext {
  operation: string;
  userId?: string;
  kidId?: string;
  storyId?: string;
  pageType?: string;
  additional?: Record<string, unknown>;
}

/**
 * AI Error Handler Service
 */
export class AIErrorHandlerService {
  private static readonly DEFAULT_RETRY_CONFIG: AIRetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  };

  /**
   * Handle AI operation errors with context and user feedback
   */
  static handleError(
    error: unknown, 
    context: AIOperationContext,
    showToast: boolean = true
  ): AIError {
    const aiError = this.classifyError(error, context);
    
    // Log to Sentry with context
    Sentry.captureException(error, {
      tags: {
        operation: context.operation,
        error_code: aiError.code,
        retryable: aiError.retryable.toString(),
        recoverable: aiError.recoverable.toString()
      },
      extra: {
        context,
        aiError,
        originalError: error
      }
    });

    // Show user-friendly toast if requested
    if (showToast) {
      toast({
        title: "AI Operation Failed",
        description: aiError.userMessage,
        variant: "destructive",
        duration: aiError.retryable ? 5000 : 8000,
      });
    }

    return aiError;
  }

  /**
   * Execute AI operation with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    context: AIOperationContext,
    retryConfig: Partial<AIRetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: unknown;
    
    return Sentry.startSpan(
      {
        op: "ai.operation.with_retry",
        name: `Retry AI Operation: ${context.operation}`,
      },
      async (span) => {
        span.setAttribute("operation", context.operation);
        span.setAttribute("max_retries", config.maxRetries);

        for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
          try {
            span.setAttribute("attempt", attempt);
            
            const result = await operation();
            
            if (attempt > 1) {
              span.setAttribute("succeeded_on_retry", true);
              span.setAttribute("successful_attempt", attempt);
            }
            
            return result;
          } catch (error) {
            lastError = error;
            
            const aiError = this.classifyError(error, context);
            span.setAttribute(`attempt_${attempt}_error`, aiError.code);
            
            // Don't retry if error is not retryable or if this was the last attempt
            if (!aiError.retryable || attempt > config.maxRetries) {
              break;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
              config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
              config.maxDelay
            );
            
            span.setAttribute(`attempt_${attempt}_delay`, delay);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // All retries failed
        span.setAttribute("all_retries_failed", true);
        throw lastError;
      }
    );
  }

  /**
   * Classify error and provide appropriate handling information
   */
  private static classifyError(error: unknown, context: AIOperationContext): AIError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network/timeout errors
      if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) {
        return {
          code: 'NETWORK_ERROR',
          message: error.message,
          userMessage: 'Network connection issue. Please check your internet connection and try again.',
          retryable: true,
          recoverable: true,
          context: context as unknown as Record<string, unknown>
        };
      }
      
      // Rate limiting
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message,
          userMessage: 'AI service is busy. Please wait a moment and try again.',
          retryable: true,
          recoverable: true,
          context: context as unknown as Record<string, unknown>
        };
      }
      
      // API key issues
      if (message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
        return {
          code: 'AUTHENTICATION_ERROR',
          message: error.message,
          userMessage: 'AI service authentication issue. Please contact support if this continues.',
          retryable: false,
          recoverable: false,
          context: context as unknown as Record<string, unknown>
        };
      }
      
      // Content policy violations
      if (message.includes('content policy') || message.includes('inappropriate') || message.includes('safety')) {
        return {
          code: 'CONTENT_POLICY_VIOLATION',
          message: error.message,
          userMessage: 'Content doesn\'t meet safety guidelines. Please try with different details.',
          retryable: false,
          recoverable: true,
          context: context as unknown as Record<string, unknown>
        };
      }
      
      // Service unavailable
      if (message.includes('service unavailable') || message.includes('server error') || message.includes('503')) {
        return {
          code: 'SERVICE_UNAVAILABLE',
          message: error.message,
          userMessage: 'AI service is temporarily unavailable. Please try again in a few minutes.',
          retryable: true,
          recoverable: true,
          context: context as unknown as Record<string, unknown>
        };
      }
      
      // Invalid input
      if (message.includes('invalid') || message.includes('bad request') || message.includes('400')) {
        return {
          code: 'INVALID_INPUT',
          message: error.message,
          userMessage: 'Invalid input provided. Please check your details and try again.',
          retryable: false,
          recoverable: true,
          context: context as unknown as Record<string, unknown>
        };
      }
      
      // Quota exceeded
      if (message.includes('quota') || message.includes('limit exceeded')) {
        return {
          code: 'QUOTA_EXCEEDED',
          message: error.message,
          userMessage: 'AI service quota exceeded. Please try again later or contact support.',
          retryable: false,
          recoverable: false,
          context: context as unknown as Record<string, unknown>
        };
      }
    }
    
    // Generic/unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : String(error),
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      retryable: true,
      recoverable: true,
      context: context as unknown as Record<string, unknown>
    };
  }

  /**
   * Get user-friendly error message for a specific operation
   */
  static getOperationErrorMessage(operation: string, error: AIError): string {
    const baseMessage = error.userMessage;
    
    switch (operation) {
      case 'story_generation':
        return `Story generation failed: ${baseMessage}`;
      case 'avatar_generation':
        return `Avatar generation failed: ${baseMessage}`;
      case 'image_generation':
        return `Image generation failed: ${baseMessage}`;
      case 'image_analysis':
        return `Image analysis failed: ${baseMessage}`;
      default:
        return baseMessage;
    }
  }

  /**
   * Get recovery suggestions for an error
   */
  static getRecoverySuggestions(error: AIError): string[] {
    const suggestions: string[] = [];
    
    if (error.retryable) {
      suggestions.push('Try the operation again');
    }
    
    switch (error.code) {
      case 'NETWORK_ERROR':
        suggestions.push('Check your internet connection');
        suggestions.push('Try refreshing the page');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        suggestions.push('Wait a few minutes before trying again');
        break;
      case 'CONTENT_POLICY_VIOLATION':
        suggestions.push('Try with different or more appropriate content');
        suggestions.push('Ensure all details are suitable for children');
        break;
      case 'INVALID_INPUT':
        suggestions.push('Check that all required fields are filled');
        suggestions.push('Verify that the input format is correct');
        break;
      case 'SERVICE_UNAVAILABLE':
        suggestions.push('Wait a few minutes and try again');
        suggestions.push('Check service status page');
        break;
      case 'QUOTA_EXCEEDED':
        suggestions.push('Contact support to increase your quota');
        suggestions.push('Try again later when quota resets');
        break;
      default:
        suggestions.push('Contact support if the problem continues');
    }
    
    return suggestions;
  }

  /**
   * Check if an operation should show detailed error info to user
   */
  static shouldShowDetailedError(error: AIError): boolean {
    return error.recoverable && !['AUTHENTICATION_ERROR', 'QUOTA_EXCEEDED'].includes(error.code);
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(error: unknown, context: AIOperationContext) {
    const aiError = this.handleError(error, context, false);
    
    return {
      success: false,
      error: aiError.userMessage,
      code: aiError.code,
      retryable: aiError.retryable,
      recoverable: aiError.recoverable,
      suggestions: this.getRecoverySuggestions(aiError)
    };
  }
}
