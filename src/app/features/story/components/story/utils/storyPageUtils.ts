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
 * Finds a page in the story based on page number and choice type
 * @param story The story to search in
 * @param page The page to find
 * @returns The index of the page in the story's pages array, or -1 if not found
 */
export const findPageIndex = (story: Story, page: StoryPage): number => {
  return story.pages.findIndex(p => 
    p.pageNum === page.pageNum &&       
    (p.pageType === PageType.GOOD && page.pageType === PageType.GOOD ||
      p.pageType === PageType.BAD && page.pageType === PageType.BAD ||
      p.pageType === PageType.NORMAL && (page.pageType === PageType.NORMAL || !page.pageType))
  );
};

/**
 * Determines the page type from a page's choice field
 * @param page The page to determine the type for
 * @returns The PageType value
 */
export const getPageTypeFromChoice = (page: StoryPage): PageType => {
  if (page.pageType) return page.pageType as PageType;
  
  if (page.pageType === PageType.GOOD) return PageType.GOOD;
  if (page.pageType === PageType.BAD) return PageType.BAD;
  return PageType.NORMAL;
};

/**
 * Creates a unique identifier for a page
 * @param page The page to create an ID for
 * @returns A string identifier in the format "pageNum-choice"
 */
export const createPageIdentifier = (page: StoryPage): string => {
  return `${page.pageNum}-${page.pageType || 'normal'}`;
};

/**
 * Extracts the story choices (good/bad) from a story
 * @param story The story to extract choices from
 * @returns An object containing the good and bad choice pages or null
 */
export const extractStoryChoices = (story: Story | null) => {
  if (!story) return null;
  
  // Find good and bad choices from the normalized story
  const goodChoice = story.pages.find(choice => choice.pageType === PageType.GOOD_CHOICE);
  const badChoice = story.pages.find(choice => choice.pageType === PageType.BAD_CHOICE);

  // Get page content
  const goodPage = story.pages.find(page => page.pageType === PageType.GOOD);
  const badPage = story.pages.find(page => page.pageType === PageType.BAD);
  
  return {
    goodChoice,
    badChoice,
    goodPage,
    badPage
  };
}; 