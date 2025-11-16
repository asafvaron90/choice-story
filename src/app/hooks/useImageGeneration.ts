import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from "@/components/ui/use-toast";
import { ImageGenerationApi, ImageGenerationOptions, ImageGenerationResult } from '@/app/network/ImageGenerationApi';
import { KidDetails } from '@/models';

export interface UseImageGenerationOptions {
  userId: string;
  kidDetails: KidDetails;
  storyId: string;
  showToast?: boolean;
  onSuccess?: (images: string[]) => void;
  onError?: (error: string) => void;
  environment?: 'development' | 'production';
}

export interface UseImageGenerationReturn {
  generateImage: (options: Omit<ImageGenerationOptions, 'userId' | 'kidDetails'>) => Promise<ImageGenerationResult>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Unified hook for all image generation with proper loading states and error handling
 * This replaces all other image generation hooks
 */
export const useImageGeneration = ({
  userId,
  kidDetails,
  storyId,
  showToast = true,
  onSuccess,
  onError,
  environment = 'development'
}: UseImageGenerationOptions): UseImageGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const ongoingRequest = useRef<Promise<ImageGenerationResult> | null>(null);

  // Always ensure isMounted is true when hook is active
  useEffect(() => {
    console.log('[useImageGeneration] Hook mounted, setting isMounted to true');
    isMounted.current = true;
    return () => {
      console.log('[useImageGeneration] Hook unmounting, setting isMounted to false');
      isMounted.current = false;
      ongoingRequest.current = null;
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateImage = useCallback(async (options: Omit<ImageGenerationOptions, 'userId' | 'kidDetails'>): Promise<ImageGenerationResult> => {
    console.log("[useImageGeneration] generateImage called", {
      userId,
      kidId: kidDetails?.id,
      prompt: options.prompt?.substring(0, 50) + '...',
      isOngoing: !!ongoingRequest.current,
      isMounted: isMounted.current
    });

    // Prevent duplicate requests
    if (ongoingRequest.current) {
      console.log("[useImageGeneration] Request already in progress, returning existing promise");
      return ongoingRequest.current;
    }

    // Log mount status but don't block - operation will complete anyway
    if (!isMounted.current) {
      console.warn("[useImageGeneration] Component not mounted, but proceeding with generation (will complete in background)");
    }

    // Validate required data
    if (!userId || !kidDetails) {
      const errorMsg = "Missing user or kid details";
      console.error("[useImageGeneration] Validation failed:", errorMsg);
      setError(errorMsg);
      if (showToast) {
        toast({
          title: "Image Generation Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
      onError?.(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }

    console.log("[useImageGeneration] Setting isGenerating to true");
    setIsGenerating(true);
    setError(null);

    const requestPromise = ImageGenerationApi.generateImage({
      userId,
      kidDetails,
      ...options,
    });

    ongoingRequest.current = requestPromise;

    try {
      console.log("[useImageGeneration] Waiting for API response...");
      const result = await requestPromise;

      console.log("[useImageGeneration] API response received:", {
        success: result.success,
        hasData: !!result.data,
        dataLength: result.data?.length,
        error: result.error
      });

      // Check if component is still mounted before updating state
      if (!isMounted.current) {
        console.log("[useImageGeneration] Component unmounted during generation, skipping state update");
        return result;
      }

      if (result.success && result.data) {
        console.log(`[useImageGeneration] Successfully generated ${result.data.length} images`);
        onSuccess?.(result.data);
      } else {
        const errorMsg = result.error || "Failed to generate image";
        console.error("[useImageGeneration] Generation failed:", errorMsg);
        setError(errorMsg);
        
        if (showToast) {
          toast({
            title: "Image Generation Failed",
            description: errorMsg,
            variant: "destructive",
          });
        }
        onError?.(errorMsg);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[useImageGeneration] Exception caught:", err);
      
      if (isMounted.current) {
        setError(errorMsg);
        
        if (showToast) {
          toast({
            title: "Image Generation Failed",
            description: errorMsg,
            variant: "destructive",
          });
        }
        onError?.(errorMsg);
      }

      return {
        success: false,
        error: errorMsg
      };
    } finally {
      console.log("[useImageGeneration] Cleanup: clearing ongoing request and setting isGenerating to false");
      ongoingRequest.current = null;
      
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  }, [userId, kidDetails, showToast, onSuccess, onError, environment]);


  return {
    generateImage,
    isGenerating,
    error,
    clearError
  };
};
