/**
 * AI Story State Management
 * 
 * Enhanced state management for AI-powered story creation
 * that integrates with the new AI bot system and provides
 * better tracking of AI-generated content.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Story, StoryPage, KidDetails, PageType, StoryStatus } from '@/models';
import { AILoadingStateService } from '@/app/services/ai-loading-state.service';

export interface AIStoryGenerationMetadata {
  generatedAt: Date;
  generationMethod: 'ai_bot' | 'legacy';
  prompt?: string;
  model?: string;
  parameters?: Record<string, unknown>;
  retryCount?: number;
}

export interface AIStoryPage extends StoryPage {
  // AI-specific metadata
  aiGenerated?: boolean;
  generationMetadata?: AIStoryGenerationMetadata;
  
  // Image generation tracking
  imageGenerationStatus?: 'pending' | 'generating' | 'completed' | 'failed';
  imageGenerationMetadata?: AIStoryGenerationMetadata;
}

export interface AIStoryState {
  // Core story data
  story: Partial<Story> | null;
  pages: AIStoryPage[];
  
  // Kid details with AI enhancements
  kidDetails: KidDetails | null;
  
  // AI generation status
  storyGenerationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  imageGenerationStatus: Record<string, 'pending' | 'generating' | 'completed' | 'failed'>;
  
  // Generation metadata
  storyGenerationMetadata: AIStoryGenerationMetadata | null;
  
  // Loading operation IDs for tracking
  activeOperations: {
    storyGeneration?: string;
    imageGeneration?: Record<string, string>; // pageId -> operationId
    avatarGeneration?: string;
  };
  
  // Actions
  setStory: (story: Partial<Story>) => void;
  setPages: (pages: AIStoryPage[]) => void;
  updatePage: (pageIndex: number, updates: Partial<AIStoryPage>) => void;
  setKidDetails: (kidDetails: KidDetails) => void;
  
  // AI generation actions
  startStoryGeneration: (metadata: AIStoryGenerationMetadata) => void;
  completeStoryGeneration: (pages: AIStoryPage[], metadata: AIStoryGenerationMetadata) => void;
  failStoryGeneration: (error: string) => void;
  
  startImageGeneration: (pageIndex: number, metadata: AIStoryGenerationMetadata) => void;
  completeImageGeneration: (pageIndex: number, imageUrl: string, metadata: AIStoryGenerationMetadata) => void;
  failImageGeneration: (pageIndex: number, error: string) => void;
  
  // Operation tracking
  setActiveOperation: (type: keyof AIStoryState['activeOperations'], operationId: string, pageId?: string) => void;
  clearActiveOperation: (type: keyof AIStoryState['activeOperations'], pageId?: string) => void;
  
  // Utility functions
  getPageByType: (pageType: PageType) => AIStoryPage | undefined;
  getPagesByType: (pageType: PageType) => AIStoryPage[];
  isAnyImageGenerating: () => boolean;
  getGeneratingImages: () => { pageIndex: number; page: AIStoryPage }[];
  
  // State management
  reset: () => void;
  
  // AI-specific utilities
  markPageAsAIGenerated: (pageIndex: number, metadata: AIStoryGenerationMetadata) => void;
  getAIGeneratedPages: () => AIStoryPage[];
  getStoryCompletionStatus: () => {
    hasStory: boolean;
    hasAllImages: boolean;
    missingImages: PageType[];
    completionPercentage: number;
  };
}

const initialState = {
  story: null,
  pages: [],
  kidDetails: null,
  storyGenerationStatus: 'idle' as const,
  imageGenerationStatus: {},
  storyGenerationMetadata: null,
  activeOperations: {},
};

export const useAIStoryState = create<AIStoryState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    setStory: (story) => {
      set({ story });
    },
    
    setPages: (pages) => {
      // Reset image generation status for new pages
      const imageGenerationStatus: Record<string, 'pending' | 'generating' | 'completed' | 'failed'> = {};
      pages.forEach((page, index) => {
        const pageId = `${page.pageType}_${page.pageNum}`;
        imageGenerationStatus[pageId] = page.selectedImageUrl ? 'completed' : 'pending';
      });
      
      set({ 
        pages,
        imageGenerationStatus
      });
    },
    
    updatePage: (pageIndex, updates) => {
      const pages = [...get().pages];
      if (pages[pageIndex]) {
        pages[pageIndex] = { ...pages[pageIndex], ...updates };
        set({ pages });
      }
    },
    
    setKidDetails: (kidDetails) => {
      set({ kidDetails });
    },
    
    startStoryGeneration: (metadata) => {
      const operationId = AILoadingStateService.startOperation(
        'story_generation',
        'Generating your story with AI...',
        { kidId: get().kidDetails?.id, metadata }
      );
      
      set({
        storyGenerationStatus: 'generating',
        storyGenerationMetadata: metadata,
        activeOperations: {
          ...get().activeOperations,
          storyGeneration: operationId
        }
      });
    },
    
    completeStoryGeneration: (pages, metadata) => {
      const operationId = get().activeOperations.storyGeneration;
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, true, 'Story generated successfully!');
      }
      
      set({
        pages,
        storyGenerationStatus: 'completed',
        storyGenerationMetadata: metadata,
        activeOperations: {
          ...get().activeOperations,
          storyGeneration: undefined
        }
      });
    },
    
    failStoryGeneration: (error) => {
      const operationId = get().activeOperations.storyGeneration;
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, false, undefined, error);
      }
      
      set({
        storyGenerationStatus: 'failed',
        activeOperations: {
          ...get().activeOperations,
          storyGeneration: undefined
        }
      });
    },
    
    startImageGeneration: (pageIndex, metadata) => {
      const page = get().pages[pageIndex];
      if (!page) return;
      
      const pageId = `${page.pageType}_${page.pageNum}`;
      const operationId = AILoadingStateService.startOperation(
        'image_generation',
        `Generating ${page.pageType} image...`,
        { pageId, pageType: page.pageType, metadata }
      );
      
      set({
        imageGenerationStatus: {
          ...get().imageGenerationStatus,
          [pageId]: 'generating'
        },
        activeOperations: {
          ...get().activeOperations,
          imageGeneration: {
            ...get().activeOperations.imageGeneration,
            [pageId]: operationId
          }
        }
      });
    },
    
    completeImageGeneration: (pageIndex, imageUrl, metadata) => {
      const page = get().pages[pageIndex];
      if (!page) return;
      
      const pageId = `${page.pageType}_${page.pageNum}`;
      const operationId = get().activeOperations.imageGeneration?.[pageId];
      
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, true, 'Image generated successfully!');
      }
      
      // Update the page with the new image
      get().updatePage(pageIndex, {
        selectedImageUrl: imageUrl,
        imageGenerationStatus: 'completed',
        imageGenerationMetadata: metadata
      });
      
      set({
        imageGenerationStatus: {
          ...get().imageGenerationStatus,
          [pageId]: 'completed'
        },
        activeOperations: {
          ...get().activeOperations,
          imageGeneration: Object.fromEntries(
            Object.entries(get().activeOperations.imageGeneration || {}).filter(([key]) => key !== pageId)
          )
        }
      });
    },
    
    failImageGeneration: (pageIndex, error) => {
      const page = get().pages[pageIndex];
      if (!page) return;
      
      const pageId = `${page.pageType}_${page.pageNum}`;
      const operationId = get().activeOperations.imageGeneration?.[pageId];
      
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, false, undefined, error);
      }
      
      get().updatePage(pageIndex, {
        imageGenerationStatus: 'failed'
      });
      
      set({
        imageGenerationStatus: {
          ...get().imageGenerationStatus,
          [pageId]: 'failed'
        },
        activeOperations: {
          ...get().activeOperations,
          imageGeneration: Object.fromEntries(
            Object.entries(get().activeOperations.imageGeneration || {}).filter(([key]) => key !== pageId)
          )
        }
      });
    },
    
    setActiveOperation: (type, operationId, pageId) => {
      const activeOperations = { ...get().activeOperations };
      
      if (type === 'imageGeneration' && pageId) {
        activeOperations.imageGeneration = {
          ...activeOperations.imageGeneration,
          [pageId]: operationId
        };
      } else {
        (activeOperations as any)[type] = operationId;
      }
      
      set({ activeOperations });
    },
    
    clearActiveOperation: (type, pageId) => {
      const activeOperations = { ...get().activeOperations };
      
      if (type === 'imageGeneration' && pageId && activeOperations.imageGeneration) {
        const { [pageId]: removed, ...rest } = activeOperations.imageGeneration;
        activeOperations.imageGeneration = rest;
      } else {
        (activeOperations as any)[type] = undefined;
      }
      
      set({ activeOperations });
    },
    
    getPageByType: (pageType) => {
      return get().pages.find(page => page.pageType === pageType);
    },
    
    getPagesByType: (pageType) => {
      return get().pages.filter(page => page.pageType === pageType);
    },
    
    isAnyImageGenerating: () => {
      return Object.values(get().imageGenerationStatus).some(status => status === 'generating');
    },
    
    getGeneratingImages: () => {
      const pages = get().pages;
      const status = get().imageGenerationStatus;
      
      return pages
        .map((page, index) => ({ page, pageIndex: index }))
        .filter(({ page }) => {
          const pageId = `${page.pageType}_${page.pageNum}`;
          return status[pageId] === 'generating';
        });
    },
    
    markPageAsAIGenerated: (pageIndex, metadata) => {
      get().updatePage(pageIndex, {
        aiGenerated: true,
        generationMetadata: metadata
      });
    },
    
    getAIGeneratedPages: () => {
      return get().pages.filter(page => page.aiGenerated);
    },
    
    getStoryCompletionStatus: () => {
      const pages = get().pages;
      const story = get().story;
      
      const hasStory = !!(story?.title && story?.problemDescription && pages.length > 0);
      
      const missingImages: PageType[] = [];
      pages.forEach(page => {
        if (!page.selectedImageUrl) {
          missingImages.push(page.pageType);
        }
      });
      
      const hasAllImages = missingImages.length === 0;
      
      const completionPercentage = pages.length > 0 
        ? Math.round(((pages.length - missingImages.length) / pages.length) * 100)
        : 0;
      
      return {
        hasStory,
        hasAllImages,
        missingImages,
        completionPercentage
      };
    },
    
    reset: () => {
      // Clear any active operations
      const activeOperations = get().activeOperations;
      if (activeOperations.storyGeneration) {
        AILoadingStateService.completeOperation(activeOperations.storyGeneration, false, undefined, 'Operation cancelled');
      }
      
      Object.values(activeOperations.imageGeneration || {}).forEach(operationId => {
        if (operationId) {
          AILoadingStateService.completeOperation(operationId, false, undefined, 'Operation cancelled');
        }
      });
      
      set(initialState);
    }
  }))
);

// Subscribe to state changes for debugging and analytics
useAIStoryState.subscribe(
  (state) => state.storyGenerationStatus,
  (status) => {
    console.log('[AIStoryState] Story generation status changed:', status);
  }
);

useAIStoryState.subscribe(
  (state) => state.pages.length,
  (pageCount) => {
    console.log('[AIStoryState] Page count changed:', pageCount);
  }
);
