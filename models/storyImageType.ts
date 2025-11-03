/**
 * Enum representing the different types of storage properties in the application.
 * This helps standardize paths across the app for firebase storage.
 */
// export enum StoryImageType {
//   // Kid-related
//   KID_AVATAR = 'avatar',
//   KID_IMAGE = 'image',
  
//   // Story-related
//   STORY_COVER = 'cover',
//   STORY_GOOD_CHOICE = 'good-choice',
//   STORY_BAD_CHOICE = 'bad-choice',
  
//   // Page-related
//   STORY_NORMAL_PAGE = 'normal-page',
//   STORY_GOOD_PAGE = 'good-page',
//   STORY_BAD_PAGE = 'bad-page',
  
//   // Temporary storage
//   TEMP = 'temp'
// }

/**
 * Converts a StoryPage type to a StoryImageType
 */
// export function getStoryImageType(pageType: PageType): StoryImageType {
//   switch (pageType) {
//     case PageType.GOOD:
//       return StoryImageType.STORY_GOOD_PAGE;
//     case PageType.BAD:
//       return StoryImageType.STORY_BAD_PAGE;
//     case PageType.NORMAL:
//       return StoryImageType.STORY_NORMAL_PAGE;
//     case PageType.COVER:
//       return StoryImageType.STORY_COVER;
//     case PageType.GOOD_CHOICE:
//       return StoryImageType.STORY_GOOD_CHOICE;
//     case PageType.BAD_CHOICE:
//       return StoryImageType.STORY_BAD_CHOICE;
//     default:
//       return StoryImageType.TEMP;
//   }
// }
// Note: Use the utility functions in firebaseStorage.ts for all image path 
// and URL operations (getStoryImagePath, getStoryImageUrl, getKidAvatarPath, etc.)

// Export a placeholder to make this a module
export const storyImageTypePlaceholder = 'placeholder';
