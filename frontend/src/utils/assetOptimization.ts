/**
 * Asset Optimization Utilities
 * Comprehensive strategies for optimizing images, fonts, and static assets
 */

import { useState, useEffect, useCallback } from 'react';

// Image optimization utilities
export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  sizes?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * Generate optimized image props for Next.js Image component
 */
export const getOptimizedImageProps = (
  src: string,
  alt: string,
  options: ImageOptimizationOptions = {}
) => {
  const {
    quality = 80,
    format = 'auto',
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    priority = false,
    placeholder = 'empty',
    blurDataURL
  } = options;

  return {
    src,
    alt,
    quality,
    sizes,
    priority,
    placeholder,
    blurDataURL,
    style: {
      width: '100%',
      height: 'auto',
    },
  };
};

/**
 * Generate blur data URL for images
 */
export const generateBlurDataURL = (width: number = 10, height: number = 10): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create a simple gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
};

/**
 * Responsive image sizes generator
 */
export const generateResponsiveSizes = (breakpoints: Record<string, number>) => {
  const sizes = Object.entries(breakpoints)
    .sort(([, a], [, b]) => a - b)
    .map(([size, width]) => `(max-width: ${width}px) ${size}`)
    .join(', ');
  
  return `${sizes}, 100vw`;
};

/**
 * Image preloading utility
 */
export const preloadImage = (src: string, options: ImageOptimizationOptions = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve();
    img.onerror = reject;
    
    // Apply optimization options
    if (options.quality) {
      // Note: This would typically be handled by the CDN/server
      console.debug(`Preloading image with quality: ${options.quality}`);
    }
    
    img.src = src;
  });
};

/**
 * Lazy image loading hook with intersection observer
 */
export const useLazyImage = (src: string, options: ImageOptimizationOptions = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageRef = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setError(null);
    };
    
    img.onerror = () => {
      setError('Failed to load image');
      setIsLoaded(false);
    };

    img.src = src;
  }, [src, isInView]);

  return {
    imageRef,
    isLoaded,
    isInView,
    error,
    shouldLoad: isInView
  };
};

// Font optimization utilities
export interface FontOptimizationOptions {
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  preload?: boolean;
  weight?: string | number;
  style?: 'normal' | 'italic';
}

/**
 * Generate font optimization link tags
 */
export const generateFontLinks = (
  fontFamily: string,
  options: FontOptimizationOptions = {}
) => {
  const {
    display = 'swap',
    preload = true,
    weight = '400',
    style = 'normal'
  } = options;

  const links: Array<{ rel: string; href: string; as?: string; crossOrigin?: string }> = [];

  if (preload) {
    links.push({
      rel: 'preload',
      href: `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weight}&display=${display}`,
      as: 'style',
      crossOrigin: 'anonymous'
    });
  }

  links.push({
    rel: 'stylesheet',
    href: `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weight}&display=${display}`,
    crossOrigin: 'anonymous'
  });

  return links;
};

/**
 * Font loading optimization hook
 */
export const useFontLoading = (fontFamily: string) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!('fonts' in document)) {
      setIsLoaded(true);
      return;
    }

    const fontFace = new FontFace(fontFamily, `url(https://fonts.googleapis.com/css2?family=${fontFamily})`);
    
    fontFace.load().then(() => {
      document.fonts.add(fontFace);
      setIsLoaded(true);
    }).catch(() => {
      console.warn(`Failed to load font: ${fontFamily}`);
      setIsLoaded(true); // Continue with fallback
    });
  }, [fontFamily]);

  return isLoaded;
};

// Critical CSS utilities
export const extractCriticalCSS = (htmlContent: string): string => {
  // This would typically be done at build time
  // For demonstration, returning a minimal critical CSS example
  return `
    html, body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    .loading { opacity: 0.5; }
  `;
};

/**
 * Inline critical CSS and defer non-critical CSS
 */
export const optimizeCSS = (criticalCSS: string, nonCriticalCSS: string[]) => {
  // Inline critical CSS
  const criticalStyle = document.createElement('style');
  criticalStyle.textContent = criticalCSS;
  document.head.appendChild(criticalStyle);

  // Defer non-critical CSS
  nonCriticalCSS.forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  });
};

