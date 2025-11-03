#!/usr/bin/env node

/**
 * Firebase Configuration Verification Script
 * 
 * This script verifies that all required Firebase configuration is properly set up
 * for production-grade Google Sign-In authentication.
 */

const fs = require('fs');
const path = require('path');

// Required Firebase environment variables
const REQUIRED_FIREBASE_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

// Required Firebase Admin SDK variables
const REQUIRED_ADMIN_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

function checkEnvironmentFile(filePath) {
  console.log(`\n🔍 Checking ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${filePath} does not exist`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const vars = {};

  // Parse environment variables
  lines.forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      vars[match[1].trim()] = match[2].trim();
    }
  });

  let allGood = true;

  // Check Firebase client variables
  console.log('\n📋 Firebase Client SDK Variables:');
  REQUIRED_FIREBASE_VARS.forEach(varName => {
    if (vars[varName]) {
      console.log(`✅ ${varName} = ${vars[varName].substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName} is missing`);
      allGood = false;
    }
  });

  // Check Firebase Admin SDK variables
  console.log('\n🔐 Firebase Admin SDK Variables:');
  REQUIRED_ADMIN_VARS.forEach(varName => {
    if (vars[varName]) {
      if (varName === 'FIREBASE_PRIVATE_KEY') {
        console.log(`✅ ${varName} = [PRIVATE KEY SET]`);
      } else {
        console.log(`✅ ${varName} = ${vars[varName]}`);
      }
    } else {
      console.log(`❌ ${varName} is missing`);
      allGood = false;
    }
  });

  return allGood;
}

function checkFirebaseConfig() {
  console.log('🔐 Firebase Configuration Verification');
  console.log('=====================================');

  // Check if firebase.ts exists
  const firebaseConfigPath = path.join(__dirname, 'firebase.ts');
  if (fs.existsSync(firebaseConfigPath)) {
    console.log('✅ firebase.ts configuration file exists');
  } else {
    console.log('❌ firebase.ts configuration file missing');
    return false;
  }

  // Check environment files
  const envLocal = checkEnvironmentFile('.env.local');
  const envProduction = checkEnvironmentFile('.env.production');

  // Check for duplicate config files
  console.log('\n📁 Configuration File Duplicates:');
  const configFiles = {
    'tailwind.config.js': fs.existsSync('tailwind.config.js'),
    'tailwind.config.ts': fs.existsSync('tailwind.config.ts'),
    'postcss.config.js': fs.existsSync('postcss.config.js'),
    'postcss.config.mjs': fs.existsSync('postcss.config.mjs')
  };

  let hasDuplicates = false;
  Object.entries(configFiles).forEach(([file, exists]) => {
    if (exists) {
      console.log(`📄 ${file} exists`);
    }
  });

  if (configFiles['tailwind.config.js'] && configFiles['tailwind.config.ts']) {
    console.log('⚠️  Duplicate Tailwind config files detected');
    hasDuplicates = true;
  }

  if (configFiles['postcss.config.js'] && configFiles['postcss.config.mjs']) {
    console.log('⚠️  Duplicate PostCSS config files detected');
    hasDuplicates = true;
  }

  // Check package.json for Firebase dependency
  console.log('\n📦 Dependencies Check:');
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const firebaseVersion = packageJson.dependencies?.firebase;
    if (firebaseVersion) {
      console.log(`✅ Firebase v${firebaseVersion} installed`);
    } else {
      console.log('❌ Firebase dependency not found in package.json');
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log('===========');
  
  if (envLocal && envProduction && !hasDuplicates) {
    console.log('✅ All Firebase configuration checks passed!');
    console.log('\n🎉 Your Firebase Google Sign-In is properly configured for production.');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify Google Sign-In is enabled in Firebase Console');
    console.log('2. Add your production domain to authorized domains');
    console.log('3. Test authentication on both localhost and production');
    return true;
  } else {
    console.log('❌ Some configuration issues found. Please review the above output.');
    return false;
  }
}

// Run the verification
if (require.main === module) {
  checkFirebaseConfig();
}

module.exports = { checkFirebaseConfig }; 