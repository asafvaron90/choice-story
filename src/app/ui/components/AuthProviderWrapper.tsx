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
  return <AuthProvider auth={auth}>{children}</AuthProvider>;
}