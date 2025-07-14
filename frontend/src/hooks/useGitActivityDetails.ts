/**
 * useGitActivityDetails Hook
 * 
 * Custom React hook for managing detailed Git activity data for specific dates,
 * including commits, pull requests, and contributor information.
 */

import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import gitActivityService from '../services/gitActivityService';
import {
  DetailedActivityView,
  GitCommit,
  GitPullRequest,
  GitContributor,
  GitActivityError
} from '../types/git-activity';

/**
 * Hook for fetching detailed activity data for a specific date
 */
export const useGitActivityDetails = (
  owner: string,
  repo: string,
  provider: 'github' | 'gitlab' = 'github'
) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const queryClient = useQueryClient();
  const loadingRef = useRef<string | null>(null);

  // Query for detailed data
  const {
    data: detailedData,
    isLoading,
    error,
    refetch
  } = useQuery<DetailedActivityView, GitActivityError>({
    queryKey: ['git-activity-details', owner, repo, provider, selectedDate],
    queryFn: async () => {
      if (!selectedDate) throw new Error('No date selected');
      
      // This would be implemented in the backend
      // For now, we'll simulate the API call
      const response = await gitActivityService.getRepositoryActivity({
        owner,
        repo,
        provider,
        days_back: 1,
        use_cache: true,
        force_refresh: false
      });

      // Extract data for the specific date
      const dayData = response.activity_heatmap.find(item => item.date === selectedDate);
      
      if (!dayData) {
        throw new Error('No data found for selected date');
      }

      // Simulate detailed data structure
      // In a real implementation, this would come from a dedicated endpoint
      const detailedView: DetailedActivityView = {
        date: selectedDate,
        commits: [], // Would be populated from API
        pullRequests: [], // Would be populated from API
        contributors: [], // Would be populated from API
        metrics: {
          total_activity: dayData.activity_count,
          lines_added: dayData.lines_added,
          lines_deleted: dayData.lines_deleted,
          files_changed: dayData.files_changed,
          code_churn: dayData.lines_added + dayData.lines_deleted
        }
      };

      return detailedView;
    },
    enabled: !!selectedDate && !!owner && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  /**
   * Open detail view for a specific date
   */
  const openDetailView = useCallback((date: string) => {
    setSelectedDate(date);
    setIsDetailViewOpen(true);
  }, []);

  /**
   * Close detail view
   */
  const closeDetailView = useCallback(() => {
    setIsDetailViewOpen(false);
    setSelectedDate(null);
  }, []);

  /**
   * Load detailed data for a specific date
   */
  const loadDetails = useCallback(async (date: string) => {
    if (loadingRef.current === date) return; // Prevent duplicate requests
    
    loadingRef.current = date;
    setSelectedDate(date);
    
    try {
      await refetch();
    } finally {
      loadingRef.current = null;
    }
  }, [refetch]);

  /**
   * Prefetch details for a date (for hover previews)
   */
  const prefetchDetails = useCallback((date: string) => {
    queryClient.prefetchQuery({
      queryKey: ['git-activity-details', owner, repo, provider, date],
      queryFn: async () => {
        // Same logic as main query but for prefetching
        const response = await gitActivityService.getRepositoryActivity({
          owner,
          repo,
          provider,
          days_back: 1,
          use_cache: true,
          force_refresh: false
        });

        const dayData = response.activity_heatmap.find(item => item.date === date);
        
        if (!dayData) {
          throw new Error('No data found for selected date');
        }

        return {
          date,
          commits: [],
          pullRequests: [],
          contributors: [],
          metrics: {
            total_activity: dayData.activity_count,
            lines_added: dayData.lines_added,
            lines_deleted: dayData.lines_deleted,
            files_changed: dayData.files_changed,
            code_churn: dayData.lines_added + dayData.lines_deleted
          }
        } as DetailedActivityView;
      },
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient, owner, repo, provider]);

  /**
   * Clear cached details for a specific date
   */
  const clearDetailsCache = useCallback((date?: string) => {
    if (date) {
      queryClient.removeQueries({
        queryKey: ['git-activity-details', owner, repo, provider, date]
      });
    } else {
      queryClient.removeQueries({
        queryKey: ['git-activity-details', owner, repo, provider]
      });
    }
  }, [queryClient, owner, repo, provider]);

  return {
    // State
    selectedDate,
    isDetailViewOpen,
    detailedData,
    isLoading,
    error: error?.message || null,

    // Actions
    openDetailView,
    closeDetailView,
    loadDetails,
    prefetchDetails,
    clearDetailsCache,
    refetch
  };
};

/**
 * Hook for managing multiple date selections and bulk operations
 */
export const useGitActivityBulkDetails = (
  owner: string,
  repo: string,
  provider: 'github' | 'gitlab' = 'github'
) => {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  /**
   * Add date to selection
   */
  const addDateToSelection = useCallback((date: string) => {
    setSelectedDates(prev => new Set([...prev, date]));
  }, []);

  /**
   * Remove date from selection
   */
  const removeDateFromSelection = useCallback((date: string) => {
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      newSet.delete(date);
      return newSet;
    });
  }, []);

  /**
   * Toggle date selection
   */
  const toggleDateSelection = useCallback((date: string) => {
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedDates(new Set());
    setErrors({});
  }, []);

  /**
   * Load details for all selected dates
   */
  const loadAllSelectedDetails = useCallback(async () => {
    if (selectedDates.size === 0) return;

    setIsLoading(true);
    const newErrors: Record<string, string> = {};

    const promises = Array.from(selectedDates).map(async (date) => {
      try {
        await queryClient.fetchQuery({
          queryKey: ['git-activity-details', owner, repo, provider, date],
          queryFn: async () => {
            const response = await gitActivityService.getRepositoryActivity({
              owner,
              repo,
              provider,
              days_back: 1,
              use_cache: true,
              force_refresh: false
            });

            const dayData = response.activity_heatmap.find(item => item.date === date);
            
            if (!dayData) {
              throw new Error('No data found for selected date');
            }

            return {
              date,
              commits: [],
              pullRequests: [],
              contributors: [],
              metrics: {
                total_activity: dayData.activity_count,
                lines_added: dayData.lines_added,
                lines_deleted: dayData.lines_deleted,
                files_changed: dayData.files_changed,
                code_churn: dayData.lines_added + dayData.lines_deleted
              }
            } as DetailedActivityView;
          }
        });
      } catch (error) {
        newErrors[date] = error instanceof Error ? error.message : 'Unknown error';
      }
    });

    await Promise.allSettled(promises);
    setErrors(newErrors);
    setIsLoading(false);
  }, [selectedDates, queryClient, owner, repo, provider]);

  /**
   * Export selected dates data
   */
  const exportSelectedData = useCallback(async (format: 'csv' | 'json' = 'json') => {
    if (selectedDates.size === 0) return;

    const data: Record<string, DetailedActivityView | null> = {};
    
    for (const date of selectedDates) {
      const cachedData = queryClient.getQueryData<DetailedActivityView>([
        'git-activity-details', owner, repo, provider, date
      ]);
      data[date] = cachedData || null;
    }

    const exportData = {
      repository: `${owner}/${repo}`,
      provider,
      selectedDates: Array.from(selectedDates),
      data,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `git-activity-details-${owner}-${repo}-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedDates, queryClient, owner, repo, provider]);

  return {
    // State
    selectedDates: Array.from(selectedDates),
    selectedDatesSet: selectedDates,
    isLoading,
    errors,

    // Actions
    addDateToSelection,
    removeDateFromSelection,
    toggleDateSelection,
    clearSelection,
    loadAllSelectedDetails,
    exportSelectedData
  };
};

/**
 * Hook for activity comparison between dates
 */
export const useGitActivityComparison = () => {
  const [comparisonDates, setComparisonDates] = useState<[string, string] | null>(null);
  const [comparisonData, setComparisonData] = useState<{
    date1: DetailedActivityView | null;
    date2: DetailedActivityView | null;
    comparison: any | null;
  }>({
    date1: null,
    date2: null,
    comparison: null
  });

  /**
   * Set dates for comparison
   */
  const setDatesForComparison = useCallback((date1: string, date2: string) => {
    setComparisonDates([date1, date2]);
  }, []);

  /**
   * Clear comparison
   */
  const clearComparison = useCallback(() => {
    setComparisonDates(null);
    setComparisonData({
      date1: null,
      date2: null,
      comparison: null
    });
  }, []);

  /**
   * Calculate comparison metrics
   */
  const calculateComparison = useCallback((data1: DetailedActivityView, data2: DetailedActivityView) => {
    return {
      activityDiff: data2.metrics.total_activity - data1.metrics.total_activity,
      commitsDiff: data2.commits.length - data1.commits.length,
      prsDiff: data2.pullRequests.length - data1.pullRequests.length,
      contributorsDiff: data2.contributors.length - data1.contributors.length,
      linesAddedDiff: data2.metrics.lines_added - data1.metrics.lines_added,
      linesDeletedDiff: data2.metrics.lines_deleted - data1.metrics.lines_deleted,
      filesChangedDiff: data2.metrics.files_changed - data1.metrics.files_changed
    };
  }, []);

  return {
    comparisonDates,
    comparisonData,
    setDatesForComparison,
    clearComparison,
    calculateComparison
  };
}; 