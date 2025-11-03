import { useEffect } from 'react';
import useUserState from '../state/user-state';
import useKidsState from '../state/kids-state';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook that provides access to user data, kids data, and related actions
 * This hook combines the authentication context with Zustand state stores
 */
export function useUserData() {
  const { currentUser, firebaseUser } = useAuth();
  
  // Get user-related state and actions from our Zustand store
  const { 
    userData,
    isNewUser,
    isLoading: isLoadingUser,
    isFetchingUserData,
    error: userError,
    fetchUserData, 
    updateUserInFirestore, 
  } = useUserState();
  
  // Get kids-related state from our Zustand store
  const { 
    kids, 
    isLoading: isLoadingKids,
    error: kidsError,
    lastFetched: kidsLastFetched,
    fetchKids,
    deleteKid
  } = useKidsState();
  
  // Auto-fetch kids when user data changes
  useEffect(() => {
    const shouldFetchKids = 
      firebaseUser && 
      userData && 
      !isFetchingUserData && 
      userData.uid &&
      (!kidsLastFetched || Date.now() - kidsLastFetched > 5 * 60 * 1000); // Refetch every 5 minutes
    
    if (shouldFetchKids) {
      // Only need to pass the user ID, not the Firebase user object
      fetchKids(userData.uid);
    }
  }, [firebaseUser, userData, isFetchingUserData, kidsLastFetched, fetchKids]);
  
  // Return a combined object with all user and kids data and actions
  return {
    // User and auth data
    user: currentUser,
    firebaseUser,
    userData,
    isNewUser,
    isLoading: isLoadingUser || isLoadingKids || isFetchingUserData,
    error: userError || kidsError,
    
    // Kids data
    kids,
    hasKids: kids.length > 0,
    kidsLoaded: kidsLastFetched !== null,
    
    // Actions
    updateUser: updateUserInFirestore,
    refreshUserData: firebaseUser ? () => fetchUserData(firebaseUser) : undefined,
    refreshKids: userData ? () => fetchKids(userData.uid) : undefined,
    deleteKid: userData ? (kidId: string) => deleteKid(userData.uid, kidId) : undefined,
  };
}

export default useUserData; 