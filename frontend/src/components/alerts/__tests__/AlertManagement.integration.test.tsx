/**
 * Alert Management Integration Tests
 * 
 * Integration tests for the complete alert management system.
 * Tests the interaction between all alert components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AlertManagementPage from '../../../pages/AlertManagement';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';
import { useToast } from '@/components/ui/Toast';

// Mock dependencies
jest.mock('@/hooks/useMonitoring');
jest.mock('@/components/ui/Toast');

const mockTrackUserInteraction = jest.fn();
const mockTrackPageView = jest.fn();
const mockShowToast = jest.fn();

(usePerformanceMonitoring as jest.Mock).mockReturnValue({
  trackUserInteraction: mockTrackUserInteraction,
  trackPageView: mockTrackPageView,
});

(useToast as jest.Mock).mockReturnValue({
  showToast: mockShowToast,
});

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Alert Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders complete alert management page', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    // Check page title
    expect(document.title).toBe('Alert Management - OpsSight DevOps Platform');

    // Check main dashboard components
    expect(screen.getByText('Alert Management Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monitor system health, manage alerts, and track performance metrics')).toBeInTheDocument();
  });

  it('tracks page view on load', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockTrackPageView).toHaveBeenCalledWith();
    });
  });

  it('integrates all dashboard components', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // System Health Overview
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
      
      // Navigation tabs
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Alert Management')).toBeInTheDocument();
      expect(screen.getByText('Alert Rules')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      
      // Key metrics
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
      expect(screen.getByText('Avg Resolution')).toBeInTheDocument();
    });
  });

  it('handles full alert management workflow', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Navigate to Alert Management tab
      fireEvent.click(screen.getByText('Alert Management'));
    });

    await waitFor(() => {
      // Should show the AlertSummary component
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    // Navigate to Alert Rules tab
    fireEvent.click(screen.getByText('Alert Rules'));

    await waitFor(() => {
      expect(screen.getByText('Alert Rules Management')).toBeInTheDocument();
      expect(screen.getByText('Database Connection Alert')).toBeInTheDocument();
    });

    // Test rule management
    const disableButtons = screen.getAllByText('Disable');
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Rule disabled', 'success');
    });
  });

  it('handles system health monitoring', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check system health components
      expect(screen.getByText('Web Services')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Cache Layer')).toBeInTheDocument();
      expect(screen.getByText('Message Queue')).toBeInTheDocument();
      expect(screen.getByText('File Storage')).toBeInTheDocument();
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });

    // Check SLA performance
    expect(screen.getByText('SLA Performance')).toBeInTheDocument();
    expect(screen.getByText('98.2% (Target: 99.5%)')).toBeInTheDocument();
  });

  it('handles bulk actions workflow', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Open bulk actions modal
      fireEvent.click(screen.getByText('Bulk Actions'));
    });

    await waitFor(() => {
      expect(screen.getByText('Bulk Alert Actions')).toBeInTheDocument();
      expect(screen.getByText('Acknowledge All Active Alerts')).toBeInTheDocument();
      expect(screen.getByText('Resolve All Acknowledged Alerts')).toBeInTheDocument();
      expect(screen.getByText('Silence All Low Priority Alerts')).toBeInTheDocument();
    });

    // Test bulk acknowledge
    fireEvent.click(screen.getByText('Acknowledge All Active Alerts'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Bulk acknowledge action initiated', 'info');
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Bulk acknowledge completed successfully', 'success');
    });
  });

  it('handles time range filtering', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Test time range selector
      const select = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(select, { target: { value: '7d' } });
    });

    expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
  });

  it('handles auto-refresh functionality', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check auto-refresh toggle
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      
      // Disable auto-refresh
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  it('displays real-time metrics updates', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that metrics are displayed
      expect(screen.getByText('47')).toBeInTheDocument(); // Total alerts
      expect(screen.getByText('12')).toBeInTheDocument(); // Active alerts
      expect(screen.getByText('3')).toBeInTheDocument();  // Critical alerts
      expect(screen.getByText('18.5m')).toBeInTheDocument(); // Avg resolution
    });
  });

  it('handles alert severity and status indicators', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check severity indicators
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      
      // Check status indicators
      expect(screen.getByText('healthy')).toBeInTheDocument();
      expect(screen.getByText('warning')).toBeInTheDocument();
    });
  });

  it('handles navigation between different alert views', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Start on Overview tab
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
      expect(screen.getByText('Top Alert Sources')).toBeInTheDocument();
    });

    // Navigate to Alert Management
    fireEvent.click(screen.getByText('Alert Management'));

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    // Navigate to Alert Rules
    fireEvent.click(screen.getByText('Alert Rules'));

    await waitFor(() => {
      expect(screen.getByText('Alert Rules Management')).toBeInTheDocument();
    });

    // Navigate to Analytics
    fireEvent.click(screen.getByText('Analytics'));

    await waitFor(() => {
      expect(screen.getByText('Alert Analytics')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock console.error to prevent error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Component should render without errors
      expect(screen.getByText('Alert Management Dashboard')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('provides comprehensive alert management capabilities', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check all main functionalities are available
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
      expect(screen.getByText('Top Alert Sources')).toBeInTheDocument();
      expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
      expect(screen.getByText('Auto-refresh')).toBeInTheDocument();
      
      // Check time range options
      expect(screen.getByText('Last Hour')).toBeInTheDocument();
      expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    });
  });

  it('tracks user interactions across the system', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockTrackUserInteraction).toHaveBeenCalledWith('view_alert_dashboard');
    });

    // Test rule interaction tracking
    fireEvent.click(screen.getByText('Alert Rules'));

    await waitFor(() => {
      const disableButtons = screen.getAllByText('Disable');
      fireEvent.click(disableButtons[0]);
    });

    await waitFor(() => {
      expect(mockTrackUserInteraction).toHaveBeenCalledWith('toggle_alert_rule', expect.any(Object));
    });
  });

  it('handles responsive design elements', async () => {
    render(
      <TestWrapper>
        <AlertManagementPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that responsive classes are applied
      const container = screen.getByText('Alert Management Dashboard').closest('div');
      expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'py-8');
    });
  });
});