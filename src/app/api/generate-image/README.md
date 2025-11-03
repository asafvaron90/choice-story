# Generate Image API

This API generates images using OpenAI's DALL-E models and automatically uploads them to Firebase Storage to prevent expired URLs.

## Endpoint

`POST /api/generate-image`

## Features

- **Image Generation**: Uses OpenAI's DALL-E 2 or DALL-E 3 models
- **Firebase Storage Upload**: Automatically uploads generated images to Firebase Storage
- **Flexible Input**: Supports both JSON and multipart/form-data requests
- **User Organization**: Organizes images by user ID and folder path
- **Sentry Monitoring**: Includes comprehensive error tracking and performance monitoring

## Request Format

### JSON Request

```json
{
  "prompt": "A cute cartoon cat playing with a ball in a garden",
  "userId": "user123",
  "folderPath": "stories/generated",
  "config": {
    "model": "dall-e-3",
    "size": "1024x1024",
    "quality": "standard",
    "style": "vivid",
    "detail": "high"
  }
}
```

### Form Data Request

```
Content-Type: multipart/form-data

prompt: "A beautiful sunset over mountains"
userId: "user456"
folderPath: "stories/generated"
config: {"model":"dall-e-3","size":"1024x1024","quality":"hd","style":"natural","detail":"high"}
```

## Parameters

### Required
- `prompt` (string): The text description for image generation

### Optional
- `userId` (string): User ID for organizing storage paths (defaults to "anonymous")
- `folderPath` (string): Custom folder path for organizing images
- `config` (object): Image generation configuration

### Configuration Options

| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| `model` | string | `"dall-e-3"`, `"dall-e-2"` | `"dall-e-3"` | OpenAI model to use |
| `size` | string | `"1024x1024"`, `"1792x1024"`, `"1024x1792"` | `"1024x1024"` | Image dimensions |
| `quality` | string | `"standard"`, `"hd"` | `"standard"` | Image quality |
| `style` | string | `"vivid"`, `"natural"` | `"vivid"` | Image style |
| `detail` | string | `"auto"`, `"low"`, `"high"` | `"high"` | Detail level (DALL-E 3 only) |

## Response

### Success Response

```json
{
  "imageUrl": "https://firebasestorage.googleapis.com/v0/b/bucket/o/path/image.png?alt=media",
  "originalOpenAIUrl": "https://oaidalleapiprodscus.blob.core.windows.net/private/..."
}
```

### Error Response

```json
{
  "error": "Error message describing the issue"
}
```

## Storage Organization

Images are organized in Firebase Storage based on the provided parameters:

- **With userId and folderPath**: `{folderPath}/{filename}`
- **With userId only**: `users/{userId}/generated/{filename}`
- **Anonymous**: `temp/anonymous/generated/{filename}`

## Error Handling

The API includes comprehensive error handling for:

- Missing or invalid prompts
- OpenAI API errors
- Firebase Storage upload failures
- Invalid configuration parameters
- Network connectivity issues

## Monitoring

The API is instrumented with Sentry for:

- Performance monitoring
- Error tracking
- Request tracing
- Storage upload metrics

## Environment Variables

Required environment variables:

- `OPENAI_API_KEY`: OpenAI API key for image generation
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase Storage bucket name
- Firebase Admin SDK credentials (for server-side upload)

## Example Usage

### JavaScript/TypeScript

```typescript
const response = await fetch('/api/generate-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A magical forest with glowing mushrooms',
    userId: 'user123',
    folderPath: 'stories/fantasy',
    config: {
      model: 'dall-e-3',
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
      detail: 'high'
    }
  })
});

const data = await response.json();
console.log('Firebase Storage URL:', data.imageUrl);
```

### cURL

```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cute cartoon cat playing with a ball in a garden",
    "userId": "user123",
    "folderPath": "test/generated"
  }'
```

## Notes

- Generated images are automatically uploaded to Firebase Storage to prevent URL expiration
- The API returns both the Firebase Storage URL and the original OpenAI URL for reference
- Images are stored with public read access for easy retrieval
- The API includes fallback mechanisms for Firebase Storage upload failures 