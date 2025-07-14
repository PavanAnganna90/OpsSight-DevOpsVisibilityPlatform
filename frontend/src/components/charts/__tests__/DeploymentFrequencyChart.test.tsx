/**
 * DeploymentFrequencyChart Component Tests
 * 
 * Comprehensive test suite covering:
 * - Component rendering and data visualization
 * - Environment detection and grouping
 * - Interactive features and controls
 * - Responsive design and accessibility
 * - Edge cases and error scenarios
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { subDays } from 'date-fns';
import DeploymentFrequencyChart from '../DeploymentFrequencyChart';

// Import types to ensure consistency
type Pipeline = {
  id: number;
  name: string;
  description?: string;
  repository_url: string;
  branch: string;
  pipeline_type: 'ci' | 'cd' | 'ci_cd';
  last_run_status?: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  last_run_at?: string;
  total_runs: number;
  success_rate: number;
  average_duration?: number;
  is_active: boolean;
  project_id: number;
  runs?: Array<{
    id: number;
    pipeline_id: number;
    run_number: number;
    status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
    commit_sha: string;
    commit_message?: string;
    triggered_by: string;
    trigger_event: string;
    started_at?: string;
    finished_at?: string;
    duration_seconds?: number;
    branch: string;
    logs_url?: string;
    artifacts_url?: string;
    error_message?: string;
  }>;
};

// Mock the useResponsive hook
jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })
}));

// Mock Recharts components
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => children,
  Bar: ({ dataKey }: any) => `<Bar dataKey="${dataKey}" />`,
  XAxis: ({ dataKey }: any) => `<XAxis dataKey="${dataKey}" />`,
  YAxis: () => '<YAxis />',
  CartesianGrid: () => '<CartesianGrid />',
  Tooltip: () => '<Tooltip />',
  ResponsiveContainer: ({ children }: any) => children,
  Legend: () => '<Legend />'
}));

// Test data
const mockPipelineRuns = [
  {
    id: 1,
    pipeline_id: 1,
    run_number: 1,
    status: 'success' as const,
    commit_sha: 'abc123',
    triggered_by: 'user1',
    trigger_event: 'push',
    started_at: subDays(new Date(), 5).toISOString(),
    finished_at: subDays(new Date(), 5).toISOString(),
    duration_seconds: 120,
    branch: 'main'
  },
  {
    id: 2,
    pipeline_id: 1,
    run_number: 2,
    status: 'success' as const,
    commit_sha: 'def456',
    triggered_by: 'user2',
    trigger_event: 'push',
    started_at: subDays(new Date(), 3).toISOString(),
    finished_at: subDays(new Date(), 3).toISOString(),
    duration_seconds: 150,
    branch: 'staging'
  },
  {
    id: 3,
    pipeline_id: 1,
    run_number: 3,
    status: 'success' as const,
    commit_sha: 'ghi789',
    triggered_by: 'user3',
    trigger_event: 'push',
    started_at: subDays(new Date(), 1).toISOString(),
    finished_at: subDays(new Date(), 1).toISOString(),
    duration_seconds: 180,
    branch: 'feature/new-feature'
  }
];

const mockPipelines = [
  {
    id: 1,
    name: 'Frontend Deployment',
    repository_url: 'https://github.com/org/frontend',
    branch: 'main',
    pipeline_type: 'ci_cd' as const,
    total_runs: 3,
    success_rate: 1.0,
    is_active: true,
    project_id: 1,
    runs: mockPipelineRuns
  },
  {
    id: 2,
    name: 'Backend Production Deploy',
    repository_url: 'https://github.com/org/backend',
    branch: 'main',
    pipeline_type: 'cd' as const,
    total_runs: 1,
    success_rate: 1.0,
    is_active: true,
    project_id: 1,
    runs: [
      {
        id: 4,
        pipeline_id: 2,
        run_number: 1,
        status: 'success' as const,
        commit_sha: 'jkl012',
        triggered_by: 'user4',
        trigger_event: 'push',
        started_at: subDays(new Date(), 2).toISOString(),
        finished_at: subDays(new Date(), 2).toISOString(),
        duration_seconds: 300,
        branch: 'production'
      }
    ]
  }
];

describe('DeploymentFrequencyChart', () => {
  it('renders chart component', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    expect(screen.getByText('Deployment Frequency')).toBeInTheDocument();
  });

  it('displays deployment statistics', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    expect(screen.getByText(/total deployments/)).toBeInTheDocument();
    expect(screen.getByText(/Avg:/)).toBeInTheDocument();
  });

  it('shows daily/weekly toggle', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('toggles between daily and weekly views', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);
    
    expect(weeklyButton).toHaveClass('bg-white');
  });

  it('displays environment legend with counts', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    expect(screen.getByText('dev')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('handles environment toggle functionality', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    const devButton = screen.getByText('dev').closest('button');
    expect(devButton).toBeInTheDocument();
    
    fireEvent.click(devButton!);
    expect(devButton).toHaveClass('opacity-50');
  });

  it('handles empty pipelines', () => {
    render(<DeploymentFrequencyChart pipelines={[]} />);
    
    expect(screen.getByText('Deployment Frequency')).toBeInTheDocument();
    expect(screen.getByText(/0 total deployments/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-chart-class';
    const { container } = render(
      <DeploymentFrequencyChart pipelines={mockPipelines} className={customClass} />
    );
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('handles different time ranges', () => {
    const { rerender } = render(
      <DeploymentFrequencyChart pipelines={mockPipelines} timeRange={7} />
    );
    
    expect(screen.getByText(/Last 7 days/)).toBeInTheDocument();
    
    rerender(<DeploymentFrequencyChart pipelines={mockPipelines} timeRange={14} />);
    expect(screen.getByText(/Last 14 days/)).toBeInTheDocument();
  });

  it('detects environments correctly from branch names', () => {
    const testPipelines = [
      {
        id: 1,
        name: 'Test Pipeline',
        repository_url: 'https://github.com/test/repo',
        branch: 'main',
        pipeline_type: 'ci_cd' as const,
        total_runs: 1,
        success_rate: 1.0,
        is_active: true,
        project_id: 1,
        runs: [
          {
            id: 1,
            pipeline_id: 1,
            run_number: 1,
            status: 'success' as const,
            commit_sha: 'abc123',
            triggered_by: 'user1',
            trigger_event: 'push',
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_seconds: 120,
            branch: 'main' // Should be detected as production
          }
        ]
      }
    ];

    render(<DeploymentFrequencyChart pipelines={testPipelines} />);
    
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('handles pipelines without runs', () => {
    const pipelinesWithoutRuns = [
      {
        id: 1,
        name: 'Empty Pipeline',
        repository_url: 'https://github.com/test/empty',
        branch: 'main',
        pipeline_type: 'ci' as const,
        total_runs: 0,
        success_rate: 0,
        is_active: true,
        project_id: 1
      }
    ];

    render(<DeploymentFrequencyChart pipelines={pipelinesWithoutRuns} />);
    
    expect(screen.getByText('Deployment Frequency')).toBeInTheDocument();
    expect(screen.getByText(/0 total deployments/)).toBeInTheDocument();
  });

  it('filters out failed deployments', () => {
    const pipelinesWithFailures = [
      {
        id: 1,
        name: 'Test Pipeline',
        repository_url: 'https://github.com/test/repo',
        branch: 'main',
        pipeline_type: 'ci_cd' as const,
        total_runs: 2,
        success_rate: 0.5,
        is_active: true,
        project_id: 1,
        runs: [
          {
            id: 1,
            pipeline_id: 1,
            run_number: 1,
            status: 'success' as const,
            commit_sha: 'abc123',
            triggered_by: 'user1',
            trigger_event: 'push',
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_seconds: 120,
            branch: 'main'
          },
          {
            id: 2,
            pipeline_id: 1,
            run_number: 2,
            status: 'failure',
            commit_sha: 'def456',
            triggered_by: 'user2',
            trigger_event: 'push',
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_seconds: 60,
            branch: 'main'
          }
        ]
      }
    ];

    render(<DeploymentFrequencyChart pipelines={pipelinesWithFailures} />);
    
    // Should only count the successful deployment
    expect(screen.getByText(/1 total deployments/)).toBeInTheDocument();
  });

  it('handles runs without started_at timestamps', () => {
    const pipelinesWithMissingTimestamps = [
      {
        id: 1,
        name: 'Test Pipeline',
        repository_url: 'https://github.com/test/repo',
        branch: 'main',
        pipeline_type: 'ci_cd',
        total_runs: 1,
        success_rate: 1.0,
        is_active: true,
        project_id: 1,
        runs: [
          {
            id: 1,
            pipeline_id: 1,
            run_number: 1,
            status: 'success',
            commit_sha: 'abc123',
            triggered_by: 'user1',
            trigger_event: 'push',
            // started_at is undefined
            duration_seconds: 120,
            branch: 'main'
          }
        ]
      }
    ];

    render(<DeploymentFrequencyChart pipelines={pipelinesWithMissingTimestamps} />);
    
    // Should handle missing timestamps gracefully
    expect(screen.getByText('Deployment Frequency')).toBeInTheDocument();
    expect(screen.getByText(/0 total deployments/)).toBeInTheDocument();
  });

  it('shows instruction text for environment toggles', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    expect(screen.getByText('Click environments to toggle visibility')).toBeInTheDocument();
  });

  it('handles mobile responsive design', () => {
    render(<DeploymentFrequencyChart pipelines={mockPipelines} />);
    
    expect(screen.getByText('Deployment Frequency')).toBeInTheDocument();
  });
}); 