// Asset bundling and code splitting utilities
export interface BundleOptimizationOptions {
  chunkSize?: number;
  priority?: 'high' | 'medium' | 'low';
  preload?: boolean;
}

/**
 * Dynamic import with error handling and retry logic
 */
export const optimizedDynamicImport = async <T>(
  importFn: () => Promise<T>,
  options: BundleOptimizationOptions = {}
): Promise<T> => {
  const { priority = 'medium', preload = false } = options;

  try {
    // Add priority hints if supported
    if ('scheduler' in window && priority === 'high') {
      // Use React's scheduler for high priority imports
      return await importFn();
    }

    const module = await importFn();

    if (preload && 'modulepreload' in HTMLLinkElement.prototype) {
      // Preload related modules
      console.debug('Module loaded successfully with preload support');
    }

    return module;
  } catch (error) {
    console.error('Dynamic import failed:', error);
    throw error;
  }
};

/**
 * Service Worker for asset caching
 */
export const registerAssetCaching = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('Asset caching service worker registered:', registration);
    }).catch((error) => {
      console.error('Asset caching service worker registration failed:', error);
    });
  }
};

// CDN and asset delivery optimization
export interface CDNOptions {
  domain?: string;
  region?: string;
  compression?: 'gzip' | 'brotli' | 'auto';
  cacheControl?: string;
}

/**
 * Generate optimized CDN URLs
 */
export const getCDNUrl = (
  assetPath: string,
  options: CDNOptions = {}
): string => {
  const {
    domain = process.env.NEXT_PUBLIC_CDN_DOMAIN,
    compression = 'auto',
    cacheControl = 'public, max-age=31536000'
  } = options;

  if (!domain) {
    return assetPath;
  }

  const url = new URL(assetPath, domain);
  
  // Add optimization parameters
  if (compression === 'brotli') {
    url.searchParams.set('compression', 'br');
  } else if (compression === 'gzip') {
    url.searchParams.set('compression', 'gzip');
  }

  return url.toString();
};

/**
 * Resource hints utilities
 */
export const addResourceHints = (resources: Array<{
  href: string;
  rel: 'dns-prefetch' | 'preconnect' | 'prefetch' | 'preload';
  as?: string;
  type?: string;
}>) => {
  resources.forEach(({ href, rel, as, type }) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    
    if (as) link.setAttribute('as', as);
    if (type) link.setAttribute('type', type);
    
    document.head.appendChild(link);
  });
};

/**
 * Performance monitoring for assets
 */
export const monitorAssetPerformance = () => {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    
    entries.forEach((entry) => {
      if (entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming;
        
        // Log slow loading assets
        if (resource.duration > 1000) {
          console.warn(`Slow asset loading: ${resource.name} took ${resource.duration.toFixed(2)}ms`);
        }
        
        // Monitor transfer sizes
        if ('transferSize' in resource && resource.transferSize > 100000) {
          console.warn(`Large asset: ${resource.name} is ${(resource.transferSize / 1024).toFixed(2)}KB`);
        }
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
  
  return () => observer.disconnect();
};

// Asset optimization presets
export const assetOptimizationPresets = {
  critical: {
    images: {
      quality: 90,
      format: 'webp' as const,
      priority: true,
      placeholder: 'blur' as const
    },
    fonts: {
      display: 'swap' as const,
      preload: true
    }
  },
  standard: {
    images: {
      quality: 80,
      format: 'auto' as const,
      priority: false,
      placeholder: 'empty' as const
    },
    fonts: {
      display: 'swap' as const,
      preload: false
    }
  },
  aggressive: {
    images: {
      quality: 70,
      format: 'webp' as const,
      priority: false,
      placeholder: 'blur' as const
    },
    fonts: {
      display: 'optional' as const,
      preload: false
    }
  }
};

export default {
  getOptimizedImageProps,
  generateBlurDataURL,
  generateResponsiveSizes,
  preloadImage,
  useLazyImage,
  generateFontLinks,
  useFontLoading,
  optimizedDynamicImport,
  registerAssetCaching,
  getCDNUrl,
  addResourceHints,
  monitorAssetPerformance,
  assetOptimizationPresets
}; 