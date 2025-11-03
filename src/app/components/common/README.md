# Image Generation Components

This directory contains unified, reusable components for image generation throughout the application.

## Components

### 1. `ImageGenerationComponent`
The base component that handles all image generation with loading states, error handling, and retry functionality.

**Props:**
- `userId: string` - User ID for the request
- `kidDetails: KidDetails` - Kid details for personalization
- `prompt: string` - Image generation prompt
- `outputCount?: number` - Number of images to generate (default: 1)
- `parameters?: object` - Additional generation parameters
- `onSuccess?: (images: string[]) => void` - Success callback
- `onError?: (error: string) => void` - Error callback
- `showToast?: boolean` - Show toast notifications (default: true)
- `autoGenerate?: boolean` - Auto-generate on mount (default: false)
- `onImageSelect?: (imageUrl: string) => void` - Image selection callback
- `selectedImageUrl?: string` - Currently selected image
- `disabled?: boolean` - Disable the component
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
<ImageGenerationComponent
  userId={currentUser.uid}
  kidDetails={kidDetails}
  prompt="A magical forest with talking animals"
  outputCount={2}
  onImageSelect={(imageUrl) => setSelectedImage(imageUrl)}
  selectedImageUrl={selectedImage}
  title="Generate Story Image"
  description="Create an image for your story"
/>
```

### 2. `StoryPageImageGenerator`
Specialized component for generating images for story pages. Works for all page types including cover pages.

**Props:**
- `userId: string`
- `kidDetails: KidDetails`
- `page: StoryPage` - The story page to generate image for
- `storyId: string` - Story ID for Firestore updates
- `onImageSelect: (imageUrl: string) => void`
- `selectedImageUrl?: string`
- `disabled?: boolean`
- `autoGenerate?: boolean`
- `useAIBots?: boolean` - Use AI bots for generation

**Key Features:**
- Handles all page types including `COVER`, `NORMAL`, `GOOD_CHOICE`, `BAD_CHOICE`, etc.
- For cover pages: Generates 3 image options and uses fallback `"cover page: {pageNum}"` if no `storyText`
- For other pages: Generates 1 image and uses fallback `"{pageType} page: page {pageNum}"` if no `storyText`
- Uses combined `generateImagePromptAndImage` method
- Automatically updates Firestore with selected image

**Usage:**
```tsx
// For a cover page
<StoryPageImageGenerator
  userId={currentUser.uid}
  kidDetails={kidDetails}
  storyId={story.id}
  page={coverPage} // PageType.COVER
  onImageSelect={(imageUrl) => updatePageImage(pageType, imageUrl)}
  selectedImageUrl={coverPage.selectedImageUrl}
  useAIBots={true}
/>

// For a regular page
<StoryPageImageGenerator
  userId={currentUser.uid}
  kidDetails={kidDetails}
  storyId={story.id}
  page={storyPage}
  onImageSelect={(imageUrl) => updatePageImage(pageType, imageUrl)}
  selectedImageUrl={storyPage.selectedImageUrl}
  useAIBots={true}
/>
```

### 3. `CoverImageGenerator`
Specialized component for generating cover images for stories. Now uses the same combined generation method as all other pages.

**Props:**
- `userId: string` - User ID for the request
- `kidDetails: KidDetails` - Kid details for personalization
- `storyId: string` - Story ID (required for Firestore updates)
- `storyTitle: string` - Title of the story
- `problemDescription?: string` - Optional description of the story problem/theme. If not provided, uses "cover page: {title}" as fallback
- `pageNum?: number` - Page number for the cover (default: 0)
- `updatePath?: string` - Optional Firestore update path
- `onImageSelect: (imageUrl: string) => void` - Image selection callback
- `selectedImageUrl?: string` - Currently selected image
- `disabled?: boolean` - Disable the component
- `autoGenerate?: boolean` - Auto-generate on mount
- `className?: string` - Additional CSS classes
- `useAIBots?: boolean` - Use AI bots for generation (default: false)
- `onError?: (error: string) => void` - Error callback
- `onGenerationStart?: () => void` - Generation start callback

**Key Features:**
- Uses combined `generateImagePromptAndImage` method (same as other pages)
- AI automatically generates appropriate prompts based on title and description
- Generates 3 image options for selection
- Updates Firestore directly with selected image

**Usage:**
```tsx
// With full description
<CoverImageGenerator
  userId={currentUser.uid}
  kidDetails={kidDetails}
  storyId={story.id}
  storyTitle="The Magic Adventure"
  problemDescription="Learning to be brave"
  pageNum={0}
  onImageSelect={(imageUrl) => updateCoverImage(imageUrl)}
  selectedImageUrl={story.coverImageUrl}
  useAIBots={true}
