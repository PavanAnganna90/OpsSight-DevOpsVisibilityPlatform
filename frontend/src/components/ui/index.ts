/**
 * UI Components Index
 * 
 * Central export file for all reusable UI components.
 * Provides clean imports for consuming components.
 */

// Status Indicator Components
export {
  StatusIndicator,
  StatusBadge,
  type StatusType,
  type StatusSize,
} from './StatusIndicator';

// Metric Card Components
export {
  MetricCard,
  MetricCardGrid,
  type TrendDirection,
  type MetricSize,
} from './MetricCard';

// Loading Skeleton Components
export {
  LoadingSkeleton,
  MetricCardSkeleton,
  ActivityFeedSkeleton,
  DashboardSkeleton,
  type SkeletonVariant,
  type SkeletonSize,
} from './LoadingSkeleton';

// Button Components
export { Button, ButtonGroup, IconButton } from './Button';

// Form Components
export { TextField, type TextFieldProps } from './TextField';
export { TextArea, type TextAreaProps } from './TextArea';
export { Checkbox, type CheckboxProps } from './Checkbox';
export { Select, type SelectProps, type SelectOption } from './Select';
export { RadioGroup, RadioButton, type RadioGroupProps, type RadioButtonProps } from './RadioButton';

// Accessibility Components
export {
  AccessibilitySettings,
  AccessibilityQuickToggle,
} from './AccessibilitySettings';

// Color Mode Toggle Components
export {
  ColorModeToggle,
  ColorModeToggleCompact,
} from './ColorModeToggle';

// Loading States Components
export {
  LoadingSpinner,
  ProgressBar,
  Skeleton,
  SkeletonCard,
  SkeletonMetric,
  SkeletonChart,
  LoadingOverlay,
} from './LoadingStates';

// Re-export existing components
export { default as StatusIndicatorDefault } from './StatusIndicator';
export { default as MetricCardDefault } from './MetricCard';
export { default as LoadingSkeletonDefault } from './LoadingSkeleton';

// Re-export form components as defaults
export { default as TextFieldDefault } from './TextField';
export { default as TextAreaDefault } from './TextArea';
export { default as CheckboxDefault } from './Checkbox';
export { default as SelectDefault } from './Select';
export { default as RadioGroupDefault } from './RadioButton'; 