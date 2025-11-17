# Environment Variables & Deployment Setup Guide

This document explains how environment variables are managed across local development and CI/CD pipelines, as well as Firebase hosting configuration.

## Firebase Hosting Configuration

The project has two separate Firebase hosting sites:

| Environment | Target Name | Firebase Site ID |
|-------------|-------------|------------------|
| **Production** | `production` | `choicestory-b3135` |
| **Staging** | `staging` | `choicestory-b3135-stage` |

### Configured Targets

The `.firebaserc` file defines hosting targets:

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

### Deployment Commands by Target

```bash
# Deploy to production hosting
firebase deploy --only hosting:production

# Deploy to staging hosting
firebase deploy --only hosting:staging
```

---

## Environment Variables

Environment variables are managed in a centralized way:
- **Local Development**: Variables from root `.env.local` or `.env.production`
- **GitHub Actions**: Variables from GitHub Secrets
- **Firebase Functions**: Auto-generated `functions/.env` from either source

## Local Development

### Root Environment Files

Create `.env.local` in the project root with your environment variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-key-here

# Firebase Configuration (for Next.js)
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Environment Configuration
# Set to 'development' for staging, 'production' for production
NEXT_PUBLIC_FIREBASE_ENV=development
```

### How It Works

When you run deployment scripts, they automatically:

1. **Check for environment variables** first (set by GitHub Actions)
2. **Fall back to root `.env.local`** (local development)
3. **Fall back to root `.env.production`** (alternative)
4. **Create `functions/.env`** automatically with the API key

### Deployment Scripts

The project includes 6 deployment scripts for complete control over staging and production deployments:

#### 📦 All Scripts Overview

| Script | Description | What it deploys |
|--------|-------------|----------------|
| `npm run deploy:prod` | **Full Production Deploy** | Production hosting + production functions |
| `npm run deploy:prod:hosting` | **Production Hosting Only** | Next.js hosting to `choicestory-b3135` |
| `npm run deploy:prod:functions` | **Production Functions Only** | Production functions (non-dev) |
| `npm run deploy:staging` | **Full Staging Deploy** | Staging hosting + dev functions |
| `npm run deploy:staging:hosting` | **Staging Hosting Only** | Next.js hosting to `choicestory-b3135-stage` |
| `npm run deploy:staging:functions` | **Staging Functions Only** | Dev functions (dev-prefixed) |

#### 🚀 Usage Examples

##### Deploy Everything to Production
```bash
npm run deploy:prod
```
This will:
1. Clean `.next` folder
2. Build the Next.js app with `NEXT_PUBLIC_FIREBASE_ENV=production`
3. Deploy production functions (using `deploy-production.sh`)
4. Deploy hosting to `choicestory-b3135`

##### Deploy Only Production Hosting
```bash
npm run deploy:prod:hosting
```
This will:
1. Clean `.next` folder
2. Set `NEXT_PUBLIC_FIREBASE_ENV=production`
3. Build Next.js app for production
4. Apply target mapping: `production` → `choicestory-b3135`
5. Deploy to production hosting site

##### Deploy Only Production Functions
```bash
npm run deploy:prod:functions
```
This will:
1. Create `functions/.env` from root `.env.production` or `.env.local`
2. Build functions once
3. Deploy only production functions (non-dev)
4. Preserve dev functions

##### Deploy Everything to Staging
```bash
npm run deploy:staging
```
This will:
1. Clean `.next` folder
2. Build the Next.js app with `NEXT_PUBLIC_FIREBASE_ENV=development`
3. Deploy dev functions (using `deploy-staging.sh`)
4. Deploy hosting to `choicestory-b3135-stage`

##### Deploy Only Staging Hosting
```bash
npm run deploy:staging:hosting
```
This will:
1. Clean `.next` folder
2. Set `NEXT_PUBLIC_FIREBASE_ENV=development`
3. Build Next.js app for staging
4. Apply target mapping: `staging` → `choicestory-b3135-stage`
5. Deploy to staging hosting site

##### Deploy Only Staging Functions
```bash
npm run deploy:staging:functions
```
This will:
1. Create `functions/.env` from root `.env.local` or `.env.production`
2. Build functions once
3. Deploy only dev- functions
4. Preserve production functions

#### 🔧 Behind The Scenes

**Staging Hosting Deployment (`deploy-staging-hosting.sh`):**
- Cleans `.next` folder for fresh build
- Sets `NEXT_PUBLIC_FIREBASE_ENV=development` and `FIREBASE_ENV=development`
- Builds Next.js app with staging configuration
- Applies target mapping: `staging` → `choicestory-b3135-stage`
- Deploys to staging hosting site only

**Production Hosting Deployment (`deploy-production-hosting.sh`):**
- Cleans `.next` folder for fresh build
- Sets `NEXT_PUBLIC_FIREBASE_ENV=production` and `FIREBASE_ENV=production`
- Builds Next.js app with production configuration
- Applies target mapping: `production` → `choicestory-b3135`
- Deploys to production hosting site only

**Staging Functions Deployment (`deploy-staging.sh`):**
- Extracts dev- function names from `generated-dev-functions.ts`
- Creates `.env` from root environment files
- Builds functions once (disables predeploy hook)
- Deploys only dev- prefixed functions

**Production Functions Deployment (`deploy-production.sh`):**
- Extracts production function names from individual function files
- Creates `.env` from root environment files
- Builds functions once (disables predeploy hook)
- Deploys only production functions (excludes dev- functions)

---

## GitHub Actions (CI/CD)

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add these secrets:

#### Required for Functions Deployment

```
FIREBASE_TOKEN              # Get with: firebase login:ci
OPENAI_API_KEY             # Your OpenAI API key
```

#### Optional for Hosting Deployment

If you're deploying Next.js hosting, also add:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

### How to Get Firebase Token

```bash
firebase login:ci
```

Copy the token and add it to GitHub Secrets as `FIREBASE_TOKEN`.

### Workflow Files

- **Staging**: `.github/workflows/deploy-staging.yml`
  - Triggers on push to `staging` branch
  - Cleans `.next` folder
  - Sets `NEXT_PUBLIC_FIREBASE_ENV=development`
  - Builds Next.js app for staging
  - Deploys dev- prefixed functions
  - Deploys to staging hosting (`choicestory-b3135-stage`)

- **Production**: `.github/workflows/deploy-production.yml`
  - Triggers on push to `production` branch
  - Cleans `.next` folder
  - Sets `NEXT_PUBLIC_FIREBASE_ENV=production`
  - Builds Next.js app for production
  - Deploys production functions
  - Deploys to production hosting (`choicestory-b3135`)

### Deployment Flow Diagrams

#### Staging Hosting Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│  npm run deploy:staging:hosting                            │
│  OR                                                         │
│  GitHub Actions: Push to staging branch                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Clean Build Artifacts                                   │
│     rm -rf .next                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Set Environment Variables                               │
│     NODE_ENV=production                                     │
│     NEXT_PUBLIC_FIREBASE_ENV=development                    │
│     FIREBASE_ENV=development                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Build Next.js App                                      │
│     npm run build                                           │
│     (with staging environment variables)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Apply Target Mapping                                   │
│     firebase target:apply hosting staging                   │
│     choicestory-b3135-stage                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Deploy to Firebase Hosting                             │
│     firebase deploy --only hosting:staging                 │
│     → choicestory-b3135-stage                              │
└─────────────────────────────────────────────────────────────┘
```

