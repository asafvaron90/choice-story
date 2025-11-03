# User API

This API provides endpoints for managing users and their related data (kids, etc.) in the Choice Story application.

## Endpoints

### User Management

#### `GET /api/user?uid={userId}`

Fetches a user by their Firebase UID.

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "string",
    "displayName": "string",
    "email": "string",
    "photoURL": "string",
    "phoneNumber": "string",
    "metadata": {},
    "createAt": "date",
    "lastUpdated": "date"
  }
}
```

#### `POST /api/user`

Creates or updates a user.

**Request Body:**
```json
{
  "uid": "string",
  "displayName": "string (optional)",
  "email": "string",
  "photoURL": "string (optional)",
  "phoneNumber": "string (optional)",
  "metadata": "object (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "string",
    "displayName": "string",
    "email": "string",
    "photoURL": "string",
    "phoneNumber": "string",
    "metadata": {},
    "createAt": "date",
    "lastUpdated": "date"
  },
  "action": "created|updated"
}
```

#### `PATCH /api/user`

Updates an existing user.

**Request Body:**
```json
{
  "uid": "string",
  "displayName": "string (optional)",
  "photoURL": "string (optional)",
  "phoneNumber": "string (optional)",
  "metadata": "object (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "string",
    "displayName": "string",
    "email": "string",
    "photoURL": "string",
    "phoneNumber": "string",
    "metadata": {},
    "createAt": "date",
    "lastUpdated": "date"
  }
}
```

#### `GET /api/user/me`

Fetches the currently authenticated user and ensures they exist in the database.

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "string",
    "displayName": "string",
    "email": "string",
    "photoURL": "string",
    "phoneNumber": "string",
    "metadata": {},
    "createAt": "date",
    "lastUpdated": "date"
  },
  "isNewUser": "boolean"
}
```

### Kid Management

#### `GET /api/user/kids?userId={userId}`

Fetches all kids for a user.

**Response:**
```json
{
  "success": true,
  "kids": [
    {
      "id": "string",
      "name": "string",
      "age": "number",
      "gender": "string",
      "avatarUrl": "string",
      "storiesCount": "number",
      "imageAnalysis": "object"
    }
  ]
}
```

#### `GET /api/user/kid?userId={userId}&kidId={kidId}`

Fetches a specific kid by ID.

**Response:**
```json
{
  "success": true,
  "kid": {
    "id": "string",
    "name": "string",
    "age": "number",
    "gender": "string",
    "avatarUrl": "string",
    "storiesCount": "number",
    "imageAnalysis": "object"
  }
}
```

#### `POST /api/user/kid`

Creates or updates a kid.

**Request Body:**
```json
{
  "userId": "string",
  "kid": {
    "id": "string (optional, empty for create)",
    "name": "string",
    "age": "number",
    "gender": "string",
    "imageAnalysis": "object (optional)"
  },
  "avatarUrl": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "kidId": "string",
  "action": "created|updated"
}
```

#### `DELETE /api/user/kid?userId={userId}&kidId={kidId}`

Deletes a kid.

**Response:**
```json
{
  "success": true,
  "message": "Kid deleted successfully"
}
```

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