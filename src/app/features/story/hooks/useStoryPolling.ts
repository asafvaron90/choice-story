import { useState, useEffect } from 'react';
import { toast } from "@/components/ui/use-toast";
import { Story, StoryStatus } from '@/models';
import { StoryService } from '@/app/services/story.service';

interface UseStoryPollingProps {
  story: Story | null;
  isGenerating: boolean;
  onStoryStatusChange: (story: Story) => void;
}

interface UseStoryPollingReturn {
  currentStory: Story | null;
  generationProgress: StoryStatus;
}

/**
 * Hook for polling story status and updating progress
 */
export const useStoryPolling = ({
  story,
  isGenerating,
  onStoryStatusChange
}: UseStoryPollingProps): UseStoryPollingReturn => {
  const [currentStory, setCurrentStory] = useState<Story | null>(story);
  const [generationProgress, setGenerationProgress] = useState<StoryStatus>(StoryStatus.INCOMPLETE);

  // Poll for story status updates during image generation
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    const pollStoryStatus = async () => {
      if (currentStory && currentStory.id && isGenerating) {
        try {
          const updatedStory = await StoryService.getStoryById(currentStory.id);
          
          if (updatedStory) {
            setCurrentStory(updatedStory);
            
            // If story is complete, stop polling
            if (updatedStory.status === StoryStatus.COMPLETE) {
              if (pollInterval) clearInterval(pollInterval);
              
              // Call onStoryStatusChange with the updated story
              onStoryStatusChange(updatedStory);
              toast({ title: "Success", description: "Story generated successfully!" });
            } else {
              // Still in progress, update the parent
              onStoryStatusChange(updatedStory);
            }
            
            setGenerationProgress(updatedStory.status);
          }
        } catch (error) {
          console.error("Error polling story status:", error);
        }
      }
    };
    
    if (isGenerating && currentStory && currentStory.id) {
      // Poll every 3 seconds
      pollInterval = setInterval(pollStoryStatus, 3000);
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isGenerating, currentStory, onStoryStatusChange]);

  // Update current story when story prop changes
  useEffect(() => {
    if (story && (!currentStory || story.id !== currentStory.id)) {
      setCurrentStory(story);
    }
  }, [story, currentStory]);

  return { currentStory, generationProgress };
};

