/**
 * AI Avatar State Management
 * 
 * Enhanced state management for AI-powered avatar creation and management
 * that integrates with the new AI bot system.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { KidDetails } from '@/models';
import { AILoadingStateService } from '@/app/services/ai-loading-state.service';

export interface AIAvatarGenerationMetadata {
  generatedAt: Date;
  generationMethod: 'ai_bot' | 'legacy';
  sourceImageUrl?: string;
  sourceImageAnalysis?: string;
  prompt?: string;
  model?: string;
  parameters?: Record<string, unknown>;
  retryCount?: number;
}

export interface AIAvatarData {
  url: string;
  metadata: AIAvatarGenerationMetadata;
  analysis?: string;
  isActive: boolean;
}

export interface AIKidDetails extends KidDetails {
  // AI-enhanced avatar data
  aiAvatars?: AIAvatarData[];
  activeAvatarId?: string;
  
  // AI analysis data
  enhancedImageAnalysis?: string;
  imageAnalysisMetadata?: {
    analyzedAt: Date;
    method: 'ai_bot' | 'legacy';
    confidence?: number;
  };
}

export interface AIAvatarState {
  // Kid details with AI enhancements
  kidDetails: AIKidDetails | null;
  
  // Avatar generation status
  avatarGenerationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  imageAnalysisStatus: 'idle' | 'analyzing' | 'completed' | 'failed';
  
  // Active operations
  activeOperations: {
    avatarGeneration?: string;
    imageAnalysis?: string;
  };
  
  // Generation history
  generationHistory: AIAvatarData[];
  
  // Actions
  setKidDetails: (kidDetails: KidDetails) => void;
  updateKidDetails: (updates: Partial<AIKidDetails>) => void;
  
  // Avatar generation actions
  startAvatarGeneration: (metadata: AIAvatarGenerationMetadata) => void;
  completeAvatarGeneration: (avatarUrl: string, metadata: AIAvatarGenerationMetadata, analysis?: string) => void;
  failAvatarGeneration: (error: string) => void;
  
  // Image analysis actions
  startImageAnalysis: (imageUrl: string) => void;
  completeImageAnalysis: (analysis: string, metadata: NonNullable<AIAvatarState['kidDetails']>['imageAnalysisMetadata']) => void;
  failImageAnalysis: (error: string) => void;
  
  // Avatar management
  addAvatar: (avatarData: AIAvatarData) => void;
  removeAvatar: (avatarUrl: string) => void;
  setActiveAvatar: (avatarUrl: string) => void;
  getActiveAvatar: () => AIAvatarData | undefined;
  
  // Operation tracking
  setActiveOperation: (type: keyof AIAvatarState['activeOperations'], operationId: string) => void;
  clearActiveOperation: (type: keyof AIAvatarState['activeOperations']) => void;
  
  // Utility functions
  hasAnyAvatars: () => boolean;
  getAvatarCount: () => number;
  getLatestAvatar: () => AIAvatarData | undefined;
  canGenerateNewAvatar: () => boolean;
  
  // State management
  reset: () => void;
}

const initialState = {
  kidDetails: null,
  avatarGenerationStatus: 'idle' as const,
  imageAnalysisStatus: 'idle' as const,
  activeOperations: {},
  generationHistory: [],
};

export const useAIAvatarState = create<AIAvatarState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    setKidDetails: (kidDetails) => {
      const enhancedKidDetails: AIKidDetails = {
        ...kidDetails,
        aiAvatars: kidDetails.kidSelectedAvatar ? [{
          url: kidDetails.kidSelectedAvatar,
          metadata: {
            generatedAt: new Date(),
            generationMethod: 'legacy'
          },
          isActive: true
        }] : [],
        enhancedImageAnalysis: kidDetails.imageAnalysis as string,
        imageAnalysisMetadata: kidDetails.imageAnalysis ? {
          analyzedAt: new Date(),
          method: 'legacy'
        } : undefined
      };
      
      set({ kidDetails: enhancedKidDetails });
    },
    
    updateKidDetails: (updates) => {
      const currentKidDetails = get().kidDetails;
      if (currentKidDetails) {
        set({
          kidDetails: {
            ...currentKidDetails,
            ...updates,
            lastUpdated: new Date()
          }
        });
      }
    },
    
    startAvatarGeneration: (metadata) => {
      const operationId = AILoadingStateService.startOperation(
        'avatar_generation',
        'Generating avatar with AI...',
        { kidId: get().kidDetails?.id, metadata }
      );
      
      set({
        avatarGenerationStatus: 'generating',
        activeOperations: {
          ...get().activeOperations,
          avatarGeneration: operationId
        }
      });
    },
    
    completeAvatarGeneration: (avatarUrl, metadata, analysis) => {
      const operationId = get().activeOperations.avatarGeneration;
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, true, 'Avatar generated successfully!');
      }
      
      const avatarData: AIAvatarData = {
        url: avatarUrl,
        metadata,
        analysis,
        isActive: true
      };
      
      // Add to generation history
      const history = [...get().generationHistory, avatarData];
      
      // Update kid details
      get().updateKidDetails({
        kidSelectedAvatar: avatarUrl,
        aiAvatars: [...(get().kidDetails?.aiAvatars || []), avatarData].map(avatar => ({
          ...avatar,
          isActive: avatar.url === avatarUrl
        })),
        enhancedImageAnalysis: analysis || get().kidDetails?.enhancedImageAnalysis
      });
      
      set({
        avatarGenerationStatus: 'completed',
        generationHistory: history,
        activeOperations: {
          ...get().activeOperations,
          avatarGeneration: undefined
        }
      });
    },
    
    failAvatarGeneration: (error) => {
      const operationId = get().activeOperations.avatarGeneration;
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, false, undefined, error);
      }
      
      set({
        avatarGenerationStatus: 'failed',
        activeOperations: {
          ...get().activeOperations,
          avatarGeneration: undefined
        }
      });
    },
    
    startImageAnalysis: (imageUrl) => {
      const operationId = AILoadingStateService.startOperation(
        'image_analysis',
        'Analyzing image for avatar generation...',
        { kidId: get().kidDetails?.id, imageUrl }
      );
      
      set({
        imageAnalysisStatus: 'analyzing',
        activeOperations: {
          ...get().activeOperations,
          imageAnalysis: operationId
        }
      });
    },
    
    completeImageAnalysis: (analysis, metadata) => {
      const operationId = get().activeOperations.imageAnalysis;
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, true, 'Image analysis completed!');
      }
      
      get().updateKidDetails({
        enhancedImageAnalysis: analysis,
        imageAnalysisMetadata: metadata
      });
      
      set({
        imageAnalysisStatus: 'completed',
        activeOperations: {
          ...get().activeOperations,
          imageAnalysis: undefined
        }
      });
    },
    
    failImageAnalysis: (error) => {
      const operationId = get().activeOperations.imageAnalysis;
      if (operationId) {
        AILoadingStateService.completeOperation(operationId, false, undefined, error);
      }
      
      set({
        imageAnalysisStatus: 'failed',
        activeOperations: {
          ...get().activeOperations,
          imageAnalysis: undefined
        }
      });
    },
    
    addAvatar: (avatarData) => {
      const currentAvatars = get().kidDetails?.aiAvatars || [];
      const updatedAvatars = [...currentAvatars, avatarData];
      
      get().updateKidDetails({
        aiAvatars: updatedAvatars
      });
      
      set({
        generationHistory: [...get().generationHistory, avatarData]
      });
    },
    
    removeAvatar: (avatarUrl) => {
      const currentAvatars = get().kidDetails?.aiAvatars || [];
      const updatedAvatars = currentAvatars.filter(avatar => avatar.url !== avatarUrl);
      
      get().updateKidDetails({
        aiAvatars: updatedAvatars,
        kidSelectedAvatar: get().kidDetails?.kidSelectedAvatar === avatarUrl 
          ? updatedAvatars.find(a => a.isActive)?.url || undefined
          : get().kidDetails?.kidSelectedAvatar
      });
    },
    
    setActiveAvatar: (avatarUrl) => {
      const currentAvatars = get().kidDetails?.aiAvatars || [];
      const updatedAvatars = currentAvatars.map(avatar => ({
        ...avatar,
        isActive: avatar.url === avatarUrl
      }));
      
      get().updateKidDetails({
        aiAvatars: updatedAvatars,
        kidSelectedAvatar: avatarUrl
      });
    },
    
    getActiveAvatar: () => {
      return get().kidDetails?.aiAvatars?.find(avatar => avatar.isActive);
    },
    
    setActiveOperation: (type, operationId) => {
      set({
        activeOperations: {
          ...get().activeOperations,
          [type]: operationId
        }
      });
    },
    
    clearActiveOperation: (type) => {
      set({
        activeOperations: {
          ...get().activeOperations,
          [type]: undefined
        }
      });
    },
    
    hasAnyAvatars: () => {
      return (get().kidDetails?.aiAvatars?.length || 0) > 0;
    },
    
    getAvatarCount: () => {
      return get().kidDetails?.aiAvatars?.length || 0;
    },
    
    getLatestAvatar: () => {
      const avatars = get().kidDetails?.aiAvatars || [];
      return avatars.length > 0 ? avatars[avatars.length - 1] : undefined;
    },
    
    canGenerateNewAvatar: () => {
      const kidDetails = get().kidDetails;
      const isGenerating = get().avatarGenerationStatus === 'generating';
      
      return !!(kidDetails?.name && kidDetails?.age && kidDetails?.gender && !isGenerating);
    },
    
    reset: () => {
      // Clear any active operations
      const activeOperations = get().activeOperations;
      
      if (activeOperations.avatarGeneration) {
        AILoadingStateService.completeOperation(activeOperations.avatarGeneration, false, undefined, 'Operation cancelled');
      }
      
      if (activeOperations.imageAnalysis) {
        AILoadingStateService.completeOperation(activeOperations.imageAnalysis, false, undefined, 'Operation cancelled');
      }
      
      set(initialState);
    }
  }))
);

// Subscribe to state changes for debugging and analytics
useAIAvatarState.subscribe(
  (state) => state.avatarGenerationStatus,
  (status) => {
    console.log('[AIAvatarState] Avatar generation status changed:', status);
  }
);

useAIAvatarState.subscribe(
  (state) => state.kidDetails?.aiAvatars?.length || 0,
  (avatarCount) => {
    console.log('[AIAvatarState] Avatar count changed:', avatarCount);
  }
);
