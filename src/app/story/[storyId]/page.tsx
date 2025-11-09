"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ImageUrl from '@/app/components/common/ImageUrl';
import { Story, StoryPage, PageType } from '@/models';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryApi } from '@/app/network/StoryApi';

type ScreenCategory = 'small' | 'medium' | 'large';

const getScreenCategory = (width: number): ScreenCategory => {
  if (width < 768) return 'small';
  if (width < 1280) return 'medium';
  return 'large';
};


// Types
interface StoryReaderProps {
  story: Story;
  currentPage: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onFinish: () => void;
  onSelectChoice: (choice: 'good' | 'bad') => void;
  selectedChoice?: 'good' | 'bad';
  readPaths: Set<'good' | 'bad'>;
  showSurvey: boolean;
  onSelectFinalChoice: (choice: 'good' | 'bad') => void;
  surveyCompleted: boolean;
  screenCategory: ScreenCategory;
}

// Helper function to detect if text contains Hebrew characters
const isHebrew = (text: string): boolean => {
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
};

// Components
const LoadingStory = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
    <motion.div 
      className="mb-6"
      animate={{ rotateZ: [0, 360] }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"></div>
    </motion.div>
    <h2 className="text-2xl font-bold text-purple-700">Loading your story...</h2>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="container h-screen flex items-center justify-center mx-auto px-4 py-8 bg-gradient-to-b from-blue-50 to-purple-50">
    <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-xl w-full">
      <h2 className="text-2xl font-bold text-red-700 mb-2">Oops! Something went wrong</h2>
      <p className="text-red-700">{message}</p>
    </div>
  </div>
);

