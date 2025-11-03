import * as Sentry from "@sentry/nextjs";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Simple response handler with success and error handling
 */
export class ResponseHandler {
  /**
   * Create a success response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Create an error response
   */
  static error(error: string | Error, message?: string): ApiResponse {
    const errorMessage = error instanceof Error ? error.message : error;
    
    // Log error to Sentry
    Sentry.captureException(error instanceof Error ? error : new Error(errorMessage));
    
    return {
      success: false,
      error: errorMessage,
      message: message || "An error occurred"
    };
  }

  /**
   * Wrap an async operation with error handling
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    errorMessage?: string
  ): Promise<ApiResponse<T>> {
    try {
      const data = await operation();
      return this.success(data);
    } catch (error) {
      return this.error(error as Error, errorMessage);
    }
  }
}
