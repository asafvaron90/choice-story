"use client";

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/hooks/useTranslation";
import { toast } from "@/components/ui/use-toast";
import { Share2, Copy, Check, BookOpen } from "lucide-react";
import { Story } from "@/models";

interface StoryActionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  story: Story;
}

export const StoryActionsModal: FC<StoryActionsModalProps> = ({
  isOpen,
  onOpenChange,
  story,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleReadStory = () => {
    router.push(`/story/${story.id}`);
    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/story/${story.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: t.storyActions.linkCopiedTitle,
        description: t.storyActions.linkCopiedDescription,
        variant: "default",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Error",
        description: t.storyActions.copyError,
        variant: "destructive",
      });
    }
  };

  const handleShareStory = async () => {
    const shareUrl = `${window.location.origin}/story/${story.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: story.title || "Story",
          text: story.problemDescription || "Check out this story!",
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", error);
      }
    } else {
      // Fallback to copy link if Web Share API is not supported
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.storyActions.title}</DialogTitle>
          <DialogDescription>
            {story.title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleReadStory}
            className="w-full flex items-center gap-2"
            size="lg"
          >
            <BookOpen size={20} />
            {t.storyActions.read}
          </Button>
          <Button
            onClick={handleShareStory}
            variant="outline"
            className="w-full flex items-center gap-2"
            size="lg"
          >
            <Share2 size={20} />
            {t.storyActions.share}
          </Button>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full flex items-center gap-2"
            size="lg"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {t.storyActions.copyLink}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

