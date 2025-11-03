# Image Generation API

This API endpoint generates images using AI models and automatically uploads them to Firebase Storage to prevent URL expiration.

## Endpoint

```
POST /api/story/generate-images
```

## Features

- **AI Image Generation**: Uses Replicate's SDXL models for high-quality image generation
- **Firebase Storage Upload**: Automatically uploads generated images to Firebase Storage
- **User Organization**: Organizes images by user ID and folder path
- **Sentry Monitoring**: Includes comprehensive error tracking and performance monitoring
- **Fallback Support**: Gracefully handles upload failures with original URLs as fallback

## Request Parameters

The request body should be a JSON object with the following properties:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | string | Yes | The text prompt describing the image you want to generate |
| outputCount | number | No | Number of images to generate (1-4, default: 1) |
| userId | string | No | User ID for organizing storage paths |
| kidId | string | No | Kid ID for tracking purposes |
| folderPath | string | No | Custom folder path for organizing images in Firebase Storage |
| referenceImageUrl | string | No | Reference image URL to base generation on |
| parameters | object | No | Additional parameters for image generation |

## Example Request

```javascript
const generateImage = async (prompt) => {
  try {
    const response = await fetch('/api/story/generate-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "A pixar style character of a 7-year-old boy with brown hair and blue eyes, full body shot, playing soccer in a park",
        outputCount: 2,
        userId: 'user123',
        folderPath: 'stories/soccer',
        kidId: 'kid456',
        parameters: {
          guidance_scale: 7.5,
          num_steps: 100
        }
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      // data.imageUrls contains Firebase Storage URLs (permanent)
      console.log('Generated image URLs:', data.imageUrls);
      // data.originalUrls contains the original Replicate URLs (for reference)
      console.log('Original URLs:', data.originalUrls);
      return data.imageUrls;
    } else {
      console.error('Image generation failed:', data.error);
      throw new Error(data.message || 'Image generation failed');
    }
  } catch (error) {
    console.error('Error generating images:', error);
    throw error;
  }
};
```

## Response

A successful response will return a JSON object with:

```json
{
  "success": true,
  "imageUrls": [
    "https://firebasestorage.googleapis.com/v0/b/bucket/o/path/image1.png?alt=media",
    "https://firebasestorage.googleapis.com/v0/b/bucket/o/path/image2.png?alt=media"
  ],
  "originalUrls": [
    "https://replicate.delivery/pbxt/example1.png",
    "https://replicate.delivery/pbxt/example2.png"
  ]
}
```

An error response will return:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error message",
  "details": [] // For validation errors
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
- Replicate API errors
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

- `REPLICATE_API_KEY`: Replicate API key for image generation
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase Storage bucket name
- Firebase Admin SDK credentials (for server-side upload)

## Notes

- **Permanent URLs**: Generated images are automatically uploaded to Firebase Storage, preventing URL expiration
- **Fallback Support**: If Firebase upload fails, the original Replicate URLs are returned as fallback
- **High Quality**: Images are generated at 1024x1024 resolution in PNG format using SDXL models
- **Reference Images**: Supports using reference images for style-consistent generation
- **Batch Processing**: Can generate multiple images in a single request (up to 4) 