/**
 * Firestore Helper
 * Centralized database access helper for Firebase Functions
 * Ensures consistent collection paths across all functions
 */

import * as admin from 'firebase-admin';

export class FirestoreHelper {
  private db: admin.firestore.Firestore;
  private environment: string;

  constructor(db: admin.firestore.Firestore, environment: string) {
    if (!environment) {
      throw new Error('FirestoreHelper requires environment parameter (development, production, etc.)');
    }
    this.db = db;
    this.environment = environment;
  }

  /**
   * Get the environment-specific collection name for accounts
   * Collection structure: accounts_{environment}/{accountId}
   */
  getAccountsCollection(): string {
    return `accounts_${this.environment}`;
  }

  /**
   * Get the environment-specific collection name for users (kids)
   * Collection structure: users_{environment}/{kidId}
   * Note: "users" collection actually stores kid documents, not account users
   */
  getUsersCollection(): string {
    return `users_${this.environment}`;
  }

  /**
   * Get the environment-specific collection name for stories
   * Collection structure: stories_gen_{environment}/{storyId}
   */
  getStoriesCollection(): string {
    return `stories_gen_${this.environment}`;
  }

  /**
   * Get a reference to an account document
   * @param accountId The account ID
   */
  getAccountRef(accountId: string): admin.firestore.DocumentReference {
    return this.db.collection(this.getAccountsCollection()).doc(accountId);
  }

  /**
   * Get a reference to a kid document
   * @param kidId The kid ID
   */
  getKidRef(kidId: string): admin.firestore.DocumentReference {
    return this.db.collection(this.getUsersCollection()).doc(kidId);
  }

  /**
   * Get a reference to a story document
   * @param storyId The story ID
   */
  getStoryRef(storyId: string): admin.firestore.DocumentReference {
    return this.db.collection(this.getStoriesCollection()).doc(storyId);
  }

  /**
   * Get a kid document by ID
   * @param kidId The kid ID
   * @returns The kid document snapshot
   */
  async getKid(kidId: string): Promise<admin.firestore.DocumentSnapshot> {
    return this.getKidRef(kidId).get();
  }

  /**
   * Get all kids for an account
   * @param accountId The account ID
   * @returns Array of kid document snapshots
   */
  async getKidsByAccountId(accountId: string): Promise<admin.firestore.QuerySnapshot> {
    return this.db.collection(this.getUsersCollection())
      .where('accountId', '==', accountId)
      .get();
  }

  /**
   * Update a kid document
   * @param kidId The kid ID
   * @param data The data to update
   */
  async updateKid(kidId: string, data: Record<string, unknown>): Promise<void> {
    await this.getKidRef(kidId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get a story document by ID
   * @param storyId The story ID
   * @returns The story document snapshot
   */
  async getStory(storyId: string): Promise<admin.firestore.DocumentSnapshot> {
    return this.getStoryRef(storyId).get();
  }

  /**
   * Create or update a story document
   * @param storyId The story ID (or empty string to generate)
   * @param data The story data
   * @returns The story ID
   */
  async saveStory(storyId: string, data: Record<string, unknown>): Promise<string> {
    if (storyId) {
      // Update existing story
      await this.getStoryRef(storyId).set({
        ...data,
        id: storyId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return storyId;
    } else {
      // Create new story
      const docRef = await this.db.collection(this.getStoriesCollection()).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const newStoryId = docRef.id;
      // Update with the ID
      await docRef.update({ id: newStoryId });
      return newStoryId;
    }
  }

  /**
   * Get stories for a kid
   * @param kidId The kid ID
   * @returns Array of story document snapshots
   */
  async getStoriesByKidId(kidId: string): Promise<admin.firestore.QuerySnapshot> {
    return this.db.collection(this.getStoriesCollection())
      .where('kidId', '==', kidId)
      .get();
  }

  /**
   * Get stories for an account
   * @param accountId The account ID
   * @returns Array of story document snapshots
   */
  async getStoriesByAccountId(accountId: string): Promise<admin.firestore.QuerySnapshot> {
    return this.db.collection(this.getStoriesCollection())
      .where('accountId', '==', accountId)
      .get();
  }

  /**
   * Delete a story document
   * @param storyId The story ID
   */
  async deleteStory(storyId: string): Promise<void> {
    await this.getStoryRef(storyId).delete();
  }

  /**
   * Get the raw Firestore instance
   * Use this only when you need direct access to Firestore
   */
  getDb(): admin.firestore.Firestore {
    return this.db;
  }

  /**
   * Get the current environment
   */
  getEnvironment(): string {
    return this.environment;
  }
}

