import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { StoryPage, KidDetails, PageType, Story, StoryStatus, ApiErrorResponse, ApiResponse } from '@/models';
import { toast } from '@/components/ui/use-toast';
import { StoryApi } from '@/app/network';
import { GenerateStoryResponse } from '@/app/network/StoryApi';
import { StoryTemplates } from '@/app/_lib/services/prompt_templats';
import { functionClientAPI } from '@/app/network/functions';
import useCreateStoryState from '../state/create-story-state';
import { StoryAction } from '@/app/state/story-reducer';
import { AIStoryService } from '@/app/services/ai-story.service';
import * as Sentry from "@sentry/nextjs";

interface UseStoryGenerationWorkflowProps {
  kidId: string | null;
  problemDescription: string | null;
  selectedTitle: string | null;
  pages: StoryPage[] | null;
  kidDetails: KidDetails | null;
  dispatch: (action: StoryAction) => void;
  advantages: string | null;
  disadvantages: string | null;
  useAIBots?: boolean; // Flag to control whether to use new AI bot system
}

export function useStoryGenerationWorkflow({
  kidId,
  problemDescription,
  selectedTitle,
  pages,
  kidDetails,
  dispatch,
  advantages,
  disadvantages,
  useAIBots = false
}: UseStoryGenerationWorkflowProps) {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { setPages } = useCreateStoryState();
  const _router = useRouter();

  const [problemDescriptionError, setProblemDescriptionError] = useState<string | null>(null);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyGenerationError, setStoryGenerationError] = useState<string | null>(null);
  const [storyError, _setStoryError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Update pages with selected cover image
  useEffect(() => {
    if (selectedCover && pages) {
      const currentCoverPage = pages.find(page => page.pageType === PageType.COVER);
      // Only update if the selectedCover is different from the current image URL
      if (currentCoverPage?.selectedImageUrl !== selectedCover) {
        const updatedPages = pages.map(page => 
          page.pageType === PageType.COVER 
            ? { ...page, selectedImageUrl: selectedCover } 
            : page
        );
        setPages(updatedPages);
      }
    }
  }, [selectedCover, pages, setPages]);

  // Update pages with selected choice images
  useEffect(() => {
    if (selectedChoices[PageType.GOOD_CHOICE] && selectedChoices[PageType.BAD_CHOICE] && pages) {
      const currentGoodChoicePage = pages.find(page => page.pageType === PageType.GOOD_CHOICE);
      const currentBadChoicePage = pages.find(page => page.pageType === PageType.BAD_CHOICE);

      // Only update if either good choice or bad choice image URL has changed
      if (currentGoodChoicePage?.selectedImageUrl !== selectedChoices[PageType.GOOD_CHOICE] ||
          currentBadChoicePage?.selectedImageUrl !== selectedChoices[PageType.BAD_CHOICE]) {

        const updatedPages = pages.map(page => {
          if (page.pageType === PageType.GOOD_CHOICE) {
            return { ...page, selectedImageUrl: selectedChoices[PageType.GOOD_CHOICE] };
          }
          if (page.pageType === PageType.BAD_CHOICE) {
            return { ...page, selectedImageUrl: selectedChoices[PageType.BAD_CHOICE] };
          }
          return page;
        });
        setPages(updatedPages);
      }
    }
  }, [selectedChoices, pages, setPages]);

  const handleGenerateTitles = async () => {
    if (!problemDescription) {
      setProblemDescriptionError("Please enter a problem description first.");
      return;
    }

    if (!kidDetails) {
      toast({
        title: "Error",
        description: "Kid details are required to generate titles.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingTitles(true);
    setProblemDescriptionError(null);

    try {
      // Use the passed kidDetails (already loaded by useKidStoryLoader)
      if (!kidDetails) {
        throw new Error("Kid details not available");
      }

      // Use the new Firebase function to generate titles
      console.log("Calling generateStoryTitles with:", {
        name: kidDetails.name || 'Child',
        gender: kidDetails.gender as 'male' | 'female',
        problemDescription,
        age: kidDetails.age,
        advantages: advantages || undefined,
        disadvantages: disadvantages || undefined
      });
      
      const response = await functionClientAPI.generateStoryTitles({
        name: kidDetails.name || 'Child',
        gender: kidDetails.gender as 'male' | 'female',
        problemDescription,
        age: kidDetails.age,
        advantages: advantages || undefined,
        disadvantages: disadvantages || undefined
      });
      
      console.log("generateStoryTitles response:", response);
      
      if (!response.success) {
        throw new Error(`Failed to generate titles: success=false`);
      }
      
      if (!response.titles) {
        throw new Error(`Failed to generate titles: no titles property in response`);
      }
      
      if (!Array.isArray(response.titles)) {
        throw new Error(`Failed to generate titles: titles is not an array, got ${typeof response.titles}`);
      }
      
      if (response.titles.length === 0) {
        throw new Error(`Failed to generate titles: empty titles array`);
      }

      // Dispatch titles to our state
      dispatch({ type: 'SET_TITLES', payload: response.titles });
    } catch (error) {
      console.error("Error generating titles:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate titles. Please try again.";
      setProblemDescriptionError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error; // Re-throw to be handled by the caller
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleGenerateFullStory = async () => {
    console.log("handleGenerateFullStory called with:", {
      selectedTitle,
      problemDescription,
      kidDetails: !!kidDetails,
      useAIBots,
      currentUser: !!currentUser
    });

    if (!selectedTitle || !problemDescription || !kidDetails) {
      console.error("Missing required data for story generation:", {
        hasSelectedTitle: !!selectedTitle,
        hasProblemDescription: !!problemDescription,
        hasKidDetails: !!kidDetails
      });
      toast({
        title: "Error",
        description: "Please complete all previous steps first.",
        variant: "destructive"
      });
      return null;
    }

    setIsGeneratingStory(true);
    setStoryGenerationError(null);

    try {
      // Use the passed kidDetails (already loaded by useKidStoryLoader)
      if (!kidDetails) {
        throw new Error("Kid details not available");
      }

      let generatedPages: StoryPage[] | null = null;

      if (useAIBots) {
        // Use new AI bot system
        Sentry.addBreadcrumb({
          message: "Using AI bot system for story generation",
          category: "story.generation",
          level: "info"
        });

        console.log("Calling AI bot with data:", {
          title: selectedTitle,
          problemDescription,
          kidName: kidDetails.name,
          kidAge: kidDetails.age,
          advantages: advantages || "",
          disadvantages: disadvantages || ""
        });

        let aiResponse;
        try {
          aiResponse = await AIStoryService.generateFullStory({
            title: selectedTitle,
            problemDescription,
            kidDetails: kidDetails,
            language,
            userId: currentUser?.uid || "",
            advantages: advantages || "",
            disadvantages: disadvantages || ""
          });
          console.log("AI bot response received:", aiResponse);
        } catch (aiError) {
          console.error("Error calling AIStoryService.generateFullStory:", aiError);
          throw aiError;
        }

        if (!aiResponse.success || !aiResponse.story) {
          console.error("AI bot generation failed:", aiResponse.error);
          throw new Error(aiResponse.error || "Failed to generate story with AI bot");
        }

        generatedPages = aiResponse.story.pages;
      } else {
        // Use Firebase function for story generation
        Sentry.addBreadcrumb({
          message: "Using Firebase function for story generation",
          category: "story.generation",
          level: "info"
        });

        // Generate a unique story ID
        const storyId = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log("Calling Firebase generateStoryPagesText with:", {
          name: kidDetails.name || 'Child',
          problemDescription,
          title: selectedTitle,
          age: kidDetails.age,
          advantages: advantages || "",
          disadvantages: disadvantages || "",
          accountId: currentUser?.uid || "",
          userId: currentUser?.uid || "",
          storyId
        });

        const response = await functionClientAPI.generateStoryPagesText({
          name: kidDetails.name || 'Child',
          problemDescription,
          title: selectedTitle,
          age: kidDetails.age,
          advantages: advantages || "",
          disadvantages: disadvantages || "",
          accountId: currentUser?.uid || "", // Using userId as accountId
          userId: currentUser?.uid || "",
          storyId
        });

        if (!response.success || !response.text) {
          throw new Error("Failed to generate story text from Firebase function");
        }

        console.log("Firebase function returned text:", response.text.substring(0, 200) + "...");

        generatedPages = StoryTemplates.fullStoryTextGenerationResponseConvertor(response.text);
      }

      if (generatedPages && generatedPages.length > 0) {
        // Update state
        await setPages(generatedPages);
        setExpandedStep(3); // Move to cover image step
        toast({
          title: "Success",
          description: useAIBots ? "Story generated with AI bot successfully!" : "Story generated with Firebase function successfully!",
        });
        return generatedPages;
      } else {
        throw new Error("Failed to parse generated story");
      }
    } catch (error) {
      console.error("Error generating story:", error);
      Sentry.captureException(error);
      setStoryGenerationError("Failed to generate story. Please try again.");
      toast({
        title: "Error",
        description: "Failed to generate story. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleFinishStory = async (pagesOverride?: StoryPage[]): Promise<ApiResponse<GenerateStoryResponse> | null> => {
    const pagesToSave = pagesOverride || pages;
    console.log('handleFinishStory called with pages:', pagesToSave);

    setIsSaving(true);

    try {
      if (pagesToSave && currentUser && kidId && selectedTitle && problemDescription) {
        // Create the story object directly from the provided pages
        // The pages should already have the correct image URLs from the component state
        const storyToSave: Story = {
          id: "", // ID will be assigned by the backend on creation
          userId: currentUser.uid,
          kidId: kidId,
          title: selectedTitle,
          problemDescription: problemDescription,
          advantages: advantages || "",
          disadvantages: disadvantages || "",
          pages: pagesToSave.map(page => {
            console.log(`Saving page ${page.pageType} with image URL:`, page.selectedImageUrl);
            return page;
          }), // Use pages directly without modification
          status: StoryStatus.COMPLETE,
          createdAt: new Date(),
          lastUpdated: new Date()
        };

        // Debug log the story data
        console.log('[handleFinishStory] Saving story:', JSON.stringify(storyToSave, null, 2));

        const response = await StoryApi.uploadStory(storyToSave);

        if (!response.success) {
          const errorResponse = response as ApiErrorResponse;
          console.error('[handleFinishStory] Failed to save story:', errorResponse.error);
          throw new Error(errorResponse.error || "Failed to save story");
        }

        // Debug log the response
        console.log('[handleFinishStory] API Response:', JSON.stringify(response, null, 2));

        // Extract the story from the response data
        const responseData = response.data;
        if (!responseData?.story) {
          console.error('[handleFinishStory] No story in response data');
          throw new Error("Failed to save story - no story data returned");
        }

        const savedStory = responseData.story;
        
        // Debug log the saved story
        console.log('[handleFinishStory] Saved story:', JSON.stringify(savedStory, null, 2));
        
        return {
          success: true,
          data: {
            story: savedStory,
            message: 'Story saved successfully'
          }
        };
      }
      const missing = [];
      if (!pagesToSave) missing.push('pages');
      if (!currentUser) missing.push('user');
      if (!kidId) missing.push('kidId');
      if (!selectedTitle) missing.push('title');
      if (!problemDescription) missing.push('problemDescription');
      
      const error = `Missing essential story data: ${missing.join(', ')}`;
      console.error('[handleFinishStory]', error);
      throw new Error(error);
    } catch (error) {
      console.error("[handleFinishStory] Error saving story:", error);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleChoiceSelection = (type: PageType.GOOD_CHOICE | PageType.BAD_CHOICE, url: string) => {
    setSelectedChoices(prev => ({
      ...prev,
      [type]: url
    }));
  };

  const handleStepToggle = (step: number, isDisabled: boolean) => {
    if (!isDisabled) {
      setExpandedStep(expandedStep === step ? null : step);
    }
  };

  const proceedToChoices = () => {
    setExpandedStep(4);
  };

  return {
    problemDescriptionError,
    isGeneratingTitles,
    isGeneratingStory,
    storyGenerationError,
    storyError,
    expandedStep,
    selectedCover,
    selectedChoices,
    isSaving,
    handleGenerateTitles,
    handleGenerateFullStory,
    handleFinishStory,
    handleChoiceSelection,
    handleStepToggle,
    proceedToChoices,
    setSelectedCover,
  };
} 