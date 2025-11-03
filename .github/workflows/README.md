# GitHub Actions Workflows

## Deploy to Production

This workflow automatically deploys the application to Firebase when code is merged to the `main` branch.

### Setup Instructions

To enable the deployment workflow, you need to configure the `FIREBASE_TOKEN` secret in your GitHub repository.

#### 1. Generate Firebase Token

Run this command in your terminal (with Firebase CLI installed):

```bash
firebase login:ci
```

This will open a browser window for authentication and return a token.

#### 2. Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_TOKEN`
5. Value: Paste the token from step 1
6. Click **Add secret**

### What the Workflow Does

When a PR is merged to `main`:

1. ✅ Checks out the code
2. ✅ Sets up Node.js 20
3. ✅ Installs dependencies (root and functions)
4. ✅ Builds Firebase Functions
5. ✅ Deploys Firebase Functions
6. ✅ Builds and deploys to Production Hosting

### Environment Variables

The workflow uses:
- `FIREBASE_TOKEN`: Authenticates with Firebase (required)

### Manual Deployment

You can still deploy manually using:

```bash
# Deploy functions only
npm run deploy:prod:functions

# Deploy hosting only
npm run deploy:prod:hosting

# Deploy everything
npm run deploy:prod
```


