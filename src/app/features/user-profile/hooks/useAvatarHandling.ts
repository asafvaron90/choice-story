import { useState, useEffect } from 'react';
import { KidDetails } from '@/models';
import { getPlaceholderAvatar } from '../utils/avatar-utils';

interface UseAvatarHandlingProps {
  kid: KidDetails;
}

interface UseAvatarHandlingReturn {
  imageError: boolean;
  setImageError: (value: boolean) => void;
  shouldUseDefaultAvatar: boolean;
  displayAvatarUrl: string;
}

/**
 * Custom hook to handle avatar display and error handling
 */
export const useAvatarHandling = ({ kid }: UseAvatarHandlingProps): UseAvatarHandlingReturn => {
  const [imageError, setImageError] = useState(false);
  
  // Reset image error when kid changes
  useEffect(() => {
    setImageError(false);
  }, [kid.id, kid.avatarUrl, kid.kidSelectedAvatar]);
  
  // Get the preferred avatar URL (prioritize selected avatar over original)
  const preferredAvatarUrl = kid.kidSelectedAvatar || kid.avatarUrl;
  
  // Determine if we should use default avatar
  const shouldUseDefaultAvatar = !preferredAvatarUrl || imageError;
  
  // Get the appropriate avatar URL
  const displayAvatarUrl = shouldUseDefaultAvatar
    ? getPlaceholderAvatar(kid.gender)
    : preferredAvatarUrl || '';
    
  return {
    imageError,
    setImageError,
    shouldUseDefaultAvatar,
    displayAvatarUrl
  };
}; 