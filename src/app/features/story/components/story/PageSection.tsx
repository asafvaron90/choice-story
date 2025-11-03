"use client";

import { PageType, StoryPage } from '@/models';
import PageCard from './PageCard';

type PageSectionProps = {
  title: string;
  titleColor: string;
  pages: StoryPage[];
  pageType: PageType;
  onRegenerateText: (page: StoryPage) => void;
  onRegenerateImage: (page: StoryPage) => void;
  onSaveText: (page: StoryPage) => void;
  onSaveImage: (page: StoryPage) => void;
  onDeletePage: (page: StoryPage) => void;
  regeneratingTextPage: StoryPage | null;
  regeneratingImagePage: StoryPage | null;
  pagesWithNewText: Set<string>;
  pagesWithNewImage: Set<string>;
};

export const PageSection = ({
  title,
  titleColor,
  pages,
  pageType,
  onRegenerateText,
  onRegenerateImage,
  onSaveText,
  onSaveImage,
  onDeletePage,
  regeneratingTextPage,
  regeneratingImagePage,
  pagesWithNewText,
  pagesWithNewImage
}: PageSectionProps) => {
  if (pages.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className={`text-xl font-semibold ${titleColor}`}>{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map(page => {
          const pageKey = `${page.pageNum}-${pageType}`;
          const hasNewGeneratedText = pagesWithNewText.has(pageKey);
          const hasNewGeneratedImage = pagesWithNewImage.has(pageKey);
          
          return (
            <PageCard 
              key={`${pageType}-${page.pageNum}`} 
              page={page}
              _onRegenerateText={onRegenerateText}
              _onRegenerateImage={onRegenerateImage}
              _onSaveText={onSaveText}
              _onSaveImage={onSaveImage}
              onDeletePage={onDeletePage}
              isRegeneratingText={regeneratingTextPage?.pageNum === page.pageNum && 
                regeneratingTextPage?.pageType === pageType}
              isRegeneratingImage={regeneratingImagePage?.pageNum === page.pageNum && 
                regeneratingImagePage?.pageType === pageType}
              _hasNewText={hasNewGeneratedText}
              _hasNewImage={hasNewGeneratedImage}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PageSection; 