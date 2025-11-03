import { useState } from 'react';
import { toast } from "@/components/ui/use-toast";
import { StoryTemplates } from "@/app/_lib/services/prompt_templats";
import { functionClientAPI } from '@/app/network/functions';
import useCreateStoryState from "../state/create-story-state";
import useCreateStoryProgressState from "../state/progress-state";

/**
 * Custom hook for handling story generation API calls and state updates
 */
export function useStoryGeneration() {
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [error, _setError] = useState<Error | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);
  
  const { next } = useCreateStoryProgressState();
  const { 
      kidDetails,
    setTitles,
    setPages,
    isGeneratingStory, 
    setIsGeneratingStory,
    advantages,
    disadvantages
  } = useCreateStoryState();

  /**
   * Handles error formatting for API generation errors
   */
  const handleGenerationError = (error: unknown, setErrorState: (error: string) => void) => {
    if (error instanceof Error) {
      const errorMsg = error.message;
      
      // Authentication/API key issues
      if (
        errorMsg.includes('Authentication Error') || 
        errorMsg.includes('API Key') || 
        errorMsg.includes('AUTH_ERROR') ||
        errorMsg.includes('unregistered callers') ||
        errorMsg.includes('403')
      ) {
        setErrorState("Unable to connect to the AI service. Please contact support or try again later.");
      } 
      // JSON parsing issues
      else if (errorMsg.includes('parse') || errorMsg.includes('JSON')) {
        setErrorState("There was an issue processing the AI response. Please try again.");
      }
      // Other errors
      else {
        setErrorState(errorMsg);
      }
    } else {
      setErrorState("An unexpected error occurred. Please try again.");
    }
    
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Generation failed. Please try again.",
      variant: "destructive"
    });
  };

  

  /**
   * Generates titles based on the problem description
   */
  const generateTitles = async (
    problemDescription: string, 
    language: string, 
    userId: string | undefined,
    onSuccess: (expandedStep: number) => void
  ) => {
    if (!problemDescription || problemDescription.length < 10) {
      return;
    }

    setIsGeneratingTitles(true);
    setStoryError(null);

    try {
      if (!kidDetails) {
        throw new Error("Kid details are required to generate titles");
      }

      // Use the new Firebase function to generate titles
      const response = await functionClientAPI.generateStoryTitles({
        name: kidDetails.name || 'Child',
        gender: kidDetails.gender as 'male' | 'female',
        problemDescription,
        age: kidDetails.age,
        advantages: advantages || undefined,
        disadvantages: disadvantages || undefined
      });
      
      if (!response.success || !response.titles || response.titles.length === 0) {
        throw new Error("Failed to generate titles");
      }

      setTitles(response.titles);
      onSuccess(1);
      next();
    } catch (error) {
      console.error("Error generating titles:", error);
      setStoryError(error instanceof Error ? error.message : "Failed to generate titles");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate titles",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  /**
   * Generates the full story content
   */
  const generateStory = async (
    title: string,
    problemDescription: string,
    language: string,
    userId: string | undefined,
    kidAge: number,
    onSuccess: (expandedStep: number) => void
  ) => {
    if (!title || !problemDescription) {
      return false;
    }

    setIsGeneratingStory(true);
    setStoryError(null);

    try {
      if (!userId) {
        throw new Error("User ID is required for story generation");
      }

      if (!kidDetails) {
        throw new Error("Kid details are required for story generation");
      }

      // Generate a unique story ID
      const storyId = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log("Calling Firebase generateStoryPagesText with:", {
        name: kidDetails.name || 'Child',
        problemDescription,
        title,
        age: kidAge,
        advantages: advantages || "",
        disadvantages: disadvantages || "",
        accountId: userId, // Using userId as accountId
        userId: userId,
        storyId
      });

      // Use Firebase function for story generation
      const response = await functionClientAPI.generateStoryPagesText({
        name: kidDetails.name || 'Child',
        problemDescription,
        title,
        age: kidAge,
        advantages: advantages || "",
        disadvantages: disadvantages || "",
        accountId: userId, // Using userId as accountId
        userId: userId,
        storyId
      });

      if (!response.success || !response.text) {
        throw new Error("Failed to generate story text from Firebase function");
      }

      console.log("Firebase function returned text:", response.text.substring(0, 200) + "...");

      const storyPages = StoryTemplates.fullStoryTextGenerationResponseConvertor(response.text);
      
      // Store the story pages in state
      setPages(storyPages);
      
      // Move to the next step
      onSuccess(2);
      next();
      
      toast({
        title: "Story Generated",
        description: "Your story has been successfully generated!",
      });
      
      return true;
    } catch (error) {
      handleGenerationError(error, setStoryError);
      return false;
    } finally {
      setIsGeneratingStory(false);
    }
  };

  return {
    isGeneratingTitles,
    isGeneratingStory,
    error: error instanceof Error ? error.message : null,
    storyError,
    generateTitles,
    generateStory
  };
} 