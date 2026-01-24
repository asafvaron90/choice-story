"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
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

import * as Sentry from "@sentry/nextjs";
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
  
  // Track if this is the initial auth check
  const isInitialAuthCheck = useRef(true);
  
  // Timeout protection ref
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function logout() {
    try {
      console.log('[AUTH] 🚪 Logging out user...');
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'User logout initiated',
        level: 'info'
      });
      
      await signOut(auth);
      setDomainUser(null);
      setFirebaseCurrentUser(null);
      clearAccountData();
      clearKids();
      
      console.log('[AUTH] ✅ Logout successful, redirecting to home');
      
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('[AUTH ERROR] ❌ Error during logout:', error);
      Sentry.captureException(error, {
        tags: {
          component: 'AuthContext',
          operation: 'logout'
        }
      });
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

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Google sign-in initiated',
      level: 'info'
    });

    try {
      const result = await signInWithPopup(auth, provider);
      if (result) {
        const fbUser = result.user;
        setFirebaseCurrentUser(fbUser);
        
        // Convert to domain user
        const domUser = convertToDomainUser(fbUser);
        setDomainUser(domUser);
        
        console.log('[AUTH] ✅ Google sign-in successful');
        
        // Note: Account creation will be handled by onAuthStateChanged effect
        // This ensures single source of truth for account syncing
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('[AUTH ERROR] ❌ Error during Google authentication:', error.message);
      } else {
        console.error('[AUTH ERROR] ❌ Unknown error during Google authentication:', error);
      }
      
      // Handle specific popup-related errors
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/popup-blocked') {
        // If popup is blocked, try redirect method
        console.log('[AUTH] ⚠️ Popup blocked, trying redirect method');
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Google sign-in popup blocked, attempting redirect',
          level: 'warning'
        });
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("[AUTH ERROR] ❌ Error during redirect sign-in: ", redirectError);
          Sentry.captureException(redirectError, {
            tags: {
              component: 'AuthContext',
              operation: 'googleSignIn-redirect',
              provider: 'google'
            }
          });
          throw redirectError;
        }
      } else if (firebaseError.code === 'auth/cancelled-popup-request' || firebaseError.code === 'auth/popup-closed-by-user') {
        // User cancelled the popup - we can safely ignore this
        console.log("[AUTH] 🚫 Sign-in popup was cancelled or closed by user");
      } else {
        // For other errors, rethrow and log to Sentry
        Sentry.captureException(error, {
          tags: {
            component: 'AuthContext',
            operation: 'googleSignIn',
            provider: 'google'
          },
          extra: {
            errorCode: firebaseError.code
          }
        });
        throw error;
      }
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    if (isSigningIn) return;
    setIsSigningIn(true);

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Email/password sign-in initiated',
      level: 'info',
      data: { email }
    });

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result) {
        const fbUser = result.user;
        setFirebaseCurrentUser(fbUser);
        
        // Convert to domain user
        const domUser = convertToDomainUser(fbUser);
        setDomainUser(domUser);
        
        console.log('[AUTH] ✅ Email/password sign-in successful:', email);
      }
    } catch (error: unknown) {
      console.error('[AUTH ERROR] ❌ Error during email/password sign in:', error);
      Sentry.captureException(error, {
        tags: {
          component: 'AuthContext',
          operation: 'signInWithEmail',
          provider: 'password'
        },
        extra: {
          email
        }
      });
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signUpWithEmail(email: string, password: string) {
    if (isSigningIn) return;
    setIsSigningIn(true);

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Email/password sign-up initiated',
      level: 'info',
      data: { email }
    });

    try {
      // Check if account exists with different provider (e.g., Google)
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.length > 0 && !signInMethods.includes('password')) {
        // Account exists with Google - sign them in with Google first, then link password
        console.log('[AUTH] ⚠️ Account exists with Google, signing in with Google first to link...');
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Linking password to existing Google account',
          level: 'info',
          data: { email, existingProviders: signInMethods }
        });
        
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account', login_hint: email });
        
        const googleResult = await signInWithPopup(auth, provider);
        const fbUser = googleResult.user;
        
        // Now link the email/password credential
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(fbUser, credential);
        
        console.log('[AUTH] ✅ Successfully linked email/password to Google account');
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
        
        console.log('[AUTH] ✅ Email/password account created successfully:', email);
      }
    } catch (error: unknown) {
      console.error('[AUTH ERROR] ❌ Error during email/password sign up:', error);
      Sentry.captureException(error, {
        tags: {
          component: 'AuthContext',
          operation: 'signUpWithEmail',
          provider: 'password'
        },
        extra: {
          email
        }
      });
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
    // Set up a timeout protection to prevent infinite loading
    authTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.warn('[AUTH TIMEOUT] ⚠️ Auth initialization exceeded 10 seconds, forcing loading to false');
        setFirebaseCurrentUser(null);
        
        Sentry.captureMessage('Auth initialization timeout', {
          level: 'warning',
          tags: {
            component: 'AuthContext',
            operation: 'initialization'
          },
          extra: {
            timeoutDuration: '10s'
          }
        });
      }
    }, 10000); // 10 second timeout

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clear the timeout since auth state has been determined
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }

      const timestamp = new Date().toISOString();
      const isRestoredSession = isInitialAuthCheck.current && !!user;
      
      if (user) {
        // Determine the sign-in provider
        const providers = user.providerData.map(p => p.providerId).join(', ') || 'unknown';
        
        if (isRestoredSession) {
          console.log(`[AUTH RESTORED] 🔐 Session restored from storage at ${timestamp}`);
          console.log(`[AUTH RESTORED] Provider: ${providers}`);
          console.log(`[AUTH RESTORED] User: ${user.email} (${user.uid})`);
          console.log(`[AUTH RESTORED] Email verified: ${user.emailVerified}`);
          
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'User session restored from storage',
            level: 'info',
            data: {
              uid: user.uid,
              email: user.email,
              providers,
              emailVerified: user.emailVerified,
              isInitialLoad: true
            }
          });
        } else {
          console.log(`[AUTH SIGN-IN] ✅ New sign-in detected at ${timestamp}`);
          console.log(`[AUTH SIGN-IN] Provider: ${providers}`);
          console.log(`[AUTH SIGN-IN] User: ${user.email} (${user.uid})`);
          
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'User signed in',
            level: 'info',
            data: {
              uid: user.uid,
              email: user.email,
              providers,
              emailVerified: user.emailVerified,
              isInitialLoad: false
            }
          });
        }
      } else {
        if (isInitialAuthCheck.current) {
          console.log(`[AUTH] 👤 No authenticated user found at ${timestamp}`);
        } else {
          console.log(`[AUTH SIGN-OUT] 🚪 User signed out at ${timestamp}`);
          
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'User signed out',
            level: 'info'
          });
        }
      }
      
      // Mark that initial auth check is complete
      isInitialAuthCheck.current = false;
      
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
          console.error("[AUTH ERROR] ❌ Error syncing user with database:", error);
          Sentry.captureException(error, {
            tags: {
              component: 'AuthContext',
              operation: 'syncUserData'
            },
            extra: {
              uid: user.uid,
              email: user.email
            }
          });
        }
      }
    });
    
    return () => {
      unsubscribe();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
    // Note: fetchKids, setFirebaseCurrentUser, and updateAccountInFirestore are Zustand store actions
    // and are stable across renders. Including them in deps causes infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, isLoading]);

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
