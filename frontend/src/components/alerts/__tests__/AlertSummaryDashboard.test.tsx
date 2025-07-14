/**
 * Alert Summary Dashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AlertSummaryDashboard from '../AlertSummaryDashboard';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';
import { useToast } from '@/components/ui/Toast';

// Mock dependencies
jest.mock('@/hooks/useMonitoring');
jest.mock('@/components/ui/Toast');

const mockTrackUserInteraction = jest.fn();
const mockShowToast = jest.fn();

(usePerformanceMonitoring as jest.Mock).mockReturnValue({
  trackUserInteraction: mockTrackUserInteraction,
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

describe('AlertSummaryDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with header', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Alert Management Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monitor system health, manage alerts, and track performance metrics')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows time range selector', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 24 Hours')).toBeInTheDocument();
    });

    expect(screen.getByText('Last Hour')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
  });

  it('displays auto-refresh toggle', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Auto-refresh')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('shows bulk actions button', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
    });
  });

  it('displays system health overview', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
    });

    expect(screen.getByText('Web Services')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Cache Layer')).toBeInTheDocument();
    expect(screen.getByText('Message Queue')).toBeInTheDocument();
    expect(screen.getByText('File Storage')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
  });

  it('shows SLA performance indicator', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('SLA Performance')).toBeInTheDocument();
    });

    expect(screen.getByText('98.2% (Target: 99.5%)')).toBeInTheDocument();
  });

  it('displays navigation tabs', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Alert Management')).toBeInTheDocument();
      expect(screen.getByText('Alert Rules')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
  });

  it('shows key metrics cards', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
      expect(screen.getByText('Avg Resolution')).toBeInTheDocument();
    });

    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('18.5m')).toBeInTheDocument();
  });

  it('displays recent alerts section', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    });

    expect(screen.getByText('Database Connection Pool Exhausted')).toBeInTheDocument();
    expect(screen.getByText('High CPU Usage on Node 3')).toBeInTheDocument();
    expect(screen.getByText('SSL Certificate Expiring Soon')).toBeInTheDocument();
  });

  it('shows top alert sources', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Top Alert Sources')).toBeInTheDocument();
    });

    expect(screen.getByText('kubernetes')).toBeInTheDocument();
    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('application')).toBeInTheDocument();
    expect(screen.getByText('network')).toBeInTheDocument();
    expect(screen.getByText('storage')).toBeInTheDocument();
  });

  it('handles tab switching', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Alert Rules')).toBeInTheDocument();
    });

    // Click Alert Rules tab
    fireEvent.click(screen.getByText('Alert Rules'));

    await waitFor(() => {
      expect(screen.getByText('Alert Rules Management')).toBeInTheDocument();
    });
  });

  it('displays alert rules in rules tab', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Alert Rules'));
    });

    await waitFor(() => {
      expect(screen.getByText('Database Connection Alert')).toBeInTheDocument();
      expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('SSL Certificate Expiry')).toBeInTheDocument();
    });
  });

  it('handles rule toggle', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Alert Rules'));
    });

    await waitFor(() => {
      const disableButtons = screen.getAllByText('Disable');
      fireEvent.click(disableButtons[0]);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Rule disabled', 'success');
    });
  });

  it('opens bulk actions modal', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Bulk Actions'));
    });

    await waitFor(() => {
      expect(screen.getByText('Bulk Alert Actions')).toBeInTheDocument();
    });

    expect(screen.getByText('Acknowledge All Active Alerts')).toBeInTheDocument();
    expect(screen.getByText('Resolve All Acknowledged Alerts')).toBeInTheDocument();
    expect(screen.getByText('Silence All Low Priority Alerts')).toBeInTheDocument();
  });

  it('handles bulk acknowledge action', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Bulk Actions'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Acknowledge All Active Alerts'));
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Bulk acknowledge action initiated', 'info');
    });
  });

  it('handles time range change', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const select = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(select, { target: { value: '7d' } });
    });

    expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
  });

  it('handles auto-refresh toggle', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
    });

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('tracks user interactions', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockTrackUserInteraction).toHaveBeenCalledWith('view_alert_dashboard');
    });
  });

  it('displays severity badges correctly', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });
  });

  it('shows status badges for system components', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('healthy')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('warning')).toBeInTheDocument();
    });
  });

  it('handles analytics tab', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Analytics'));
    });

    await waitFor(() => {
      expect(screen.getByText('Alert Analytics')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  it('displays rule conditions and trigger counts', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Alert Rules'));
    });

    await waitFor(() => {
      expect(screen.getByText('db_connections > 95%')).toBeInTheDocument();
      expect(screen.getByText('cpu_usage > 80% for 5m')).toBeInTheDocument();
      expect(screen.getByText('ssl_expiry < 30 days')).toBeInTheDocument();
      expect(screen.getByText('Triggered: 8 times')).toBeInTheDocument();
      expect(screen.getByText('Triggered: 23 times')).toBeInTheDocument();
    });
  });

  it('shows enabled/disabled status for rules', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Alert Rules'));
    });

    await waitFor(() => {
      const enabledBadges = screen.getAllByText('Enabled');
      expect(enabledBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays alert counts by source', async () => {
    render(
      <TestWrapper>
        <AlertSummaryDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('15 alerts')).toBeInTheDocument();
      expect(screen.getByText('12 alerts')).toBeInTheDocument();
      expect(screen.getByText('8 alerts')).toBeInTheDocument();
    });
  });
});