import { useQuery } from '@tanstack/react-query';
import { fetchSystemMetrics } from '../services/dashboardApi';

/**
 * Custom hook to fetch system metrics for the System Pulse panel.
 * @returns {object} { data, isLoading, error, refetch }
 */
export function useSystemMetrics() {
  return useQuery({ queryKey: ['systemMetrics'], queryFn: fetchSystemMetrics });
} 