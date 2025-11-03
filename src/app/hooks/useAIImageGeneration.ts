import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from "@/components/ui/use-toast";
import { ImageGenerationApi, ImageGenerationOptions, ImageGenerationResult } from '@/app/network/ImageGenerationApi';
import { KidDetails, PageType } from '@/models';
import * as Sentry from "@sentry/nextjs";

export interface UseAIImageGenerationOptions {
  userId: string;
  kidDetails: KidDetails;
  storyId: string;
  showToast?: boolean;
  onSuccess?: (images: string[]) => void;
  onError?: (error: string) => void;
  useAIBots?: boolean; // Flag to control whether to use new AI bot system
  useCombinedGeneration?: boolean; // Flag to use the new combined prompt+image generation
  pageText?: string; // Page text for combined generation
  pageNum?: number; // Page number for combined generation
  environment?: 'development' | 'production'; // Environment for Firestore paths
}

export interface UseAIImageGenerationReturn {
  generateImage: (options: Omit<ImageGenerationOptions, 'userId' | 'kidDetails' > & { pageType?: PageType }) => Promise<ImageGenerationResult>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Enhanced hook for image generation that can use either legacy system or new AI bots
 * This provides backward compatibility while enabling new AI capabilities
 */
export const useAIImageGeneration = ({
  userId,
  kidDetails,
  storyId,
  showToast = true,
  onSuccess,
  onError,
  useAIBots = false,
  useCombinedGeneration = false,
  pageText,
  pageNum,
  environment = 'development'
}: UseAIImageGenerationOptions): UseAIImageGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const ongoingRequest = useRef<Promise<ImageGenerationResult> | null>(null);

  // Always ensure isMounted is true when hook is active
  useEffect(() => {
    console.log('[useAIImageGeneration] Hook mounted, setting isMounted to true');
    isMounted.current = true;
    return () => {
      console.log('[useAIImageGeneration] Hook unmounting, setting isMounted to false');
      isMounted.current = false;
      ongoingRequest.current = null;
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateImage = useCallback(async (
    options: Omit<ImageGenerationOptions, 'userId' | 'kidDetails'> & { pageType?: PageType }
  ): Promise<ImageGenerationResult> => {
    console.log("[useAIImageGeneration] generateImage called", {
      userId,
      kidId: kidDetails?.id,
      prompt: options.prompt?.substring(0, 50) + '...',
      pageType: options.pageType,
      useAIBots,
      isOngoing: !!ongoingRequest.current,
      isMounted: isMounted.current
    });

    // Prevent duplicate requests
    if (ongoingRequest.current) {
      console.log("[useAIImageGeneration] Request already in progress, returning existing promise");
      return ongoingRequest.current;
    }

    // Log mount status but don't block - operation will complete anyway
    if (!isMounted.current) {
      console.warn("[useAIImageGeneration] Component not mounted, but proceeding with generation (will complete in background)");
    }

    // Validate required data
    if (!userId || !kidDetails) {
      const errorMsg = "Missing user or kid details";
      console.error("[useAIImageGeneration] Validation failed:", errorMsg);
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

    console.log("[useAIImageGeneration] Setting isGenerating to true, useAIBots:", useAIBots, "useCombinedGeneration:", useCombinedGeneration);
    setIsGenerating(true);
    setError(null);

    // Use the new combined function if enabled and we have pageText
    let requestPromise: Promise<ImageGenerationResult>;
    if (useCombinedGeneration && pageText) {
      console.log("[useAIImageGeneration] Using combined generation method");
      requestPromise = ImageGenerationApi.generateImageWithPrompt({
        userId,
        kidDetails,
        storyId,
        pageText,
        pageNum,
        updatePath: options.updatePath,
        environment
      });
    } else {
      // Use the traditional method with separate prompt generation
      console.log("[useAIImageGeneration] Using traditional generation method");
      requestPromise = ImageGenerationApi.generateImage({
        userId,
        kidDetails,
        ...options,
        environment
      });
    }

    ongoingRequest.current = requestPromise;

    try {
      console.log("[useAIImageGeneration] Waiting for response...");
      const result = await requestPromise;

      console.log("[useAIImageGeneration] Response received:", {
        success: result.success,
        hasData: !!result.data,
        dataLength: result.data?.length,
        error: result.error
      });

      // Check if component is still mounted before updating state
      if (!isMounted.current) {
        console.log("[useAIImageGeneration] Component unmounted during generation, skipping state update");
        return result;
      }

      if (result.success && result.data) {
        const method = useCombinedGeneration ? "combined prompt+image" : (useAIBots ? "AI bot" : "legacy");
        console.log(`[useAIImageGeneration] Successfully generated ${result.data.length} images using ${method} method`);
        onSuccess?.(result.data);
        
        if (showToast) {
          toast({
            title: "Image Generated",
            description: `Successfully created image using ${method} method`,
          });
        }
      } else {
        const errorMsg = result.error || "Failed to generate image";
        console.error("[useAIImageGeneration] Generation failed:", errorMsg);
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
      console.error("[useAIImageGeneration] Exception caught:", err);
      
      Sentry.captureException(err, {
        tags: {
          component: "useAIImageGeneration",
          useAIBots: useAIBots.toString(),
          userId,
          kidId: kidDetails.id
        },
        extra: {
          prompt: options.prompt,
          pageType: options.pageType
        }
      });
      
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
      console.log("[useAIImageGeneration] Cleanup: clearing ongoing request and setting isGenerating to false");
      ongoingRequest.current = null;
      
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  }, [userId, kidDetails, showToast, onSuccess, onError, useAIBots, useCombinedGeneration, pageText, pageNum, storyId, environment]);



  return {
    generateImage,
    isGenerating,
    error,
    clearError
  };
};
