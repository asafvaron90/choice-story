import { Story, StoryPage } from '@/models';

/**
 * Finds a page in the story based on page number and page type
 * @param story The story to search in
 * @param page The page to find
 * @returns The index of the page in the story's pages array, or -1 if not found
 */
export const findPageIndex = (story: Story, page: StoryPage): number => {
  return story.pages.findIndex(p => 
    p.pageNum === page.pageNum && 
    p.pageType === page.pageType
  );
};

/**
 * Creates a unique identifier for a page
 * @param page The page to create an ID for
 * @returns A string identifier in the format "pageNum-pageType"
 */
export const createPageIdentifier = (page: StoryPage): string => {
  return `${page.pageNum}-${page.pageType}`;
}; 