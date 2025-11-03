# Story API

This API provides endpoints to manage stories in the application.

## Endpoints

### `POST /api/story`

Creates a new story or updates an existing one if an ID is provided.

#### Request Body

```json
{
  "id": "optional-existing-story-id", // Optional for create, required for update
  "userId": "user-id",
  "kidId": "kid-id",
  "title": "Story Title",
  "problemDescription": "Description of the problem in the story",
  "status": "generating", // Optional, defaults to "generating"
  "coverImage": "cover-image-url",
  "pages": [
    {
      "pageType": "cover", // One of: "cover", "normal", "good", "bad", "good_choice", "bad_choice"
      "storyText": "Text content for the page",
      "pageNum": 1,
      "imageUrl": "optional-image-url", // Optional
      "imagePrompt": "optional-text-for-image-generation" // Optional
    }
    // ... more pages
  ]
}
```

#### Response

**Success (201 Created or 200 OK)**

```json
{
  "success": true,
  "story": {
    // Full story object with ID
  },
  "action": "created" // or "updated"
}
```

**Error (400, 403, 500)**

```json
{
  "success": false,
  "error": "Error type",
  "message": "Error message"
}
```

### `GET /api/story`

Gets stories based on query parameters.

#### Query Parameters

- `storyId`: Get a specific story by ID
- `userId`: Get stories for a specific user
- `kidId`: Get stories for a specific kid (must be used with userId)

#### Response

**Success (200 OK)**

For a single story:

```json
{
  "success": true,
  "story": {
    // Story object
  }
}
```

For multiple stories:

```json
{
  "success": true,
  "stories": [
    // Array of story objects
  ],
  "storiesByKid": [
    // Optional, grouped by kid when fetching all user stories
    {
      "kidId": "kid-id",
      "kidName": "Kid Name",
      "stories": [
        // Stories for this kid
      ]
    }
  ]
}
```

**Error (400, 403, 404, 500)**

```json
{
  "success": false,
  "error": "Error type",
  "message": "Error message"
}
```

### `PATCH /api/story`

Partially updates an existing story.

#### Query Parameters

- `storyId`: ID of the story to update

#### Request Body

Include only the fields you want to update.

```json
{
  "title": "Updated Title",
  "status": "complete"
  // Any other fields to update
}
```

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "story": {
    // Updated story object
  }
}
```

**Error (400, 403, 404, 500)**

```json
{
  "success": false,
  "error": "Error type",
  "message": "Error message"
}
```

### `DELETE /api/story`

Deletes a story.

#### Query Parameters

- `userId`: ID of the user who owns the story
- `kidId`: ID of the kid associated with the story
- `storyId`: ID of the story to delete

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "Story deleted successfully"
}
```

**Error (400, 403, 500)**

```json
{
  "success": false,
  "error": "Error type",
  "message": "Error message"
}
```

## Authorization

All endpoints require authentication with a valid Firebase auth token in the `Authorization` header:

```
Authorization: Bearer <firebase-auth-token>
```

Users can only access and modify their own stories.

## Implementation Details

- All endpoints use the server-side Firestore service (`firestoreServerService`)
- The POST endpoint handles image uploads through the `StorageService`
- Input validation is performed using Zod schemas
- When a story is deleted, its associated images are also deleted from storage
- Story creation involves a two-step process:
  1. Create an initial story with 'generating' status to obtain an ID
  2. Upload images to cloud storage
  3. Update the story with image URLs and 'complete' status
- Error handling includes cleanup of partially created resources if an error occurs during creation

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error message (optional)",
  "details": "Validation errors (for input validation failures)"
}
```

HTTP status codes are used appropriately:
- 200/201 for successful operations
- 400 for invalid input
- 401 for unauthorized access
- 404 for not found resources
- 500 for server errors 