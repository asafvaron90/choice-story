# Staging and Production Deployment Setup

## Overview
Configure separate staging and production environments with:
- Completely separate Firebase functions (staging-{name} vs {name}) - full duplication, not wrappers
- Separate hosting sites configured in firebase.json (staging.choice-story.com vs choice-story.com)
- Environment-specific Firestore collections (already exist: {collection}_development vs {collection}_production)
- Consolidated workflows: one per environment that handles both functions and hosting

## Implementation Plan

### 1. Duplicate All Firebase Functions for Staging

**Files to modify:**
- All function files in `functions/src/functions/*.ts` - Duplicate each function with staging- prefix
- `functions/src/index.ts` - Export both staging and production versions

**Approach:**
- Create completely separate function implementations (not wrappers)
- Staging functions: `staging-{functionName}` → hardcode `"development"` environment
- Production functions: `{functionName}` → hardcode `"production"` environment  
- Remove `environment` parameter from all function signatures (hardcode per function)
- Each function will have its own complete implementation

**Functions to duplicate (all 9 files):**
- `example.ts`: healthCheck, debugEnvironment, addMessage, onUserCreate, scheduledFunction
- `text-generation.ts`: generateTextFunction
- `image-generation.ts`: generateImageFunction
- `story-text.ts`: generateStoryPagesText
- `story-titles.ts`: generateStoryTitles
- `story-images.ts`: generateStoryPageImage, generateStoryImages
- `image-prompt-and-image.ts`: generateImagePromptAndImage
- `full-story.ts`: generateFullStory
- `http-versions.ts`: All HTTP endpoint functions

### 2. Update Firebase Hosting Configuration

**File to modify:**
- `firebase.json` - Configure multiple hosting sites/targets

**Changes:**
- Convert hosting from single object to array with targets
- Staging target: site ID for `staging.choice-story.com`
- Production target: site ID for `choice-story.com`
- Both use same source directory but deploy to different sites

### 3. Consolidate and Update GitHub Workflows

**Files to modify:**
- `.github/workflows/deploy-staging.yml` - Consolidated: deploy staging functions + staging hosting
- `.github/workflows/deploy-production.yml` - Consolidated: deploy production functions + production hosting
- Delete: `.github/workflows/deploy-hosting-staging.yml` (consolidated into deploy-staging.yml)
- Delete: `.github/workflows/deploy-hosting-production.yml` (consolidated into deploy-production.yml)

**Changes:**
- Staging workflow: Deploy `dev-*` functions + hosting to staging site (`choicestory-b3135-stage`)
- Production workflow: Deploy production functions (no prefix) + hosting to production site (`choicestory-b3135`)
- Both workflows now include:
  - Clean `.next` folder before build
  - Set `NEXT_PUBLIC_FIREBASE_ENV` (development for staging, production for production)
  - Build Next.js app before deployment
  - Apply explicit target mappings
  - Deploy to correct hosting sites
- Use `firebase deploy --only hosting:staging` or `--only hosting:production` for hosting
- Use separate function deployment steps for functions

### 4. Update Function Code to Hardcode Environment

**Files to modify:**
- All function files in `functions/src/functions/*.ts`

**Changes:**
- Remove `environment` parameter from all function signatures
- Staging functions: Hardcode `const environment = "development"` at function start
- Production functions: Hardcode `const environment = "production"` at function start
- Update all calls to `getFirestoreHelper(environment)` to use hardcoded value
- Update all data validation to remove environment requirement

## Implementation Details

### Function Duplication Pattern
Each function file will export both versions:
```typescript
// Staging version - complete implementation
export const staging-{functionName} = functions.https.onCall(async (data, context) => {
  const environment = "development"; // Hardcoded
  const dbHelper = getFirestoreHelper(environment);
  // ... full implementation ...
});

// Production version - complete implementation  
export const {functionName} = functions.https.onCall(async (data, context) => {
  const environment = "production"; // Hardcoded
  const dbHelper = getFirestoreHelper(environment);
  // ... full implementation ...
});
```

### Hosting Configuration
```json
{
  "hosting": [
    {
      "target": "staging",
      "source": ".",
      "frameworksBackend": {
        "region": "us-central1"
      }
    },
    {
      "target": "production",
      "source": ".",
      "frameworksBackend": {
        "region": "us-central1"
      }
    }
  ]
}
```

**Target Mapping (`.firebaserc`):**
```json
{
  "targets": {
    "choicestory-b3135": {
      "hosting": {
        "staging": ["choicestory-b3135-stage"],
        "production": ["choicestory-b3135"]
      }
    }
  }
}
```

### Workflow Structure

