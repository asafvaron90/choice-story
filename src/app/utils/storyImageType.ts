// TODO: delete this file and use the models/storyImageType.ts file instead

/**
 * Enum representing the different types of storage properties in the application.
 * This helps standardize paths across the app for firebase storage.
 */
export enum StoryImageType {
  // Kid-related
  KID_AVATAR = 'avatar',
  KID_IMAGE = 'image',
  
  // Story-related
  STORY_COVER = 'cover',
  STORY_GOOD_CHOICE = 'good-choice',
  STORY_BAD_CHOICE = 'bad-choice',
  
  // Page-related
  STORY_NORMAL_PAGE = 'normal-page',
  STORY_GOOD_PAGE = 'good-page',
  STORY_BAD_PAGE = 'bad-page',
  
  // Temporary storage
  TEMP = 'temp'
}

// Note: Use the utility functions in firebaseStorage.ts for all image path 
// and URL operations (getStoryImagePath, getStoryImageUrl, getKidAvatarPath, etc.)
