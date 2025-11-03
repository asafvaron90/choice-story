import { firebaseAdmin } from './firebase-admin.service';

// Get bucket name from environment
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

/**
 * A centralized service for all Firebase Storage operations on the server side
 * This class handles the storage and retrieval of all images in the application
 */
export class StorageService {
  /**
   * Deletes a story folder and all its contents from Firebase Storage
   */
  async deleteStoryFolder(userId: string, kidId: string, storyId: string) {
    try {
      const folderPath = this.getStoryBasePath(userId, kidId, storyId);
      const storage = firebaseAdmin.getStorage();
      const bucket = storage.bucket(bucketName);
      await bucket.deleteFiles({
        prefix: folderPath
      });
    } catch (error) {
      console.error('Error deleting story folder:', error);
      throw error;
    }
  }

  /**
   * Generates the base storage path for a story
   */
  private getStoryBasePath(userId: string, kidId: string, storyId: string): string {
    return `users/${userId}/${kidId}/stories/${storyId}/`;
  }
}

// Create a singleton instance
export const storageService = new StorageService(); 