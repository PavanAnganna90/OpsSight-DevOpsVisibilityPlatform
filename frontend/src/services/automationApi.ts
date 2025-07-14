/**
 * Automation API Service
 * 
 * Service for connecting to Ansible automation backend endpoints.
 * Provides methods for fetching coverage data, trends, and automation runs.
 */

import { 
  AutomationCoverageData, 
  AutomationRun, 
  AutomationStats,
  AutomationTrend,
  PlaybookMetrics,
  HostCoverage,
  Environment,
  AutomationFilter
} from '../types/automation';

export interface TrendResponse {
  period: string;
  start_date: string;
  end_date: string;
  data_points: Array<{
    period: string;
    timestamp?: string;
    total_runs: number;
    success_rate: number;
    coverage_percentage: number;
    avg_execution_time: number;
    total_tasks: number;
    total_hosts: number;
    failed_runs: number;
    module_usage: Record<string, number>;
  }>;
  summary: {
    total_runs: number;
    avg_coverage: number;
    avg_success_rate: number;
    trend_direction: 'improving' | 'declining' | 'stable' | 'insufficient_data' | 'no_data';
    data_points: number;
  };
}

export interface PerformanceTrendResponse {
  period: string;
  start_date: string;
  end_date: string;
  performance_data: Array<{
    period: string;
    avg_duration_seconds: number;
    avg_tasks_per_run: number;
    avg_hosts_per_run: number;
    success_rate_percent: number;
    task_efficiency_percent: number;
    total_runs: number;
    throughput_runs_per_day?: number;
  }>;
  summary: {
    avg_duration_seconds: number;
    avg_success_rate_percent: number;
    total_runs_analyzed: number;
    performance_trend: 'improving' | 'degrading' | 'stable' | 'insufficient_data' | 'no_data';
    data_points: number;
  };
}

export interface ModuleTrendResponse {
  start_date: string;
  end_date: string;
  top_modules: Array<{
    name: string;
    total_usage: number;
  }>;
  time_series: Array<{
    date: string;
    total_usage: number;
    [key: string]: string | number; // module_* properties
  }>;
  total_unique_modules: number;
  analysis_period_days: number;
}

export interface HostTrendResponse {
  start_date: string;
  end_date: string;
  coverage_data: Array<{
    date: string;
    avg_hosts_per_run: number;
    avg_successful_hosts: number;
    avg_failed_hosts: number;
    host_success_rate_percent: number;
    total_runs: number;
  }>;
  summary: {
    avg_hosts_per_run: number;
    avg_host_success_rate_percent: number;
    total_runs_analyzed: number;
    data_points: number;
  };
}

class AutomationApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/v1/ansible' 
      : 'http://localhost:8000/api/v1/ansible';
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // Legacy coverage endpoint (to maintain compatibility)
  async getCoverage(projectId: number, filter?: Partial<AutomationFilter>): Promise<AutomationCoverageData> {
    const queryParams = new URLSearchParams();
    queryParams.append('project_id', projectId.toString());
    
    if (filter?.environment?.length) {
      filter.environment.forEach(env => queryParams.append('environment', env));
    }
    
    if (filter?.date_range) {
      queryParams.append('start_date', filter.date_range.start);
      queryParams.append('end_date', filter.date_range.end);
    }

    return this.request<AutomationCoverageData>(`/coverage?${queryParams}`);
  }

  // New trend analysis endpoints
  async getCoverageTrends(
    projectId: number, 
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    daysBack: number = 30,
    hostFilter?: string,
    moduleFilter?: string
  ): Promise<TrendResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('project_id', projectId.toString());
    queryParams.append('period', period);
    queryParams.append('days_back', daysBack.toString());
    
    if (hostFilter) queryParams.append('host_filter', hostFilter);
    if (moduleFilter) queryParams.append('module_filter', moduleFilter);

    return this.request<TrendResponse>(`/trends/coverage?${queryParams}`);
  }

  async getPerformanceTrends(
    projectId: number,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    daysBack: number = 30
  ): Promise<PerformanceTrendResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('project_id', projectId.toString());
    queryParams.append('period', period);
    queryParams.append('days_back', daysBack.toString());

    return this.request<PerformanceTrendResponse>(`/trends/performance?${queryParams}`);
  }

  async getModuleUsageTrends(
    projectId: number,
    daysBack: number = 30,
    topN: number = 10
  ): Promise<ModuleTrendResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('project_id', projectId.toString());
    queryParams.append('days_back', daysBack.toString());
    queryParams.append('top_n', topN.toString());

    return this.request<ModuleTrendResponse>(`/trends/modules?${queryParams}`);
  }

  async getHostCoverageTrends(
    projectId: number,
    daysBack: number = 30
  ): Promise<HostTrendResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('project_id', projectId.toString());
    queryParams.append('days_back', daysBack.toString());

    return this.request<HostTrendResponse>(`/trends/hosts?${queryParams}`);
  }

  // Automation runs management
  async getAutomationRuns(filter?: {
    projectId?: number;
    status?: string;
    automationType?: string;
    hostFilter?: string;
    playbookName?: string;
    skip?: number;
    limit?: number;
  }): Promise<{
    automation_runs: AutomationRun[];
    total: number;
    skip: number;
    limit: number;
    filters: Record<string, any>;
  }> {
    const queryParams = new URLSearchParams();
    
    if (filter?.projectId) queryParams.append('project_id', filter.projectId.toString());
    if (filter?.status) queryParams.append('status', filter.status);
    if (filter?.automationType) queryParams.append('automation_type', filter.automationType);
    if (filter?.hostFilter) queryParams.append('host_filter', filter.hostFilter);
    if (filter?.playbookName) queryParams.append('playbook_name', filter.playbookName);
    if (filter?.skip) queryParams.append('skip', filter.skip.toString());
    if (filter?.limit) queryParams.append('limit', filter.limit.toString());

    return this.request(`/automation-runs?${queryParams}`);
  }

  async getAutomationRun(
    runId: number,
    includeLogs: boolean = false,
    includeCoverage: boolean = true
  ): Promise<AutomationRun> {
    const queryParams = new URLSearchParams();
    queryParams.append('include_logs', includeLogs.toString());
    queryParams.append('include_coverage', includeCoverage.toString());

    return this.request<AutomationRun>(`/automation-runs/${runId}?${queryParams}`);
  }

  // Statistics
  async getStats(projectId: number): Promise<AutomationStats> {
    const queryParams = new URLSearchParams();
    queryParams.append('project_id', projectId.toString());

    return this.request<AutomationStats>(`/stats?${queryParams}`);
  }

  // Log parsing
  async parseLog(
    logContent: string,
    projectId?: number,
    playbookName?: string,
    environment?: string,
    logFormat: string = 'auto'
  ): Promise<{
    success: boolean;
    format: string;
    plays: any[];
    tasks: any[];
    hosts: Record<string, any>;
    summary: Record<string, any>;
    coverage_metrics: Record<string, any>;
    metadata: Record<string, any>;
    errors: string[];
    warnings: string[];
    automation_run_id?: number;
  }> {
    return this.request('/parse-log', {
      method: 'POST',
      body: JSON.stringify({
        log_content: logContent,
        project_id: projectId,
        playbook_name: playbookName,
        environment,
        log_format: logFormat
      })
    });
  }

  async parseLogFile(
    file: File,
    projectId?: number,
    playbookName?: string,
    environment?: string,
    logFormat: string = 'auto'
  ): Promise<{
    success: boolean;
    format: string;
    plays: any[];
    tasks: any[];
    hosts: Record<string, any>;
    summary: Record<string, any>;
    coverage_metrics: Record<string, any>;
    metadata: Record<string, any>;
    errors: string[];
    warnings: string[];
    automation_run_id?: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('project_id', projectId.toString());
    if (playbookName) formData.append('playbook_name', playbookName);
    if (environment) formData.append('environment', environment);
    formData.append('log_format', logFormat);

    return this.request('/parse-log-file', {
      method: 'POST',
      body: formData,
      headers: {} // Don't set Content-Type for FormData
    });
  }

  // Utility endpoints
  async getSupportedModules(): Promise<{
    automation_modules: string[];
    critical_modules: string[];
    total_supported: number;
    categories: Record<string, string[]>;
  }> {
    return this.request('/supported-modules');
  }

  async getTaskStatuses(): Promise<{
    task_statuses: string[];
    host_statuses: string[];
    automation_statuses: string[];
    automation_types: string[];
  }> {
    return this.request('/task-statuses');
  }

  // Status check
  async getStatus(): Promise<{
    status: string;
    features: Record<string, boolean>;
    supported_formats: string[];
    supported_modules: string[];
    critical_modules: string[];
    version: string;
  }> {
    return this.request('/status');
  }

  // New endpoints for coverage view component
  async getPlaybookMetrics(projectId: number): Promise<PlaybookMetrics[]> {
    return this.request(`/playbook-metrics?project_id=${projectId}`);
  }

  async getHostCoverage(projectId: number): Promise<HostCoverage[]> {
    return this.request(`/host-coverage?project_id=${projectId}`);
  }

  async getEnvironments(projectId: number): Promise<Environment[]> {
    return this.request(`/environments?project_id=${projectId}`);
  }

  async getRecentRuns(projectId: number, limit: number = 10): Promise<{
    automation_runs: AutomationRun[];
    total: number;
    page: number;
    pages: number;
    limit: number;
  }> {
    return this.request(`/automation-runs?project_id=${projectId}&limit=${limit}`);
  }
}

// Export singleton instance
export const automationApi = new AutomationApiService();
export default automationApi; 