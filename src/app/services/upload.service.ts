import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@choiceStoryWeb/firebase";

/**
 * Service for handling file uploads to Firebase Storage
 */
export class UploadService {
  /**
   * Uploads a file to Firebase Storage
   * @param file The file to upload
   * @param path The storage path to upload to
   * @returns A promise that resolves to the download URL
   */
  static async uploadFile(file: File, path: string): Promise<string> {
    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized. Please check your Firebase configuration.');
      }
      // Create storage reference
      const storageRef = ref(storage, path);
      
      // Upload to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const url = await getDownloadURL(uploadResult.ref);
      
      return url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Uploads a base64 encoded string to Firebase Storage
   * @param base64 The base64 encoded string
   * @param path The storage path to upload to
   * @param contentType The content type of the file
   * @returns A promise that resolves to the download URL
   */
  static async uploadBase64(base64: string, path: string, contentType = 'image/png'): Promise<string> {
    try {
      // Convert base64 to blob
      const byteString = atob(base64.split(',')[1]);
      const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: contentType || mimeString });
      const file = new File([blob], path.split('/').pop() || 'file', { type: contentType || mimeString });
      
      // Upload file
      return this.uploadFile(file, path);
    } catch (error) {
      console.error('Error uploading base64:', error);
      throw error;
    }
  }

  /**
   * Generates a unique file path for storage
   * @param userId The user ID
   * @param directory The directory to store in
   * @param fileName Optional filename
   * @returns A unique storage path
   */
  static generatePath(userId: string, directory: string, fileName?: string): string {
    const actualFileName = fileName || `file_${Date.now()}`;
    return `users/${userId}/${directory}/${actualFileName}`;
  }

  /**
   * Generates a unique kid image path
   */
  static generateKidImagePath(userId: string, kidName: string): string {
    return this.generatePath(userId, 'kids', `${kidName}_${Date.now()}.png`);
  }

  /**
   * Generates a unique avatar path
   */
  static generateAvatarPath(userId: string, kidName: string): string {
    return this.generatePath(userId, 'avatars', `${kidName}_avatar_${Date.now()}.png`);
  }
} 