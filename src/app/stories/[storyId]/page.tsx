"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Story, KidDetails, StoryPage } from '@/models';
import { useAuth } from '@/app/context/AuthContext';
import { StoryApi } from '@/app/network/StoryApi';
import useKidsState from '@/app/state/kids-state';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';
import ErrorMessage from '@/app/components/ui/ErrorMessage';
import { StoryPageCard } from '@/app/features/story/components/story/StoryPageCard';
import { useTranslation } from '@/app/hooks/useTranslation';
import { toast } from '@/components/ui/use-toast';

export default function StoryPageComponent() {
  const { storyId, kidId } = useParams();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { fetchKidById } = useKidsState();
  const { t } = useTranslation();
   
  // Core state
  const [story, setStory] = useState<Story | null>(null);
  const [kid, setKid] = useState<KidDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error('Story not found');
      }
      
      // The response can either be a Story directly or wrapped in a GenerateStoryResponse
      const storyData = ('story' in response.data ? response.data.story : response.data) as Story;
      setStory(storyData);
      
      if (storyData.kidId || kidId) {
        const kidIdToUse = storyData.kidId || String(kidId);
        const kidData = await fetchKidById(currentUser.uid, kidIdToUse);
        if (kidData) setKid(kidData);
      }
      
      return storyData;
    } catch (error) {
      console.error('Error fetching story:', error);
      setError('Failed to load story data');
    } finally {
      setLoading(false);
    }
  }, [storyId, currentUser, kidId, fetchKidById]);

  // Force re-fetch when storyId changes (e.g., browser back button)
  useEffect(() => {
    if (storyId && currentUser) {
      fetchStoryData();
    }
  }, [storyId, currentUser, fetchStoryData]);

  // Handler for saving story to server
  const handleSaveStory = async (updatedStory: Story) => {
    if (!currentUser) {
      return;
    }
    
    try {
      // Save the entire story with all changes
      const response = await StoryApi.uploadStory(updatedStory);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save story');
      }

      if (!response.data) {
        throw new Error('Failed to save story');
      }

      // Update the local state with the returned story data
      const savedStory = response.data.story;
      if (savedStory) {
        setStory(savedStory);
      }
      
      // Show success message
      toast({
        title: "Success",
        description: "Story saved successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving story:', error);
      
      // Show error message
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save story',
        variant: "destructive",
      });
    }
  };

  if (loading || authLoading) return <LoadingIndicator message={t.dashboard.refreshing} />;
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <ErrorMessage message={t.dashboard.tryAgain} />
        <div className="mt-6 flex justify-center gap-4">
          <button 
            onClick={fetchStoryData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            {t.dashboard.tryAgain}
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
            {t.dashboard.title}
          </button>
        </div>
      </div>
    );
  }

  if (!story) return <LoadingIndicator />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">{story.title}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto mb-6">{story.problemDescription}</p>
        <button
          onClick={() => router.push(`/stories/${storyId}/read?kidId=${story.kidId}`)}
          className="px-6 py-2 rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md"
        >
          {t.story.readStory}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {story.pages.map((page) => (
          <StoryPageCard 
            key={getPageId(page)}
            page={page}
            story={story}
            kid={kid}
            useAIBots={true} // Enable new AI bot system for Phase 2
            onPageUpdate={async (updatedPage) => {
              // Optimistically update local state for immediate UI feedback
              const updatedStory = {
                ...story,
                pages: story.pages.map(p => 
                  p.pageNum === updatedPage.pageNum && p.pageType === updatedPage.pageType ? updatedPage : p
                )
              };
              setStory(updatedStory);
              
              // Save the entire story (Firebase function handles image updates automatically)
              handleSaveStory(updatedStory);
            }}
          />
        ))}
      </div>
    </div>
  );
} 