"use client";

import StoryHeader from './StoryHeader';
import StoryContent from './StoryContent';

type TitleAndChoicesContentProps = {
  title: string;
  problemDescription: string;
  storyId: string;
};

export const TitleAndChoicesContent = ({
  title,
  problemDescription,
  storyId,
}: TitleAndChoicesContentProps) => {
  return (
    <div className="mt-6">
      <StoryHeader title={title} problemDescription={problemDescription} />
      <StoryContent storyId={storyId} />
    </div>
  );
};

export default TitleAndChoicesContent; 