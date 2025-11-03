import { StoryStatus } from '@/models';

/**
 * Helper to get progress percentage from a StoryStatus
 */
export const getProgressFromStatus = (status: StoryStatus | string): number => {
  if (typeof status === 'string') {
    // Handle string status values like 'progress_10'
    if (status.startsWith('progress_')) {
      const percentage = parseInt(status.split('_')[1], 10);
      return !isNaN(percentage) ? percentage : 0;
    }
    
    // Handle enum values as strings
    switch (status) {
      case 'incomplete': return 0;
      case 'generating': return 10;
      case 'complete': return 100;
      case '10%': return 10;
      case '20%': return 20;
      case '30%': return 30;
      case '40%': return 40;
      case '50%': return 50;
      case '60%': return 60;
      case '70%': return 70;
      case '80%': return 80;
      case '90%': return 90;
      default: return 0;
    }
  }
  
  // Handle StoryStatus enum values
  switch (status) {
    case StoryStatus.INCOMPLETE: return 0;
    case StoryStatus.GENERATING: return 10;
    case StoryStatus.COMPLETE: return 100;
    case StoryStatus.PROGRESS10: return 10;
    case StoryStatus.PROGRESS20: return 20;
    case StoryStatus.PROGRESS30: return 30;
    case StoryStatus.PROGRESS40: return 40;
    case StoryStatus.PROGRESS50: return 50;
    case StoryStatus.PROGRESS60: return 60;
    case StoryStatus.PROGRESS70: return 70;
    case StoryStatus.PROGRESS80: return 80;
    case StoryStatus.PROGRESS90: return 90;
    default: return 0;
  }
};

/**
 * Helper to get message from progress percentage
 */
export const getMessageFromProgress = (percentage: number | StoryStatus): string => {
  // If percentage is a StoryStatus enum, convert it to a number
  if (typeof percentage !== 'number') {
    percentage = getProgressFromStatus(percentage);
  }
  
  // Return appropriate message based on percentage
  if (percentage <= 0) return "Starting image generation...";
  if (percentage < 10) return "Initializing story generation...";
  if (percentage < 20) return "Generating story concept...";
  if (percentage < 30) return "Creating story title...";
  if (percentage < 40) return "Saving initial story data...";
  if (percentage < 50) return "Generating story text...";
  if (percentage < 60) return "Processing story elements...";
  if (percentage < 70) return "Preparing for image generation...";
  if (percentage < 80) return "Generating images...";
  if (percentage < 90) return "Finalizing images...";
  if (percentage < 100) return "Completing story...";
  return "Story complete!";
};

/**
 * Helper function to convert an image URL to base64
 */
export const imageToBase64 = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.includes('base64,')
          ? base64String.split('base64,')[1]
          : base64String);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};
