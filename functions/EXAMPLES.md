# OpenAI Cloud Functions - Usage Examples

This document provides practical examples of using the OpenAI cloud functions in your Next.js application.

## 📋 Prerequisites

1. Firebase Cloud Functions deployed
2. OpenAI API key configured
3. Firebase initialized in your Next.js app

## 🔧 Setup in Next.js

### 1. Initialize Firebase in your Next.js app

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app);
```

### 2. Create a service file for OpenAI functions

```typescript
// src/services/openai-service.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

// Text generation
export const generateText = httpsCallable(functions, 'generateTextFunction');

// Image generation
export const generateImage = httpsCallable(functions, 'generateImageFunction');
export const generateMultipleImages = httpsCallable(functions, 'generateMultipleImagesFunction');
```

## 📝 Text Generation Examples

### Example 1: Simple Text Generation

```typescript
import { generateText } from '@/services/openai-service';

async function createStory() {
  try {
    const result = await generateText({
      input: "Create a short story about a brave little girl named Emma",
      systemPrompt: "You are a children's story writer. Create engaging, age-appropriate stories.",
      temperature: 1.0,
      max_tokens: 1024
    });

    console.log(result.data.text);
  } catch (error) {
    console.error('Error generating text:', error);
  }
}
```

### Example 2: Story Generation with Structured Output

```typescript
import { generateText } from '@/services/openai-service';

interface StoryRequest {
  name: string;
  age: number;
  problem: string;
  title: string;
}

async function generateStory(request: StoryRequest) {
  try {
    const prompt = `Create a story for ${request.name}, age ${request.age}.
    Problem: ${request.problem}
    Title: ${request.title}
    
    Return a JSON object with pages array, each page containing:
    - pageNum: number
    - text: string
    - imagePrompt: string
    - pageType: string`;

    const result = await generateText({
      input: prompt,
      systemPrompt: "You are a children's story writer. Always return valid JSON.",
      temperature: 1.0,
      max_tokens: 2048
    });

    const story = JSON.parse(result.data.text);
    return story;
  } catch (error) {
    console.error('Error generating story:', error);
    throw error;
  }
}

// Usage
const story = await generateStory({
  name: "Emma",
  age: 8,
  problem: "Afraid of the dark",
  title: "Emma's Brave Night"
});

console.log(story.pages);
```

### Example 3: Interactive Story Creation Component

```typescript
// src/components/StoryCreator.tsx
'use client';

import { useState } from 'react';
import { generateText } from '@/services/openai-service';

