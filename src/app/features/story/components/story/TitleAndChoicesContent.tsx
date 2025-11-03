"use client";

import StoryHeader from './StoryHeader';
import StoryContent from './StoryContent';
import { StoryPage } from '@/models';

type TitleAndChoicesContentProps = {
  title: string;
  problemDescription: string;
  coverPage: StoryPage;
  goodChoicePage: StoryPage;
  badChoicePage: StoryPage;
};

export const TitleAndChoicesContent = ({
  title,
  problemDescription,
  coverPage,
  goodChoicePage,
  badChoicePage
}: TitleAndChoicesContentProps) => {

  return (
    <>
      {/* Story Header */}
      <StoryHeader 
        title={title} 
        problemDescription={problemDescription} 
      />

      {/* Story Content with Cover and Choices */}
      <StoryContent 
        coverPage={coverPage}
        goodChoicePage={goodChoicePage}
        badChoicePage={badChoicePage}
      />
    </>
  );
};

export default TitleAndChoicesContent; 