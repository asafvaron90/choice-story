'use client';

import { useEffect } from 'react';
import { RemoteConfigService } from '@/app/services/remote-config.service';

/**
 * Client-side component that initializes Firebase Remote Config on app startup.
 * This component doesn't render anything, it just triggers the initialization.
 */
export function RemoteConfigInitializer() {
  useEffect(() => {
    // Initialize Remote Config on mount
    RemoteConfigService.initialize().catch((error) => {
      console.error('[RemoteConfigInitializer] Failed to initialize:', error);
    });
  }, []);

  return null;
}
