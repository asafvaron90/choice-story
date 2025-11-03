import { StoryPage, PageType, Story, StoryStatus } from '@/models';

interface StoryState {
  problemDescription: string;
  selectedTitle: string | null;
  titles: string[];
  pages: StoryPage[] | null;
  advantages: string;
  disadvantages: string;
  isGeneratingTitles: boolean;
  isGeneratingStory: boolean;
  isSavingStory: boolean;
  error: string | null;
}

export type StoryAction =
  | { type: 'SET_PROBLEM_DESCRIPTION'; payload: string }
  | { type: 'SET_SELECTED_TITLE'; payload: string }
  | { type: 'SET_TITLES'; payload: string[] }
  | { type: 'SET_PAGES'; payload: StoryPage[] }
  | { type: 'SET_ADVANTAGES'; payload: string }
  | { type: 'SET_DISADVANTAGES'; payload: string }
  | { type: 'SET_GENERATING_TITLES'; payload: boolean }
  | { type: 'SET_GENERATING_STORY'; payload: boolean }
  | { type: 'SET_SAVING_STORY'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_PAGE_IMAGE'; payload: { pageType: PageType; imageUrl: string } };

export const initialStoryState: StoryState = {
  problemDescription: '',
  selectedTitle: null,
  titles: [],
  pages: null,
  advantages: '',
  disadvantages: '',
  isGeneratingTitles: false,
  isGeneratingStory: false,
  isSavingStory: false,
  error: null,
};

// Debounce utility function
const _debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const storyReducer = (state: StoryState, action: StoryAction): StoryState => {
  switch (action.type) {
    case 'SET_PROBLEM_DESCRIPTION':
      return { ...state, problemDescription: action.payload };
    
    case 'SET_SELECTED_TITLE':
      return { ...state, selectedTitle: action.payload };
    
    case 'SET_TITLES':
      return { ...state, titles: action.payload };
    
    case 'SET_PAGES':
      return { ...state, pages: action.payload };
    
    case 'SET_ADVANTAGES':
      return { ...state, advantages: action.payload };
    
    case 'SET_DISADVANTAGES':
      return { ...state, disadvantages: action.payload };
    
    case 'SET_GENERATING_TITLES':
      return { ...state, isGeneratingTitles: action.payload };
    
    case 'SET_GENERATING_STORY':
      return { ...state, isGeneratingStory: action.payload };
    
    case 'SET_SAVING_STORY':
      return { ...state, isSavingStory: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'UPDATE_PAGE_IMAGE':
      if (!state.pages) return state;
      
      // Add safety check to prevent unnecessary updates
      const existingPage = state.pages.find(page => page.pageType === action.payload.pageType);
      if (existingPage?.selectedImageUrl === action.payload.imageUrl) {
        console.log(`Skipping update for ${action.payload.pageType} - image URL unchanged`);
        return state;
      }
      
      console.log(`Updating page image for ${action.payload.pageType}:`, action.payload.imageUrl);
      
      return {
        ...state,
        pages: state.pages.map(page => 
          page.pageType === action.payload.pageType
            ? { ...page, selectedImageUrl: action.payload.imageUrl }
            : page
        )
      };
    
    default:
      return state;
  }
};

export const createEmptyStory = (userId: string, kidId: string): Story => ({
  id: '',
  title: '',
  pages: [],
  kidId,
  userId,
  problemDescription: '',
  advantages: '',
  disadvantages: '',
  status: StoryStatus.INCOMPLETE,
  createdAt: new Date(),
  lastUpdated: new Date()
}); 