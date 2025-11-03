import { getAuth, User } from 'firebase/auth';
import { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from '@/models';
import { logger } from '@/lib/logger';

/**
 * Wait for Firebase Auth to be properly initialized and return the current user
 * This is especially important in production environments where auth state might not be immediately available
 */
async function waitForAuthState(): Promise<User | null> {
  const auth = getAuth();
  
  // First check if we already have a current user
  const user = auth.currentUser;
  if (user) {
    return user;
  }
  
  // If no current user, wait for auth state to be determined
  return new Promise<User | null>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
    
    // Timeout after 3 seconds to prevent hanging
    setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 3000);
  });
}

/**
 * Configuration options for the NetworkClient
 */
export interface NetworkClientConfig {
  /**
   * Base URL for API calls (defaults to '')
   */
  baseUrl?: string;
  
  /**
   * Default headers to include with every request
   */
  defaultHeaders?: Record<string, string>;
  
  /**
   * Whether to automatically include auth token in requests (defaults to true)
   */
  includeAuth?: boolean;
  
  /**
   * Timeout for requests in milliseconds (defaults to 30000)
   */
  timeout?: number;
}

/**
 * Request options for making API calls
 */
export interface RequestOptions {
  /**
   * Request headers
   */
  headers?: Record<string, string>;
  
  /**
   * Query parameters to append to the URL
   */
  params?: Record<string, string | number | boolean | undefined | null>;
  
  /**
   * Request body (will be JSON stringified)
   */
  body?: BodyInit;
  
  /**
   * Whether to include auth token (overrides global setting)
   */
  includeAuth?: boolean;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Abort signal for request cancellation
   */
  signal?: AbortSignal;
}

interface NetworkError {
  message: string;
  statusCode?: number;
  data?: unknown;
}

/**
 * NetworkClient for handling all API requests
 * Provides methods for common HTTP operations with proper typing
 */
