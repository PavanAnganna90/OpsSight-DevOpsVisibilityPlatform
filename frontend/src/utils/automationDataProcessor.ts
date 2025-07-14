/**
 * Automation Data Processor Utilities
 * 
 * Utility functions for processing automation coverage data with filtering,
 * grouping, sorting, and aggregation capabilities.
 */

import { 
  AutomationRun, 
  AutomationCoverageData, 
  HostCoverage, 
  PlaybookMetrics,
  Environment,
  AutomationTrend
} from '../types/automation';
import { FilterState } from '../components/automation/AutomationFilters';

export interface ProcessedData {
  filteredRuns: AutomationRun[];
  groupedData: GroupedDataItem[];
  aggregatedStats: AggregatedStats;
  totalCount: number;
  filteredCount: number;
}

export interface GroupedDataItem {
  groupKey: string;
  groupLabel: string;
  items: AutomationRun[];
  stats: {
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    lastRun?: string;
    hostCount: number;
  };
}

export interface AggregatedStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  avgDuration: number;
  totalHosts: number;
  uniquePlaybooks: number;
  environments: string[];
  dateRange: {
    earliest?: string;
    latest?: string;
  };
}

/**
 * Apply filters to automation runs
 */
export function applyFilters(
  runs: AutomationRun[],
  filters: FilterState
): AutomationRun[] {
  return runs.filter(run => {
    // Search query filter
    if (filters.searchQuery?.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        run.name,
        run.playbook_name || '',
        run.description || '',
        run.environment || '',
        ...(run.host_results?.map(hr => hr.hostname) || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.status?.length && !filters.status.includes(run.status)) {
      return false;
    }

    // Automation type filter
    if (filters.automation_type?.length && !filters.automation_type.includes(run.automation_type)) {
      return false;
    }

    // Environment filter
    if (filters.environment?.length && run.environment && !filters.environment.includes(run.environment)) {
      return false;
    }

    // Playbook filter
    if (filters.playbook?.length && run.playbook_name && !filters.playbook.includes(run.playbook_name)) {
      return false;
    }

    // Date range filter
    if (filters.date_range && run.started_at) {
      const runDate = new Date(run.started_at);
      const startDate = new Date(filters.date_range.start);
      const endDate = new Date(filters.date_range.end);
      
      if (runDate < startDate || runDate > endDate) {
        return false;
      }
    }

    // Success rate filter
    if (filters.success_rate_min !== undefined) {
      const successRate = run.total_hosts > 0 
        ? (run.successful_hosts / run.total_hosts) * 100 
        : 0;
      
      if (successRate < filters.success_rate_min) {
        return false;
      }
    }

    // Minimum hosts filter
    if (filters.hosts_min !== undefined && run.total_hosts < filters.hosts_min) {
      return false;
    }

    return true;
  });
}

/**
 * Group automation runs by specified criteria
 */
export function groupAutomationRuns(
  runs: AutomationRun[],
  groupBy: FilterState['groupBy']
): GroupedDataItem[] {
  if (!groupBy || groupBy === 'none') {
    return [{
      groupKey: 'all',
      groupLabel: 'All Runs',
      items: runs,
      stats: calculateGroupStats(runs)
    }];
  }

  const groups = new Map<string, AutomationRun[]>();

  runs.forEach(run => {
    let groupKey: string;
    
    switch (groupBy) {
      case 'environment':
        groupKey = run.environment || 'Unknown Environment';
        break;
      case 'status':
        groupKey = run.status;
        break;
      case 'playbook':
        groupKey = run.playbook_name || 'Unknown Playbook';
        break;
      case 'host_type':
        // Group by host count ranges
        if (run.total_hosts <= 5) {
          groupKey = 'Small (1-5 hosts)';
        } else if (run.total_hosts <= 20) {
          groupKey = 'Medium (6-20 hosts)';
        } else if (run.total_hosts <= 50) {
          groupKey = 'Large (21-50 hosts)';
        } else {
          groupKey = 'Enterprise (50+ hosts)';
        }
        break;
      case 'time_period':
        // Group by date
        if (run.started_at) {
          const date = new Date(run.started_at);
          groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else {
          groupKey = 'Unknown Date';
        }
        break;
      default:
        groupKey = 'Other';
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(run);
  });

  return Array.from(groups.entries()).map(([groupKey, items]) => ({
    groupKey,
    groupLabel: formatGroupLabel(groupKey, groupBy),
    items,
    stats: calculateGroupStats(items)
  }));
}

/**
 * Sort grouped data
 */
export function sortGroupedData(
  groupedData: GroupedDataItem[],
  sortBy: FilterState['sortBy'],
  sortOrder: FilterState['sortOrder']
): GroupedDataItem[] {
  const sorted = [...groupedData].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.groupLabel.localeCompare(b.groupLabel);
        break;
      case 'success_rate':
        comparison = a.stats.successRate - b.stats.successRate;
        break;
      case 'last_run':
        const aDate = a.stats.lastRun ? new Date(a.stats.lastRun).getTime() : 0;
        const bDate = b.stats.lastRun ? new Date(b.stats.lastRun).getTime() : 0;
        comparison = aDate - bDate;
        break;
      case 'total_runs':
        comparison = a.stats.totalRuns - b.stats.totalRuns;
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Sort items within each group as well
  return sorted.map(group => ({
    ...group,
    items: sortAutomationRuns(group.items, sortBy, sortOrder)
  }));
}

/**
 * Sort automation runs
 */
export function sortAutomationRuns(
  runs: AutomationRun[],
  sortBy: FilterState['sortBy'],
  sortOrder: FilterState['sortOrder']
): AutomationRun[] {
  return [...runs].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = (a.name || a.playbook_name || '').localeCompare(b.name || b.playbook_name || '');
        break;
      case 'success_rate':
        const aRate = a.total_hosts > 0 ? (a.successful_hosts / a.total_hosts) * 100 : 0;
        const bRate = b.total_hosts > 0 ? (b.successful_hosts / b.total_hosts) * 100 : 0;
        comparison = aRate - bRate;
        break;
      case 'last_run':
        const aTime = a.started_at ? new Date(a.started_at).getTime() : 0;
        const bTime = b.started_at ? new Date(b.started_at).getTime() : 0;
        comparison = aTime - bTime;
        break;
      case 'total_runs':
        // For individual runs, this doesn't make much sense, so sort by duration instead
        comparison = (a.duration_seconds || 0) - (b.duration_seconds || 0);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

/**
 * Calculate statistics for a group of runs
 */
function calculateGroupStats(runs: AutomationRun[]): GroupedDataItem['stats'] {
  if (runs.length === 0) {
    return {
      totalRuns: 0,
      successRate: 0,
      avgDuration: 0,
      hostCount: 0
    };
  }

  const successfulRuns = runs.filter(run => run.status === 'success').length;
  const totalDuration = runs.reduce((sum, run) => sum + (run.duration_seconds || 0), 0);
  const totalHosts = runs.reduce((sum, run) => sum + run.total_hosts, 0);
  const lastRun = runs.reduce((latest, run) => {
    if (!run.started_at) return latest;
    if (!latest.started_at) return run;
    return new Date(run.started_at) > new Date(latest.started_at) ? run : latest;
  });

  return {
    totalRuns: runs.length,
    successRate: (successfulRuns / runs.length) * 100,
    avgDuration: totalDuration / runs.length,
    lastRun: lastRun.started_at,
    hostCount: totalHosts
  };
}

/**
 * Calculate aggregated statistics for all filtered data
 */
export function calculateAggregatedStats(runs: AutomationRun[]): AggregatedStats {
  if (runs.length === 0) {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      successRate: 0,
      avgDuration: 0,
      totalHosts: 0,
      uniquePlaybooks: 0,
      environments: [],
      dateRange: {}
    };
  }

  const successfulRuns = runs.filter(run => run.status === 'success').length;
  const failedRuns = runs.filter(run => run.status === 'failed').length;
  const totalDuration = runs.reduce((sum, run) => sum + (run.duration_seconds || 0), 0);
  const totalHosts = runs.reduce((sum, run) => sum + run.total_hosts, 0);
  
  const uniquePlaybooks = new Set(runs.map(run => run.playbook_name).filter(Boolean)).size;
  const environments = Array.from(new Set(runs.map(run => run.environment).filter(Boolean))).filter((env): env is string => typeof env === 'string');
  
  const dates = runs
    .filter(run => run.started_at)
    .map(run => new Date(run.started_at!))
    .sort((a, b) => a.getTime() - b.getTime());
  const dateRange = {
    earliest: dates.length > 0 ? dates[0].toISOString() : undefined,
    latest: dates.length > 0 ? dates[dates.length - 1].toISOString() : undefined
  };

  return {
    totalRuns: runs.length,
    successfulRuns,
    failedRuns,
    successRate: (successfulRuns / runs.length) * 100,
    avgDuration: totalDuration / runs.length,
    totalHosts,
    uniquePlaybooks,
    environments,
    dateRange
  };
}

/**
 * Format group labels for display
 */
function formatGroupLabel(groupKey: string, groupBy: FilterState['groupBy']): string {
  switch (groupBy) {
    case 'status':
      return groupKey.charAt(0).toUpperCase() + groupKey.slice(1).replace('_', ' ');
    case 'time_period':
      return new Date(groupKey).toLocaleDateString();
    case 'environment':
    case 'playbook':
    case 'host_type':
    default:
      return groupKey;
  }
}

/**
 * Process automation coverage data with filters and grouping
 */
export function processAutomationData(
  data: AutomationCoverageData,
  filters: FilterState
): ProcessedData {
  const allRuns = data.recent_runs || [];
  
  // Apply filters
  const filteredRuns = applyFilters(allRuns, filters);
  
  // Group data
  const groupedData = groupAutomationRuns(filteredRuns, filters.groupBy);
  
  // Sort grouped data
  const sortedGroupedData = sortGroupedData(groupedData, filters.sortBy, filters.sortOrder);
  
  // Calculate aggregated statistics
  const aggregatedStats = calculateAggregatedStats(filteredRuns);

  return {
    filteredRuns,
    groupedData: sortedGroupedData,
    aggregatedStats,
    totalCount: allRuns.length,
    filteredCount: filteredRuns.length
  };
}

/**
 * Search automation runs with fuzzy matching
 */
export function searchAutomationRuns(
  runs: AutomationRun[],
  query: string,
  fields: (keyof AutomationRun)[] = ['name', 'playbook_name', 'description', 'environment']
): AutomationRun[] {
  if (!query.trim()) {
    return runs;
  }

  const searchTerms = query.toLowerCase().split(/\s+/);
  
  return runs.filter(run => {
    const searchableText = fields
      .map(field => String(run[field] || ''))
      .join(' ')
      .toLowerCase();
    
    return searchTerms.every(term => searchableText.includes(term));
  });
}

/**
 * Get filter suggestions based on existing data
 */
export function getFilterSuggestions(runs: AutomationRun[]): {
  environments: string[];
  playbooks: string[];
  hosts: string[];
  statuses: string[];
} {
  const environments = Array.from(new Set(runs.map(run => run.environment).filter(Boolean))).filter((env): env is string => typeof env === 'string');
  const playbooks = Array.from(new Set(runs.map(run => run.playbook_name).filter(Boolean))).filter((pb): pb is string => typeof pb === 'string');
  const hosts = Array.from(new Set(runs.flatMap(run => run.host_results?.map(hr => hr.hostname) || []))).filter((host): host is string => typeof host === 'string');
  const statuses = Array.from(new Set(runs.map(run => run.status)));

  return {
    environments: environments.sort(),
    playbooks: playbooks.sort(),
    hosts: hosts.sort(),
    statuses: statuses.sort()
  };
}

/**
 * Export filtered data to different formats
 */
export function exportAutomationData(
  processedData: ProcessedData,
  format: 'json' | 'csv' | 'summary'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(processedData, null, 2);
    
    case 'csv':
      const headers = [
        'Name', 'Playbook', 'Environment', 'Status', 'Started At', 
        'Duration (s)', 'Total Hosts', 'Successful Hosts', 'Failed Hosts', 'Success Rate (%)'
      ];
      
      const rows = processedData.filteredRuns.map(run => [
        run.name || '',
        run.playbook_name || '',
        run.environment || '',
        run.status,
        run.started_at,
        run.duration_seconds || 0,
        run.total_hosts,
        run.successful_hosts,
        run.failed_hosts,
        run.total_hosts > 0 ? ((run.successful_hosts / run.total_hosts) * 100).toFixed(2) : '0'
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    
    case 'summary':
      const { aggregatedStats } = processedData;
      return `
Automation Coverage Summary
==========================

Total Runs: ${aggregatedStats.totalRuns}
Successful Runs: ${aggregatedStats.successfulRuns}
Failed Runs: ${aggregatedStats.failedRuns}
Success Rate: ${aggregatedStats.successRate.toFixed(2)}%
Average Duration: ${aggregatedStats.avgDuration.toFixed(2)} seconds
Total Hosts: ${aggregatedStats.totalHosts}
Unique Playbooks: ${aggregatedStats.uniquePlaybooks}
Environments: ${aggregatedStats.environments.join(', ')}

Date Range: ${aggregatedStats.dateRange.earliest ? new Date(aggregatedStats.dateRange.earliest).toLocaleDateString() : 'N/A'} - ${aggregatedStats.dateRange.latest ? new Date(aggregatedStats.dateRange.latest).toLocaleDateString() : 'N/A'}
      `.trim();
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
} 