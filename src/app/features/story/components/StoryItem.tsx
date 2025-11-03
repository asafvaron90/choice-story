import { FC, useState, useEffect } from 'react';
import ImageUrl from '@/app/components/common/ImageUrl';
import { Trash2 } from 'lucide-react';
import { StoryImageType } from '@/app/utils/storyImageType';
import { storage } from '@choiceStoryWeb/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { Story, StoryStatus, PageType } from '@/models';

interface StoryItemProps {
  story: Story;
  onDelete: (storyId: string) => void;
  onViewStory: (storyId: string) => void;
  generationProgress?: {
    percentage: number;
    message: string;
  };
}

/**
 * Component to display a single story item with cover image and status
 */
const StoryItem: FC<StoryItemProps> = ({ 
  story, 
  onDelete, 
  onViewStory, 
  generationProgress 
}) => {
  const { status, title, id, pages } = story;
  const coverPage = pages.find(page => page.pageType === PageType.COVER);
  const coverImageUrl = coverPage?.selectedImageUrl;
  const [imageUrl, setImageUrl] = useState<string>('/illustrations/STORY_COVER.svg');
  const [imageError, setImageError] = useState(false);
  
  // Status should only block navigation if explicitly 'generating' or has progress status
  const isGenerating = status === StoryStatus.GENERATING || 
                      status?.toString().startsWith('progress_');
  const isNavigable = !isGenerating;
  
  // Calculate percentage based on status if no generationProgress provided
  const percentage = generationProgress?.percentage || getPercentageFromStatus(status?.toString() || '');
  const statusMessage = generationProgress?.message || 
                      (status?.toString().startsWith('progress_') ? 
                      `Generating (${percentage}%)` : 
                      `Generating "${title}"`);
  
  // Use coverImageUrl from the cover page
  useEffect(() => {
    if (!isGenerating) {
      if (coverImageUrl) {
        setImageUrl(coverImageUrl);
      } else {
        // Try to load from Firebase Storage as a fallback
        console.log(`No direct URL for story ${id}, trying Firebase Storage`);
        const loadImageFromStorage = async () => {
          try {
            if (!story.userId || !story.kidId) return;
            
            const folderPath = `users/${story.userId}/${story.kidId}/stories/${id}`;
            const fileName = `${StoryImageType.STORY_COVER}.png`;
            const storageRef = ref(storage, `${folderPath}/${fileName}`);
            const url = await getDownloadURL(storageRef);
            setImageUrl(url);
          } catch (err) {
            console.error(`Failed to load image from storage for story ${id}:`, err);
            setImageError(true);
          }
        };
        loadImageFromStorage();
      }
    }
  }, [story, status, coverImageUrl, id, isGenerating]);

  // If image fails to load, use the placeholder
  const handleImageError = () => {
    console.warn(`Image failed to load for story ${id}, using placeholder`);
    setImageError(true);
    setImageUrl('/illustrations/STORY_COVER.svg');
  };
  
  return (
    <div
      className={`cursor-pointer group relative ${!isNavigable ? 'pointer-events-none' : ''}`}
      onClick={() => isNavigable && onViewStory(id)}
    >
      <div className="overflow-hidden flex flex-col">
        {isGenerating ? (
          <div className="w-full aspect-square bg-gray-50 flex flex-col items-center justify-center p-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-1"></div>
            <p className="text-xs text-gray-600 text-center mb-1 line-clamp-1">Generating &quot;{title}&quot;</p>
            <div className="w-full px-2">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-in-out"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{statusMessage}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative aspect-square w-full">
              <ImageUrl
                src={imageError ? '/illustrations/STORY_COVER.svg' : imageUrl}
                alt={title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 400px"
                style={{ objectFit: "cover" }}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
              {/* Only show delete button for complete or null status stories (any that are navigable) */}
              {isNavigable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 hover:!bg-red-500 text-gray-700 hover:text-white backdrop-blur-sm shadow-sm transition-all duration-200 z-20"
                  title="Delete story"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="hidden">
              <p className="text-xs font-medium line-clamp-1 mt-1">{title}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper function to extract percentage from progress status
const getPercentageFromStatus = (status: string): number => {
  // Check if the status is a progress status (e.g., progress_10)
  if (status.startsWith('progress_')) {
    const percentage = parseInt(status.split('_')[1], 10);
    return percentage;
  }
  return status === 'complete' ? 100 : 0;
};

export default StoryItem; 