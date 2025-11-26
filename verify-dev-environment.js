#!/usr/bin/env node
/**
 * Verify Development Environment Configuration
 * Run this script to confirm you're using development Firestore collections
 */

console.log('='.repeat(80));
console.log('Firebase Environment Verification');
console.log('='.repeat(80));
console.log('');

const nodeEnv = process.env.NODE_ENV;
const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV;

console.log('Environment Variables:');
console.log(`  NODE_ENV:              ${nodeEnv || '(not set)'}`);
console.log(`  NEXT_PUBLIC_APP_ENV:   ${appEnv || '(not set)'}`);
console.log('');

// Determine which environment will be used
let firebaseEnv = 'development'; // default

if (appEnv === 'production') {
  firebaseEnv = 'production';
} else if (appEnv === 'development') {
  firebaseEnv = 'development';
} else if (nodeEnv === 'production') {
  firebaseEnv = 'development'; // safe default
}

const collectionSuffix = `_${firebaseEnv}`;

console.log('🔥 Firebase Environment: ' + firebaseEnv.toUpperCase());
console.log('');
console.log('📦 Firestore Collections:');
console.log(`   ✓ users${collectionSuffix}`);
console.log(`   ✓ accounts${collectionSuffix}`);
console.log(`   ✓ stories_gen${collectionSuffix}`);
console.log(`   ✓ kids_details${collectionSuffix}`);
console.log('');

if (firebaseEnv === 'development') {
  console.log('✅ SAFE: Using DEVELOPMENT collections');
  console.log('   You can safely test without affecting production data.');
} else {
  console.log('⚠️  WARNING: Using PRODUCTION collections');
  console.log('   Changes will affect live data!');
}

console.log('');
console.log('='.repeat(80));
console.log('');

// Check .env.local file
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const hasAppEnv = envContent.includes('NEXT_PUBLIC_APP_ENV=development');
  
  console.log('.env.local Configuration:');
  if (hasAppEnv) {
    console.log('  ✅ NEXT_PUBLIC_APP_ENV=development is set');
  } else {
    console.log('  ⚠️  NEXT_PUBLIC_APP_ENV is not set or not set to development');
    console.log('     Add this line to .env.local:');
    console.log('     NEXT_PUBLIC_APP_ENV=development');
  }
  console.log('');
}

console.log('Commands:');
console.log('  npm run dev       → Start development server (development collections)');
console.log('  npm run devprod   → Start dev server with production collections (careful!)');
console.log('  npm run build     → Build for production');
console.log('');
