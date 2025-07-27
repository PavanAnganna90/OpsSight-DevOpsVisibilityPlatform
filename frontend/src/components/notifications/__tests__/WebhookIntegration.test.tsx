/**
 * WebhookIntegration Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import WebhookIntegration from '../WebhookIntegration';
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

// Mock fetch
global.fetch = jest.fn();

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

describe('WebhookIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders webhook integration with header', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    expect(screen.getByText('Webhook Integration')).toBeInTheDocument();
    expect(screen.getByText('Configure webhook endpoints to receive notifications and alerts')).toBeInTheDocument();
  });

  it('displays add webhook button', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    expect(screen.getByText('Add Webhook')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays webhook endpoints', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Webhook Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Production Alerts')).toBeInTheDocument();
    expect(screen.getByText('Development Notifications')).toBeInTheDocument();
  });

  it('displays webhook details', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('https://api.example.com/webhooks/alerts')).toBeInTheDocument();
    expect(screen.getByText('https://dev-api.example.com/notifications')).toBeInTheDocument();
  });

  it('displays webhook status badges', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('displays webhook statistics', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Success: 245')).toBeInTheDocument();
    expect(screen.getByText('Errors: 3')).toBeInTheDocument();
    expect(screen.getByText('Success: 12')).toBeInTheDocument();
    expect(screen.getByText('Errors: 1')).toBeInTheDocument();
  });

  it('shows action buttons for webhooks', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    const enableButtons = screen.getAllByText(/Enable|Disable/);
    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');

    expect(testButtons.length).toBeGreaterThan(0);
    expect(enableButtons.length).toBeGreaterThan(0);
    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('handles webhook testing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({ success: true }),
    });

    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Webhook test completed successfully', 'success');
    });
  });

  it('handles webhook enable/disable', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const disableButton = screen.getByText('Disable');
    fireEvent.click(disableButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Webhook disabled', 'success');
    });
  });

  it('handles webhook deletion', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Webhook deleted successfully', 'success');
    });
  });

  it('opens webhook configuration modal', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.to


BeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Webhook'));

    await waitFor(() => {
      expect(screen.getByText('Add Webhook')).toBeInTheDocument();
    });
  });

  it('displays webhook configuration form', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Webhook'));

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('URL')).toBeInTheDocument();
      expect(screen.getByText('Method')).toBeInTheDocument();
      expect(screen.getByText('Alert Types')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
    });
  });

  it('shows method options in configuration', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Webhook'));

    await waitFor(() => {
      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.getByText('PUT')).toBeInTheDocument();
      expect(screen.getByText('PATCH')).toBeInTheDocument();
    });
  });

  it('displays alert type checkboxes', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Webhook'));

    await waitFor(() => {
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  it('shows authentication options', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Webhook'));

    await waitFor(() => {
      expect(screen.getByText('None')).toBeInTheDocument();
      expect(screen.getByText('Bearer Token')).toBeInTheDocument();
      expect(screen.getByText('Basic Auth')).toBeInTheDocument();
      expect(screen.getByText('API Key')).toBeInTheDocument();
    });
  });

  it('displays test results when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({ success: true }),
    });

    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Test Results')).toBeInTheDocument();
    });
  });

  it('handles webhook test failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Webhook test failed', 'error');
    });
  });

  it('tracks user interactions', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockTrackUserInteraction).toHaveBeenCalledWith('view_webhook_integration');
    });
  });

  it('displays webhook alert types', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Alert Types: error, critical')).toBeInTheDocument();
    expect(screen.getByText('Alert Types: info, warning, error')).toBeInTheDocument();
  });

  it('shows last used timestamps', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Last Used:/)).toBeInTheDocument();
  });

  it('handles edit webhook', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Webhook')).toBeInTheDocument();
    });
  });

  it('handles test button disabled state', async () => {
    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    
    // Button should be enabled initially
    expect(testButtons[0]).not.toBeDisabled();
  });

  it('displays response status in test results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({ success: true }),
    });

    render(
      <TestWrapper>
        <WebhookIntegration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const testButtons = screen.getAllByText('Test');
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('200 OK')).toBeInTheDocument();
    });
  });
});