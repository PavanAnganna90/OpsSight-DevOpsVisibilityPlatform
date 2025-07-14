/**
 * TypeScript types for Terraform infrastructure management.
 * Defines data structures for log parsing, risk assessment, and infrastructure changes.
 */

// Risk levels and assessment types
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ImpactScope = 'local' | 'service' | 'region' | 'global';

export type ComplianceImpact = 'none' | 'low' | 'medium' | 'high' | 'regulatory';

export type ChangeStatus = 'PENDING' | 'PLANNING' | 'PLANNED' | 'APPLYING' | 'APPLIED' | 'FAILED' | 'CANCELLED' | 'APPROVED';

export type ChangeType = 'PLAN' | 'APPLY' | 'DESTROY' | 'IMPORT' | 'REFRESH';

export type ActionType = 'create' | 'update' | 'delete' | 'replace' | 'no-op';

// Resource change interfaces
export interface ResourceChange {
  address: string;
  resource_type: string;
  resource_name: string;
  action: ActionType;
  risk_level: RiskLevel;
  before?: Record<string, any>;
  after?: Record<string, any>;
  change_summary?: string;
  requires_replacement?: boolean;
  sensitive_attributes?: string[];
  provider_name?: string;
}

// Risk assessment data structures
export interface RiskAssessment {
  overall_risk: RiskLevel;
  risk_score: number;
  impact_scope: ImpactScope;
  compliance_impact: ComplianceImpact;
  requires_approval: boolean;
  recommended_approvers: string[];
  mitigation_recommendations: string[];
  testing_strategy: string[];
  rollback_plan?: string;
  estimated_downtime?: string;
  business_impact?: string;
}

// Parsed log response structure
export interface ParsedLogData {
  success: boolean;
  format: string;
  terraform_version?: string;
  resource_changes: ResourceChange[];
  modules: Record<string, any>;
  summary: {
    total_changes: number;
    resources_to_add: number;
    resources_to_change: number;
    resources_to_destroy: number;
  };
  risk_assessment: RiskAssessment;
  metadata: {
    parsing_time_ms?: number;
    detected_format?: string;
    has_sensitive_data?: boolean;
    warnings?: string[];
  };
  infrastructure_change_id?: number;
  error?: string;
}

// Infrastructure change data structures
export interface InfrastructureChange {
  id: number;
  name: string;
  description?: string;
  change_type: ChangeType;
  status: ChangeStatus;
  terraform_version?: string;
  workspace: string;
  target_environment: string;
  config_path?: string;
  variables?: Record<string, any>;
  auto_approve: boolean;
  destroy_mode: boolean;
  
  // IDs and references
  project_id: number;
  initiated_by_user_id: number;
  external_id?: string;
  
  // Timing information
  created_at: string;
  updated_at: string;
  plan_started_at?: string;
  plan_finished_at?: string;
  plan_duration_seconds?: number;
  apply_started_at?: string;
  apply_finished_at?: string;
  apply_duration_seconds?: number;
  
  // Approval tracking
  approved_by_user_id?: number;
  approved_at?: string;
  
  // Resource counts
  resources_to_add: number;
  resources_to_change: number;
  resources_to_destroy: number;
  
  // Cost estimation
  estimated_cost_change?: number;
  
  // Logs and outputs
  plan_output?: string;
  apply_output?: string;
  state_backup_path?: string;
  error_message?: string;
  
  // Related data (optional expansions)
  resource_changes?: ResourceChange[];
  cost_estimate?: CostEstimate;
  approval_request?: ApprovalRequest;
  parsed_logs?: {
    plan?: ParsedLogData;
    apply?: ParsedLogData;
  };
}

// Cost estimation structures
export interface CostEstimate {
  currency: string;
  monthly_cost_before?: number;
  monthly_cost_after?: number;
  monthly_cost_change?: number;
  breakdown_by_resource: Record<string, number>;
  breakdown_by_service: Record<string, number>;
  confidence_level: 'low' | 'medium' | 'high';
  estimation_timestamp: string;
}

// Approval workflow structures
export interface ApprovalRequest {
  requested_by_user_id: number;
  requested_at: string;
  reason?: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  impact_assessment?: string;
  rollback_plan?: string;
  estimated_downtime?: number; // minutes
  affected_services: string[];
}

// API request/response types
export interface ParseLogRequest {
  log_content: string;
  log_format?: 'json' | 'human' | 'auto';
  project_id?: number;
  environment?: string;
}

export interface RiskAssessmentRequest {
  resource_type: string;
  action: string;
  environment?: string;
  cost_impact?: number;
  affects_production?: boolean;
  has_dependencies?: boolean;
  compliance_tags?: string[];
  change_metadata?: Record<string, any>;
}

export interface InfrastructureChangeListParams {
  project_id?: number;
  status?: string;
  environment?: string;
  change_type?: string;
  skip?: number;
  limit?: number;
}

export interface InfrastructureChangeListResponse {
  changes: InfrastructureChange[];
  total: number;
  skip: number;
  limit: number;
}

// Filter and display configuration
export interface TerraformViewerFilters {
  riskLevel?: RiskLevel | 'all';
  resourceType?: string | 'all';
  action?: ActionType | 'all';
  environment?: string | 'all';
  showSensitiveData?: boolean;
}

export interface TerraformViewerConfig {
  showResourceDetails?: boolean;
  expandModules?: boolean;
  highlightChanges?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Component props types
export interface TerraformLogViewerProps {
  /** Parsed log data to display */
  logData?: ParsedLogData;
  /** Infrastructure change data */
  infrastructureChange?: InfrastructureChange;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Custom CSS classes */
  className?: string;
  /** Filter configuration */
  filters?: TerraformViewerFilters;
  /** Display configuration */
  config?: TerraformViewerConfig;
  /** Callback when filters change */
  onFiltersChange?: (filters: TerraformViewerFilters) => void;
  /** Callback when resource is selected */
  onResourceSelect?: (resource: ResourceChange) => void;
  /** Callback to refresh data */
  onRefresh?: () => void;
}

// Summary statistics for dashboard display
export interface TerraformSummaryStats {
  total_changes: number;
  changes_by_risk: Record<RiskLevel, number>;
  changes_by_action: Record<ActionType, number>;
  resources_by_type: Record<string, number>;
  environments: string[];
  requires_approval: boolean;
  estimated_duration?: string;
  cost_impact?: {
    estimated_change: number;
    currency: string;
    confidence: string;
  };
}

// Module information for expandable sections
export interface TerraformModule {
  name: string;
  path: string;
  resource_count: number;
  changes: ResourceChange[];
  risk_level: RiskLevel;
  has_sensitive_data: boolean;
}

// Supported Terraform features
export interface TerraformSupportInfo {
  status: string;
  features: {
    log_parsing: boolean;
    risk_assessment: boolean;
    cost_estimation: boolean;
    compliance_checking: boolean;
    approval_workflow: boolean;
  };
  supported_formats: string[];
  supported_providers: string[];
  version: string;
} 