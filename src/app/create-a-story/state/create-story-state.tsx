import { StoryPage, PageType, KidDetails} from "@/models";
import { create } from "zustand";

// Extended KidDetails type that ensures id is non-null for this flow
type KidDetailsWithId = KidDetails & { id: string };

interface CreateStoryState {
  // Kid details from create-a-kid process (non-nullable - must exist in create-a-story flow)
  kidDetails: KidDetailsWithId | null;
  setKidDetails: (kidDetails: KidDetails | null) => void;
  
  // Story content
  problemDescription: string | null;
  setProblemDescription: (problemDescription: string) => void;
  titles: string[] | null;
  setTitles: (titles: string[]) => Promise<void>;
  selectedTitle: string | null;
  setSelectedTitle: (title: string) => void;
  advantages: string | null;
  setAdvantages: (advantages: string) => void;
  disadvantages: string | null;
  setDisadvantages: (disadvantages: string) => void;
  pages: StoryPage[] | null;
  setPages: (pages: StoryPage[] | null) => void;
  bookCover: unknown;
  setBookCover: (cover: unknown) => void;
  isGeneratingStory: boolean;
  setIsGeneratingStory: (isGenerating: boolean) => void;
  
  // Clear state
  reset: () => void;
}

const useCreateStoryState = create<CreateStoryState>()((set, _get) => ({
  // Initialize with null to indicate no kid is selected yet
  kidDetails: null,
  setKidDetails: (kidDetails: KidDetails | null) => {
    console.log("Setting kid details in create-story state...", kidDetails);
    // Ensure kid has an id
    if (!kidDetails?.id) {
      console.error("Kid ID is required in create-a-story flow or kidDetails is null");
      set({ kidDetails: null });
      return;
    }
    set({ kidDetails: kidDetails as KidDetailsWithId });
  },
  
  problemDescription: null,
  setProblemDescription: async (problemDescription: string) => {
    set({ problemDescription });
  },
  titles: null,
  setTitles: async (titles: string[]) => {
    set({ titles });
  },
  selectedTitle: null,
  setSelectedTitle: async (title: string) => {
    set({ selectedTitle: title });
  },
  advantages: null,
  setAdvantages: async (advantages: string) => {
    set({ advantages });
  },
  disadvantages: null,
  setDisadvantages: async (disadvantages: string) => {
    set({ disadvantages });
  },
  pages: null,
  setPages: async (pages: StoryPage[] | null) => {
    // Make sure pages are properly updated, especially for choice pages
    if (pages) {
      // Log to debug state update
      console.log("Setting pages in create-story state:", 
        pages.map(p => ({
          type: p.pageType,
          num: p.pageNum,
          text: p.storyText.substring(0, 30) + "...",
          hasImage: !!p.selectedImageUrl
        }))
      );
      
      // Check if choice pages have images
      const goodChoice = pages.find(p => p.pageType === PageType.GOOD_CHOICE);
      const badChoice = pages.find(p => p.pageType === PageType.BAD_CHOICE);
      
      if (goodChoice) {
        console.log("Good choice has image:", !!goodChoice.selectedImageUrl);
      }
      
      if (badChoice) {
        console.log("Bad choice has image:", !!badChoice.selectedImageUrl);
      }
    }
    
    set({ pages });
  },
  bookCover: null,
  setBookCover: async (cover: unknown) => {
    set({ bookCover: cover });
  },

  isGeneratingStory: false,
  setIsGeneratingStory: (isGenerating: boolean) => {
    set({ isGeneratingStory: isGenerating });
  },
  
  // Reset state
  reset: () => set({
    kidDetails: null,
    problemDescription: null,
    titles: null,
    selectedTitle: null,
    advantages: null,
    disadvantages: null,
    pages: null,
    bookCover: null,
    isGeneratingStory: false
  }),
}));

export default useCreateStoryState;
