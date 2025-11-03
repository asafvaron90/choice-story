# AI Bots Module

This module provides a clean, type-safe interface for interacting with OpenAI bots in your application.

## Features

- **Generic OpenAI Client**: Consolidated client with singleton pattern for efficient API usage
- **Error Handling**: Built-in Sentry integration for monitoring and error tracking
- **Type Safety**: Full TypeScript support with proper type definitions
- **Easy Integration**: Simple async functions for each bot type

## Available Bots

### 1. Avatar Image Generation
```typescript
import { generateAvatarImage } from '@/app/network/ai-bots';

const avatarResponse = await generateAvatarImage(
  "A friendly cartoon character with blue hair",
  { style: "cartoon", resolution: "512x512" }
);
```

### 2. Story Image Generation
```typescript
import { generateStoryImage } from '@/app/network/ai-bots';

const storyImageResponse = await generateStoryImage(
  "A magical forest with talking animals",
  { mood: "mystical", characters: ["rabbit", "owl"] }
);
```

### 3. Full Story Generation
```typescript
import { generateFullStory } from '@/app/network/ai-bots';

const storyResponse = await generateFullStory(
  "A story about a young detective solving mysteries",
  { length: "short", age_group: "8-12" }
);
```

## Error Handling

All functions include automatic error handling and Sentry integration:

- Errors are automatically captured and sent to Sentry
- Performance metrics are tracked for each bot request
- Proper error propagation to calling code

## Type Definitions

```typescript
interface BotResponse {
  data?: unknown;
  status?: number;
  [key: string]: unknown;
}

interface BotParams {
  [key: string]: unknown;
}
```

## Environment Setup

Make sure to set your OpenAI API key in your environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage in API Routes

```typescript
// pages/api/generate-avatar.ts
import { generateAvatarImage } from '@/app/network/ai-bots';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { prompt } = req.body;
    const response = await generateAvatarImage(prompt);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate avatar' });
  }
}
```
