"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Story, KidDetails, StoryPage } from "@/models";
import { useAuth } from "@/app/context/AuthContext";
import { StoryApi } from "@/app/network/StoryApi";
import useKidsState from "@/app/state/kids-state";
import LoadingIndicator from "@/app/components/ui/LoadingIndicator";
import ErrorMessage from "@/app/components/ui/ErrorMessage";
import {
  StoryPageCard,
  StoryPageCardHandle,
} from "@/app/features/story/components/story/StoryPageCard";
import { useTranslation } from "@/app/hooks/useTranslation";
import { toast } from "@/components/ui/use-toast";
import { Share2, Copy, Check } from "lucide-react";
import { Header } from "@/app/components/common/Header";

export default function StoryPageComponent() {
  const { storyId, kidId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  const { fetchKidById } = useKidsState();
  const { t } = useTranslation();

  // Core state
  const [story, setStory] = useState<Story | null>(null);
  const [kid, setKid] = useState<KidDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const storyPageRefs = useRef<Record<string, StoryPageCardHandle | null>>({});
  const autoGenerateTriggered = useRef(false);

  // Helper function to create a unique page identifier
  const getPageId = (page: StoryPage) => `${page.pageNum}-${page.pageType}`;

  // Fetch story data function
  const fetchStoryData = useCallback(async () => {
    if (!storyId || !currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const response = await StoryApi.getStoryById(String(storyId));

      if (!response.success) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error("Story not found");
      }

      // The response can either be a Story directly or wrapped in a GenerateStoryResponse
      const storyData = (
        "story" in response.data ? response.data.story : response.data
      ) as Story;
      setStory(storyData);

      if (storyData.kidId || kidId) {
        const kidIdToUse = storyData.kidId || String(kidId);
        const kidData = await fetchKidById(kidIdToUse);
        if (kidData) setKid(kidData);
      }

      return storyData;
    } catch (error) {
      console.error("Error fetching story:", error);
      setError("Failed to load story data");
    } finally {
      setLoading(false);
    }
  }, [storyId, currentUser, kidId, fetchKidById]);

  // Handler for generating missing images
  const handleGenerateMissingImages = useCallback(() => {
    if (!currentUser || !kid || !story) {
      return;
    }

    story.pages.forEach((page) => {
      if (page.selectedImageUrl) {
        return;
      }

      const pageId = getPageId(page);
      const cardHandle = storyPageRefs.current[pageId];

      // Skip if already generating
      if (cardHandle?.isGenerating()) {
        return;
      }

      cardHandle?.triggerGenerateImage();
    });
  }, [currentUser, kid, story]);

  // Force re-fetch when storyId changes (e.g., browser back button)
  useEffect(() => {
    if (storyId && currentUser) {
      fetchStoryData();
    }
  }, [storyId, currentUser, fetchStoryData]);

  // Auto-trigger image generation when coming from create-a-story
  useEffect(() => {
    const shouldAutoGenerate = searchParams.get('autoGenerate') === 'true';

    if (
      shouldAutoGenerate &&
      !autoGenerateTriggered.current &&
      story &&
      kid &&
      currentUser &&
      !loading
    ) {
      const hasMissingImages = story.pages.some((page) => !page.selectedImageUrl);

      if (hasMissingImages) {
        // Mark as triggered to prevent multiple runs
        autoGenerateTriggered.current = true;

        // Small delay to ensure all refs are set
        setTimeout(() => {
          handleGenerateMissingImages();
        }, 500);
      }
    }
  }, [story, kid, currentUser, loading, searchParams, handleGenerateMissingImages]);

  // Handler for copying story link
  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/story/${storyId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: t.storyPage.linkCopiedToastTitle,
        description: t.storyPage.linkCopiedToastDescription,
        variant: "default",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: t.common.error,
        description: t.storyPage.failedToCopyLink,
        variant: "destructive",
      });
    }
  };

  // Handler for sharing story
  const handleShareStory = async () => {
    const shareUrl = `${window.location.origin}/story/${storyId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          url: shareUrl
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

  // Handler for saving story to server
  const handleSaveStory = async (updatedStory: Story) => {
    if (!currentUser) {
      return;
    }

    try {
      // Save the entire story with all changes
      const response = await StoryApi.uploadStory(updatedStory);

      if (!response.success) {
        throw new Error(response.error || "Failed to save story");
      }

      if (!response.data) {
        throw new Error("Failed to save story");
      }

      // Update the local state with the returned story data
      const savedStory = response.data.story;
      if (savedStory) {
        setStory(savedStory);
      }

      // Show success message
      toast({
        title: t.common.success,
        description: t.storyPage.storySavedSuccessfully,
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving story:", error);

      // Show error message
      toast({
        title: t.common.error,
        description:
          error instanceof Error ? error.message : t.storyPage.failedToSaveStory,
        variant: "destructive",
      });
    }
  };

  if (loading || authLoading)
    return (
      <>
        <Header />
        <LoadingIndicator message={t.dashboard.refreshing} />
      </>
    );
  if (error) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8 mt-16 max-w-6xl text-center">
          <ErrorMessage message={t.dashboard.tryAgain} />
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={fetchStoryData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t.dashboard.tryAgain}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {t.dashboard.title}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!story) return (
    <>
      <Header />
      <LoadingIndicator />
    </>
  );

  const isMissingImages =
    currentUser && kid && story.pages.some((page) => !page.selectedImageUrl);

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">{story.title}</h1>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            {story.problemDescription}
          </p>

          {/* Auto Generate Button - missing images */}
          {isMissingImages && (
            <div className="my-8 flex justify-center">
              <button
                onClick={handleGenerateMissingImages}
                className="px-6 py-3 rounded-md bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!story.pages.some((page) => !page.selectedImageUrl)}
              >
                {t.storyPage.generateMissingImages}
              </button>
            </div>
          )}

          {/* 3 Action buttons (Copy, Share, Read) */}
          {!isMissingImages && (
            <div className="flex flex-wrap items-center justify-center gap-3 py-8">
              <button
                onClick={() => router.push(`/story/${storyId}`)}
                className="px-6 py-2 rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md"
              >
                {t.story.readStory}
              </button>
              <button
                onClick={handleShareStory}
                className="px-6 py-2 rounded-md bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
              >
                <Share2 size={18} />
                {t.story.share}
              </button>
              <button
                onClick={handleCopyLink}
                className="px-6 py-2 rounded-md bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors shadow-md flex items-center gap-2"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? `${t.story.linkCopied}` : `${t.story.copyLink}`}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {story.pages.map((page) => (
            <StoryPageCard
              key={getPageId(page)}
              ref={(ref) => {
                const pageId = getPageId(page);
                if (ref) {
                  storyPageRefs.current[pageId] = ref;
                } else {
                  delete storyPageRefs.current[pageId];
                }
              }}
              page={page}
              story={story}
              kid={kid}
              useAIBots={true} // Enable new AI bot system for Phase 2
              onPageUpdate={(updatedPage, options) => {
                let updatedStory: Story | null = null;

                // Optimistically update local state for immediate UI feedback
                setStory((prevStory) => {
                  if (!prevStory) {
                    return prevStory;
                  }

                  const updatedPages = prevStory.pages.map((p) =>
                    p.pageNum === updatedPage.pageNum &&
                      p.pageType === updatedPage.pageType
                      ? updatedPage
                      : p
                  );

                  updatedStory = {
                    ...prevStory,
                    pages: updatedPages,
                  };

                  return updatedStory;
                });

                // Skip saving if the update was already persisted server-side (e.g., image generation)
                if (!options?.skipPersist && updatedStory) {
                  void handleSaveStory(updatedStory);
                }
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
