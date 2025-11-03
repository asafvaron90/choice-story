'use client';

import { ReactNode } from 'react';
import { useErrorReporting } from '@/app/hooks/useErrorReporting';

interface ErrorReportingProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes error reporting
 * This component doesn't render anything but ensures error reporting is set up
 */
export function ErrorReportingProvider({ children }: ErrorReportingProviderProps) {
  // Initialize error reporting - the hook handles all the setup
  useErrorReporting();

  return <>{children}</>;
} 