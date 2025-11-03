import React from 'react';
import { ImageGenerationComponent } from './ImageGenerationComponent';
import { KidDetails, PageType } from '@/models';

export interface CoverImageGeneratorProps {
  userId: string;
  kidDetails: KidDetails;
  storyId: string; // Now required - cover should be generated after story is created
  storyTitle: string;
  problemDescription?: string; // Optional - will use "cover page: {title}" if not provided
  pageNum?: number; // Page number for the cover (usually 0)
  updatePath?: string; // Optional update path for Firestore
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl?: string;
  disabled?: boolean;
  autoGenerate?: boolean;
  className?: string;
  useAIBots?: boolean; // Flag to use AI bots
  onError?: (error: string) => void;
  onGenerationStart?: () => void;
  environment?: 'development' | 'production'; // Environment for Firestore paths
}

export const CoverImageGenerator: React.FC<CoverImageGeneratorProps> = ({
  userId,
  kidDetails,
  storyId,
  storyTitle,
  problemDescription,
  pageNum = 0,
  updatePath,
  onImageSelect,
  selectedImageUrl,
  disabled = false,
  autoGenerate = false,
  className = "",
  useAIBots = false,
  onError,
  onGenerationStart,
  environment = 'development'
}) => {
  // Generate the cover page text for the AI
  // If no problemDescription, use a simple fallback format
  const coverPageText = problemDescription 
    ? `Title: ${storyTitle}\nDescription: ${problemDescription}`
    : `cover page: ${storyTitle}`;

  console.log('[CoverImageGenerator] Generated coverPageText:', {
    storyTitle,
    hasProblemDescription: !!problemDescription,
    coverPageText,
    storyId,
    environment
  });

  // Generate updatePath if not provided
  const getUpdatePath = (): string => {
    if (updatePath) return updatePath;
    
    const storiesCollection = `stories_gen_${environment}`;
    const fieldPath = `pages/${pageNum}/selectedImageUrl`;
    return `${storiesCollection}/${storyId}/${fieldPath}`;
  };

  return (
    <ImageGenerationComponent
      userId={userId}
      kidDetails={kidDetails}
      storyId={storyId}
      prompt="" // Empty prompt - AI will generate it
      pageType={PageType.COVER}
      pageText={coverPageText} // Pass cover text for AI to generate prompt
      pageNum={pageNum} // Pass page number
      outputCount={3}
      updatePath={getUpdatePath()}
      parameters={{
        size: "1024x1024",
        style: "vivid"
      }}
      onImageSelect={onImageSelect}
      selectedImageUrl={selectedImageUrl}
      disabled={disabled}
      autoGenerate={autoGenerate}
      className={className}
      title="Generate Cover Image"
      description={problemDescription 
        ? `Create cover images for "${storyTitle}" - a story about ${problemDescription}`
        : `Create cover images for "${storyTitle}"`
      }
      buttonText={`Generate Cover Images${useAIBots ? " (AI Bot)" : ""}`}
      showGeneratedImages={true}
      useAIBots={useAIBots}
      useCombinedGeneration={true} // Use the same combined generation method as other pages
      environment={environment} // Pass environment
      onError={onError}
      onGenerationStart={onGenerationStart}
    />
  );
};

export default CoverImageGenerator;
