import { getFirestore, collection, collectionGroup, doc, getDoc, getDocs, query, where, Firestore, addDoc, serverTimestamp, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { app } from '@choiceStoryWeb/firebase';
import { Account, KidDetails } from '@choiceStoryWeb/models';
import type { UserData } from '@/app/network/UserApi';
import { getFirebaseEnvironment } from '@/config/build-config';

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
  private environment: string;

  constructor() {
    // Get environment explicitly - must be set via NEXT_PUBLIC_APP_ENV
    this.environment = getFirebaseEnvironment();
    
    try {
      // Check if we're on the client side
      const isClient = typeof window !== 'undefined';
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && !isClient && !process.env.FIREBASE_PROJECT_ID);
      
      // Only initialize if on client side
      if (isClient) {
        if (!app) {
          if (!isBuildTime) {
            console.error('[FIRESTORE_CLIENT] Firebase app is not initialized');
          }
          return;
        }
        this.db = getFirestore(app);
        if (!isBuildTime) {
          console.log('[FIRESTORE_CLIENT] Initialized with environment:', this.environment);
        }
      } else {
        // Only warn during runtime, not build time
        if (!isBuildTime) {
          console.warn('[FIRESTORE_CLIENT] Constructor called server-side. This service should only be used on the client side.');
        }
      }
    } catch (error) {
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.FIREBASE_PROJECT_ID);
      if (!isBuildTime) {
        console.error('[FIRESTORE_CLIENT] Error initializing Firestore:', error);
      }
    }
  }

  // Helper to verify initialization
  private ensureInitialized() {
    if (!this.db) {
      if (typeof window === 'undefined') {
        throw new Error('Firestore not initialized. This service should only be used on the client side.');
      } else {
        // Try to initialize now (might happen if constructor error occurred)
        if (!app) {
          throw new Error('Firebase app is not initialized. Please check your Firebase configuration.');
        }
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


  /**
   * Get kids by account ID
   * Kids are stored in users_{environment} collection
   */
  async getKidsByAccountId(accountId: string): Promise<KidDetails[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const kidsRef = collection(this.db, this.getUsersCollection());
      const q = query(kidsRef, where('accountId', '==', accountId));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(),
        } as KidDetails;
      });
    } catch (error) {
      console.error('Error fetching kids:', error);
      throw error;
    }
  }

  /**
   * Get kid data by UID
   * Note: users_{environment} collection contains kid documents
   * @param uid Kid's ID
   */
  async getKidByUid(uid: string): Promise<KidDetails | null> {
    try {
      // Make sure the database is initialized
      this.ensureInitialized();
      
      const kidRef = doc(this.db!, this.getUsersCollection(), uid);
      const kidSnap = await getDoc(kidRef);

      if (!kidSnap.exists()) {
        console.log('No kid found for uid:', uid);
        return null;
      }

      const data = kidSnap.data();
      const kidData = {
        ...data,
        id: uid,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(),
      } as KidDetails;
      return kidData;
    } catch (error) {
      console.error('Error fetching kid by uid:', error);
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


  private async updateExistingKid(kidId: string, kidDetails: Partial<KidDetails>, avatarUrl?: string): Promise<string> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    const kidRef = doc(this.db, this.getUsersCollection(), kidId);
    
    // Check if the document exists first
    const docSnap = await getDoc(kidRef);
    if (!docSnap.exists()) {
      console.log(`Kid with ID ${kidId} doesn't exist. Creating a new document instead.`);
      return this.addNewKid(kidDetails as KidDetails, avatarUrl);
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

  private async addNewKid(kidDetails: KidDetails, avatarUrl?: string): Promise<string> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    // Ensure we have all required fields
    if (!kidDetails.name || !kidDetails.age || !kidDetails.gender) {
      throw new Error('Missing required kid fields (name, age, gender)');
    }

    const kidsCollection = collection(this.db, this.getUsersCollection());
    
    const kidData = {
      ...kidDetails,
      avatarUrl, // Don't use a default avatarUrl
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      storiesCount: 0
    };

    console.log('Creating new kid in Firestore:', kidData);

    const docRef = await addDoc(kidsCollection, kidData);
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  }

  async saveKid(kidDetails: KidDetails, avatarUrl?: string): Promise<string> {
    try {
      // If we have an ID, update the existing document
      if (kidDetails.id) {
        return this.updateExistingKid(kidDetails.id, kidDetails, avatarUrl);
      }

      // If no ID, create a new document
      return this.addNewKid(kidDetails, avatarUrl);
    } catch (error) {
      console.error('Error saving kid:', error);
      throw error;
    }
  }

  /**
   * Get kids by account ID
   * Kids are stored in users_{environment} collection
   */
  async getKids(accountId: string): Promise<(KidDetails & { id: string, avatarUrl: string, storiesCount: number })[]> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const kidsRef = collection(this.db, this.getUsersCollection());
      const q = query(kidsRef, where('accountId', '==', accountId));
      const kidsSnapshot = await getDocs(q);

      const kids = await Promise.all(kidsSnapshot.docs.map(async doc => {
        const data = doc.data();
        // Get stories count from stories_gen_{environment} collection
        const storiesRef = collection(this.db!, this.getStoriesCollection());
        const storiesQuery = query(storiesRef, where('kidId', '==', doc.id));
        const storiesSnapshot = await getDocs(storiesQuery);

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

  /**
   * Get a single kid by ID
   * Kids are stored in users_{environment} collection
   */
  async getKid(kidId: string): Promise<(KidDetails & { id: string, avatarUrl: string, storiesCount: number }) | null> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const kidRef = doc(this.db, this.getUsersCollection(), kidId);
      const kidSnapshot = await getDoc(kidRef);

      if (!kidSnapshot.exists()) {
        return null;
      }

      const data = kidSnapshot.data();
      // Get stories count from stories_gen_{environment} collection
      const storiesRef = collection(this.db, this.getStoriesCollection());
      const storiesQuery = query(storiesRef, where('kidId', '==', kidId));
      const storiesSnapshot = await getDocs(storiesQuery);

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

  /**
   * Delete a kid by ID
   * Kids are stored in users_{environment} collection
   */
  async deleteKid(kidId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized. This service can only be used on the client side.');
    }

    try {
      const kidRef = doc(this.db, this.getUsersCollection(), kidId);
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
      const account: Account = {
        uid,
        email: data.email || '',
        displayName: data.displayName,
        photoURL: data.photoURL,
        phoneNumber: data.phoneNumber,
        metadata: data.metadata,
        createAt: data.createAt?.toDate ? data.createAt.toDate() : new Date(),
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(),
      };
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

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      const account: Account = {
        uid: docSnap.id,
        email: data.email || email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        phoneNumber: data.phoneNumber,
        metadata: data.metadata,
        createAt: data.createAt?.toDate ? data.createAt.toDate() : new Date(),
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(),
      };
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

  /**
   * Check if a kid is already shared with an email
   * @param kidId The kid's ID
   * @param email The email to check
   * @returns true if already shared, false otherwise (also returns false on error)
   */
  async isKidSharedWithEmail(kidId: string, email: string): Promise<boolean> {
    try {
      this.ensureInitialized();
      
      // Normalize email to use as document ID (replace dots for Firestore compatibility)
      const normalizedEmail = email.toLowerCase().replace(/\./g, '_');
      const collectionPath = this.getUsersCollection();
      const fullPath = `${collectionPath}/${kidId}/sharedWith/${normalizedEmail}`;
      
      console.log(`[FIRESTORE_CLIENT] Checking share at path: ${fullPath}`);
      
      const shareRef = doc(this.db!, collectionPath, kidId, 'sharedWith', normalizedEmail);
      const shareDoc = await getDoc(shareRef);
      
      console.log(`[FIRESTORE_CLIENT] Share exists: ${shareDoc.exists()}`);
      return shareDoc.exists();
    } catch (error) {
      // If we can't check (subcollection doesn't exist, offline, etc.), 
      // assume it's not shared and let the share proceed
      console.warn('[FIRESTORE_CLIENT] Could not check existing share, assuming not shared:', error);
      console.log('[FIRESTORE_CLIENT] kidId:', kidId, 'email:', email);
      return false;
    }
  }

  /**
   * Share a kid with an email address
   * @param kidId The kid's ID
   * @param email The email to share with
   * @param sharedByAccountId The accountId of the user sharing the kid
   * @param permission The permission level ('read' or 'write'), defaults to 'read'
   * @returns The share document data
   */
  async shareKidWithEmail(
    kidId: string, 
    email: string,
    sharedByAccountId: string,
    permission: 'read' | 'write' = 'read'
  ): Promise<{ email: string; permission: string }> {
    console.log(`[FIRESTORE_CLIENT] shareKidWithEmail called:`, { kidId, email, sharedByAccountId, permission });
    
    try {
      console.log(`[FIRESTORE_CLIENT] Ensuring initialized...`);
      this.ensureInitialized();
      console.log(`[FIRESTORE_CLIENT] Firestore initialized, db:`, !!this.db);
      
      // Normalize email for document ID (replace dots for Firestore compatibility)
      const normalizedEmail = email.toLowerCase().replace(/\./g, '_');
      const collectionPath = this.getUsersCollection();
      const fullPath = `${collectionPath}/${kidId}/sharedWith/${normalizedEmail}`;
      
      console.log(`[FIRESTORE_CLIENT] Creating share at path: ${fullPath}`);
      
      const shareRef = doc(this.db!, collectionPath, kidId, 'sharedWith', normalizedEmail);
      console.log(`[FIRESTORE_CLIENT] Document reference created`);
      
      const shareData = {
        email: email.toLowerCase(), // Store email as field for collection group queries
        permission,
        sharedBy: sharedByAccountId,
        sharedAt: new Date()
      };
      
      console.log(`[FIRESTORE_CLIENT] About to call setDoc with data:`, shareData);
      await setDoc(shareRef, shareData);
      console.log(`[FIRESTORE_CLIENT] setDoc completed successfully`);
      
      console.log(`[FIRESTORE_CLIENT] Kid ${kidId} shared with ${email} (${permission}) by account ${sharedByAccountId}`);
      return { email: email.toLowerCase(), permission };
    } catch (error) {
      console.error('[FIRESTORE_CLIENT] Error sharing kid:', error);
      throw error;
    }
  }

  /**
   * Remove sharing access for a kid from an email
   * @param kidId The kid's ID  
   * @param email The email to remove access from
   */
  async removeKidShare(kidId: string, email: string): Promise<void> {
    try {
      this.ensureInitialized();
      
      const normalizedEmail = email.toLowerCase().replace(/\./g, '_');
      const shareRef = doc(this.db!, this.getUsersCollection(), kidId, 'sharedWith', normalizedEmail);
      
      await deleteDoc(shareRef);
      
      console.log(`[FIRESTORE_CLIENT] Removed share access for kid ${kidId} from ${email}`);
    } catch (error) {
      console.error('Error removing kid share:', error);
      throw error;
    }
  }

  /**
   * Get all emails that a kid is shared with
   * @param kidId The kid's ID
   * @returns Array of share info including email, permission, sharedBy accountId, and sharedAt
   */
  async getKidShares(kidId: string): Promise<{ 
    email: string; 
    permission: string;
    sharedBy?: string;  // accountId of who shared
    sharedAt?: Date;
  }[]> {
    try {
      this.ensureInitialized();
      
      const sharesRef = collection(this.db!, this.getUsersCollection(), kidId, 'sharedWith');
      const sharesSnapshot = await getDocs(sharesRef);
      
      return sharesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          // Use email field directly (stored for querying), fallback to converting doc ID
          email: data.email || doc.id.replace(/_/g, '.'),
          permission: data.permission || 'read',
          sharedBy: data.sharedBy || undefined,
          sharedAt: data.sharedAt?.toDate ? data.sharedAt.toDate() : undefined
        };
      });
    } catch (error) {
      console.error('Error getting kid shares:', error);
      throw error;
    }
  }

  /**
   * Get all kids shared with an email address using collection group query
   * @param email The email address to find shared kids for
   * @returns Array of shared kid info with permission and sharedBy
   */
  async getKidsSharedWithEmail(email: string): Promise<{
    kidId: string;
    permission: 'read' | 'write';
    sharedBy: string;
    sharedAt?: Date;
  }[]> {
    try {
      this.ensureInitialized();
      
      // Query across all sharedWith subcollections using collection group
      const sharedWithRef = collectionGroup(this.db!, 'sharedWith');
      const q = query(sharedWithRef, where('email', '==', email.toLowerCase()));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Extract kidId from the document path: users_{env}/{kidId}/sharedWith/{email}
        const pathSegments = doc.ref.path.split('/');
        const kidId = pathSegments[1]; // Index 1 is the kidId
        
        return {
          kidId,
          permission: data.permission || 'read',
          sharedBy: data.sharedBy,
          sharedAt: data.sharedAt?.toDate ? data.sharedAt.toDate() : undefined
        };
      });
    } catch (error) {
      console.error('Error getting kids shared with email:', error);
      throw error;
    }
  }

  /**
   * Get all kids for an account - both owned and shared
   * @param accountId The account ID
   * @param accountEmail The account's email address (for finding shared kids)
   * @returns Object with ownedKids and sharedKids arrays
   */
  async getKidsForAccount(accountId: string, accountEmail: string): Promise<{
    ownedKids: (KidDetails & { id: string; avatarUrl: string; storiesCount: number })[];
    sharedKids: {
      kid: KidDetails & { id: string; avatarUrl: string; storiesCount: number };
      permission: 'read' | 'write';
      sharedBy: string;
      sharedAt?: Date;
    }[];
  }> {
    try {
      this.ensureInitialized();
      
      // 1. Get owned kids
      const ownedKids = await this.getKids(accountId);
      
      // 2. Get shared kids info
      const sharedKidsInfo = await this.getKidsSharedWithEmail(accountEmail);
      
      // 3. Fetch full kid details for each shared kid
      const sharedKids = await Promise.all(
        sharedKidsInfo.map(async (shareInfo) => {
          const kid = await this.getKid(shareInfo.kidId);
          if (!kid) {
            return null;
          }
          return {
            kid,
            permission: shareInfo.permission,
            sharedBy: shareInfo.sharedBy,
            sharedAt: shareInfo.sharedAt
          };
        })
      );
      
      // Filter out any null results (kids that couldn't be found)
      const validSharedKids = sharedKids.filter((item): item is NonNullable<typeof item> => item !== null);
      
      console.log(`[FIRESTORE_CLIENT] Found ${ownedKids.length} owned kids and ${validSharedKids.length} shared kids for account ${accountId}`);
      
      return {
        ownedKids,
        sharedKids: validSharedKids
      };
    } catch (error) {
      console.error('Error getting kids for account:', error);
      throw error;
    }
  }

  /**
   * Get kids for Dashboard - owned kids + shared kids with 'write' permission
   * @param accountId The account ID  
   * @param accountEmail The account's email address
   * @returns Array of kids (owned + write-shared) with ownership info
   */
  async getKidsForDashboard(accountId: string, accountEmail: string): Promise<{
    kid: KidDetails & { id: string; avatarUrl: string; storiesCount: number };
    isOwned: boolean;
    permission?: 'read' | 'write';
    sharedBy?: string;
  }[]> {
    try {
      const { ownedKids, sharedKids } = await this.getKidsForAccount(accountId, accountEmail);
      
      // Owned kids
      const ownedKidsResult = ownedKids.map(kid => ({
        kid,
        isOwned: true,
        permission: undefined,
        sharedBy: undefined
      }));
      
      // Shared kids with 'write' permission only
      const writeSharedKids = sharedKids
        .filter(item => item.permission === 'write')
        .map(item => ({
          kid: item.kid,
          isOwned: false,
          permission: item.permission,
          sharedBy: item.sharedBy
        }));
      
      return [...ownedKidsResult, ...writeSharedKids];
    } catch (error) {
      console.error('Error getting kids for dashboard:', error);
      throw error;
    }
  }

  /**
   * Get kids for Gallery - owned kids + all shared kids (read and write permission)
   * @param accountId The account ID
   * @param accountEmail The account's email address
   * @returns Array of kids (owned + all shared) with ownership info
   */
  async getKidsForGallery(accountId: string, accountEmail: string): Promise<{
    kid: KidDetails & { id: string; avatarUrl: string; storiesCount: number };
    isOwned: boolean;
    permission?: 'read' | 'write';
    sharedBy?: string;
  }[]> {
    try {
      const { ownedKids, sharedKids } = await this.getKidsForAccount(accountId, accountEmail);
      
      // Owned kids
      const ownedKidsResult = ownedKids.map(kid => ({
        kid,
        isOwned: true,
        permission: undefined,
        sharedBy: undefined
      }));
      
      // All shared kids (both read and write)
      const allSharedKids = sharedKids.map(item => ({
        kid: item.kid,
        isOwned: false,
        permission: item.permission,
        sharedBy: item.sharedBy
      }));
      
      return [...ownedKidsResult, ...allSharedKids];
    } catch (error) {
      console.error('Error getting kids for gallery:', error);
      throw error;
    }
  }
}

// Create a single instance
export const firestoreService = new FirestoreService();

export default FirestoreService; 
