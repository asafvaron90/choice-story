import { KidDetails, Story, Account } from '@/models';
import { UserData } from '../network/UserApi';
import { firebaseAdmin } from './firebase-admin.service';
import { storageService } from './storage.service';
import { Firestore } from '@google-cloud/firestore';

interface FirestoreData {
  [key: string]: unknown;
  createAt?: Date;
  lastUpdated?: Date;
}

/**
 * Server-side version of FirestoreService that uses Firebase Admin SDK
 * Only for use in API routes and server components
 */
class FirestoreServerService {
  private db!: Firestore;
  private environment: string = 'dev';
  private isInitialized: boolean = false;
  private initializationError: string | null = null;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    
    try {
      if (!firebaseAdmin.isReady()) {
        const adminError = firebaseAdmin.getInitializationError();
        throw new Error(adminError || 'Firebase Admin not initialized');
      }

      this.db = firebaseAdmin.getFirestore();
      this.isInitialized = true;
      console.log('[FIRESTORE_SERVER] Initialized with environment:', this.environment);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FIRESTORE_SERVER] Failed to initialize:', errorMsg);
      this.isInitialized = false;
      this.initializationError = errorMsg;
    }
  }

  // Helper to ensure initialization happened
  private ensureInitialized() {
    if (!this.isInitialized) {
      const error = this.initializationError || 'Firebase Admin not initialized. Check your environment variables.';
      throw new Error(error);
    }
  }

  // Helper to check if service is available
  public isReady(): boolean {
    return this.isInitialized && !!this.db;
  }

  // Get initialization error
  public getInitializationError(): string | null {
    return this.initializationError;
  }

  private getUsersCollection() {
    this.ensureInitialized();
    return `users_${this.environment}`;
  }

  private getStoriesCollection() {
    this.ensureInitialized();
    return `stories_gen_${this.environment}`;
  }

  /**
   * Get user data by UID
   */
  async getUserByUid(uid: string) {
    try {
      this.ensureInitialized();
      
      const userRef = this.db.collection(this.getUsersCollection()).doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.log('[FIRESTORE_SERVER] No user found for uid:', uid);
        return null;
      }

      const data = userDoc.data();
      const userData = {
        ...data,
        uid,
        createAt: data?.createAt?.toDate() || new Date(),
        lastUpdated: data?.lastUpdated?.toDate() || new Date(),
      };
      
      console.log('[FIRESTORE_SERVER] Successfully retrieved user data for:', uid);
      return userData;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error fetching user by uid:', error);
      throw error;
    }
  }

  /**
   * Create a new user in Firestore
   * @param userData User data including uid
   * @returns The created user data
   */
  async createUserData(userData: UserData): Promise<UserData> {
    try {
      this.ensureInitialized();
      
      const userRef = this.db.collection(this.getUsersCollection()).doc(userData.uid);
      
      const now = new Date();
      const userDataWithTimestamps: FirestoreData = {
        ...userData,
        createAt: now,
        lastUpdated: now,
      };
      
      await userRef.set(userDataWithTimestamps);
      
      console.log('[FIRESTORE_SERVER] Successfully created user data for:', userData.uid);
      return {  
        ...userData,
        createAt: now.toISOString(),
        lastUpdated: now.toISOString(),
      } as UserData;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error creating user data:', error);
      throw error;
    }
  }

  /**
   * Update an existing user data in Firestore
   * @param userData User data with fields to update
   * @returns The updated user data
   */
  async updateUserData(userData: UserData): Promise<UserData> {
    try {
      this.ensureInitialized();
      
      const userRef = this.db.collection(this.getUsersCollection()).doc(userData.uid);
      
      // Check if user exists
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        throw new Error(`User with ID ${userData.uid} doesn't exist.`);
      }
      
      const existingData = userDoc.data() || {};
      const now = new Date();
      
      const updateData = {
        ...userData,
        lastUpdated: now,
      };
      
      // Remove uid from update data (it's in the document path)
      const { uid: _, ...dataWithoutUid } = updateData;
      
      await userRef.update(dataWithoutUid);
      
      return {
        ...existingData,
        ...userData,
        uid: userData.uid,
        createAt: existingData.createAt?.toDate ? existingData.createAt.toDate() : new Date(),
        lastUpdated: now.toISOString(),
      } as UserData;
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }

  /**
   * Get all kids for a user
   */
  async getKids(userId: string) : Promise<KidDetails[]> {
    try {
      this.ensureInitialized();
      
      const kidsRef = this.db.collection(`${this.getUsersCollection()}/${userId}/kids`);
      const snapshot = await kidsRef.get();

      const kids = snapshot.docs.map(doc => {
        const data = doc.data();
        return data as KidDetails;
      });

      return kids;
    } catch (error) {
      console.error('Error fetching kids:', error);
      throw error;
    }
  }

  /**
   * Get a specific kid for a user
   */
  async getKid(userId: string, kidId: string) {
    try {
      this.ensureInitialized();
      
      const kidRef = this.db.collection(`${this.getUsersCollection()}/${userId}/kids`).doc(kidId);
      const doc = await kidRef.get();

      if (!doc.exists) {
        console.log('No kid found with id:', kidId);
        return null;
      }

      const data = doc.data();
      // Return exactly what's in the database without defaults
      return data as KidDetails;
    } catch (error) {
      console.error('Error fetching kid:', error);
      throw error;
    }
  }

  /**
   * Save a kid (create or update)
   */
  async saveKid(userId: string, kidDetails: KidDetails) : Promise<KidDetails> {
    try {
      this.ensureInitialized();
      
      if (!kidDetails.id || kidDetails.id.trim() === '') {
        // Create new kid - ensure all required fields are present
        
        // Create with all required fields
        const kidsCollection = this.db.collection(`${this.getUsersCollection()}/${userId}/kids`);
        const newKidRef = await kidsCollection.add(kidDetails as unknown as Record<string, unknown>);
        newKidRef.update({
          id: newKidRef.id,
        });
        return kidDetails;
      } else {
        const kidRef = this.db.collection(`${this.getUsersCollection()}/${userId}/kids`).doc(kidDetails.id);
        
        await kidRef.update(kidDetails as unknown as Record<string, unknown>);
        return kidDetails;
      }
    } catch (error) {
      console.error('Error saving kid:', error);
      throw error;
    }
  }

  /**
   * Delete a kid
   */
  async deleteKid(userId: string, kidId: string) {
    try {
      this.ensureInitialized();
      
      const kidRef = this.db.collection(`${this.getUsersCollection()}/${userId}/kids`).doc(kidId);
      await kidRef.delete();
    } catch (error) {
      console.error('Error deleting kid:', error);
      throw error;
    }
  }
  
  /**
   * Get a story by ID
   */
  async getStoryById(storyId: string): Promise<Story | null> {
    try {
      this.ensureInitialized();
      
      const storyRef = this.db.collection(this.getStoriesCollection()).doc(storyId);
      const storyDoc = await storyRef.get();
      
      if (!storyDoc.exists) {
        return null;
      }
      
      const data = storyDoc.data();
      return data as Story;
    } catch (error) {
      console.error('Error fetching story:', error);
      throw error;
    }
  }
  
  /**
   * Get stories by kid ID
   */
  async getStoriesByKidId(userId: string, kidId: string) {
    try {
      this.ensureInitialized();
      
      const storiesRef = this.db.collection(this.getStoriesCollection())
        .where('userId', '==', userId)
        .where('kidId', '==', kidId);
        
      const snapshot = await storiesRef.get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Date ? data.createdAt : 
            (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()),
          lastUpdated: data.lastUpdated instanceof Date ? data.lastUpdated :
            (data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()),
        } as Story;
      });
    } catch (error) {
      console.error('Error fetching stories:', error);
      throw error;
    }
  }
  
  /**
   * Delete a story and clean up related resources
   */
  async deleteStory(userId: string, kidId: string, storyId: string): Promise<void> {
    try {
      this.ensureInitialized();
      
      // Delete story images from storage
      await storageService.deleteStoryFolder(userId, kidId, storyId);
      
      // Delete story document from Firestore
      const storyRef = this.db.collection(this.getStoriesCollection()).doc(storyId);
      await storyRef.delete();
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }
  
  /**
   * Save a story (create or update)
   */
  async saveStory(story: Story): Promise<Story> {
    try {
      this.ensureInitialized();
      
      console.log("Saving story:", story.id ? "update" : "create", story.title);
      
      // Create a clean copy of the story for Firestore, removing any undefined fields
      const storyData = JSON.parse(JSON.stringify(story));
      
      const now = new Date();
      
      if (story.id) {
        // Update existing story
        const storyRef = this.db.collection(this.getStoriesCollection()).doc(story.id);
        
        storyData.lastUpdated = now;
        await storyRef.update(storyData);
        console.log("Updated story", story.id);
      } else {
        // Create new story
        const storiesCollection = this.db.collection(this.getStoriesCollection());
        storyData.createdAt = now;
        storyData.lastUpdated = now;
        
        const docRef = await storiesCollection.add(storyData);
        story.id = docRef.id;
        await docRef.update({ id: story.id });
        console.log("Created story", story.id);
      }

      return story;
    } catch (error) {
      console.error('Error saving story:', error);
      throw error;
    }
  }

  /**
   * Update a story with transaction to prevent race conditions
   * Use this for partial updates (PATCH operations)
   */
  async updateStoryWithTransaction(storyId: string, patchData: Partial<Story>): Promise<Story | null> {
    try {
      this.ensureInitialized();
      
      const storyRef = this.db.collection(this.getStoriesCollection()).doc(storyId);
      
      // Use transaction to ensure atomic read-modify-write
      const updatedStory = await this.db.runTransaction(async (transaction) => {
        const storyDoc = await transaction.get(storyRef);
        
        if (!storyDoc.exists) {
          return null;
        }
        
        const existingStory = storyDoc.data() as Story;
        
        // Merge patch data with existing story
        const updatedData: Story = {
          ...existingStory,
          ...patchData,
          id: storyId, // Ensure ID remains correct
          userId: existingStory.userId, // Don't allow userId changes
          lastUpdated: new Date()
        };
        
        // Create a clean copy for Firestore, removing any undefined fields
        const cleanData = JSON.parse(JSON.stringify(updatedData));
        
        // Update atomically
        transaction.update(storyRef, cleanData);
        
        return updatedData;
      });
      
      if (updatedStory) {
        console.log("Updated story with transaction", storyId);
      }
      
      return updatedStory;
    } catch (error) {
      console.error('Error updating story with transaction:', error);
      throw error;
    }
  }

  async getStoriesByUserId(userId: string): Promise<Story[]> {
    try {
      this.ensureInitialized();
      
      const storiesRef = this.db.collection(this.getStoriesCollection())
        .where('userId', '==', userId);
        
      const snapshot = await storiesRef.get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Date ? data.createdAt : 
            (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()),
          lastUpdated: data.lastUpdated instanceof Date ? data.lastUpdated :
            (data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()),
        } as Story;
      });
    } catch (error) {
      console.error('Error fetching stories:', error);
      throw error;
    }
  }

  private getAccountsCollection() {
    this.ensureInitialized();
    return `accounts_${this.environment}`;
  }

  /**
   * Get account data by UID
   */
  async getAccountByUid(uid: string) {
    try {
      this.ensureInitialized();
      
      const accountRef = this.db.collection(this.getAccountsCollection()).doc(uid);
      const accountDoc = await accountRef.get();

      if (!accountDoc.exists) {
        console.log('[FIRESTORE_SERVER] No account found for uid:', uid);
        return null;
      }

      const data = accountDoc.data();
      const account = {
        ...data,
        uid,
        createAt: data?.createAt instanceof Date ? data.createAt : 
          (data?.createAt?.toDate ? data.createAt.toDate() : new Date()),
        lastUpdated: data?.lastUpdated instanceof Date ? data.lastUpdated : 
          (data?.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()),
      };
      
      console.log('[FIRESTORE_SERVER] Successfully retrieved account data for:', uid);
      return account;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error fetching account by uid:', error);
      throw error;
    }
  }

  /**
   * Get account data by email
   */
  async getAccountByEmail(email: string) {
    try {
      this.ensureInitialized();
      
      const accountsRef = this.db.collection(this.getAccountsCollection());
      const q = accountsRef.where('email', '==', email);
      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        console.log('[FIRESTORE_SERVER] No account found for email:', email);
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const account = {
        ...data,
        uid: doc.id,
        createAt: data?.createAt instanceof Date ? data.createAt : 
          (data?.createAt?.toDate ? data.createAt.toDate() : new Date()),
        lastUpdated: data?.lastUpdated instanceof Date ? data.lastUpdated : 
          (data?.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()),
      };
      
      console.log('[FIRESTORE_SERVER] Successfully retrieved account data for email:', email);
      return account;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error fetching account by email:', error);
      throw error;
    }
  }

  /**
   * Create a new account in Firestore
   * @param accountData Account data including uid
   * @returns The created account data
   */
  async createAccountData(accountData: Account): Promise<Account> {
    try {
      this.ensureInitialized();
      
      const accountRef = this.db.collection(this.getAccountsCollection()).doc(accountData.uid);
      
      const now = new Date();
      const accountDataWithTimestamps: FirestoreData = {
        ...accountData,
        createAt: now,
        lastUpdated: now,
      };
      
      await accountRef.set(accountDataWithTimestamps);
      
      console.log('[FIRESTORE_SERVER] Successfully created account data for:', accountData.uid);
      return {  
        ...accountData,
        createAt: now,
        lastUpdated: now,
      };
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error creating account data:', error);
      throw error;
    }
  }

  /**
   * Update an existing account data in Firestore
   * @param accountData Account data with fields to update
   * @returns The updated account data
   */
  async updateAccountData(accountData: Account): Promise<Account> {
    try {
      this.ensureInitialized();
      
      const accountRef = this.db.collection(this.getAccountsCollection()).doc(accountData.uid);
      
      // Check if account exists
      const accountDoc = await accountRef.get();
      if (!accountDoc.exists) {
        throw new Error(`Account with ID ${accountData.uid} doesn't exist.`);
      }
      
      const existingData = accountDoc.data() || {};
      const now = new Date();
      
      const updateData = {
        ...accountData,
        lastUpdated: now,
      };
      
      // Remove uid from update data (it's in the document path)
      const { uid: _, ...dataWithoutUid } = updateData;
      
      await accountRef.update(dataWithoutUid);
      
      return {
        ...existingData,
        ...accountData,
        uid: accountData.uid,
        createAt: existingData.createAt instanceof Date ? existingData.createAt : 
          (existingData.createAt?.toDate ? existingData.createAt.toDate() : new Date()),
        lastUpdated: now,
      } as Account;
    } catch (error) {
      console.error('Error updating account data:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const firestoreServerService = new FirestoreServerService();
export default firestoreServerService; 