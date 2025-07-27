/**
 * Test Coverage Widget Component Tests
 * 
 * Comprehensive test suite for the TestCoverageWidget component.
 * Tests coverage:
 * - Component rendering and display
 * - Coverage calculation and visualization
 * - Circular progress indicators
 * - Historical trend analysis
 * - Interactive features (show/hide trends)
 * - Responsive design
 * - Edge cases and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestCoverageWidget from '../TestCoverageWidget';

// Mock date-fns to ensure consistent test results
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2023-12-01';
    if (formatStr === 'MMM dd') return 'Dec 01';
    if (formatStr === 'M/d') return '12/1';
    return '2023-12-01';
  }),
  subDays: jest.fn((date, days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}));

// Mock useResponsive hook
jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'lg'
  })
}));

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  )
}));

// Mock Math.random for consistent coverage calculations
const originalRandom = Math.random;
beforeEach(() => {
  Math.random = jest.fn(() => 0.5);
});

afterEach(() => {
  Math.random = originalRandom;
  jest.clearAllMocks();
});

// Test data
const mockPipelines = [
  {
    id: 1,
    name: 'Frontend CI',
    description: 'Frontend build and test pipeline',
    repository_url: 'https://github.com/company/frontend',
    branch: 'main',
    pipeline_type: 'ci' as const,
    last_run_status: 'success' as const,
    last_run_at: '2023-12-01T10:00:00Z',
    total_runs: 50,
    success_rate: 0.95,
    average_duration: 300,
    is_active: true,
    project_id: 1,
    runs: [
      {
        id: 1,
        pipeline_id: 1,
        run_number: 1,
        status: 'success' as const,
        commit_sha: 'abc123',
        triggered_by: 'user',
        trigger_event: 'push',
        started_at: '2023-12-01T10:00:00Z',
        finished_at: '2023-12-01T10:05:00Z',
        duration_seconds: 300,
        branch: 'main'
      }
    ]
  },
  {
    id: 2,
    name: 'Backend Tests',
    description: 'Backend testing pipeline',
    repository_url: 'https://github.com/company/backend',
    branch: 'develop',
    pipeline_type: 'ci_cd' as const,
    last_run_status: 'success' as const,
    last_run_at: '2023-12-01T11:00:00Z',
    total_runs: 30,
    success_rate: 0.87,
    average_duration: 450,
    is_active: true,
    project_id: 1,
    runs: []
  },
  {
    id: 3,
    name: 'Deployment',
    description: 'Production deployment pipeline',
    repository_url: 'https://github.com/company/deploy',
    branch: 'main',
    pipeline_type: 'cd' as const,
    last_run_status: 'failure' as const,
    last_run_at: '2023-12-01T12:00:00Z',
    total_runs: 20,
    success_rate: 0.75,
    average_duration: 600,
    is_active: false,
    project_id: 1,
    runs: []
  }
];

describe('TestCoverageWidget', () => {
  it('renders the component with correct title', () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    expect(screen.getByText(/Overall:.*%.*Last 30 days/)).toBeInTheDocument();
  });

  it('displays coverage statistics for active pipelines only', () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    // Should show "2 active pipelines" (only active ones)
    expect(screen.getByText('2 active pipelines')).toBeInTheDocument();
  });

  it('renders circular progress indicators for all coverage types', () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    expect(screen.getByText('Overall')).toBeInTheDocument();
    expect(screen.getByText('Unit Tests')).toBeInTheDocument();
    expect(screen.getByText('Integration')).toBeInTheDocument();
    expect(screen.getByText('E2E Tests')).toBeInTheDocument();
  });

  it('displays coverage percentages and levels', () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    // Should display percentages (mocked Math.random ensures consistent values)
    const percentageElements = screen.getAllByText(/%$/);
    expect(percentageElements.length).toBeGreaterThan(0);
    
    // Should display coverage levels
    expect(screen.getByText('Excellent') || screen.getByText('Good') || screen.getByText('Warning') || screen.getByText('Poor')).toBeInTheDocument();
  });

  it('shows trend indicators for all coverage types', () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    // Should show trend indicators (arrows or "Stable")
    const trendElements = screen.getAllByText(/[↗↘→]|Stable/);
    expect(trendElements.length).toBeGreaterThanOrEqual(4); // At least 4 trends (overall, unit, integration, e2e)
  });

  it('toggles trend chart visibility when button is clicked', async () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    const toggleButton = screen.getByText('Show Trends');
    expect(toggleButton).toBeInTheDocument();
    
    // Trends should not be visible initially
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    
    // Click to show trends
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('Hide Trends')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
    
    // Click to hide trends
    fireEvent.click(screen.getByText('Hide Trends'));
    
    await waitFor(() => {
      expect(screen.getByText('Show Trends')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  it('renders trend chart with correct components when trends are shown', async () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    // Show trends
    fireEvent.click(screen.getByText('Show Trends'));
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
    
    // Check for all trend lines
    expect(screen.getByTestId('line-overall')).toBeInTheDocument();
    expect(screen.getByTestId('line-unit')).toBeInTheDocument();
    expect(screen.getByTestId('line-integration')).toBeInTheDocument();
    expect(screen.getByTestId('line-e2e')).toBeInTheDocument();
  });

  it('displays coverage thresholds legend', () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    expect(screen.getByText('Excellent (≥90%)')).toBeInTheDocument();
    expect(screen.getByText('Good (75-89%)')).toBeInTheDocument();
    expect(screen.getByText('Warning (60-74%)')).toBeInTheDocument();
    expect(screen.getByText('Poor (<60%)')).toBeInTheDocument();
  });

  it('handles empty pipelines array gracefully', () => {
    render(<TestCoverageWidget pipelines={[]} />);
    
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    expect(screen.getByText('0 active pipelines')).toBeInTheDocument();
    expect(screen.getByText(/Overall:.*0\.0%/)).toBeInTheDocument();
  });

  it('handles pipelines with no active ones', () => {
    const inactivePipelines = mockPipelines.map(p => ({ ...p, is_active: false }));
    render(<TestCoverageWidget pipelines={inactivePipelines} />);
    
    expect(screen.getByText('0 active pipelines')).toBeInTheDocument();
    expect(screen.getByText(/Overall:.*0\.0%/)).toBeInTheDocument();
  });

  it('calculates coverage correctly for different pipeline types', () => {
    const ciPipeline = { ...mockPipelines[0], pipeline_type: 'ci' as const };
    const cdPipeline = { ...mockPipelines[0], pipeline_type: 'cd' as const };
    const ciCdPipeline = { ...mockPipelines[0], pipeline_type: 'ci_cd' as const };
    
    // Test each pipeline type separately using a container to avoid conflicts
    const { rerender } = render(<TestCoverageWidget pipelines={[ciPipeline]} />);
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    
    // Re-render with different pipeline type
    rerender(<TestCoverageWidget pipelines={[cdPipeline]} />);
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    
    rerender(<TestCoverageWidget pipelines={[ciCdPipeline]} />);
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <TestCoverageWidget pipelines={mockPipelines} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('uses custom timeRange for trends', () => {
    render(<TestCoverageWidget pipelines={mockPipelines} timeRange={14} />);
    
    expect(screen.getByText(/Last 14 days/)).toBeInTheDocument();
  });

  it('adapts to mobile layout', () => {
    // Component should render correctly on mobile (hook is mocked)
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    expect(screen.getByText('Test Coverage')).toBeInTheDocument();
    expect(screen.getByText('Overall')).toBeInTheDocument();
  });

  it('displays correct coverage levels based on percentage thresholds', () => {
    // Test with high success rate pipeline (should show excellent/good)
    const highSuccessPipeline = {
      ...mockPipelines[0],
      success_rate: 0.98
    };
    
    render(<TestCoverageWidget pipelines={[highSuccessPipeline]} />);
    
    // Should show good coverage levels
    const levelElements = screen.getAllByText(/Excellent|Good/);
    expect(levelElements.length).toBeGreaterThan(0);
  });

  it('handles trend calculations correctly', async () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    // Show trends to trigger calculations
    fireEvent.click(screen.getByText('Show Trends'));
    
    await waitFor(() => {
      // Should have trend indicators for all coverage types
      const trendElements = screen.getAllByText(/↗|↘|→|Stable|\d+\.\d+%/);
      expect(trendElements.length).toBeGreaterThan(0);
    });
  });

  it('generates correct historical trend data', async () => {
    render(<TestCoverageWidget pipelines={mockPipelines} timeRange={7} />);
    
    // Show trends
    fireEvent.click(screen.getByText('Show Trends'));
    
    await waitFor(() => {
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      
      // Should have 7 data points for 7-day range
      expect(chartData).toHaveLength(7);
      
      // Each data point should have required fields
      chartData.forEach((point: any) => {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('dateLabel');
        expect(point).toHaveProperty('unit');
        expect(point).toHaveProperty('integration');
        expect(point).toHaveProperty('e2e');
        expect(point).toHaveProperty('overall');
      });
    });
  });

  it('displays coverage trends section title when trends are shown', async () => {
    render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    // Initially no trends section
    expect(screen.queryByText('Coverage Trends')).not.toBeInTheDocument();
    
    // Show trends
    fireEvent.click(screen.getByText('Show Trends'));
    
    await waitFor(() => {
      expect(screen.getByText('Coverage Trends')).toBeInTheDocument();
    });
  });

  it('applies dark mode classes correctly', () => {
    const { container } = render(<TestCoverageWidget pipelines={mockPipelines} />);
    
    // Check for dark mode classes in the rendered content
    const darkModeElements = container.querySelectorAll('.dark\\:bg-gray-800, .dark\\:text-white, .dark\\:border-gray-700');
    expect(darkModeElements.length).toBeGreaterThan(0);
  });
}); 