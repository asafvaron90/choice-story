# OpenAI Cloud Functions Setup Guide

This guide explains how to use the OpenAI integration in Firebase Cloud Functions.

## 📋 Table of Contents

- [Setup](#setup)
- [Base Client](#base-client)
- [Text Generation](#text-generation)
- [Image Generation](#image-generation)
- [Usage Examples](#usage-examples)
- [Environment Variables](#environment-variables)

## 🚀 Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Set Environment Variables

Set your OpenAI API key in Firebase:

```bash
firebase functions:config:set openai.api_key="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"
```

Or use the Firebase Console:
1. Go to Firebase Console
2. Select your project
3. Go to Functions → Configuration
4. Add `openai.api_key` with your OpenAI API key

### 3. Deploy Functions

```bash
npm run deploy
```

## 🔧 Base Client

The base OpenAI client is located in `src/lib/openai.ts` and provides:

- **Singleton pattern** - One instance of the OpenAI client
- **Environment variable management** - Automatically loads API key
- **Error handling** - Throws errors if API key is missing

```typescript
import OpenAIClient from "./lib/openai";

// Get the singleton instance
const openai = OpenAIClient.getInstance();

// Check if configured
if (OpenAIClient.isConfigured()) {
  // Use OpenAI
}
```

## 📝 Text Generation

### Available Functions

#### 1. `generateText(request: TextGenerationRequest)`

Generate text using the full request format with prompt ID.

```typescript
import { generateText } from "./text-generation";

const result = await generateText({
  prompt: {
    id: "prompt_id_here"
  },
  input: "Your input text"
});

console.log(result); // Generated text
```

#### 2. `generateTextCustom(input: string, options?)`

Generate text with custom parameters.

```typescript
import { generateTextCustom } from "./text-generation";

const result = await generateTextCustom(
  "Create a story about a brave knight",
  {
    model: "gpt-4.1-2025-04-14",
    temperature: 1.0,
    max_tokens: 2048,
    systemPrompt: "You are a children's story writer"
  }
);

console.log(result); // Generated text
```

### Cloud Function: `generateTextFunction`

Callable from your Next.js app:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateText = httpsCallable(functions, 'generateTextFunction');

// Option 1: Full format
const result = await generateText({
  prompt: { id: "prompt_id" },
  input: "Create a story"
});

// Option 2: Simplified format
const result = await generateText({
  input: "Create a story",
  systemPrompt: "You are a storyteller",
  temperature: 1.0,
  max_tokens: 2048
});

console.log(result.data.text); // Generated text
```

## 🎨 Image Generation

### Available Functions

#### 1. `generateImage(request: ImageGenerationRequest)`

Generate image with full control.

```typescript
import { generateImage } from "./image-generation";

const response = await generateImage({
  prompt: "A beautiful sunset over mountains",
  model: "dall-e-3",
  size: "1024x1024",
  quality: "standard",
  style: "vivid",
  n: 1
});

console.log(response.data[0].url); // Image URL
```

#### 2. `generateImageURL(prompt: string, options?)`

Generate a single image and get the URL.

```typescript
import { generateImageURL } from "./image-generation";

const url = await generateImageURL(
  "A beautiful sunset over mountains",
  {
    size: "1024x1024",
    quality: "standard",
    style: "vivid"
  }
);

console.log(url); // Direct URL
```

#### 3. `generateMultipleImages(prompt: string, count, options?)`

Generate multiple images at once.

```typescript
import { generateMultipleImages } from "./image-generation";

const urls = await generateMultipleImages(
  "A beautiful sunset over mountains",
  3, // Generate 3 images
  {
    size: "1024x1024",
    quality: "standard"
  }
);

console.log(urls); // Array of URLs
```

### Cloud Function: `generateImageFunction`

Callable from your Next.js app:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateImage = httpsCallable(functions, 'generateImageFunction');

const result = await generateImage({
  prompt: "A beautiful sunset over mountains",
  size: "1024x1024",
  quality: "standard",
  style: "vivid"
});

console.log(result.data.url); // Image URL
```

### Cloud Function: `generateMultipleImagesFunction`

Generate multiple images:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateMultiple = httpsCallable(functions, 'generateMultipleImagesFunction');

const result = await generateMultiple({
  prompt: "A beautiful sunset over mountains",
  count: 3,
  size: "1024x1024"
});

console.log(result.data.urls); // Array of URLs
console.log(result.data.count); // Number of images
```

## 💡 Usage Examples

### Example 1: Story Generation

```typescript
// In your Next.js app
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateStory = httpsCallable(functions, 'generateTextFunction');

const result = await generateStory({
  input: JSON.stringify({
    name: "Emma",
    age: 8,
    problem: "Afraid of the dark",
    title: "Emma's Brave Night"
  }),
  systemPrompt: "You are a children's story writer. Create engaging, age-appropriate stories with positive messages.",
  temperature: 1.0,
  max_tokens: 2048
});

const story = JSON.parse(result.data.text);
console.log(story.pages); // Array of story pages
```

### Example 2: Avatar Generation

```typescript
// In your Next.js app
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateAvatar = httpsCallable(functions, 'generateImageFunction');

const result = await generateAvatar({
  prompt: "A friendly 8-year-old girl with brown hair, wearing a blue dress, Pixar style, 3D animation",
  size: "1024x1024",
  quality: "hd",
  style: "vivid"
});

console.log(result.data.url); // Avatar image URL
```

### Example 3: Story Images Generation

```typescript
// In your Next.js app
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateStoryImages = httpsCallable(functions, 'generateMultipleImagesFunction');

const imagePrompts = [
  "A cozy bedroom at night, Pixar style",
  "A brave child under the stars, Pixar style",
  "A magical night sky with friendly stars, Pixar style"
];

// Generate all images
const imagePromises = imagePrompts.map(prompt => 
  generateStoryImages({
    prompt,
    count: 1,
    size: "1024x1024",
    quality: "hd",
    style: "vivid"
  })
);

const results = await Promise.all(imagePromises);
const imageUrls = results.map(r => r.data.urls[0]);

console.log(imageUrls); // Array of image URLs
```

## 🔐 Environment Variables

### Required

- `OPENAI_API_KEY` - Your OpenAI API key

### Optional (can be set in Firebase Config)

```bash
firebase functions:config:set \
  openai.api_key="your-api-key" \
  openai.default_model="gpt-4.1-2025-04-14" \
  openai.default_temperature="1.0"
```

Access in code:

```typescript
const apiKey = functions.config().openai.api_key;
const defaultModel = functions.config().openai.default_model;
```

## 📊 Response Formats

### Text Generation Response

```typescript
{
  success: true,
  text: "Generated text here..."
}
```

### Image Generation Response (Single)

```typescript
{
  success: true,
  url: "https://..."
}
```

### Image Generation Response (Multiple)

```typescript
{
  success: true,
  urls: ["https://...", "https://...", "https://..."],
  count: 3
}
```

## 🛠️ Error Handling

All functions throw appropriate errors:

```typescript
try {
  const result = await generateTextFunction({ input: "..." });
} catch (error) {
  if (error.code === 'unauthenticated') {
    // User not authenticated
  } else if (error.code === 'invalid-argument') {
    // Invalid input
  } else if (error.code === 'internal') {
    // Server error
  }
}
```

## 🚦 Next Steps

1. **Install dependencies**: `cd functions && npm install`
2. **Set API key**: `firebase functions:config:set openai.api_key="your-key"`
3. **Deploy functions**: `npm run deploy`
4. **Use in Next.js**: Import and call the functions from your app

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Next.js with Firebase](https://firebase.google.com/docs/web/setup)

