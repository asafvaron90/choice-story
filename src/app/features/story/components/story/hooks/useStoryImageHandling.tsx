"use client";

import { useState, useCallback } from 'react';

export type ImageUrls = {
  cover: string;
  goodChoice: string;
  badChoice: string;
};

export type ImageErrors = {
  cover: boolean;
  goodChoice: boolean;
  badChoice: boolean;
};

export const useStoryImageHandling = (initialImageUrls?: Partial<ImageUrls>) => {
  // Default image URLs and error states
  const [imageUrls, setImageUrls] = useState<ImageUrls>({
    cover: initialImageUrls?.cover || '/illustrations/STORY_COVER.svg',
    goodChoice: initialImageUrls?.goodChoice || '/illustrations/STORY_GOOD_CHOICE.svg',
    badChoice: initialImageUrls?.badChoice || '/illustrations/STORY_BAD_CHOICE.svg'
  });
  
  const [imageErrors, setImageErrors] = useState<ImageErrors>({
    cover: false,
    goodChoice: false,
    badChoice: false
  });

  // Memoized handler for image loading errors
  const handleImageError = useCallback((imageType: 'cover' | 'goodChoice' | 'badChoice') => {
    console.error(`Failed to load ${imageType} image, using placeholder`);
    
    setImageErrors(prev => ({ ...prev, [imageType]: true }));
    
    const fallbackMap = {
      cover: 'STORY_COVER',
      goodChoice: 'STORY_GOOD_CHOICE',
      badChoice: 'STORY_BAD_CHOICE'
    };
    
    setImageUrls(prev => ({ 
      ...prev, 
      [imageType]: `/illustrations/${fallbackMap[imageType]}.svg` 
    }));
  }, []);

  // Method to update an image URL
  const updateImageUrl = useCallback((imageType: 'cover' | 'goodChoice' | 'badChoice', url: string) => {
    setImageUrls(prev => ({
      ...prev,
      [imageType]: url
    }));
    
    // Reset the error state when we update the URL
    setImageErrors(prev => ({
      ...prev,
      [imageType]: false
    }));
  }, []);

  return {
    imageUrls,
    imageErrors,
    handleImageError,
    updateImageUrl
  };
};

export default useStoryImageHandling; 