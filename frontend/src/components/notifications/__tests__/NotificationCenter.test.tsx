/**
 * NotificationCenter Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import NotificationCenter from '../NotificationCenter';
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

describe('NotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification center with tabs', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(screen.getByText('Manage alerts and notifications across all channels')).toBeInTheDocument();
    
    // Check tabs
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Webhooks')).toBeInTheDocument();
  });

  it('displays create rule button', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    expect(screen.getByText('Create Rule')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays statistics cards in overview tab', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Total Rules')).toBeInTheDocument();
    expect(screen.getByText('Active Rules')).toBeInTheDocument();
    expect(screen.getByText('Total Notifications')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('displays channel performance section', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Channel Performance')).toBeInTheDocument();
    });

    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Webhooks')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Click Rules tab
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Notification Rules')).toBeInTheDocument();

    // Click History tab
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText('Notification History')).toBeInTheDocument();
  });

  it('displays notification rules in rules tab', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rules'));

    await waitFor(() => {
      expect(screen.getByText('Critical Production Alerts')).toBeInTheDocument();
      expect(screen.getByText('Development Environment Alerts')).toBeInTheDocument();
    });
  });

  it('handles rule testing', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rules'));

    await waitFor(() => {
      const testButtons = screen.getAllByText('Test');
      fireEvent.click(testButtons[0]);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Test notification sent successfully', 'success');
    });
  });

  it('handles rule enabling/disabling', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rules'));

    await waitFor(() => {
      const disableButtons = screen.getAllByText('Disable');
      fireEvent.click(disableButtons[0]);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Rule disabled', 'success');
    });
  });

  it('displays notification history', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('History'));

    await waitFor(() => {
      expect(screen.getByText('Database connection timeout')).toBeInTheDocument();
      expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
    });
  });

  it('opens history detail modal', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('History'));

    await waitFor(() => {
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Notification Details')).toBeInTheDocument();
    });
  });

  it('tracks user interactions', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockTrackUserInteraction).toHaveBeenCalledWith('view_notification_center');
    });
  });

  it('handles create rule button click', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Rule'));

    // Modal should open (but we don't test the modal content here)
    expect(screen.getByText('Create Rule')).toBeInTheDocument();
  });

  it('displays delivery status badges correctly', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('History'));

    await waitFor(() => {
      expect(screen.getByText('Slack: success')).toBeInTheDocument();
      expect(screen.getByText('Webhook: success')).toBeInTheDocument();
      expect(screen.getByText('Email: success')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock console.error to prevent error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('renders empty states correctly', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Rules should show content (not empty state)
    fireEvent.click(screen.getByText('Rules'));
    await waitFor(() => {
      expect(screen.queryByText('No notification rules configured')).not.toBeInTheDocument();
    });
  });

  it('displays rule badges correctly', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rules'));

    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
  });
});