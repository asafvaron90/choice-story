import { create } from 'zustand';
import { Account, KidDetails } from '@choiceStoryWeb/models';
import { firestoreService } from '../services/firestore.service';

interface FirestoreState {
  account: Account | null;
  users: KidDetails[];
  loading: boolean;
  error: string | null;
  fetchAccount: (email: string) => Promise<void>;
  fetchUsers: (accountId: string) => Promise<void>;
  reset: () => void;
}

const useFirestoreState = create<FirestoreState>((set) => ({
  account: null,
  users: [],
  loading: false,
  error: null,

  fetchAccount: async (email: string) => {
    try {
      set({ loading: true, error: null });
      const account = await firestoreService.getAccountByEmail(email);
      console.log('Fetched account:', account);
      set({ account, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch account', 
        loading: false 
      });
    }
  },

  fetchUsers: async (accountId: string) => {
    try {
      set({ loading: true, error: null });
      const users = await firestoreService.getKidsByAccountId(accountId);
      console.log('Fetched users:', users);
      set({ users, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch users', 
        loading: false 
      });
    }
  },

  reset: () => {
    set({ account: null, users: [], loading: false, error: null });
  },
}));

export default useFirestoreState; 
