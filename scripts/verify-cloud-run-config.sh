#!/bin/bash
# Verify Cloud Run configuration for staging backend

set -e

echo "🔍 Checking Cloud Run configuration for staging backend..."
echo ""

PROJECT_ID="choicestory-b3135"
SERVICE_NAME="ssrchoicestoryb3135stag"
REGION="us-central1"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI not found. Please install it: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Set project
echo "📌 Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo ""
echo "📊 Current Cloud Run service configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get service description
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="table(
    spec.template.spec.containers[0].resources.limits.memory:label=MEMORY,
    spec.template.spec.containers[0].resources.limits.cpu:label=CPU,
    spec.template.spec.containerConcurrency:label=CONCURRENCY,
    spec.template.metadata.annotations['autoscaling.knative.dev/minScale']:label=MIN_INSTANCES,
    spec.template.metadata.annotations['autoscaling.knative.dev/maxScale']:label=MAX_INSTANCES
  )" 2>/dev/null || {
    echo "❌ Failed to get service details. Service might not exist yet."
    exit 1
  }

echo ""
echo "🔗 Service URL:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(status.url)" 2>/dev/null

echo ""
echo "📝 Latest revision:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(status.latestCreatedRevisionName)" 2>/dev/null

echo ""
echo "✅ Verification complete!"

