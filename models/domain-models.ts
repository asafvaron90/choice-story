/**
 * Domain Models
 * This file contains the core business entities of the application
 */

// Define Language type locally since functions can't access app directory
export type Language = "en" | "he";

// User model
export interface Account {
  uid: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  metadata?: Record<string, unknown>;
  createAt: Date;
  lastUpdated: Date;
}

export interface Name {
  firstName: string;
  lastName: string;
  languageCode: Language;
}

// Kid model definition
export interface KidDetails {
  id: string;
  accountId: string; // Reference to the account that owns this kid
  names: Name[];
  age: number;
  gender: Gender;
  imageAnalysis?: string;
  avatarUrl?: string;
  kidSelectedAvatar?: string; // URL of the selected generated avatar
  stories?: Story[];
  createdAt?: Date;
  lastUpdated?: Date;
  
  // Instead of using the getter, let's define name as a property
  // that can be set by the utility functions below
  name?: string;
}


// End of story selection model
export interface EndOfStorySelection {
  timestamp: Date;
  choice: 'good' | 'bad';
}

// Story model 
export interface Story {
  id: string;
  kidId: string;
  accountId: string; // Reference to the account that owns this story (formerly userId)
  userId: string; // DEPRECATED: keeping for backward compatibility, use accountId instead
  title: string;
  problemDescription: string;
  advantages: string;
  disadvantages: string;
  selectedTitle?: string | null;
  status: StoryStatus;
  pages: StoryPage[];
  titles?: string[] | null;
  endOfStorySelections?: EndOfStorySelection[];
  createdAt: Date;
  lastUpdated: Date;
}

// Story page model
export interface StoryPage {
  pageType: PageType;
  storyText: string;
  pageNum: number;
  selectedImageUrl?: string | null;
  imagesUrls?: string[];
  imagePrompt: string;
}

interface StoryPageJson {
  pageType?: string;
  storyText?: string;
  pageNum?: number;
  selectedImageUrl?: string;
  imagesUrls?: string[];
  imagePrompt?: string;
}

// Story generation settings
export interface StoryGenerationSettings {
  kidId: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  title: string;
  problemDescription: string;
  language?: string;
}

// Image generation settings
export interface ImageGenerationSettings {
  kidImage: string;
  imageAnalysis?: string;
  prompt: string;
  age: number;
  gender: 'male' | 'female';
  isAvatar?: boolean;
}

// Gender enum
export enum Gender {
  male = 'male',
  female = 'female',
}

// Story status enum
export enum StoryStatus {
  // Story is incomplete - only text is generated
  INCOMPLETE = 'incomplete',
  // Story is generating images - all types of images are generating
  GENERATING = 'generating',
  // Story is complete - all images are generated and selected
  COMPLETE = 'complete',
  // Progress percentages for more granular status tracking
  PROGRESS10 = '10%',
  PROGRESS20 = '20%',
  PROGRESS30 = '30%',
  PROGRESS40 = '40%',
  PROGRESS50 = '50%',
  PROGRESS60 = '60%',
  PROGRESS70 = '70%',
  PROGRESS80 = '80%',
  PROGRESS90 = '90%'
}

// Page type enum
export enum PageType {
  GOOD = 'good',
  BAD = 'bad',
  NORMAL = 'normal',
  COVER = 'cover',
  BAD_CHOICE = 'bad_choice',
  GOOD_CHOICE = 'good_choice'
}

/**
 * KidDetailsUtils - Utilities for working with KidDetails
 * Provides methods to get and set the name property based on the names array
 */
export class KidDetailsUtils {
  /**
   * Updates the kid's name property based on the current language
   * @param kid The KidDetails object to update
   * @param language The language to use for the name
   * @returns The updated KidDetails object with name property set
   */
  static updateNameProperty(kid: KidDetails, language: Language = 'he'): KidDetails {
    if (!kid) return kid;
    
    // Set the name property
    kid.name = getKidName(kid, language);
    return kid;
  }
  
  /**
   * Updates an array of KidDetails objects, setting the name property for each
   * @param kids Array of KidDetails objects
   * @param language The language to use for the names
   * @returns The updated array with name properties set
   */
  static updateAllNamesProperties(kids: KidDetails[], language: Language = 'he'): KidDetails[] {
    return kids.map(kid => this.updateNameProperty(kid, language));
  }

}

/**
 * Get the kid's full name in the specified language
 * @param kid The KidDetails object containing names array
 * @param language The language code to get the name for
 * @returns The full name (firstName + lastName) in the specified language, 
 *          or the first available name if the language is not found
 */
export function getKidName(kid: KidDetails | null | undefined, language: Language = 'he'): string {
  if (!kid || !kid.names || kid.names.length === 0) {
    return '';
  }

  // Try to find name in the specified language
  const nameInLanguage = kid.names.find(name => name.languageCode === language);
  
  // If found, return the full name
  if (nameInLanguage) {
    return `${nameInLanguage.firstName} ${nameInLanguage.lastName}`.trim();
  }
  
  // Fallback to the first available name
  const fallbackName = kid.names[0];
  return `${fallbackName.firstName} ${fallbackName.lastName}`.trim();
}


/**
 * Convert a string value to a PageType enum value
 * @param type The string value to convert
 * @returns The matching PageType enum value or NORMAL if no match is found
 */
