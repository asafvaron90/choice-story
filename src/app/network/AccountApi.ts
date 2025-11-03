import { apiClient } from './NetworkClient';
import { ApiResponse } from '@/models';
import { Account } from '@/models';

/**
 * Response for account operations
 */
export interface AccountResponse {
  /**
   * The account data
   */
  account: Account;
  
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Whether the account is new
   */
  isNewAccount?: boolean;
  
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
 * AccountApi for handling account-related API calls
 */
export class AccountApi {
  private static readonly ACCOUNT_ENDPOINT = '/api/account';
  private static readonly ME_ENDPOINT = '/api/account/me';
  
  /**
   * Update or create an account in the database
   * 
   * @param accountData Account data to update/create
   * @returns API response with updated account data
   */
  static async updateAccount(accountData: Account): Promise<ApiResponse<AccountResponse>> {
    return apiClient.post<AccountResponse>(this.ACCOUNT_ENDPOINT, accountData);
  }
  
  /**
   * Get the current account's data
   * 
   * @param uid Account UID to fetch
   * @returns API response with account data
   */
  static async getAccountData(uid: string): Promise<ApiResponse<AccountResponse>> {
    return apiClient.get<AccountResponse>(`${this.ME_ENDPOINT}?uid=${uid}`);
  }
  
  /**
   * Get account by email
   * 
   * @param email Email to search for
   * @returns API response with account data
   */
  static async getAccountByEmail(email: string): Promise<ApiResponse<AccountResponse>> {
    return apiClient.get<AccountResponse>(`${this.ACCOUNT_ENDPOINT}?email=${encodeURIComponent(email)}`);
  }
} 