#### Production Hosting Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│  npm run deploy:prod:hosting                               │
│  OR                                                         │
│  GitHub Actions: Push to production branch                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Clean Build Artifacts                                   │
│     rm -rf .next                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Set Environment Variables                               │
│     NODE_ENV=production                                     │
│     NEXT_PUBLIC_FIREBASE_ENV=production                     │
│     FIREBASE_ENV=production                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Build Next.js App                                      │
│     npm run build                                           │
│     (with production environment variables)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Apply Target Mapping                                   │
│     firebase target:apply hosting production                │
│     choicestory-b3135                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Deploy to Firebase Hosting                             │
│     firebase deploy --only hosting:production               │
│     → choicestory-b3135                                    │
└─────────────────────────────────────────────────────────────┘
```

#### Complete Environment Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                       │
├─────────────────────────────────────────────────────────────┤
│  Hosting Site: choicestory-b3135-stage                     │
│  Environment: NEXT_PUBLIC_FIREBASE_ENV=development        │
│  Firestore: {collection}_development                      │
│  Functions: dev-* prefixed                                 │
│                                                             │
│  Deployment:                                               │
│  ├─ Clean .next folder                                     │
│  ├─ Build with development env vars                        │
│  └─ Deploy to choicestory-b3135-stage                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION ENVIRONMENT                     │
├─────────────────────────────────────────────────────────────┤
│  Hosting Site: choicestory-b3135                           │
│  Environment: NEXT_PUBLIC_FIREBASE_ENV=production         │
│  Firestore: {collection}_production                        │
│  Functions: Production (no prefix)                         │
│                                                             │
│  Deployment:                                               │
│  ├─ Clean .next folder                                     │
│  ├─ Build with production env vars                         │
│  └─ Deploy to choicestory-b3135                           │
└─────────────────────────────────────────────────────────────┘

✅ Complete Isolation: Staging deployments NEVER affect production
```

