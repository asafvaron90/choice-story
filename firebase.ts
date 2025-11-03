// app/firebase.ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, NextOrObserver, signInWithPopup, signOut, User, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  // Your Firebase config object
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Track emulator connection to prevent duplicate connections
let emulatorsConnected = false;

// Connect to emulators in development if enabled
if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' && !emulatorsConnected) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
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
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error', error);
    throw error;
  }
};

// Auth state listener
export const onAuthStateChanged = (callback: NextOrObserver<User | null>) => {
  return auth.onAuthStateChanged(callback);
};

export { app, auth, storage, db, functions };