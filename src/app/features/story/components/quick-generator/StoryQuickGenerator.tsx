import { FC, useEffect } from 'react';
import { Story, KidDetails, Account } from '@/models';
import { useStoryGeneration } from '../../hooks/useStoryGeneration';
import { useStoryPolling } from '../../hooks/useStoryPolling';
import GenerationProgress from './GenerationProgress';
import GenerationControls from './GenerationControls';

interface StoryQuickGeneratorProps {
  kidDetails: KidDetails;
  currentUser: Account;
  onGeneratingChange: (isGenerating: boolean) => void;
  onStoryCreated: (story: Story) => void;
  onError: (error: Error) => void;
  setImageData?: (base64: string) => void;
  setTitle?: (title: string) => void;
  setProblemDescription?: (problem: string) => void;
}

export const StoryQuickGenerator: FC<StoryQuickGeneratorProps> = ({
  kidDetails,
  currentUser,
  onGeneratingChange,
  onStoryCreated,
  onError,
  setTitle,
  setProblemDescription
}) => {
  // Use the story generation hook
  const {
    isGenerating,
    currentStory,
    generateNow,
  } = useStoryGeneration({
    kidDetails,
    currentUser,
    onError,
    setTitle,
    setProblemDescription,
    onStoryStatusChange: (story) => {
      // This replaces the old onStoryCreated callback
      onStoryCreated(story);
    }
  });

  // Report generation status changes to parent
  useEffect(() => {
    onGeneratingChange(isGenerating);
  }, [isGenerating, onGeneratingChange]);

  // Use the story polling hook
  const { generationProgress } = useStoryPolling({
    story: currentStory,
    isGenerating,
    onStoryStatusChange: (story) => {
      onStoryCreated(story);
    }
  });

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Generate a Story</h2>
      
      {isGenerating ? (
        <GenerationProgress progress={generationProgress} />
      ) : (
        <GenerationControls 
          onGenerate={generateNow}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
};

export default StoryQuickGenerator;
