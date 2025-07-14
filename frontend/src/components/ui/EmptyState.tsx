// EmptyState.tsx
// Accessible empty/mascot state with ARIA live region, role, and focusable action button.
// Use for onboarding, empty, or error states in panels.

import React from 'react';
import { motion } from 'framer-motion';
import AnimatedIllustration from './AnimatedIllustration';

interface EmptyStateProps {
  illustration: string; // e.g., 'mascot', 'coffee'
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    ariaLabel?: string;
  };
  className?: string;
}

const illustrationVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, type: 'spring', bounce: 0.22 } },
};

const EmptyState: React.FC<EmptyStateProps> = ({ illustration, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`} role="status" aria-live="polite">
    <motion.div
      initial="hidden"
      animate="visible"
      variants={illustrationVariants}
    >
      <AnimatedIllustration name={illustration} className="w-32 h-32 mb-4" alt={title} />
    </motion.div>
    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h2>
    {description && <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        aria-label={action.ariaLabel || action.label}
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState; 