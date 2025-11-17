export const ENV_DEV: string = 'development';
export const ENV_PROD: string = 'production';
export const ENV_TEST: string = 'test';

export const NODE_ENV: string = process.env.NODE_ENV || 'development';
export const IS_PROD: boolean = NODE_ENV === ENV_PROD;
export const IS_DEV: boolean = NODE_ENV === ENV_DEV;

/**
 * Get the Firebase environment based on NODE_ENV
 * This determines which Firebase collections are used:
 * - development → users_development, accounts_development, stories_gen_development
 * - production → users_production, accounts_production, stories_gen_production
 * 
 * Priority order:
 * 1. NODE_ENV (set at build time)
 * 2. Hostname check (for client-side code - fallback if NODE_ENV is incorrect)
 * 3. Default to 'development'
 * 
 * @returns 'development' or 'production'
 */
export function getFirebaseEnvironment(): 'development' | 'production' {
  // 1. Check NODE_ENV (set at build time)
  const env = NODE_ENV;
  if (env === 'production') {
    return 'production';
  }
  
  // 2. For client-side code, check if we're on a production domain
  // This is a fallback in case NODE_ENV wasn't set correctly during build
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If not localhost or 127.0.0.1, assume production
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.local')) {
      return 'production';
    }
  }
  
  // 3. Default to development
  return 'development';
}

// Base URLs configuration
export const BASE_DOMAIN_LOCAL: string = process.env.NEXT_PUBLIC_BASE_URL_LOCAL || 'http://localhost:3000';
export const BASE_DOMAIN_PROD: string = process.env.NEXT_PUBLIC_BASE_URL_PROD || 'https://choice-story.com';
export const BASE_DOMAIN_PROD_2: string = process.env.NEXT_PUBLIC_BASE_URL_PROD_2 || 'https://staging.choice-story.com';

export const BASE_URL: string = IS_PROD ? BASE_DOMAIN_PROD : BASE_DOMAIN_LOCAL;

export const ALLOWED_ORIGINS: string[] = IS_PROD
  ? [BASE_DOMAIN_PROD, BASE_DOMAIN_PROD_2].filter(Boolean)
  : [BASE_DOMAIN_LOCAL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean);

// Function to get CORS headers with proper origin handling
export function getCorsHeaders(origin?: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : (IS_DEV ? '*' : ALLOWED_ORIGINS[0]);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// CORS Headers configuration (for preflight requests)
export const CORS_HEADERS = getCorsHeaders();

export const CORS_PREFLIGHT_HEADERS = {
  ...CORS_HEADERS,
  'Access-Control-Max-Age': '86400',
} as const;

