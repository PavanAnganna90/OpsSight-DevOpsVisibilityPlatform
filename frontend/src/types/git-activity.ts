/**
 * Git Activity Types
 * 
 * TypeScript type definitions for Git activity data, heatmaps, and related components.
 */

export interface GitCommit {
  sha: string;
  message: string;
  author_login: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committed_date: string;
  additions: number;
  deletions: number;
  changed_files: number;
  url: string;
  verified: boolean;
}

export interface GitPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author_login: string;
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
  base_branch: string;
  head_branch: string;
  commits_count: number;
  additions: number;
  deletions: number;
  changed_files: number;
  url: string;
  review_comments: number;
  reviews_count: number;
}

export interface GitContributor {
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  contributions: number;
  commits_count: number;
  additions: number;
  deletions: number;
  first_contribution: string;
  last_contribution: string;
}

export interface ActivityHeatmapData {
  date: string; // YYYY-MM-DD format
  activity_count: number;
  commit_count: number;
  pr_count: number;
  contributor_count: number;
  lines_added: number;
  lines_deleted: number;
  files_changed: number;
  activity_types: string[];
}

export interface GitActivityMetrics {
  total_commits: number;
  total_prs: number;
  total_contributors: number;
  active_branches: number;
  lines_of_code: number;
  code_churn: number;
  avg_commits_per_day: number;
  avg_pr_size: number;
  top_contributors: GitContributor[];
  activity_heatmap: ActivityHeatmapData[];
  velocity_trend: VelocityTrendPoint[];
  language_distribution: Record<string, number>;
}

export interface VelocityTrendPoint {
  week: string;
  commits: number;
  prs: number;
  lines_changed: number;
  velocity_score: number;
}

export interface GitActivityRequest {
  owner: string;
  repo: string;
  provider: 'github' | 'gitlab';
  days_back: number;
  use_cache: boolean;
  force_refresh: boolean;
}

export interface GitActivityResponse {
  repository: string;
  provider: string;
  analysis_period_days: number;
  total_commits: number;
  total_prs: number;
  total_contributors: number;
  active_branches: number;
  lines_of_code: number;
  code_churn: number;
  avg_commits_per_day: number;
  avg_pr_size: number;
  top_contributors: GitContributor[];
  activity_heatmap: ActivityHeatmapData[];
  velocity_trend: VelocityTrendPoint[];
  language_distribution: Record<string, number>;
  cache_info: {
    cache_used: boolean;
    force_refresh: boolean;
    cache_available: boolean;
    hit_rate_percent: number;
    total_requests: number;
  };
}

// Component Props Types
export interface GitActivityHeatmapProps {
  data: ActivityHeatmapData[];
  repository: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  colorScheme?: 'green' | 'blue' | 'purple' | 'red';
  showWeekdays?: boolean;
  showMonthLabels?: boolean;
  cellSize?: number;
  cellGap?: number;
  loading?: boolean;
  error?: string | null;
  onCellClick?: (date: string, data: ActivityHeatmapData) => void;
  onCellHover?: (date: string, data: ActivityHeatmapData | null) => void;
  className?: string;
}

export interface HeatmapTooltipData {
  date: string;
  dayOfWeek: string;
  activityData: ActivityHeatmapData;
  position: {
    x: number;
    y: number;
  };
}

export interface GitActivityFilters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  activityTypes: ('commits' | 'prs' | 'reviews')[];
  contributors: string[];
  repositories: string[];
  branches: string[];
}

export interface GitActivityViewOptions {
  viewType: 'daily' | 'weekly' | 'monthly';
  groupBy: 'day' | 'week' | 'month';
  sortBy: 'date' | 'activity' | 'commits' | 'prs';
  sortOrder: 'asc' | 'desc';
}

export interface DetailedActivityView {
  date: string;
  commits: GitCommit[];
  pullRequests: GitPullRequest[];
  contributors: GitContributor[];
  metrics: {
    total_activity: number;
    lines_added: number;
    lines_deleted: number;
    files_changed: number;
    code_churn: number;
  };
}

// Chart Data Types
export interface HeatmapCellData {
  date: string;
  value: number;
  level: 0 | 1 | 2 | 3 | 4; // Activity intensity level
  tooltip: string;
  activityData: ActivityHeatmapData;
}

export interface HeatmapWeekData {
  weekNumber: number;
  days: HeatmapCellData[];
}

export interface HeatmapMonthData {
  month: string;
  year: number;
  weeks: HeatmapWeekData[];
}

// API Service Types
export interface GitActivityApiService {
  getRepositoryActivity: (request: GitActivityRequest) => Promise<GitActivityResponse>;
  getRepositoryHeatmap: (owner: string, repo: string, daysBack?: number) => Promise<ActivityHeatmapData[]>;
  invalidateCache: (owner: string, repo: string) => Promise<void>;
  getCacheStats: () => Promise<any>;
}

// Hook Types
export interface UseGitActivityHeatmapReturn {
  data: ActivityHeatmapData[];
  metrics: GitActivityMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => Promise<void>;
}

export interface UseGitActivityFiltersReturn {
  filters: GitActivityFilters;
  updateFilters: (filters: Partial<GitActivityFilters>) => void;
  resetFilters: () => void;
  applyFilters: (data: ActivityHeatmapData[]) => ActivityHeatmapData[];
}

// Export/Import Types
export interface GitActivityExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'png';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  includeMetrics: boolean;
  includeHeatmap: boolean;
  includeDetails: boolean;
}

export interface GitActivityImportData {
  repository: string;
  data: ActivityHeatmapData[];
  metrics: GitActivityMetrics;
  exportedAt: string;
  format: string;
}

// Error Types
export interface GitActivityError {
  type: 'network' | 'auth' | 'validation' | 'server' | 'cache';
  message: string;
  details?: any;
  timestamp: string;
} 