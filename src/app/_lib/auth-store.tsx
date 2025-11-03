import { create } from 'zustand'
import { Account } from '@/models';

const useAuthStore = create((set) => ({
    user: null,
    login: (userData: Account) => set({ user: userData }),
    logout: () => set({ user: null }),
}));

export default useAuthStore;