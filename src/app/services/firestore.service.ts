import { getFirestore, collection, doc, getDoc, getDocs, query, where, Firestore, addDoc, serverTimestamp, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { app } from '@choiceStoryWeb/firebase';
import { Account, KidDetails } from '@choiceStoryWeb/models';
import type { UserData } from '@/app/network/UserApi';
import { API_ENV } from '@/config/build-config';

// Helper function to convert Date to ISO string
const _convertDatesToISOString = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => item instanceof Date ? item.toISOString() : item);
    } else if (value && typeof value === 'object') {
      result[key] = _convertDatesToISOString(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
};

class FirestoreService {
  private db: Firestore | null = null;
  private environment: string = API_ENV;

  constructor() {
    try {
      // Check if we're on the client side
      const isClient = typeof window !== 'undefined';
      
      // Only initialize if on client side or in development
      if (isClient || process.env.NODE_ENV === 'development') {
        this.db = getFirestore(app);
        // Get environment from build-time environment variable
        console.log('[FIRESTORE_CLIENT] Initialized with environment:', this.environment);
      } else {
        console.warn('[FIRESTORE_CLIENT] Constructor called server-side outside development. No initialization performed.');
      }
    } catch (error) {
      console.error('[FIRESTORE_CLIENT] Error initializing Firestore:', error);
    }
  }

  // Helper to verify initialization
  private ensureInitialized() {
    if (!this.db) {
      if (typeof window === 'undefined' && process.env.NODE_ENV !== "development") {
        throw new Error('Firestore not initialized. This service should only be used on the client side or in development API routes.');
      } else {
        // Try to initialize now (might happen if constructor error occurred)
        this.db = getFirestore(app);
        if (!this.db) {
          throw new Error('Failed to initialize Firestore.');
        }
      }
    }
    return this.db;
  }

  private getAccountsCollection() {
    this.ensureInitialized();
    return `accounts_${this.environment}`;
  }

  private getUsersCollection() {
    this.ensureInitialized();
    return `users_${this.environment}`;
  }

  getStoriesCollection() {
    this.ensureInitialized();
    return `stories_gen_${this.environment}`;
  }


  async getUsersByAccountId(accountId: string): Promise<Account[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const usersRef = collection(this.db, this.getUsersCollection());
      const q = query(usersRef, where('accountId', '==', accountId));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createAt: data.createAt.toDate(),
          lastUpdated: data.lastUpdated.toDate(),
        } as Account;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user data by UID
   * @param uid User's Firebase Auth UID
   */
  async getUserByUid(uid: string): Promise<UserData | null> {
    try {
      // Make sure the database is initialized
      this.ensureInitialized();
      
      const userRef = doc(this.db!, this.getUsersCollection(), uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('No user found for uid:', uid);
        return null;
      }

      const data = userSnap.data();
      const userData = {
        ...data,
        uid,
        createAt: data.createAt?.toDate ? data.createAt.toDate().toISOString() : new Date().toISOString(),
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
      } as UserData;
      return userData;
    } catch (error) {
      console.error('Error fetching user by uid:', error);
      throw error;
    }
  }


  private async updateExistingKid(userId: string, kidId: string, kidDetails: Partial<KidDetails>, avatarUrl?: string): Promise<string> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    const kidRef = doc(this.db, `${this.getUsersCollection()}/${userId}/kids/${kidId}`);
    
    // Check if the document exists first
    const docSnap = await getDoc(kidRef);
    if (!docSnap.exists()) {
      console.log(`Kid with ID ${kidId} doesn't exist. Creating a new document instead.`);
      return this.addNewKid(userId, kidDetails as KidDetails, avatarUrl);
    }
    
    const updateData = {
      ...kidDetails,
      avatarUrl: avatarUrl || undefined,
      lastUpdated: serverTimestamp(),
    };

    // Remove undefined fields and id (since it's in the path)
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => value !== undefined && key !== 'id')
    );

    console.log('Updating kid data in Firestore:', cleanedData);
    await updateDoc(kidRef, cleanedData);
    return kidId;
  }

  private async addNewKid(userId: string, kidDetails: KidDetails, avatarUrl?: string): Promise<string> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    // Ensure we have all required fields
    if (!kidDetails.name || !kidDetails.age || !kidDetails.gender) {
      throw new Error('Missing required kid fields (name, age, gender)');
    }

    const kidsCollection = collection(this.db, `${this.getUsersCollection()}/${userId}/kids`);
    
    const kidData = {
      ...kidDetails,
      avatarUrl, // Don't use a default avatarUrl
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      storiesCount: 0
    };

    console.log('Creating new kid in Firestore:', kidData);

    const docRef = await addDoc(kidsCollection, kidData);
    return docRef.id;
  }

  async saveKid(userId: string, kidDetails: KidDetails, avatarUrl?: string): Promise<string> {
    try {
      // If we have an ID, update the existing document
      if (kidDetails.id) {
        return this.updateExistingKid(userId, kidDetails.id, kidDetails, avatarUrl);
      }

      // If no ID, create a new document
      return this.addNewKid(userId, kidDetails, avatarUrl);
    } catch (error) {
      console.error('Error saving kid:', error);
      throw error;
    }
  }

  async getKids(userId: string): Promise<(KidDetails & { id: string, avatarUrl: string, storiesCount: number })[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const kidsRef = collection(this.db, `users/${userId}/kids`);
      const kidsSnapshot = await getDocs(kidsRef);

      const kids = await Promise.all(kidsSnapshot.docs.map(async doc => {
        const data = doc.data();
        const storiesRef = collection(this.db!, `users/${userId}/kids/${doc.id}/stories`);
        const storiesSnapshot = await getDocs(storiesRef);

        return {
          ...data,
          id: doc.id,
          names: data.names || [],
          avatarUrl: data.avatarUrl || '',
          storiesCount: storiesSnapshot.size,
          age: data.age || 0,
          gender: data.gender || '',
          imageAnalysis: data.imageAnalysis || ''
        } as KidDetails & { id: string, avatarUrl: string, storiesCount: number };
      }));

      return kids;
    } catch (error) {
      console.error('Error fetching kids:', error);
      throw error;
    }
  }

  async getKid(userId: string, kidId: string): Promise<(KidDetails & { id: string, avatarUrl: string, storiesCount: number }) | null> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const kidRef = doc(this.db, `users/${userId}/kids/${kidId}`);
      const kidSnapshot = await getDoc(kidRef);

      if (!kidSnapshot.exists()) {
        return null;
      }

      const data = kidSnapshot.data();
      const storiesRef = collection(this.db, `users/${userId}/kids/${kidId}/stories`);
      const storiesSnapshot = await getDocs(storiesRef);

      return {
        ...data,
        id: kidId,
        names: data.names || [],
        avatarUrl: data.avatarUrl || '',
        storiesCount: storiesSnapshot.size,
        age: data.age || 0,
        gender: data.gender || '',
        imageAnalysis: data.imageAnalysis || ''
      } as KidDetails & { id: string, avatarUrl: string, storiesCount: number };
    } catch (error) {
      console.error('Error fetching kid:', error);
      throw error;
    }
  }

  async deleteKid(userId: string, kidId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const kidRef = doc(this.db, `${this.getUsersCollection()}/${userId}/kids/${kidId}`);
      await deleteDoc(kidRef);
    } catch (error) {
      console.error('Error deleting kid:', error);
      throw error;
    }
  }

  /**
   * Get account data by UID
   * @param uid Account's Firebase Auth UID
   */
  async getAccountByUid(uid: string): Promise<Account | null> {
    try {
      this.ensureInitialized();
      
      const accountRef = doc(this.db!, this.getAccountsCollection(), uid);
      const accountSnap = await getDoc(accountRef);

      if (!accountSnap.exists()) {
        console.log('No account found for uid:', uid);
        return null;
      }

      const data = accountSnap.data();
      const account = {
        ...data,
        uid,
        createAt: data.createAt?.toDate ? data.createAt.toDate() : new Date(),
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(),
      } as Account;
      return account;
    } catch (error) {
      console.error('Error fetching account by uid:', error);
      throw error;
    }
  }

  /**
   * Get account data by email
   * @param email Account's email address
   */
  async getAccountByEmail(email: string): Promise<Account | null> {
    try {
      this.ensureInitialized();
      
      const accountsRef = collection(this.db!, this.getAccountsCollection());
      const q = query(accountsRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No account found for email:', email);
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const account = {
        ...data,
        uid: doc.id,
        createAt: data.createAt?.toDate ? data.createAt.toDate() : new Date(),
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(),
      } as Account;
      return account;
    } catch (error) {
      console.error('Error fetching account by email:', error);
      throw error;
    }
  }

  /**
   * Create a new account in Firestore
   * @param accountData Account data including uid
   * @returns The created account data
   */
  async createAccount(accountData: Account): Promise<Account> {
    try {
      this.ensureInitialized();
      
      const accountRef = doc(this.db!, this.getAccountsCollection(), accountData.uid);
      
      const now = new Date();
      const accountDataWithTimestamps = {
        ...accountData,
        createAt: now,
        lastUpdated: now,
      };
      
      await setDoc(accountRef, accountDataWithTimestamps);
      
      console.log('Successfully created account data for:', accountData.uid);
      return {  
        ...accountData,
        createAt: now,
        lastUpdated: now,
      };
    } catch (error) {
      console.error('Error creating account data:', error);
      throw error;
    }
  }

  /**
   * Update an existing account data in Firestore
   * @param accountData Account data with fields to update
   * @returns The updated account data
   */
  async updateAccount(accountData: Account): Promise<Account> {
    try {
      this.ensureInitialized();
      
      const accountRef = doc(this.db!, this.getAccountsCollection(), accountData.uid);
      
      // Check if account exists
      const accountDoc = await getDoc(accountRef);
      if (!accountDoc.exists()) {
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
      
      await updateDoc(accountRef, dataWithoutUid);
      
      return {
        ...existingData,
        ...accountData,
        uid: accountData.uid,
        createAt: existingData.createAt?.toDate ? existingData.createAt.toDate() : new Date(),
        lastUpdated: now,
      } as Account;
    } catch (error) {
      console.error('Error updating account data:', error);
      throw error;
    }
  }
}

// Create a single instance
export const firestoreService = new FirestoreService();

export default FirestoreService; 
