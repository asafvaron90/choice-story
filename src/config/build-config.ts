export const ENV_DEV: string = 'development';
export const ENV_PROD: string = 'production';
export const ENV_TEST: string = 'test';

export const NODE_ENV: string = process.env.NODE_ENV || 'development';
export const API_ENV: string = process.env.NODE_ENV || 'development';

export const IS_PROD: boolean = NODE_ENV === ENV_PROD;
export const IS_DEV: boolean = NODE_ENV === ENV_DEV;

/**
 * Get the Firebase environment explicitly
 * Client-side: Uses NEXT_PUBLIC_FIREBASE_ENV
 * Server-side: Uses FIREBASE_ENV
 * Falls back to NODE_ENV if not set
 */
export function getFirebaseEnvironment(): string {
  // Check if we're on client or server
  const isClient = typeof window !== 'undefined';
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && !isClient && !process.env.FIREBASE_PROJECT_ID);
  
  if (isClient) {
    // Client-side: must use NEXT_PUBLIC_ prefix
    const clientEnv = process.env.NEXT_PUBLIC_FIREBASE_ENV;
    if (!clientEnv) {
      if (!isBuildTime) {
        console.error('[BUILD_CONFIG] NEXT_PUBLIC_FIREBASE_ENV not set, falling back to NODE_ENV');
      }
      return NODE_ENV;
    }
    return clientEnv;
  } else {
    // Server-side: can use regular env vars
    const serverEnv = process.env.FIREBASE_ENV || process.env.NEXT_PUBLIC_FIREBASE_ENV;
    if (!serverEnv) {
      if (!isBuildTime) {
        console.error('[BUILD_CONFIG] FIREBASE_ENV not set, falling back to NODE_ENV');
      }
      return NODE_ENV;
    }
    return serverEnv;
  }
}

/**
 * Firebase environment - should be explicitly set via environment variables
 * Use getFirebaseEnvironment() for runtime access
 */
export const FIREBASE_ENV: string = 
  (typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_FIREBASE_ENV 
    : process.env.FIREBASE_ENV || process.env.NEXT_PUBLIC_FIREBASE_ENV
  ) || NODE_ENV;

// Base URLs configuration
export const BASE_DOMAIN_LOCAL: string = process.env.NEXT_PUBLIC_BASE_URL_LOCAL || 'http://localhost:3000';
export const BASE_DOMAIN_PROD: string = process.env.NEXT_PUBLIC_BASE_URL_PROD || 'https://your-production-domain.com';
export const BASE_DOMAIN_PROD_2: string = process.env.NEXT_PUBLIC_BASE_URL_PROD_2 || 'https://your-production-domain-2.com';

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

