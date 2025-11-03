"use client";

import StoryImage from './StoryImage';
import { useTranslation } from '@/app/hooks/useTranslation';

type ChoiceCardProps = {
  title: string;
  content: string;
  imageUrl: string;
  fallbackUrl: string;
  bgColorClass: string;
  textColorClass: string;
  imageType: 'goodChoice' | 'badChoice';
  onImageError: (imageType: 'cover' | 'goodChoice' | 'badChoice') => void;
};

export const ChoiceCard = ({
  title,
  content,
  imageUrl,
  fallbackUrl,
  bgColorClass,
  textColorClass,
  imageType,
  onImageError
}: ChoiceCardProps) => {
  const { t } = useTranslation();
  return (
    <div className={`${bgColorClass} rounded-lg shadow-md p-6`}>
      <h2 className={`text-2xl font-bold mb-4 ${textColorClass}`}>{title}</h2>
      <p className="mb-4">{content}</p>
      <StoryImage
        url={imageUrl}
        fallbackUrl={fallbackUrl}
        alt={imageType === 'goodChoice' ? t.createStory.choices.goodChoice : t.createStory.choices.badChoice}
        onError={() => onImageError(imageType)}
      />
    </div>
  );
};

export default ChoiceCard; 