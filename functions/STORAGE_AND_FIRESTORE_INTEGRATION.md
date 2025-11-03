# Storage and Firestore Integration

All functions now save generated content to the correct locations in Firebase Storage and Firestore.

---

## Firestore Structure

### Story Text
**Path:** `/accounts/{accountId}/users/{userId}/stories/{storyId}`

```json
{
  "name": "John",
  "problemDescription": "...",
  "title": "John's Adventure",
  "age": 8,
  "advantages": "...",
  "disadvantages": "...",
  "text": "{...generated story JSON...}",
  "coverImageUrl": "https://storage.googleapis.com/.../cover.png",
  "pages": {
    "1": {
      "imageUrl": "https://storage.googleapis.com/.../page-1.png"
    },
    "2": {
      "imageUrl": "https://storage.googleapis.com/.../page-2.png"
    }
  },
  "status": "completed",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### User Avatar
**Path:** `/accounts/{accountId}/users/{userId}`

```json
{
  "avatarUrl": "https://storage.googleapis.com/.../avatar.png",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## Firebase Storage Structure

### Avatar Images
```
accounts/{accountId}/users/{userId}/avatars/avatar.png
```

### Story Cover Images
```
accounts/{accountId}/users/{userId}/stories/{storyId}/cover.png
```

### Story Page Images
```
accounts/{accountId}/users/{userId}/stories/{storyId}/pages/page-1.png
accounts/{accountId}/users/{userId}/stories/{storyId}/pages/page-2.png
...
```

---

## Updated Function Parameters

All functions now require `accountId`, `userId`, and `storyId` (where applicable):

### Text Generation

#### `generateStoryPagesText`
```typescript
{
  promptId: string,
  name: string,
  problemDescription: string,
  title: string,
  age: number,
  advantages: string,
  disadvantages: string,
  accountId: string,      // NEW
  userId: string,          // NEW
  storyId: string          // NEW
}
```

**Saves to:**
- Firestore: `/accounts/{accountId}/users/{userId}/stories/{storyId}`
- Field: `text` (the generated story JSON)

---

### Image Generation

#### `generateKidAvatarImage`
```typescript
{
  promptId: string,
  imageUrl: string,
  accountId: string,      // NEW
  userId: string          // NEW
}
```

**Saves to:**
- Storage: `accounts/{accountId}/users/{userId}/avatars/avatar.png`
- Firestore: `/accounts/{accountId}/users/{userId}` → field: `avatarUrl`

---

#### `generateStoryPageImage`
```typescript
{
  promptId: string,
  imagePrompt: string,
  accountId: string,      // NEW
  userId: string,          // NEW
  storyId: string,         // NEW
  pageNum: number          // NEW
}
```

**Saves to:**
- Storage: `accounts/{accountId}/users/{userId}/stories/{storyId}/pages/page-{pageNum}.png`
- Firestore: `/accounts/{accountId}/users/{userId}/stories/{storyId}` → field: `pages.{pageNum}.imageUrl`

---

#### `generateStoryCoverImage`
```typescript
{
  promptId: string,
  title: string,
  characterDescription: string,
  accountId: string,      // NEW
  userId: string,          // NEW
  storyId: string          // NEW
}
```

**Saves to:**
- Storage: `accounts/{accountId}/users/{userId}/stories/{storyId}/cover.png`
- Firestore: `/accounts/{accountId}/users/{userId}/stories/{storyId}` → field: `coverImageUrl`

---

## Usage Examples

### Generate Story Text and Save

```typescript
const result = await generateStoryPagesText({
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

// Story text is automatically saved to Firestore
// Path: /accounts/account_abc123/users/user_xyz789/stories/story_def456
```

### Generate Avatar and Save

```typescript
const result = await generateKidAvatarImage({
  promptId: "prompt_456",
  imageUrl: "https://example.com/kid-photo.jpg",
  accountId: "account_abc123",
  userId: "user_xyz789"
});

// Avatar is automatically saved to Storage and Firestore
// Storage: accounts/account_abc123/users/user_xyz789/avatars/avatar.png
// Firestore: /accounts/account_abc123/users/user_xyz789 → avatarUrl field
```

### Generate Story Page Image and Save

```typescript
const result = await generateStoryPageImage({
  promptId: "prompt_789",
  imagePrompt: "A bright, cheerful scene...",
  accountId: "account_abc123",
  userId: "user_xyz789",
  storyId: "story_def456",
  pageNum: 1
});

// Page image is automatically saved to Storage and Firestore
// Storage: accounts/account_abc123/users/user_xyz789/stories/story_def456/pages/page-1.png
// Firestore: /accounts/account_abc123/users/user_xyz789/stories/story_def456 → pages.1.imageUrl
```

---

## What Happens Behind the Scenes

1. **Generate Content** → Calls OpenAI API
2. **Save to Storage** → Uploads images to Firebase Storage
3. **Save to Firestore** → Updates Firestore with URLs and metadata
4. **Return to Client** → Returns success + public URLs

---

## Benefits

✅ **Organized Structure** - All content saved in logical hierarchy
✅ **Public URLs** - Images are publicly accessible via Storage URLs
✅ **Automatic Updates** - Firestore automatically updated with URLs
✅ **No Manual Save** - Everything handled by the functions
✅ **Proper Permissions** - Uses Firebase Admin SDK for secure access

---

## Notes

- All images are saved as PNG files
- Images are made publicly accessible via Storage rules
- Firestore uses `merge: true` to avoid overwriting existing data
- All operations include `updatedAt` timestamps
- Storage URLs are returned in the response for immediate use

