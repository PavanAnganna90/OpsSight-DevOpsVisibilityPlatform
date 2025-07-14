/**
 * Git Activity Service
 * 
 * API service for Git activity data, heatmaps, and analytics.
 */

import axios, { AxiosResponse } from 'axios';
import {
  GitActivityRequest,
  GitActivityResponse,
  ActivityHeatmapData,
  GitActivityError,
  GitActivityApiService
} from '../types/git-activity';

// API base URL - should be configured based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Git Activity API Service Implementation
 */
class GitActivityService implements GitActivityApiService {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_BASE_URL;
  }

  /**
   * Get comprehensive Git activity data for a repository
   */
  async getRepositoryActivity(request: GitActivityRequest): Promise<GitActivityResponse> {
    try {
      const params = {
        provider: request.provider,
        days_back: request.days_back,
        use_cache: request.use_cache,
        force_refresh: request.force_refresh
      };

      const response: AxiosResponse<GitActivityResponse> = await axios.get(
        `${this.baseURL}/git/activity/${request.owner}/${request.repo}`,
        { params }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch repository activity');
    }
  }

  /**
   * Get activity heatmap data for a repository
   */
  async getRepositoryHeatmap(
    owner: string, 
    repo: string, 
    daysBack: number = 365
  ): Promise<ActivityHeatmapData[]> {
    try {
      const response: AxiosResponse<{ heatmap: ActivityHeatmapData[] }> = await axios.get(
        `${this.baseURL}/git/heatmap/${owner}/${repo}`,
        { 
          params: { days_back: daysBack }
        }
      );

      return response.data.heatmap;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch repository heatmap');
    }
  }

  /**
   * Get repository metrics
   */
  async getRepositoryMetrics(owner: string, repo: string): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/git/metrics/${owner}/${repo}`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch repository metrics');
    }
  }

  /**
   * Get repository contributors
   */
  async getRepositoryContributors(owner: string, repo: string): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/git/contributors/${owner}/${repo}`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch repository contributors');
    }
  }

  /**
   * Get velocity trends
   */
  async getVelocityTrends(owner: string, repo: string): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/git/velocity/${owner}/${repo}`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch velocity trends');
    }
  }

  /**
   * Invalidate cache for a repository
   */
  async invalidateCache(owner: string, repo: string): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/git/cache/${owner}/${repo}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to invalidate cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/git/cache/stats`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch cache stats');
    }
  }

  /**
   * Warm cache for multiple repositories
   */
  async warmCache(repositories: Array<{ owner: string; repo: string }>): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/git/cache/warm`, { repositories });
    } catch (error) {
      throw this.handleError(error, 'Failed to warm cache');
    }
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupCache(): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/git/cache/cleanup`);
    } catch (error) {
      throw this.handleError(error, 'Failed to cleanup cache');
    }
  }

  /**
   * Search repositories by organization
   */
  async searchRepositories(query: string, provider: 'github' | 'gitlab' = 'github'): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/git/search`,
        { 
          params: { query, provider }
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to search repositories');
    }
  }

  /**
   * Get webhook configuration status
   */
  async getWebhookStatus(owner: string, repo: string): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/webhooks/status/${owner}/${repo}`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch webhook status');
    }
  }

  /**
   * Configure webhook for real-time updates
   */
  async configureWebhook(
    owner: string, 
    repo: string, 
    provider: 'github' | 'gitlab'
  ): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.post(
        `${this.baseURL}/webhooks/configure`,
        { owner, repo, provider }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to configure webhook');
    }
  }

  /**
   * Export activity data in various formats
   */
  async exportActivity(
    owner: string,
    repo: string,
    format: 'csv' | 'json' | 'pdf',
    options?: any
  ): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> = await axios.get(
        `${this.baseURL}/git/export/${owner}/${repo}`,
        {
          params: { format, ...options },
          responseType: 'blob'
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to export activity data');
    }
  }

  /**
   * Handle API errors and convert to GitActivityError
   */
  private handleError(error: any, message: string): GitActivityError {
    const gitError: GitActivityError = {
      type: 'network',
      message,
      timestamp: new Date().toISOString()
    };

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        gitError.type = this.getErrorType(error.response.status);
        gitError.message = error.response.data?.message || error.response.data?.detail || message;
        gitError.details = error.response.data;
      } else if (error.request) {
        // Request made but no response
        gitError.type = 'network';
        gitError.message = 'Network error: No response from server';
      } else {
        // Something else happened
        gitError.type = 'network';
        gitError.message = error.message || message;
      }
    } else {
      gitError.details = error;
    }

    return gitError;
  }

  /**
   * Determine error type based on HTTP status code
   */
  private getErrorType(status: number): GitActivityError['type'] {
    if (status === 401 || status === 403) return 'auth';
    if (status === 400 || status === 422) return 'validation';
    if (status >= 500) return 'server';
    return 'network';
  }
}

// Create and export singleton instance
const gitActivityService = new GitActivityService();

export default gitActivityService;

// Export class for testing
export { GitActivityService };

// Utility functions for data processing
export const processHeatmapData = (data: ActivityHeatmapData[]): ActivityHeatmapData[] => {
  // Sort by date
  return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const fillMissingDates = (
  data: ActivityHeatmapData[],
  startDate: Date,
  endDate: Date
): ActivityHeatmapData[] => {
  const filled: ActivityHeatmapData[] = [];
  const dataMap = new Map(data.map(item => [item.date, item]));
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    if (dataMap.has(dateStr)) {
      filled.push(dataMap.get(dateStr)!);
    } else {
      // Fill missing date with zero activity
      filled.push({
        date: dateStr,
        activity_count: 0,
        commit_count: 0,
        pr_count: 0,
        contributor_count: 0,
        lines_added: 0,
        lines_deleted: 0,
        files_changed: 0,
        activity_types: []
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return filled;
};

export const calculateActivityLevel = (activityCount: number, maxActivity: number): 0 | 1 | 2 | 3 | 4 => {
  if (activityCount === 0) return 0;
  if (maxActivity === 0) return 1;
  
  const ratio = activityCount / maxActivity;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}; 