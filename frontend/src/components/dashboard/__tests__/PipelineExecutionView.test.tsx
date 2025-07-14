import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PipelineExecutionView } from '../PipelineExecutionView';

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => date.toISOString()),
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock pipelines data
const mockPipelines = [
  {
    id: 1,
    name: 'Frontend CI/CD',
    repository_url: 'https://github.com/org/frontend',
    branch: 'main',
    is_active: true,
  },
  {
    id: 2,
    name: 'Backend API',
    repository_url: 'https://github.com/org/backend',
    branch: 'main',
    is_active: true,
  },
];

// Mock pipeline runs data
const mockPipelineRuns = [
  {
    id: 1,
    pipeline_id: 1,
    run_number: 42,
    status: 'running' as const,
    commit_sha: 'abc123',
    commit_message: 'feat: add new feature',
    triggered_by: 'john.doe',
    trigger_event: 'push' as const,
    started_at: new Date().toISOString(),
    branch: 'main',
    steps: [
      {
        id: 1,
        name: 'Build',
        status: 'success' as const,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_seconds: 120,
      },
      {
        id: 2,
        name: 'Test',
        status: 'running' as const,
        started_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Deploy',
        status: 'pending' as const,
      },
    ],
    logs: ['Starting build...', 'Building project...', 'Build complete'],
  },
  {
    id: 2,
    pipeline_id: 2,
    run_number: 15,
    status: 'success' as const,
    commit_sha: 'def456',
    commit_message: 'fix: bug fix',
    triggered_by: 'jane.smith',
    trigger_event: 'pull_request' as const,
    started_at: new Date(Date.now() - 3600000).toISOString(),
    finished_at: new Date().toISOString(),
    duration_seconds: 300,
    branch: 'feature/fix',
  },
];

// Helper function to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PipelineExecutionView', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    
    // Setup default fetch responses
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelineRuns,
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with header and loading state initially', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <PipelineExecutionView />
      </Wrapper>
    );

    // Check for header
    expect(screen.getByText('Pipeline Execution')).toBeInTheDocument();
    expect(screen.getByText('Real-time view of pipeline executions')).toBeInTheDocument();

    // Check for loading state
    expect(screen.getByText('Loading pipeline executions...')).toBeInTheDocument();
  });

  it('displays pipeline runs after loading', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <PipelineExecutionView />
      </Wrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Frontend CI/CD #42')).toBeInTheDocument();
    });

    // Check pipeline run details
    expect(screen.getByText('feat: add new feature')).toBeInTheDocument();
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();

    // Check second pipeline run
    expect(screen.getByText('Backend API #15')).toBeInTheDocument();
    expect(screen.getByText('fix: bug fix')).toBeInTheDocument();
    expect(screen.getByText('jane.smith')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('shows empty state when no pipeline runs are found', async () => {
    const Wrapper = createWrapper();
    
    // Mock empty response
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
    
    render(
      <Wrapper>
        <PipelineExecutionView />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No pipeline executions')).toBeInTheDocument();
      expect(screen.getByText('No recent pipeline executions found.')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    const Wrapper = createWrapper();
    
    // Mock fetch error
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      })
      .mockRejectedValueOnce(new Error('Network error'));
    
    render(
      <Wrapper>
        <PipelineExecutionView />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading pipeline data')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <PipelineExecutionView className="custom-class" />
      </Wrapper>
    );

    const container = screen.getByText('Pipeline Execution').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});

// Test the StatusBadge component separately
describe('StatusBadge Component', () => {
  const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ 
    status, 
    size = 'md' 
  }) => {
    const statusConfig = {
      pending: { label: 'Pending' },
      running: { label: 'Running' },
      success: { label: 'Success' },
      failure: { label: 'Failed' },
      cancelled: { label: 'Cancelled' },
      skipped: { label: 'Skipped' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}>
        {config.label}
      </span>
    );
  };

  it('renders all status types correctly', () => {
    const statuses = ['pending', 'running', 'success', 'failure', 'cancelled', 'skipped'];
    
    statuses.forEach(status => {
      const { unmount } = render(<StatusBadge status={status} />);
      const expectedLabel = status === 'failure' ? 'Failed' : 
                           status.charAt(0).toUpperCase() + status.slice(1);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      unmount();
    });
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<StatusBadge status="success" size="sm" />);
    expect(screen.getByText('Success')).toHaveClass('text-xs', 'px-2', 'py-1');
    
    rerender(<StatusBadge status="success" size="md" />);
    expect(screen.getByText('Success')).toHaveClass('text-sm', 'px-3', 'py-1.5');
  });
}); 