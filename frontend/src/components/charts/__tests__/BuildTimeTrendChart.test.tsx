/**
 * BuildTimeTrendChart Component Tests
 * 
 * Simplified test suite covering basic functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { subDays } from 'date-fns';
import BuildTimeTrendChart from '../BuildTimeTrendChart';

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
  LineChart: ({ children }: any) => children,
  Line: ({ dataKey }: any) => `<Line dataKey="${dataKey}" />`,
  XAxis: ({ dataKey }: any) => `<XAxis dataKey="${dataKey}" />`,
  YAxis: () => '<YAxis />',
  CartesianGrid: () => '<CartesianGrid />',
  Tooltip: () => '<Tooltip />',
  ResponsiveContainer: ({ children }: any) => children,
  ReferenceLine: () => '<ReferenceLine />',
  Dot: ({ fill }: any) => `<Dot fill="${fill}" />`
}));

// Test data
const mockPipelineRuns = [
  {
    id: 1,
    pipeline_id: 1,
    run_number: 1,
    status: 'success' as const,
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
    started_at: subDays(new Date(), 3).toISOString(),
    finished_at: subDays(new Date(), 3).toISOString(),
    duration_seconds: 150,
    branch: 'main'
  },
  {
    id: 3,
    pipeline_id: 1,
    run_number: 3,
    status: 'success' as const,
    started_at: subDays(new Date(), 1).toISOString(),
    finished_at: subDays(new Date(), 1).toISOString(),
    duration_seconds: 300,
    branch: 'main'
  }
];

const mockPipelines = [
  {
    id: 1,
    name: 'Frontend CI/CD',
    runs: mockPipelineRuns
  },
  {
    id: 2,
    name: 'Backend CI/CD',
    runs: [
      {
        id: 4,
        pipeline_id: 2,
        run_number: 1,
        status: 'success' as const,
        started_at: subDays(new Date(), 2).toISOString(),
        finished_at: subDays(new Date(), 2).toISOString(),
        duration_seconds: 180,
        branch: 'main'
      }
    ]
  }
];

describe('BuildTimeTrendChart', () => {
  it('renders chart component', () => {
    render(<BuildTimeTrendChart pipelines={mockPipelines} />);
    
    expect(screen.getByText('Build Time Trends')).toBeInTheDocument();
  });

  it('displays correct time range', () => {
    render(<BuildTimeTrendChart pipelines={mockPipelines} timeRange={14} />);
    
    expect(screen.getByText(/Last 14 days/)).toBeInTheDocument();
  });

  it('shows average build time', () => {
    render(<BuildTimeTrendChart pipelines={mockPipelines} />);
    
    expect(screen.getByText(/Average:/)).toBeInTheDocument();
  });

  it('handles empty pipelines', () => {
    render(<BuildTimeTrendChart pipelines={[]} />);
    
    expect(screen.getByText('Build Time Trends')).toBeInTheDocument();
    expect(screen.getByText(/Average:/)).toBeInTheDocument();
    expect(screen.getByText(/0s/)).toBeInTheDocument();
  });

  it('toggles outliers visibility', () => {
    render(<BuildTimeTrendChart pipelines={mockPipelines} />);
    
    const outliersButton = screen.getByRole('button', { name: /outliers/i });
    expect(outliersButton).toBeInTheDocument();
    
    fireEvent.click(outliersButton);
    expect(outliersButton).toHaveClass('bg-gray-100');
  });

  it('applies custom className', () => {
    const customClass = 'custom-chart-class';
    const { container } = render(
      <BuildTimeTrendChart pipelines={mockPipelines} className={customClass} />
    );
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('handles different time ranges', () => {
    const { rerender } = render(
      <BuildTimeTrendChart pipelines={mockPipelines} timeRange={7} />
    );
    
    expect(screen.getByText(/Last 7 days/)).toBeInTheDocument();
    
    rerender(<BuildTimeTrendChart pipelines={mockPipelines} timeRange={30} />);
    expect(screen.getByText(/Last 30 days/)).toBeInTheDocument();
  });

  it('calculates trend direction', () => {
    render(<BuildTimeTrendChart pipelines={mockPipelines} />);
    
    // Should show some trend indicator
    const trendIndicators = ['Improving', 'Degrading', 'Stable'];
    const hasTrendIndicator = trendIndicators.some(trend => 
      screen.queryByText(new RegExp(trend, 'i'))
    );
    expect(hasTrendIndicator).toBe(true);
  });

  it('shows legend with line descriptions', () => {
    render(<BuildTimeTrendChart pipelines={mockPipelines} />);
    
    expect(screen.getByText('Average Duration')).toBeInTheDocument();
    expect(screen.getByText('Median Duration')).toBeInTheDocument();
  });

  it('handles pipeline filtering', () => {
    render(
      <BuildTimeTrendChart 
        pipelines={mockPipelines} 
        selectedPipelineId={1}
      />
    );
    
    // Should still render the chart with filtered data
    expect(screen.getByText('Build Time Trends')).toBeInTheDocument();
  });
}); 