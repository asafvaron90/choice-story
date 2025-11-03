"use client";

import { useState, useEffect } from 'react';
import ChoiceCard from './ChoiceCard';
import StoryImage from './StoryImage';
import { Story, PageType } from '@/models';
import { StoryApi } from '@/app/network/StoryApi';

interface StoryContentProps {
  storyId: string;
}

export const StoryContent = ({ storyId }: StoryContentProps) => {
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [_imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const fetchStory = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await StoryApi.getStoryById(storyId);
        
        if (!response.success) {
          setError(response.error);
          return;
        }
        
        if (!response.data) {
          setError('Failed to fetch story');
          return;
        }
        
        setStory(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStory();
  }, [storyId]);
  
  const onImageError = (imageType: 'cover' | 'goodChoice' | 'badChoice') => {
    setImageErrors(prev => ({ ...prev, [imageType]: true }));
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Error state
  if (error || !story) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Story</h3>
        <p className="text-red-600">{error || 'Story not found'}</p>
      </div>
    );
  }
  
  // Find good and bad choice pages if they exist
  const coverPage = story.pages.find(page => page.pageType === PageType.COVER);
  const goodChoicePage = story.pages.find(page => page.pageType === PageType.GOOD_CHOICE);
  const badChoicePage = story.pages.find(page => page.pageType === PageType.BAD_CHOICE);
  
  console.log('&&& coverPage', coverPage);
  return (
    <>
      {/* Cover Image */}
      <div className="mb-8">
        <StoryImage
          url={coverPage?.selectedImageUrl ?? ''}
          fallbackUrl="/illustrations/STORY_COVER.svg"
          alt="Story cover"
          onError={() => onImageError('cover')}
        />
      </div>

      {/* Choices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Good Choice */}
        <ChoiceCard
          title={goodChoicePage?.storyText || 'Missing Text'}
          content=""
          imageUrl={goodChoicePage?.selectedImageUrl || '/illustrations/STORY_GOOD_CHOICE.svg'}
          fallbackUrl="/illustrations/STORY_GOOD_CHOICE.svg"
          bgColorClass="bg-green-50"
          textColorClass="text-green-700"
          imageType="goodChoice"
          onImageError={onImageError}
        />

        {/* Bad Choice */}
        <ChoiceCard
          title={badChoicePage?.storyText || 'Missing Text'}
          content=""
          imageUrl={badChoicePage?.selectedImageUrl || '/illustrations/STORY_BAD_CHOICE.svg'}
          fallbackUrl="/illustrations/STORY_BAD_CHOICE.svg"
          bgColorClass="bg-red-50"
          textColorClass="text-red-700"
          imageType="badChoice"
          onImageError={onImageError}
        />
      </div>
    </>
  );
};

export default StoryContent; 