# Hardcoded Prompt IDs

All OpenAI prompt IDs are now hardcoded in the functions for better security and easier management.

---

## 📁 Configuration File

**Location:** `functions/src/open-ai-agents.ts`

```typescript
export const OPENAI_AGENTS = {
  // Story Generation Agent
  STORY_PAGES_TEXT: 'pmpt_68c9805a3288819596598b4cfc8ba6e1077ae3f79a6fa02f',
  
  // Story Image Prompt Agent
  STORY_IMAGE_PROMPT: 'pmpt_68c9805a3288819596598b4cfc8ba6e1077ae3f79a6fa02f',
  
  // Image Generation Agents
  KID_AVATAR_IMAGE: 'pmpt_68c835fd608c81968d46482611d767b404863ae2f0e066d0',
  STORY_PAGE_IMAGE: 'pmpt_68c835fd608c81968d46482611d767b404863ae2f0e066d0',
  STORY_COVER_IMAGE: 'pmpt_68c835fd608c81968d46482611d767b404863ae2f0e066d0',
};
```

---

## ✅ What Changed

### Before:
```typescript
// Client had to pass promptId
await functionClientAPI.generateStoryPagesText({
  promptId: "pmpt_123",  // ❌ Client knows internal IDs
  name: "John",
  // ...
});
```

### After:
```typescript
// Prompt ID is hardcoded in the function
await functionClientAPI.generateStoryPagesText({
  name: "John",
  // ✅ No promptId needed!
});
```

---

## 🔧 Updated Functions

All functions now use hardcoded prompt IDs:

1. **`generateStoryPagesText`** → Uses `OPENAI_AGENTS.STORY_PAGES_TEXT`
2. **`generateStoryImagePrompt`** → Uses `OPENAI_AGENTS.STORY_IMAGE_PROMPT`
3. **`generateKidAvatarImage`** → Uses `OPENAI_AGENTS.KID_AVATAR_IMAGE`
4. **`generateStoryPageImage`** → Uses `OPENAI_AGENTS.STORY_PAGE_IMAGE`
5. **`generateStoryCoverImage`** → Uses `OPENAI_AGENTS.STORY_COVER_IMAGE`

---

## 📝 Updated Request Types

### Story Pages Text
```typescript
// Before
interface StoryPagesTextRequest {
  promptId: string;  // ❌ Removed
  name: string;
  // ...
}

// After
interface StoryPagesTextRequest {
  name: string;
  // ✅ No promptId
}
```

### Kid Avatar Image
```typescript
// Before
interface KidAvatarImageRequest {
  promptId: string;  // ❌ Removed
  imageUrl: string;
  // ...
}

// After
interface KidAvatarImageRequest {
  imageUrl: string;
  // ✅ No promptId
}
```

### Story Page Image
```typescript
// Before
interface StoryPageImageRequest {
  promptId: string;  // ❌ Removed
  imagePrompt: string;
  // ...
}

// After
interface StoryPageImageRequest {
  imagePrompt: string;
  // ✅ No promptId
}
```

### Story Cover Image
```typescript
// Before
interface StoryCoverImageRequest {
  promptId: string;  // ❌ Removed
  title: string;
  // ...
}

// After
interface StoryCoverImageRequest {
  title: string;
  // ✅ No promptId
}
```

---

## 🎯 Benefits

### 1. **Security**
- ✅ Prompt IDs are not exposed to the client
- ✅ Client cannot accidentally use wrong prompt IDs
- ✅ Centralized configuration in one place

### 2. **Easier Management**
- ✅ Update prompt IDs in one place
- ✅ No need to update client code when changing prompts
- ✅ Easier to test different prompts

### 3. **Cleaner API**
- ✅ Simpler function calls
- ✅ Fewer parameters to pass
- ✅ Less chance of errors

### 4. **Better Organization**
- ✅ All prompt IDs in one configuration file
- ✅ Easy to see which prompts are being used
- ✅ Easy to add new prompts

---

## 🔄 How to Update Prompt IDs

1. **Edit `functions/src/open-ai-agents.ts`**
   ```typescript
   export const OPENAI_AGENTS = {
     STORY_PAGES_TEXT: 'your-new-prompt-id',
     // ...
   };
   ```

2. **Redeploy Functions**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

3. **Done!** No client changes needed

---

## 📚 Usage Examples

### Generate Story (No promptId needed!)

```typescript
import { functionClientAPI } from '@/app/network/functions';

const result = await functionClientAPI.generateStoryPagesText({
  name: "John",
  problemDescription: "John doesn't want to go to school",
  title: "John's School Adventure",
  age: 8,
  advantages: "Making friends",
  disadvantages: "Missing out",
  accountId: "account-123",
  userId: "user-456",
  storyId: "story-789"
});
// ✅ No promptId needed!
```

### Generate Avatar (No promptId needed!)

```typescript
const result = await functionClientAPI.generateKidAvatarImage({
  imageUrl: "https://example.com/kid-photo.jpg",
  accountId: "account-123",
  userId: "user-456"
});
// ✅ No promptId needed!
```

---

## 🧪 Test Page

The test page at `/functions-test` has been updated:
- ✅ Removed all `promptId` input fields
- ✅ Forms are simpler and cleaner
- ✅ All functions still work the same

---

## 📝 Notes

- Prompt IDs are managed server-side only
- Clients never see or need to know about prompt IDs
- Easy to update prompts without redeploying clients
- Better security and cleaner architecture

