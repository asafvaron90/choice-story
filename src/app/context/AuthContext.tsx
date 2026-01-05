"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  Auth,
  User as FirebaseUser,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";

import useAccountState from "../state/account-state";
import useKidsState from "../state/kids-state";
import { Account } from "@/models";

interface FirebaseError extends Error {
  code?: string;
}

// Define the context type
export interface AuthContextType {
  currentUser: Account | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

// Create and export the context
export const AuthContext = createContext<AuthContextType | null>(null);

// Export the hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function to convert Firebase User to Domain User
const convertToDomainUser = (user: FirebaseUser | null): Account | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || undefined,
    email: user.email || '',
    photoURL: user.photoURL || undefined,
    phoneNumber: user.phoneNumber || undefined,
    metadata: {},
    createAt: new Date(),
    lastUpdated: new Date()
  };
};

// Define provider props interface
export interface AuthProviderProps {
  children: ReactNode;
  auth: Auth;
}

// Export the provider component
export function AuthProvider({ children, auth }: AuthProviderProps) {
  // State for our domain user
  const [domainUser, setDomainUser] = useState<Account | null>(null);
  
  // Use our global state
  const { 
    currentUser: firebaseCurrentUser,
    isLoading,
    setCurrentUser: setFirebaseCurrentUser,
    updateAccountInFirestore,
    clearAccountData,
  } = useAccountState();
  
  // Access kids state for clearing on logout
  const { clearKids, fetchKids } = useKidsState();

  const [isSigningIn, setIsSigningIn] = useState(false);

  async function logout() {
    try {
      await signOut(auth);
      setDomainUser(null);
      setFirebaseCurrentUser(null);
      clearAccountData();
      clearKids();
      
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      throw error;
    }
  }

  async function googleSignIn() {
    // Prevent multiple simultaneous sign-in attempts
    if (isSigningIn) return;

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    setIsSigningIn(true);

    try {
      const result = await signInWithPopup(auth, provider);
      if (result) {
        const fbUser = result.user;
        setFirebaseCurrentUser(fbUser);
        
        // Convert to domain user
        const domUser = convertToDomainUser(fbUser);
        setDomainUser(domUser);
        
        // Note: Account creation will be handled by onAuthStateChanged effect
        // This ensures single source of truth for account syncing
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error during authentication:', error.message);
      } else {
        console.error('Unknown error during authentication:', error);
      }
      
      // Handle specific popup-related errors
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/popup-blocked') {
        // If popup is blocked, try redirect method
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("Error during redirect sign-in: ", redirectError);
          throw redirectError;
        }
      } else if (firebaseError.code === 'auth/cancelled-popup-request' || firebaseError.code === 'auth/popup-closed-by-user') {
        // User cancelled the popup - we can safely ignore this
        console.log("Sign-in popup was cancelled or closed");
      } else {
        // For other errors, rethrow
        throw error;
      }
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    if (isSigningIn) return;
    setIsSigningIn(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result) {
        const fbUser = result.user;
        setFirebaseCurrentUser(fbUser);
        
        // Convert to domain user
        const domUser = convertToDomainUser(fbUser);
        setDomainUser(domUser);
      }
    } catch (error: unknown) {
      console.error('Error during email/password sign in:', error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signUpWithEmail(email: string, password: string) {
    if (isSigningIn) return;
    setIsSigningIn(true);

    try {
      // Check if account exists with different provider (e.g., Google)
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.length > 0 && !signInMethods.includes('password')) {
        // Account exists with Google - sign them in with Google first, then link password
        console.log('Account exists with Google, signing in with Google first to link...');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account', login_hint: email });
        
        const googleResult = await signInWithPopup(auth, provider);
        const fbUser = googleResult.user;
        
        // Now link the email/password credential
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(fbUser, credential);
        
        console.log('Successfully linked email/password to Google account');
        setFirebaseCurrentUser(fbUser);
        
        // Convert to domain user
        const domUser = convertToDomainUser(fbUser);
        setDomainUser(domUser);
        return;
      }
      
      // Create new account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result) {
        const fbUser = result.user;
        setFirebaseCurrentUser(fbUser);
        
        // Convert to domain user
        const domUser = convertToDomainUser(fbUser);
        setDomainUser(domUser);
      }
    } catch (error: unknown) {
      console.error('Error during email/password sign up:', error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }

  // Add handler for redirect result
  useEffect(() => {
    // Handle the redirect result when the component mounts
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const fbUser = result.user;
          setFirebaseCurrentUser(fbUser);
          
          // Convert to domain user
          const domUser = convertToDomainUser(fbUser);
          setDomainUser(domUser);
          
          // Note: Account creation will be handled by onAuthStateChanged effect
          // This ensures single source of truth for account syncing
        }
      })
      .catch((error: Error) => {
        console.error("Error handling redirect result:", error);
      });
  }, [auth, setFirebaseCurrentUser]);

  async function updateUserProfile(displayName: string, photoURL?: string) {
    if (!firebaseCurrentUser) throw new Error("No user logged in");
    try {
      // First update Firebase Auth profile
      await updateProfile(firebaseCurrentUser, {
        displayName,
        photoURL: photoURL || firebaseCurrentUser.photoURL || undefined,
      });
      
      // Then update our state and the database
      await updateAccountInFirestore(firebaseCurrentUser, {
        displayName,
        photoURL: photoURL || firebaseCurrentUser.photoURL || undefined,
      });
      
      // Update the domain user in our state
      setDomainUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          displayName: displayName || prev.displayName,
          photoURL: photoURL || prev.photoURL,
          lastUpdated: new Date()
        };
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("onAuthStateChanged user: ", user);
      setFirebaseCurrentUser(user);

      // Convert to domain user
      const domUser = convertToDomainUser(user);
      setDomainUser(domUser);

      // Only create/update account data if a user exists
      if (user) {
        try {
          // Use updateAccountInFirestore to create/update account instead of just fetching
          const accountData = await updateAccountInFirestore(user);
          
          if (accountData) {
            // Fetch kids data after account data is created/updated
            await fetchKids(accountData.uid, user);
          }
        } catch (error) {
          console.error("Error syncing user with database:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [auth, fetchKids, setFirebaseCurrentUser, updateAccountInFirestore]);

  const value: AuthContextType = {
    currentUser: domainUser,
    firebaseUser: firebaseCurrentUser,
    loading: isLoading,
    logout,
    googleSignIn,
    signInWithEmail,
    signUpWithEmail,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

const _handleError = (_error: Error): void => {
  // Implementation of handleError function
};
