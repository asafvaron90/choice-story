import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from "next";
import { ALLOWED_ORIGINS } from './src/config/build-config';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : ['http://localhost:3000'],
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        pathname: '/**',
      },
      // Add more specific patterns for Firebase Storage
      {
        protocol: 'https',
        hostname: '*.appspot.com',
        pathname: '/**',
      },
      // Allow all subdomains of appspot.com
      {
        protocol: 'https',
        hostname: 'choicestory-b3135.appspot.com',
        pathname: '/**',
      },
    ],
    // Add domains as fallback (deprecated but still works)
    domains: [
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      'replicate.delivery',
      'choicestory-b3135.appspot.com',
    ],
    // Disable image optimization for external URLs if needed
    unoptimized: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)", // Apply to all routes
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS[0] : "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, PATCH, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-Requested-With, Content-Type, Authorization"
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/_functions/batchImageGen',
        destination: 'https://us-central1-choicestory-production.cloudfunctions.net/batchImageGen',
      },
    ];
  },
  // reactStrictMode: true, // Enable unless you have a specific issue
};

export default withSentryConfig(nextConfig, {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

org: "idan-0d",
project: "choicestory",

// Only print logs for uploading source maps in CI
silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
widenClientFileUpload: true,

// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
automaticVercelMonitors: true,
});