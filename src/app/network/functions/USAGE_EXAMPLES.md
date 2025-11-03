# Function Client API - Usage Examples

Complete guide on how to use the Function Client API in your Next.js app.

---

## 📦 Import

```typescript
import { functionClientAPI } from '@/app/network/functions';
// or
import { getFunctionClientAPI } from '@/app/network/functions';
```

---

## 🎯 Basic Usage

### Generate Story Pages Text

```typescript
import { functionClientAPI } from '@/app/network/functions';

async function createStory() {
  try {
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
    console.log('Story ID:', result.storyId);
    // Story is automatically saved to Firestore!
  } catch (error) {
    console.error('Failed to generate story:', error.message);
  }
}
```

### Generate Kid Avatar Image

```typescript
import { functionClientAPI } from '@/app/network/functions';

async function generateAvatar() {
  try {
    const result = await functionClientAPI.generateKidAvatarImage({
      promptId: "prompt_456",
      imageUrl: "https://example.com/kid-photo.jpg",
      accountId: "account_abc123",
      userId: "user_xyz789"
    });

    console.log('Avatar URL:', result.imageUrl);
    // Avatar is automatically saved to Storage and Firestore!
  } catch (error) {
    console.error('Failed to generate avatar:', error.message);
  }
}
```

### Generate Story Page Image

```typescript
import { functionClientAPI } from '@/app/network/functions';

async function generatePageImage() {
  try {
    const result = await functionClientAPI.generateStoryPageImage({
      promptId: "prompt_789",
      imagePrompt: "A bright, cheerful morning scene with a young boy...",
      accountId: "account_abc123",
      userId: "user_xyz789",
      storyId: "story_def456",
      pageNum: 1
    });

    console.log('Page image URL:', result.imageUrl);
    console.log('Page number:', result.pageNum);
    // Image is automatically saved to Storage and Firestore!
  } catch (error) {
    console.error('Failed to generate page image:', error.message);
  }
}
```

### Generate Story Cover Image

```typescript
import { functionClientAPI } from '@/app/network/functions';

async function generateCoverImage() {
  try {
    const result = await functionClientAPI.generateStoryCoverImage({
      promptId: "prompt_101",
      title: "John's School Adventure",
      characterDescription: "A brave 8-year-old boy with short brown hair",
      accountId: "account_abc123",
      userId: "user_xyz789",
      storyId: "story_def456"
    });

    console.log('Cover image URL:', result.imageUrl);
    // Cover is automatically saved to Storage and Firestore!
  } catch (error) {
    console.error('Failed to generate cover image:', error.message);
  }
}
```

---

## ⚛️ React Component Examples

### Using with useState

```typescript
'use client';

import { useState } from 'react';
import { functionClientAPI } from '@/app/network/functions';

export function CreateStoryComponent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);

  const generateStory = async () => {
    setLoading(true);
    setError(null);

    try {
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

      setStoryText(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateStory} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Story'}
      </button>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {storyText && (
        <div>
          <h3>Generated Story:</h3>
          <pre>{storyText}</pre>
        </div>
      )}
    </div>
  );
}
```

### Using the Custom Hook

```typescript
'use client';

import { useAsyncFunction } from '@/app/network/functions';
import { functionClientAPI } from '@/app/network/functions';

export function GenerateAvatarComponent() {
  const {
    execute: generateAvatar,
    isLoading,
    error,
    data,
    reset,
  } = useAsyncFunction(functionClientAPI.generateKidAvatarImage);

  const handleGenerate = async () => {
    try {
      await generateAvatar({
        promptId: "prompt_456",
        imageUrl: "https://example.com/kid-photo.jpg",
        accountId: "account_abc123",
        userId: "user_xyz789"
      });
    } catch (err) {
      // Error is already handled by the hook
      console.error('Generation failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? 'Generating Avatar...' : 'Generate Avatar'}
      </button>

      {error && (
        <div style={{ color: 'red' }}>
          Error: {error.message}
        </div>
      )}

      {data && (
        <div>
          <h3>Avatar Generated!</h3>
          <img src={data.imageUrl} alt="Generated avatar" />
        </div>
      )}

      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

---

## 🔄 Batch Operations

### Generate Multiple Page Images

```typescript
import { functionClientAPI } from '@/app/network/functions';

async function generateAllPages(storyId: string, pageCount: number) {
  const results = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const result = await functionClientAPI.generateStoryPageImage({
        promptId: "prompt_789",
        imagePrompt: `Page ${pageNum} description...`,
        accountId: "account_abc123",
        userId: "user_xyz789",
        storyId: storyId,
        pageNum: pageNum
      });

      results.push(result);
      console.log(`Page ${pageNum} generated:`, result.imageUrl);
    } catch (error) {
      console.error(`Failed to generate page ${pageNum}:`, error);
    }
  }

  return results;
}
```

### Generate Complete Story

```typescript
import { functionClientAPI } from '@/app/network/functions';

