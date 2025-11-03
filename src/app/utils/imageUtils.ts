// Check if a URL is from Firebase Storage
export const isFirebaseStorageUrl = (url: string): boolean => {
  return url.includes('firebasestorage.googleapis.com') || 
         url.includes('storage.googleapis.com');
};

// Check if a URL is from Replicate
export const isReplicateUrl = (url: string): boolean => {
  return url.includes('replicate.delivery');
};

// Check if a URL can be safely used with Next.js Image component
export const canUseNextImage = (url: string): boolean => {
  // Firebase Storage URLs often have encoding issues with Next.js Image
  if (isFirebaseStorageUrl(url)) {
    return false;
  }
  
  // Replicate URLs can be used with Next.js Image but should be unoptimized
  if (isReplicateUrl(url)) {
    return true;
  }
  
  // Data URLs can't be optimized
  if (url.startsWith('data:')) {
    return false;
  }
  
  // Must be absolute URL or relative to public directory
  return url.startsWith('http') || url.startsWith('/');
};

// Get the original URL from a Next.js optimized URL
export const getOriginalUrl = (optimizedUrl: string): string => {
  if (optimizedUrl.includes('_next/image?url=')) {
    try {
      const urlParam = optimizedUrl.split('url=')[1]?.split('&')[0];
      if (urlParam) {
        return decodeURIComponent(urlParam);
      }
    } catch (error) {
      console.warn('Failed to extract original URL from optimized URL:', error);
    }
  }
  return optimizedUrl;
};

// Check if a URL should use unoptimized mode
export const shouldUseUnoptimized = (url: string): boolean => {
  return isFirebaseStorageUrl(url) || 
         isReplicateUrl(url) || 
         url.startsWith('data:');
}; 