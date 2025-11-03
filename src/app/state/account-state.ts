import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { AccountApi } from '@/app/network/AccountApi';
import { Account } from '@/models';

interface AccountState {
  // Authentication state
  currentUser: FirebaseUser | null;
  isLoading: boolean;
  
  // Account data from Firestore
  accountData: Account | null;
  isNewAccount: boolean;
  
  // State flags
  isFetchingAccountData: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Actions
  setCurrentUser: (user: FirebaseUser | null) => void;
  setAccountData: (accountData: Account | null, isNew?: boolean) => void;
  updateAccountInFirestore: (
    user: FirebaseUser, 
    additionalData?: Partial<Omit<Account, 'uid' | 'createAt' | 'lastUpdated'>>
  ) => Promise<Account | null>;
  
  fetchAccountData: (user: FirebaseUser) => Promise<Account | null>;
  clearAccountData: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const useAccountState = create<AccountState>((set, get) => ({
  // Initial state
  currentUser: null,
  isLoading: true,
  accountData: null,
  isNewAccount: false,
  isFetchingAccountData: false,
  error: null,
  lastFetched: null,
  
  // Auth state setters
  setCurrentUser: (user) => set({ currentUser: user, isLoading: false }),
  
  // Account data setters
  setAccountData: (accountData, isNew = false) => set({ 
    accountData, 
    isNewAccount: isNew,
    isFetchingAccountData: false,
    lastFetched: accountData ? Date.now() : null
  }),
  
  // Clear all account data (for logout)
  clearAccountData: () => {
    set({ 
      accountData: null, 
      isNewAccount: false,
      error: null,
      lastFetched: null
    });
  },
  
  // Update account data in Firestore
  updateAccountInFirestore: async (user, additionalData = {}) => {
    try {
      set({ isFetchingAccountData: true, error: null });
      
      const accountData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || undefined,
        metadata: {},
        createAt: new Date(),
        lastUpdated: new Date(),
        ...additionalData
      };
      
      console.log('Updating account data in Firestore:', {
        uid: accountData.uid,
        email: accountData.email,
        displayName: accountData.displayName,
        fullData: accountData
      });
      
      const response = await AccountApi.updateAccount(accountData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update account data');
      }
      
      set({ 
        accountData: response.data?.account,
        isNewAccount: response.data?.action === 'created',
        isFetchingAccountData: false,
        lastFetched: Date.now()
      });
      
      return response.data?.account || null;
    } catch (error) {
      console.error('Error updating account in Firestore:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update account data',
        isFetchingAccountData: false
      });
      return null;
    }
  },
  
  // Fetch account data from Firestore
  fetchAccountData: async (user) => {
    try {
      const { lastFetched } = get();
      
      // Check cache
      if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
        console.log('Using cached account data');
        return get().accountData;
      }
      
      set({ isFetchingAccountData: true, error: null });
      
      console.log('Fetching account data for user:', user.uid);
      
      const response = await AccountApi.getAccountData(user.uid);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account data');
      }
      
      const accountData = response.data?.account;
      
      set({ 
        accountData,
        isNewAccount: false,
        isFetchingAccountData: false,
        lastFetched: Date.now()
      });
      
      return accountData || null;
    } catch (error) {
      console.error('Error fetching account data:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch account data',
        isFetchingAccountData: false
      });
      return null;
    }
  },
}));

export default useAccountState; 