import { Translation } from "./types";
import { PageType } from "@/models";

export const enTranslations: Translation = {
  nav: {
    contact: "Contact",
    benefits: "Benefits",
    about: "About",
    createStory: "Create Story",
    signIn: "Sign In",
    signOut: "Sign Out",
    dashboard: "Dashboard",
    account: "Account"
  },
  hero: {
    title: "Create Personalized Stories",
    subtitle: "AI-Powered Story Generation",
    description: "Create unique stories tailored to your child's needs",
    detailedText1: "Our AI technology creates personalized stories that help children learn and grow",
    detailedText2: "Each story is unique and tailored to your child's specific needs"
  },
  story: {
    title: "Story",
    description: "Description",
    readStory: "Read Story"
  },
  benefits: {
    title: "Benefits",
    items: [
      "Personalized stories for your child",
      "AI-powered story generation",
      "Educational content",
      "Fun and engaging"
    ]
  },
  contact: {
    title: "Talk to Us",
    subtitle: "Contact Us"
  },
  createKid: {
    title: "Create a Kid",
    error: {
      incomplete: "Please complete all required fields and ensure the image is analyzed",
      saveFailed: "Failed to save kid profile. Please try again."
    },
    success: {
      created: "Kid created successfully!",
      redirecting: "Redirecting to dashboard...",
      saved: "Kid profile saved successfully.",
      saving: "Saving..."
    }
  },
  createStory: {
    progress: {
      problemDescription: "Problem Description",
      selectTitle: "Select Title",
      generateCover: "Generate Cover",
      generateChoices: "Generate Choices",
      finishStory: "Finish Story"
    },
    kidDetails: {
      title: "Kid Details",
      nameLabel: "Name",
      ageLabel: "Age",
      genderLabel: "Gender",
      male: "Boy",
      female: "Girl",
      continue: "Continue"
    },
    imageUpload: {
      title: "Avatar Creation",
      uploadButton: "Upload Image",
      instructions: {
        title: "Image Requirements",
        description: "Please upload a clear photo of your kid's face."
      },
      validation: {
        needsAdjustment: "Image needs adjustment",
        analysisError: "Failed to analyze image",
        tryAgain: "Please try again",
        matchesRequirement: "Image matches requirements",
        doesntMatch: "Image doesn't match requirements",
        confidence: "Confidence"
      },
      progress: {
        initializing: "Initializing...",
        analyzing: "Analyzing image...",
        uploading: "Uploading image...",
        saving: "Saving...",
        processing: "Processing...",
        creating: "Creating...",
        finalizing: "Finalizing..."
      },
      examples: {
        title: "Example Images",
        description: "Here are some examples of good images:",
        perfectPhoto: {
          title: "Perfect Photo",
          description: "A clear, well-lit photo of the child's face."
        },
        tiltedHead: {
          title: "Tilted Head",
          description: "The head is tilted, which makes it difficult to analyze the face."
        },
        coveredFace: {
          title: "Covered Face",
          description: "The face is covered, which makes it difficult to analyze the face."
        },
      },
      continue: "Continue"
    },
    problemDescription: {
      title: "Problem Description",
      description: "Let's create a story about a problem your kid might face.",
      generateButton: "Generate Story Ideas",
      selectTitle: "Select a Story Title",
      continue: "Continue",
      placeholder: "{name} doesn't like brushing teeth",
      verificationError: "Please verify the image before continuing."
    },
    choices: {
      title: "Story Choices",
      bookTitle: "Story Title",
      regenerateTitle: "Regenerate Title",
      goodChoice: "Good Choice",
      badChoice: "Bad Choice",
      editHint: "Click to edit",
      continue: "Continue",
      generateButton: "Generate Choices"
    },
    preview: {
      title: "Story Title",
      coverImages: "Cover Images",
      generating: "Generating...",
      regenerate: "Regenerate",
      saving: "Saving story...",
      finish: "Finish Story"
    }
  },
  dashboard: {
    title: "My Kids",
    addKid: "Add Kid",
    noKids: "No kids found. Add a kid to get started!",
    tryAgain: "Try Again",
    refreshing: "Refreshing..."
  },
  userCard: {
    imageAnalysisDialog: {
      title: "Image Analysis for {name}",
      description: "Review the AI-generated analysis of the profile image",
      resultsTitle: "Analysis Results:",
      noAnalysis: "No analysis available",
      analyzing: "Analyzing...",
      reanalyze: "Re-analyze Image",
      createAvatar: "Create Avatar",
      generatingAvatar: "Generating avatar...",
      generatedAvatars: "Available Generated Avatars",
      avatarGenerationFailed: "Avatar generation failed",
      selectAvatar: "Select Avatar",
      avatarSelected: "Avatar Selected",
      currentAvatar: "Current",
      originalImage: "Original Image",
      selectedAvatar: "Currently Selected Avatar",
    },
    toasts: {
      analysisCompleteTitle: "Analysis Complete",
      analysisCompleteDescription: "The image analysis has been updated successfully.",
      analysisFailedTitle: "Analysis Failed",
      deleteSuccessTitle: "Success",
      deleteSuccessDescription: "{name} has been deleted.",
      deleteErrorTitle: "Error",
      deleteErrorDescription: "Failed to delete kid. Please try again.",
      avatarSelectedTitle: "Avatar Selected",
      avatarSelectedDescription: "New avatar has been set successfully",
      avatarSelectionFailedTitle: "Selection Failed",
    },
    deleteConfirmation: "Are you sure you want to delete {name}?",
    unnamedKid: "Unnamed Kid",
    years: "years",
    stories: "stories",
    createStory: "Create Story",
    delete: "Delete",
    storiesTitle: "Stories",
    refreshStories: "Refresh stories",
    noStoriesFound: "No stories found. Tap to reload.",
    noStoriesYet: "No stories yet",
    deleteStory: "Delete story",
    userNotAuthenticated: "User not authenticated",
    failedToDeleteKid: "Failed to delete kid",
    generateStory: "Generate Story",
    male: "Male",
    female: "Female",
  },
  quickGenerateDialog: {
    generateStory: "Generate Story",
    title: "Generate Story",
    description: "Enter a problem to generate a new story",
    problemLabel: "Story Problem",
    problemPlaceholder: "Describe a problem for the story",
    advantagesLabel: "Advantages",
    advantagesPlaceholder: "Describe advantages (optional)",
    disadvantagesLabel: "Disadvantages",
    disadvantagesPlaceholder: "Describe disadvantages (optional)",
    inputRequiredTitle: "Input Required",
    inputRequiredDescription: "Please enter a problem for the story",
    progressDialog: {
      title: "Generating Story",
      description: "This might take a few minutes. Please don't close this window.",
      message: "We're creating a unique story with images just for you.",
      subtext1: "This process typically takes 2-3 minutes.",
      subtext2: "We're creating a unique story with images just for you.",
      storyCompleted: "Story completed!",
    },
  },
  storyPageCard: {
    title: (type: PageType) => {
      switch (type) {
        case PageType.COVER:
          return 'Cover Page';
        case PageType.NORMAL:
          return 'Normal Page';
        case PageType.GOOD_CHOICE:
          return 'Good Choice';
        case PageType.BAD_CHOICE:
          return 'Bad Choice';
        case PageType.GOOD:
          return 'Good Page';
        case PageType.BAD:
          return 'Bad Page';
        default:
          return String(type);
      }
    }
  },
}; 