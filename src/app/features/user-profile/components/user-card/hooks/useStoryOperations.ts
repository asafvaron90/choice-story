import { useState, useCallback, useEffect } from 'react';
import { StoryApi } from '@/app/network';
import { Story } from '@/models';
import { toast } from "@/components/ui/use-toast";

/**
 * Custom hook to manage story operations for a specific kid
 */
const useStoryOperations = (kidId: string, userId?: string) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchStories = useCallback(async (force = false) => {
    if (!userId) return;
    
    // Don't refetch if we already have data unless forced
    if (hasFetched && stories.length > 0 && !force) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await StoryApi.getStoriesByKid(userId, kidId);
      
      if (!response.success || !response.data) {
        throw new Error(
          'error' in response ? response.error : 'Failed to fetch stories'
        );
      }
      
      setStories(response.data.stories);
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching stories:', error);
      // Set empty stories array on error
      setStories([]);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, kidId, hasFetched, stories.length]);

  const deleteStory = async (storyId: string) => {
    if (!userId || !window.confirm('Are you sure you want to delete this story?')) return;

    try {
      const storyToDelete = stories.find(s => s.id === storyId);
      if (!storyToDelete) throw new Error('Story not found');

      const response = await StoryApi.deleteStory(userId, storyId, kidId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete story');
      }

      // Update the local state immediately
      setStories(prev => prev.filter(s => s.id !== storyId));

      toast({ title: "Success", description: "Story deleted successfully" });
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: "Error",
        description: "Failed to delete story. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Polling removed - users can manually refresh to check story generation status

  // Fetch stories only once on mount
  useEffect(() => {
    if (!hasFetched) {
      fetchStories();
    }
  }, [hasFetched, fetchStories]);

  return { 
    stories, 
    isLoading, 
    deleteStory, 
    setStories, 
    fetchStories
  };
};

export default useStoryOperations; 