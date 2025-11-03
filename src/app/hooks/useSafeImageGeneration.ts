import { useCallback, useRef, useState } from 'react';
import { PageType, StoryPage } from '@/models';
import { useImageGeneration } from './useImageGeneration';
import { KidDetails } from '@/models';

interface UseSafeImageGenerationProps {
  userId: string;
  kidDetails: KidDetails;
  onUpdatePage: (pageType: PageType, imageUrl: string) => void;
}

export const useSafeImageGeneration = ({ 
  userId,
  kidDetails,
  onUpdatePage 
}: UseSafeImageGenerationProps) => {
  const [isGenerating, setIsGenerating] = useState<Record<PageType, boolean>>({
    [PageType.COVER]: false,
    [PageType.GOOD_CHOICE]: false,
    [PageType.BAD_CHOICE]: false,
    [PageType.GOOD]: false,
    [PageType.BAD]: false,
    [PageType.NORMAL]: false,
  });

  const ongoingRequests = useRef<Set<PageType>>(new Set());
  const isMounted = useRef(true);

  const { generateImage: generateImageBase, isGenerating: isGeneratingBase, error } = useImageGeneration({
    userId,
    kidDetails,
    storyId: '', // Safe image generation is used in various contexts, not tied to a specific story
    showToast: false, // We'll handle toasts manually
    onSuccess: (images) => {
      // This will be overridden per request
    },
    onError: (error) => {
      console.error("[useSafeImageGeneration] Image generation error:", error);
    }
  });

  const generateImage = useCallback(async (pageType: PageType, page: StoryPage) => {
    // Prevent duplicate requests
    if (ongoingRequests.current.has(pageType)) {
      console.log(`Generation already in progress for ${pageType}`);
      return [];
    }

    // Check if component is still mounted
    if (!isMounted.current) {
      console.log(`Component unmounted, skipping generation for ${pageType}`);
      return [];
    }

    try {
      console.log(`Starting image generation for ${pageType}`);
      ongoingRequests.current.add(pageType);
      setIsGenerating(prev => ({ ...prev, [pageType]: true }));

      const result = await generateImageBase({
        prompt: page.imagePrompt || `Generate image for ${pageType} page`,
        outputCount: 1
      });
      
      // Check if component is still mounted before updating state
      if (!isMounted.current) {
        console.log(`Component unmounted during generation for ${pageType}`);
        return result.data || [];
      }

      if (result.success && result.data && result.data.length > 0) {
        console.log(`Generated ${result.data.length} images for ${pageType}`);
        
        // Safely update the page with the first image
        try {
          onUpdatePage(pageType, result.data[0]);
        } catch (error) {
          console.error(`Error updating page for ${pageType}:`, error);
        }
        
        return result.data;
      }

      throw new Error(result.error || `No images generated for ${pageType}`);
    } catch (error) {
      console.error(`Error generating image for ${pageType}:`, error);
      throw error;
    } finally {
      ongoingRequests.current.delete(pageType);
      
      if (isMounted.current) {
        setIsGenerating(prev => ({ ...prev, [pageType]: false }));
      }
    }
  }, [generateImageBase, onUpdatePage]);

  const setSelectedImage = useCallback((pageType: PageType, url: string) => {
    try {
      console.log(`Setting selected image for ${pageType}:`, url);
      onUpdatePage(pageType, url);
    } catch (error) {
      console.error(`Error setting selected image for ${pageType}:`, error);
    }
  }, [onUpdatePage]);

  const cleanup = useCallback(() => {
    isMounted.current = false;
    ongoingRequests.current.clear();
  }, []);

  const isGeneratingAny = Object.values(isGenerating).some(Boolean) || isGeneratingBase;

  return {
    generateImage,
    setSelectedImage,
    isGenerating,
    isGeneratingAny,
    error,
    cleanup,
  };
}; 