---

## Functions Environment Variables

The `functions/.env` file is **auto-generated** and should **NOT** be committed to git.

### File Location

```
functions/.env  # Auto-generated, git-ignored
```

### File Content

```bash
# Auto-generated from GitHub Secrets (or root .env.local)
OPENAI_API_KEY=sk-proj-your-key-here
```

### Gitignore

The `functions/.gitignore` includes:

```
.env
.env.*
!.env.example
```

---

## Function Naming Convention

### Production Functions

Named without prefix:
- `generateFullStory`
- `generateStoryTitles`
- `generateImageFunction`
- etc.

### Development Functions (Staging)

Named with `dev` prefix (camelCase):
- `devGenerateFullStory`
- `devGenerateStoryTitles`
- `devGenerateImageFunction`
- etc.

### Client-Side Usage

The client automatically calls the correct function based on `NODE_ENV`:

```typescript
// In development: calls devGenerateStoryTitles
// In production: calls generateStoryTitles
const result = await functionClient.generateStoryTitles(request);
```

---

## Troubleshooting

### Error: "OPENAI_API_KEY is not set"

**Local Development:**
1. Ensure `.env.local` exists in project root
2. Verify it contains `OPENAI_API_KEY=your-key`
3. Run deployment script again

**GitHub Actions:**
1. Go to repository Settings → Secrets
2. Verify `OPENAI_API_KEY` is set
3. Check workflow logs for environment file creation step

### Error: "No dev- functions found"

Run the generation script:
```bash
cd functions
npm run generate:dev-functions
```

### Error: Firebase deployment fails

1. Verify `FIREBASE_TOKEN` is valid:
   ```bash
   firebase login:ci
   ```
2. Update the token in GitHub Secrets
3. Ensure you have Firebase permissions for the project

---

## Migration from functions.config()

We've migrated from the deprecated `functions.config()` to `.env` files:

### Old Approach (Deprecated)
```typescript
const apiKey = functions.config().openai.api_key;
```

### New Approach
```typescript
const apiKey = process.env.OPENAI_API_KEY;
```

### Benefits
- ✅ Works with Firebase Functions v2
- ✅ Compatible with modern deployment tools
- ✅ Easier local development
- ✅ Consistent with Next.js environment variables

---

## Security Best Practices

1. **Never commit `.env` files** to git
2. **Rotate API keys** regularly
3. **Use different keys** for staging vs production
4. **Restrict Firebase token** permissions
5. **Review GitHub Actions logs** carefully (secrets are masked)

---

## Summary

| Environment | Source | Target | Auto-Generated |
|-------------|--------|--------|----------------|
| Local Dev | Root `.env.local` | `functions/.env` | ✅ Yes |
| GitHub Actions (Staging) | GitHub Secrets | `functions/.env` | ✅ Yes |
| GitHub Actions (Production) | GitHub Secrets | `functions/.env` | ✅ Yes |
| Firebase Deployment | `functions/.env` | Cloud Functions | ✅ Yes |

**All `.env` files are auto-generated from a single source of truth!**

