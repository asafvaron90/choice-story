// Suppress specific deprecation warnings
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ..._args) => {
  // Suppress the specific util._extend deprecation warning
  if (typeof warning === 'string' && warning.includes('util._extend')) {
    return;
  }
  
  // Suppress DEP0060 deprecation warnings
  if (typeof warning === 'string' && warning.includes('DEP0060')) {
    return;
  }
  
  // Call the original emitWarning for all other warnings
  return originalEmitWarning.call(process, warning);
};

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Firebase Admin SDK first (before Sentry)
    const { firebaseAdmin } = await import('./app/services/firebase-admin.service');
    
    // Check if initialization was successful
    if (!firebaseAdmin.isReady()) {
      const error = firebaseAdmin.getInitializationError();
      console.error('[INSTRUMENTATION] Firebase Admin failed to initialize:', error);
    } else {
      console.log('[INSTRUMENTATION] Firebase Admin initialized successfully');
    }
    
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
