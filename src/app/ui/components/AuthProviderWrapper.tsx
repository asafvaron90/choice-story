// components/AuthProviderWrapper.tsx
'use client';

import { AuthProvider, AuthContext } from '@/app/context/AuthContext';
import { auth } from '../../../../firebase';

import { ReactNode } from 'react';

// Fallback provider for build time when Firebase isn't initialized
function FallbackAuthProvider({ children }: { children: ReactNode }) {
  const fallbackValue = {
    currentUser: null,
    firebaseUser: null,
    loading: false,
    logout: async () => {},
    googleSignIn: async () => {
      throw new Error('Firebase Auth is not initialized');
    },
    updateUserProfile: async () => {
      throw new Error('Firebase Auth is not initialized');
    },
    signInWithEmail: async () => {
      throw new Error('Firebase Auth is not initialized');
    },
    signUpWithEmail: async () => {
      throw new Error('Firebase Auth is not initialized');
    },
  };

  return (
    <AuthContext.Provider value={fallbackValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default function AuthProviderWrapper({ 
  children 
}: { 
  children: ReactNode 
}) {
  if (!auth) {
    // During build time or when Firebase isn't initialized, use fallback provider
    // This allows components to use useAuth() without crashing
    return <FallbackAuthProvider>{children}</FallbackAuthProvider>;
  }
  return <AuthProvider auth={auth}>{children}</AuthProvider>;
}