**Staging Workflow (`deploy-staging.yml`):**
- Trigger: Push to `staging` branch
- Steps:
  1. Install dependencies
  2. Build functions with `NODE_ENV=development`
  3. Deploy `dev-*` prefixed functions
  4. Create `.env.production` with Firebase config + `NEXT_PUBLIC_FIREBASE_ENV=development`
  5. Clean `.next` folder
  6. Build Next.js app with staging environment variables
  7. Apply target mapping: `staging` → `choicestory-b3135-stage`
  8. Deploy to staging hosting

**Production Workflow (`deploy-production.yml`):**
- Trigger: Push to `production` branch
- Steps:
  1. Install dependencies
  2. Build functions with `NODE_ENV=production`
  3. Deploy production functions (no prefix)
  4. Create `.env.production` with Firebase config + `NEXT_PUBLIC_FIREBASE_ENV=production`
  5. Clean `.next` folder
  6. Build Next.js app with production environment variables
  7. Apply target mapping: `production` → `choicestory-b3135`
  8. Deploy to production hosting

### Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STAGING DEPLOYMENT                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Push to staging branch                                     │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────┐                  │
│  │ 1. Install Dependencies             │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 2. Build Functions                   │                  │
│  │    NODE_ENV=development             │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 3. Deploy Functions                  │                  │
│  │    Only dev-* prefixed functions     │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 4. Setup Next.js Environment        │                  │
│  │    NEXT_PUBLIC_FIREBASE_ENV=        │                  │
│  │    development                       │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 5. Clean Build                      │                  │
│  │    rm -rf .next                     │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 6. Build Next.js                    │                  │
│  │    With staging env vars             │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 7. Apply Target Mapping             │                  │
│  │    staging → choicestory-b3135-stage│                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 8. Deploy Hosting                   │                  │
│  │    → choicestory-b3135-stage        │                  │
│  └─────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION DEPLOYMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Push to production branch                                  │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────┐                  │
│  │ 1. Install Dependencies             │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 2. Build Functions                   │                  │
│  │    NODE_ENV=production              │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 3. Deploy Functions                  │                  │
│  │    Only production functions         │                  │
│  │    (excludes dev-* functions)         │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 4. Setup Next.js Environment        │                  │
│  │    NEXT_PUBLIC_FIREBASE_ENV=        │                  │
│  │    production                        │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 5. Clean Build                      │                  │
│  │    rm -rf .next                     │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 6. Build Next.js                    │                  │
│  │    With production env vars          │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 7. Apply Target Mapping             │                  │
│  │    production → choicestory-b3135   │                  │
│  └──────────────┬──────────────────────┘                  │
│                 │                                           │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                  │
│  │ 8. Deploy Hosting                   │                  │
│  │    → choicestory-b3135              │                  │
│  └─────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘

✅ Key Separation Points:
   - Different build artifacts (.next cleaned before each build)
   - Different environment variables (development vs production)
   - Different hosting sites (choicestory-b3135-stage vs choicestory-b3135)
   - Different function sets (dev-* vs production)
   - Complete isolation - no cross-contamination
```

## Testing Considerations
- Verify staging functions use `{collection}_development` collections
- Verify production functions use `{collection}_production` collections
- Test deployments don't interfere with each other
- Verify hosting deploys to correct domains:
  - Staging: `choicestory-b3135-stage`
  - Production: `choicestory-b3135`
- Ensure staging deployments don't affect production clients
- Verify `.next` folder is cleaned before each build
- Confirm `NEXT_PUBLIC_FIREBASE_ENV` is set correctly:
  - Staging: `development`
  - Production: `production`
- Test that target mappings are applied correctly

## Implementation Todos

1. Update firebase.json to support multiple hosting sites/targets (staging and production)
2. Duplicate all functions in example.ts with staging- prefix and hardcode development environment
3. Duplicate functions in text-generation.ts with staging- prefix
4. Duplicate functions in image-generation.ts with staging- prefix
5. Duplicate functions in story-text.ts with staging- prefix
6. Duplicate functions in story-titles.ts with staging- prefix
7. Duplicate functions in story-images.ts with staging- prefix
8. Duplicate functions in image-prompt-and-image.ts with staging- prefix
9. Duplicate functions in full-story.ts with staging- prefix
10. Duplicate all HTTP functions in http-versions.ts with staging- prefix
11. Update functions/src/index.ts to export both staging and production function versions
12. Remove environment parameter from all function signatures and hardcode environment value
13. Update deploy-staging.yml to deploy staging functions and staging hosting site (consolidated)
14. Update deploy-production.yml to deploy production functions and production hosting site (consolidated)
15. Delete deploy-hosting-staging.yml and deploy-hosting-production.yml (consolidated into main workflows)

