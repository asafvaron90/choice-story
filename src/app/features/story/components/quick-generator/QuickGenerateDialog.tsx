import { FC, useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Story, StoryStatus, KidDetails, Account } from '@/models';
import { getMessageFromProgress, getProgressFromStatus } from '../../utils/storyProgressHelpers';
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from '@/app/hooks/useTranslation';
import functionClientAPI from '@/app/network/functions/FunctionClientAPI';
import { StoryApi } from '@/app/network';

interface QuickGenerateDialogProps {
  kidDetails: KidDetails;
  currentUser: Account;
  onStoryCreated: (story: Story) => void;
  isGenerating: boolean;
  onGeneratingChange: (isGenerating: boolean) => void;
  story?: Story | null;
  generationProgress?: {
    step: number;
    message: string;
    percentage: number;
  };
}

export const QuickGenerateDialog: FC<QuickGenerateDialogProps> = ({
  kidDetails,
  currentUser,
  onStoryCreated,
  isGenerating,
  onGeneratingChange,
  story,
  generationProgress = { step: 0, message: "Initializing...", percentage: 0 }
}) => {
  const [problem, setProblem] = useState('');
  const [advantages, setAdvantages] = useState('');
  const [disadvantages, setDisadvantages] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [progressInfo, setProgressInfo] = useState(generationProgress);
  const { t } = useTranslation();
  
  // Use a ref to track if we need to update progressInfo
  const prevProgressRef = useRef<{
    generationProgress?: typeof generationProgress;
    story?: Story | null;
  }>({
    generationProgress,
    story
  });

  // Update progress information based on story status if available
  useEffect(() => {
    // Skip if nothing has changed
    const prevProgress = prevProgressRef.current;
    const hasGenerationProgressChanged = 
      prevProgress.generationProgress?.percentage !== generationProgress?.percentage ||
      prevProgress.generationProgress?.message !== generationProgress?.message;
    const hasStoryChanged = prevProgress.story !== story;
    
    if (!hasGenerationProgressChanged && !hasStoryChanged) {
      return;
    }
    
    // Update the ref with current values
    prevProgressRef.current = { generationProgress, story };
    
    // Determine the new progress info
    let newProgressInfo = { ...progressInfo };
    
    if (story && story.status) {
      const storyStatus = story.status.toString();
      if (storyStatus.startsWith('progress_')) {
        const percentage = getProgressFromStatus(storyStatus);
        const message = getMessageFromProgress(percentage);
        newProgressInfo = {
          step: Math.floor(percentage / 10),
          message,
          percentage
        };
      } else if (storyStatus === StoryStatus.COMPLETE.toString()) {
        newProgressInfo = {
          step: 10,
          message: t.quickGenerateDialog.progressDialog.storyCompleted,
          percentage: 100
        };
      } else if (storyStatus === StoryStatus.GENERATING.toString()) {
        // If we have generationProgress, use it, otherwise keep existing progress info
        if (generationProgress) {
          newProgressInfo = generationProgress;
        }
      }
    } else if (generationProgress) {
      // Use provided progress if no story is available
      newProgressInfo = generationProgress;
    }
    
    // Only set state if the values are actually different
    if (
      newProgressInfo.percentage !== progressInfo.percentage ||
      newProgressInfo.message !== progressInfo.message ||
      newProgressInfo.step !== progressInfo.step
    ) {
      setProgressInfo(newProgressInfo);
    }
  }, [story, generationProgress, progressInfo, t]);

  const handleSubmit = async () => {
    if (!problem.trim()) {
      toast({
        title: t.quickGenerateDialog.inputRequiredTitle,
        description: t.quickGenerateDialog.inputRequiredDescription,
        variant: "destructive"
      });
      return;
    }

    setIsOpen(false); // Close dialog immediately
    onGeneratingChange(true); // Start showing progress

    // Update progress to show we're starting
    setProgressInfo({
      step: 1,
      message: "Starting story generation...",
      percentage: 5
    });

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      console.log("[QuickGenerateDialog] Calling generateFullStory with:", {
        userId: currentUser.uid,
        kidId: kidDetails.id,
        problemDescription: problem,
        advantages,
        disadvantages
      });

      // Determine environment for Firestore paths
      const environment = (process.env.NODE_ENV === 'production' ? 'production' : 'development') as 'development' | 'production';

      // Start the Firebase function (don't await it yet)
      const generationPromise = functionClientAPI.generateFullStory({
        userId: currentUser.uid,
        kidId: kidDetails.id,
        problemDescription: problem,
        advantages: advantages || undefined,
        disadvantages: disadvantages || undefined,
        environment
      });

      // Get the storyId immediately after calling (we need to wait a bit for the function to create the document)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for initial document creation

      // Try to get the story ID by fetching stories for this kid
      let storyId: string | null = null;
      let attempts = 0;
      while (!storyId && attempts < 5) {
        try {
          const storiesResponse = await StoryApi.getStoriesByKid(currentUser.uid, kidDetails.id);
          if (storiesResponse.success && storiesResponse.data) {
            const stories = storiesResponse.data.stories || [];
            // Find the most recent story that's in progress
            const latestStory = stories
              .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime; // Most recent first
              })
              .find(s => 
                s.status !== StoryStatus.COMPLETE && s.status !== 'completed'
              );
            if (latestStory) {
              storyId = latestStory.id;
              console.log("[QuickGenerateDialog] Found story ID:", storyId);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch stories:", e);
        }
        
        if (!storyId) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      // Poll the story document for real-time progress updates
      if (storyId) {
        progressInterval = setInterval(async () => {
          try {
            const storyResponse = await StoryApi.getStory(storyId);
            if (storyResponse.success && storyResponse.data) {
              const currentStory = storyResponse.data;
              const progress = currentStory.progress || 0;
              
              // Update progress info with real data
              const message = progress < 20 ? "Generating story title..." :
                             progress < 40 ? "Creating story pages..." :
                             progress < 70 ? "Generating image prompts..." :
                             progress < 95 ? "Generating images..." :
                             "Finalizing story...";
              
              setProgressInfo({
                step: Math.floor(progress / 10),
                message,
                percentage: progress
              });

              console.log(`[QuickGenerateDialog] Progress update: ${progress}%`);

              // Stop polling if completed
              if (currentStory.status === 'completed' || progress >= 100) {
                if (progressInterval) clearInterval(progressInterval);
              }
            }
          } catch (e) {
            console.warn("Failed to fetch story progress:", e);
          }
        }, 2000); // Poll every 2 seconds
      }

      // Wait for the function to complete
      const result = await generationPromise;

      if (progressInterval) clearInterval(progressInterval);

      console.log("[QuickGenerateDialog] Story generated successfully:", result);

      // Update progress to 100%
      setProgressInfo({
        step: 10,
        message: t.quickGenerateDialog.progressDialog.storyCompleted,
        percentage: 100
      });

      // Fetch the complete story from Firestore
      const storyResponse = await StoryApi.getStory(result.storyId);
      
      if (storyResponse.success && storyResponse.data) {
        // Notify parent with the complete story
        onStoryCreated(storyResponse.data);
      }

      // Show success toast
      toast({
        title: "Success!",
        description: `Story "${result.title}" created with ${result.imagesGenerated || 0} images!`,
      });
      
      // Reset the inputs after generation completes
      setProblem('');
      setAdvantages('');
      setDisadvantages('');

      // Wait a bit before hiding progress dialog
      setTimeout(() => {
        onGeneratingChange(false);
      }, 1500);
    } catch (error) {
      console.error("Error generating story:", error);
      if (progressInterval) clearInterval(progressInterval);
      onGeneratingChange(false);
      
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const _handleOpenChange = (_open: boolean) => {
    // No action needed here
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full"
            disabled={isGenerating}
          >
            {t.quickGenerateDialog.generateStory}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.quickGenerateDialog.title}</DialogTitle>
            <DialogDescription id="dialog-description">
              {t.quickGenerateDialog.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problem">{t.quickGenerateDialog.problemLabel}</Label>
              <Input
                id="problem"
                placeholder={t.quickGenerateDialog.problemPlaceholder}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advantages">{t.quickGenerateDialog.advantagesLabel}</Label>
              <Input
                id="advantages"
                placeholder={t.quickGenerateDialog.advantagesPlaceholder}
                value={advantages}
                onChange={(e) => setAdvantages(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disadvantages">{t.quickGenerateDialog.disadvantagesLabel}</Label>
              <Input
                id="disadvantages"
                placeholder={t.quickGenerateDialog.disadvantagesPlaceholder}
                value={disadvantages}
                onChange={(e) => setDisadvantages(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!problem.trim()}
            >
              {t.quickGenerateDialog.generateStory}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Dialog - Directly controlled by isGenerating prop */}
      <Dialog 
        open={isGenerating} 
        onOpenChange={(_open) => {
          // Dialog visibility is controlled by parent component via isGenerating prop
          // No action needed here
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.quickGenerateDialog.progressDialog.title}</DialogTitle>
            <DialogDescription>
              {t.quickGenerateDialog.progressDialog.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progressInfo.message}</span>
                <span className="font-medium">{progressInfo.percentage}%</span>
              </div>
              <Progress value={progressInfo.percentage} className="h-2" />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>{t.quickGenerateDialog.progressDialog.subtext2}</p>
              <p className="mt-2">{t.quickGenerateDialog.progressDialog.subtext1}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};