/**
 * Infrastructure Components Index
 * 
 * Central export file for all infrastructure-related components.
 * Provides clean imports for consuming components.
 */

// Terraform components
export { TerraformLogViewer, default as TerraformLogViewerDefault } from './TerraformLogViewer';

// Kubernetes components
export { default as EnhancedKubernetesMonitor } from './EnhancedKubernetesMonitor';

// AWS Cost components  
export { AwsCostMetricsPanel } from './AwsCostMetricsPanel';
export { AwsCostFilters } from './AwsCostFilters';
export type { FilterOptions, AwsCostFiltersProps } from './AwsCostFilters';

// Re-export types for convenience
export type {
  TerraformLogViewerProps,
  ResourceChange,
  RiskLevel,
  ActionType,
  TerraformViewerFilters,
  TerraformViewerConfig,
  ParsedLogData,
  InfrastructureChange,
  RiskAssessment,
  TerraformSummaryStats
} from '../../types/terraform';
