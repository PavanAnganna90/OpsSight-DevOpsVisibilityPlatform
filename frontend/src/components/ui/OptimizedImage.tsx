/**
 * Optimized Image Component
 * 
 * Enhanced image component with lazy loading, error handling, and performance optimizations.
 * Provides fallback content and automatic optimization for better user experience.
 */

import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useIntersectionObserver } from '../../utils/performanceOptimizations';

interface OptimizedImageProps {
  /** Image source URL */
  src: string;
  /** Alternative text for accessibility */
  alt: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** CSS classes */
  className?: string;
  /** Fallback content when image fails to load */
  fallback?: React.ReactNode;
  /** Priority loading (disable lazy loading) */
  priority?: boolean;
  /** Image quality (1-100) */
  quality?: number;
  /** Placeholder type */
  placeholder?: 'blur' | 'empty';
  /** Blur data URL for placeholder */
  blurDataURL?: string;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Fill container (makes image responsive) */
  fill?: boolean;
  /** Object fit style */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Object position */
  objectPosition?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Enable intersection observer lazy loading */
  enableIntersectionObserver?: boolean;
  /** Intersection observer threshold */
  threshold?: number;
}

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Automatic lazy loading with Next.js Image
 * - Error handling with fallback content
 * - Automatic image optimization and compression
 * - Responsive image support
 * - Accessibility compliance
 * - Performance monitoring
 * 
 * @param src - Image source URL
 * @param alt - Alternative text
 * @param width - Image width
 * @param height - Image height
 * @param className - CSS classes
 * @param fallback - Fallback content on error
 * @param priority - Disable lazy loading for above-fold images
 * @param quality - Image quality (1-100)
 * @param placeholder - Placeholder type
 * @param blurDataURL - Blur placeholder data
 * @param sizes - Responsive sizes
 * @param fill - Fill container mode
 * @param objectFit - Object fit behavior
 * @param objectPosition - Object position
 * @param onLoad - Load callback
 * @param onError - Error callback
 */
const OptimizedImageComponent: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  fallback,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  enableIntersectionObserver = true,
  threshold = 0.1,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use intersection observer for advanced lazy loading
  const [observerRef, isIntersecting] = useIntersectionObserver({
    threshold,
    rootMargin: '50px', // Start loading 50px before image enters viewport
  });
  
  // Determine if image should load
  const shouldLoad = !enableIntersectionObserver || priority || isIntersecting;

  /**
   * Handle image load success
   */
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  /**
   * Handle image load error
   */
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  /**
   * Generate blur placeholder for better loading experience
   */
  const generatedBlurDataURL = useMemo(() => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple colored blur placeholder
    const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
    if (!canvas) return undefined;
    
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    
    // Create a simple gradient blur effect
    const gradient = ctx.createLinearGradient(0, 0, 10, 10);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 10, 10);
    
    return canvas.toDataURL();
  }, [blurDataURL]);

  /**
   * Render fallback content when image fails
   */
  if (hasError && fallback) {
    return <div className={className}>{fallback}</div>;
  }

  /**
   * Common image props
   */
  const imageProps = {
    src,
    alt,
    className: `transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`,
    priority,
    quality,
    placeholder: generatedBlurDataURL ? 'blur' as const : placeholder,
    blurDataURL: generatedBlurDataURL,
    sizes,
    style: {
      objectFit,
      objectPosition,
    },
    onLoad: handleLoad,
    onError: handleError,
  };

  // Don't render image if not supposed to load yet
  if (!shouldLoad) {
    return (
      <div 
        ref={observerRef}
        className={`relative bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`}
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
      >
        {/* Placeholder content */}
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div ref={observerRef} className="relative">
      {fill ? (
        <Image
          {...imageProps}
          fill
        />
      ) : (
        <Image
          {...imageProps}
          width={width}
          height={height}
        />
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div 
          className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`}
          style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
        />
      )}
    </div>
  );
};

/**
 * Memoized OptimizedImage component to prevent unnecessary re-renders
 */
export const OptimizedImage = React.memo(OptimizedImageComponent);

export default OptimizedImage; 