/**
 * Test suite for AnsibleCoverageViewer component
 * 
 * Tests file upload, log parsing, analysis display, and interactive features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnsibleCoverageViewer } from '../AnsibleCoverageViewer';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock recharts components to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />
}));

// Sample Ansible analysis data for testing
const mockAnalysisData = {
  execution_summary: {
    total_tasks: 45,
    total_hosts: 3,
    total_plays: 2,
    success_rate: 95.6,
    failure_rate: 2.2,
    change_rate: 33.3,
    execution_time_seconds: 127,
    status_breakdown: {
      ok: 35,
      changed: 8,
      failed: 1,
      skipped: 1
    }
  },
  automation_coverage: {
    overall_score: 78.5,
    total_unique_modules: 12,
    total_module_executions: 45,
    module_categories: {
      core: [
        { module: 'setup', usage_count: 3, percentage: 6.7 },
        { module: 'copy', usage_count: 5, percentage: 11.1 }
      ],
      package: [
        { module: 'yum', usage_count: 8, percentage: 17.8 },
        { module: 'pip', usage_count: 3, percentage: 6.7 }
      ],
      service: [
        { module: 'systemd', usage_count: 4, percentage: 8.9 }
      ]
    },
    top_modules: [
      { module: 'yum', count: 8, percentage: 17.8 },
      { module: 'copy', count: 5, percentage: 11.1 },
      { module: 'systemd', count: 4, percentage: 8.9 },
      { module: 'setup', count: 3, percentage: 6.7 },
      { module: 'pip', count: 3, percentage: 6.7 }
    ],
    automation_breadth: 3,
    automation_depth: 3.75
  },
  module_analysis: {
    usage_distribution: {
      yum: 8,
      copy: 5,
      systemd: 4,
      setup: 3,
      pip: 3
    },
    failure_rates: {
      yum: 0,
      copy: 0,
      systemd: 25,
      setup: 0,
      pip: 0
    },
    efficiency_scores: {
      yum: 100,
      copy: 100,
      systemd: 75,
      setup: 100,
      pip: 100
    },
    recommendations: [
      {
        type: 'high_failure_rate',
        module: 'systemd',
        message: "Module 'systemd' has a 25.0% failure rate. Consider reviewing task implementation."
      }
    ]
  },
  host_reliability: {
    host_count: 3,
    host_performance: {
      'web-01': {
        reliability_score: 100,
        total_tasks: 15,
        successful_tasks: 15,
        failed_tasks: 0,
        unreachable_count: 0
      },
      'web-02': {
        reliability_score: 93.3,
        total_tasks: 15,
        successful_tasks: 14,
        failed_tasks: 1,
        unreachable_count: 0
      },
      'db-01': {
        reliability_score: 100,
        total_tasks: 15,
        successful_tasks: 15,
        failed_tasks: 0,
        unreachable_count: 0
      }
    },
    overall_reliability: 97.8,
    problematic_hosts: [
      {
        host: 'web-02',
        issues: ['1 failed tasks']
      }
    ]
  },
  performance_metrics: {
    execution_time: 127,
    task_efficiency: 0.35,
    parallel_efficiency: 85.2,
    resource_utilization: {}
  },
  recommendations: [
    {
      category: 'reliability',
      priority: 'medium' as const,
      title: 'Minor reliability issue detected',
      description: 'Task failure rate is 2.2%. Review failing tasks for improvements.',
      action: 'Implement better error handling and idempotency checks.'
    },
    {
      category: 'performance',
      priority: 'low' as const,
      title: 'Good performance metrics',
      description: 'Execution completed in reasonable time with good efficiency.',
      action: 'Continue monitoring performance trends.'
    }
  ],
  trends: {
    current_metrics: {
      success_rate: 95.6,
      execution_time: 127,
      module_count: 12
    },
    trend_indicators: {
      improving: ['success_rate'],
      declining: [],
      stable: ['execution_time', 'module_count']
    }
  },
  metadata: {
    analysis_timestamp: '2024-01-15T10:30:00Z',
    log_format: 'standard',
    total_lines_processed: 245
  }
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AnsibleCoverageViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders the main heading', () => {
    render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Ansible Automation Coverage')).toBeInTheDocument();
    expect(screen.getByText(/Analyze playbook executions and track automation coverage/)).toBeInTheDocument();
  });

  it('renders upload section with file and paste options', () => {
    render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Upload Ansible Logs')).toBeInTheDocument();
    expect(screen.getByText('Upload File')).toBeInTheDocument();
    expect(screen.getByText('Paste Content')).toBeInTheDocument();
  });

  it('shows analyze button as disabled initially', () => {
    render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
    
    const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
    expect(analyzeBtn).toBeDisabled();
  });

  it('renders log format selector', () => {
    render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Log Format')).toBeInTheDocument();
    expect(screen.getByText('Auto-detect')).toBeInTheDocument();
  });

  describe('Upload Method Toggle', () => {
    it('switches between file upload and paste content methods', async () => {
      const user = userEvent.setup();
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      const pasteContentBtn = screen.getByRole('button', { name: /paste content/i });
      await user.click(pasteContentBtn);
      
      expect(screen.getByLabelText('Log Content')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste your Ansible playbook execution logs/)).toBeInTheDocument();
      
      const uploadFileBtn = screen.getByRole('button', { name: /upload file/i });
      await user.click(uploadFileBtn);
      
      expect(screen.getByText(/Drag and drop your Ansible log file here/)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('handles file selection', async () => {
      const user = userEvent.setup();
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      const file = new File(['ansible log content'], 'playbook.log', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/drag and drop/i, { selector: 'input[type="file"]' });
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('playbook.log')).toBeInTheDocument();
      expect(screen.getByText('0.00 MB')).toBeInTheDocument();
    });

    it('handles drag and drop', () => {
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      const dropZone = screen.getByText(/Drag and drop your Ansible log file here/).closest('div');
      const file = new File(['ansible log content'], 'playbook.log', { type: 'text/plain' });
      
      fireEvent.dragEnter(dropZone!, {
        dataTransfer: { files: [file] }
      });
      
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] }
      });
      
      expect(screen.getByText('playbook.log')).toBeInTheDocument();
    });

    it('disables analyze button when no file is selected', () => {
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      expect(analyzeBtn).toBeDisabled();
    });
  });

  describe('Log Format Selection', () => {
    it('allows changing log format', async () => {
      const user = userEvent.setup();
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      const formatSelect = screen.getByRole('combobox');
      await user.click(formatSelect);
      
      expect(screen.getByText('JSON (with callbacks)')).toBeInTheDocument();
      expect(screen.getByText('Standard Output')).toBeInTheDocument();
      expect(screen.getByText('AWX/Tower Format')).toBeInTheDocument();
      
      await user.click(screen.getByText('JSON (with callbacks)'));
      expect(screen.getByDisplayValue('json')).toBeInTheDocument();
    });
  });

  describe('Paste Content Mode', () => {
    it('enables analyze button when content is provided', async () => {
      const user = userEvent.setup();
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      await user.click(screen.getByRole('button', { name: /paste content/i }));
      
      const textarea = screen.getByLabelText('Log Content');
      await user.type(textarea, 'PLAY [Test Playbook] ****\nTASK [setup] ****\nok: [localhost]');
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      expect(analyzeBtn).not.toBeDisabled();
    });
  });

  describe('API Integration', () => {
    it('calls parse-logs API for paste content', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAnalysisData })
      });
      
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      await user.click(screen.getByRole('button', { name: /paste content/i }));
      
      const textarea = screen.getByLabelText('Log Content');
      await user.type(textarea, 'PLAY [Test Playbook] ****');
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      await user.click(analyzeBtn);
      
      expect(fetch).toHaveBeenCalledWith('/api/v1/ansible/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_content: 'PLAY [Test Playbook] ****',
          log_format: 'auto'
        })
      });
    });

    it('calls upload-logs API for file upload', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAnalysisData })
      });
      
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      const file = new File(['ansible log content'], 'playbook.log', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/drag and drop/i, { selector: 'input[type="file"]' });
      
      await user.upload(fileInput, file);
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      await user.click(analyzeBtn);
      
      expect(fetch).toHaveBeenCalledWith('/api/v1/ansible/parse-log-file', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Invalid log format' })
      });
      
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      await user.click(screen.getByRole('button', { name: /paste content/i }));
      
      const textarea = screen.getByLabelText('Log Content');
      await user.type(textarea, 'invalid content');
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      await user.click(analyzeBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid log format')).toBeInTheDocument();
      });
    });
  });

  describe('Analysis Results Display', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAnalysisData })
      });
      
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      await user.click(screen.getByRole('button', { name: /paste content/i }));
      const textarea = screen.getByLabelText('Log Content');
      await user.type(textarea, 'test content');
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      await user.click(analyzeBtn);
      
      await waitFor(() => {
        expect(screen.getByText('95.6%')).toBeInTheDocument();
      });
    });

    it('displays overview tab with summary metrics', () => {
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('95.6%')).toBeInTheDocument();
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Hosts')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows task status distribution chart', () => {
      expect(screen.getByText('Task Status Distribution')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('displays coverage score', () => {
      expect(screen.getByText('Coverage Score')).toBeInTheDocument();
      expect(screen.getByText('78.5%')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // Unique Modules
    });

    it('navigates between tabs', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByRole('tab', { name: 'Coverage' }));
      expect(screen.getByText('Module Categories')).toBeInTheDocument();
      
      await user.click(screen.getByRole('tab', { name: 'Modules' }));
      expect(screen.getByText('Module Efficiency Analysis')).toBeInTheDocument();
      
      await user.click(screen.getByRole('tab', { name: 'Hosts' }));
      expect(screen.getByText('Host Reliability')).toBeInTheDocument();
      
      await user.click(screen.getByRole('tab', { name: 'Performance' }));
      expect(screen.getByText('Task Efficiency')).toBeInTheDocument();
      
      await user.click(screen.getByRole('tab', { name: 'Insights' }));
      expect(screen.getByText('Automation Insights & Recommendations')).toBeInTheDocument();
    });

    it('displays recommendations with proper priority styling', () => {
      const user = userEvent.setup();
      
      // Navigate to recommendations tab
      fireEvent.click(screen.getByRole('tab', { name: 'Insights' }));
      
      expect(screen.getByText('Minor reliability issue detected')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('Good performance metrics')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });

    it('shows problematic hosts when present', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByRole('tab', { name: 'Hosts' }));
      
      expect(screen.getByText('Problematic Hosts')).toBeInTheDocument();
      expect(screen.getByText('web-02:')).toBeInTheDocument();
      expect(screen.getByText('1 failed tasks')).toBeInTheDocument();
    });

    it('displays module recommendations when present', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByRole('tab', { name: 'Modules' }));
      
      expect(screen.getByText('Module Recommendations')).toBeInTheDocument();
      expect(screen.getByText(/Module 'systemd' has a 25.0% failure rate/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during analysis', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      
      (fetch as jest.Mock).mockReturnValueOnce(promise);
      
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      await user.click(screen.getByRole('button', { name: /paste content/i }));
      const textarea = screen.getByLabelText('Log Content');
      await user.type(textarea, 'test content');
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      await user.click(analyzeBtn);
      
      expect(screen.getByText('Analyzing Logs...')).toBeInTheDocument();
      expect(analyzeBtn).toBeDisabled();
      
      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ data: mockAnalysisData })
      });
      
      await waitFor(() => {
        expect(screen.getByText('Analyze Automation Coverage')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows message when no recommendations exist', async () => {
      const user = userEvent.setup();
      const dataWithoutRecommendations = {
        ...mockAnalysisData,
        recommendations: []
      };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: dataWithoutRecommendations })
      });
      
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      await user.click(screen.getByRole('button', { name: /paste content/i }));
      const textarea = screen.getByLabelText('Log Content');
      await user.type(textarea, 'test content');
      
      const analyzeBtn = screen.getByRole('button', { name: /analyze automation coverage/i });
      await user.click(analyzeBtn);
      
      await waitFor(() => {
        expect(screen.getByText('95.6%')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('tab', { name: 'Insights' }));
      
      expect(screen.getByText('Excellent automation coverage!')).toBeInTheDocument();
      expect(screen.getByText('No specific recommendations at this time.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      const user = userEvent.setup();
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      
      // Switch to paste mode to make the textbox available
      await user.click(screen.getByRole('button', { name: /paste content/i }));
      expect(screen.getByRole('textbox', { name: /log content/i })).toBeInTheDocument();
      
      expect(screen.getByRole('button', { name: /analyze automation coverage/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AnsibleCoverageViewer />, { wrapper: createWrapper() });
      
      await user.tab();
      expect(screen.getByRole('button', { name: /upload file/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /paste content/i })).toHaveFocus();
    });
  });
}); 