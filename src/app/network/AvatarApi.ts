import { apiClient } from './NetworkClient';
import { ApiResponse } from '@/models';
import { ImageRequirementsCheckResponse } from '@/app/_lib/services/replicate_api';

/**
 * Avatar analysis response
 */
export interface AvatarAnalysisResponse {
  /**
   * AI-generated analysis of the avatar image
   */
  analysis: {
    hair: {
      color: string;
      texture: string;
      length: string;
      thickness: string;
      style: string;
    };
    eyes: {
      color: string;
      shape: string;
      size: string;
    };
    skin: {
      tone: string;
      texture: string;
      features: string;
    };
    facialStructure: {
      faceShape: string;
      cheekbones: string;
      jawline: string;
      chin: string;
    };
    eyebrows?: {
      shape: string;
      thickness: string;
      color: string;
    };
    nose?: {
      shape: string;
      size: string;
    };
    mouth?: {
      shape: string;
      size: string;
      color: string;
    };
    clothing?: {
      colors: string[];
      style: string;
      details: string;
    };
    expression?: {
      mood: string;
      engagement: string;
    };
    uniqueFeatures?: string[];
    lighting?: {
      type: string;
      direction: string;
      quality: string;
    };
  };
}

/**
 * Avatar requirements check response
 */
export interface AvatarRequirementsResponse {
  /**
   * Whether the avatar meets requirements
   */
  success: boolean;
  
  /**
   * Error message if requirements not met
   */
  error?: string;
  
  /**
   * Requirements result details
   */
  results?: {
    /**
     * Whether image is oriented correctly
     */
    isOrientationValid: boolean;
    
    /**
     * Whether image is large enough
     */
    isSizeValid: boolean;
    
    /**
     * Whether image format is acceptable
     */
    isFormatValid: boolean;
    
    /**
     * Whether image contains a face
     */
    hasFace: boolean;
    
    /**
     * Additional details about face detection
     */
    faceDetails?: {
      /**
       * Number of faces detected
       */
      faceCount: number;
      
      /**
       * Detected gender with confidence score
       */
      gender?: {
        value: string;
        confidence: number;
      };
      
      /**
       * Detected age with confidence score
       */
      age?: {
        value: number;
        confidence: number;
      };
    };
  };
}

/**
 * AvatarApi for handling avatar-related API calls
 */
export class AvatarApi {
  private static readonly ANALYZE_ENDPOINT = '/api/ai-bots/analyze-image'; // Updated to use new AI bot endpoint
  private static readonly CHECK_REQUIREMENTS_ENDPOINT = '/api/ai-bots/check-requirements'; // Updated to use new AI bot endpoint
  
  /**
   * Analyze an avatar image using OpenAI vision API
   * 
   * @param params Analysis parameters
   * @returns API response with avatar analysis
   */
  static async analyzeAvatar(params: {
    imageUrl: string;
    name: string;
    age: number;
    gender: 'male' | 'female';
  }): Promise<ApiResponse<AvatarAnalysisResponse>> {
    // The new AI bot endpoint only needs imageUrl, it handles the analysis internally
    return apiClient.post<AvatarAnalysisResponse>(this.ANALYZE_ENDPOINT, { 
      imageUrl: params.imageUrl 
    });
  }
  
  /**
   * Check if an avatar image meets requirements
   * 
   * @param params Check parameters
   * @returns API response with requirements check results
   */
  static async checkRequirements(params: {
    imageUrl: string;
    expectedGender?: 'male' | 'female';
    expectedAge?: number;
    name?: string;
  }): Promise<ApiResponse<ImageRequirementsCheckResponse>> {
    return apiClient.post<ImageRequirementsCheckResponse>(this.CHECK_REQUIREMENTS_ENDPOINT, params);
  }
} 