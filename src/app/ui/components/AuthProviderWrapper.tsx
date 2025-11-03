// components/AuthProviderWrapper.tsx
'use client';

import { AuthProvider } from '@/app/context/AuthContext';
import { auth } from '../../../../firebase';

import { ReactNode } from 'react';

export default function AuthProviderWrapper({ 
  children 
}: { 
  children: ReactNode 
}) {
  if (!auth) {
    console.error('Firebase Auth is not initialized. Please check your Firebase configuration.');
    return <>{children}</>;
  }
  return <AuthProvider auth={auth}>{children}</AuthProvider>;
}