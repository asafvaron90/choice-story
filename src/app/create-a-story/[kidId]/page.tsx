"use client";

import React, { useReducer, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from "@/app/hooks/useTranslation";
import { Loader2 } from "lucide-react";
// import ImageUrl from "@/app/components/common/ImageUrl"; // Unused - image generation disabled

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

import { useStoryGenerationWorkflow } from "../hooks/useStoryGenerationWorkflow";
import { useKidStoryLoader } from "../hooks/useKidStoryLoader";
import { useStorySteps } from "@/app/hooks/useStorySteps";
// import { useStoryImages } from "@/app/hooks/useStoryImages"; // Unused - image generation disabled
import { storyReducer, initialStoryState } from "@/app/state/story-reducer";

import { StoryStep } from "@/app/components/StoryStep";
import { StoryPageCard } from '@/app/features/story/components/story/StoryPageCard';
import LoadingIndicator from "@/app/components/ui/LoadingIndicator";
import ErrorMessage from "@/app/components/ui/ErrorMessage";

import { StoryStatus, Story, StoryPage, pageTypeFromString, PageType } from "@/models";
import { ErrorBoundary as _ErrorBoundary } from "@/app/components/ui/ErrorBoundary";
import { functionClientAPI } from '@/app/network/functions';

export default function CreateAStoryPage() {
  const params = useParams();
  const router = useRouter();
  const kidId = params.kidId as string;
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useAuth();

  // Load kid details
  const { kid: kidDetails, loading: kidLoading, error: kidError } = useKidStoryLoader(kidId);

  // Story state management
  const [state, dispatch] = useReducer(storyReducer, initialStoryState);

  // Step management
  const {
    currentStep,
    expandedStep,
    isStepCompleted,
    isStepDisabled,
    completeStep,
    toggleStep
  } = useStorySteps();

  // Story generation workflow
  const { 
    handleGenerateTitles,
    handleGenerateFullStory,
    handleFinishStory,
  } = useStoryGenerationWorkflow({
    kidId,
    problemDescription: state.problemDescription,
    selectedTitle: state.selectedTitle || "",
    pages: state.pages || [],
    kidDetails,
    dispatch,
    advantages: state.advantages,
    disadvantages: state.disadvantages
  });

  // Image generation disabled - no longer needed

  // Add debug logging to track state updates
  useEffect(() => {
    if (state.pages) {
      console.log('Current pages state:', state.pages.map(page => ({
        type: page.pageType,
        imageUrl: page.selectedImageUrl
      })));
    }
  }, [state.pages]);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  // Loading states
  if (authLoading || kidLoading) {
    return <LoadingIndicator message={authLoading ? "Checking authentication..." : "Loading kid details..."} />;
  }

  if (kidError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <ErrorMessage message={kidError} />
        <Button onClick={() => router.push('/dashboard')}>{t.dashboard.title}</Button>
      </div>
    );
  }

  // Handle page updates from StoryPageCard
  const handlePageUpdate = (updatedPage: StoryPage) => {
    if (!state.pages) return;
    
    const updatedPages = state.pages.map(page => 
      page.pageNum === updatedPage.pageNum && page.pageType === updatedPage.pageType
        ? updatedPage
        : page
    );
    
    dispatch({ type: 'SET_PAGES', payload: updatedPages });
  };

  const handleMainAction = async () => {
    try {
      switch (currentStep) {
        case 'problemDescription':
          if (!state.problemDescription?.trim()) {
            toast({
              title: "Missing Description",
              description: "Please enter a problem description before continuing.",
              variant: "destructive",
            });
            return;
          }
          dispatch({ type: 'SET_GENERATING_TITLES', payload: true });
          try {
            await handleGenerateTitles();
            completeStep('problemDescription');
          } catch (error) {
            console.error('Error generating titles:', error);
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to generate titles",
              variant: "destructive",
            });
          } finally {
            dispatch({ type: 'SET_GENERATING_TITLES', payload: false });
          }
          break;

        case 'selectTitle':
          if (!state.selectedTitle) {
            toast({
              title: "Missing Selection",
              description: "Please select a title before continuing.",
              variant: "destructive",
            });
            return;
          }
          dispatch({ type: 'SET_GENERATING_STORY', payload: true });
          const generatedPages = await handleGenerateFullStory();
          if (generatedPages) {
            dispatch({ type: 'SET_PAGES', payload: generatedPages });
            completeStep('selectTitle');

            // Skip image generation - go directly to save
            toast({
              title: "Story Generated Successfully!",
              description: "Your story is ready to save!",
            });
            
            // Skip the image generation step
            completeStep('generateCover');
          }
          break;

        case 'generateCover':
          // Skip image step - go directly to save
          completeStep('generateCover');
          break;

        case 'finishStory':
          dispatch({ type: 'SET_SAVING_STORY', payload: true });
          
          try {
            // Save story directly without generating image prompts
            const response = await handleFinishStory(state.pages || []);
            
            if (response?.success && response.data?.story) {
              completeStep('finishStory');
              toast({
                title: "Success",
                description: "Your story has been saved successfully!",
              });
              router.push(`/stories/${response.data.story.id}`);
            } else {
              throw new Error("Failed to save story");
            }
          } catch (error) {
            console.error('Error saving story:', error);
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "An unexpected error occurred while saving the story",
              variant: "destructive",
            });
          } finally {
            dispatch({ type: 'SET_SAVING_STORY', payload: false });
          }
          break;
      }
    } catch (error) {
      console.error('Error in main action:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_GENERATING_TITLES', payload: false });
      dispatch({ type: 'SET_GENERATING_STORY', payload: false });
      dispatch({ type: 'SET_SAVING_STORY', payload: false });
    }
  };

  const getMainActionLabel = () => {
    if (state.isGeneratingTitles) return "Generating Titles...";
    if (state.isGeneratingStory) return "Generating Story...";
    if (state.isSavingStory) return "Saving Story...";

    switch (currentStep) {
      case 'problemDescription': return "Generate Story Titles";
      case 'selectTitle': return "Generate Story";
      case 'generateCover': return "Continue to Preview";
      case 'finishStory': return "Save Story";
      default: return "Continue";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Create a Story</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Create a personalized story for {kidDetails?.name}
        </p>
      </div>

      <div className="space-y-6">
        {/* Problem Description Step */}
        <StoryStep
          title={t.createStory.progress.problemDescription}
          isActive={currentStep === 'problemDescription'}
          isCompleted={isStepCompleted('problemDescription')}
          isDisabled={isStepDisabled('problemDescription')}
          isExpanded={expandedStep === 'problemDescription'}
          onToggle={() => toggleStep('problemDescription')}
        >
          <div className="space-y-4">
            <p className="text-gray-600">{t.createStory.problemDescription.description}</p>
          <Textarea
            placeholder={t.createStory.problemDescription.placeholder.replace("{name}", kidDetails?.name || "Kid")}
              value={state.problemDescription}
              onChange={(e) => dispatch({ type: 'SET_PROBLEM_DESCRIPTION', payload: e.target.value })}
          />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="advantages">Advantages (Optional)</Label>
              <Textarea
                id="advantages"
                placeholder="e.g., Kid will feel calm and happy"
                  value={state.advantages}
                  onChange={(e) => dispatch({ type: 'SET_ADVANTAGES', payload: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="disadvantages">Disadvantages (Optional)</Label>
              <Textarea
                id="disadvantages"
                placeholder="e.g., Kid will feel anxious"
                  value={state.disadvantages}
                  onChange={(e) => dispatch({ type: 'SET_DISADVANTAGES', payload: e.target.value })}
              />
              </div>
            </div>
          </div>
        </StoryStep>

        {/* Title Selection Step */}
        <StoryStep
          title={t.createStory.progress.selectTitle}
          isActive={currentStep === 'selectTitle'}
          isCompleted={isStepCompleted('selectTitle')}
          isDisabled={isStepDisabled('selectTitle')}
          isExpanded={expandedStep === 'selectTitle'}
          onToggle={() => toggleStep('selectTitle')}
          isLoading={state.isGeneratingTitles}
        >
          <div className="space-y-4">
            <p className="text-gray-600">{t.createStory.problemDescription.selectTitle}</p>
            {state.titles && state.titles.length > 0 ? (
            <RadioGroup 
                onValueChange={(value) => dispatch({ type: 'SET_SELECTED_TITLE', payload: value })}
                value={state.selectedTitle || ""}
                className="space-y-2"
              >
                {state.titles.map((title: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md">
                  <RadioGroupItem value={title} id={`title-${index}`} />
                  <Label htmlFor={`title-${index}`}>{title}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
              state.isGeneratingTitles ? (
                <p className="text-gray-500 flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.createStory.preview.generating}
              </p>
            ) : (
                <p className="text-gray-500">No titles generated yet.</p>
            )
          )}
            
            {state.selectedTitle && (
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="edit-title">Edit Selected Title (Optional)</Label>
                <Input
                  id="edit-title"
                  value={state.selectedTitle}
                  onChange={(e) => dispatch({ type: 'SET_SELECTED_TITLE', payload: e.target.value })}
                  placeholder="Customize your story title..."
                  className="text-lg font-medium"
                />
                <p className="text-sm text-gray-500">You can modify the title before generating your story.</p>
              </div>
            )}
          </div>
        </StoryStep>

        {/* Story Preview Step */}
        <StoryStep
          title={t.createStory.progress.finishStory}
          isActive={currentStep === 'finishStory'}
          isCompleted={isStepCompleted('finishStory')}
          isDisabled={isStepDisabled('finishStory')}
          isExpanded={expandedStep === 'finishStory'}
          onToggle={() => toggleStep('finishStory')}
        >
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">{state.selectedTitle}</h3>
              <p className="text-gray-600">{state.problemDescription}</p>
            </div>

            {state.pages && state.pages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.pages
                .filter(page => page.pageType !== PageType.COVER)
                .map((page) => {
                  // Create a consistent story object with latest state
                  const previewStory: Story = {
                    id: "preview-id",
                    title: state.selectedTitle || "",
                    pages: state.pages || [],
                    kidId: kidId,
                    userId: currentUser?.uid || "",
                    problemDescription: state.problemDescription || "",
                    advantages: state.advantages || "",
                    disadvantages: state.disadvantages || "",
                    status: StoryStatus.INCOMPLETE,
                    createdAt: new Date(),
                    lastUpdated: new Date()
                  };

                  return (
                    <StoryPageCard 
                      key={`${page.pageNum}-${page.pageType}`}
                      page={page}
                      story={previewStory}
                      kid={kidDetails}
                      textOnly={true}
                      onPageUpdate={handlePageUpdate}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </StoryStep>
      </div>

      {/* Main Action Button */}
      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleMainAction}
          disabled={
            state.isGeneratingTitles ||
            state.isGeneratingStory ||
            state.isSavingStory
          }
          className="w-full max-w-md"
          size="lg"
        >
          {(state.isGeneratingTitles || state.isGeneratingStory || state.isSavingStory) ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>{getMainActionLabel()}</span>
            </div>
          ) : (
            getMainActionLabel()
          )}
        </Button>
      </div>
    </div>
  );
} 