/**
 * AI Loading State Service
 * 
 * Provides centralized loading state management for AI operations
 * with progress tracking and user feedback.
 */

import { create } from 'zustand';

export interface AIOperation {
  id: string;
  type: 'story_generation' | 'avatar_generation' | 'image_generation' | 'image_analysis';
  status: 'idle' | 'loading' | 'success' | 'error';
  progress?: number;
  message?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  metadata?: Record<string, unknown>;
}

export interface AILoadingState {
  operations: Record<string, AIOperation>;
  
  // Actions
  startOperation: (operation: Omit<AIOperation, 'id' | 'status' | 'startTime'> & { id?: string }) => string;
  updateOperation: (id: string, updates: Partial<AIOperation>) => void;
  completeOperation: (id: string, success: boolean, message?: string, error?: string) => void;
  removeOperation: (id: string) => void;
  clearCompletedOperations: () => void;
  
  // Selectors
  getOperation: (id: string) => AIOperation | undefined;
  isOperationLoading: (id: string) => boolean;
  getLoadingOperations: () => AIOperation[];
  hasAnyLoading: () => boolean;
  getOperationsByType: (type: AIOperation['type']) => AIOperation[];
}

/**
 * Zustand store for AI loading states
 */
const useAILoadingStore = create<AILoadingState>()((set, get) => ({
  operations: {},
  
  startOperation: (operation) => {
    const id = operation.id || `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newOperation: AIOperation = {
      ...operation,
      id,
      status: 'loading',
      startTime: new Date(),
      progress: operation.progress || 0
    };
    
    set((state) => ({
      operations: {
        ...state.operations,
        [id]: newOperation
      }
    }));
    
    return id;
  },
  
  updateOperation: (id, updates) => {
    set((state) => ({
      operations: {
        ...state.operations,
        [id]: state.operations[id] ? {
          ...state.operations[id],
          ...updates
        } : state.operations[id]
      }
    }));
  },
  
  completeOperation: (id, success, message, error) => {
    set((state) => ({
      operations: {
        ...state.operations,
        [id]: state.operations[id] ? {
          ...state.operations[id],
          status: success ? 'success' : 'error',
          message: message || state.operations[id].message,
          error: error || state.operations[id].error,
          endTime: new Date(),
          progress: success ? 100 : state.operations[id].progress
        } : state.operations[id]
      }
    }));
  },
  
  removeOperation: (id) => {
    set((state) => {
      const { [id]: removed, ...operations } = state.operations;
      return { operations };
    });
  },
  
  clearCompletedOperations: () => {
    set((state) => {
      const operations = Object.fromEntries(
        Object.entries(state.operations).filter(
          ([_, operation]) => operation.status === 'loading'
        )
      );
      return { operations };
    });
  },
  
  getOperation: (id) => {
    return get().operations[id];
  },
  
  isOperationLoading: (id) => {
    const operation = get().operations[id];
    return operation?.status === 'loading';
  },
  
  getLoadingOperations: () => {
    return Object.values(get().operations).filter(op => op.status === 'loading');
  },
  
  hasAnyLoading: () => {
    return Object.values(get().operations).some(op => op.status === 'loading');
  },
  
  getOperationsByType: (type) => {
    return Object.values(get().operations).filter(op => op.type === type);
  }
}));

/**
 * AI Loading State Service
 */
export class AILoadingStateService {
  private static store = useAILoadingStore;

  /**
   * Start tracking an AI operation
   */
  static startOperation(
    type: AIOperation['type'],
    message: string,
    metadata?: Record<string, unknown>
  ): string {
    return this.store.getState().startOperation({
      type,
      message,
      metadata
    });
  }

  /**
   * Update operation progress
   */
  static updateProgress(id: string, progress: number, message?: string): void {
    this.store.getState().updateOperation(id, {
      progress: Math.max(0, Math.min(100, progress)),
      message
    });
  }

  /**
   * Mark operation as completed
   */
  static completeOperation(id: string, success: boolean, message?: string, error?: string): void {
    this.store.getState().completeOperation(id, success, message, error);
    
    // Auto-remove completed operations after a delay
    setTimeout(() => {
      this.store.getState().removeOperation(id);
    }, 5000);
  }

  /**
   * Get operation status
   */
  static getOperationStatus(id: string): AIOperation | undefined {
    return this.store.getState().getOperation(id);
  }

  /**
   * Check if any operations are loading
   */
  static hasLoadingOperations(): boolean {
    return this.store.getState().hasAnyLoading();
  }

  /**
   * Get all loading operations
   */
  static getLoadingOperations(): AIOperation[] {
    return this.store.getState().getLoadingOperations();
  }

  /**
   * Get operations by type
   */
  static getOperationsByType(type: AIOperation['type']): AIOperation[] {
    return this.store.getState().getOperationsByType(type);
  }

  /**
   * Clear all completed operations
   */
  static clearCompleted(): void {
    this.store.getState().clearCompletedOperations();
  }

  /**
   * Get loading message for operation type
   */
  static getLoadingMessage(type: AIOperation['type'], progress?: number): string {
    const progressText = progress ? ` (${Math.round(progress)}%)` : '';
    
    switch (type) {
      case 'story_generation':
        return `Generating your story${progressText}...`;
      case 'avatar_generation':
        return `Creating avatar${progressText}...`;
      case 'image_generation':
        return `Generating image${progressText}...`;
      case 'image_analysis':
        return `Analyzing image${progressText}...`;
      default:
        return `Processing${progressText}...`;
    }
  }

  /**
   * Get estimated time remaining (in seconds)
   */
  static getEstimatedTimeRemaining(id: string): number | null {
    const operation = this.store.getState().getOperation(id);
    
    if (!operation || !operation.startTime || !operation.progress || operation.progress === 0) {
      return null;
    }

    const elapsed = Date.now() - operation.startTime.getTime();
    const progressRate = operation.progress / elapsed; // progress per millisecond
    const remainingProgress = 100 - operation.progress;
    const estimatedRemainingTime = remainingProgress / progressRate;
    
    return Math.max(0, Math.round(estimatedRemainingTime / 1000));
  }

  /**
   * Format time remaining for display
   */
  static formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s remaining`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s remaining`;
    }
  }
}

// Export the store hook for React components
export const useAILoadingState = useAILoadingStore;
