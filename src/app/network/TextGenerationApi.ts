import { apiClient } from './NetworkClient';
import { ApiResponse } from '@/models';

/**
 * Text generation request
 */
export interface TextGenerationRequest {
  /**
   * Prompt for text generation
   */
  prompt: string;
  
  /**
   * Language to generate text in
   */
  language: string;
  
  /**
   * User ID for tracking and quota
   */
  userId?: string;
  
  /**
   * Additional parameters for text generation
   */
  parameters?: Record<string, string | number | boolean>;
}

/**
 * Text generation response
 */
export interface TextGenerationResponse {
  /**
   * Generated text
   */
  text: string;
  
  /**
   * Additional info from generation
   */
  info?: Record<string, string | number | boolean>;
}

/**
 * TextGenerationApi for handling text generation API calls
 */
export class TextGenerationApi {
  private static readonly BASE_ENDPOINT = '/api/story/generate-text';
  
  /**
   * Generate text from a prompt
   * 
   * @param request Text generation request
   * @returns API response with generated text
   */
  static async generateText(request: TextGenerationRequest): Promise<ApiResponse<TextGenerationResponse>> {
    const response = await apiClient.post<TextGenerationResponse>(this.BASE_ENDPOINT, request);
    return response;
  }
  
} 