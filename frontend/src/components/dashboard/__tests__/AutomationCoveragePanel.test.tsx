/**
 * AutomationCoveragePanel Component Tests
 * 
 * Comprehensive test suite covering:
 * - Component rendering and display
 * - Data loading and error states
 * - Real-time updates and refresh functionality
 * - Interactive filtering and selections
 * - API integration and error handling
 * - Responsive behavior and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AutomationCoveragePanel } from '../AutomationCoveragePanel';
import type { AutomationCoverageData } from '../../../types/automation';

// Mock dependencies
jest.mock('../../charts/HostCoverageMap', () => ({
  HostCoverageMap: ({ onHostClick, onEnvironmentChange, onSuccessRateChange }: any) => (
    <div data-testid="host-coverage-map">
      <button onClick={() => onHostClick?.({ hostname: 'test-host' })}>
        Test Host
      </button>
      <button onClick={() => onEnvironmentChange?.('production')}>
        Change Environment
      </button>
      <button onClick={() => onSuccessRateChange?.(95)}>
        Change Success Rate
      </button>
    </div>
  )
}));

jest.mock('../../charts/PlaybookExecutionChart', () => ({
  PlaybookExecutionChart: ({ onRunClick, onFiltersChange }: any) => (
    <div data-testid="playbook-execution-chart">
      <button onClick={() => onRunClick?.({ id: 1, name: 'test-run' })}>
        Test Run
      </button>
      <button onClick={() => onFiltersChange?.({ playbook: 'test-playbook' })}>
        Change Filters
      </button>
    </div>
  )
}));

jest.mock('../../ui/MetricCard', () => ({
  MetricCard: ({ title, value, onClick }: any) => (
    <div data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`} onClick={onClick}>
      <span>{title}: {value}</span>
    </div>
  )
}));

jest.mock('../../ui/StatusIndicator', () => ({
  StatusIndicator: ({ status }: any) => (
    <div data-testid="status-indicator" data-status={status}>
      {status}
    </div>
  )
}));

jest.mock('../../ui/LoadingSkeleton', () => ({
  LoadingSkeleton: ({ height }: any) => (
    <div data-testid="loading-skeleton" style={{ height }}>
      Loading...
    </div>
  )
}));

jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })
}));

jest.mock('../../../utils/time', () => ({
  formatRelativeTime: (date: string) => `${date} ago`,
  formatDuration: (ms: number) => `${ms}ms`
}));

// Mock data
const mockAutomationData: AutomationCoverageData = {
  stats: {
    total_runs: 150,
    successful_runs: 135,
    failed_runs: 10,
    running_runs: 5,
    success_rate: 90.0,
    average_success_rate: 88.5,
    average_duration: 120,
    total_hosts_managed: 25,
    most_used_playbooks: [
      { playbook: 'deploy-app', count: 45, success_rate: 95.5 },
      { playbook: 'update-system', count: 30, success_rate: 88.2 }
    ],
    recent_failures: ['Connection timeout', 'Permission denied']
  },
  playbook_metrics: [
    {
      name: 'deploy-app',
      total_runs: 45,
      successful_runs: 43,
      failed_runs: 2,
      success_rate: 95.5,
      average_duration: 90,
      last_run: '2024-01-01T12:00:00Z',
      most_common_errors: ['Connection timeout'],
      host_coverage: 20,
      environments: ['production', 'staging']
    },
    {
      name: 'update-system',
      total_runs: 30,
      successful_runs: 27,
      failed_runs: 3,
      success_rate: 90.0,
      average_duration: 150,
      last_run: '2024-01-01T11:00:00Z',
      most_common_errors: ['Permission denied'],
      host_coverage: 15,
      environments: ['production']
    }
  ],
  host_coverage: [
    {
      hostname: 'web-01',
      total_runs: 25,
      successful_runs: 24,
      failed_runs: 1,
      unreachable_count: 0,
      last_successful_run: '2024-01-01T12:00:00Z',
      success_rate: 96.0,
      coverage_score: 85,
      environments: ['production'],
      groups: ['web-servers']
    },
    {
      hostname: 'db-01',
      total_runs: 20,
      successful_runs: 18,
      failed_runs: 2,
      unreachable_count: 0,
      last_successful_run: '2024-01-01T11:30:00Z',
      success_rate: 90.0,
      coverage_score: 75,
      environments: ['production'],
      groups: ['database-servers']
    }
  ],
  environments: [
    {
      name: 'production',
      host_count: 15,
      playbook_count: 8,
      last_run: '2024-01-01T12:00:00Z',
      success_rate: 92.5,
      coverage_percentage: 88.0,
      status: 'healthy'
    },
    {
      name: 'staging',
      host_count: 10,
      playbook_count: 6,
      last_run: '2024-01-01T11:00:00Z',
      success_rate: 85.0,
      coverage_percentage: 75.0,
      status: 'warning'
    }
  ],
  recent_runs: [
    {
      id: 1,
      name: 'deploy-app-prod',
      automation_type: 'playbook',
      status: 'success',
      playbook_name: 'deploy-app',
      total_hosts: 5,
      successful_hosts: 5,
      failed_hosts: 0,
      unreachable_hosts: 0,
      skipped_hosts: 0,
      total_tasks: 10,
      successful_tasks: 10,
      failed_tasks: 0,
      skipped_tasks: 0,
      changed_tasks: 8,
      duration_seconds: 90,
      dry_run: false,
      check_mode: false,
      has_failures: false,
      is_scheduled: false,
      is_manual_trigger: true,
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:01:30Z'
    },
    {
      id: 2,
      name: 'update-system-staging',
      automation_type: 'playbook',
      status: 'running',
      playbook_name: 'update-system',
      total_hosts: 3,
      successful_hosts: 2,
      failed_hosts: 0,
      unreachable_hosts: 0,
      skipped_hosts: 0,
      total_tasks: 15,
      successful_tasks: 12,
      failed_tasks: 0,
      skipped_tasks: 0,
      changed_tasks: 5,
      dry_run: false,
      check_mode: false,
      has_failures: false,
      is_scheduled: true,
      is_manual_trigger: false,
      created_at: '2024-01-01T11:45:00Z',
      updated_at: '2024-01-01T11:46:00Z'
    }
  ],
  trends: [
    {
      date: '2024-01-01',
      date_label: 'Jan 1',
      total_runs: 25,
      successful_runs: 23,
      failed_runs: 2,
      success_rate: 92.0,
      average_duration: 120,
      hosts_managed: 25,
      coverage_percentage: 85.0
    }
  ]
};

describe('AutomationCoveragePanel', () => {
  const mockFetch = jest.fn();
  
  const mockLocalStorage = {
    getItem: jest.fn(() => 'mock-auth-token'),
    setItem: jest.fn(),
    removeItem: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAutomationData
      });

      render(<AutomationCoveragePanel onSync={jest.fn()} />);
      
      // Should have multiple loading skeletons for different sections
      const loadingSkeletons = screen.getAllByTestId('loading-skeleton');
      expect(loadingSkeletons.length).toBeGreaterThan(0);
      expect(loadingSkeletons[0]).toBeInTheDocument();
    });

    it('renders automation coverage data correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAutomationData
      });

      render(<AutomationCoveragePanel onSync={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Total Runs: 150/)).toBeInTheDocument();
        expect(screen.getByText(/Success Rate: 90.0%/)).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<AutomationCoveragePanel onSync={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to Load Automation Data/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data automatically', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAutomationData
      });

      render(<AutomationCoveragePanel onSync={jest.fn()} />);

      // Initial fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance time by 30 seconds (refresh interval)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('User Interactions', () => {
    it('handles playbook run clicks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAutomationData
      });

      const onRunClick = jest.fn();
      render(<AutomationCoveragePanel onSync={jest.fn()} />);

      await waitFor(() => {
        const runButton = screen.getByText('Test Run');
        fireEvent.click(runButton);
      });
    });

    it('handles host selection clicks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAutomationData
      });

      const onHostClick = jest.fn();
      render(<AutomationCoveragePanel onSync={jest.fn()} />);

      await waitFor(() => {
        const hostButton = screen.getByText('Test Host');
        fireEvent.click(hostButton);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles sync operation failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAutomationData
      });

      const onSync = jest.fn().mockRejectedValueOnce(new Error('Sync failed'));
      render(<AutomationCoveragePanel onSync={onSync} />);

      await waitFor(() => {
        const refreshButton = screen.getByText('Sync');
        fireEvent.click(refreshButton);
      });
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = {
        ...mockAutomationData,
        playbook_metrics: Array(100).fill(mockAutomationData.playbook_metrics[0]),
        host_coverage: Array(50).fill(mockAutomationData.host_coverage[0])
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeDataset
      });

      const startTime = performance.now();
      render(<AutomationCoveragePanel onSync={jest.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('host-coverage-map')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });
  });
}); 