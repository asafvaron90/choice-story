import { KidDetails, Story, Account } from '@/models';
import { UserData } from '../network/UserApi';
import { firebaseAdmin } from './firebase-admin.service';
import { storageService } from './storage.service';
import { Firestore } from '@google-cloud/firestore';
import { getFirebaseEnvironment } from '@/config/build-config';

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
  private environment: string;
  private isInitialized: boolean = false;
  private initializationError: string | null = null;

  constructor() {
    // Get environment explicitly - must be set via FIREBASE_ENV or NEXT_PUBLIC_FIREBASE_ENV
    this.environment = getFirebaseEnvironment();
    
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
   * Get kid data by UID
   * Note: users_{environment} collection contains kid documents, not account/user data
   */
  async getKidByUid(uid: string) {
    try {
      this.ensureInitialized();
      
      const kidRef = this.db.collection(this.getUsersCollection()).doc(uid);
      const kidDoc = await kidRef.get();

      if (!kidDoc.exists) {
        console.log('[FIRESTORE_SERVER] No kid found for uid:', uid);
        return null;
      }

      const data = kidDoc.data();
      const kidData = {
        ...data,
        id: uid,
        createdAt: data?.createdAt?.toDate() || new Date(),
        lastUpdated: data?.lastUpdated?.toDate() || new Date(),
      };
      
      console.log('[FIRESTORE_SERVER] Successfully retrieved kid data for:', uid);
      return kidData;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error fetching kid by uid:', error);
      throw error;
    }
  }

  /**
   * Get user (account) data by UID - alias for getAccountByUid
   * @param uid User's Firebase Auth UID
   */
  async getUserByUid(uid: string): Promise<Account | null> {
    return this.getAccountByUid(uid);
  }

  /**
   * Create a new kid in Firestore
   * Note: users_{environment} collection contains kid documents, not account/user data
   * @param kidData Kid data including id
   * @returns The created kid data
   */
  async createKidData(kidData: KidDetails): Promise<KidDetails> {
    try {
      this.ensureInitialized();
      
      const kidRef = this.db.collection(this.getUsersCollection()).doc(kidData.id);
      
      const now = new Date();
      const kidDataWithTimestamps: FirestoreData = {
        ...kidData,
        createdAt: now,
        lastUpdated: now,
      };
      
      await kidRef.set(kidDataWithTimestamps);
      
      console.log('[FIRESTORE_SERVER] Successfully created kid data for:', kidData.id);
      return {  
        ...kidData,
        createdAt: now,
        lastUpdated: now,
      } as KidDetails;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error creating kid data:', error);
      throw error;
    }
  }

  /**
   * Update an existing kid data in Firestore
   * Note: users_{environment} collection contains kid documents, not account/user data
   * @param kidData Kid data with fields to update
   * @returns The updated kid data
   */
  async updateKidData(kidData: KidDetails): Promise<KidDetails> {
    try {
      this.ensureInitialized();
      
      const kidRef = this.db.collection(this.getUsersCollection()).doc(kidData.id);
      
      // Check if kid exists
      const kidDoc = await kidRef.get();
      if (!kidDoc.exists) {
        throw new Error(`Kid with ID ${kidData.id} doesn't exist.`);
      }
      
      const existingData = kidDoc.data() || {};
      const now = new Date();
      
      const updateData = {
        ...kidData,
        lastUpdated: now,
      };
      
      // Remove id from update data (it's in the document path)
      const { id: _, ...dataWithoutId } = updateData;
      
      await kidRef.update(dataWithoutId);
      
      return {
        ...existingData,
        ...kidData,
        id: kidData.id,
        createdAt: existingData.createdAt?.toDate ? existingData.createdAt.toDate() : new Date(),
        lastUpdated: now,
      } as KidDetails;
    } catch (error) {
      console.error('Error updating kid data:', error);
      throw error;
    }
  }

  /**
   * Get all kids for a user (account)
   * Kids are stored in users_{environment} collection, not as subcollections
   */
  async getKids(accountId: string) : Promise<KidDetails[]> {
    try {
      this.ensureInitialized();
      
      const usersCollection = this.getUsersCollection();
      console.log(`[FIRESTORE_SERVER] getKids - Looking for kids with accountId: ${accountId} in collection: ${usersCollection}, environment: ${this.environment}`);
      
      // Query kids by accountId field in users_{environment} collection
      const kidsRef = this.db.collection(usersCollection)
        .where('accountId', '==', accountId);
      const snapshot = await kidsRef.get();

      console.log(`[FIRESTORE_SERVER] Found ${snapshot.docs.length} kids for accountId: ${accountId}`);

      const kids = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        } as KidDetails;
      });

      return kids;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error fetching kids:', error);
      throw error;
    }
  }

  /**
   * Get a specific kid by ID
   * Kids are documents in users_{environment} collection
   */
  async getKid(kidId: string) {
    try {
      this.ensureInitialized();
      
      const usersCollection = this.getUsersCollection();
      console.log(`[FIRESTORE_SERVER] getKid - Looking for kid ${kidId} in collection: ${usersCollection}, environment: ${this.environment}`);
      
      const kidRef = this.db.collection(usersCollection).doc(kidId);
      const doc = await kidRef.get();

      if (!doc.exists) {
        console.log(`[FIRESTORE_SERVER] No kid found with id: ${kidId} in ${usersCollection}`);
        return null;
      }

      const data = doc.data();
      console.log(`[FIRESTORE_SERVER] Found kid: ${kidId}, has accountId: ${!!data?.accountId}`);
      
      // Return exactly what's in the database without defaults
      return {
        ...data,
        id: doc.id
      } as KidDetails;
    } catch (error) {
      console.error('[FIRESTORE_SERVER] Error fetching kid:', error);
      throw error;
    }
  }

  /**
   * Save a kid (create or update)
   * Kids are stored as documents in users_{environment} collection
   */
  async saveKid(kidDetails: KidDetails) : Promise<KidDetails> {
    try {
      this.ensureInitialized();
      
      if (!kidDetails.id || kidDetails.id.trim() === '') {
        // Create new kid - ensure all required fields are present
        const kidsCollection = this.db.collection(this.getUsersCollection());
        const kidData = {
          ...kidDetails,
          createdAt: new Date(),
          lastUpdated: new Date()
        };
        const newKidRef = await kidsCollection.add(kidData as unknown as Record<string, unknown>);
        await newKidRef.update({
          id: newKidRef.id,
        });
        return {
          ...kidDetails,
          id: newKidRef.id
        };
      } else {
        const kidRef = this.db.collection(this.getUsersCollection()).doc(kidDetails.id);
        const updateData = {
          ...kidDetails,
          lastUpdated: new Date()
        };
        await kidRef.update(updateData as unknown as Record<string, unknown>);
        return kidDetails;
      }
    } catch (error) {
      console.error('Error saving kid:', error);
      throw error;
    }
  }

  /**
   * Delete a kid
   * Kids are documents in users_{environment} collection
   */
  async deleteKid(kidId: string) {
    try {
      this.ensureInitialized();
      
      const kidRef = this.db.collection(this.getUsersCollection()).doc(kidId);
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
  async getStoriesByKidId(kidId: string) {
    try {
      this.ensureInitialized();
      
      const storiesRef = this.db.collection(this.getStoriesCollection())
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
  async deleteStory(accountId: string, kidId: string, storyId: string): Promise<void> {
    try {
      this.ensureInitialized();
      
      // Delete story images from storage
      await storageService.deleteStoryFolder(accountId, kidId, storyId);
      
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

  /**
   * Get stories by account ID
   * Note: Stories are stored in stories_gen_{environment} collection
   */
  async getStoriesByAccountId(accountId: string): Promise<Story[]> {
    try {
      this.ensureInitialized();
      
      const storiesRef = this.db.collection(this.getStoriesCollection())
        .where('accountId', '==', accountId);
        
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
  async getAccountByUid(uid: string): Promise<Account | null> {
    try {
      this.ensureInitialized();
      
      const accountRef = this.db.collection(this.getAccountsCollection()).doc(uid);
      const accountDoc = await accountRef.get();

      if (!accountDoc.exists) {
        console.log('[FIRESTORE_SERVER] No account found for uid:', uid);
        return null;
      }

      const data = accountDoc.data();
      const account: Account = {
        uid,
        email: data?.email || '',
        displayName: data?.displayName,
        photoURL: data?.photoURL,
        phoneNumber: data?.phoneNumber,
        metadata: data?.metadata,
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
  async getAccountByEmail(email: string): Promise<Account | null> {
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
      const account: Account = {
        uid: doc.id,
        email: data?.email || email,
        displayName: data?.displayName,
        photoURL: data?.photoURL,
        phoneNumber: data?.phoneNumber,
        metadata: data?.metadata,
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

  /**
   * Update user (account) data - alias for updateAccountData
   * @param accountData Account data with fields to update
   * @returns The updated account data
   */
  async updateUserData(accountData: Account): Promise<Account> {
    return this.updateAccountData(accountData);
  }

  /**
   * Create user (account) data - alias for createAccountData
   * @param accountData Account data including uid
   * @returns The created account data
   */
  async createUserData(accountData: Account): Promise<Account> {
    return this.createAccountData(accountData);
  }
}

// Export a singleton instance
const firestoreServerService = new FirestoreServerService();
export default firestoreServerService; 