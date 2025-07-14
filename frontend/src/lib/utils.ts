import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge class names with proper handling of Tailwind CSS classes.
 * 
 * This function combines clsx for conditional class name logic with tailwind-merge
 * for proper Tailwind CSS class deduplication and conflict resolution.
 * 
 * @param inputs - Class values to be merged
 * @returns Merged class name string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 