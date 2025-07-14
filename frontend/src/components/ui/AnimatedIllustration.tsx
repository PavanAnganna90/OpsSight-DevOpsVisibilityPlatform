// AnimatedIllustration.tsx
// Renders SVG illustrations with accessible role and ARIA labeling for screen readers.
// All illustrations have role="img" and aria-label set for accessibility.

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedIllustrationProps {
  name: string; // e.g., 'pipeline', 'cloud', 'rocket'
  className?: string;
  animate?: boolean;
  alt?: string;
}

/**
 * AnimatedIllustration renders an SVG from the assets/illustrations folder.
 * Optionally animates it with Framer Motion.
 * Accessibility: All SVGs have role="img" and aria-label set to alt or name.
 */
const AnimatedIllustration: React.FC<AnimatedIllustrationProps> = ({ name, className = '', animate = true, alt = '' }) => {
  // Dynamic import for SVGs in assets/illustrations
  // Webpack/CRA: require.context; Vite: import.meta.glob
  // We'll use a static import fallback for now
  let SvgComponent: React.FC<React.SVGProps<SVGSVGElement>> | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SvgComponent = require(`../../assets/illustrations/${name}.svg`).default;
  } catch (e) {
    return <div className={`bg-gray-100 text-gray-400 rounded ${className}`}>[Missing Illustration: {name}]</div>;
  }

  if (!SvgComponent) {
    return <div className={`bg-gray-100 text-gray-400 rounded ${className}`}>[Missing Illustration: {name}]</div>;
  }
  const MotionSvg = motion(SvgComponent);

  return (
    <MotionSvg
      className={className}
      aria-label={alt || name}
      aria-hidden="false"
      role="img"
      initial={animate ? { opacity: 0, scale: 0.95 } : false}
      animate={animate ? { opacity: 1, scale: 1 } : false}
      transition={animate ? { duration: 0.6, type: 'spring', bounce: 0.2 } : undefined}
      focusable={false}
    />
  );
};

export default AnimatedIllustration; 