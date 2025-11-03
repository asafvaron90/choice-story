import React from 'react';
import Image, { ImageProps } from 'next/image';

interface FirebaseImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
}

export const FirebaseImage: React.FC<FirebaseImageProps> = ({
  src,
  fallbackSrc,
  alt,
  ...props
}) => {
  const [imgSrc, setImgSrc] = React.useState(src);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError && fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  // Check if it's a Firebase Storage URL
  const isFirebaseUrl = src.includes('firebasestorage.googleapis.com');
  
  // For Firebase URLs, use unoptimized to avoid URL encoding issues
  const imageProps = {
    ...props,
    src: imgSrc,
    alt,
    unoptimized: isFirebaseUrl,
    onError: handleError,
  };

  return <Image {...imageProps} alt={alt} />;
}; 