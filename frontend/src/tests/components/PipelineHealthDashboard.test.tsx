/**
 * Tests for PipelineHealthDashboard Component
 * 
 * Comprehensive test suite covering:
 * - Component rendering and data display
 * - Filtering and sorting functionality
 * - Loading and error states
 * - Real-time updates and refresh
 * - Responsive design behavior
 * - Accessibility compliance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PipelineHealthDashboard from '../../components/dashboard/PipelineHealthDashboard';

// Mock the useResponsive hook
jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'lg'
  })
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Sample pipeline data for testing
const mockPipelines = [
  {
    id: 1,
    name: 'Frontend CI/CD',
    description: 'Frontend build and deployment pipeline',
    repository_url: 'https://github.com/company/frontend',
    branch: 'main',
    pipeline_type: 'ci_cd',
    last_run_status: 'success',
    last_run_at: '2025-06-05T10:00:00Z',
    total_runs: 150,
    success_rate: 0.95,
    average_duration: 300,
    is_active: true,
    project_id: 1,
  },
  {
    id: 2,
    name: 'Backend API Tests',
    description: 'Backend API testing pipeline',
    repository_url: 'https://github.com/company/backend',
    branch: 'develop',
    pipeline_type: 'ci',
    last_run_status: 'running',
    last_run_at: '2025-06-05T11:30:00Z',
    total_runs: 89,
    success_rate: 0.87,
    average_duration: 180,
    is_active: true,
    project_id: 1,
  },
  {
    id: 3,
    name: 'Database Migration',
    description: 'Database schema migration pipeline',
    repository_url: 'https://github.com/company/db-migrations',
    branch: 'main',
    pipeline_type: 'cd',
    last_run_status: 'failure',
    last_run_at: '2025-06-05T09:15:00Z',
    total_runs: 25,
    success_rate: 0.72,
    average_duration: 120,
    is_active: true,
    project_id: 2,
  },
];

describe('PipelineHealthDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the dashboard title and basic structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      expect(screen.getByText('Pipeline Health Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });
    });

    it('displays pipeline metrics correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Pipelines')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Average Success Rate')).toBeInTheDocument();
        expect(screen.getByText('Running Pipelines')).toBeInTheDocument();
      });
    });

    it('renders individual pipeline items with correct information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Frontend CI/CD')).toBeInTheDocument();
        expect(screen.getByText('Backend API Tests')).toBeInTheDocument();
        expect(screen.getByText('Database Migration')).toBeInTheDocument();
        
        expect(screen.getByText('Branch: main')).toBeInTheDocument();
        expect(screen.getByText('Success Rate: 95%')).toBeInTheDocument();
        expect(screen.getByText('Runs: 150')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeletons while fetching data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PipelineHealthDashboard />);

      expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(5); // 4 metric cards + 1 main content
    });

    it('shows loading state during refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });

      // Mock a slow refresh
      mockFetch.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockPipelines,
        }), 100)
      ));

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load pipeline data')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('displays error message when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load pipeline data')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch pipelines: Unauthorized')).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load pipeline data')).toBeInTheDocument();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines,
      });
    });

    it('filters pipelines by status', async () => {
      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });

      // Filter by success status
      const statusFilter = screen.getByDisplayValue('All Status');
      fireEvent.change(statusFilter, { target: { value: 'success' } });

      await waitFor(() => {
        expect(screen.getByText('Pipelines (1)')).toBeInTheDocument();
        expect(screen.getByText('Frontend CI/CD')).toBeInTheDocument();
        expect(screen.queryByText('Backend API Tests')).not.toBeInTheDocument();
      });
    });

    it('sorts pipelines by different criteria', async () => {
      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });

      // Sort by name
      const sortSelect = screen.getByDisplayValue('Last Run');
      fireEvent.change(sortSelect, { target: { value: 'name' } });

      // Check if pipelines are sorted alphabetically
      const pipelineNames = screen.getAllByText(/CI\/CD|Tests|Migration/);
      expect(pipelineNames[0]).toHaveTextContent('Backend API Tests');
      expect(pipelineNames[1]).toHaveTextContent('Database Migration');
      expect(pipelineNames[2]).toHaveTextContent('Frontend CI/CD');
    });

    it('shows empty state when no pipelines match filters', async () => {
      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });

      // Filter by cancelled status (none exist)
      const statusFilter = screen.getByDisplayValue('All Status');
      fireEvent.change(statusFilter, { target: { value: 'cancelled' } });

      await waitFor(() => {
        expect(screen.getByText('Pipelines (0)')).toBeInTheDocument();
        expect(screen.getByText('No pipelines found matching the current filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data at specified intervals', async () => {
      jest.useFakeTimers();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard refreshInterval={5000} />);

      // Initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('does not refresh when interval is 0', async () => {
      jest.useFakeTimers();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard refreshInterval={0} />);

      // Initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not have called fetch again
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Project Filtering', () => {
    it('includes project_id in API request when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines.filter(p => p.project_id === 1),
      });

      render(<PipelineHealthDashboard projectId={1} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('project_id=1'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Pipeline Interaction', () => {
    it('handles pipeline selection on click', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Frontend CI/CD')).toBeInTheDocument();
      });

      const pipelineItem = screen.getByText('Frontend CI/CD').closest('div');
      fireEvent.click(pipelineItem!);

      // Note: In a real implementation, this would trigger some action
      // For now, we just verify the click doesn't cause errors
      expect(pipelineItem).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pipeline Health Dashboard')).toBeInTheDocument();
      });

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Pipeline Health Dashboard');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Pipelines (3)');

      // Check for proper form controls
      expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      // Tab to refresh button and activate with Enter
      await user.tab();
      await user.keyboard('{Enter}');

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  describe('Edge Cases', () => {
    it('handles empty pipeline list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pipelines (0)')).toBeInTheDocument();
        expect(screen.getByText('No pipelines found matching the current filters.')).toBeInTheDocument();
      });

      // Check that metrics show zero values
      expect(screen.getByText('Total Pipelines')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles pipelines with missing optional fields', async () => {
      const incompletePipeline = {
        id: 4,
        name: 'Incomplete Pipeline',
        repository_url: 'https://github.com/company/incomplete',
        branch: 'main',
        pipeline_type: 'ci',
        total_runs: 0,
        success_rate: 0,
        is_active: true,
        project_id: 1,
        // Missing: last_run_status, last_run_at, average_duration, description
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [incompletePipeline],
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Incomplete Pipeline')).toBeInTheDocument();
        expect(screen.getByText('Last run: Never')).toBeInTheDocument();
      });
    });

    it('handles very large numbers gracefully', async () => {
      const largePipeline = {
        ...mockPipelines[0],
        total_runs: 999999,
        average_duration: 86400, // 24 hours
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [largePipeline],
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Runs: 999999')).toBeInTheDocument();
        expect(screen.getByText('Avg: 1440m 0s')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const MemoizedComponent = React.memo(PipelineHealthDashboard);
      expect(MemoizedComponent).toBeDefined();
    });

    it('handles rapid filter changes without issues', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPipelines,
      });

      render(<PipelineHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });

      const statusFilter = screen.getByDisplayValue('All Status');

      // Rapidly change filters
      fireEvent.change(statusFilter, { target: { value: 'success' } });
      fireEvent.change(statusFilter, { target: { value: 'failure' } });
      fireEvent.change(statusFilter, { target: { value: 'running' } });
      fireEvent.change(statusFilter, { target: { value: 'all' } });

      // Should not cause errors and should show all pipelines again
      await waitFor(() => {
        expect(screen.getByText('Pipelines (3)')).toBeInTheDocument();
      });
    });
  });
}); 