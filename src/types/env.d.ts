declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      
      // Firebase Configuration (Server-side Admin)
      FIREBASE_PROJECT_ID: string;
      FIREBASE_CLIENT_EMAIL: string;
      FIREBASE_PRIVATE_KEY: string;
      
      // Firebase Configuration (Client-side)
      NEXT_PUBLIC_FIREBASE_API_KEY: string;
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
      NEXT_PUBLIC_FIREBASE_APP_ID: string;
      
      // App URLs
      NEXT_PUBLIC_BASE_URL_LOCAL: string;
      NEXT_PUBLIC_BASE_URL_PROD: string;
      NEXT_PUBLIC_BASE_URL_PROD_2: string;
      
      // Feature flags
      NEXT_PUBLIC_ENABLE_CLIENT_FALLBACK: string;

      NEXT_PUBLIC_GEMINI_API_KEY: string;
      OPENAI_API_KEY: string;
      REPLICATE_API_KEY: string;
      
    }
  }
}

export {}; 