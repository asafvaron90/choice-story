"use client";

import StoryImage from './StoryImage';
import { PageType, StoryPage } from '@/models';

type ChoiceCardProps = {
  storyPage: StoryPage;
  bgColorClass: string;
  textColorClass: string;
};

export const ChoiceCard = ({
  storyPage,
  bgColorClass,
  textColorClass
}: ChoiceCardProps) => {
  // Determine fallback image based on page type
  const getFallbackImage = (): string => {
    switch (storyPage.pageType) {
      case PageType.GOOD_CHOICE:
        return '/illustrations/STORY_GOOD_CHOICE.svg';
      case PageType.BAD_CHOICE:
        return '/illustrations/STORY_BAD_CHOICE.svg';
      default:
        return '/illustrations/STORY_PLACEHOLDER.svg';
    }
  };

  return (
    <div className={`${bgColorClass} rounded-lg shadow-md p-6`}>
      <h2 className={`text-2xl font-bold mb-4 ${textColorClass}`}>{storyPage.storyText}</h2>
      <p className="mb-4">{storyPage.storyText}</p>
      <StoryImage
        url={storyPage.selectedImageUrl || ""}
        fallbackUrl={getFallbackImage()}
        alt={`${storyPage.pageType === PageType.GOOD_CHOICE ? 'Good' : 'Bad'} choice image`}
      />
    </div>
  );
};

export default ChoiceCard; 