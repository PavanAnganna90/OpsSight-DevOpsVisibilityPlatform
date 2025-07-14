/**
 * Ansible Automation Type Definitions
 * 
 * TypeScript interfaces for automation coverage monitoring data
 * matching the backend API schemas.
 */

export type AutomationStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped' | 'partial_success';
export type AutomationType = 'playbook' | 'role' | 'task' | 'ad_hoc' | 'tower_job';

export interface HostResult {
  hostname: string;
  status: 'ok' | 'failed' | 'unreachable' | 'skipped';
  task_count: number;
  changed_count: number;
  failed_count: number;
  skipped_count: number;
  unreachable_count: number;
  facts?: Record<string, any>;
  errors?: string[];
}

export interface TaskResult {
  task_name: string;
  action: string;
  status: 'ok' | 'failed' | 'skipped' | 'changed';
  host: string;
  duration?: number;
  changed: boolean;
  failed: boolean;
  skipped: boolean;
  message?: string;
  result?: Record<string, any>;
}

export interface AutomationRun {
  id: number;
  automation_id?: string;
  name: string;
  description?: string;
  automation_type: AutomationType;
  status: AutomationStatus;
  
  // Playbook and inventory info
  playbook_name?: string;
  playbook_path?: string;
  inventory_name?: string;
  
  // Execution timing
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;
  
  // Host statistics
  total_hosts: number;
  successful_hosts: number;
  failed_hosts: number;
  unreachable_hosts: number;
  skipped_hosts: number;
  
  // Task statistics  
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  skipped_tasks: number;
  changed_tasks: number;
  
  // Coverage and performance
  coverage_percentage?: number;
  automation_score?: number;
  
  // Execution details
  ansible_version?: string;
  python_version?: string;
  command_line?: string;
  working_directory?: string;
  
  // Configuration
  extra_vars?: Record<string, any>;
  tags?: string[];
  skip_tags?: string[];
  environment?: string;
  target_group?: string;
  dry_run: boolean;
  check_mode: boolean;
  
  // Performance metrics
  setup_time_seconds?: number;
  execution_time_seconds?: number;
  teardown_time_seconds?: number;
  
  // Repository info
  repository_url?: string;
  repository_branch?: string;
  commit_sha?: string;
  
  // Error handling
  error_message?: string;
  log_output?: string;
  log_url?: string;
  has_failures: boolean;
  
  // Metadata
  triggered_by_user_id?: number;
  project_id?: number;
  is_scheduled: boolean;
  is_manual_trigger: boolean;
  created_at: string;
  updated_at: string;
  
  // Related data
  host_results?: HostResult[];
  task_results?: TaskResult[];
}

export interface AutomationRunSummary {
  success_rate: number;
  host_success_rate: number;
  task_success_rate: number;
  coverage_percentage: number;
  total_duration?: number;
  average_task_duration?: number;
  most_common_failures: string[];
  performance_metrics: Record<string, any>;
}

export interface AutomationStats {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  running_runs: number;
  success_rate: number;
  average_success_rate: number;
  average_duration?: number;
  total_hosts_managed: number;
  most_used_playbooks: Array<{
    playbook: string;
    count: number;
    success_rate: number;
  }>;
  recent_failures: string[];
}

export interface PlaybookMetrics {
  name: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  average_duration?: number;
  last_run?: string;
  most_common_errors: string[];
  host_coverage: number;
  environments: string[];
}

export interface HostCoverage {
  hostname: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  unreachable_count: number;
  last_successful_run?: string;
  last_failed_run?: string;
  success_rate: number;
  coverage_score: number;
  environments: string[];
  groups: string[];
  facts?: Record<string, any>;
}

export interface AutomationTrend {
  date: string;
  date_label: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  average_duration?: number;
  hosts_managed: number;
  coverage_percentage: number;
}

export interface Environment {
  name: string;
  host_count: number;
  playbook_count: number;
  last_run?: string;
  success_rate: number;
  coverage_percentage: number;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface AutomationCoverageData {
  stats: AutomationStats;
  playbook_metrics: PlaybookMetrics[];
  host_coverage: HostCoverage[];
  environments: Environment[];
  recent_runs: AutomationRun[];
  trends: AutomationTrend[];
}

export interface AutomationFilter {
  status?: AutomationStatus[];
  automation_type?: AutomationType[];
  environment?: string[];
  playbook?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  success_rate_min?: number;
  hosts_min?: number;
} 