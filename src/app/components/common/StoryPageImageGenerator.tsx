import React from 'react';
import { ImageGenerationComponent } from './ImageGenerationComponent';
import { PageType, StoryPage, KidDetails } from '@/models';

export interface StoryPageImageGeneratorProps {
  userId: string;
  kidDetails: KidDetails;
  page: StoryPage;
  storyId: string;
  storyTitle?: string; // Add story title for cover image generation
  problemDescription?: string; // Add problem description for cover image generation
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl?: string;
  disabled?: boolean;
  autoGenerate?: boolean;
  className?: string;
  onError?: (error: string) => void;
  onGenerationStart?: () => void;
  useAIBots?: boolean; // Flag to control whether to use new AI bot system
  onClose?: () => void; // Callback to close the generator
  isGeneratingImage?: boolean; // Track if image is currently generating
}

export const StoryPageImageGenerator: React.FC<StoryPageImageGeneratorProps> = ({
  userId,
  kidDetails,
  page,
  storyId,
  storyTitle,
  problemDescription,
  onImageSelect,
  selectedImageUrl,
  disabled = false,
  autoGenerate = false,
  className = "",
  onError,
  onGenerationStart,
  useAIBots = false,
  onClose,
  isGeneratingImage = false
}) => {
  const getPageTypeDisplayName = (pageType: PageType): string => {
    switch (pageType) {
      case PageType.COVER:
        return "Cover Image";
      case PageType.GOOD_CHOICE:
        return "Good Choice Image";
      case PageType.BAD_CHOICE:
        return "Bad Choice Image";
      case PageType.GOOD:
        return "Good Outcome Image";
      case PageType.BAD:
        return "Bad Outcome Image";
      case PageType.NORMAL:
        return "Story Page Image";
      default:
        return "Story Image";
    }
  };

  const getPageTypeDescription = (pageType: PageType): string => {
    switch (pageType) {
      case PageType.COVER:
        return "Generate an engaging cover image for your story";
      case PageType.GOOD_CHOICE:
        return "Generate an image showing the positive choice";
      case PageType.BAD_CHOICE:
        return "Generate an image showing the negative choice";
      case PageType.GOOD:
        return "Generate an image showing the good outcome";
      case PageType.BAD:
        return "Generate an image showing the bad outcome";
      case PageType.NORMAL:
        return "Generate an image for this story page";
      default:
        return "Generate an image for this page";
    }
  };

  // Generate the updatePath using the same logic as the API
  const getUpdatePath = (page: StoryPage): string => {
    // Use the same collection path logic as firestore.server.ts
    const environment = process.env.NODE_ENV || 'development';
    const storiesCollection = `stories_gen_${environment}`;
    const fieldPath = `pages/${page.pageNum}/selectedImageUrl`;
    const fullUpdatePath = `${storiesCollection}/${storyId}/${fieldPath}`;
    
    console.log('[StoryPageImageGenerator] Generated full updatePath:', {
      environment,
      storiesCollection,
      storyId,
      pageNum: page.pageNum,
      pageType: page.pageType,
      fieldPath,
      fullUpdatePath
    });
    return fullUpdatePath;
  };

  // Generate appropriate pageText based on page type
  const getPageText = (page: StoryPage, storyTitle?: string, problemDescription?: string): string => {
    // For cover pages, if no storyText, generate a fallback
    if (page.pageType === PageType.COVER) {
      return page.storyText || `cover page, story title: ${storyTitle}, problem: ${problemDescription}`;
    }
    // For all other pages, use the storyText or fallback
    return page.storyText || "";
  };

  const pageText = getPageText(page, storyTitle, problemDescription);

  console.log('[StoryPageImageGenerator] Generated pageText:', {
    pageType: page.pageType,
    pageNum: page.pageNum,
    hasStoryText: !!page.storyText,
    pageText,
    storyId
  });

  return (
    <ImageGenerationComponent
      userId={userId}
      kidDetails={kidDetails}
      prompt={page.imagePrompt || `Generate image for ${page.pageType} page`}
      pageType={page.pageType}
      outputCount={page.pageType === PageType.COVER ? 3 : 1} // Generate 3 options for cover, 1 for other pages
      storyId={storyId}
      updatePath={getUpdatePath(page)} // Pass the specific updatePath for this page
      pageText={pageText} // Pass the page text for combined generation (with fallback)
      pageNum={page.pageNum} // Pass the page number for combined generation
      parameters={{
        size: "1024x1024",
        style: "vivid"
      }}
      onImageSelect={onImageSelect}
      selectedImageUrl={selectedImageUrl}
      disabled={disabled}
      autoGenerate={autoGenerate}
      className={className}
      title={getPageTypeDisplayName(page.pageType)}
      description={getPageTypeDescription(page.pageType)}
      buttonText={`Generate ${getPageTypeDisplayName(page.pageType)}${useAIBots ? " (AI Bot)" : ""}`}
      showGeneratedImages={true}
      onError={onError}
      onGenerationStart={onGenerationStart}
      useAIBots={useAIBots}
      useCombinedGeneration={true} // Enable the new combined generation method
      onClose={onClose}
      isGeneratingImage={isGeneratingImage}
      hideCardWrapper={true} // Hide the card wrapper for cleaner UI
    />
  );
};

export default StoryPageImageGenerator;
