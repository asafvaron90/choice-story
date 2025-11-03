import { Story, PageType } from '@/models';

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