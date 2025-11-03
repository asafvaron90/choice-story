# Firebase Cloud Functions

This directory contains Firebase Cloud Functions that can be used alongside your Next.js application.

## 🚀 Quick Links

- [OpenAI Integration Setup](./OPENAI_SETUP.md) - Complete guide for OpenAI text and image generation
- [Usage Examples](./EXAMPLES.md) - Practical examples for Next.js integration

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Build the functions:
```bash
npm run build
```

## Development

### Run Functions Locally
```bash
npm run serve
```

This will start the Firebase emulator with your functions running locally.

### Watch Mode
```bash
npm run build:watch
```

This will automatically rebuild your functions when you make changes.

## Deployment

Deploy all functions:
```bash
npm run deploy
```

Deploy specific function:
```bash
firebase deploy --only functions:helloWorld
```

## Function Types

### OpenAI Functions
- **Text Generation**: `generateTextFunction` - Generate text using GPT models
- **Image Generation**: `generateImageFunction` - Generate single images using DALL-E
- **Batch Image Generation**: `generateMultipleImagesFunction` - Generate multiple images
- 📖 See [OpenAI Setup Guide](./OPENAI_SETUP.md) for details

### HTTP Functions
- Can be called via HTTP requests
- Example: `helloWorld`

### Callable Functions
- Can be called from your Next.js app using the Firebase SDK
- Automatically handle authentication
- Example: `addMessage`

### Firestore Triggers
- Automatically triggered by Firestore events
- Example: `onUserCreate`

### Scheduled Functions
- Run on a schedule (cron jobs)
- Example: `scheduledFunction`

## Usage in Next.js

### Calling Callable Functions

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const addMessage = httpsCallable(functions, 'addMessage');

const result = await addMessage({ text: 'Hello!' });
```

### Calling HTTP Functions

```typescript
const response = await fetch('https://your-region-your-project.cloudfunctions.net/helloWorld');
const data = await response.text();
```

## Environment Variables

Create a `.env` file in the functions directory:

```
API_KEY=your-api-key
SECRET_KEY=your-secret-key
```

Access in functions:

```typescript
const apiKey = functions.config().api.key;
```

## Logging

View logs:
```bash
npm run logs
```

Or in the Firebase Console: https://console.firebase.google.com/

