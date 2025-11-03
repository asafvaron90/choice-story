import React, { useState } from 'react';
import { ImageGenerationComponent } from '../common/ImageGenerationComponent';
import { StoryPageImageGenerator } from '../common/StoryPageImageGenerator';
import { AvatarImageGenerator } from '../common/AvatarImageGenerator';
import { CoverImageGenerator } from '../common/CoverImageGenerator';
import { KidDetails, PageType, StoryPage, Gender, Name, Language } from '@/models';

// Example usage of the new ImageGenerationComponent
export const ImageGenerationExample: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Mock data for demonstration
  const mockUser = { uid: 'user123' };
  const mockKid: KidDetails = {
    id: 'kid123',
    names: [{ firstName: 'Emma', lastName: 'Smith', languageCode: 'en' }],
    age: 8,
    gender: Gender.female,
    avatarUrl: 'https://example.com/avatar.jpg'
  };
  
  const mockStoryPage: StoryPage = {
    pageNum: 1,
    pageType: PageType.COVER,
    storyText: 'Once upon a time...',
    imagePrompt: 'A magical forest with talking animals',
    selectedImageUrl: null
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Image Generation Components Examples</h1>
      
      {/* Basic Image Generation */}
      <ImageGenerationComponent
        userId={mockUser.uid}
        kidDetails={mockKid}
        storyId="" // Example component - no specific story
        prompt="A beautiful sunset over mountains"
        outputCount={2}
        onImageSelect={setSelectedImage}
        selectedImageUrl={selectedImage || undefined}
        title="Custom Image Generation"
        description="Generate any image with a custom prompt"
        buttonText="Generate Custom Image"
      />

      {/* Story Page Image Generation */}
      <StoryPageImageGenerator
        userId={mockUser.uid}
        kidDetails={mockKid}
        storyId="example-story-id" // Example story ID
        page={mockStoryPage}
        onImageSelect={setSelectedImage}
        selectedImageUrl={selectedImage || undefined}
      />

      {/* Avatar Generation */}
      <AvatarImageGenerator
        userId={mockUser.uid}
        kidDetails={mockKid}
        characteristics="curious, adventurous, loves animals"
        onImageSelect={setSelectedImage}
        selectedImageUrl={selectedImage || undefined}
      />

      {/* Cover Image Generation */}
      <CoverImageGenerator
        userId={mockUser.uid}
        kidDetails={mockKid}
        storyId="example-story-id" // Required for combined generation
        storyTitle="The Magic Forest Adventure"
        problemDescription="A child learning to be brave"
        pageNum={0}
        onImageSelect={setSelectedImage}
        selectedImageUrl={selectedImage || undefined}
        useAIBots={true} // Enable AI bots for cover generation
      />

      {/* Auto-generate Example */}
      <ImageGenerationComponent
        userId={mockUser.uid}
        kidDetails={mockKid}
        storyId="" // Example component - no specific story
        prompt="A cute robot playing with toys"
        outputCount={1}
        autoGenerate={true}
        onImageSelect={setSelectedImage}
        selectedImageUrl={selectedImage || undefined}
        title="Auto-Generate Example"
        description="This image will generate automatically when the component mounts"
        showGeneratedImages={true}
      />
    </div>
  );
};

export default ImageGenerationExample;
