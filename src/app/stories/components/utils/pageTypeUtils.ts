import { Story, PageType, StoryPage } from '@/models';

/**
 * Checks if a story has existing content pages
 * @param story The story to check
 * @returns boolean indicating if the story has existing content pages
 */
export const hasExistingPages = (story: Story | null): boolean => {
  if (!story) return false;
  
  // Only consider pages that are not the initial choice pages (which have pageNum 1 and 2)
  return story.pages && story.pages.some(page => 
    page.pageType === PageType.NORMAL || 
    (page.pageType === PageType.GOOD && page.pageNum > 2) || 
    (page.pageType === PageType.BAD && page.pageNum > 2)
  );
};

/**
 * Gets the page type from a story page
 * @param page The page to get the type for
 * @returns The PageType value
 */
export const getPageTypeFromChoice = (page: StoryPage): PageType => {
  return page.pageType;
}; 