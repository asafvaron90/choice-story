"use client";

import { useMemo, memo } from 'react';
import PageCard from './PageCard';
import { PageType, StoryPage } from '@/models';

type GeneratedPagesProps = {
  pages: StoryPage[];
  onRegenerateText: (page: StoryPage) => void;
  onRegenerateImage: (page: StoryPage) => void;
  onSaveText: (page: StoryPage) => void;
  onSaveImage: (page: StoryPage) => void;
  onDeletePage: (page: StoryPage) => void;
  regeneratingTextPage: StoryPage | null;
  regeneratingImagePage: StoryPage | null;
  pagesWithNewText: Set<string>;
  pagesWithNewImage: Set<string>;
  onGeneratePages?: (pageType?: PageType) => void;
  _generating?: boolean;
  generatingCategories?: {
    [key in PageType]?: boolean;
  };
  generationErrors?: {
    [key in PageType]?: string;
  };
};

// Memoized Page Card to prevent unnecessary re-renders
const MemoizedPageCard = memo(({ 
  page, 
  handlers, 
  states 
}: { 
  page: StoryPage;
  handlers: {
    onRegenerateText: (page: StoryPage) => void;
    onRegenerateImage: (page: StoryPage) => void;
    onSaveText: (page: StoryPage) => void;
    onSaveImage: (page: StoryPage) => void;
    onDeletePage: (page: StoryPage) => void;
  };
  states: {
    isRegeneratingText: boolean;
    isRegeneratingImage: boolean;
    hasNewText: boolean;
    hasNewImage: boolean;
  };
}) => (
  <PageCard 
    page={page}
    _onRegenerateText={handlers.onRegenerateText}
    _onRegenerateImage={handlers.onRegenerateImage}
    _onSaveText={handlers.onSaveText}
    _onSaveImage={handlers.onSaveImage}
    onDeletePage={handlers.onDeletePage}
    isRegeneratingText={states.isRegeneratingText}
    isRegeneratingImage={states.isRegeneratingImage}
    _hasNewText={states.hasNewText}
    _hasNewImage={states.hasNewImage}
    _priority={true}
  />
));

MemoizedPageCard.displayName = 'MemoizedPageCard';

// Define category configurations centrally
const CATEGORIES = [
  {
    type: PageType.NORMAL,
    title: "Main Story Pages",
    bgColor: "bg-blue-600",
    textColor: "text-blue-700",
  },
  {
    type: PageType.GOOD,
    title: "Good Outcome Pages",
    bgColor: "bg-green-600", 
    textColor: "text-green-700",
  },
  {
    type: PageType.BAD,
    title: "Bad Outcome Pages",
    bgColor: "bg-red-600",
    textColor: "text-red-700",
  }
];

export const GeneratedPages = ({
  pages,
  onRegenerateText,
  onRegenerateImage,
  onSaveText,
  onSaveImage,
  onDeletePage,
  regeneratingTextPage,
  regeneratingImagePage,
  pagesWithNewText,
  pagesWithNewImage,
  onGeneratePages,
  _generating = false,
  generatingCategories = {},
  generationErrors = {}
}: GeneratedPagesProps) => {
  // Group pages by type using useMemo for performance
  const groupedPages = useMemo(() => {
    // Start with empty arrays for each category
    const groups: Record<PageType, StoryPage[]> = {
      [PageType.NORMAL]: [],
      [PageType.GOOD]: [],
      [PageType.BAD]: [],
      [PageType.COVER]: [],
      [PageType.GOOD_CHOICE]: [],
      [PageType.BAD_CHOICE]: []
    };
    
    // Group pages by type
    pages.forEach(page => {
      if (groups[page.pageType]) {
        groups[page.pageType].push(page);
      }
    });
    
    return groups;
  }, [pages]);
  
  // Reusable handler functions
  const handlers = useMemo(() => ({
    onRegenerateText,
    onRegenerateImage,
    onSaveText,
    onSaveImage,
    onDeletePage
  }), [onRegenerateText, onRegenerateImage, onSaveText, onSaveImage, onDeletePage]);
  
  // Count how many categories are generating
  const generatingCount = useMemo(() => 
    Object.values(generatingCategories).filter(Boolean).length, 
    [generatingCategories]
  );
  
  // Render a category row
  const renderCategoryRow = (category: typeof CATEGORIES[0]) => {
    const { type, title, bgColor, textColor } = category;
    const categoryPages = groupedPages[type] || [];
    const isCategoryGenerating = !!generatingCategories[type];
    const categoryError = generationErrors[type];
    
    return (
      <div className="mb-8" key={type}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${textColor}`}>{title}</h3>
          <button
            onClick={() => onGeneratePages?.(type)}
            disabled={isCategoryGenerating}
            className={`px-4 py-2 rounded-full ${
              isCategoryGenerating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : `${bgColor} hover:opacity-90`
            } text-white transition-all shadow-md flex items-center space-x-2`}
          >
            {isCategoryGenerating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Generate Images</span>
              </>
            )}
          </button>
        </div>
        
        {/* Category-specific error message */}
        {categoryError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {categoryError}
          </div>
        )}
        
        {categoryPages.length > 0 ? (
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4" style={{ minWidth: 'max-content' }}>
              {categoryPages.map(page => {
                const pageId = `${page.pageType}-${page.pageNum}`;
                return (
                  <div key={pageId} className="w-80 flex-shrink-0">
                    <MemoizedPageCard 
                      page={page}
                      handlers={handlers}
                      states={{
                        isRegeneratingText: regeneratingTextPage?.pageNum === page.pageNum && 
                          (regeneratingTextPage?.pageType === page.pageType),
                        isRegeneratingImage: regeneratingImagePage?.pageNum === page.pageNum && 
                          (regeneratingImagePage?.pageType === page.pageType),
                        hasNewText: pagesWithNewText.has(`${page.pageNum}-${page.pageType}`),
                        hasNewImage: pagesWithNewImage.has(`${page.pageNum}-${page.pageType}`)
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 border border-dashed rounded-lg bg-gray-50 flex items-center justify-center">
            <p className="text-gray-500">No pages in this category yet. Click "Generate Images" to create them.</p>
          </div>
        )}
      </div>
    );
  };
  
  // Generate status message based on which categories are generating
  const generationStatusMessage = useMemo(() => {
    if (generatingCount === 1) {
      if (generatingCategories[PageType.NORMAL]) return "Generating images for Main Story pages...";
      if (generatingCategories[PageType.GOOD]) return "Generating images for Good Outcome pages...";
      if (generatingCategories[PageType.BAD]) return "Generating images for Bad Outcome pages...";
      return "Generating images...";
    }
    return `Generating images for ${generatingCount} categories in parallel...`;
  }, [generatingCount, generatingCategories]);
  
  return (
    <div className="space-y-4 mb-12">
      <h2 className="text-2xl font-bold text-center mb-6">Story Pages</h2>
      
      {/* Generation status summary */}
      {generatingCount > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-blue-700">{generationStatusMessage}</p>
          </div>
        </div>
      )}
      
      {/* Render each category row */}
      {CATEGORIES.map(renderCategoryRow)}
      
      {/* Loading indicator for regenerating specific content */}
      {(regeneratingTextPage || regeneratingImagePage) && (
        <div className="fixed bottom-6 left-6 bg-black/90 text-white px-4 py-2 rounded-full shadow-md z-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span>
              {regeneratingTextPage ? 
                `Regenerating text for page ${regeneratingTextPage.pageNum}...` : 
                `Regenerating image for page ${regeneratingImagePage?.pageNum}...`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(GeneratedPages); 