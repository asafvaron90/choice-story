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
    account: "Account",
    gallery: "Gallery",
    adminPanel: "Admin Panel"
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
    readStory: "Read Story",
    share: "Share Story",
    copyLink: "Copy Link",
    linkCopied: "Link Copied"
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
    title: "Create a Story",
    subtitle: "Create a personalized story for {name}",
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
      verificationError: "Please verify the image before continuing.",
      advantagesLabel: "Advantages (Optional)",
      advantagesPlaceholder: "e.g., Kid will feel calm and happy",
      disadvantagesLabel: "Disadvantages (Optional)",
      disadvantagesPlaceholder: "e.g., Kid will feel anxious",
      addButton: "Add",
      editTitleLabel: "Edit Selected Title (Optional)",
      editTitlePlaceholder: "Customize your story title...",
      editTitleHint: "You can modify the title before generating your story."
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
    },
    buttons: {
      generateStoryTitles: "Generate Story Titles",
      generateStory: "Generate Story",
      continueToPreview: "Continue to Preview",
      saveStory: "Save Story",
      continue: "Continue",
      generatingTitles: "Generating Titles...",
      generatingStory: "Generating Story...",
      savingStory: "Saving Story...",
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
    shareDialog: {
      title: "Share Kid",
      description: "Share this kid's stories with another account",
      emailLabel: "Email Address",
      emailPlaceholder: "Enter email to share with",
      shareButton: "Share",
      sharing: "Sharing...",
      alreadyShared: "Kid is already shared with this email",
      shareSuccess: "Kid shared with {email}",
      shareError: "Failed to share kid",
      invalidEmail: "Please enter a valid email address",
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
    share: "Share",
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
    add: "Add",
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
  gallery: {
    title: "Gallery",
    selectKid: "Select a kid to view their stories",
    backToKids: "Back to Kids",
    noStoriesYet: "No stories yet for this kid",
    loginPrompt: "Please login to view your gallery",
    loginButton: "Login with Google",
    viewStories: "View Stories",
    sharedWithMe: "Shared with me"
  },
  storyActions: {
    title: "Story Options",
    read: "Read Story",
    copyLink: "Copy Link",
    share: "Share Story",
    linkCopiedTitle: "Link Copied!",
    linkCopiedDescription: "Story link has been copied to clipboard",
    copyError: "Failed to copy link"
  },
  restartStory: {
    title: "Restart Story?",
    message: "Are you sure you want to restart? Your progress will be lost.",
    cancel: "Cancel",
    restart: "Restart"
  },
  leaveStory: {
    title: "Leave Story?",
    message: "Are you sure you want to leave? Your progress will be lost.",
    cancel: "Stay",
    leave: "Leave"
  },
  storyReader: {
    loading: "Loading your story",
    error: "Oops! Something went wrong",
    choiceQuestion: "What is your choice?",
    theEnd: "The End!",
    whatIf: "What if...",
    congratsBothPaths: "Great job reading both paths! 🎉",
    whichPathWouldYouChoose: "Which path would you choose?",
    surveyDescription: "You've read both paths - now tell us which one you would actually choose!",
    thankYou: "Thank you! 🎉",
    choiceSaved: "Your choice has been saved!",
    readAgain: "I want to read again",
    startReading: "Start Reading",
    gallery: "Gallery",
    rotateDevice: "Rotate your device",
    rotateDeviceMessage: "For the best reading experience, please rotate your device to landscape. This helps us keep the story immersive on smaller screens."
  },
  common: {
    loading: "Loading...",
    loadingProfile: "Loading profile...",
    loadingKidsData: "Loading kids data...",
    error: "Error",
    success: "Success",
    tryAgain: "Try Again",
    ok: "OK",
    navigationMenu: "Navigation Menu",
    years: "years",
    story: "story",
    storiesPlural: "stories",
    generating: "Generating",
    deleteStory: "Delete story",
  },
  auth: {
    loginRequired: "Please login with Google to view your dashboard",
    loginRequiredShort: "Please login to access this page",
    loginButton: "Login with Google",
    loggedOutMessage: "You are not logged in",
    loggedOutDescription: "Please log in to view your profile",
    pendingApproval: "Pending Approval",
    pendingApprovalMessage: "Our team will approve your access shortly. Feel free to contact your agent for more information.",
    accountStatus: "Account Status:",
    email: "Email:",
    accessRights: "Access Rights:",
    awaitingApproval: "awaiting approval",
    kidsLimitReached: "Kids Limit Reached",
    kidsLimitMessage: "You have reached your kids limit of {limit}.",
    contactAgent: "Please contact your agent to increase your limit.",
  },
  notFound: {
    pageNotFound: "Page Not Found",
    pageNotFoundMessage: "Sorry, we couldn't find the page you're looking for.",
    goBackHome: "Go back home",
    goToDashboard: "Go to dashboard",
  },
  storyPage: {
    generateMissingImages: "Click to generate missing images ✨",
    linkCopiedToastTitle: "Link Copied!",
    linkCopiedToastDescription: "Story link has been copied to clipboard",
    failedToCopyLink: "Failed to copy link",
    storySavedSuccessfully: "Story saved successfully",
    failedToSaveStory: "Failed to save story",
  },
  userProfile: {
    userProfile: "User Profile",
    refreshData: "Refresh Data",
    noName: "No Name",
    editName: "Edit Name",
    yourKids: "Your Kids",
    youHaventAddedKids: "You haven't added any kids yet.",
    errorLoadingProfile: "Error loading profile",
  },
  successOrder: {
    thankYou: "Thank You for Your Order!",
    generatingMessage: "We're generating your custom storybook now. You'll receive an email when it's ready.",
    orderId: "Order ID:",
    returnHome: "Return Home",
  },
}; 