# Image Upload API

This API endpoint provides a simple way to upload images to Firebase Storage from your application.

## Endpoint

```
POST /api/upload_image
```

## Request Parameters

The request body should be a JSON object with the following properties:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| base64Data | string | Yes | Base64 encoded image data. Can include the data URI prefix (e.g., `data:image/png;base64,`) or just the raw base64 string. |
| userId | string | No | User ID for organizing storage paths. If not provided, "anonymous" will be used. |
| folderPath | string | No | Optional folder path to organize images in Storage. If provided, will be used instead of the default path structure. |
| fileName | string | No | Optional filename. If not provided, a unique name will be generated. |
| fileType | string | No | File type/extension (default: "png"). |

## Example Request

```javascript
const uploadImage = async (base64Image) => {
  try {
    const response = await fetch('/api/upload_image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data: base64Image, // Can include the data:image/... prefix
        userId: 'user123', // Optional
        folderPath: 'profiles/avatars', // Optional
        fileName: 'profile_pic.png', // Optional
        fileType: 'png' // Optional, defaults to png
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      // Use data.url to access the uploaded image
      console.log('Uploaded image URL:', data.url);
      return data.url;
    } else {
      console.error('Upload failed:', data.error);
      throw new Error(data.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
```

## Response

A successful response will return a JSON object with:

```json
{
  "success": true,
  "url": "https://firebasestorage.googleapis.com/...",
  "fileName": "image_name.png",
  "path": "path/to/file/in/firebase/storage.png"
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

## Storage Path Structure

If no `folderPath` is provided, the API will use the following path structure:

- For authenticated users: `users/{userId}/images/{fileName}`
- For anonymous users: `temp/anonymous/{fileName}`

If a `folderPath` is provided, the path will be: `{folderPath}/{fileName}` 