#!/bin/bash
# Script to allow unauthenticated access to Cloud Run services for both staging and production
# This fixes the 401/403 errors when accessing API routes and Sentry monitoring endpoints

set -e

PROJECT_ID="choicestory-b3135"
REGION="us-central1"
STAGING_SERVICE="ssrchoicestoryb3135stag"
PRODUCTION_SERVICE="ssrchoicestoryb3135"

echo "🔓 Configuring Cloud Run services to allow unauthenticated access..."
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI is not installed. Please install it first:"
  echo "   https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "❌ Not authenticated with gcloud. Please run: gcloud auth login"
  exit 1
fi

# Set the project
echo "🔧 Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo ""
echo "📦 Configuring staging service: $STAGING_SERVICE"
gcloud run services add-iam-policy-binding $STAGING_SERVICE \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID \
  --quiet || echo "⚠️  Failed to update staging service (may already be configured)"

echo ""
echo "📦 Configuring production service: $PRODUCTION_SERVICE"
gcloud run services add-iam-policy-binding $PRODUCTION_SERVICE \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID \
  --quiet || echo "⚠️  Failed to update production service (may already be configured)"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Both staging and production Cloud Run services now allow unauthenticated access."
echo "This allows:"
echo "  - API routes (/api/*) to be accessed with Firebase auth tokens"
echo "  - Sentry monitoring endpoint (/monitoring) to work properly"
echo ""
echo "Note: Your API routes still enforce Firebase authentication internally."

