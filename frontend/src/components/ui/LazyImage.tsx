/**
 * LazyImage Component
 * 
 * Optimized image component with lazy loading and performance optimizations
 */

import React from 'react';
import { useLazyImage } from '@/utils/performance';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className,
  width,
  height,
  sizes,
  priority = false,
  quality = 75,
  onLoad,
  onError,
}) => {
  const { targetRef, imageSrc, isLoaded } = useLazyImage(src, placeholder);

  const handleLoad = () => {
    onLoad?.();
  };

  const handleError = () => {
    onError?.();
  };

  return (
    <div
      ref={targetRef}
      className={cn(
        'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
        className
      )}
      style={{ width, height }}
    >
      <img
        src={imageSrc}
        alt={alt}
        sizes={sizes}
        className={cn(
          'transition-opacity duration-300 object-cover w-full h-full',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;