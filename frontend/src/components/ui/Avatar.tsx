/**
 * Avatar Component
 * 
 * Optimized avatar component with lazy loading, automatic fallbacks,
 * and consistent styling for user profile images.
 */

import React, { useMemo } from 'react';
import { OptimizedImage } from './OptimizedImage';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  /** Image source URL */
  src?: string | null;
  /** Alternative text for accessibility */
  alt: string;
  /** Size variant */
  size?: AvatarSize;
  /** User's name for generating initials fallback */
  name?: string;
  /** Custom CSS classes */
  className?: string;
  /** Disable lazy loading for above-fold avatars */
  priority?: boolean;
  /** Custom fallback content */
  fallback?: React.ReactNode;
  /** Show online status indicator */
  showStatus?: boolean;
  /** Online status */
  isOnline?: boolean;
}

/**
 * Get size configuration for avatar
 */
const getSizeConfig = (size: AvatarSize) => {
  const configs = {
    xs: { size: 24, textSize: 'text-xs', ring: 'ring-1' },
    sm: { size: 32, textSize: 'text-sm', ring: 'ring-2' },
    md: { size: 40, textSize: 'text-base', ring: 'ring-2' },
    lg: { size: 48, textSize: 'text-lg', ring: 'ring-2' },
    xl: { size: 64, textSize: 'text-xl', ring: 'ring-4' },
    '2xl': { size: 96, textSize: 'text-3xl', ring: 'ring-4' },
  };
  return configs[size];
};

/**
 * Generate user initials from name
 */
const generateInitials = (name?: string): string => {
  if (!name) return 'U';
  
  const names = name.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return names
    .slice(0, 2)
    .map(n => n.charAt(0).toUpperCase())
    .join('');
};

/**
 * Generate a consistent background color based on name
 */
const generateBackgroundColor = (name?: string): string => {
  if (!name) return 'bg-gray-500';
  
  const colors = [
    'bg-red-500',
    'bg-yellow-500', 
    'bg-green-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-teal-500',
  ];
  
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Avatar Component
 * 
 * Features:
 * - Lazy loading with Next.js Image optimization
 * - Automatic initials fallback
 * - Consistent size variants
 * - Online status indicator
 * - Accessible and keyboard navigable
 * - Smooth loading transitions
 * - Error handling with graceful fallbacks
 * 
 * @param src - Avatar image URL
 * @param alt - Alternative text
 * @param size - Size variant (xs, sm, md, lg, xl, 2xl)
 * @param name - User name for initials fallback
 * @param className - Additional CSS classes
 * @param priority - Disable lazy loading
 * @param fallback - Custom fallback content
 * @param showStatus - Show online status
 * @param isOnline - Online status
 */
const AvatarComponent: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  name,
  className = '',
  priority = false,
  fallback,
  showStatus = false,
  isOnline = false,
}) => {
  const sizeConfig = getSizeConfig(size);
  const initials = useMemo(() => generateInitials(name), [name]);
  const backgroundColor = useMemo(() => generateBackgroundColor(name), [name]);

  /**
   * Default fallback content (initials)
   */
  const defaultFallback = (
    <div 
      className={`
        ${backgroundColor}
        flex items-center justify-center text-white font-medium rounded-full
        ${sizeConfig.textSize} ${sizeConfig.ring} ring-white shadow-sm
      `}
      style={{ width: sizeConfig.size, height: sizeConfig.size }}
    >
      {initials}
    </div>
  );

  return (
    <div className={`relative inline-block ${className}`}>
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={sizeConfig.size}
          height={sizeConfig.size}
          className={`rounded-full object-cover ${sizeConfig.ring} ring-white shadow-sm`}
          priority={priority}
          quality={85}
          fallback={fallback || defaultFallback}
          placeholder="blur"
        />
      ) : (
        fallback || defaultFallback
      )}
      
      {/* Online status indicator */}
      {showStatus && (
        <div 
          className={`
            absolute bottom-0 right-0 transform translate-x-1/4 translate-y-1/4
            ${isOnline ? 'bg-green-400' : 'bg-gray-400'}
            border-2 border-white rounded-full
            ${size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'}
          `}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

/**
 * Memoized Avatar component to prevent unnecessary re-renders
 */
export const Avatar = React.memo(AvatarComponent);

export default Avatar; 