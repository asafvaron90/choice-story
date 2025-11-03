import React from 'react';
import { ImageGenerationComponent } from './ImageGenerationComponent';
import { KidDetails } from '@/models';

export interface AvatarImageGeneratorProps {
  userId: string;
  kidDetails: KidDetails;
  characteristics: string;
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl?: string;
  disabled?: boolean;
  autoGenerate?: boolean;
  className?: string;
}

export const AvatarImageGenerator: React.FC<AvatarImageGeneratorProps> = ({
  userId,
  kidDetails,
  characteristics,
  onImageSelect,
  selectedImageUrl,
  disabled = false,
  autoGenerate = false,
  className = ""
}) => {
  return (
    <ImageGenerationComponent
      userId={userId}
      kidDetails={kidDetails}
      storyId="" // Avatar generation is not associated with a specific story
      prompt={`Generate avatar image for ${kidDetails.name || 'child'}, a ${kidDetails.age}-year-old ${kidDetails.gender}. Characteristics: ${characteristics}`}
      outputCount={2}
      parameters={{
        size: "1024x1024",
        style: "vivid"
      }}
      onImageSelect={onImageSelect}
      selectedImageUrl={selectedImageUrl}
      disabled={disabled}
      autoGenerate={autoGenerate}
      className={className}
      title="Generate Avatar"
      description={`Create avatar images for ${kidDetails.name || 'your child'} based on their characteristics`}
      buttonText="Generate Avatar Images"
      showGeneratedImages={true}
    />
  );
};

export default AvatarImageGenerator;
