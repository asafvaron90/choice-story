"use client";

import { useState } from 'react';
import ImageUrl from '@/app/components/common/ImageUrl';
import { PageType, StoryPage } from '@/models';
import { useTranslation } from '@/app/hooks/useTranslation';

interface PageCardProps {
  page: StoryPage;
  _onRegenerateText?: (page: StoryPage) => void;
  _onRegenerateImage?: (page: StoryPage) => void;
  _onSaveText?: (page: StoryPage) => void;
  _onSaveImage?: (page: StoryPage) => void;
  onDeletePage?: (page: StoryPage) => void;
  isRegeneratingText?: boolean;
  isRegeneratingImage?: boolean;
  _hasNewText?: boolean;
  _hasNewImage?: boolean;
  _priority?: boolean;
}

export const PageCard = ({ 
  page, 
  _onRegenerateText, 
  _onRegenerateImage,
  _onSaveText,
  _onSaveImage,
  onDeletePage,
  isRegeneratingText: isRegeneratingTextProp,
  isRegeneratingImage: isRegeneratingImageProp,
  _hasNewText,
  _hasNewImage,
  _priority
}: PageCardProps) => {
  const { t } = useTranslation();
  
  const choiceColors = {
    [PageType.NORMAL]: 'bg-gray-50 text-blue-700',
    [PageType.GOOD]: 'bg-green-50 text-green-700',
    [PageType.BAD]: 'bg-red-50 text-red-700',
    [PageType.COVER]: 'bg-blue-50 text-blue-700',
    [PageType.GOOD_CHOICE]: 'bg-green-80 text-green-700',
    [PageType.BAD_CHOICE]: 'bg-red-80 text-red-700'
  };
  
  // Add a fallback in case the page type isn't in our map
  const colorClass = choiceColors[page.pageType as keyof typeof choiceColors] || 'bg-gray-50 text-gray-700';
  const [bgColor] = colorClass.split(' ');
  
  // Internal state management
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRegeneratingTextState, setIsRegeneratingText] = useState(false);
  const [isRegeneratingImageState, setIsRegeneratingImage] = useState(false);
  
  // Use prop values if provided, otherwise use local state
  const isRegeneratingText = isRegeneratingTextProp ?? isRegeneratingTextState;
  const isRegeneratingImage = isRegeneratingImageProp ?? isRegeneratingImageState;
  
  // Generate fallback image URL based on page type
  const getFallbackImageUrl = (): string => {
    // Use a generic placeholder without text labels
    return '/illustrations/STORY_PLACEHOLDER.svg';
  };
  
  const handleImageError = () => {
    console.error(`Failed to load image for page ${page.pageNum}, URL was: ${page.selectedImageUrl}`);
    setImageError(true);
    setImageLoading(false);
  };
  
  // Check if the image URL is valid before trying to load it
  const isValidImageUrl = (url?: string | null): boolean => {
    return !!url && url.trim() !== '' && url !== 'undefined' && url !== 'null';
  };
  
  // Calculate the actual image URL to use - ensure it's always a string
  const imageUrlToUse: string = imageError || !isValidImageUrl(page.selectedImageUrl)
    ? getFallbackImageUrl()
    : (page.selectedImageUrl || getFallbackImageUrl());
  
  // Determine if we should use next/image or a regular img tag
  // Next/Image requires absolute URLs or relative URLs for images within the public directory
  const _canUseNextImage = imageUrlToUse.startsWith('http') || imageUrlToUse.startsWith('/');

  // Handle image load completion
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Handlers with local state management
  const handleRegenerateText = async (page: StoryPage) => {
    if (!_onRegenerateText || isRegeneratingText) return;
    
    setIsRegeneratingText(true);
    try {
      await _onRegenerateText(page);
    } finally {
      setIsRegeneratingText(false);
    }
  };

  const handleRegenerateImage = async (page: StoryPage) => {
    if (!_onRegenerateImage || isRegeneratingImage) return;
    
    setIsRegeneratingImage(true);
    try {
      await _onRegenerateImage(page);
    } finally {
      setIsRegeneratingImage(false);
    }
  };
  
  const _getPageTypeLabel = (pageType: PageType): string => {
    switch (pageType) {
      case PageType.COVER:
        return t.createStory.choices.bookTitle;
      case PageType.NORMAL:
        return t.createStory.choices.title;
      case PageType.GOOD_CHOICE:
        return t.createStory.choices.goodChoice;
      case PageType.BAD_CHOICE:
        return t.createStory.choices.badChoice;
      case PageType.GOOD:
        return t.createStory.preview.title;
      case PageType.BAD:
        return t.createStory.preview.title;
      default:
        return String(pageType);
    }
  };
  
  return (
    <div className={`${bgColor} rounded-lg shadow-md p-4 relative`}>
      {/* Delete button in top-right corner */}
      {onDeletePage && (
        <div className="absolute top-2 right-2 z-10">
          {showDeleteConfirm ? (
            <div className="flex items-center bg-white p-1 rounded-md shadow-md">
              <span className="text-xs mr-1">{t.userCard.deleteConfirmation}</span>
              <button 
                onClick={() => onDeletePage(page)}
                className="text-red-600 hover:text-red-800 p-1"
                title={t.userCard.delete}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-600 hover:text-gray-800 p-1"
                title={t.createStory.preview.title}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="opacity-30 hover:opacity-100 text-red-600 p-1 rounded transition-opacity"
              title={t.userCard.delete}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      <div className="mb-3 text-sm relative group">
        {page.storyText}
        <div className="absolute top-0 right-0 flex">
          {_onRegenerateText && (
            <button 
              onClick={() => handleRegenerateText(page)}
              className={`${isRegeneratingText ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700 transition-all duration-200 shadow-sm ${isRegeneratingText ? 'cursor-not-allowed' : ''}`}
              title={t.createStory.choices.regenerateTitle}
              disabled={isRegeneratingText}
            >
              {isRegeneratingText ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      
      <div className="aspect-[4/3] rounded overflow-hidden relative group">
        {/* Loading skeleton */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24">
              <path 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.5" 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* Use ImageUrl for optimized images */}
        <div className="relative w-full h-full">
          <ImageUrl
            src={imageUrlToUse}
            alt={`Story illustration for page ${page.pageNum}`}
            fill
            className="object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        
        {/* Image action buttons */}
        <div className="absolute bottom-2 right-2 flex">
          {_onRegenerateImage && (
            <button 
              onClick={() => handleRegenerateImage(page)}
              className={`${isRegeneratingImage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-700 transition-all duration-200 shadow-sm ${isRegeneratingImage ? 'cursor-not-allowed' : ''}`}
              title="Regenerate image"
              disabled={isRegeneratingImage}
            >
              {isRegeneratingImage ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageCard; 