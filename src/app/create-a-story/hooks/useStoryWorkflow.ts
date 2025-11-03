import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import useCreateStoryProgressState from '../state/progress-state';
import useCreateStoryState from '../state/create-story-state';
import { StoryApi } from '@/app/network';
import { StoryPage, PageType, Story, StoryStatus } from '@/models';
import { useTranslation } from 'react-i18next';

/**
 * Interface for workflow-specific state that doesn't fit in the Story model
 * Keeps UI-specific state separate from the domain model
 */
export interface WorkflowState {
  /** Currently expanded step in the workflow UI */
  expandedStep: number | null;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Progress of image uploads, keyed by page type */
  uploadProgress: {[key: string]: number};
}

/**
 * useStoryWorkflow - Custom hook for managing the story creation workflow
 * 
 * This hook provides a centralized state management approach for story creation:
 * - Maintains a single Story state for domain data
 * - Keeps workflow UI state separate
 * - Provides backward compatibility with existing components
 * - Handles all aspects of story creation, from data collection to final upload
 * 
 * @param initialData - Optional object containing initial data for the story
 * @returns An object containing state values and functions for managing story creation
 */
export function useStoryWorkflow(initialData?: {
  userId?: string;
  kidId?: string;
}) {
  const _router = useRouter();
  const { step } = useCreateStoryProgressState();
  const { t } = useTranslation();
  const storyState = useCreateStoryState();
  
  /**
   * Consolidated story state - all story-related data in a single state object
   * Using the same structure as the domain model for consistency
   */
  const [story, setStory] = useState<Partial<Omit<Story, 'coverImage'>> & { coverImage: string | null }>({
    userId: initialData?.userId || "",
    kidId: initialData?.kidId || "",
    title: "",
    problemDescription: "",
    advantages: "",
    disadvantages: "",
    pages: [],
    coverImage: null,
    lastUpdated: new Date()
  });

  /**
   * Workflow-specific state separate from the domain model
   * Contains UI state that doesn't belong in the story model
   */
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    expandedStep: null,
    isSaving: false,
    uploadProgress: {}
  });

  const [error, setError] = useState<Error | null>(null);

  const _errorMessage = error?.message || 'An error occurred';

  /**
   * Updates a specific field in the story state
   * Using a type-safe approach with generics and consistent model structure
   * 
   * @param field - The field to update
   * @param value - The new value for the field
   */
  const updateStory = <K extends keyof Story>(field: K, value: Story[K]) => {
    setStory((prevStory: Partial<Omit<Story, 'coverImage'>> & { coverImage: string | null }) => ({
      ...prevStory,
      [field]: value,
      lastUpdated: new Date()
    }));
  };

  /**
   * Handles selection of cover image
   * 
   * @param url - The URL of the selected cover image
   */
  const setCoverImage = (url: string | null) => {
    updateStory('coverImage' as keyof Story, url);
  };

  /**
   * Handles selection of a choice (good/bad) image
   * Updates or creates a page of the appropriate type
   * 
   * @param type - The type of choice (good or bad)
   * @param url - The URL of the selected image
   */
  const handleChoiceSelection = (type: PageType.GOOD_CHOICE | PageType.BAD_CHOICE, url: string) => {
    // Find if there's already a page of this type
    const pages = [...(story.pages || [])];
    const existingPageIndex = pages.findIndex((page: StoryPage) => page.pageType === type);
    
    if (existingPageIndex >= 0) {
      // Update existing page
      pages[existingPageIndex] = {
        ...pages[existingPageIndex],
        selectedImageUrl: url
      };
    } else {
      // Create a new page
      pages.push({
        pageType: type,
        storyText: '',
        pageNum: pages.length,
        selectedImageUrl: url,
        imagePrompt: ''
      });
    }
    
    updateStory('pages', pages);
  };

  /**
   * Get the selected image for a specific page type
   * 
   * @param type - The page type to get the image for
   * @returns The URL of the selected image, or null/undefined if none is selected
   */
  const getSelectedImage = useCallback((type: PageType.GOOD_CHOICE | PageType.BAD_CHOICE): string | null | undefined => {
    return story.pages?.find((page: StoryPage) => page.pageType === type)?.selectedImageUrl;
  }, [story.pages]);

  /**
   * Toggles the expansion state of a step in the workflow
   * 
   * @param index - The index of the step to toggle
   * @param isDisabled - Whether the step is disabled
   */
  const handleStepToggle = (index: number, isDisabled: boolean) => {
    if (isDisabled) return;
    setWorkflowState((prev: WorkflowState) => ({
      ...prev,
      expandedStep: prev.expandedStep === index ? null : index
    }));
  };

  /**
   * Proceeds to the choices step and expands it
   * 
   * @param next - The function to call to advance to the next step
   */
  const proceedToChoices = (next: () => void) => {
    next();
    setWorkflowState((prev: WorkflowState) => ({
      ...prev, 
      expandedStep: 3
    }));
  };

  /**
   * Uploads an image with error handling and retry logic
   * 
   * @param imageUrl - The URL of the image to upload
   * @param userId - The ID of the user
   * @param kidId - The ID of the kid
   * @param storyId - The ID of the story
   * @param pageType - The type of page the image is for
   * @param retryCount - Number of times to retry on failure
   * @returns Promise resolving to the uploaded image URL
   */
  const _uploadImageWithRetry = async (
    imageUrl: string,
    userId: string,
    kidId: string,
    storyId: string,
    pageType: PageType,
    retryCount = 2
  ): Promise<string> => {
    try {
      // Track upload progress
      const progressKey = `${pageType}`;
      setWorkflowState(prev => ({
        ...prev,
        uploadProgress: { ...prev.uploadProgress, [progressKey]: 0 }
      }));
      
      // Use the StoryApi method to upload the image
      const uploadedUrl = await StoryApi.uploadImageToFirebaseStorage(
        imageUrl, 
        userId, 
        kidId, 
        storyId, 
        pageType
      );
      
      // Set complete progress
      setWorkflowState(prev => ({
        ...prev,
        uploadProgress: { ...prev.uploadProgress, [progressKey]: 100 }
      }));
      
      if (!uploadedUrl) {
        throw new Error(`Failed to upload ${pageType} image`);
      }
      
      return uploadedUrl;
    } catch (error) {
      console.error(`Error uploading ${pageType} image:`, error);
      
      // Retry logic
      if (retryCount > 0) {
        toast({
          title: "Upload failed",
          description: `Retrying ${pageType} image upload...`,
          variant: "default"
        });
        
        return _uploadImageWithRetry(imageUrl, userId, kidId, storyId, pageType, retryCount - 1);
      }
      
      // If all retries fail, show error and use a fallback image
      toast({
        title: "Upload failed",
        description: `Could not upload ${pageType} image. Using fallback image instead.`,
        variant: "destructive"
      });
      
      // Return a fallback image URL based on page type
      return `/illustrations/${pageType}_FALLBACK.svg`;
    }
  };

  /**
   * Updates the initial user and kid IDs when they become available
   * Useful when these values aren't available at hook initialization time
   * Optimized to prevent unnecessary re-renders
   */
  const updateInitialData = (userId?: string, kidId?: string) => {
    if (!userId && !kidId) return; 
    
    setStory((prev: Partial<Omit<Story, 'coverImage'>> & { coverImage: string | null }) => {
      const userIdHasChanged = userId && userId !== prev.userId;
      const kidIdHasChanged = kidId && kidId !== prev.kidId;
      
      if (!userIdHasChanged && !kidIdHasChanged) {
        return prev;
      }
      
      return {
        ...prev,
        userId: userId || prev.userId,
        kidId: kidId || prev.kidId,
        lastUpdated: new Date()
      };
    });
  };

  /**
   * Handles the final step of creating and saving the story
   * Uploads all images, updates the story, and navigates to the story view
   * 
   * This function follows a "state-first" approach:
   * 1. All story data is maintained in the story state throughout the workflow
   * 2. Optional parameters are used only for backward compatibility
   * 3. The complete story object is constructed directly from the state
   * 4. Validation ensures all required fields are present before proceeding
   * 
   * @param userId - Optional user ID override if not already in story state
   * @param kidId - Optional kid ID override if not already in story state
   * @param selectedTitle - Optional title override (for backward compatibility)
   * @param problemDescription - Optional description override (for backward compatibility)
   * @param pages - Optional pages override (for backward compatibility)
   * @returns Promise resolving to true if successful, false otherwise
   */
  const handleFinish = async (
    userId?: string,
    kidId?: string,
    selectedTitle: string | null = null,
    problemDescription: string | null = null,
    pages: StoryPage[] | null = null
  ) => {
    if (userId || kidId || selectedTitle || problemDescription || pages) {
      const storyUpdates: Partial<Story> = {};
      
      if (userId) storyUpdates.userId = userId;
      if (kidId) storyUpdates.kidId = kidId;
      if (selectedTitle) storyUpdates.title = selectedTitle;
      if (problemDescription) storyUpdates.problemDescription = problemDescription;
      if (pages) storyUpdates.pages = pages;
      
      setStory((prev: Partial<Omit<Story, 'coverImage'>> & { coverImage: string | null }) => ({
        ...prev,
        ...storyUpdates,
        lastUpdated: new Date()
      }));
    }
    
    // Validate the complete story has all required fields
    const { userId: finalUserId, kidId: finalKidId, title, problemDescription: description, advantages, disadvantages, pages: storyPages, coverImage } = story;
    
    if (!finalUserId || !finalKidId || !storyPages || !storyPages.length || !title || !description || !coverImage) {
      toast({
        title: "Missing Information",
        description: "Please complete all steps before creating your story.",
        variant: "destructive"
      });
      return false;
    }

    setWorkflowState((prev: WorkflowState) => ({ ...prev, isSaving: true }));

    try {
      // Create a complete story object directly from our state
      const storyData: Story = {
        id: story.id || "",
        kidId: finalKidId,
        userId: finalUserId,
        title: title || "",
        problemDescription: description || "",
        advantages: advantages || "",
        disadvantages: disadvantages || "",
        status: StoryStatus.INCOMPLETE,
        pages: storyPages || [],
        createdAt: story.createdAt || new Date(),
        lastUpdated: story.lastUpdated || new Date()
      };

      // Send to API to get an ID assigned
      const newStory = await StoryApi.uploadStory(storyData);
      if (!newStory.success || !newStory.data) {
        throw new Error("Failed to create story");
      }
      
      // Update story state with the new story
      const savedStory = newStory.data.story;
      
      // Update story state with the new story
      storyState.setPages(savedStory.pages);
      storyState.reset();

      // Update progress state
      useCreateStoryProgressState.getState().reset();

      // Show success notification
      toast({
        title: t('success'),
        description: t('story.created'),
      });

      // Return the saved story
      return savedStory;
    } catch (error) {
      // Handle errors properly with user feedback
      const _errorMessage: string = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error("Error creating story:", error);
      
      setError(error instanceof Error ? error : new Error(_errorMessage));
      
      toast({
        title: t('error'),
        description: t('story.error'),
        variant: "destructive"
      });
      
      return false;
    } finally {
      setWorkflowState((prev: WorkflowState) => ({ 
        ...prev, 
        isSaving: false,
        uploadProgress: {}
      }));
    }
  };

  /**
   * Determines if all steps are complete to enable finishing the story
   * Memoized to prevent unnecessary recalculations
   * 
   * @returns Function that checks if all provided steps are completed
   */
  const canFinish = useCallback((steps: { isCompleted: boolean }[]) => {
    return steps.every(step => step.isCompleted);
  }, []);
  
  // Create an object with selected choices for backward compatibility
  const selectedChoices = useMemo(() => {
    return {
      [PageType.GOOD_CHOICE]: getSelectedImage(PageType.GOOD_CHOICE),
      [PageType.BAD_CHOICE]: getSelectedImage(PageType.BAD_CHOICE)
    };
  }, [getSelectedImage]);
  
  // Add title and problem description for backwards compatibility
  const selectedTitle = story.title || null;
  const problemDescription = story.problemDescription || null;
  
  return {
    step,
    expandedStep: workflowState.expandedStep,
    setExpandedStep: (step: number | null) => setWorkflowState(prev => ({ ...prev, expandedStep: step })),
    selectedCover: story.coverImage,
    setSelectedCover: setCoverImage,
    selectedChoices,
    selectedTitle,
    problemDescription,
    isSaving: workflowState.isSaving,
    uploadProgress: workflowState.uploadProgress,
    story,
    updateStory,
    updateInitialData,
    handleChoiceSelection,
    handleStepToggle,
    proceedToChoices,
    handleFinish,
    canFinish
  };
} 