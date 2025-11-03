import { getAuth } from 'firebase/auth';
import { StoryApi } from '@/app/network/StoryApi';
import { Story, StoryStatus } from '@/models';

/**
 * Central service for story operations - creation, updates, and image handling
 * Uses StoryApi instead of direct API calls
 */
export class StoryService {
  /**
   * Get the current user's ID token for authorization
   * @returns Promise that resolves to the ID token or null if no user is signed in
   */
  private static async getCurrentUserIdToken(): Promise<string | null> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.warn('No user signed in when trying to get ID token');
        return null;
      }
      
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }
  
  /**
   * Helper to prepare headers with authorization token
   * @returns Headers object with Authorization if token is available
   */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    const idToken = await this.getCurrentUserIdToken();
    
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    
    return headers;
  }

  /**
   * Ensures a story object has all required fields with proper types
   * This helps prevent errors when accessing story properties
   * 
   * @param story The story object to normalize
   * @returns A normalized story object with all required fields
   */
  static normalizeStory(story: Partial<Story>): Story {
    if (!story) {
      return {
        id: '',
        kidId: '',
        userId: '',
        title: 'Untitled Story',
        problemDescription: '',
        advantages: '',
        disadvantages: '',
        status: StoryStatus.GENERATING,
        pages: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      };
    }
    
    // Return a normalized version with all required fields
    return {
      id: story.id || '',
      kidId: story.kidId || '',
      userId: story.userId || '',
      title: story.title || 'Untitled Story',
      problemDescription: story.problemDescription || '',
      advantages: story.advantages || '',
      disadvantages: story.disadvantages || '',
      status: story.status || StoryStatus.GENERATING,
      // Ensure arrays are actually arrays
      pages: Array.isArray(story.pages) ? story.pages : [],
      // Preserve date objects or create new ones
      createdAt: story.createdAt || new Date(),
      lastUpdated: story.lastUpdated || new Date()
    };
  }

  /**
   * Creates a new story with both Firestore document and images
   * 
   * @param storyData The story data following the domain model
   * @returns The complete saved story with Firebase Storage URLs
   */
  static async createStory(
    storyData: Story
  ): Promise<Story> {
    console.log('Creating story with data:', {
      title: storyData.title,
      problemDescription: storyData.problemDescription,
      pagesCount: storyData.pages.length
    });
    
    // Validate inputs
    if (!storyData.userId) throw new Error('Missing user ID');
    if (!storyData.kidId) throw new Error('Missing kid ID');
    if (!storyData.title) throw new Error('Missing story title');
    if (!storyData.problemDescription) throw new Error('Missing problem description');
    if (storyData.pages.length < 1) throw new Error('Missing pages');
    
    try {
      // Use StoryApi to create the story
      const response = await StoryApi.uploadStory(storyData);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      if (!response.data?.story) {
        throw new Error('Failed to create story');
      }
      
      return response.data.story;
    } catch (error) {
      console.error('Error creating story:', error);
      throw new Error(error instanceof Error ? error.message : 'An error occurred while creating the story');
    }
  }

  /**
   * Utility to clean up a failed story creation
   * @param storyId The ID of the story to clean up
   */
  private static async cleanupFailedStory(
    userId: string,
    storyId: string,
    kidId: string
  ): Promise<void> {
    try {
      // Use StoryApi to delete the story
      const response = await StoryApi.deleteStory(userId, storyId, kidId);
      
      if (!response.success) {
        console.error('Failed to clean up story:', response.error);
      }
    } catch (error) {
      console.error('Error cleaning up story:', error);
    }
  }

  /**
   * Retrieves a story by its ID
   * @param storyId The ID of the story to retrieve
   * @returns The story object, or null if not found
   */
  static async getStoryById(storyId: string): Promise<Story | null> {
    try {
      // Use StoryApi to get the story
      const response = await StoryApi.getStoryById(storyId);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        throw new Error('Failed to fetch story');
      }
      
      console.log('Story response.data: ', response.data);
      return Story.fromJson(response.data) || null;
    } catch (error) {
      console.error('Error fetching story:', error);
      throw error;
    }
  }

  /**
   * Gets all stories for a specific kid
   * @param userId The user ID
   * @param kidId The kid ID
   * @returns Array of stories
   */
  static async getStoriesByKid(userId: string, kidId: string): Promise<Story[]> {
    try {
      // Use StoryApi to get stories by kid
      const response = await StoryApi.getStoriesByKid(userId, kidId);
      
      if (!response.success || !response.data?.stories) {
        return [];
      }
      
      return response.data.stories;
    } catch (error) {
      console.error('Error fetching stories for kid:', error);
      return [];
    }
  }

  /**
   * Gets all stories for a user
   * @param userId The user ID
   * @returns Array of stories
   */
  static async getAllUserStories(userId: string): Promise<Story[]> {
    try {
      // Use StoryApi to get all user stories
      const response = await StoryApi.getAllStoriesByUser(userId);
      
      if (!response.success || !response.data?.stories) {
        return [];
      }
      
      return response.data.stories;
    } catch (error) {
      console.error('Error fetching all user stories:', error);
      return [];
    }
  }

  /**
   * Deletes a story by ID
   * @param userId The user ID
   * @param storyId The story ID to delete
   * @param kidId The kid ID the story belongs to
   */
  static async deleteStory(userId: string, storyId: string, kidId: string): Promise<void> {
    try {
      // Use StoryApi to delete the story
      const response = await StoryApi.deleteStory(userId, storyId, kidId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete story');
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }
} 