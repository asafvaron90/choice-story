import { useState, useCallback } from 'react';

export type StoryStep = 'problemDescription' | 'selectTitle' | 'generateCover' | 'finishStory';

interface UseStoryStepsProps {
  initialStep?: StoryStep;
  onStepComplete?: (step: StoryStep) => void;
}

export const useStorySteps = ({ initialStep = 'problemDescription', onStepComplete }: UseStoryStepsProps = {}) => {
  const [currentStep, setCurrentStep] = useState<StoryStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<StoryStep>>(new Set());
  const [expandedStep, setExpandedStep] = useState<StoryStep>(initialStep);

  const isStepCompleted = useCallback((step: StoryStep) => completedSteps.has(step), [completedSteps]);

  const isStepDisabled = useCallback((step: StoryStep) => {
    const stepOrder: StoryStep[] = ['problemDescription', 'selectTitle', 'generateCover', 'finishStory'];
    const currentStepIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    return stepIndex > currentStepIndex && !isStepCompleted(stepOrder[stepIndex - 1]);
  }, [currentStep, isStepCompleted]);

  const completeStep = useCallback((step: StoryStep) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(step);
      return newSet;
    });

    const stepOrder: StoryStep[] = ['problemDescription', 'selectTitle', 'generateCover', 'finishStory'];
    const currentIndex = stepOrder.indexOf(step);
    const nextStep = stepOrder[currentIndex + 1];

    if (nextStep) {
      setCurrentStep(nextStep);
      setExpandedStep(nextStep);
    }

    onStepComplete?.(step);
  }, [onStepComplete]);

  const toggleStep = useCallback((step: StoryStep) => {
    setExpandedStep(prev => prev === step ? currentStep : step);
  }, [currentStep]);

  return {
    currentStep,
    completedSteps: Array.from(completedSteps),
    expandedStep,
    isStepCompleted,
    isStepDisabled,
    completeStep,
    toggleStep
  };
}; 