/>

// Without description (uses fallback: "cover page: The Magic Adventure")
<CoverImageGenerator
  userId={currentUser.uid}
  kidDetails={kidDetails}
  storyId={story.id}
  storyTitle="The Magic Adventure"
  pageNum={0}
  onImageSelect={(imageUrl) => updateCoverImage(imageUrl)}
  selectedImageUrl={story.coverImageUrl}
  useAIBots={true}
/>
```

### 4. `AvatarImageGenerator`
Specialized component for generating avatar images.

**Props:**
- `userId: string`
- `kidDetails: KidDetails`
- `characteristics: string` - Kid's characteristics for avatar generation
- `onImageSelect: (imageUrl: string) => void`
- `selectedImageUrl?: string`
- `disabled?: boolean`
- `autoGenerate?: boolean`

**Usage:**
```tsx
<AvatarImageGenerator
  userId={currentUser.uid}
  kidDetails={kidDetails}
  characteristics="curious, adventurous, loves animals"
  onImageSelect={(imageUrl) => setSelectedAvatar(imageUrl)}
  selectedImageUrl={selectedAvatar}
/>
```

### 4. `CoverImageGenerator`
Specialized component for generating story cover images.

**Props:**
- `userId: string`
- `kidDetails: KidDetails`
- `storyTitle: string`
- `problemDescription: string`
- `customPrompt?: string` - Override default prompt
- `onImageSelect: (imageUrl: string) => void`
- `selectedImageUrl?: string`
- `disabled?: boolean`
- `autoGenerate?: boolean`

**Usage:**
```tsx
<CoverImageGenerator
  userId={currentUser.uid}
  kidDetails={kidDetails}
  storyTitle="The Magic Forest Adventure"
  problemDescription="A child learning to be brave"
  onImageSelect={(imageUrl) => setCoverImage(imageUrl)}
  selectedImageUrl={coverImage}
/>
```

## Features

### ✅ **Unified State Management**
- Loading states
- Error handling with retry buttons
- Success/error callbacks
- Component unmount safety

### ✅ **Consistent UI**
- Material Design components
- Responsive grid layouts
- Image selection with visual feedback
- Loading spinners and error states

### ✅ **Flexible Configuration**
- Auto-generation on mount
- Custom prompts and parameters
- Disabled states
- Custom styling

### ✅ **Type Safety**
- Full TypeScript support
- Proper prop validation
- Consistent interfaces

## Migration Guide

### Before (Old Way):
```tsx
// Multiple hooks and complex state management
const { generateImage, isGenerating, error } = useStoryImages({...});
const { handleGenerateImage } = useChoiceImageGeneration({...});

// Manual error handling and loading states
{isGenerating && <LoadingSpinner />}
{error && <ErrorMessage error={error} />}
<Button onClick={handleGenerate} disabled={isGenerating}>
  Generate Image
</Button>
```

### After (New Way):
```tsx
// Single component with all functionality
<StoryPageImageGenerator
  userId={currentUser.uid}
  kidDetails={kidDetails}
  page={storyPage}
  onImageSelect={(imageUrl) => updatePageImage(pageType, imageUrl)}
  selectedImageUrl={storyPage.selectedImageUrl}
/>
```

## Benefits

1. **Reduced Code Duplication** - No more repeated image generation logic
2. **Consistent UX** - Same loading states and error handling everywhere
3. **Easy Maintenance** - Update one component to fix issues everywhere
4. **Better Testing** - Test one component instead of multiple hooks
5. **Type Safety** - Full TypeScript support with proper interfaces
6. **Accessibility** - Built-in accessibility features
7. **Responsive Design** - Works on all screen sizes

## Examples

See `src/app/components/examples/ImageGenerationExample.tsx` for complete usage examples.
