"use client";

import { memo } from 'react';
import GeneratedPages from './GeneratedPages';
import SaveButtons from './SaveButtons';
import { PageType, StoryPage } from '@/models';

type PagesContentProps = {
  // Generation props
  onGeneratePages: (pageType?: PageType) => void;
  generating: boolean;
  _generationError: string | null;
  hasExistingPages: boolean;
  generatingCategories?: {
    [key in PageType]?: boolean;
  };
  generationErrors?: {
    [key in PageType]?: string;
  };
  
  // Content props
  generatedPages: StoryPage[];
  onRegenerateText: (page: StoryPage) => void;
  onRegenerateImage: (page: StoryPage) => void;
  onSaveText: (page: StoryPage) => void;
  onSaveImage: (page: StoryPage) => void;
  onDeletePage: (page: StoryPage) => void;
  regeneratingTextPage: StoryPage | null;
  regeneratingImagePage: StoryPage | null;
  pagesWithNewText: Set<string>;
  pagesWithNewImage: Set<string>;
  
  // Action props
  onSavePages: () => void;
  onReturnToDashboard: () => void;
  savingStory: boolean;
};

const PagesContent = ({
  // Destructure all props in a single object
  onGeneratePages,
  generating,
  _generationError,
  hasExistingPages,
  generatingCategories = {},
  generationErrors = {},
  generatedPages,
  onRegenerateText,
  onRegenerateImage,
  onSaveText,
  onSaveImage,
  onDeletePage,
  regeneratingTextPage,
  regeneratingImagePage,
  pagesWithNewText,
  pagesWithNewImage,
  onSavePages,
  onReturnToDashboard,
  savingStory
}: PagesContentProps) => {
  const hasGeneratedPages = generatedPages.length > 0;
  
  return (
    <>
      <GeneratedPages
        pages={generatedPages}
        onRegenerateText={onRegenerateText}
        onRegenerateImage={onRegenerateImage}
        onSaveText={onSaveText}
        onSaveImage={onSaveImage}
        onDeletePage={onDeletePage}
        regeneratingTextPage={regeneratingTextPage}
        regeneratingImagePage={regeneratingImagePage}
        pagesWithNewText={pagesWithNewText}
        pagesWithNewImage={pagesWithNewImage}
        onGeneratePages={onGeneratePages}
        _generating={generating}
        generatingCategories={generatingCategories}
        generationErrors={generationErrors}
      />
      
      <SaveButtons 
        onSave={onSavePages}
        onReturn={onReturnToDashboard}
        saving={savingStory}
        hasGeneratedPages={hasGeneratedPages}
        hasExistingPages={hasExistingPages}
      />
    </>
  );
};

export default memo(PagesContent); 