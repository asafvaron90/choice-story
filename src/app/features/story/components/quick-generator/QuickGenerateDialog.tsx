import { FC, useState } from 'react';
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
import { Story, StoryStatus, KidDetails, Account } from '@/models';
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from '@/app/hooks/useTranslation';
import functionClientAPI from '@/app/network/functions/FunctionClientAPI';
import { StoryApi } from '@/app/network';
import { getFirebaseEnvironment } from '@/config/build-config';
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface QuickGenerateDialogProps {
  kidDetails: KidDetails;
  currentUser: Account;
  onStoryCreated: (story: Story) => void;
  isGenerating: boolean;
  onGeneratingChange: (isGenerating: boolean) => void;
}

export const QuickGenerateDialog: FC<QuickGenerateDialogProps> = ({
  kidDetails,
  currentUser,
  onStoryCreated,
  isGenerating,
  onGeneratingChange,
}) => {
  const [problem, setProblem] = useState('');
  const [advantagesInput, setAdvantagesInput] = useState('');
  const [disadvantagesInput, setDisadvantagesInput] = useState('');
  const [advantagesList, setAdvantagesList] = useState<string[]>([]);
  const [disadvantagesList, setDisadvantagesList] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const formatList = (items: string[]) => {
    if (!items.length) return '';
    return `[${items.join(', ')}]`;
  };

  const handleAddAdvantage = () => {
    const value = advantagesInput.trim();
    if (!value) return;

    setAdvantagesList(prev => [...prev, value]);
    setAdvantagesInput('');
  };

  const handleRemoveAdvantage = (index: number) => {
    setAdvantagesList(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDisadvantage = () => {
    const value = disadvantagesInput.trim();
    if (!value) return;

    setDisadvantagesList(prev => [...prev, value]);
    setDisadvantagesInput('');
  };

  const handleRemoveDisadvantage = (index: number) => {
    setDisadvantagesList(prev => prev.filter((_, i) => i !== index));
  };

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
    onGeneratingChange(true); // Mark as generating (for button state, etc.)

    // Show toast notification for 3 seconds
    toast({
      title: "Story Generation Started",
      description: "Your story is generating, we will notify you once it's ready",
      duration: 3000,
    });

    try {
      const formattedAdvantages = formatList(advantagesList);
      const formattedDisadvantages = formatList(disadvantagesList);

      console.log("[QuickGenerateDialog] Calling generateFullStory with:", {
        userId: currentUser.uid,
        kidId: kidDetails.id,
        problemDescription: problem,
        advantages: formattedAdvantages,
        disadvantages: formattedDisadvantages
      });

      // Call the Firebase function to generate the story
      const result = await functionClientAPI.generateFullStory({
        userId: currentUser.uid,
        kidId: kidDetails.id,
        problemDescription: problem,
        advantages: formattedAdvantages || undefined,
        disadvantages: formattedDisadvantages || undefined
      });

      console.log("[QuickGenerateDialog] Story generated successfully:", result);

      // Fetch the complete story from Firestore
      const storyResponse = await StoryApi.getStoryById(result.storyId);
      
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
      setAdvantagesInput('');
      setDisadvantagesInput('');
      setAdvantagesList([]);
      setDisadvantagesList([]);

      // Mark as no longer generating
      onGeneratingChange(false);
    } catch (error) {
      console.error("Error generating story:", error);
      onGeneratingChange(false);
      
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
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
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {advantagesList.map((advantage, index) => (
                  <Badge key={`${advantage}-${index}`} variant="secondary" className="flex items-center gap-1">
                    <span>{advantage}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdvantage(index)}
                      className="ml-1 rounded-full p-0.5 hover:bg-secondary/80"
                      aria-label={`Remove advantage ${advantage}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="advantages"
                  placeholder={t.quickGenerateDialog.advantagesPlaceholder}
                  value={advantagesInput}
                  onChange={(e) => setAdvantagesInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddAdvantage();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddAdvantage} disabled={!advantagesInput.trim()}>
                  {t.quickGenerateDialog.add || 'Add'}
                </Button>
              </div>
            </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disadvantages">{t.quickGenerateDialog.disadvantagesLabel}</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {disadvantagesList.map((disadvantage, index) => (
                  <Badge key={`${disadvantage}-${index}`} variant="secondary" className="flex items-center gap-1">
                    <span>{disadvantage}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDisadvantage(index)}
                      className="ml-1 rounded-full p-0.5 hover:bg-secondary/80"
                      aria-label={`Remove disadvantage ${disadvantage}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="disadvantages"
                  placeholder={t.quickGenerateDialog.disadvantagesPlaceholder}
                  value={disadvantagesInput}
                  onChange={(e) => setDisadvantagesInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddDisadvantage();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddDisadvantage} disabled={!disadvantagesInput.trim()}>
                  {t.quickGenerateDialog.add || 'Add'}
                </Button>
              </div>
            </div>
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
    </>
  );
};