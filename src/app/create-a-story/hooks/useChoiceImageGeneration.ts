import { useState } from 'react';
import { KidDetails, PageType, StoryPage } from '@/models';
import { useImageGeneration } from '@/app/hooks/useImageGeneration';

interface UseChoiceImageGenerationProps {
  currentUser: { uid: string } | null;
  kidDetails: KidDetails | null;
  pages: StoryPage[] | null;
}

export const useChoiceImageGeneration = ({
  currentUser,
  kidDetails,
  pages,
}: UseChoiceImageGenerationProps) => {
  const [isGeneratingGoodChoice, setIsGeneratingGoodChoice] = useState(false);
  const [isGeneratingBadChoice, setIsGeneratingBadChoice] = useState(false);
  const [choiceImageError, setChoiceImageError] = useState<string | null>(null);
  const [choiceOptions, setChoiceOptions] = useState<Record<PageType.GOOD_CHOICE | PageType.BAD_CHOICE, string[]>>({ 
    [PageType.GOOD_CHOICE]: [], 
    [PageType.BAD_CHOICE]: [] 
  });

  const goodChoicePage = pages?.find(page => page.pageType === PageType.GOOD_CHOICE);
  const badChoicePage = pages?.find(page => page.pageType === PageType.BAD_CHOICE);

  const { generateImage, isGenerating: isGeneratingBase, error: baseError } = useImageGeneration({
    userId: currentUser?.uid || '',
    kidDetails: kidDetails || {} as KidDetails,
    storyId: '', // Choice images are generated before story is fully created
    showToast: false, // We'll handle toasts manually
    onSuccess: (images) => {
      // This will be overridden per request
    },
    onError: (error) => {
      console.error("[useChoiceImageGeneration] Image generation error:", error);
      setChoiceImageError(error);
    }
  });

  const validateRequiredChoiceData = (pageType: PageType.GOOD_CHOICE | PageType.BAD_CHOICE) => {
    if (!currentUser || !kidDetails) {
      const error = "Missing user or kid details";
      setChoiceImageError(error);
      return { isValid: false, error };
    }

    if (!pages || pages.length === 0) {
      const error = "No story pages available";
      setChoiceImageError(error);
      return { isValid: false, error };
    }

    const choicePage = pages.find(page => page.pageType === pageType);
    if (!choicePage) {
      const error = `Missing ${pageType === PageType.GOOD_CHOICE ? 'good' : 'bad'} choice page`;
      setChoiceImageError(error);
      return { isValid: false, error };
    }

    if (!choicePage.imagePrompt) {
      const error = `Missing image prompt for ${pageType === PageType.GOOD_CHOICE ? 'good' : 'bad'} choice`;
      setChoiceImageError(error);
      return { isValid: false, error };
    }

    return { isValid: true, choicePage };
  };

  const generateChoiceImage = async (
    type: PageType.GOOD_CHOICE | PageType.BAD_CHOICE,
    choicePage: StoryPage
  ): Promise<string[]> => {
    if (!currentUser || !kidDetails) {
      throw new Error("Missing user or kid details");
    }

    const result = await generateImage({
      prompt: choicePage.imagePrompt || `Generate image for ${type} choice`,
      outputCount: 1
    });

    if (!result.success) {
      throw new Error(result.error || `Failed to generate ${type === PageType.GOOD_CHOICE ? 'good' : 'bad'} choice image`);
    }

    if (!result.data || result.data.length === 0) {
      throw new Error(`No ${type === PageType.GOOD_CHOICE ? 'good' : 'bad'} choice images were generated`);
    }

    return result.data;
  };

  const handleGenerateImage = async (page: StoryPage) => {
    if (!page || !page.pageType) {
      throw new Error('Invalid page data');
    }

    if (!currentUser || !kidDetails) {
      throw new Error('Missing user or kid details');
    }

    // Set loading state based on page type
    if (page.pageType === PageType.GOOD_CHOICE) {
      setIsGeneratingGoodChoice(true);
    } else if (page.pageType === PageType.BAD_CHOICE) {
      setIsGeneratingBadChoice(true);
    }
    setChoiceImageError(null);

    try {
      const result = await generateImage({
        prompt: page.imagePrompt || `Generate image for ${page.pageType} page`,
        outputCount: 1
      });

      if (!result.success) {
        throw new Error(result.error || `Failed to generate ${page.pageType} image`);
      }

      if (!result.data || result.data.length === 0) {
        throw new Error(`No ${page.pageType} images were generated`);
      }

      // Update state based on page type
      if (page.pageType === PageType.GOOD_CHOICE || page.pageType === PageType.BAD_CHOICE) {
        setChoiceOptions(prev => ({
          ...prev,
          [page.pageType]: result.data!
        }));
      }

      return result.data;
    } catch (err) {
      console.error("Error generating image:", err);
      const errorMessage = err instanceof Error ? err.message : `Failed to generate ${page.pageType} image`;
      setChoiceImageError(errorMessage);
      throw new Error(`${page.pageType}: ${errorMessage}`); // Add page type to error message for better error handling
    } finally {
      // Reset loading state based on page type
      if (page.pageType === PageType.GOOD_CHOICE) {
        setIsGeneratingGoodChoice(false);
      } else if (page.pageType === PageType.BAD_CHOICE) {
        setIsGeneratingBadChoice(false);
      }
    }
  };

  const _handleGenerateGoodChoice = async () => {
    const validation = validateRequiredChoiceData(PageType.GOOD_CHOICE);
    if (!validation.isValid) {
      return;
    }

    setIsGeneratingGoodChoice(true);
    setChoiceImageError(null);

    try {
      const goodChoiceImages = await generateChoiceImage(PageType.GOOD_CHOICE, validation.choicePage!);
      setChoiceOptions(prev => ({
        ...prev,
        [PageType.GOOD_CHOICE]: goodChoiceImages
      }));
    } catch (error) {
      console.error("Error generating good choice images:", error);
      setChoiceImageError(error instanceof Error ? error.message : "Failed to generate good choice images");
      throw error; // Re-throw to be handled by the parent component
    } finally {
      setIsGeneratingGoodChoice(false);
    }
  };

  const _handleGenerateBadChoice = async () => {
    const validation = validateRequiredChoiceData(PageType.BAD_CHOICE);
    if (!validation.isValid) {
      return;
    }

    setIsGeneratingBadChoice(true);
    setChoiceImageError(null);

    try {
      const badChoiceImages = await generateChoiceImage(PageType.BAD_CHOICE, validation.choicePage!);
      setChoiceOptions(prev => ({
        ...prev,
        [PageType.BAD_CHOICE]: badChoiceImages
      }));
    } catch (error) {
      console.error("Error generating bad choice images:", error);
      setChoiceImageError(error instanceof Error ? error.message : "Failed to generate bad choice images");
      throw error; // Re-throw to be handled by the parent component
    } finally {
      setIsGeneratingBadChoice(false);
    }
  };

  return {
    isGeneratingGoodChoice: isGeneratingGoodChoice || isGeneratingBase,
    isGeneratingBadChoice: isGeneratingBadChoice || isGeneratingBase,
    choiceImageError: choiceImageError || baseError,
    choiceOptions,
    handleGenerateImage,
    goodChoicePage,
    badChoicePage,
  };
}; 