async function generateCompleteStory(storyData: any) {
  try {
    // 1. Generate story text
    const storyResult = await functionClientAPI.generateStoryPagesText({
      promptId: storyData.promptId,
      name: storyData.name,
      problemDescription: storyData.problemDescription,
      title: storyData.title,
      age: storyData.age,
      advantages: storyData.advantages,
      disadvantages: storyData.disadvantages,
      accountId: storyData.accountId,
      userId: storyData.userId,
      storyId: storyData.storyId
    });

    // 2. Generate cover image
    const coverResult = await functionClientAPI.generateStoryCoverImage({
      promptId: storyData.coverPromptId,
      title: storyData.title,
      characterDescription: storyData.characterDescription,
      accountId: storyData.accountId,
      userId: storyData.userId,
      storyId: storyData.storyId
    });

    // 3. Parse story pages
    const pages = JSON.parse(storyResult.text).pages;

    // 4. Generate images for each page
    const pageImages = await Promise.all(
      pages.map((page: any, index: number) =>
        functionClientAPI.generateStoryPageImage({
          promptId: storyData.imagePromptId,
          imagePrompt: page.imagePrompt,
          accountId: storyData.accountId,
          userId: storyData.userId,
          storyId: storyData.storyId,
          pageNum: page.pageNum
        })
      )
    );

    return {
      story: storyResult,
      cover: coverResult,
      pages: pageImages
    };
  } catch (error) {
    console.error('Failed to generate complete story:', error);
    throw error;
  }
}
```

---

## 🎨 UI Component Example

```typescript
'use client';

import { useState } from 'react';
import { functionClientAPI } from '@/app/network/functions';

export function StoryCreator() {
  const [formData, setFormData] = useState({
    name: '',
    problemDescription: '',
    title: '',
    age: 8,
    advantages: '',
    disadvantages: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await functionClientAPI.generateStoryPagesText({
        promptId: "your-prompt-id",
        ...formData,
        accountId: "your-account-id",
        userId: "your-user-id",
        storyId: "your-story-id"
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Kid's name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      
      <textarea
        placeholder="Problem description"
        value={formData.problemDescription}
        onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
      />
      
      <input
        type="text"
        placeholder="Story title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      
      <input
        type="number"
        placeholder="Age"
        value={formData.age}
        onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
      />
      
      <textarea
        placeholder="Advantages"
        value={formData.advantages}
        onChange={(e) => setFormData({ ...formData, advantages: e.target.value })}
      />
      
      <textarea
        placeholder="Disadvantages"
        value={formData.disadvantages}
        onChange={(e) => setFormData({ ...formData, disadvantages: e.target.value })}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Generating Story...' : 'Generate Story'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {result && (
        <div>
          <h3>Story Generated!</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </form>
  );
}
```

---

## 🔐 Authentication Check

```typescript
import { functionClientAPI } from '@/app/network/functions';

function ProtectedComponent() {
  const isAuthenticated = functionClientAPI.isAuthenticated();
  const userId = functionClientAPI.getCurrentUserId();

  if (!isAuthenticated) {
    return <div>Please log in to continue</div>;
  }

  return (
    <div>
      <p>Welcome, user {userId}!</p>
      {/* Your protected content */}
    </div>
  );
}
```

---

## ⚠️ Error Handling

```typescript
import { functionClientAPI } from '@/app/network/functions';

async function handleGeneration() {
  try {
    const result = await functionClientAPI.generateStoryPagesText({
      // ... your data
    });
    
    // Success!
    console.log('Generated:', result);
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      switch (error.message) {
        case 'You must be logged in to perform this action':
          // Redirect to login
          break;
        case 'Invalid request parameters':
          // Show validation error
          break;
        case 'Service temporarily unavailable':
          // Show retry message
          break;
        default:
          // Show generic error
          console.error('Unexpected error:', error.message);
      }
    }
  }
}
```

---

## 🚀 Best Practices

1. **Always check authentication** before calling functions
2. **Handle errors gracefully** with user-friendly messages
3. **Show loading states** during async operations
4. **Use the custom hooks** for cleaner component code
5. **Batch operations** when generating multiple items
6. **Cache results** when possible to avoid redundant calls

---

## 📝 Notes

- All functions automatically save to Firestore and Storage
- Functions return public URLs for images
- Authentication is handled automatically by Firebase
- All functions are type-safe with TypeScript

