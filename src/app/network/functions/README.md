# Function Client API

Type-safe client for calling Firebase Cloud Functions from your Next.js app.

---

## 🚀 Quick Start

```typescript
import { functionClientAPI } from '@/app/network/functions';

// Generate story text
const result = await functionClientAPI.generateStoryPagesText({
  promptId: "prompt_123",
  name: "John",
  problemDescription: "John doesn't want to go to school",
  title: "John's School Adventure",
  age: 8,
  advantages: "Making friends, learning new things",
  disadvantages: "Missing out on fun activities",
  accountId: "account_abc123",
  userId: "user_xyz789",
  storyId: "story_def456"
});

console.log('Story generated:', result.text);
```

---

## 📚 Available Functions

### Text Generation
- `generateStoryPagesText()` - Generate complete story with text and image prompts
- `generateStoryImagePrompt()` - Generate image prompt for a specific page

### Image Generation
- `generateKidAvatarImage()` - Generate Pixar-style avatar for a kid
- `generateStoryPageImage()` - Generate image for a specific story page
- `generateStoryCoverImage()` - Generate cover image for a story

---

## 🎯 Features

✅ **Type-Safe** - Full TypeScript support with autocomplete  
✅ **Error Handling** - User-friendly error messages  
✅ **Auto-Save** - Automatically saves to Firestore and Storage  
✅ **Authentication** - Built-in auth checks  
✅ **React Hooks** - Custom hooks for easy component integration  

---

## 📖 Documentation

- [Usage Examples](./USAGE_EXAMPLES.md) - Complete usage guide with examples
- [Type Definitions](./FunctionClientAPI.ts) - All available types and interfaces

---

## 🔧 Setup

The client automatically uses your Firebase configuration. Make sure you have initialized Firebase in your app:

```typescript
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
```

---

## ⚛️ React Usage

```typescript
'use client';

import { useAsyncFunction } from '@/app/network/functions';
import { functionClientAPI } from '@/app/network/functions';

export function MyComponent() {
  const { execute, isLoading, error, data } = useAsyncFunction(
    functionClientAPI.generateStoryPagesText
  );

  const handleClick = async () => {
    await execute({
      // ... your data
    });
  };

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Story'}
      </button>
      {error && <p>{error.message}</p>}
      {data && <p>Success!</p>}
    </div>
  );
}
```

---

## 🔗 Related Files

- `FunctionClientAPI.ts` - Main client class
- `useFunctionClient.ts` - React hooks
- `index.ts` - Exports
- `USAGE_EXAMPLES.md` - Detailed examples

