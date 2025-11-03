"use client";

import ChoiceCard from './ChoiceCard';
import StoryImage from './StoryImage';
import { StoryPage } from '@/models';

type StoryContentProps = {
  coverPage: StoryPage;
  goodChoicePage: StoryPage;
  badChoicePage: StoryPage;
};

export const StoryContent = ({
  coverPage,
  goodChoicePage,
  badChoicePage
}: StoryContentProps) => {
  if (!coverPage || !goodChoicePage || !badChoicePage) {
    console.warn('StoryContent: Missing required page props');
    return null;
  }

  return (
    <>
      {/* Cover Image */}
      <div className="mb-8">
        <StoryImage
          url={coverPage.selectedImageUrl ?? ""}
        />
      </div>

      {/* Choices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Good Choice */}
        <ChoiceCard
          storyPage={goodChoicePage}
          bgColorClass="bg-green-50"
          textColorClass="text-green-700"
        />

        {/* Bad Choice */}
        <ChoiceCard
          storyPage={badChoicePage}
          bgColorClass="bg-red-50"
          textColorClass="text-red-700"
        />
      </div>
    </>
  );
};

export default StoryContent; 