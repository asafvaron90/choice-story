import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { isFirebaseStorageUrl, isReplicateUrl, getOriginalUrl } from '@/app/utils/imageUtils';

/**
 * ImageUrl Component
 * 
 * Handles different types of image URLs:
 * - Firebase Storage URLs: Uses unoptimized mode to avoid encoding issues
 * - Replicate URLs: Uses unoptimized mode for better compatibility
 * - Next.js optimized URLs: Extracts original URL and uses it directly
 * - Local URLs: Uses standard Next.js Image optimization
 * - Data URLs: Uses unoptimized mode
 * 
 * Automatically detects URL type and applies appropriate handling.
 */
interface ImageUrlProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  onError?: () => void;
  onLoad?: () => void;
  loading?: 'lazy' | 'eager';
  style?: React.CSSProperties;
}

export const ImageUrl: React.FC<ImageUrlProps> = ({
  src,
  fallbackSrc,
  alt,
  className = "object-cover",
  fill = true,
  sizes,
  priority = false,
  onError,
  onLoad,
  loading = 'lazy',
  style,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [_isLoading, setIsLoading] = useState(true);
  
  // Determine the actual image URL to use
  const imageUrl = imageError && fallbackSrc ? fallbackSrc : src;
  
  // Get the original URL if this is a Next.js optimized URL
  const originalUrl = getOriginalUrl(imageUrl);
  
  // Check if this is a Firebase Storage URL
  const isFirebaseUrl = isFirebaseStorageUrl(originalUrl);
  
  // Check if this is a Replicate URL
  const isReplicateUrlCheck = isReplicateUrl(originalUrl);
  
  // Check if we can use Next.js Image component
  const canUseNextImage = originalUrl.startsWith('http') || originalUrl.startsWith('/');
  
  // Handle image error
  const handleImageError = () => {
    try {
      setImageError(true);
      setIsLoading(false);
      onError?.();
    } catch (error) {
      console.error('Error in handleImageError:', error);
    }
  };
  
  // Handle image load completion
  const handleImageLoad = () => {
    try {
      setIsLoading(false);
      onLoad?.();
    } catch (error) {
      console.error('Error in handleImageLoad:', error);
    }
  };
  
  // If we can't use Next.js Image, use a div with background image
  if (!canUseNextImage) {
    return (
      <div
        className={className}
        style={{
          backgroundImage: `url('${imageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          ...style
        }}
        role="img"
        aria-label={alt}
        onError={handleImageError}
        onLoad={handleImageLoad}
        {...props}
      />
    );
  }
  
  // Use Next.js Image for other URLs
  return (
    <Image
      src={originalUrl}
      alt={alt}
      className={className}
      fill={fill}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      onError={handleImageError}
      onLoad={handleImageLoad}
      unoptimized={isFirebaseUrl || isReplicateUrlCheck || originalUrl.startsWith('data:')}
      style={style}
      {...props}
    />
  );
};

export default ImageUrl; 