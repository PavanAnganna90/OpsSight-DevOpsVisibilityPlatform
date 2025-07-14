/**
 * useGitActivity Hook
 * 
 * Custom React hook for managing Git activity data, including loading states,
 * caching, error handling, and real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import gitActivityService from '../services/gitActivityService';
import {
  ActivityHeatmapData,
  GitActivityMetrics,
  GitActivityRequest,
  GitActivityResponse,
  UseGitActivityHeatmapReturn,
  GitActivityError
} from '../types/git-activity';

/**
 * Hook for fetching and managing Git activity heatmap data
 */
export const useGitActivityHeatmap = (
  owner: string,
  repo: string,
  options: {
    provider?: 'github' | 'gitlab';
    daysBack?: number;
    useCache?: boolean;
    forceRefresh?: boolean;
    refreshInterval?: number;
    enabled?: boolean;
  } = {}
): UseGitActivityHeatmapReturn => {
  const {
    provider = 'github',
    daysBack = 365,
    useCache = true,
    forceRefresh = false,
    refreshInterval = 0, // 0 = no auto refresh
    enabled = true
  } = options;

  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Query key for caching
  const queryKey = ['git-activity', owner, repo, provider, daysBack];

  // Main data fetching query
  const {
    data: response,
    isLoading,
    error: queryError,
    refetch: queryRefetch
  } = useQuery<GitActivityResponse, GitActivityError>({
    queryKey,
    queryFn: async () => {
      setError(null);
      
      const request: GitActivityRequest = {
        owner,
        repo,
        provider,
        days_back: daysBack,
        use_cache: useCache,
        force_refresh: forceRefresh
      };

      try {
        return await gitActivityService.getRepositoryActivity(request);
      } catch (err) {
        const gitError = err as GitActivityError;
        setError(gitError.message);
        throw gitError;
      }
    },
    enabled: enabled && !!owner && !!repo,
    staleTime: useCache ? 5 * 60 * 1000 : 0, // 5 minutes if using cache
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    retry: (failureCount, error) => {
      // Retry network errors but not auth/validation errors
      const gitError = error as GitActivityError;
      if (gitError.type === 'auth' || gitError.type === 'validation') {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Extract heatmap data and metrics
  const data: ActivityHeatmapData[] = response?.activity_heatmap || [];
  const metrics: GitActivityMetrics | null = response ? {
    total_commits: response.total_commits,
    total_prs: response.total_prs,
    total_contributors: response.total_contributors,
    active_branches: response.active_branches,
    lines_of_code: response.lines_of_code,
    code_churn: response.code_churn,
    avg_commits_per_day: response.avg_commits_per_day,
    avg_pr_size: response.avg_pr_size,
    top_contributors: response.top_contributors,
    activity_heatmap: response.activity_heatmap,
    velocity_trend: response.velocity_trend,
    language_distribution: response.language_distribution
  } : null;

  // Refetch function
  const refetch = useCallback(async () => {
    try {
      setError(null);
      await queryRefetch();
    } catch (err) {
      const gitError = err as GitActivityError;
      setError(gitError.message);
    }
  }, [queryRefetch]);

  // Cache invalidation function
  const invalidateCache = useCallback(async () => {
    try {
      await gitActivityService.invalidateCache(owner, repo);
      await queryClient.invalidateQueries({ queryKey });
      await refetch();
    } catch (err) {
      const gitError = err as GitActivityError;
      setError(gitError.message);
    }
  }, [owner, repo, queryClient, queryKey, refetch]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      const gitError = queryError as GitActivityError;
      setError(gitError.message);
    }
  }, [queryError]);

  return {
    data,
    metrics,
    loading: isLoading,
    error: error || (queryError as GitActivityError)?.message || null,
    refetch,
    invalidateCache
  };
};

/**
 * Hook for fetching repository heatmap data only
 */
export const useRepositoryHeatmap = (
  owner: string,
  repo: string,
  daysBack: number = 365,
  options: {
    enabled?: boolean;
    refreshInterval?: number;
  } = {}
) => {
  const { enabled = true, refreshInterval = 0 } = options;

  return useQuery<ActivityHeatmapData[], GitActivityError>({
    queryKey: ['git-heatmap', owner, repo, daysBack],
    queryFn: () => gitActivityService.getRepositoryHeatmap(owner, repo, daysBack),
    enabled: enabled && !!owner && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: refreshInterval > 0 ? refreshInterval : false
  });
};

/**
 * Hook for managing multiple repositories
 */
export const useMultiRepositoryActivity = (
  repositories: Array<{ owner: string; repo: string; provider?: 'github' | 'gitlab' }>,
  options: {
    daysBack?: number;
    enabled?: boolean;
  } = {}
) => {
  const { daysBack = 365, enabled = true } = options;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, ActivityHeatmapData[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchAllRepositories = useCallback(async () => {
    if (!enabled || repositories.length === 0) return;

    setLoading(true);
    const results: Record<string, ActivityHeatmapData[]> = {};
    const newErrors: Record<string, string> = {};

    // Fetch all repositories in parallel
    const promises = repositories.map(async ({ owner, repo, provider = 'github' }) => {
      const key = `${owner}/${repo}`;
      try {
        const heatmapData = await gitActivityService.getRepositoryHeatmap(owner, repo, daysBack);
        results[key] = heatmapData;
      } catch (error) {
        const gitError = error as GitActivityError;
        newErrors[key] = gitError.message;
      }
    });

    await Promise.allSettled(promises);

    setData(results);
    setErrors(newErrors);
    setLoading(false);
  }, [repositories, daysBack, enabled]);

  useEffect(() => {
    fetchAllRepositories();
  }, [fetchAllRepositories]);

  return {
    data,
    loading,
    errors,
    refetch: fetchAllRepositories
  };
};

/**
 * Hook for real-time activity updates via WebSocket
 */
export const useRealTimeGitActivity = (
  owner: string,
  repo: string,
  options: {
    enabled?: boolean;
    onUpdate?: (data: ActivityHeatmapData) => void;
  } = {}
) => {
  const { enabled = true, onUpdate } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  // WebSocket connection
  useEffect(() => {
    if (!enabled || !owner || !repo) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/git-activity/${owner}/${repo}`;
    
    const connect = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          setIsConnected(true);
          console.log(`Connected to Git activity WebSocket for ${owner}/${repo}`);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ActivityHeatmapData;
            setLastUpdate(new Date());
            
            // Update query cache
            queryClient.setQueryData(
              ['git-activity', owner, repo, 'github', 365],
              (oldData: GitActivityResponse | undefined) => {
                if (!oldData) return oldData;
                
                // Update the activity heatmap data
                const updatedHeatmap = [...oldData.activity_heatmap];
                const existingIndex = updatedHeatmap.findIndex(item => item.date === data.date);
                
                if (existingIndex >= 0) {
                  updatedHeatmap[existingIndex] = data;
                } else {
                  updatedHeatmap.push(data);
                  updatedHeatmap.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                }
                
                return {
                  ...oldData,
                  activity_heatmap: updatedHeatmap
                };
              }
            );

            onUpdate?.(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        wsRef.current.onclose = () => {
          setIsConnected(false);
          console.log(`Disconnected from Git activity WebSocket for ${owner}/${repo}`);
          
          // Attempt to reconnect after 5 seconds
          setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, owner, repo, onUpdate, queryClient]);

  return {
    isConnected,
    lastUpdate
  };
};

/**
 * Hook for managing Git activity filters
 */
export const useGitActivityFilters = () => {
  const [filters, setFilters] = useState<{
    dateRange: { startDate: Date; endDate: Date };
    activityTypes: ('commits' | 'prs' | 'reviews')[];
    contributors: string[];
    repositories: string[];
  }>({
    dateRange: {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date()
    },
    activityTypes: ['commits', 'prs', 'reviews'],
    contributors: [],
    repositories: []
  });

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      dateRange: {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      activityTypes: ['commits', 'prs', 'reviews'],
      contributors: [],
      repositories: []
    });
  }, []);

  const applyFilters = useCallback((data: ActivityHeatmapData[]) => {
    return data.filter(item => {
      const itemDate = new Date(item.date);
      
      // Date range filter
      if (itemDate < filters.dateRange.startDate || itemDate > filters.dateRange.endDate) {
        return false;
      }
      
      // Activity type filter
      const hasMatchingActivity = filters.activityTypes.some(type => {
        switch (type) {
          case 'commits':
            return item.commit_count > 0;
          case 'prs':
            return item.pr_count > 0;
          case 'reviews':
            return item.activity_types.includes('review');
          default:
            return false;
        }
      });
      
      if (!hasMatchingActivity) return false;
      
      return true;
    });
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    applyFilters
  };
}; 