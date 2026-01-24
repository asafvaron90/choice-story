import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { AccountApi } from '@/app/network/AccountApi';
import { Account } from '@/models';
import * as Sentry from '@sentry/nextjs';

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
    console.log('[ACCOUNT STATE] 🗑️ Clearing account data');
    Sentry.addBreadcrumb({
      category: 'account',
      message: 'Account data cleared',
      level: 'info'
    });
    
    set({ 
      accountData: null, 
      isNewAccount: false,
      error: null,
      lastFetched: null
    });
  },
  
  // Update account data in Firestore
  updateAccountInFirestore: async (user, additionalData = {}) => {
    const startTime = Date.now();
    try {
      set({ isFetchingAccountData: true, error: null });
      
      const accountData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || undefined,
        metadata: {},
        createAt: new Date(),
        lastUpdated: new Date(),
        ...additionalData
      };
      
      console.log('[ACCOUNT STATE] 🔄 Updating account data in Firestore:', {
        uid: accountData.uid,
        email: accountData.email,
        displayName: accountData.displayName,
        hasAdditionalData: Object.keys(additionalData).length > 0
      });
      
      Sentry.addBreadcrumb({
        category: 'account',
        message: 'Updating account data in Firestore',
        level: 'info',
        data: {
          uid: user.uid,
          email: user.email,
          hasAdditionalData: Object.keys(additionalData).length > 0
        }
      });
      
      const response = await AccountApi.updateAccount(accountData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update account data');
      }
      
      const duration = Date.now() - startTime;
      const isNewAccount = response.data?.action === 'created';
      
      console.log(`[ACCOUNT STATE] ✅ Account ${isNewAccount ? 'created' : 'updated'} successfully (${duration}ms)`);
      
      Sentry.addBreadcrumb({
        category: 'account',
        message: `Account ${isNewAccount ? 'created' : 'updated'} successfully`,
        level: 'info',
        data: {
          uid: user.uid,
          action: response.data?.action,
          duration,
          isNewAccount
        }
      });
      
      set({ 
        accountData: response.data?.account,
        isNewAccount,
        isFetchingAccountData: false,
        lastFetched: Date.now()
      });
      
      return response.data?.account || null;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ACCOUNT STATE] ❌ Error updating account in Firestore (${duration}ms):`, error);
      
      Sentry.captureException(error, {
        tags: {
          component: 'account-state',
          operation: 'updateAccountInFirestore'
        },
        extra: {
          uid: user.uid,
          email: user.email,
          duration,
          additionalData
        }
      });
      
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update account data',
        isFetchingAccountData: false
      });
      return null;
    }
  },
  
  // Fetch account data from Firestore
  fetchAccountData: async (user) => {
    const startTime = Date.now();
    try {
      const { lastFetched } = get();
      
      // Check cache
      if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
        const cacheAge = Math.round((Date.now() - lastFetched) / 1000);
        console.log(`[ACCOUNT STATE] 💾 Using cached account data (age: ${cacheAge}s)`);
        return get().accountData;
      }
      
      set({ isFetchingAccountData: true, error: null });
      
      console.log('[ACCOUNT STATE] 🔄 Fetching account data for user:', user.uid);
      
      Sentry.addBreadcrumb({
        category: 'account',
        message: 'Fetching account data from Firestore',
        level: 'info',
        data: {
          uid: user.uid
        }
      });
      
      const response = await AccountApi.getAccountData(user.uid);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account data');
      }
      
      const accountData = response.data?.account;
      const duration = Date.now() - startTime;
      
      console.log(`[ACCOUNT STATE] ✅ Account data fetched successfully (${duration}ms)`);
      
      set({ 
        accountData,
        isNewAccount: false,
        isFetchingAccountData: false,
        lastFetched: Date.now()
      });
      
      return accountData || null;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ACCOUNT STATE] ❌ Error fetching account data (${duration}ms):`, error);
      
      Sentry.captureException(error, {
        tags: {
          component: 'account-state',
          operation: 'fetchAccountData'
        },
        extra: {
          uid: user.uid,
          duration
        }
      });
      
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch account data',
        isFetchingAccountData: false
      });
      return null;
    }
  },
}));

export default useAccountState; 