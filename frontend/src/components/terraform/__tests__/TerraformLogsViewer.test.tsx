import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TerraformLogsViewer from '../TerraformLogsViewer';

// Mock fetch
global.fetch = jest.fn();

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '10:30:45'),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('TerraformLogsViewer', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders initial state correctly', () => {
    renderWithQueryClient(<TerraformLogsViewer />);
    
    expect(screen.getByText('Terraform Logs Analysis')).toBeInTheDocument();
    expect(screen.getByText('Upload Log File')).toBeInTheDocument();
    expect(screen.getByText('Paste Log Content')).toBeInTheDocument();
    expect(screen.getByText('Choose a log file')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your Terraform logs here...')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    renderWithQueryClient(<TerraformLogsViewer />);
    
    const file = new File(['test log content'], 'test.log', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/choose a log file/i);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.log')).toBeInTheDocument();
      expect(screen.getByText('Upload & Parse')).toBeInTheDocument();
    });
  });

  it('handles text input', () => {
    renderWithQueryClient(<TerraformLogsViewer />);
    
    const textarea = screen.getByPlaceholderText('Paste your Terraform logs here...');
    fireEvent.change(textarea, { target: { value: 'test log content' } });
    
    expect(textarea).toHaveValue('test log content');
    expect(screen.getByText('Parse Logs')).not.toBeDisabled();
  });

  it('handles format selection', () => {
    renderWithQueryClient(<TerraformLogsViewer />);
    
    const formatSelect = screen.getByDisplayValue('Auto-detect');
    fireEvent.change(formatSelect, { target: { value: 'json' } });
    
    expect(formatSelect).toHaveValue('json');
  });

  it('displays analysis results', async () => {
    const mockAnalysis = {
      summary: {
        operation: 'apply',
        total_changes: 3,
        add_count: 2,
        change_count: 1,
        remove_count: 0,
        duration_seconds: 45.2,
        succeeded: true,
        error_count: 0,
        warning_count: 1
      },
      total_entries: 5,
      entries: [
        {
          timestamp: '2024-01-20T10:30:45Z',
          level: 'info' as const,
          message: 'Apply complete! Resources: 2 added, 1 changed, 0 destroyed.',
          module: 'terraform.ui'
        }
      ]
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnalysis })
    });

    renderWithQueryClient(<TerraformLogsViewer />);
    
    const textarea = screen.getByPlaceholderText('Paste your Terraform logs here...');
    fireEvent.change(textarea, { target: { value: 'test log content' } });
    
    const parseButton = screen.getByText('Parse Logs');
    fireEvent.click(parseButton);
    
    await waitFor(() => {
      expect(screen.getByText('Execution Summary')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // add_count
      expect(screen.getByText('1')).toBeInTheDocument(); // change_count
      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('Changed')).toBeInTheDocument();
    });
  });

  it('handles file upload', async () => {
    const mockAnalysis = {
      summary: {
        operation: 'apply',
        total_changes: 1,
        add_count: 1,
        change_count: 0,
        remove_count: 0,
        succeeded: true,
        error_count: 0,
        warning_count: 0
      },
      total_entries: 1,
      entries: [],
      file_metadata: {
        filename: 'test.log',
        size_bytes: 1024,
        detected_format: 'json'
      }
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnalysis })
    });

    renderWithQueryClient(<TerraformLogsViewer />);
    
    const file = new File(['test log content'], 'test.log', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/choose a log file/i);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.log')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByText('Upload & Parse');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText('File Information')).toBeInTheDocument();
      expect(screen.getByText('test.log')).toBeInTheDocument();
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      expect(screen.getByText('json')).toBeInTheDocument();
    });
  });

  it('displays error messages', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderWithQueryClient(<TerraformLogsViewer />);
    
    const textarea = screen.getByPlaceholderText('Paste your Terraform logs here...');
    fireEvent.change(textarea, { target: { value: 'test log content' } });
    
    const parseButton = screen.getByText('Parse Logs');
    fireEvent.click(parseButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('filters log entries by level', async () => {
    const mockAnalysis = {
      total_entries: 3,
      entries: [
        {
          timestamp: '2024-01-20T10:30:45Z',
          level: 'info' as const,
          message: 'Info message',
          module: 'terraform.ui'
        },
        {
          timestamp: '2024-01-20T10:30:46Z',
          level: 'error' as const,
          message: 'Error message',
          module: 'terraform.ui'
        },
        {
          timestamp: '2024-01-20T10:30:47Z',
          level: 'warn' as const,
          message: 'Warning message',
          module: 'terraform.ui'
        }
      ]
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnalysis })
    });

    renderWithQueryClient(<TerraformLogsViewer />);
    
    const textarea = screen.getByPlaceholderText('Paste your Terraform logs here...');
    fireEvent.change(textarea, { target: { value: 'test logs' } });
    fireEvent.click(screen.getByText('Parse Logs'));
    
    await waitFor(() => {
      expect(screen.getByText('3 of 3 entries')).toBeInTheDocument();
    });
    
    // Filter by error level
    const levelFilter = screen.getByDisplayValue('All Levels');
    fireEvent.change(levelFilter, { target: { value: 'error' } });
    
    await waitFor(() => {
      expect(screen.getByText('1 of 3 entries')).toBeInTheDocument();
    });
  });

  it('expands and collapses log entries', async () => {
    const mockAnalysis = {
      total_entries: 1,
      entries: [
        {
          timestamp: '2024-01-20T10:30:45Z',
          level: 'info' as const,
          message: 'Test message with details',
          module: 'terraform.ui',
          change: {
            resource: {
              address: 'aws_instance.web',
              resource_type: 'aws_instance',
              resource_name: 'web',
              module: 'root'
            },
            action: 'create' as const,
            before: null,
            after: { instance_type: 't2.micro' }
          }
        }
      ]
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnalysis })
    });

    renderWithQueryClient(<TerraformLogsViewer />);
    
    const textarea = screen.getByPlaceholderText('Paste your Terraform logs here...');
    fireEvent.change(textarea, { target: { value: 'test logs' } });
    fireEvent.click(screen.getByText('Parse Logs'));
    
    await waitFor(() => {
      expect(screen.getByText('create aws_instance.web')).toBeInTheDocument();
    });
    
    // Click to expand
    const logEntry = screen.getByText('create aws_instance.web');
    fireEvent.click(logEntry);
    
    await waitFor(() => {
      expect(screen.getByText('Test message with details')).toBeInTheDocument();
      expect(screen.getByText('aws_instance')).toBeInTheDocument();
    });
  });

  it('toggles raw logs view', async () => {
    const mockAnalysis = {
      total_entries: 1,
      entries: [
        {
          timestamp: '2024-01-20T10:30:45Z',
          level: 'info' as const,
          message: 'Test message',
          module: 'terraform.ui'
        }
      ]
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnalysis })
    });

    renderWithQueryClient(<TerraformLogsViewer />);
    
    const textarea = screen.getByPlaceholderText('Paste your Terraform logs here...');
    fireEvent.change(textarea, { target: { value: 'test logs' } });
    fireEvent.click(screen.getByText('Parse Logs'));
    
    await waitFor(() => {
      expect(screen.getByText('Show Raw')).toBeInTheDocument();
    });
    
    const toggleButton = screen.getByText('Show Raw');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Hide Raw')).toBeInTheDocument();
  });
}); 