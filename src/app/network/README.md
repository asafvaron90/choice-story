# Network Module

This module provides a structured approach to handle API requests in the application.

## Structure

- `NetworkClient.ts` - Base client for making authenticated API requests
- `StoryApi.ts` - API service for story-related endpoints
- `KidApi.ts` - API service for kid-related endpoints
- `UserApi.ts` - API service for user-related endpoints
- `TextGenerationApi.ts` - API service for text generation endpoints
- `ImageGenerationApi.ts` - API service for image generation endpoints
- `AvatarApi.ts` - API service for avatar-related endpoints

## NetworkClient

The `NetworkClient` is the foundation for all API interactions. It:

- Handles authentication by adding tokens automatically
- Manages request formatting
- Provides a consistent error handling approach
- Offers typed responses using generics

### Usage

The `NetworkClient` exports a default instance as `apiClient` that can be used directly:

```typescript
import { apiClient } from './NetworkClient';

// GET request
const response = await apiClient.get<YourResponseType>('/api/endpoint');

// POST request
const response = await apiClient.post<YourResponseType>('/api/endpoint', { data: 'value' });
```

## API Service Examples

### UserApi

```typescript
import { UserApi } from '@/app/network/UserApi';

// Get user data
const response = await UserApi.getUserData(userId);
if (response.success) {
  const userData = response.data.user;
  // Use userData
}

// Update user
await UserApi.updateUser({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  phoneNumber: user.phoneNumber,
});
```

### KidApi

```typescript
import { KidApi } from '@/app/network/KidApi';

// Get all kids for a user
const response = await KidApi.getKids(userId);
if (response.success) {
  const kids = response.data.kids;
  // Use kids array
}

// Create or update a kid
await KidApi.createOrUpdateKid({
  userId: userId,
  kid: {
    name: "Kid Name",
    age: 8,
    gender: "male",
  },
  avatarUrl: "https://example.com/avatar.jpg",
});
```

### StoryApi

```typescript
import { StoryApi } from '@/app/network/StoryApi';

// Get stories for a kid
const response = await StoryApi.getStoriesByKid(kidId);
if (response.success) {
  const stories = response.data.stories;
  // Use stories array
}

// Get a single story
const storyResponse = await StoryApi.getStoryById(storyId);
```

### TextGenerationApi

```typescript
import { TextGenerationApi } from '@/app/network/TextGenerationApi';

// Generate story choices
const response = await TextGenerationApi.generateChoices({
  problem: "The princess is trapped in a castle",
  targetAge: 8,
  numberOfChoices: 3
});

// Generate story problem
const problemResponse = await TextGenerationApi.generateStoryProblem({
  storyTheme: "adventure",
  characterName: "Alex",
  characterGender: "male",
  characterAge: 7
});
```

### ImageGenerationApi

```typescript
import { ImageGenerationApi } from '@/app/network/ImageGenerationApi';

// Generate cover image
const response = await ImageGenerationApi.generateCoverImage({
  storyTitle: "The Magic Forest",
  problem: "Alex is lost in a magical forest",
  kidName: "Alex",
  kidAge: 7,
  kidGender: "male"
});

// Generate choice images
const imagesResponse = await ImageGenerationApi.generateChoiceImages({
  choices: [
    { id: "1", text: "Enter the cave" },
    { id: "2", text: "Climb the mountain" }
  ],
  problem: "Alex is at a crossroads"
});
```

### AvatarApi

```typescript
import { AvatarApi } from '@/app/network/AvatarApi';

// Analyze avatar
const response = await AvatarApi.analyzeAvatar({
  imageUrl: "https://example.com/avatar.jpg",
  name: "Alex",
  age: 7,
  gender: "male"
});

// Check avatar requirements
const requirementsResponse = await AvatarApi.checkRequirements({
  imageUrl: "https://example.com/avatar.jpg",
  expectedGender: "male",
  expectedAge: 7
});
```

## Advanced Usage

### Custom Network Client

You can create a custom instance of the NetworkClient:

```typescript
import { NetworkClient } from './NetworkClient';

const customClient = new NetworkClient({
  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    'X-Custom-Header': 'value'
  },
  requestOptions: {
    // Any fetch options
  }
});
```

### Request Options

You can pass custom options to any request:

```typescript
const response = await apiClient.get('/api/endpoint', {
  headers: {
    'X-Custom-Header': 'value'
  },
  credentials: 'include',
  // Other fetch options
});
``` 