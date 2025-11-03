# Kids API

This directory contains API endpoints for managing kids (children) in the application.

## Endpoints

### GET `/api/user/kids`

Retrieves all kids for a specific user.

**Query Parameters:**
- `userId` (required): The ID of the user whose kids to retrieve

**Response:**
```json
{
  "success": true,
  "kids": [
    {
      "id": "kid-id-1",
      "name": "Kid Name",
      "age": 8,
      "gender": "male",
      "avatarUrl": "/path/to/avatar.png",
      "storiesCount": 3,
      "imageAnalysis": "optional analysis text"
    },
    ...
  ]
}
```

### GET `/api/user/kids/[kidId]`

Retrieves a specific kid by ID.

**Query Parameters:**
- `userId` (required): The ID of the user who owns the kid

**Path Parameters:**
- `kidId`: The ID of the kid to retrieve

**Response:**
```json
{
  "success": true,
  "kid": {
    "id": "kid-id-1",
    "name": "Kid Name",
    "age": 8,
    "gender": "male",
    "avatarUrl": "/path/to/avatar.png",
    "storiesCount": 3,
    "imageAnalysis": "optional analysis text"
  }
}
```

### DELETE `/api/user/kids/[kidId]`

Deletes a specific kid by ID.

**Query Parameters:**
- `userId` (required): The ID of the user who owns the kid

**Path Parameters:**
- `kidId`: The ID of the kid to delete

**Response:**
```json
{
  "success": true,
  "message": "Kid deleted successfully"
}
```

### POST `/api/user/kids/create`

Creates or updates a kid.

**Request Body:**
```json
{
  "userId": "user-id-1",
  "kid": {
    "id": "kid-id-1",  // Optional for create, required for update
    "name": "Kid Name",
    "age": 8,
    "gender": "male",
    "avatarUrl": "/path/to/avatar.png",
    "imageAnalysis": "optional analysis text"
  }
}
```

**Response:**
```json
{
  "success": true,
  "kidId": "kid-id-1",
  "message": "Kid created successfully" // or "Kid updated successfully"
}
```

## Implementation Details

- All endpoints use the server-side Firestore service (`firestoreServerService`)
- Input validation is performed using Zod schemas
- The endpoints handle authentication and authorization checks 