const StoryPageComponent = ({
  page,
  overlayDimmed,
  onToggleOverlay,
  screenCategory,
}: {
  page: StoryPage;
  overlayDimmed: boolean;
  onToggleOverlay: () => void;
  screenCategory: ScreenCategory;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [_overlayTimeout, _setOverlayTimeout] = useState<NodeJS.Timeout | null>(null);

  const overlayMaxHeight = screenCategory === 'large' ? '40vh' : screenCategory === 'medium' ? '50vh' : '60vh';
  const overlayPadding = screenCategory === 'large' ? 'p-6 md:p-10' : screenCategory === 'medium' ? 'p-6 md:p-8' : 'p-5';
  const overlayWidthClass = screenCategory === 'large' ? 'max-w-3xl' : screenCategory === 'medium' ? 'max-w-2xl' : 'max-w-xl';
  const textSizeClass = screenCategory === 'large' ? 'text-2xl md:text-3xl' : screenCategory === 'medium' ? 'text-2xl' : 'text-xl';
  const toggleButtonPosition = screenCategory === 'large' ? 'right-20' : 'right-4';

  // Get fallback image based on page type
  const getFallbackImage = (): string => {
    switch (page.pageType) {
      case PageType.COVER:
        return '/illustrations/STORY_COVER.svg';
      case PageType.NORMAL:
        return '/illustrations/STORY_NORMAL_PAGE.svg';
      case PageType.GOOD_CHOICE:
        return '/illustrations/STORY_GOOD_CHOICE.svg';
      case PageType.BAD_CHOICE:
        return '/illustrations/STORY_BAD_CHOICE.svg';
      case PageType.GOOD:
        return '/illustrations/STORY_GOOD_PAGE.svg';
      case PageType.BAD:
        return '/illustrations/STORY_BAD_PAGE.svg';
      default:
        return '/illustrations/STORY_PLACEHOLDER.svg';
    }
  };

  // Drop cap logic
  const getDropCapText = (text: string) => {
    if (!text) return null;
    // Find the first alphabetical character
    const match = text.match(/([A-Za-zא-ת])/); // Add Hebrew range if needed
    if (!match) return text; // fallback: no letter found
    const firstLetterIdx = match.index ?? 0;
    return (
      <span style={{ fontFamily: 'inherit' }}>
        {text.slice(0, firstLetterIdx)}
        <span
          className="text-purple-500 text-5xl md:text-6xl font-extrabold drop-shadow-lg leading-none align-baseline mr-2"
          style={{ fontFamily: 'inherit', lineHeight: '1', verticalAlign: 'baseline' }}
        >
          {text[firstLetterIdx]}
        </span>
        {text.slice(firstLetterIdx + 1)}
      </span>
    );
  };

  return (
    <div
      className="relative w-full h-full min-h-screen min-w-screen overflow-hidden select-none"
      tabIndex={0}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Full-page image background */}
      <div className="absolute inset-0 w-full h-full z-0">
        {imageLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 animate-pulse flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
            />
          </div>
        )}
        <ImageUrl
          src={imageError || !page.selectedImageUrl ? getFallbackImage() : page.selectedImageUrl}
          alt={`Illustration for page ${page.pageNum}`}
          fill
          className={`object-contain transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          sizes="100vw"
          priority
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => setImageLoading(false)}
        />
        {/* Optional: subtle vignette for readability */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/10 via-transparent to-black/30" />
      </div>
      {/* Text overlay */}
      <motion.div
        initial={{ opacity: 0.98 }}
        animate={{ opacity: overlayDimmed ? 0.01 : 0.98 }}
        transition={{ duration: 0.3 }}
        className="absolute left-0 right-0 bottom-0 z-10 flex justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`m-4 mb-8 ${overlayWidthClass} w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl ${overlayPadding} text-center overflow-y-auto`}
          style={{
            maxHeight: overlayMaxHeight,
            fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
            pointerEvents: 'auto',
          }}
        >
          <p className={`${textSizeClass} font-bold leading-relaxed text-purple-900 storybook-font`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.08)', wordBreak: 'break-word' }} dir="ltr">
            {getDropCapText(page.storyText)}
          </p>
        </div>
      </motion.div>

      {/* Show/Hide Text Button (top right, next to fullscreen) */}
      {/* <div className={`absolute top-4 ${toggleButtonPosition} z-20`}>
        <button
          onClick={onToggleOverlay}
          className="p-3 bg-white/80 backdrop-blur-sm hover:bg-white text-purple-600 rounded-full shadow-lg transition-colors mr-2"
          aria-label={overlayDimmed ? 'Show Text' : 'Hide Text'}
        >
          {overlayDimmed ? (
            // Eye icon SVG
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ) : (
            // Eye-off icon SVG
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 002.25 12s3.75 7.5 9.75 7.5c1.772 0 3.366-.312 4.74-.832M6.228 6.228A10.45 10.45 0 0112 4.5c6 0 9.75 7.5 9.75 7.5a17.896 17.896 0 01-3.197 4.412M6.228 6.228l11.544 11.544M6.228 6.228L3 3m0 0l3.228 3.228M3 3l3.228 3.228" />
            </svg>
          )}
        </button>
      </div> */}
    </div>
  );
};

const ChoiceSelection = ({
  goodChoice,
  badChoice,
  onSelectChoice,
  screenCategory,
}: {
  goodChoice: StoryPage;
  badChoice: StoryPage;
  onSelectChoice: (choice: 'good' | 'bad') => void;
  screenCategory: ScreenCategory;
}) => {
  const [goodImageError, setGoodImageError] = useState(false);
  const [badImageError, setBadImageError] = useState(false);
  const [goodImageLoading, setGoodImageLoading] = useState(true);
  const [badImageLoading, setBadImageLoading] = useState(true);

  const headingClass = screenCategory === 'large' ? 'text-4xl md:text-5xl' : screenCategory === 'medium' ? 'text-4xl' : 'text-3xl';
  const choiceTextClass = screenCategory === 'large' ? 'text-2xl md:text-3xl' : screenCategory === 'medium' ? 'text-2xl' : 'text-xl';
  const gridColumnsClass = screenCategory === 'small' ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full flex flex-col items-center justify-center p-6"
    >
      <motion.h2 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`${headingClass} font-bold text-center text-purple-800 mb-8`}
        style={{
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          fontFamily: '"Comic Sans MS", "Comic Sans", cursive'
        }}
      >
        What will you choose?
      </motion.h2>

      <div className={`grid ${gridColumnsClass} gap-8 max-w-6xl w-full`}>
        <motion.button
          whileHover={{ opacity: 1 }}
          whileTap={{}}
          onClick={() => onSelectChoice('good')}
          className="bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-3xl p-6 text-left transition-all shadow-xl hover:shadow-2xl"
        >
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6">
            {goodImageLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 animate-pulse flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full"
                />
              </div>
            )}
            <ImageUrl
              src={goodImageError || !goodChoice.selectedImageUrl ? '/illustrations/STORY_GOOD_CHOICE.svg' : goodChoice.selectedImageUrl}
              alt="Good choice"
              fill
              className={`object-cover transition-opacity duration-300 ${goodImageLoading ? 'opacity-0' : 'opacity-100'}`}
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={() => {
                setGoodImageError(true);
                setGoodImageLoading(false);
              }}
              onLoad={() => setGoodImageLoading(false)}
            />
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${choiceTextClass} font-bold text-green-700 leading-relaxed`}
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              fontFamily: '"Comic Sans MS", "Comic Sans", cursive'
            }}
          >
            {goodChoice.storyText}
          </motion.p>
        </motion.button>

        <motion.button
          whileHover={{ opacity: 1 }}
          whileTap={{}}
          onClick={() => onSelectChoice('bad')}
          className="bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 rounded-3xl p-6 text-left transition-all shadow-xl hover:shadow-2xl"
        >
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6">
            {badImageLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-rose-100 animate-pulse flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full"
                />
              </div>
            )}
            <ImageUrl
              src={badImageError || !badChoice.selectedImageUrl ? '/illustrations/STORY_BAD_CHOICE.svg' : badChoice.selectedImageUrl}
              alt="Bad choice"
              fill
              className={`object-cover transition-opacity duration-300 ${badImageLoading ? 'opacity-0' : 'opacity-100'}`}
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={() => {
                setBadImageError(true);
                setBadImageLoading(false);
              }}
              onLoad={() => setBadImageLoading(false)}
            />
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${choiceTextClass} font-bold text-red-700 leading-relaxed`}
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              fontFamily: '"Comic Sans MS", "Comic Sans", cursive'
            }}
          >
            {badChoice.storyText}
          </motion.p>
        </motion.button>
      </div>
    </motion.div>
  );
};

const StoryEnd = ({
  onTryOtherPath,
  otherChoice,
  hasReadBothPaths,
  story,
  screenCategory,
}: {
  onTryOtherPath: () => void;
  otherChoice: StoryPage;
  hasReadBothPaths: boolean;
  story: Story;
  screenCategory: ScreenCategory;
}) => {
  const isHebrewStory = isHebrew(story.title || story.problemDescription);
  const containerDirection = screenCategory === 'small' ? 'flex-col' : 'flex-row';
  const imageSectionClasses = screenCategory === 'small'
    ? 'w-full p-6 flex items-center justify-center relative bg-gradient-to-br from-white/90 to-yellow-100 rounded-t-2xl'
    : 'w-1/2 p-6 flex items-center justify-center relative bg-gradient-to-br from-white/90 to-yellow-100 rounded-l-2xl';
  const contentSectionClasses = screenCategory === 'small'
    ? 'w-full p-8 flex flex-col items-center justify-center bg-gradient-to-br from-white/90 to-purple-50 rounded-b-2xl'
    : 'w-1/2 p-8 flex flex-col items-center justify-center bg-gradient-to-br from-white/90 to-purple-50 rounded-r-2xl';
  const headingClass = screenCategory === 'large' ? 'text-4xl md:text-5xl' : screenCategory === 'medium' ? 'text-4xl' : 'text-3xl';
  const bodyTextClass = screenCategory === 'large' ? 'text-2xl' : screenCategory === 'medium' ? 'text-2xl' : 'text-xl';
  const detailTextClass = screenCategory === 'small' ? 'text-lg' : 'text-xl';
  const buttonTextClass = screenCategory === 'small' ? 'text-xl' : 'text-2xl';
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className={`relative w-full max-w-5xl mx-auto flex ${containerDirection} rounded-3xl shadow-2xl bg-gradient-to-br from-yellow-50 to-purple-100 border-8 border-white`} style={{ minHeight: '60vh' }}>
        {/* Left page: Illustration */}
        <div className={imageSectionClasses}>
          <div className="relative w-full aspect-[4/3] flex items-center justify-center">
            <ImageUrl
              src={otherChoice.selectedImageUrl || '/illustrations/STORY_PLACEHOLDER.svg'}
              alt="Other choice"
              fill
              className="object-contain rounded-xl shadow-lg"
              sizes="50vw"
            />
          </div>
        </div>
        {/* Book spine */}
        {screenCategory !== 'small' && (
          <div className="w-2 bg-gradient-to-b from-yellow-300 to-purple-200 shadow-inner rounded-full mx-1" style={{ minHeight: '70vh' }} />
        )}
        {/* Right page: End message and button */}
        <div className={contentSectionClasses}>
          <div className="max-w-lg w-full text-center flex flex-col items-center justify-center gap-6">
            <h2 className={`${headingClass} font-bold text-purple-800 mb-2`} style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }} dir={isHebrewStory ? 'rtl' : 'ltr'}>
              {isHebrewStory ? '!הסוף' : 'The End!'}
            </h2>
            {!hasReadBothPaths ? (
              <>
                <p className={`${bodyTextClass} text-purple-600 mb-2`} style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }} dir={isHebrewStory ? 'rtl' : 'ltr'}>
                  {isHebrewStory ? 'רוצה לנסות את המסלול השני?' : 'Would you like to try the other path?'}
                </p>
                <p className={`${detailTextClass} text-purple-900 mb-4`} style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }} dir={isHebrewStory ? 'rtl' : 'ltr'}>{otherChoice.storyText}</p>
                <button
                  onClick={onTryOtherPath}
                  className={`px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white ${buttonTextClass} font-bold rounded-full shadow-lg transition-all`}
                  style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }}
                >
                  {isHebrewStory ? 'נסה את המסלול השני ←' : 'Try Other Path →'}
                </button>
              </>
            ) : (
              <p className={`${bodyTextClass} text-purple-600`} style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }} dir={isHebrewStory ? 'rtl' : 'ltr'}>
                {isHebrewStory ? '!כל הכבוד על קריאת שני המסלולים 🎉' : 'Great job reading both paths! 🎉'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EndOfStorySurvey = ({
  goodChoice,
  badChoice,
  onSelectFinalChoice,
  story,
  screenCategory,
}: {
  goodChoice: StoryPage;
  badChoice: StoryPage;
  onSelectFinalChoice: (choice: 'good' | 'bad') => void;
  story: Story;
  screenCategory: ScreenCategory;
}) => {
  const [goodImageError, setGoodImageError] = useState(false);
  const [badImageError, setBadImageError] = useState(false);
  const [goodImageLoading, setGoodImageLoading] = useState(true);
  const [badImageLoading, setBadImageLoading] = useState(true);
  
  const isHebrewStory = isHebrew(story.title || story.problemDescription);
  const choiceTextClass = screenCategory === 'large' ? 'text-2xl md:text-3xl' : screenCategory === 'medium' ? 'text-2xl' : 'text-xl';
  const headingClass = screenCategory === 'large' ? 'text-4xl md:text-5xl' : screenCategory === 'medium' ? 'text-4xl' : 'text-3xl';
  const gridColumnsClass = screenCategory === 'small' ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full flex flex-col items-center justify-center p-6"
    >
      <motion.h2 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`${headingClass} font-bold text-center text-purple-800 mb-4`}
        style={{
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          fontFamily: '"Comic Sans MS", "Comic Sans", cursive'
        }}
        dir={isHebrewStory ? 'rtl' : 'ltr'}
      >
        {isHebrewStory ? '?אז איזו דרך היית בוחר במצב הזה' : 'So which way would you choose in this situation?'}
      </motion.h2>

      <p className="text-xl text-purple-600 mb-8 text-center" style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }} dir={isHebrewStory ? 'rtl' : 'ltr'}>
        {isHebrewStory ? 'קראת את שני המסלולים - עכשיו ספר לנו איזה דרך היית בוחר באמת!' : "You've read both paths - now tell us which one you would actually choose!"}
      </p>

      <div className={`grid ${gridColumnsClass} gap-8 max-w-6xl w-full`}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectFinalChoice('good')}
          className="bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-3xl p-6 text-left transition-all shadow-xl hover:shadow-2xl"
        >
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6">
            {goodImageLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 animate-pulse flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full"
                />
              </div>
            )}
            <ImageUrl
              src={goodImageError || !goodChoice.selectedImageUrl ? '/illustrations/STORY_GOOD_CHOICE.svg' : goodChoice.selectedImageUrl}
              alt="Good choice"
              fill
              className={`object-cover transition-opacity duration-300 ${goodImageLoading ? 'opacity-0' : 'opacity-100'}`}
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={() => {
                setGoodImageError(true);
                setGoodImageLoading(false);
              }}
              onLoad={() => setGoodImageLoading(false)}
            />
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${choiceTextClass} font-bold text-green-700 leading-relaxed`}
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              fontFamily: '"Comic Sans MS", "Comic Sans", cursive'
            }}
          >
            {goodChoice.storyText}
          </motion.p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectFinalChoice('bad')}
          className="bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 rounded-3xl p-6 text-left transition-all shadow-xl hover:shadow-2xl"
        >
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6">
            {badImageLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-rose-100 animate-pulse flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full"
                />
              </div>
            )}
            <ImageUrl
              src={badImageError || !badChoice.selectedImageUrl ? '/illustrations/STORY_BAD_CHOICE.svg' : badChoice.selectedImageUrl}
              alt="Bad choice"
              fill
              className={`object-cover transition-opacity duration-300 ${badImageLoading ? 'opacity-0' : 'opacity-100'}`}
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={() => {
                setBadImageError(true);
                setBadImageLoading(false);
              }}
              onLoad={() => setBadImageLoading(false)}
            />
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${choiceTextClass} font-bold text-red-700 leading-relaxed`}
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              fontFamily: '"Comic Sans MS", "Comic Sans", cursive'
            }}
          >
            {badChoice.storyText}
          </motion.p>
        </motion.button>
      </div>
    </motion.div>
  );
};

const StoryReader = ({ 
  story, 
  currentPage, 
  onNextPage, 
  onPreviousPage, 
  onSelectChoice, 
  selectedChoice, 
  readPaths,
  showSurvey,
  onSelectFinalChoice,
  surveyCompleted,
  screenCategory,
}: StoryReaderProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overlayDimmed, setOverlayDimmed] = useState(false);
  const [pageDirection, setPageDirection] = useState<'next' | 'prev'>('next');

  const navButtonBaseClasses = screenCategory === 'large'
    ? 'w-16 h-16 border-4'
    : screenCategory === 'medium'
      ? 'w-14 h-14 border-[3px]'
      : 'w-12 h-12 border-2';
  const navIconSizeClass = screenCategory === 'large'
    ? 'h-8 w-8'
    : screenCategory === 'medium'
      ? 'h-7 w-7'
      : 'h-6 w-6';
  const leftPositionClass = screenCategory === 'large' ? 'left-6' : screenCategory === 'medium' ? 'left-5' : 'left-3';
  const rightPositionClass = screenCategory === 'large' ? 'right-6' : screenCategory === 'medium' ? 'right-5' : 'right-3';
  const readerPaddingClass = screenCategory === 'large' ? 'px-12 py-8' : screenCategory === 'medium' ? 'px-8 py-6' : 'px-4 py-4';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleToggleOverlay = () => setOverlayDimmed((v) => !v);

  // Get the current page data based on the selected path
  const getCurrentPageData = () => {
    if (!story) return null;

    if (currentPage === 0) {
      // Return cover page
      return story.pages[0];
    }

    if (!selectedChoice) {
      // Show normal pages until choice selection
      const normalPages = story.pages.filter(page => page.pageType === PageType.NORMAL);
      // Ensure we have pages and the current page is valid
      if (normalPages.length > 0 && currentPage >= 1 && currentPage <= normalPages.length) {
        return normalPages[currentPage - 1]; // Adjust for 1-based indexing
      }
    } else {
      // Show pages for the selected path
      const pathPages = story.pages.filter(page => 
        page.pageType === (selectedChoice === 'good' ? PageType.GOOD : PageType.BAD)
      );
      // Ensure we have pages and the current page is valid
      if (pathPages.length > 0 && currentPage >= 1 && currentPage <= pathPages.length) {
        return pathPages[currentPage - 1]; // Adjust for 1-based indexing
      }
    }
    return null;
  };

  // Check if we're at the choice selection point
  const isChoiceSelection = () => {
    if (!story) return false;
    const normalPages = story.pages.filter(page => page.pageType === PageType.NORMAL);
    return currentPage > normalPages.length && !selectedChoice;
  };

  // Check if we're at the end of the selected path
  const isEndOfPath = () => {
    if (!selectedChoice) return false;
    const pathPages = story.pages.filter(page => 
      page.pageType === (selectedChoice === 'good' ? PageType.GOOD : PageType.BAD)
    );
    return currentPage > pathPages.length;
  };

  // Wrap navigation handlers to track direction
  const handleNextPage = () => {
    setPageDirection('next');
    onNextPage();
  };
  const handlePreviousPage = () => {
    setPageDirection('prev');
    onPreviousPage();
  };

  const currentPageData = getCurrentPageData();
  const goodChoice = story.pages.find(page => page.pageType === PageType.GOOD_CHOICE);
  const badChoice = story.pages.find(page => page.pageType === PageType.BAD_CHOICE);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-purple-100 to-yellow-100 overflow-hidden flex flex-col items-center justify-center z-50">
      {/* Book spread content or full-image content */}
      <div className={`flex-1 w-full flex flex-col items-center justify-center ${readerPaddingClass}`} style={{ perspective: 2000 }}>
        <AnimatePresence mode="wait" initial={false}>
          {showSurvey ? (
            <EndOfStorySurvey
              key="survey"
              goodChoice={goodChoice!}
              badChoice={badChoice!}
              onSelectFinalChoice={onSelectFinalChoice}
              story={story}
              screenCategory={screenCategory}
            />
          ) : surveyCompleted ? (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full flex items-center justify-center"
            >
              <div className="text-center p-8 bg-white/90 rounded-3xl shadow-2xl">
                <h2 className="text-4xl font-bold text-purple-800 mb-4" style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }} dir={isHebrew(story.title || story.problemDescription) ? 'rtl' : 'ltr'}>
                  {isHebrew(story.title || story.problemDescription) ? '!תודה רבה 🎉' : 'Thank you! 🎉'}
                </h2>
                <p className="text-2xl text-purple-600" style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }} dir={isHebrew(story.title || story.problemDescription) ? 'rtl' : 'ltr'}>
                  {isHebrew(story.title || story.problemDescription) ? '!הבחירה שלך נשמרה' : 'Your choice has been saved!'}
                </p>
              </div>
            </motion.div>
          ) : currentPage === 0 ? (
            <motion.div
              key="cover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <div className="relative w-full h-full">
                <ImageUrl
                  src={currentPageData?.selectedImageUrl || '/illustrations/STORY_COVER.svg'}
                  alt="Story cover"
                  fill
                  className="object-contain transition-opacity duration-300"
                  sizes="100vw"
                  priority
                />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/10 via-transparent to-black/30" />
                <div className="absolute left-0 right-0 bottom-0 z-10 flex justify-center">
                  <div className="m-4 mb-8 max-w-3xl w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-10 text-center flex flex-col items-center gap-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-purple-800 mb-2" style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }} dir={isHebrew(story.title || story.problemDescription) ? 'rtl' : 'ltr'}>{story.title}</h1>
                    {story.problemDescription && (
                      <p className="text-lg md:text-2xl text-gray-700 mb-4" style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }} dir={isHebrew(story.title || story.problemDescription) ? 'rtl' : 'ltr'}>{story.problemDescription}</p>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNextPage}
                      className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full shadow-lg text-xl transition-colors"
                      style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }}
                    >
                      {isHebrew(story.title || story.problemDescription) ? 'התחל לקרוא' : 'Start Reading'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isChoiceSelection() ? (
            <ChoiceSelection 
              key="choice"
              goodChoice={goodChoice!} 
              badChoice={badChoice!} 
              onSelectChoice={onSelectChoice}
              screenCategory={screenCategory}
            />
          ) : isEndOfPath() ? (
            <StoryEnd 
              key="end"
              onTryOtherPath={() => onSelectChoice(selectedChoice === 'good' ? 'bad' : 'good')} 
              otherChoice={selectedChoice === 'good' ? badChoice! : goodChoice!}
              hasReadBothPaths={readPaths.size === 2}
              story={story}
              screenCategory={screenCategory}
            />
          ) : currentPageData && (
            <motion.div
              key={currentPage}
              initial={{
                rotateY: pageDirection === 'next' ? 90 : -90,
                opacity: 0,
                transformOrigin: pageDirection === 'next' ? 'right center' : 'left center',
              }}
              animate={{
                rotateY: 0,
                opacity: 1,
                transformOrigin: pageDirection === 'next' ? 'right center' : 'left center',
              }}
              exit={{
                rotateY: pageDirection === 'next' ? -90 : 90,
                opacity: 0,
                transformOrigin: pageDirection === 'next' ? 'left center' : 'right center',
              }}
              transition={{ type: 'tween', duration: 0.7, ease: 'easeInOut' }}
              className="w-full h-full"
              style={{ willChange: 'transform' }}
            >
              <StoryPageComponent page={currentPageData} overlayDimmed={overlayDimmed} onToggleOverlay={handleToggleOverlay} screenCategory={screenCategory} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Navigation Arrows - round, 50% opacity, vertically centered */}
      {currentPage > 0 && !isChoiceSelection() && !isEndOfPath() && (
        <>
          {currentPage > 1 && (
            <motion.button
              whileHover={{ opacity: 1 }}
              whileTap={{}}
              onClick={handlePreviousPage}
              className={`fixed ${leftPositionClass} top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-full bg-white shadow-xl border-yellow-300 transition-all opacity-50 hover:opacity-90 focus:opacity-90 active:opacity-90 ${navButtonBaseClasses}`}
              style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }}
              aria-label="Previous Page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`${navIconSizeClass} text-purple-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
          )}
          <motion.button
            whileHover={{ opacity: 1 }}
            whileTap={{}}
            onClick={handleNextPage}
            className={`fixed ${rightPositionClass} top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-full bg-white shadow-xl border-yellow-300 transition-all opacity-50 hover:opacity-90 focus:opacity-90 active:opacity-90 ${navButtonBaseClasses}`}
            style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }}
            aria-label="Next Page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`${navIconSizeClass} text-purple-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </>
      )}
      {/* Fullscreen button remains at top right */}
      <div className="absolute top-4 right-4 z-20">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleFullscreen}
          className="p-3 bg-white/80 backdrop-blur-sm hover:bg-white text-purple-600 rounded-full shadow-lg transition-colors"
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default function StoryReaderPage() {
  const { storyId } = useParams();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<'good' | 'bad' | undefined>();
  const [readPaths, setReadPaths] = useState<Set<'good' | 'bad'>>(new Set());
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [screenCategory, setScreenCategory] = useState<ScreenCategory>('large');
  const [orientationBlocked, setOrientationBlocked] = useState(false);

  const shouldForceLandscape = screenCategory !== 'large';
  const showOrientationOverlay = shouldForceLandscape && orientationBlocked;

  // Reset all state when storyId changes (e.g., browser back button)
  useEffect(() => {
    setLoading(true);
    setError(null);
    setStory(null);
    setCurrentPage(0);
    setSelectedChoice(undefined);
    setReadPaths(new Set());
    setShowSurvey(false);
    setSurveyCompleted(false);
  }, [storyId]);

  useEffect(() => {
    const fetchStory = async () => {
      if (!storyId) {
        setError('Missing story ID');
        setLoading(false);
        return;
      }

      try {
        const response = await StoryApi.getStoryById(String(storyId));
        
        if (!response.success) {
          throw new Error(response.error);
        }
        
        if (!response.data) {
          throw new Error('Story not found');
        }
        
        const storyData = response.data;
        if (!storyData) {
          throw new Error('Story not found');
        }
        
        setStory(storyData);
      } catch (_err) {
        console.error('Error fetching story:', _err);
        setError('Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [storyId]);

  // Preload all story page images after story loads
  useEffect(() => {
    if (!story) return;
    story.pages.forEach(page => {
      if (page.selectedImageUrl) {
        const img = new window.Image();
        img.src = page.selectedImageUrl;
      }
    });
  }, [story]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const orientationMedia = window.matchMedia('(orientation: portrait)');

    const applyLayoutSizing = () => {
      const category = getScreenCategory(window.innerWidth);
      setScreenCategory(category);

      if (category === 'large') {
        setOrientationBlocked(false);
        return;
      }

      const isPortrait = orientationMedia.matches;
      setOrientationBlocked(isPortrait);
      const screenOrientation = (window.screen as Screen & {
        orientation?: ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      }).orientation;
      if (screenOrientation?.lock) {
        screenOrientation.lock('landscape').catch(() => {});
      }
    };

    applyLayoutSizing();

    window.addEventListener('resize', applyLayoutSizing);
    if (orientationMedia.addEventListener) {
      orientationMedia.addEventListener('change', applyLayoutSizing);
    } else if (orientationMedia.addListener) {
      orientationMedia.addListener(applyLayoutSizing);
    }

    return () => {
      window.removeEventListener('resize', applyLayoutSizing);
      if (orientationMedia.removeEventListener) {
        orientationMedia.removeEventListener('change', applyLayoutSizing);
      } else if (orientationMedia.removeListener) {
        orientationMedia.removeListener(applyLayoutSizing);
      }
    };
  }, []);

  const handleNextPage = () => {
    if (!story) return;

    if (!selectedChoice) {
      // In normal pages
      const normalPages = story.pages.filter(page => page.pageType === PageType.NORMAL);
      if (currentPage < normalPages.length) {
        setCurrentPage(prev => prev + 1);
      } else {
        // If we're at the last normal page, move to choice selection
        setCurrentPage(normalPages.length + 1);
      }
    } else {
      // In choice path pages
      const pathPages = story.pages.filter(page => 
        page.pageType === (selectedChoice === 'good' ? PageType.GOOD : PageType.BAD)
      );
      if (currentPage < pathPages.length) {
        setCurrentPage(prev => prev + 1);
      } else {
        // If we're at the last page of the path, mark this path as read
        setReadPaths(prev => new Set(prev).add(selectedChoice));
        // Move to end screen
        setCurrentPage(pathPages.length + 1);
      }
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    // No redirect for public story reading
  };

  const handleSelectChoice = (choice: 'good' | 'bad') => {
    setSelectedChoice(choice);
    setCurrentPage(1); // Reset to first page of the selected path
  };

  const handleSelectFinalChoice = async (choice: 'good' | 'bad') => {
    if (!story || !storyId) return;

    try {
      // Create the new selection entry
      const newSelection = {
        timestamp: new Date(),
        choice: choice
      };

      // Get existing selections or create empty array
      const existingSelections = story.endOfStorySelections || [];
      const updatedSelections = [...existingSelections, newSelection];

      // Update the story in Firebase
      await StoryApi.updateStoryPartial(String(storyId), {
        endOfStorySelections: updatedSelections
      });

      // Mark survey as completed
      setSurveyCompleted(true);
      setShowSurvey(false);

      // Show success message (no redirect for public story reading)
    } catch (error) {
      console.error('Error saving end of story selection:', error);
      // Still mark as completed to not block the user (no redirect for public reading)
      setSurveyCompleted(true);
      setShowSurvey(false);
    }
  };

  // Check if user has read both paths and should see the survey
  useEffect(() => {
    if (readPaths.size === 2 && !surveyCompleted && !showSurvey) {
      // Small delay to show the end screen first
      setTimeout(() => {
        setShowSurvey(true);
      }, 1500);
    }
  }, [readPaths, surveyCompleted, showSurvey]);

  if (loading) return <LoadingStory />;
  if (error) return <ErrorMessage message={error} />;
  if (!story) return <ErrorMessage message="Story not found" />;

  return (
    <div className="relative min-h-screen flex flex-col justify-between items-center bg-gradient-to-b from-blue-50 to-purple-50 p-2 sm:p-4">
      <div className="w-full flex flex-col flex-1 justify-between h-[90vh]">
        <StoryReader
          story={story}
          currentPage={currentPage}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          onFinish={handleFinish}
          onSelectChoice={handleSelectChoice}
          selectedChoice={selectedChoice}
          readPaths={readPaths}
          showSurvey={showSurvey}
          onSelectFinalChoice={handleSelectFinalChoice}
          surveyCompleted={surveyCompleted}
          screenCategory={screenCategory}
        />
      </div>

      {showOrientationOverlay && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-purple-800/90 text-white text-center px-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-16 w-16 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <rect x="5" y="4" width="14" height="16" rx="2" ry="2" />
            <path d="M4 7.5V5a1 1 0 0 1 1-1h2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 16.5V19a1 1 0 0 1-1 1h-2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 12a9 9 0 0 1 9-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12a9 9 0 0 1-9 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="text-3xl font-bold">Rotate your device</h2>
          <p className="text-lg text-white/90 max-w-md">
            For the best reading experience, please rotate your device to landscape. This helps us keep the story immersive on smaller screens.
          </p>
        </div>
      )}
    </div>
  );
}
