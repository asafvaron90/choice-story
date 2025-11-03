import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to initialize and manage error reporting
 * Automatically sets up user tracking and global error capture
 */
export function useErrorReporting() {
  const { firebaseUser } = useAuth();

  useEffect(() => {
    // Set user ID when user is authenticated
    if (firebaseUser?.uid) {
      Sentry.setUser({ 
        id: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        username: firebaseUser.displayName || undefined
      });
      
      // Set user context
      Sentry.setContext('user', {
        email: firebaseUser.email || 'unknown',
        displayName: firebaseUser.displayName || 'unknown',
        isEmailVerified: firebaseUser.emailVerified || false,
        provider: firebaseUser.providerData[0]?.providerId || 'unknown'
      });
    } else {
      // Clear user data when not authenticated
      Sentry.setUser(null);
    }
  }, [firebaseUser]);

  const log = (message: string, context?: Record<string, unknown>) => {
    Sentry.addBreadcrumb({
      category: 'info',
      message,
      data: context,
      level: 'info'
    });
  };

  const recordError = (error: Error | string, context?: Record<string, unknown>) => {
    if (typeof error === 'string') {
      Sentry.captureMessage(error, {
        level: 'error',
        extra: context
      });
    } else {
      Sentry.captureException(error, {
        extra: context
      });
    }
  };

  const setUserProperty = (key: string, value: string) => {
    Sentry.setContext(key, { value });
  };

  const setUserProperties = (properties: Record<string, string>) => {
    Object.entries(properties).forEach(([key, value]) => {
      Sentry.setContext(key, { value });
    });
  };

  return {
    log,
    recordError,
    setUserProperty,
    setUserProperties
  };
} 