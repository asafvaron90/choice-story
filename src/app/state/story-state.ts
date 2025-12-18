import { create } from 'zustand';
import { Story } from '@/models';

interface StoryState {
  // State
  currentStory: Story | null;
  
  // Actions
  setCurrentStory: (story: Story) => void;
  clearCurrentStory: () => void;
}

const useStoryState = create<StoryState>((set) => ({
  // Initial state
  currentStory: null,
  
  // Actions
  setCurrentStory: (story) => set({ currentStory: story }),
  clearCurrentStory: () => set({ currentStory: null }),
}));

export default useStoryState;
