/**
 * SlackIntegration Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SlackIntegration from '../SlackIntegration';
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

describe('SlackIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders slack integration with header', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    expect(screen.getByText('Slack Integration')).toBeInTheDocument();
    expect(screen.getByText('Connect your Slack workspaces to receive notifications and alerts')).toBeInTheDocument();
  });

  it('displays connect workspace button', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    expect(screen.getByText('Connect Workspace')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays connected workspaces', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Connected Workspaces')).toBeInTheDocument();
    expect(screen.getByText('DevOps Team')).toBeInTheDocument();
    expect(screen.getByText('devops-team.slack.com')).toBeInTheDocument();
  });

  it('displays workspace status badges', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows configure and disconnect buttons for connected workspaces', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('displays notification configurations', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Notification Configurations')).toBeInTheDocument();
    expect(screen.getByText('DevOps Team → #alerts')).toBeInTheDocument();
    expect(screen.getByText('DevOps Team → #critical-alerts')).toBeInTheDocument();
  });

  it('shows test and edit buttons for configurations', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    const editButtons = screen.getAllByText('Edit');
    
    expect(testButtons.length).toBeGreaterThan(0);
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('handles connect workspace button click', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Connect Workspace'));

    await waitFor(() => {
      expect(screen.getByText('Connect Slack Workspace')).toBeInTheDocument();
    });
  });

  it('displays connect modal with permissions', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Connect Workspace'));

    await waitFor(() => {
      expect(screen.getByText('Required Permissions')).toBeInTheDocument();
      expect(screen.getByText('• Send messages to channels')).toBeInTheDocument();
      expect(screen.getByText('• Read channel information')).toBeInTheDocument();
      expect(screen.getByText('• View workspace information')).toBeInTheDocument();
    });
  });

  it('handles disconnect workspace', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Disconnect'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Successfully disconnected from Slack workspace', 'success');
    });
  });

  it('handles test notification', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Test notification sent to #alerts', 'success');
    });
  });

  it('handles configure button click', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure'));

    await waitFor(() => {
      expect(screen.getByText('Configure Notifications - DevOps Team')).toBeInTheDocument();
    });
  });

  it('displays configuration modal with form fields', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure'));

    await waitFor(() => {
      expect(screen.getByText('Channel')).toBeInTheDocument();
      expect(screen.getByText('Alert Types')).toBeInTheDocument();
      expect(screen.getByText('Minimum Threshold')).toBeInTheDocument();
      expect(screen.getByText('Custom Message Template')).toBeInTheDocument();
    });
  });

  it('displays channel options in configuration modal', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure'));

    await waitFor(() => {
      expect(screen.getByText('#alerts')).toBeInTheDocument();
      expect(screen.getByText('#devops')).toBeInTheDocument();
      expect(screen.getByText('#critical-alerts (Private)')).toBeInTheDocument();
    });
  });

  it('shows alert type checkboxes', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure'));

    await waitFor(() => {
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  it('displays threshold options', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure'));

    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  it('shows custom message template field', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('OpsSight Alert: {alert_type} - {message}')).toBeInTheDocument();
      expect(screen.getByText('Available variables: {alert_type}, {message}, {timestamp}, {severity}')).toBeInTheDocument();
    });
  });

  it('tracks user interactions', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockTrackUserInteraction).toHaveBeenCalledWith('view_slack_integration');
    });
  });

  it('displays connecting state', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // The button should show "Connect Workspace" initially
    expect(screen.getByText('Connect Workspace')).toBeInTheDocument();
  });

  it('displays configuration details', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Alert Types: error, warning, info')).toBeInTheDocument();
    expect(screen.getByText('Mentions: @channel')).toBeInTheDocument();
    expect(screen.getByText('Custom Message: OpsSight Alert: {alert_type} - {message}')).toBeInTheDocument();
  });

  it('handles empty states correctly', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show workspaces and configurations (not empty states)
    expect(screen.queryByText('No Slack workspaces connected')).not.toBeInTheDocument();
    expect(screen.queryByText('No notification configurations set up')).not.toBeInTheDocument();
  });

  it('displays workspace icons', async () => {
    render(
      <TestWrapper>
        <SlackIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });
});