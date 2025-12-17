import { FC, useState, useCallback, memo } from 'react';
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { KidDetails, Story, StoryStatus, Account } from "@/models";
import { useAuth } from '@/app/context/AuthContext';
import { useAvatarHandling } from '../../hooks/useAvatarHandling';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUrl from "@/app/components/common/ImageUrl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { KidApi, ImageGenerationApi } from '@/app/network';
import useStoryOperations from './hooks/useStoryOperations';
import { getImageUrl } from '@/app/utils/imagePlaceholder';
import { StoryImage } from '@/app/features/story/components/story/StoryImage';
import { PLACEHOLDER_IMAGE } from '@/app/utils/imagePlaceholder';
import { useTranslation } from '@/app/hooks/useTranslation';
import { FirebaseError } from 'firebase/app';
import { getAuth } from 'firebase/auth';


// Types 
interface UserCardProps {
  kid: KidDetails;
  onDelete?: (kidId?: string) => void;
  onEdit?: (kid: KidDetails) => void;
  userAccountData?: Account | null;
}

// Avatar Dialog Component
const AvatarDialog: FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  avatarUrl: string;
  name: string;
  imageAnalysis?: string | object;
  shouldUseDefaultAvatar: boolean;
  kid: KidDetails;
  userId?: string;
  onSelectAvatar: (avatarUrl: string) => Promise<void>;
  t: {
    userCard: {
      imageAnalysisDialog: {
        createAvatar: string;
        generatingAvatar: string;
        generatedAvatars: string;
        avatarGenerationFailed: string;
        selectAvatar: string;
        avatarSelected: string;
        currentAvatar: string;
        selectedAvatar: string;
      };
    };
  };
}> = ({
  isOpen,
  onOpenChange,
  avatarUrl,
  name,
  imageAnalysis,
  shouldUseDefaultAvatar,
  kid,
  userId,
  onSelectAvatar,
  t,
}) => {
  const [generatedAvatars, setGeneratedAvatars] = useState<string[]>([]);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(kid.kidSelectedAvatar || null);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);

  const handleCreateAvatar = async () => {
    if (!userId) return;
    
    setIsGeneratingAvatar(true);
    setAvatarError(null);
    
    try {
      const result = await ImageGenerationApi.generateAvatarImage(
        userId,
        kid,
        imageAnalysis ? (typeof imageAnalysis === 'string' ? imageAnalysis : JSON.stringify(imageAnalysis)) : ''
      );
      
      console.log("[AVATAR_GENERATION] Full response:", result);
      console.log("[AVATAR_GENERATION] Image URLs:", result.success ? result.data : "No URLs");
      console.log("[AVATAR_GENERATION] Number of images:", result.success ? result.data?.length : 0);
      
      if (result.success && result.data) {
        setGeneratedAvatars(result.data);
        console.log("[AVATAR_GENERATION] Set generated avatars:", result.data);
      } else {
        // Handle error response
        setAvatarError(result.error || t.userCard.imageAnalysisDialog.avatarGenerationFailed);
      }
    } catch (error) {
      console.error('Avatar generation error:', error);
      setAvatarError(t.userCard.imageAnalysisDialog.avatarGenerationFailed);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleSelectAvatarClick = async (avatarUrl: string) => {
    setIsSelectingAvatar(true);
    try {
      await onSelectAvatar(avatarUrl);
      setSelectedAvatarUrl(avatarUrl);
      toast({
        title: t.userCard.imageAnalysisDialog.avatarSelected,
        description: t.userCard.imageAnalysisDialog.avatarSelected,
      });
    } catch (error) {
      console.error('Error selecting avatar:', error);
      toast({
        title: "Error",
        description: "Failed to select avatar",
        variant: 'destructive',
      });
    } finally {
      setIsSelectingAvatar(false);
    }
  };

  return (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>Avatar Options</DialogTitle>
        <DialogDescription>
          Create and manage avatar images for {name}
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-6 overflow-y-auto flex-1 pr-2">
        {/* Image Section */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-62 h-62 relative flex-shrink-0">
              <ImageUrl
                src={avatarUrl}
                alt={`${name}'s image`}
                fill
                priority
                sizes="128px"
                style={{ objectFit: "cover" }}
                className="rounded-full border-2 border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Create Avatar Button */}
        <div className="flex justify-center">
          <Button
            variant="default"
            onClick={handleCreateAvatar}
            disabled={isGeneratingAvatar || shouldUseDefaultAvatar}
            className="w-full sm:w-auto"
          >
            {isGeneratingAvatar ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                {t.userCard.imageAnalysisDialog.generatingAvatar}
              </>
            ) : t.userCard.imageAnalysisDialog.createAvatar}
          </Button>
        </div>
        
        {/* Generated Avatars Section */}
        {generatedAvatars.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{t.userCard.imageAnalysisDialog.generatedAvatars} ({generatedAvatars.length})</h4>
            <div className="grid grid-cols-2 gap-4">
              {generatedAvatars.map((avatarUrl, index) => {
                const isSelected = selectedAvatarUrl === avatarUrl;
                const isCurrentAvatar = kid.kidSelectedAvatar === avatarUrl;
                return (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div className={`w-32 h-32 relative flex-shrink-0 rounded-full overflow-hidden ${
                    isSelected || isCurrentAvatar ? 'ring-4 ring-blue-500' : 'border-2 border-gray-200'
                  }`}>
                    <ImageUrl
                      src={avatarUrl}
                      alt={`Generated avatar ${index + 1}`}
                      fill
                      priority
                      sizes="128px"
                      style={{ objectFit: "cover" }}
                      className="rounded-full"
                    />
                    {isCurrentAvatar && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {t.userCard.imageAnalysisDialog.currentAvatar}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isSelected || isCurrentAvatar ? "default" : "outline"}
                    onClick={() => handleSelectAvatarClick(avatarUrl)}
                    disabled={isSelectingAvatar || isCurrentAvatar}
                    className="w-full"
                  >
                    {isSelectingAvatar && selectedAvatarUrl === avatarUrl ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                        Selecting...
                      </>
                    ) : isCurrentAvatar ? (
                      t.userCard.imageAnalysisDialog.currentAvatar
                    ) : (
                      t.userCard.imageAnalysisDialog.selectAvatar
                    )}
                  </Button>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Avatar Section */}
        {kid.kidSelectedAvatar && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-semibold">{t.userCard.imageAnalysisDialog.selectedAvatar}</h4>
            <div className="flex justify-center">
              <div className="w-32 h-32 relative flex-shrink-0 rounded-full overflow-hidden ring-4 ring-green-500">
                <ImageUrl
                  src={kid.kidSelectedAvatar}
                  alt="Selected avatar"
                  fill
                  priority
                  sizes="128px"
                  style={{ objectFit: "cover" }}
                  className="rounded-full"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  {t.userCard.imageAnalysisDialog.currentAvatar}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Avatar Generation Error */}
        {avatarError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{avatarError}</p>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
  );
};

// Share Kid Dialog Component
const ShareKidDialog: FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  kidId: string;
  kidName: string;
  t: {
    userCard: {
      shareDialog: {
        title: string;
        description: string;
        emailLabel: string;
        emailPlaceholder: string;
        shareButton: string;
        sharing: string;
        alreadyShared: string;
        shareSuccess: string;
        shareError: string;
        invalidEmail: string;
      };
    };
  };
}> = ({
  isOpen,
  onOpenChange,
  kidId,
  kidName,
  t,
}) => {
  const [email, setEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleShare = async () => {
    setError(null);
    
    // Validate email
    if (!email.trim()) {
      setError(t.userCard.shareDialog.invalidEmail);
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError(t.userCard.shareDialog.invalidEmail);
      return;
    }

    setIsSharing(true);
    
    try {
      // Get auth token for API call
      const auth = getAuth();
      
      if (!auth.currentUser) {
        setError('User not authenticated');
        setIsSharing(false);
        return;
      }
      
      const token = await auth.currentUser.getIdToken();
      
      if (!token) {
        setError('Failed to get authentication token');
        setIsSharing(false);
        return;
      }
      
      // Use server-side API to share the kid
      const response = await fetch(`/api/user/kids/${kidId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          permission: 'read',
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        setError(result.error || t.userCard.shareDialog.shareError);
        setIsSharing(false);
        return;
      }
      
      toast({
        title: t.userCard.shareDialog.shareSuccess.replace('{email}', email.trim()),
        description: `${kidName} is now shared with ${email.trim()}`,
      });
      
      // Send email notification
      try {
        const emailResponse = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: email.trim(),
            templateId: 'TEST',
            // templateId: 'SHARE_STORY_TEMPLATE',
            variables: {
              SHARE_URL: `${window.location.origin}/dashboard`,
            },
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResult.success) {
          console.error('Failed to send email notification:', emailResult.error);
          // Don't show error to user since sharing was successful
        } else {
          console.log('Email notification sent successfully:', emailResult.id);
        }
      } catch (emailErr) {
        console.error('Error sending email notification:', emailErr);
        // Don't show error to user since sharing was successful
      }
      
      // Reset and close
      setEmail('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error sharing kid:', err);
      setError(t.userCard.shareDialog.shareError);
    } finally {
      setIsSharing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSharing) {
      handleShare();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setEmail('');
        setError(null);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg 
              className="h-5 w-5 text-blue-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
              />
            </svg>
            {t.userCard.shareDialog.title}
          </DialogTitle>
          <DialogDescription>
            {t.userCard.shareDialog.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="share-email">{t.userCard.shareDialog.emailLabel}</Label>
            <Input
              id="share-email"
              type="email"
              placeholder={t.userCard.shareDialog.emailPlaceholder}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isSharing}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing || !email.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {isSharing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t.userCard.shareDialog.sharing}
              </>
            ) : (
              t.userCard.shareDialog.shareButton
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main component
export const UserCard: React.FC<UserCardProps> = memo(({
  kid,
  onDelete: _onDelete,
  onEdit,
  userAccountData,
}) => {
  // Component state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showStoryLimitDialog, setShowStoryLimitDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Hooks
  const router = useRouter();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  
  
  // Use custom hooks
  const { setImageError, displayAvatarUrl, shouldUseDefaultAvatar } = useAvatarHandling({ kid });
  const { 
    stories, 
    isLoading, 
    fetchStories } = useStoryOperations(kid.id, currentUser?.uid);


  // Handler for selecting an avatar
  const handleSelectAvatar = useCallback(async (avatarUrl: string) => {
    if (!currentUser) {
      return;
    }
    
    try {
      // Update kid with selected avatar
      const kidData: KidDetails = {
        ...kid,
        kidSelectedAvatar: avatarUrl
      };
      
      const updateResponse = await KidApi.createOrUpdateKid({
        userId: currentUser.uid,
        kid: kidData
      });
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update kid data');
      }
      
      // Success feedback
      toast({
        title: t.userCard.toasts.avatarSelectedTitle || "Avatar Selected",
        description: t.userCard.toasts.avatarSelectedDescription || "New avatar has been set successfully",
      });
      
      // If there's an onEdit callback, call it
      if (onEdit) {
        onEdit(kidData);
      }
      
    } catch (error) {
      console.error('Error selecting avatar:', error);
      toast({
        title: t.userCard.toasts.avatarSelectionFailedTitle || "Selection Failed",
        description: error instanceof Error ? error.message : 'Failed to select avatar',
        variant: 'destructive',
      });
      throw error; // Re-throw so the dialog can handle the error state
    }
  }, [kid, currentUser, onEdit, t]);

  const handleCreateStory = useCallback(() => {
    // Check if user has reached their story per kid limit
    // Use stories_created (total created including deleted) instead of current story count
    const storiesCreatedCount = kid.stories_created || 0;
    if (userAccountData?.story_per_kid_limit !== undefined && storiesCreatedCount >= userAccountData.story_per_kid_limit) {
      // Show custom dialog instead of alert
      setShowStoryLimitDialog(true);
      return;
    }
    router.push(`/create-a-story/${kid.id}`);
  }, [router, kid, userAccountData]);

  const handleViewStory = useCallback((storyId: string) => {
    router.push(`/stories/${storyId}`);
  }, [router]);

  // Get the kid's name with proper type safety
  const kidName = (() => {
    // First try to use the name property if it's a string
    if (typeof kid.name === 'string' && kid.name.trim()) {
      return kid.name;
    }
    
    // Debug: Log if name property is not a string
    if (kid.name !== undefined && typeof kid.name !== 'string') {
      console.warn('⚠️ kid.name is not a string:', kid.name, 'for kid:', kid.id);
    }
    
    // Fallback to names array if available
    if (kid.names && kid.names.length > 0) {
      const firstName = kid.names[0].firstName;
      const lastName = kid.names[0].lastName;
      
      // Debug: Log if firstName or lastName are not strings
      if (typeof firstName !== 'string') {
        console.warn('⚠️ firstName is not a string:', firstName, 'for kid:', kid.id);
      }
      if (typeof lastName !== 'string') {
        console.warn('⚠️ lastName is not a string:', lastName, 'for kid:', kid.id);
      }
      
      // Ensure firstName and lastName are strings
      const safeFirstName = typeof firstName === 'string' ? firstName : '';
      const safeLastName = typeof lastName === 'string' ? lastName : '';
      
      const fullName = `${safeFirstName} ${safeLastName}`.trim();
      return fullName || t.userCard.unnamedKid;
    }
    
    // Final fallback
    return t.userCard.unnamedKid;
  })();

  const _handleError = (error: FirebaseError) => {
    console.error('Error:', error);
  };

  return (
    <div className="bg-white border-gray-200 border rounded-lg shadow-xl p-6 relative transition-transform duration-300 hover:scale-105 w-full max-w-sm">
      <div className="p-4">
        <div className="flex flex-col items-center mb-4">
          {/* Avatar with reanalyze button overlay */}
          <div className="relative h-40 w-40 rounded-full overflow-hidden mb-3 bg-gray-100 group">
            <ImageUrl
              src={displayAvatarUrl}
              alt={kidName}
              className="object-cover"
              fill
              sizes="96px"
              onError={() => setImageError(true)}
              priority
            />
            {/* Avatar button overlay */}
            {/* <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-white/80 hover:bg-white"
                onClick={() => setShowAnalysis(true)}
              >
                <ImageIcon className="h-4 w-4 text-blue-500" />
              </Button>
            </div> */}
          </div>

          {/* Name and Info */}
          <h2 className="text-xl font-bold text-center">{kidName}</h2>
          <div className="flex justify-center gap-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-800">{kid.age}</span>
              <span className="text-xs">{t.userCard.years}</span>
            </div>
            <div>
              <span className="capitalize">{kid.gender === 'male' ? t.userCard.male : t.userCard.female}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-800">{stories.length}</span>
              <span className="text-xs">{t.userCard.stories}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            <Button
              size="sm"
              onClick={handleCreateStory}
              className="w-full mb-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-4"
            >
              {t.userCard.createStory}
            </Button>
            
            {/* Share Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowShareDialog(true)}
              className="w-full mb-4 rounded-full border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 px-4"
            >
              <svg 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
                />
              </svg>
              {t.userCard.share}
            </Button>
            
            {/* <QuickGenerateDialog 
              kidDetails={kid}
              currentUser={currentUser!}
              onStoryCreated={() => {
                fetchStories(true);
                // router.push(`/stories/${story.id}`);
              }}
              isGenerating={isGenerating}
              onGeneratingChange={setIsGenerating}
            /> */}
          </div>
        </div>
      </div>

      {/* Stories section */}
      <div className="px-5 pt-4 pb-5 border-t border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-800">{t.userCard.storiesTitle}</h4>
          <button 
            onClick={() => fetchStories(true)}
            className="text-gray-400 hover:text-blue-500 p-1 rounded-full hover:bg-gray-50 transition-colors"
            disabled={isLoading}
            aria-label={t.userCard.refreshStories}
            title={t.userCard.refreshStories}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isLoading ? 'animate-spin' : ''}`}>
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
              <path d="M16 21h5v-5"></path>
            </svg>
          </button>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 gap-1 sm:gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full">
                <div className="aspect-video bg-gray-100 rounded-md animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : stories.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-36">
            {stories.map((story: Story) => (
              <div 
                key={story.id}
                className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-2xl hover:border-gray-300 hover:scale-[1.2] hover:z-50 transition-all duration-300 group"
                onClick={() => handleViewStory(story.id)}
              >
                {/* Story Title */}
                <div className="px-2 py-2 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 overflow-hidden relative">
                  <div 
                    className="text-xs font-medium text-gray-800 whitespace-nowrap story-title-container"
                    data-dir={/[\u0590-\u05FF\u0600-\u06FF]/.test(String(story.title)) ? 'rtl' : 'ltr'}
                    style={{
                      direction: /[\u0590-\u05FF\u0600-\u06FF]/.test(String(story.title)) ? 'rtl' : 'ltr',
                      textAlign: /[\u0590-\u05FF\u0600-\u06FF]/.test(String(story.title)) ? 'right' : 'left'
                    }}
                    ref={(el) => {
                      if (el) {
                        const span = el.querySelector('.story-title-text');
                        if (span && span.scrollWidth > span.clientWidth) {
                          span.classList.add('has-overflow');
                        } else if (span) {
                          span.classList.remove('has-overflow');
                        }
                      }
                    }}
                  >
                    <span 
                      className="story-title-text inline-block truncate max-w-full" 
                      title={String(story.title)}
                    >
                      {story.title}
                      <span className="story-title-duplicate hidden mx-8">{story.title}</span>
                    </span>
                  </div>
                </div>
                
                {/* Story Image */}
                <div className="aspect-video bg-gray-100 relative">
                  <StoryImage
                    url={getImageUrl(story.pages?.[0]?.selectedImageUrl)}
                    alt={String(story.title)}
                    fallbackUrl={PLACEHOLDER_IMAGE}
                  />
                  {/* Story status indicator */}
                  {story.status === StoryStatus.GENERATING && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 text-gray-400">
            <p className="text-xs">{t.userCard.noStoriesYet}</p>
          </div>
        )}
      </div>

      {/* Avatar Dialog */}
      <AvatarDialog
        isOpen={showAnalysis}
        onOpenChange={(isOpen) => setShowAnalysis(isOpen)}
        avatarUrl={displayAvatarUrl}
        name={kid.name || ''}
        imageAnalysis={kid.imageAnalysis}
        shouldUseDefaultAvatar={shouldUseDefaultAvatar}
        kid={kid}
        userId={currentUser?.uid}
        onSelectAvatar={handleSelectAvatar}
        t={t}
      />

      {/* Story Limit Dialog */}
      <Dialog open={showStoryLimitDialog} onOpenChange={setShowStoryLimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg 
                className="h-6 w-6 text-yellow-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
              Story Limit Reached
            </DialogTitle>
            <DialogDescription className="pt-4 text-base">
              You have reached the story limit of <span className="font-semibold text-gray-900">{userAccountData?.story_per_kid_limit}</span> for this kid.
              <br /><br />
              Please contact your agent to increase your limit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              onClick={() => setShowStoryLimitDialog(false)}
              className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Kid Dialog */}
      <ShareKidDialog
        isOpen={showShareDialog}
        onOpenChange={setShowShareDialog}
        kidId={kid.id}
        kidName={kidName}
        t={t}
      />
    </div>
  );
});

UserCard.displayName = 'UserCard'; 