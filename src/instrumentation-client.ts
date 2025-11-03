// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

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

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6f263f9d9c29dbbab7cde40a9e25c7f4@o536995.ingest.us.sentry.io/4509769764175872",

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;