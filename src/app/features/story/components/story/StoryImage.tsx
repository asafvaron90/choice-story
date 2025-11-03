"use client";

import { useState } from "react";
import ImageUrl from "@/app/components/common/ImageUrl";

type StoryImageProps = {
  url: string;
  alt?: string;
  fallbackUrl?: string;
};

export const StoryImage = ({ 
  url, 
  alt = "Story image",
  fallbackUrl = "/illustrations/STORY_PLACEHOLDER.svg"
}: StoryImageProps) => {
  const [imageError, setImageError] = useState(false);
  
  // Use a valid URL or fallback to the placeholder if empty or error
  const imageUrl = (imageError || !url || url === "") ? fallbackUrl : url;
  
  return (
    <div className="aspect-square rounded-md overflow-hidden relative">
      <ImageUrl
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 30vw, 100px"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default StoryImage; 