export default function StoryCreator() {
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    problem: '',
    title: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const prompt = `Create a story for ${formData.name}, age ${formData.age}.
      Problem: ${formData.problem}
      Title: ${formData.title}`;

      const result = await generateText({
        input: prompt,
        systemPrompt: "You are a children's story writer. Return valid JSON with pages array.",
        temperature: 1.0,
        max_tokens: 2048
      });

      const parsedStory = JSON.parse(result.data.text);
      setStory(parsedStory);
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Child's name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Age"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
        />
        <textarea
          placeholder="Problem/Challenge"
          value={formData.problem}
          onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
        />
        <input
          type="text"
          placeholder="Story Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Story'}
        </button>
      </form>

      {story && (
        <div>
          <h2>{story.title}</h2>
          {story.pages?.map((page: any) => (
            <div key={page.pageNum}>
              <p>{page.text}</p>
              <small>{page.imagePrompt}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🎨 Image Generation Examples

### Example 1: Single Image Generation

```typescript
import { generateImage } from '@/services/openai-service';

async function createAvatar(name: string, age: number) {
  try {
    const result = await generateImage({
      prompt: `A friendly ${age}-year-old child named ${name}, Pixar style, 3D animation, bright colors`,
      size: "1024x1024",
      quality: "hd",
      style: "vivid"
    });

    return result.data.url;
  } catch (error) {
    console.error('Error generating avatar:', error);
    throw error;
  }
}

// Usage
const avatarUrl = await createAvatar("Emma", 8);
console.log(avatarUrl);
```

### Example 2: Multiple Images for Story

```typescript
import { generateMultipleImages } from '@/services/openai-service';

async function generateStoryImages(imagePrompts: string[]) {
  try {
    const imagePromises = imagePrompts.map(prompt =>
      generateMultipleImages({
        prompt,
        count: 1,
        size: "1024x1024",
        quality: "hd",
        style: "vivid"
      })
    );

    const results = await Promise.all(imagePromises);
    const urls = results.map(r => r.data.urls[0]);

    return urls;
  } catch (error) {
    console.error('Error generating story images:', error);
    throw error;
  }
}

// Usage
const prompts = [
  "A cozy bedroom at night with a child looking out the window, Pixar style",
  "A brave child under a starry sky, Pixar style",
  "A magical night sky with friendly stars, Pixar style"
];

const imageUrls = await generateStoryImages(prompts);
console.log(imageUrls);
```

### Example 3: Image Generation Component

```typescript
// src/components/ImageGenerator.tsx
'use client';

import { useState } from 'react';
import { generateImage } from '@/services/openai-service';

export default function ImageGenerator() {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setImageUrl(null);

    try {
      const result = await generateImage({
        prompt,
        size: "1024x1024",
        quality: "hd",
        style: "vivid"
      });

      setImageUrl(result.data.url);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to generate..."
        rows={4}
      />
      <button onClick={handleGenerate} disabled={loading || !prompt}>
        {loading ? 'Generating...' : 'Generate Image'}
      </button>

      {imageUrl && (
        <div>
          <img src={imageUrl} alt="Generated" />
          <a href={imageUrl} download>Download</a>
        </div>
      )}
    </div>
  );
}
```

## 🔄 Complete Story Creation Flow

```typescript
// src/services/story-service.ts
import { generateText, generateMultipleImages } from '@/services/openai-service';

interface StoryGenerationRequest {
  name: string;
  age: number;
  problem: string;
  title: string;
  advantages: string;
  disadvantages: string;
}

export async function generateCompleteStory(request: StoryGenerationRequest) {
  try {
    // Step 1: Generate story text
    const storyPrompt = `Create a story for ${request.name}, age ${request.age}.
    Problem: ${request.problem}
    Title: ${request.title}
    Advantages: ${request.advantages}
    Disadvantages: ${request.disadvantages}
    
    Return JSON with pages array, each containing:
    - pageNum: number
    - text: string
    - imagePrompt: string (in English)
    - pageType: string`;

    const textResult = await generateText({
      input: storyPrompt,
      systemPrompt: "You are a children's story writer. Return valid JSON only.",
      temperature: 1.0,
      max_tokens: 2048
    });

    const story = JSON.parse(textResult.data.text);

    // Step 2: Generate images for each page
    const imagePrompts = story.pages.map((page: any) => page.imagePrompt);
    
    const imagePromises = imagePrompts.map(prompt =>
      generateMultipleImages({
        prompt,
        count: 1,
        size: "1024x1024",
        quality: "hd",
        style: "vivid"
      })
    );

    const imageResults = await Promise.all(imagePromises);
    const imageUrls = imageResults.map(r => r.data.urls[0]);

    // Step 3: Combine text and images
    const completeStory = {
      ...story,
      pages: story.pages.map((page: any, index: number) => ({
        ...page,
        imageUrl: imageUrls[index]
      }))
    };

    return completeStory;
  } catch (error) {
    console.error('Error generating complete story:', error);
    throw error;
  }
}

// Usage
const story = await generateCompleteStory({
  name: "Emma",
  age: 8,
  problem: "Afraid of the dark",
  title: "Emma's Brave Night",
  advantages: "Feeling safe and confident",
  disadvantages: "Missing out on bedtime stories"
});

console.log(story);
```

## 🎯 Best Practices

### 1. Error Handling

```typescript
try {
  const result = await generateText({ input: "..." });
} catch (error: any) {
  if (error.code === 'unauthenticated') {
    // Redirect to login
  } else if (error.code === 'invalid-argument') {
    // Show validation error
  } else {
    // Show generic error
  }
}
```

### 2. Loading States

```typescript
const [loading, setLoading] = useState(false);

const handleGenerate = async () => {
  setLoading(true);
  try {
    const result = await generateText({ input: "..." });
    // Handle result
  } finally {
    setLoading(false);
  }
};
```

### 3. Caching Results

```typescript
const [cachedStory, setCachedStory] = useState<any>(null);

const generateStory = async () => {
  if (cachedStory) return cachedStory;
  
  const result = await generateText({ input: "..." });
  setCachedStory(result);
  return result;
};
```

### 4. Progressive Enhancement

```typescript
const generateStoryWithImages = async () => {
  // Generate text first
  const textResult = await generateText({ input: "..." });
  
  // Show text immediately
  setStory(textResult);
  
  // Generate images in background
  const imagePrompts = extractImagePrompts(textResult);
  const images = await generateImages(imagePrompts);
  
  // Update with images
  setStory({ ...textResult, images });
};
```

## 🚀 Performance Tips

1. **Batch image generation** - Generate multiple images in parallel
2. **Cache results** - Store generated content to avoid regeneration
3. **Progressive loading** - Show text first, then images
4. **Error boundaries** - Wrap components in error boundaries
5. **Optimistic updates** - Show loading states immediately

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Next.js Documentation](https://nextjs.org/docs)

