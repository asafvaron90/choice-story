#!/bin/bash
# Deploy only production hosting (without deploying Cloud Functions)
# 
# This script:
# 1. Cleans previous build artifacts (.next folder)
# 2. Sets environment variables for production (NEXT_PUBLIC_APP_ENV=production)
# 3. Builds Next.js app with production configuration
# 4. Deploys to Firebase Hosting site: choicestory-b3135
# 
# IMPORTANT: This deployment is completely independent from staging.
# Changes here will NOT affect the staging site (choicestory-b3135-stage).

set -e

echo "🚀 Deploying Production Hosting Only..."

# Get project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check Node version and switch to Node 20 if needed
CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$CURRENT_NODE_VERSION" != "20" ]; then
  echo "⚠️  Current Node version: v$CURRENT_NODE_VERSION"
  echo "📦 Switching to Node 20 for Firebase deployment..."
  
  # Try to use nvm to switch to Node 20
  if command -v nvm &> /dev/null; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 20 || nvm install 20
  else
    echo "⚠️  nvm not found, continuing with current Node version"
    echo "⚠️  If deployment fails, install Node 20: https://nodejs.org/"
  fi
fi

echo "✅ Using Node $(node -v)"
echo ""

# Clean previous build to ensure fresh build
echo "🧹 Cleaning previous build artifacts..."
rm -rf .next
echo "✅ Clean complete"
echo ""

# Set environment variables for production build
export NODE_ENV=production
export NEXT_PUBLIC_APP_ENV=production
export APP_ENV=production
export NEXT_PUBLIC_REMOTE_CONFIG_ENV=production

# Build Next.js app
echo "🔨 Building Next.js app for production..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build complete!"
echo ""

# Backup firebase.json
FIREBASE_JSON="firebase.json"
FIREBASE_JSON_BACKUP="${FIREBASE_JSON}.backup"

# Function to restore firebase.json on exit
restore_firebase_json() {
  if [ -f "$FIREBASE_JSON_BACKUP" ]; then
    echo ""
    echo "📝 Restoring firebase.json..."
    mv "$FIREBASE_JSON_BACKUP" "$FIREBASE_JSON"
  fi
}

# Set trap to restore firebase.json on script exit
trap restore_firebase_json EXIT

# Backup firebase.json
echo "📝 Creating temporary firebase.json without functions..."
cp "$FIREBASE_JSON" "$FIREBASE_JSON_BACKUP"

# Remove functions section using node
node -e "
  const fs = require('fs');
  const json = JSON.parse(fs.readFileSync('$FIREBASE_JSON_BACKUP', 'utf8'));
  delete json.functions;
  fs.writeFileSync('$FIREBASE_JSON', JSON.stringify(json, null, 2));
"

echo "✅ Temporary config created"
echo ""

# Set Firebase project
echo "🔧 Setting Firebase project..."
firebase use choicestory-b3135

# Explicitly apply target mapping to ensure correct site
echo "🔧 Applying production hosting target mapping..."
firebase target:apply hosting production choicestory-b3135 || echo "⚠️  Target may already be configured"

# Verify target configuration
echo "🔍 Verifying target configuration..."
TARGET_SITE=$(firebase target:get hosting production 2>/dev/null | grep -o 'choicestory-b3135' || echo "")
if [ "$TARGET_SITE" != "choicestory-b3135" ]; then
  echo "⚠️  Warning: Target verification failed. Proceeding anyway..."
fi

# Deploy production hosting
echo "📦 Deploying to production hosting (site: choicestory-b3135)..."
firebase deploy --only hosting:production --project choicestory-b3135

echo ""
echo "✅ Production hosting deployment complete!"
