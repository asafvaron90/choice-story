import { apiClient } from './NetworkClient';
import { ApiResponse } from '@/models';

/**
 * User data interface
 */
export interface UserData {
  /**
   * User's unique identifier
   */
  uid: string;
  
  /**
   * User's email address
   */
  email: string;
  
  /**
   * User's display name
   */
  displayName: string;
  
  /**
   * URL to user's profile photo
   */
  photoURL: string;
  
  /**
   * User's phone number
   */
  phoneNumber: string;
  
  /**
   * When the user account was created
   */
  createAt?: string;
  
  /**
   * When the user data was last updated
   */
  lastUpdated?: string;
}

/**
 * Response for user operations
 */
export interface UserResponse {
  /**
   * The user data
   */
  user: UserData;
  
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Whether the user is new
   */
  isNewUser?: boolean;
  
  /**
   * What action was performed (created/updated)
   */
  action?: 'created' | 'updated';
  
  /**
   * Error message if any
   */
  error?: string;
}

/**
 * UserApi for handling user-related API calls
 */
export class UserApi {
  private static readonly USER_ENDPOINT = '/api/user';
  private static readonly ME_ENDPOINT = '/api/user/me';
  
  /**
   * Update or create a user in the database
   * 
   * @param userData User data to update/create
   * @returns API response with updated user data
   */
  static async updateUser(userData: UserData): Promise<ApiResponse<UserResponse>> {
    return apiClient.post<UserResponse>(this.USER_ENDPOINT, userData);
  }
  
  /**
   * Get the current user's data
   * 
   * @param uid User ID to fetch
   * @returns API response with user data
   */
  static async getUserData(uid: string): Promise<ApiResponse<UserResponse>> {
    return apiClient.get<UserResponse>(`${this.ME_ENDPOINT}?uid=${uid}`);
  }
} 