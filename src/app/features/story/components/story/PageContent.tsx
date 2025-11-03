"use client";

import { memo } from 'react';
import { PageType, StoryPage } from '@/models';
import PageCard from './PageCard';

type PageContentProps = {
  // Core props - these are essential
  categoryType: PageType;
  title: string;
  pages: StoryPage[];
  
  // Primary callbacks
  generatePagesCallback?: (pageType: PageType) => void;
  savePagesCallback?: () => void;
  showSaveButton?: boolean;
  
  // Page action handlers
  onRegenerateText?: (page: StoryPage) => void;
  onRegenerateImage?: (page: StoryPage) => void;
  onSaveText?: (page: StoryPage) => void;
  onSaveImage?: (page: StoryPage) => void;
  onDeletePage?: (page: StoryPage) => void;
  
  // Simple loading states
  isGenerating?: boolean;
  generationError?: string | null;
};

// Function to get category-specific styling
const getCategoryStyles = (pageType: PageType) => {
  switch(pageType) {
    case PageType.NORMAL:
      return {
        bgColor: "bg-blue-600",
        hoverColor: "hover:bg-blue-700",
        textColor: "text-blue-700",
      };
    case PageType.GOOD:
      return {
        bgColor: "bg-green-600",
        hoverColor: "hover:bg-green-700",
        textColor: "text-green-700",
      };
    case PageType.BAD:
      return {
        bgColor: "bg-red-600",
        hoverColor: "hover:bg-red-700",
        textColor: "text-red-700",
      };
    default:
      return {
        bgColor: "bg-gray-600",
        hoverColor: "hover:bg-gray-700",
        textColor: "text-gray-700",
      };
  }
};

const PageContent = ({
  categoryType,
  title,
  pages = [], // Provide default empty array to prevent undefined
  generatePagesCallback,
  savePagesCallback,
  showSaveButton = false,
  onRegenerateText,
  onRegenerateImage,
  onSaveText,
  onSaveImage,
  onDeletePage,
  isGenerating = false,
  generationError = null
}: PageContentProps) => {
  const styles = getCategoryStyles(categoryType);
  
  // Safely filter pages to show only those of the specified category type
  // Add defensive check to prevent potential "undefined" errors
  const categoryPages = Array.isArray(pages) 
    ? pages.filter(page => page && page.pageType === categoryType) 
    : [];
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-xl font-bold ${styles.textColor}`}>{title}</h3>
        
        {generatePagesCallback && (
          <button
            onClick={() => generatePagesCallback(categoryType)}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-full ${
              isGenerating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : `${styles.bgColor} ${styles.hoverColor}`
            } text-white transition-all shadow-md flex items-center space-x-2`}
          >
            {isGenerating ? (
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
        )}
      </div>
      
      {/* Error message */}
      {generationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {generationError}
        </div>
      )}
      
      {/* Pages display with safe checks */}
      {categoryPages.length > 0 ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex space-x-4" style={{ minWidth: 'max-content' }}>
            {categoryPages.map(page => (
              <div key={`${page.pageNum}-${page.pageType}`} className="w-80 flex-shrink-0">
                <PageCard 
                  page={page}
                  _onRegenerateText={onRegenerateText}
                  _onRegenerateImage={onRegenerateImage}
                  _onSaveText={onSaveText}
                  _onSaveImage={onSaveImage}
                  onDeletePage={onDeletePage}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 border border-dashed rounded-lg bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">No pages in this category yet. Click "Generate Images" to create them.</p>
        </div>
      )}
      
      {/* Optional Save Button with safe check */}
      {savePagesCallback && showSaveButton && categoryPages.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={savePagesCallback}
            className={`px-4 py-2 rounded-md ${styles.bgColor} text-white hover:opacity-90 transition-colors shadow-sm`}
          >
            Save {title}
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(PageContent); 