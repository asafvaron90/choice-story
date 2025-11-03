import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Service to handle Firebase Admin SDK initialization and provide access to admin services
 * This ensures consistent initialization across the application
 */
export class FirebaseAdminService {
  private static instance: FirebaseAdminService;
  private app: App | null = null;
  private storage: ReturnType<typeof getStorage> | null = null;
  private firestore: FirebaseFirestore.Firestore | null = null;
  private isInitialized = false;
  private initializationError: string | null = null;

  private constructor() {
    this.initialize();
  }

  /**
   * Get the singleton instance of FirebaseAdminService
   */
  public static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  /**
   * Initialize Firebase Admin SDK if not already initialized
   */
  private initialize() {
    try {
      const apps = getApps();
      const env = process.env.FIREBASE_ENV || process.env.NEXT_PUBLIC_FIREBASE_ENV || process.env.NODE_ENV || 'development';
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.FIREBASE_PROJECT_ID;
      
      if (!isBuildTime) {
        console.log(`[FIREBASE_ADMIN] Starting initialization in environment: ${env}`);
      }
      
      if (apps.length > 0) {
        if (!isBuildTime) {
          console.log('[FIREBASE_ADMIN] Using existing Firebase Admin app');
        }
        this.app = apps[0];
        this.isInitialized = true;
        return;
      }

      if (!isBuildTime) {
        console.log('[FIREBASE_ADMIN] Initializing new Firebase Admin app');
      }
      
      // Check for required environment variables
      const requiredVars = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      };

      // Only log environment check if not in build time
      if (!isBuildTime) {
        console.log('[FIREBASE_ADMIN] Environment variables check:', {
          projectId: !!requiredVars.projectId,
          clientEmail: !!requiredVars.clientEmail,
          privateKey: !!requiredVars.privateKey,
          privateKeyFormat: requiredVars.privateKey?.includes('-----BEGIN PRIVATE KEY-----') ? 'valid' : 'invalid',
          storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      }

      // Check if we're missing required variables
      const missingVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        const errorMsg = `Missing required Firebase Admin environment variables: ${missingVars.join(', ')}`;
        // Only log errors if not in build time (to reduce build log noise)
        if (!isBuildTime) {
          console.error('[FIREBASE_ADMIN]', errorMsg);
        }
        this.initializationError = errorMsg;
        
        // In development or build time, this is not necessarily fatal
        if (env === 'development' || isBuildTime) {
          if (!isBuildTime) {
            console.warn('[FIREBASE_ADMIN] Firebase Admin not initialized - client-side fallback will be used');
          }
          return;
        } else {
          throw new Error(errorMsg);
        }
      }
      
      // Process private key
      const privateKey = requiredVars.privateKey!.replace(/\\n/g, '\n');
      
      // Validate private key format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        const errorMsg = 'Firebase private key format is invalid';
        console.error('[FIREBASE_ADMIN]', errorMsg);
        this.initializationError = errorMsg;
        
        if (env === 'development') {
          console.warn('[FIREBASE_ADMIN] Invalid private key - client-side fallback will be used');
          return;
        } else {
          throw new Error(errorMsg);
        }
      }
      
      // Initialize the app
      try {
        this.app = initializeApp({
          credential: cert({
            projectId: requiredVars.projectId!,
            clientEmail: requiredVars.clientEmail!,
            privateKey,
          }),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        
        this.isInitialized = true;
        console.log('[FIREBASE_ADMIN] Firebase Admin SDK initialized successfully');
      } catch (initError) {
        const errorMsg = `Firebase Admin initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`;
        console.error('[FIREBASE_ADMIN]', errorMsg);
        this.initializationError = errorMsg;
        
        if (env === 'development') {
          console.warn('[FIREBASE_ADMIN] Initialization failed - client-side fallback will be used');
          return;
        } else {
          throw initError;
        }
      }
    } catch (error) {
      const errorMsg = `Critical Firebase Admin initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[FIREBASE_ADMIN]', errorMsg);
      this.initializationError = errorMsg;
      this.isInitialized = false;
    }
  }

  /**
   * Get the Firebase Admin Storage instance
   */
  public getStorage() {
    if (!this.isInitialized || !this.app) {
      const error = this.initializationError || 'Firebase Admin not initialized';
      console.error('[FIREBASE_ADMIN] Cannot get storage:', error);
      throw new Error(error);
    }
    if (!this.storage) {
      console.log('[FIREBASE_ADMIN] Creating new Storage instance');
      this.storage = getStorage(this.app);
    }
    return this.storage;
  }

  /**
   * Get the Firebase Admin Firestore instance
   */
  public getFirestore() {
    if (!this.isInitialized || !this.app) {
      const error = this.initializationError || 'Firebase Admin not initialized';
      console.error('[FIREBASE_ADMIN] Cannot get Firestore:', error);
      throw new Error(error);
    }
    if (!this.firestore) {
      console.log('[FIREBASE_ADMIN] Creating new Firestore instance for database: choice-story-db');
      this.firestore = getFirestore(this.app, 'choice-story-db');
    }
    return this.firestore;
  }

  /**
   * Check if Firebase Admin is properly initialized
   */
  public isReady() {
    return this.isInitialized && this.app !== null;
  }

  /**
   * Get initialization error if any
   */
  public getInitializationError() {
    return this.initializationError;
  }
}

// Export a singleton instance
export const firebaseAdmin = FirebaseAdminService.getInstance(); 