export function pageTypeFromString(type: string): PageType {
  // Normalize the type string (convert to lowercase, handle hyphens/underscores)
  const normalizedType = type.toLowerCase().replace('-', '_');
  
  // Check for exact matches with enum values
  switch (normalizedType) {
    case 'good':
    case 'goodflow':
      return PageType.GOOD;
    case 'bad':
    case 'badflow':
      return PageType.BAD;
    case 'cover':
      return PageType.COVER;
    case 'good_choice':
      return PageType.GOOD_CHOICE;
    case 'bad_choice':
      return PageType.BAD_CHOICE;
    case 'normal':
      return PageType.NORMAL;
    case 'choice':
      // We need to determine if it's good or bad based on content elsewhere
      return PageType.NORMAL;
    default:
      console.warn(`Unknown page type: ${type}, defaulting to NORMAL`);
      return PageType.NORMAL;
  }
}

// Story utility functions
export const Story = {
  createEmptyStory: (): Story => {
    return {
      id: '',
      kidId: '',
      accountId: '',
      userId: '', // DEPRECATED: keeping for backward compatibility
      title: '',
      problemDescription: '',
      advantages: '',
      disadvantages: '',
      status: StoryStatus.INCOMPLETE,
      pages: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };
  },
  storyPageFromJson(json: StoryPageJson): StoryPage {
    return {
      pageType: pageTypeFromString(json.pageType || 'normal'),
      storyText: json.storyText || '',
      pageNum: typeof json.pageNum === 'number' ? json.pageNum : 0,
      selectedImageUrl: json.selectedImageUrl,
      imagesUrls: Array.isArray(json.imagesUrls) ? json.imagesUrls : undefined,
      imagePrompt: json.imagePrompt || ''
    };
  },
  // Ensure dates are proper Date objects
  ensureDates: (story: Story): Story => {
    return {
      ...story,
      createdAt: story.createdAt instanceof Date ? story.createdAt : new Date(story.createdAt || Date.now()),
      lastUpdated: story.lastUpdated instanceof Date ? story.lastUpdated : new Date(story.lastUpdated || Date.now())
    };
  },
  
  getPagesByType: (story: Story, pageType: PageType): StoryPage[] => {
    return story.pages?.filter((page: StoryPage) => page.pageType === pageType) ?? [];
  },

  // Update story progress based on a percentage value
  updateProgress: (story: Story, progressPercentage: number): Story => {
    let newStatus: StoryStatus;
    
    if (progressPercentage >= 100) {
      newStatus = StoryStatus.COMPLETE;
    } else if (progressPercentage >= 90) {
      newStatus = StoryStatus.PROGRESS90;
    } else if (progressPercentage >= 80) {
      newStatus = StoryStatus.PROGRESS80;
    } else if (progressPercentage >= 70) {
      newStatus = StoryStatus.PROGRESS70;
    } else if (progressPercentage >= 60) {
      newStatus = StoryStatus.PROGRESS60;
    } else if (progressPercentage >= 50) {
      newStatus = StoryStatus.PROGRESS50;
    } else if (progressPercentage >= 40) {
      newStatus = StoryStatus.PROGRESS40;
    } else if (progressPercentage >= 30) {
      newStatus = StoryStatus.PROGRESS30;
    } else if (progressPercentage >= 20) {
      newStatus = StoryStatus.PROGRESS20;
    } else if (progressPercentage >= 10) {
      newStatus = StoryStatus.PROGRESS10;
    } else if (progressPercentage > 0) {
      newStatus = StoryStatus.GENERATING;
    } else {
      newStatus = StoryStatus.INCOMPLETE;
    }
    
    return {
      ...story,
      status: newStatus,
      lastUpdated: new Date()
    };
  },

  // Create a story from raw data (like API response)
  fromJson: (data: Partial<Story & { pages: Partial<StoryPage>[] }>): Story | null => {
    if (!data) return null;
    
    return {
      id: data.id || '',
      kidId: data.kidId || '',
      accountId: data.accountId || data.userId || '', // Fallback to userId for backward compatibility
      userId: data.userId || data.accountId || '', // DEPRECATED: keeping for backward compatibility
      title: data.title || '',
      problemDescription: data.problemDescription || '',
      advantages: data.advantages || '',
      disadvantages: data.disadvantages || '',
      selectedTitle: data.selectedTitle || null,
      status: data.status || StoryStatus.INCOMPLETE,
      pages: Array.isArray(data.pages) ? data.pages
        .map((p: Partial<StoryPage>) => typeof p === 'object' ? Story.storyPageFromJson(p as StoryPageJson) : null)
        .filter((p): p is StoryPage => p !== null) : [],
      titles: data.titles || null,
      endOfStorySelections: Array.isArray(data.endOfStorySelections) 
        ? data.endOfStorySelections.map((s: EndOfStorySelection) => ({
            timestamp: s.timestamp ? new Date(s.timestamp) : new Date(),
            choice: s.choice
          }))
        : undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date()
    };
  },
  
  // Convert to JSON for API requests
  toJson: (story: Story): Story & { createdAt: Date; lastUpdated: Date } => {
    return {
      ...story,
      createdAt: story.createdAt instanceof Date ? story.createdAt : new Date(story.createdAt || Date.now()),
      lastUpdated: story.lastUpdated instanceof Date ? story.lastUpdated : new Date(story.lastUpdated || Date.now())
    };
  }
};
