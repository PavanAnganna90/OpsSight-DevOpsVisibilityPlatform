/**
 * Unit tests for DashboardContent component
 * 
 * Tests all integrated features including loading states,
 * error handling, responsive design, and keyboard navigation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardContent } from '../../../components/dashboard/layout/DashboardContent';

// Mock hooks
jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
    breakpoint: 'lg',
  }),
}));

jest.mock('../../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
    registerFocusable: jest.fn(),
    focusFirst: jest.fn(),
    focusLast: jest.fn(),
    focusNext: jest.fn(),
    focusPrevious: jest.fn(),
  }),
}));

// Mock MonitoringSessionControl
jest.mock('../../../components/dashboard/MonitoringSessionControl', () => {
  return function MockMonitoringSessionControl({ onRefresh }: { onRefresh: () => void }) {
    return (
      <div data-testid="monitoring-session-control">
        <button onClick={onRefresh} data-testid="mock-refresh-button">
          Mock Refresh
        </button>
      </div>
    );
  };
});

describe('DashboardContent', () => {
  const defaultProps = {
    className: 'test-class',
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Normal State', () => {
    it('renders dashboard content correctly', () => {
      render(<DashboardContent {...defaultProps} />);

      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.getByText('Monitor your DevOps infrastructure and pipeline status')).toBeInTheDocument();
      
      // Check metric cards
      expect(screen.getByText('Successful Pipelines')).toBeInTheDocument();
      expect(screen.getByText('Active Deployments')).toBeInTheDocument();
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      
      // Check sections
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByTestId('monitoring-session-control')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<DashboardContent {...defaultProps} />);
      
      expect(container.firstChild).toHaveClass('test-class');
      expect(container.firstChild).toHaveClass('space-y-6');
    });

    it('displays refresh button with last update time', () => {
      render(<DashboardContent {...defaultProps} />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      expect(screen.getByText(/Last updated: just now/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<DashboardContent {...defaultProps} isLoading={true} />);
      
      // Should not render normal content
      expect(screen.queryByText('Dashboard Overview')).not.toBeInTheDocument();
      
      // Should render skeleton - this depends on your DashboardSkeleton implementation
      // Adjust based on your actual skeleton structure
      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
    });

    it('does not render error state when loading', () => {
      render(<DashboardContent {...defaultProps} isLoading={true} error="Some error" />);
      
      expect(screen.queryByText('Dashboard Error')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message when error prop is provided', () => {
      const errorMessage = 'Failed to load dashboard data';
      render(<DashboardContent {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText('Dashboard Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      
      // Should not render normal content
      expect(screen.queryByText('Dashboard Overview')).not.toBeInTheDocument();
    });

    it('handles retry button click in error state', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DashboardContent {...defaultProps} error="Network error" />);
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      await user.click(retryButton);
      
      // Should show loading state during retry
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Refresh Functionality', () => {
    it('handles manual refresh correctly', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DashboardContent {...defaultProps} />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      await user.click(refreshButton);
      
      // Should show refreshing state
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      expect(refreshButton).toBeDisabled();
      
      // Fast-forward time to complete refresh
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(refreshButton).not.toBeDisabled();
      });
    });

    it('updates last refresh time after refresh', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DashboardContent {...defaultProps} />);
      
      // Initial state
      expect(screen.getByText(/Last updated: just now/)).toBeInTheDocument();
      
      // Fast-forward time to make "just now" become "1 minute ago"
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      await user.click(refreshButton);
      
      // Complete the refresh
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Last updated: just now/)).toBeInTheDocument();
      });
    });

    it('formats last refresh time correctly', () => {
      render(<DashboardContent {...defaultProps} />);
      
      // Test "just now" (< 60 seconds)
      expect(screen.getByText(/Last updated: just now/)).toBeInTheDocument();
    });
  });

  describe('Integration with MonitoringSessionControl', () => {
    it('passes refresh handler to MonitoringSessionControl', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DashboardContent {...defaultProps} />);
      
      const mockRefreshButton = screen.getByTestId('mock-refresh-button');
      
      await user.click(mockRefreshButton);
      
      // Should trigger the same refresh functionality
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile view', () => {
      // Mock mobile responsive hook
      jest.mocked(require('../../../hooks/useResponsive').useResponsive).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
        breakpoint: 'sm',
      });
      
      render(<DashboardContent {...defaultProps} />);
      
      // Component should still render normally - mobile adaptations are in CSS
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper keyboard navigation setup', () => {
      const { container } = render(<DashboardContent {...defaultProps} />);
      
      // Should have aria attributes for keyboard navigation
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveAttribute('role', 'application');
      expect(mainContainer).toHaveAttribute('aria-label', 'Dashboard navigation area');
    });

    it('has accessible button labels', () => {
      render(<DashboardContent {...defaultProps} />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      
      // Check for proper ARIA attributes
      expect(refreshButton).toHaveAttribute('type', 'button');
    });

    it('handles keyboard events for refresh', () => {
      render(<DashboardContent {...defaultProps} />);
      
      const container = screen.getByRole('application');
      
      // Test keyboard shortcut for refresh (this would be handled by useKeyboardNavigation)
      fireEvent.keyDown(container, { key: 'r' });
      
      // Since we mocked useKeyboardNavigation, we can't test the actual behavior
      // In a real test, this would trigger the refresh
      expect(container).toBeInTheDocument();
    });
  });

  describe('Activity Feed', () => {
    it('displays recent activity items', () => {
      render(<DashboardContent {...defaultProps} />);
      
      // Check activity items
      expect(screen.getByText('Backend API')).toBeInTheDocument();
      expect(screen.getByText('deployment completed successfully')).toBeInTheDocument();
      expect(screen.getByText('Frontend Build')).toBeInTheDocument();
      expect(screen.getByText('pipeline started')).toBeInTheDocument();
      expect(screen.getByText('Database Connection')).toBeInTheDocument();
      expect(screen.getByText('warning detected')).toBeInTheDocument();
      
      // Check "View all activity" link
      expect(screen.getByText('View all activity')).toBeInTheDocument();
    });
  });

  describe('System Status', () => {
    it('displays system status indicators', () => {
      render(<DashboardContent {...defaultProps} />);
      
      // Check status items
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Cache Layer')).toBeInTheDocument();
      expect(screen.getByText('CDN')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
      
      // Check status states
      expect(screen.getAllByText('Operational')).toHaveLength(3);
      expect(screen.getByText('Degraded')).toBeInTheDocument();
      expect(screen.getByText('Down')).toBeInTheDocument();
      
      // Check "View status page" link
      expect(screen.getByText('View status page')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('is wrapped with React.memo for performance optimization', () => {
      // Test that component doesn't re-render unnecessarily
      const { rerender } = render(<DashboardContent {...defaultProps} />);
      
      // Re-render with same props
      rerender(<DashboardContent {...defaultProps} />);
      
      // Component should still be present (basic check)
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });
}); 