export class NetworkClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private includeAuth: boolean;
  private timeout: number;
  
  /**
   * Create a new NetworkClient
   * @param config Configuration options
   */
  constructor(config: NetworkClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
    this.includeAuth = config.includeAuth !== false;
    this.timeout = config.timeout || 90000;
  }
  
  /**
   * Get the current user's authentication token
   * @returns Promise resolving to auth token or null
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      console.log('[NetworkClient] Getting auth token...');
      
      // Use the helper function to wait for auth state
      const user = await waitForAuthState();
      
      if (!user) {
        console.log('[NetworkClient] No auth token available (user not signed in)');
        return null;
      }
      
      console.log(`[NetworkClient] Getting auth token for user: ${user.uid.substring(0, 6)}...`);
      const token = await user.getIdToken();
      
      if (!token) {
        console.log('[NetworkClient] Failed to get ID token from user');
        return null;
      }
      
      console.log('[NetworkClient] Successfully obtained auth token');
      return token;
    } catch (error) {
      console.error('[NetworkClient] Error getting auth token:', error);
      return null;
    }
  }
  
  /**
   * Add query parameters to a URL
   * @param url Base URL
   * @param params Query parameters
   * @returns URL with query parameters
   */
  private addQueryParams(url: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    if (!params) return url;
    
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    if (!queryString) return url;
    
    return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  }
  
  /**
   * Prepare request headers including auth token if needed
   * @param options Request options
   * @returns Promise resolving to headers object
   */
  private async prepareHeaders(options: RequestOptions = {}): Promise<Headers> {
    const headers = new Headers({
      ...this.defaultHeaders,
      ...options.headers,
    });
    
    const includeAuth = options.includeAuth !== undefined 
      ? options.includeAuth
      : this.includeAuth;
      
    console.log(`[NetworkClient] Preparing headers, includeAuth: ${includeAuth}`);
    
    if (includeAuth) {
      const authToken = await this.getAuthToken();
      if (authToken) {
        console.log('[NetworkClient] Adding auth token to headers');
        headers.set('Authorization', `Bearer ${authToken}`);
      } else {
        console.log('[NetworkClient] No auth token available for request');
      }
    }
    
    console.log('[NetworkClient] Headers prepared:', 
      Object.keys(Object.fromEntries(Array.from(headers.entries()))));
    
    return headers;
  }
  
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      logger.error({
        message: `Request failed with status ${response.status}`,
        context: {
          statusText: response.statusText,
          status: response.status
        }
      });
      try {
        const errorData = await response.json();
        logger.error({
          message: 'Error response from server',
          error: errorData,
          context: { endpoint: response.url }
        });
        throw {
          success: false,
          error: errorData.error || errorData.message || 'Network request failed',
          message: errorData.message,
          status: response.status
        } as ApiErrorResponse;
      } catch (_error) {
        throw {
          success: false,
          error: 'Network request failed',
          status: response.status
        } as ApiErrorResponse;
      }
    }

    try {
      const data = await response.json();
      console.log('[NetworkClient] Successful response:', data);
      return {
        success: true,
        data: data.data || data,  // Handle both nested and direct data
        message: data.message,
        status: response.status
      } as ApiSuccessResponse<T>;
    } catch (_error) {
      console.error('[NetworkClient] Failed to parse response');
      throw {
        success: false,
        error: 'Failed to parse response',
        status: response.status
      } as ApiErrorResponse;
    }
  }

  private async makeRequest<T>(method: string, endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const maxRetries = 2;
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = await this.prepareHeaders(options);
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers,
          body: options.body
        });
        
        // If we get a 401 (Unauthorized), it might be due to token timing issues
        if (response.status === 401 && attempt < maxRetries) {
          console.log(`[NetworkClient] Got 401, retrying request (attempt ${attempt + 1}/${maxRetries + 1})`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = error;
        
        // If it's an API error response, don't retry
        if ((error as ApiErrorResponse).success === false) {
          throw error;
        }
        
        // For network errors, retry if we haven't exceeded max retries
        if (attempt < maxRetries) {
          console.log(`[NetworkClient] Network error, retrying request (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }
    
    // If we get here, all retries failed
    const networkError = lastError as NetworkError;
    throw {
      success: false,
      error: networkError?.message || 'Network request failed after retries'
    } as ApiErrorResponse;
  }
  
  /**
   * Make a GET request
   * @param endpoint API endpoint
   * @param options Request options including headers and params
   * @returns Promise resolving to typed API response
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = options.params ? this.addQueryParams(endpoint, options.params) : endpoint;
    return this.makeRequest<T>('GET', url, { headers: options.headers });
  }
  
  /**
   * Make a POST request
   * @param endpoint API endpoint
   * @param data Request body
   * @param headers Request headers
   * @returns Promise resolving to typed API response
   */
  async post<T>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const contentType = headers?.['Content-Type'] || 'application/json';
    const body = data instanceof FormData ? data : JSON.stringify(data);

    // Log the request data for debugging
    if (data && typeof data === 'object' && 'uid' in data) {
      console.log(`[NetworkClient] POST request to ${endpoint}:`, {
        uid: (data as Record<string, unknown>).uid,
        email: (data as Record<string, unknown>).email,
        displayName: (data as Record<string, unknown>).displayName
      });
    }

    return this.makeRequest<T>('POST', endpoint, {
      headers: {
        ...(!data || data instanceof FormData ? {} : { 'Content-Type': contentType }),
        ...headers
      },
      body
    });
  }
  
  /**
   * Make a PUT request
   * @param endpoint API endpoint
   * @param data Request body
   * @param headers Request headers
   * @returns Promise resolving to typed API response
   */
  async put<T>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });
  }
  
  /**
   * Make a PATCH request
   * @param endpoint API endpoint
   * @param body Request body
   * @param options Request options
   * @returns Promise resolving to typed API response
   */
  async patch<T>(endpoint: string, body?: BodyInit, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = options.params ? this.addQueryParams(endpoint, options.params) : endpoint;
    return this.makeRequest<T>('PATCH', url, {
      ...options,
      body,
    });
  }
  
  /**
   * Make a DELETE request
   * @param endpoint API endpoint
   * @param options Request options including headers and params
   * @returns Promise resolving to typed API response
   */
  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = options.params ? this.addQueryParams(endpoint, options.params) : endpoint;
    return this.makeRequest<T>('DELETE', url, { headers: options.headers });
  }
  
  /**
   * Create a new NetworkClient with custom configuration
   * @param config Configuration options
   * @returns New NetworkClient instance
   */
  static create(config: NetworkClientConfig = {}): NetworkClient {
    return new NetworkClient(config);
  }
}

// Export singleton instance with default configuration
export const apiClient = NetworkClient.create({
  // Use empty string for same-origin requests in production
  baseUrl: '',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  includeAuth: true,
  timeout: 90000,
}); 