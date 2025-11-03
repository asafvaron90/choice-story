import { apiClient } from './NetworkClient';
import { KidDetails, ApiResponse } from '@/models';
import { logger } from '@/lib/logger';

/**
 * Response for getting a list of kids
 */
export interface GetKidsResponse {
  /**
   * Array of kids belonging to the user
   */
  kids: KidDetails[];
  
  /**
   * Success indicator
   */
  success: boolean;
}

/**
 * Response for getting a single kid
 */
export interface GetKidResponse {
  /**
   * The kid data
   */
  kid: KidDetails;
  
  /**
   * Success indicator
   */
  success: boolean;
}

/**
 * Response for creating a kid
 */
export interface CreateKidResponse {
  /**
   * ID of the created kid
   */
  kidId: string;
  
  /**
   * Success message
   */
  message: string;
}

/**
 * Response for deleting a kid
 */
export interface DeleteKidResponse {
  /**
   * Success indicator
   */
  success: boolean;
  
  /**
   * Optional message
   */
  message?: string;
}

/**
 * KidApi for handling kid-related API calls
 */
export class KidApi {
  private static readonly KIDS_ENDPOINT = '/api/user/kids';
  private static readonly KID_ENDPOINT = '/api/user/kid';
  
  /**
   * Get a list of kids for a user
   * 
   * @param userId The user ID to get kids for
   * @returns API response with kids data
   */
  static async getKids(userId: string): Promise<ApiResponse<GetKidsResponse>> {
    return apiClient.get<GetKidsResponse>(`${this.KIDS_ENDPOINT}?userId=${userId}`);
  }
  
  /**
   * Get a kid by ID
   * 
   * @param userId The user ID the kid belongs to
   * @param kidId The kid ID to get
   * @returns API response with kid data
   */
  static async getKidById(userId: string, kidId: string): Promise<ApiResponse<GetKidResponse>> {
    console.log(`[KidApi] Fetching kid - userId: ${userId}, kidId: ${kidId}`);
    const endpoint = `${this.KIDS_ENDPOINT}/${kidId}?userId=${userId}`;
    console.log(`[KidApi] Request endpoint: ${endpoint}`);
    
    try {
      const response = await apiClient.get<GetKidResponse>(endpoint);
      console.log(`[KidApi] Kid fetch response success: ${response.success}`);
      
      if (!response.success) {
        console.error(`[KidApi] Error fetching kid: ${response.error}`);
      }
      
      return response;
    } catch (error) {
      logger.error({
        message: 'Exception in getKidById',
        error,
        context: { kidId }
      });
      throw error;
    }
  }
  
  /**
   * Create or update a kid
   * 
   * @param params Parameters for creating/updating a kid
   * @returns API response with the created/updated kid ID
   */
  static async createOrUpdateKid(params: {
    userId: string;
    kid: KidDetails
  }): Promise<ApiResponse<CreateKidResponse>> {
    return apiClient.post<CreateKidResponse>(this.KID_ENDPOINT, params);
  }
  
  /**
   * Delete a kid
   * 
   * @param userId The user ID the kid belongs to
   * @param kidId The kid ID to delete
   * @returns API response with deletion result
   */
  static async deleteKid(userId: string, kidId: string): Promise<ApiResponse<DeleteKidResponse>> {
    return apiClient.delete<DeleteKidResponse>(`${this.KIDS_ENDPOINT}/${kidId}?userId=${userId}`);
  }
} 