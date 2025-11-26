import { Language } from "../context/LanguageContext";
import { PageType } from "@/models";

export interface Translation {
  nav: {
    contact: string;
    benefits: string;
    about: string;
    createStory: string;
    signIn: string;
    signOut: string;
    dashboard: string;
    account: string;
    gallery: string;
    adminPanel: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
    detailedText1: string;
    detailedText2: string;
  };
  story: {
    title: string;
    description: string;
    readStory: string;
    share: string;
    copyLink: string;
    linkCopied: string;
  };
  benefits: {
    title: string;
    items: string[];
  };
  contact: {
    title: string;
    subtitle: string;
  };
  createKid: {
    title: string;
    error: {
      incomplete: string;
      saveFailed: string;
    };
    success: {
      created: string;
      redirecting: string;
      saved: string;
      saving: string;
    };
  };
  createStory: {
    title: string;
    subtitle: string;
    progress: {
      problemDescription: string;
      selectTitle: string;
      generateCover: string;
      generateChoices: string;
      finishStory: string;
    };
    kidDetails: {
      title: string;
      nameLabel: string;
      ageLabel: string;
      genderLabel: string;
      male: string;
      female: string;
      continue: string;
    };
    imageUpload: {
      title: string;
      uploadButton: string;
      instructions: {
        title: string;
        description: string;
      };
      validation: {
        needsAdjustment: string;
        analysisError: string;
        tryAgain: string;
        matchesRequirement: string;
        doesntMatch: string;
        confidence: string;
      };
      progress: {
        initializing: string;
        analyzing: string;
        uploading: string;
        saving: string;
        processing: string;
        creating: string;
        finalizing: string;
      };
      examples: {
        title: string;
        description: string;
        perfectPhoto: {
          title: string;
          description: string;
        };
        tiltedHead: {
          title: string;
          description: string;
        };
        coveredFace: {
          title: string;
          description: string;
        };
      };
      continue: string;
    };
    problemDescription: {
      title: string;
      description: string;
      generateButton: string;
      selectTitle: string;
      continue: string;
      placeholder: string;
      verificationError: string;
      advantagesLabel: string;
      advantagesPlaceholder: string;
      disadvantagesLabel: string;
      disadvantagesPlaceholder: string;
      addButton: string;
      editTitleLabel: string;
      editTitlePlaceholder: string;
      editTitleHint: string;
    };
    choices: {
      title: string;
      bookTitle: string;
      regenerateTitle: string;
      goodChoice: string;
      badChoice: string;
      editHint: string;
      continue: string;
      generateButton: string;
    };
    preview: {
      title: string;
      coverImages: string;
      generating: string;
      regenerate: string;
      saving: string;
      finish: string;
    };
  };
  dashboard: {
    title: string;
    addKid: string;
    noKids: string;
    tryAgain: string;
    refreshing: string;
  };
  userCard: {
    imageAnalysisDialog: {
      title: string;
      description: string;
      resultsTitle: string;
      noAnalysis: string;
      analyzing: string;
      reanalyze: string;
      createAvatar: string;
      generatingAvatar: string;
      generatedAvatars: string;
      avatarGenerationFailed: string;
      selectAvatar: string;
      avatarSelected: string;
      currentAvatar: string;
      originalImage: string;
      selectedAvatar: string;
    };
    toasts: {
      analysisCompleteTitle: string;
      analysisCompleteDescription: string;
      analysisFailedTitle: string;
      deleteSuccessTitle: string;
      deleteSuccessDescription: string;
      deleteErrorTitle: string;
      deleteErrorDescription: string;
      avatarSelectedTitle: string;
      avatarSelectedDescription: string;
      avatarSelectionFailedTitle: string;
    };
    deleteConfirmation: string;
    unnamedKid: string;
    years: string;
    stories: string;
    createStory: string;
    delete: string;
    storiesTitle: string;
    refreshStories: string;
    noStoriesFound: string;
    noStoriesYet: string;
    deleteStory: string;
    userNotAuthenticated: string;
    failedToDeleteKid: string;
    generateStory: string;
    male: string;
    female: string;
  };
  quickGenerateDialog: {
    add: string;
    generateStory: string;
    title: string;
    description: string;
    problemLabel: string;
    problemPlaceholder: string;
    advantagesLabel: string;
    advantagesPlaceholder: string;
    disadvantagesLabel: string;
    disadvantagesPlaceholder: string;
    inputRequiredTitle: string;
    inputRequiredDescription: string;
    progressDialog: {
      title: string;
      description: string;
      message: string;
      subtext1: string;
      subtext2: string;
      storyCompleted: string;
    };
  };
  storyPageCard: {
    title: (type: PageType) => string;
  };
  gallery: {
    title: string;
    selectKid: string;
    backToKids: string;
    noStoriesYet: string;
    loginPrompt: string;
    loginButton: string;
    viewStories: string;
  };
  storyActions: {
    title: string;
    read: string;
    copyLink: string;
    share: string;
    linkCopiedTitle: string;
    linkCopiedDescription: string;
    copyError: string;
  };
  restartStory: {
    title: string;
    message: string;
    cancel: string;
    restart: string;
  };
  leaveStory: {
    title: string;
    message: string;
    cancel: string;
    leave: string;
  };
  storyReader: {
    loading: string;
    error: string;
    choiceQuestion: string;
    theEnd: string;
    whatIf: string;
    congratsBothPaths: string;
    whichPathWouldYouChoose: string;
    surveyDescription: string;
    thankYou: string;
    choiceSaved: string;
    readAgain: string;
    startReading: string;
    gallery: string;
    rotateDevice: string;
    rotateDeviceMessage: string;
  };
}

export type Translations = {
  [key in Language]: Translation;
}; 