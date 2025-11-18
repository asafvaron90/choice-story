import * as admin from "firebase-admin";
import { FirestoreHelper } from "./firestore-helper";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore with named database
const db = admin.firestore();
// Configure to use the named database 'choice-story-db'
// Note: This requires the database to exist in your Firebase project
db.settings({ 
  databaseId: 'choice-story-db' 
});

// Helper function to get the database instance
export const getDb = () => db;

/**
 * Get the current environment from NODE_ENV
 * Returns 'development' if NODE_ENV is 'development', otherwise 'production'
 * Defaults to 'production' if NODE_ENV is not set
 */
export function getEnvironment(): 'development' | 'production' {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'development') {
    return 'development';
  }
  return 'production';
}

// Initialize Firestore Helper for consistent database access
// Environment must be passed from the request, not from process.env
export const getFirestoreHelper = (environment: string) => {
  if (!environment) {
    throw new Error('Environment parameter is required for FirestoreHelper');
  }
  return new FirestoreHelper(db, environment);
};

/**
 * Helper: Save Base64 Image to Firebase Storage
 */
export async function saveImageToStorage(
  base64Image: string,
  accountId: string,
  userId: string,
  storyId: string,
  imageType: 'avatar' | 'cover' | 'page',
  pageNum?: number
): Promise<string> {
  // Convert base64 to buffer
  const imageBuffer = Buffer.from(base64Image, 'base64');
  
  // Determine file path based on image type
  let filePath: string;
  if (imageType === 'avatar') {
    filePath = `accounts/${accountId}/users/${userId}/avatars/avatar.png`;
  } else if (imageType === 'cover') {
    filePath = `accounts/${accountId}/users/${userId}/stories/${storyId}/cover.png`;
  } else {
    // page image - use timestamp if no pageNum provided
    const timestamp = Date.now();
    filePath = `accounts/${accountId}/users/${userId}/stories/${storyId}/pages/page-${pageNum || timestamp}.png`;
  }

  // Upload to Firebase Storage
  const bucket = admin.storage().bucket();
  const file = bucket.file(filePath);
  
  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/png',
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  // Make file publicly accessible
  await file.makePublic();

  // Return public URL
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

export { admin };

