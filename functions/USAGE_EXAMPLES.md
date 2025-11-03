# Firebase Cloud Functions - Usage Examples

This document shows how to use both **Callable Functions** (Firebase SDK) and **HTTP Functions** (REST API) from your Next.js client.

---

## Option 1: Callable Functions (Firebase SDK)

### Setup

```typescript
// In your Next.js app
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const functions = getFunctions();
const auth = getAuth();
```

### Generate Story Pages Text

```typescript
const generateStoryPagesText = httpsCallable(functions, 'generateStoryPagesText');

try {
  const result = await generateStoryPagesText({
    promptId: "prompt_123",
    name: "John",
    problemDescription: "John doesn't want to go to school",
    title: "John's School Adventure",
    age: 8,
    advantages: "Making friends, learning new things",
    disadvantages: "Missing out on fun activities"
  });

  console.log('Story ID:', result.data.storyId);
  console.log('Story Text:', result.data.text);
  // Story is automatically saved to Firestore!
} catch (error) {
  console.error('Error:', error);
}
```

### Generate Kid Avatar Image

```typescript
const generateKidAvatarImage = httpsCallable(functions, 'generateKidAvatarImage');

try {
  const result = await generateKidAvatarImage({
    promptId: "prompt_456",
    imageUrl: "https://example.com/kid-photo.jpg"
  });

  // result.data.base64 contains the base64 image
  const imageDataUrl = `data:image/png;base64,${result.data.base64}`;
  
  // Save to Firestore or display
  console.log('Avatar generated!');
} catch (error) {
  console.error('Error:', error);
}
```

---

## Option 2: HTTP Functions (REST API)

### Setup

```typescript
// In your Next.js app
import { getAuth } from 'firebase/auth';

const auth = getAuth();
```

### Generate Story Pages Text

```typescript
async function generateStoryPagesTextHttp() {
  try {
    // Get Firebase token
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const token = await user.getIdToken();

    // Call HTTP function
    const response = await fetch('https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/generateStoryPagesTextHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        promptId: "prompt_123",
        name: "John",
        problemDescription: "John doesn't want to go to school",
        title: "John's School Adventure",
        age: 8,
        advantages: "Making friends, learning new things",
        disadvantages: "Missing out on fun activities"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Story ID:', result.storyId);
    console.log('Story Text:', result.text);
    // Story is automatically saved to Firestore!
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Generate Kid Avatar Image

```typescript
async function generateKidAvatarImageHttp() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const token = await user.getIdToken();

    const response = await fetch('https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/generateKidAvatarImageHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        promptId: "prompt_456",
        imageUrl: "https://example.com/kid-photo.jpg"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const imageDataUrl = `data:image/png;base64,${result.base64}`;
    console.log('Avatar generated!');
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## What Happens Behind the Scenes

### 1. **Generation**
   - Function calls OpenAI API
   - Generates story text or image

### 2. **Save to Firestore**
   - Automatically saves result to Firestore
   - Includes metadata (userId, timestamp, status)

### 3. **Return to Client**
   - Returns response to client if still listening
   - Includes generated content + Firestore document ID

### Example Firestore Document

```json
{
  "userId": "user123",
  "name": "John",
  "problemDescription": "John doesn't want to go to school",
  "title": "John's School Adventure",
  "age": 8,
  "advantages": "Making friends, learning new things",
  "disadvantages": "Missing out on fun activities",
  "text": "{...generated story JSON...}",
  "createdAt": "2024-01-15T10:30:00Z",
  "status": "completed"
}
```

---

## Which Option Should You Use?

### Use **Callable Functions** if:
- ✅ You're already using Firebase in your app
- ✅ You want simpler authentication (handled automatically)
- ✅ You want better error handling
- ✅ You're building a Firebase-native app

### Use **HTTP Functions** if:
- ✅ You want standard REST API endpoints
- ✅ You're using fetch/axios everywhere
- ✅ You want to call from external services
- ✅ You need CORS support

---

## Available Functions

### Text Generation
- `generateStoryPagesText` / `generateStoryPagesTextHttp`
- `generateStoryImagePrompt` / `generateStoryImagePromptHttp`

### Image Generation
- `generateKidAvatarImage` / `generateKidAvatarImageHttp`
- `generateStoryPageImage` / `generateStoryPageImageHttp`
- `generateStoryCoverImage` / `generateStoryCoverImageHttp`

---

## Notes

- All functions require Firebase authentication
- All functions automatically save results to Firestore
- All functions return the generated content + Firestore document ID
- HTTP functions support CORS for cross-origin requests

