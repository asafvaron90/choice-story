import { useCallback, useState, useRef } from 'react';
import { toast } from "@/components/ui/use-toast";
import { PageType, StoryPage, KidDetails } from '@/models';
import { useImageGeneration } from './useImageGeneration';

interface UseStoryImagesProps {
  userId: string;
  kidDetails: KidDetails;
  pages: StoryPage[] | null;
  onUpdatePage: (pageType: PageType, imageUrl: string) => void;
}

interface GeneratingState {
  [PageType.COVER]: boolean;
  [PageType.GOOD_CHOICE]: boolean;
  [PageType.BAD_CHOICE]: boolean;
  [key: string]: boolean; // Add index signature for other PageType values
}

export const useStoryImages = ({ userId, kidDetails, pages, onUpdatePage }: UseStoryImagesProps) => {
  const [generatingState, setGeneratingState] = useState<GeneratingState>({
    [PageType.COVER]: false,
    [PageType.GOOD_CHOICE]: false,
    [PageType.BAD_CHOICE]: false
  });

  // Add refs to track ongoing requests and prevent race conditions
  const ongoingRequests = useRef<Set<PageType>>(new Set());
  const isMounted = useRef(true);

  const { generateImage: generateImageBase, isGenerating: isGeneratingBase, error } = useImageGeneration({
    userId,
    kidDetails,
    storyId: '', // Story images hook is used across different stories
    showToast: false, // We'll handle toasts manually
    onSuccess: (images) => {
      // This will be overridden per request
    },
    onError: (error) => {
      console.error("[useStoryImages] Image generation error:", error);
    }
  });

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    isMounted.current = false;
    ongoingRequests.current.clear();
  }, []);

  const generateImage = useCallback(async (pageType: PageType, page: StoryPage) => {
    // Prevent duplicate requests for the same page type
    if (ongoingRequests.current.has(pageType)) {
      console.log(`Generation already in progress for ${pageType}, skipping...`);
      return [];
    }

    // Check if component is still mounted
    if (!isMounted.current) {
      console.log(`Component unmounted, skipping generation for ${pageType}`);
      return [];
    }

    try {
      console.log('Generating image for page type:', pageType);
      
      // Add to ongoing requests
      ongoingRequests.current.add(pageType);
      
      setGeneratingState(prev => ({ ...prev, [pageType]: true }));
      
      const result = await generateImageBase({
        prompt: page.imagePrompt || `Generate image for ${pageType} page`,
        outputCount: 1
      });
      
      // Check if component is still mounted before updating state
      if (!isMounted.current) {
        console.log(`Component unmounted during generation for ${pageType}, skipping state update`);
        return result.data || [];
      }
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('Setting selected image:', result.data[0]);
        
        // Wrap state update in try-catch to handle potential DOM errors
        try {
          onUpdatePage(pageType, result.data[0]);
        } catch (error) {
          console.error(`Error updating page for ${pageType}:`, error);
          // Don't throw here, just log the error
        }
        
        return result.data;
      }
      throw new Error(result.error || 'No images were generated');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      console.error(`Image generation error for ${pageType}:`, error);
      
      // Only show toast if component is still mounted
      if (isMounted.current) {
        toast({
          title: `${pageType} Image Generation Failed`,
          description: errorMessage,
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      // Remove from ongoing requests
      ongoingRequests.current.delete(pageType);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setGeneratingState(prev => ({ ...prev, [pageType]: false }));
      }
    }
  }, [generateImageBase, onUpdatePage]);

  const setSelectedImage = useCallback((pageType: PageType, url: string) => {
    console.log('Setting selected image for page type:', pageType, 'URL:', url);
    
    // Wrap in try-catch to handle potential DOM errors
    try {
      onUpdatePage(pageType, url);
    } catch (error) {
      console.error(`Error setting selected image for ${pageType}:`, error);
    }
  }, [onUpdatePage]);

  const areAllImagesSelected = useCallback(() => {
    if (!pages) return false;
    
    const coverPage = pages.find(page => page.pageType === PageType.COVER);
    const goodChoicePage = pages.find(page => page.pageType === PageType.GOOD_CHOICE);
    const badChoicePage = pages.find(page => page.pageType === PageType.BAD_CHOICE);

    const hasAllImages = Boolean(
      coverPage?.selectedImageUrl && 
      goodChoicePage?.selectedImageUrl && 
      badChoicePage?.selectedImageUrl
    );

    console.log('Checking if all images are selected:', {
      cover: coverPage?.selectedImageUrl,
      goodChoice: goodChoicePage?.selectedImageUrl,
      badChoice: badChoicePage?.selectedImageUrl,
      hasAllImages
    });

    return hasAllImages;
  }, [pages]);

  const isAnyGenerating = Object.values(generatingState).some(Boolean) || isGeneratingBase;

  const isGenerating = useCallback((pageType: PageType) => {
    return generatingState[pageType] || isGeneratingBase;
  }, [generatingState, isGeneratingBase]);

  return {
    generateImage,
    setSelectedImage,
    areAllImagesSelected,
    isAnyGenerating,
    isGenerating,
    error,
    cleanup
  };
}; 