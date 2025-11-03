import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { UserApi, UserData } from '@/app/network/UserApi';

interface UserState {
  // Authentication state
  currentUser: FirebaseUser | null;
  isLoading: boolean;
  
  // User data from Firestore
  userData: UserData | null;
  isNewUser: boolean;
  
  // State flags
  isFetchingUserData: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Actions
  setCurrentUser: (user: FirebaseUser | null) => void;
  setUserData: (userData: UserData | null, isNew?: boolean) => void;
  updateUserInFirestore: (
    user: FirebaseUser, 
    additionalData?: Partial<Omit<UserData, 'uid' | 'createAt' | 'lastUpdated'>>
  ) => Promise<UserData | null>;
  
  fetchUserData: (user: FirebaseUser) => Promise<UserData | null>;
  clearUserData: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const useUserState = create<UserState>((set, get) => ({
  // Initial state
  currentUser: null,
  userData: null,
  isNewUser: false,
  isLoading: true,
  isFetchingUserData: false,
  error: null,
  lastFetched: null,
  
  // Auth state setters
  setCurrentUser: (user) => set({ currentUser: user, isLoading: false }),
  
  // User data setters
  setUserData: (userData, isNew = false) => set({ 
    userData, 
    isNewUser: isNew,
    isFetchingUserData: false,
    lastFetched: userData ? Date.now() : null
  }),
  
  // Clear all user data (for logout)
  clearUserData: () => {
    set({ 
      userData: null, 
      isNewUser: false,
      error: null,
      lastFetched: null
    });
  },
  
  // Update user data in Firestore
  updateUserInFirestore: async (user, additionalData = {}) => {
    try {
      set({ isFetchingUserData: true, error: null });
      
      const userData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        ...additionalData
      };
      
      console.log('Updating user data in Firestore:', userData);
      
      const response = await UserApi.updateUser(userData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user data');
      }
      
      set({ 
        userData: response.data?.user,
        isNewUser: response.data?.action === 'created',
        isFetchingUserData: false,
        lastFetched: Date.now()
      });
      
      return response.data?.user || null;
    } catch (error) {
      console.error('Error updating user in Firestore:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update user data',
        isFetchingUserData: false
      });
      return null;
    }
  },
  
  // Fetch user data from Firestore
  fetchUserData: async (user) => {
    // Skip if we already have fresh data
    const { lastFetched, userData, isFetchingUserData } = get();
    
    if (
      userData?.uid === user.uid && 
      lastFetched && 
      Date.now() - lastFetched < CACHE_DURATION && 
      !isFetchingUserData
    ) {
      console.log('Using cached user data');
      return userData;
    }
    
    try {
      set({ isFetchingUserData: true, error: null });
      
      // Get user data using UserApi
      const response = await UserApi.getUserData(user.uid);
      
      if (!response.success) {
        if (response.error === 'User not found') {
          console.log('User not found in database, creating a new user profile');
          
          // Create basic user data
          const newUserData: UserData = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            phoneNumber: user.phoneNumber || '',
            createAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
          
          // Create user in database
          const createResponse = await UserApi.updateUser(newUserData);
          
          if (!createResponse.success) {
            throw new Error(createResponse.error);
          }
          
          if (!createResponse.data?.user) {
            throw new Error('Failed to create user');
          }
          
          // Return the newly created user
          return createResponse.data.user;
        }
        
        throw new Error(response.error);
      }
      
      if (!response.data?.user) {
        throw new Error('Failed to fetch user data');
      }
      
      set({ 
        userData: response.data.user,
        isNewUser: response.data.isNewUser,
        isFetchingUserData: false,
        lastFetched: Date.now()
      });
      
      return response.data.user;
    } catch (error) {
      console.error('Error fetching user data:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        isFetchingUserData: false
      });
      return null;
    }
  }
}));

export default useUserState; 