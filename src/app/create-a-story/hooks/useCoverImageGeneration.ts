import { useState } from 'react';
import { KidDetails } from '@/models';
import { useImageGeneration } from '@/app/hooks/useImageGeneration';

interface UseCoverImageGenerationProps {
  kidDetails: KidDetails | null;
  currentUser: { uid: string } | null;
  onError?: (error: Error) => void;
  _problemDescription?: string;
  _selectedTitle?: string;
  coverImagePrompt?: string;
}

interface UseCoverImageGenerationReturn {
  isGeneratingCover: boolean;
  coverError: string | null;
  coverOptions: string[];
  localSelectedCover: string | null;
  generateCoverImages: () => Promise<void>;
  setLocalSelectedCover: (url: string) => void;
}

export const useCoverImageGeneration = ({
  kidDetails,
  currentUser,
  onError = (error: Error) => console.error(error),
  _problemDescription,
  _selectedTitle,
  coverImagePrompt
}: UseCoverImageGenerationProps): UseCoverImageGenerationReturn => {
  const [coverOptions, setCoverOptions] = useState<string[]>([]);
  const [localSelectedCover, setLocalSelectedCover] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const { generateImage, isGenerating, error: baseError } = useImageGeneration({
    userId: currentUser?.uid || '',
    kidDetails: kidDetails || {} as KidDetails,
    storyId: '', // Cover images are generated before story is fully created
    showToast: false, // We'll handle toasts manually
    onSuccess: (images) => {
      setCoverOptions(images);
    },
    onError: (error) => {
      console.error("[useCoverImageGeneration] Image generation error:", error);
      setCoverError(error);
      onError(new Error(error));
    }
  });

  const validateRequiredData = () => {
    if (!currentUser || !kidDetails) {
      const error = new Error("You must be logged in and have kid details to generate images.");
      setCoverError(error.message);
      onError(error);
      return false;
    }

    if (!coverImagePrompt && (!_problemDescription || !_selectedTitle)) {
      const error = new Error("Missing required story details for cover image generation.");
      setCoverError(error.message);
      onError(error);
      return false;
    }

    return true;
  };

  const generateCoverImages = async () => {
    if (!validateRequiredData()) {
      return;
    }

    setCoverError(null);

    const prompt = coverImagePrompt || `Create a vibrant, colorful children's book cover featuring the main character in a Pixar-like 3D style. The cover should be engaging and appropriate for a ${kidDetails!.age}-year-old ${kidDetails!.gender}. The story is about ${_problemDescription} and titled "${_selectedTitle}". Make it appealing and fun.`;

    const result = await generateImage({
      prompt,
      outputCount: 3,
      parameters: {
        size: "1024x1024",
        style: "vivid"
      }
    });

    if (!result.success) {
      const errorMessage = result.error || "Failed to generate cover images";
      setCoverError(errorMessage);
      onError(new Error(errorMessage));
    }
  };

  return {
    isGeneratingCover: isGenerating,
    coverError: coverError || baseError,
    coverOptions,
    localSelectedCover,
    generateCoverImages,
    setLocalSelectedCover
  };
}; 