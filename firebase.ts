// app/firebase.ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { 
  getAuth, 
  GoogleAuthProvider, 
  NextOrObserver, 
  signInWithPopup, 
  signOut, 
  User, 
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import * as Sentry from '@sentry/nextjs';

const firebaseConfig = {
  // Your Firebase config object
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Debug: Log config status (only in browser, not during build)
if (typeof window !== 'undefined') {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missingKeys.length > 0) {
    console.warn('[FIREBASE] Missing config values:', missingKeys);
    console.warn('[FIREBASE] Available env vars:', {
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      hasMessagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  }
}

// Initialize Firebase only if config is valid (prevents build-time errors)
const hasValidConfig = firebaseConfig.apiKey && 
                       firebaseConfig.authDomain && 
                       firebaseConfig.projectId &&
                       firebaseConfig.storageBucket &&
                       firebaseConfig.messagingSenderId &&
                       firebaseConfig.appId;

let app: ReturnType<typeof getApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let functions: ReturnType<typeof getFunctions> | null = null;

if (hasValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    storage = getStorage(app);
    // Use the named database 'choice-story-db'
    db = getFirestore(app, 'choice-story-db');
    functions = getFunctions(app);

    // Configure auth persistence explicitly (only in browser)
    if (typeof window !== 'undefined' && auth) {
      setPersistence(auth, browserLocalPersistence)
        .then(() => {
          console.log('[FIREBASE AUTH] ✅ Persistence configured: browserLocalPersistence');
          console.log('[FIREBASE AUTH] Sessions will persist across browser restarts');
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Firebase Auth persistence configured successfully',
            level: 'info',
            data: {
              persistenceType: 'browserLocalPersistence'
            }
          });
        })
        .catch((error) => {
          console.error('[FIREBASE AUTH] ⚠️ Failed to set persistence:', error);
          console.warn('[FIREBASE AUTH] Falling back to default persistence mode');
          Sentry.captureException(error, {
            tags: {
              component: 'firebase-auth',
              operation: 'setPersistence'
            },
            extra: {
              persistenceType: 'browserLocalPersistence',
              errorCode: error.code,
              errorMessage: error.message
            }
          });
        });
    }
  } catch (error) {
    console.error('[FIREBASE] Error initializing Firebase:', error);
    Sentry.captureException(error, {
      tags: {
        component: 'firebase',
        operation: 'initialization'
      }
    });
  }
} else {
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  if (!isBuildTime) {
    console.warn('[FIREBASE] Missing Firebase config values - Firebase client will not be initialized until config is available');
  }
}

// Track emulator connection to prevent duplicate connections
let emulatorsConnected = false;

// Connect to emulators in development if enabled
if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' && !emulatorsConnected && auth && db && storage && functions) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    // Note: Emulator uses default database, so named database won't work with emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    emulatorsConnected = true;
    console.log('🔧 Connected to Firebase Emulators');
  } catch (error) {
    // Emulators may already be connected, ignore the error
    console.log('🔧 Firebase Emulators already connected or failed to connect');
  }
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please check your Firebase configuration.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error', error);
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please check your Firebase configuration.');
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error', error);
    throw error;
  }
};

// Auth state listener
export const onAuthStateChanged = (callback: NextOrObserver<User | null>) => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please check your Firebase configuration.');
  }
  return auth.onAuthStateChanged(callback);
};

export { app, auth, storage, db, functions };