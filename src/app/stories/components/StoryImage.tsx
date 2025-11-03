"use client";

import { useState } from 'react';
import ImageUrl from '@/app/components/common/ImageUrl';

type StoryImageProps = {
  url: string;
  fallbackUrl: string;
  alt: string;
  onError: () => void;
  priority?: boolean;
  sizes?: string;
};

export const StoryImage = ({ 
  url, 
  fallbackUrl, 
  alt, 
  onError,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
}: StoryImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Determine the actual image URL to use
  const imageUrl = imageError ? fallbackUrl : url;
  
  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    setLoading(false);
    onError();
  };
  
  // Handle image load completion
  const handleImageLoad = () => {
    setLoading(false);
  };
  
  return (
    <div className="aspect-[4/3] rounded-lg overflow-hidden relative">
      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-0">
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
      
      {/* ImageUrl component for optimized loading */}
      <div className="relative w-full h-full">
        <ImageUrl
          src={imageUrl}
          alt={alt}
          fill
          style={{ objectFit: 'cover' }}
          priority={priority}
          onError={handleImageError}
          onLoad={handleImageLoad}
          sizes={sizes}
          className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    </div>
  );
};

export default StoryImage; 