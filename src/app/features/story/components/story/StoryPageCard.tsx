"use client";

import ImageUrl from '@/app/components/common/ImageUrl';
import { PageType, StoryPage, Story, KidDetails } from '@/models';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { PageOperationsService } from '@/app/services/page-operations.service';
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from '@/app/hooks/useTranslation';
import { useErrorReporting } from '@/app/hooks/useErrorReporting';
import { StoryPageImageGenerator } from '@/app/components/common/StoryPageImageGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Pencil, Check } from 'lucide-react';

type StoryPageCardProps = {
  page: StoryPage;
  story: Story;
  kid: KidDetails | null;
  onPageUpdate?: (updatedPage: StoryPage, options?: { skipPersist?: boolean }) => void;
  useAIBots?: boolean; // Flag to control whether to use new AI bot system
  textOnly?: boolean; // Flag to show only text without image generation options
};

export type StoryPageCardHandle = {
  triggerGenerateImage: () => void;
  hasImage: () => boolean;
  isGenerating: () => boolean;
};

export const StoryPageCard = forwardRef<StoryPageCardHandle, StoryPageCardProps>(function StoryPageCard(
  { 
    page: initialPage,
    story,
    kid,
    onPageUpdate,
    useAIBots = false,
    textOnly = false
  }: StoryPageCardProps,
  ref
) {
  const [page, setPage] = useState(initialPage);
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState(initialPage.storyText);
  const [showGeneratedImages, setShowGeneratedImages] = useState(false);
  const [isHoveringText, setIsHoveringText] = useState(false);
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { recordError } = useErrorReporting();

  console.log('[StoryPageCard] State:', {
    isGeneratingImage,
    showGeneratedImages,
    pageNum: page.pageNum,
    hasImage: !!page.selectedImageUrl,
    storyId: story?.id,
    hasStory: !!story
  });

  // Get page type label
  const getPageTypeLabel = (pageType: PageType): string => t.storyPageCard.title(pageType);

  // Get page type color
  const getPageTypeColor = (pageType: PageType): string => {
    switch (pageType) {
      case PageType.COVER:
        return 'bg-purple-100 text-purple-800';
      case PageType.NORMAL:
        return 'bg-blue-100 text-blue-800';
      case PageType.GOOD_CHOICE:
        return 'bg-green-100 text-green-800';
      case PageType.BAD_CHOICE:
        return 'bg-red-100 text-red-800';
      case PageType.GOOD:
        return 'bg-emerald-100 text-emerald-800';
      case PageType.BAD:
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle text regeneration
  const handleRegenerateText = async () => {
    if (isRegeneratingText || !currentUser) return;
    setIsRegeneratingText(true);
    try {
      const newText = await PageOperationsService.regeneratePageText(page, story, currentUser.uid);
      const updatedPage = { ...page, storyText: newText };
      setPage(updatedPage);
      onPageUpdate?.(updatedPage);
    } finally {
      setIsRegeneratingText(false);
    }
  };

  // Handle image selection from the generator
  const handleImageSelect = (imageUrl: string) => {
    console.log('[StoryPageCard] Image selected:', imageUrl);
    const updatedPage = { ...page, selectedImageUrl: imageUrl };
    setPage(updatedPage);
    onPageUpdate?.(updatedPage, { skipPersist: true });
    setIsGeneratingImage(false);
    setShowGeneratedImages(false);
  };

  // Handle image generation error
  const handleImageError = (error: string) => {
    console.error('[StoryPageCard] Image generation error:', error);
    setIsGeneratingImage(false);
    recordError(new Error(error), {
      component: 'StoryPageCard',
      action: 'generateImage',
      pageType: page.pageType,
      pageNum: page.pageNum,
      storyId: story.id
    });
  };

  // Handle when image generation starts
  const handleImageGenerationStart = () => {
    console.log('[StoryPageCard] Image generation started');
    setIsGeneratingImage(true);
    setShowGeneratedImages(true);
  };

  // Handle generate button click
  const handleGenerateClick = () => {
    console.log('[StoryPageCard] Generate button clicked');
    setShowGeneratedImages(true);
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditingText) {
      // Saving changes
      const updatedPage = { ...page, storyText: editedText.trim() };
      setPage(updatedPage);
      onPageUpdate?.(updatedPage);
    } else {
      // Entering edit mode
      setEditedText(page.storyText);
    }
    setIsEditingText(!isEditingText);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedText(page.storyText);
    setIsEditingText(false);
  };

  useEffect(() => {
    setPage(initialPage);
    setEditedText(initialPage.storyText);
  }, [initialPage]);

  useImperativeHandle(
    ref,
    () => ({
      triggerGenerateImage: () => {
        if (!currentUser || !kid) {
          return;
        }
        setShowGeneratedImages(true);
      },
      hasImage: () => Boolean(page.selectedImageUrl),
      isGenerating: () => isGeneratingImage,
    }),
    [currentUser, kid, page.selectedImageUrl, isGeneratingImage]
  );

  return (
    <Card className="relative mt-4">
      {/* Page Type Badge - positioned on top right border */}
      <div className="absolute -top-3 right-4 z-10">
        <span className={`text-xs px-3 py-1 rounded-full ${getPageTypeColor(page.pageType)} shadow-sm`}>
          {getPageTypeLabel(page.pageType)} - {page.pageNum}
        </span>
      </div>

      <CardContent className="space-y-4 pt-6">
        {/* Image-related content - only show if not textOnly mode */}
        {!textOnly && (
          <>
        {/* Current Image Display */}
        {page.selectedImageUrl && !showGeneratedImages && (
          <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden border">
            <ImageUrl
              src={page.selectedImageUrl}
              alt={`${t.createStory.choices.title} ${page.pageNum}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {currentUser && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateClick}
                className="absolute bottom-2 right-2"
                title={t.createStory.preview.regenerate}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}
          </div>
        )}

        {/* Placeholder when no image and not showing generator */}
        {!page.selectedImageUrl && !showGeneratedImages && (
          <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No image generated</p>
              {currentUser && kid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateClick}
                  className="mt-2"
                >
                  Generate Image
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Image Generator Component - Always rendered when showGeneratedImages is true */}
        {showGeneratedImages && currentUser && kid && story?.id && (
          <StoryPageImageGenerator
            storyTitle={story?.title}
            problemDescription={story?.problemDescription}
            userId={currentUser.uid}
            kidDetails={kid}
            page={page}
            storyId={story?.id}
            onImageSelect={handleImageSelect}
            selectedImageUrl={page.selectedImageUrl || undefined}
            onError={handleImageError}
            onGenerationStart={handleImageGenerationStart}
            className="border-0 shadow-none p-0"
            useAIBots={useAIBots}
            onClose={() => {
              if (!isGeneratingImage) {
                setShowGeneratedImages(false);
              }
            }}
            isGeneratingImage={isGeneratingImage}
            autoGenerate={true}
          />
        )}
          </>
        )}

        {/* Action Buttons - above text */}
        {currentUser && !isEditingText && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditToggle}
              className="h-8 w-8 p-0"
              title="Edit text"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {!textOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateText}
                disabled={isRegeneratingText}
                className="h-8 w-8 p-0"
                title={t.createStory.choices.regenerateTitle}
              >
                {isRegeneratingText ? (
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Text Content */}
        <div className="relative">
          {isEditingText ? (
            <div className="space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className={`text-gray-700 resize-none ${textOnly ? 'min-h-[120px]' : 'min-h-[60px]'}`}
                placeholder="Enter story text..."
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p 
              className={`text-gray-700 ${textOnly ? 'text-base leading-relaxed' : (isHoveringText ? '' : 'line-clamp-3')} ${isRegeneratingText ? 'opacity-50' : ''} ${!textOnly ? 'cursor-pointer transition-all' : ''}`}
              onMouseEnter={() => !textOnly && setIsHoveringText(true)}
              onMouseLeave={() => !textOnly && setIsHoveringText(false)}
            >
              {page.storyText}
            </p>
          )}
          {isRegeneratingText && !isEditingText && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});