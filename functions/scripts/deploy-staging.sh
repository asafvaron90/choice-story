#!/bin/bash
# Deploy only dev- functions to staging without deleting existing production functions

# Don't use set -e since we want to continue deploying even if one function fails

echo "🔧 Setting up environment variables..."

# Get the script directory and project paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FUNCTIONS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$FUNCTIONS_DIR/.." && pwd)"

# Create functions/.env from various sources (CI or local development)
cd "$FUNCTIONS_DIR"

# Priority 1: Check if functions/.env already exists with valid keys (e.g., created by CI workflow)
if [ -f ".env" ] && grep -q "^OPENAI_API_KEY=" .env && grep -q "^RESEND_API_KEY=" .env; then
  echo "✅ Using existing functions/.env file (created by CI or previous run)"

# Priority 2: Check if environment variables are set (GitHub Actions / CI)
elif [ -n "$OPENAI_API_KEY" ] && [ -n "$RESEND_API_KEY" ]; then
  echo "✅ Creating .env from environment variables (CI mode)"
  echo "OPENAI_API_KEY=$OPENAI_API_KEY" > .env
  echo "RESEND_API_KEY=$RESEND_API_KEY" >> .env

# Priority 3: Check if root .env.local exists (local development)
elif [ -f "$PROJECT_ROOT/.env.local" ]; then
  echo "✅ Copying API keys from root .env.local (local development)"
  grep "^OPENAI_API_KEY=" "$PROJECT_ROOT/.env.local" > .env 2>/dev/null || true
  grep "^RESEND_API_KEY=" "$PROJECT_ROOT/.env.local" >> .env 2>/dev/null || true

# Priority 4: Check if root .env.production exists (local development fallback)
elif [ -f "$PROJECT_ROOT/.env.production" ]; then
  echo "✅ Copying API keys from root .env.production (local development)"
  grep "^OPENAI_API_KEY=" "$PROJECT_ROOT/.env.production" > .env 2>/dev/null || true
  grep "^RESEND_API_KEY=" "$PROJECT_ROOT/.env.production" >> .env 2>/dev/null || true

# No source available - fail with helpful message
else
  echo "❌ No environment configuration found!"
  echo ""
  echo "   Available options:"
  echo "   1. Set OPENAI_API_KEY and RESEND_API_KEY environment variables (for CI)"
  echo "   2. Create $PROJECT_ROOT/.env.local with required API keys (for local dev)"
  echo "   3. Create $PROJECT_ROOT/.env.production with required API keys (for local dev)"
  echo "   4. Create $FUNCTIONS_DIR/.env directly with required API keys"
  exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Validate that all required API keys are present
cd "$FUNCTIONS_DIR"
if [ ! -f ".env" ]; then
  echo "❌ .env file was not created!"
  exit 1
fi

MISSING_KEYS=()
if ! grep -q "^OPENAI_API_KEY=" .env; then
  MISSING_KEYS+=("OPENAI_API_KEY")
fi
if ! grep -q "^RESEND_API_KEY=" .env; then
  MISSING_KEYS+=("RESEND_API_KEY")
fi

if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
  echo "❌ Missing required API keys in .env file:"
  for key in "${MISSING_KEYS[@]}"; do
    echo "   - $key"
  done
  echo ""
  echo "   Please set these environment variables or add them to your root .env.local/.env.production file"
  exit 1
fi

echo "✅ All required API keys validated"
echo ""

cd "$FUNCTIONS_DIR"

echo "🔍 Extracting dev- function names from generated-dev-functions.ts..."

# Extract all dev- function names
DEV_FUNCTIONS=$(grep -o "export const dev[^=]*" src/functions/generated-dev-functions.ts | sed 's/export const //' | tr '\n' ',' | sed 's/,$//')

if [ -z "$DEV_FUNCTIONS" ]; then
  echo "❌ No dev- functions found!"
  exit 1
fi

echo "✅ Found dev- functions:"
echo "$DEV_FUNCTIONS" | tr ',' '\n' | sed 's/^/  - /'

echo ""
echo "🔨 Building functions (one time)..."
cd "$(dirname "$0")/.." || exit 1
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build complete!"
echo ""

# Get the path to firebase.json (parent directory)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FUNCTIONS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$FUNCTIONS_DIR/.." && pwd)"
FIREBASE_JSON="${PROJECT_ROOT}/firebase.json"
FIREBASE_JSON_BACKUP="${FIREBASE_JSON}.backup"

# Function to restore firebase.json on exit
restore_firebase_json() {
  if [ -f "$FIREBASE_JSON_BACKUP" ]; then
    echo ""
    echo "📝 Restoring firebase.json..."
    mv "$FIREBASE_JSON_BACKUP" "$FIREBASE_JSON"
  fi
}

# Set trap to restore firebase.json on script exit (success or failure)
trap restore_firebase_json EXIT

# Backup firebase.json and temporarily remove predeploy to avoid rebuilding
echo "📝 Temporarily disabling predeploy hook..."
if [ -f "$FIREBASE_JSON_BACKUP" ]; then
  rm -f "$FIREBASE_JSON_BACKUP"
fi
cp "$FIREBASE_JSON" "$FIREBASE_JSON_BACKUP"

if [ ! -f "$FIREBASE_JSON_BACKUP" ]; then
  echo "❌ Failed to backup firebase.json"
  exit 1
fi

# Use Node.js to properly modify JSON (most reliable)
if command -v node &> /dev/null; then
  node -e "
    const fs = require('fs');
    const json = JSON.parse(fs.readFileSync('$FIREBASE_JSON_BACKUP', 'utf8'));
    if (json.functions && json.functions[0]) {
      delete json.functions[0].predeploy;
    }
    fs.writeFileSync('$FIREBASE_JSON', JSON.stringify(json, null, 2));
  "
elif command -v jq &> /dev/null; then
  jq 'del(.functions[0].predeploy)' "$FIREBASE_JSON_BACKUP" > "$FIREBASE_JSON"
elif command -v python3 &> /dev/null; then
  python3 -c "
import json
with open('$FIREBASE_JSON_BACKUP', 'r') as f:
    data = json.load(f)
if 'functions' in data and len(data['functions']) > 0:
    data['functions'][0].pop('predeploy', None)
with open('$FIREBASE_JSON', 'w') as f:
    json.dump(data, f, indent=2)
  "
else
  echo "❌ Error: Need node, jq, or python3 to modify firebase.json"
  exit 1
fi

# Convert comma-separated string to array
IFS=',' read -ra FUNC_ARRAY <<< "$DEV_FUNCTIONS"

# Deploy with NODE_ENV=development
export NODE_ENV=development

# Build the --only flag with all dev- functions separated by commas
# Remove trailing/leading spaces from function names and construct the list
ONLY_FLAG="functions:$(echo "$DEV_FUNCTIONS" | sed 's/ //g' | sed 's/,/,functions:/g')"

echo "📦 Deployment command: firebase deploy --only \"$ONLY_FLAG\""
echo ""

# Change to project root for firebase deploy commands
cd "$PROJECT_ROOT" || exit 1

# Deploy all dev- functions at once
echo "🚀 Deploying all dev- functions..."
if firebase deploy --only "$ONLY_FLAG" --project choicestory-b3135; then
  echo ""
  echo "✅ Successfully deployed ${#FUNC_ARRAY[@]} dev- function(s)!"
else
  echo ""
  echo "❌ Deployment failed!"
  exit 1
fi

echo ""
echo "✅ Staging deployment complete!"

