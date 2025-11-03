import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

/**
 * Verify a Firebase ID token from a client
 * @param token The ID token to verify
 * @returns The decoded token containing the user's UID
 */
export async function verifyIdToken(token: string) {
  try {
    console.log(`[verifyIdToken] Starting token verification`);
    
    // Make sure Firebase Admin is initialized (should be done in firestore.server.ts)
    if (!getApps().length) {
      console.error(`[verifyIdToken] Firebase Admin SDK not initialized`);
      console.error('[verifyIdToken] Environment check:', {
        projectId: !!process.env.FIREBASE_PROJECT_ID,
        clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        env: process.env.NODE_ENV,
      });
      throw new Error('Firebase Admin SDK not initialized');
    }
    
    // Get the Auth instance
    const auth = getAuth();
    console.log(`[verifyIdToken] Got Firebase Auth instance`);
    
    // Log token format check (without exposing the actual token)
    console.log(`[verifyIdToken] Token format check:`, {
      length: token.length,
      startsWithEy: token.startsWith('ey'),
      parts: token.split('.').length
    });
    
    // Verify the token
    console.log(`[verifyIdToken] Verifying token with Firebase...`);
    const decodedToken = await auth.verifyIdToken(token);
    console.log(`[verifyIdToken] Token verified successfully, uid: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error) {
    console.error('[verifyIdToken] Error verifying token:', error);
    if (error instanceof Error) {
      console.error('[verifyIdToken] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

/**
 * Extract and verify the Bearer token from the Authorization header
 * @param authHeader The Authorization header value
 * @returns The decoded token or null if no valid token was found
 */
export async function verifyAuthHeader(authHeader: string | null) {
  console.log(`[verifyAuthHeader] Starting header verification`);
  console.log(`[verifyAuthHeader] Header present: ${!!authHeader}`);
  
  if (!authHeader) {
    console.log(`[verifyAuthHeader] No Authorization header provided`);
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    console.log(`[verifyAuthHeader] Invalid header format, got: ${authHeader.substring(0, 10)}...`);
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    console.log(`[verifyAuthHeader] Extracted token, length: ${token.length}`);
    
    const decodedToken = await verifyIdToken(token);
    console.log(`[verifyAuthHeader] Token verified successfully, uid: ${decodedToken?.uid}`);
    console.log(`[verifyAuthHeader] Full decoded token:`, {
      uid: decodedToken?.uid,
      email: decodedToken?.email,
      email_verified: decodedToken?.email_verified,
      auth_time: decodedToken?.auth_time,
      iat: decodedToken?.iat,
      exp: decodedToken?.exp
    });
    return decodedToken;
  } catch (error) {
    console.error('[verifyAuthHeader] Error verifying token:', error);
    if (error instanceof Error) {
      console.error('[verifyAuthHeader] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return null;
  }
} 