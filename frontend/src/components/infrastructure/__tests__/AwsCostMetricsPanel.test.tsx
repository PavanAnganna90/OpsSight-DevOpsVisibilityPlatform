/**
 * AWS Cost Metrics Panel Component Tests
 * 
 * Tests for the AwsCostMetricsPanel component including data visualization,
 * user interactions, loading states, and error handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AwsCostMetricsPanel } from '../AwsCostMetricsPanel';
import type { 
  CostDataPoint, 
  ServiceCostBreakdown, 
  CostAnomaly, 
  CostTrend,
  AvailableFilters,
  FilterOptions,
  CostOptimizationRecommendation
} from '../AwsCostMetricsPanel';

// Mock recharts components to avoid canvas rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Pie: () => <div data-testid="pie" />,
  Bar: () => <div data-testid="bar" />,
  Area: () => <div data-testid="area" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

describe('AwsCostMetricsPanel', () => {
  // Mock data for tests
  const mockCostData: CostDataPoint[] = [
    {
      date: '2024-01-01',
      totalCost: 1250.50,
      services: { EC2: 500, S3: 200, RDS: 350, Lambda: 200.50 }
    },
    {
      date: '2024-01-02',
      totalCost: 1380.75,
      services: { EC2: 550, S3: 220, RDS: 380, Lambda: 230.75 }
    },
    {
      date: '2024-01-03',
      totalCost: 1420.25,
      services: { EC2: 580, S3: 240, RDS: 400, Lambda: 200.25 }
    }
  ];

  const mockServiceBreakdown: ServiceCostBreakdown[] = [
    {
      serviceName: 'EC2',
      cost: 580,
      percentage: 40.8,
      trend: 'up',
      trendPercentage: 16.0,
      color: '#3B82F6'
    },
    {
      serviceName: 'RDS',
      cost: 400,
      percentage: 28.2,
      trend: 'up',
      trendPercentage: 14.3,
      color: '#EF4444'
    },
    {
      serviceName: 'S3',
      cost: 240,
      percentage: 16.9,
      trend: 'up',
      trendPercentage: 20.0,
      color: '#10B981'
    },
    {
      serviceName: 'Lambda',
      cost: 200.25,
      percentage: 14.1,
      trend: 'down',
      trendPercentage: -0.1,
      color: '#F59E0B'
    }
  ];

  const mockAnomalies: CostAnomaly[] = [
    {
      date: '2024-01-03',
      expectedCost: 1300,
      actualCost: 1420.25,
      deviationPercentage: 9.25,
      severity: 'high',
      contributingServices: ['EC2', 'RDS']
    },
    {
      date: '2024-01-02',
      expectedCost: 1200,
      actualCost: 1380.75,
      deviationPercentage: 15.06,
      severity: 'critical',
      contributingServices: ['EC2', 'Lambda']
    }
  ];

  const mockCostTrend: CostTrend = {
    direction: 'increasing',
    changePercentage: 13.6,
    changeAmount: 169.75,
    confidence: 0.85
  };

  const mockAvailableFilters: AvailableFilters = {
    services: ['EC2', 'S3', 'RDS', 'Lambda'],
    regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    tags: {
      Environment: ['Production', 'Development', 'Testing'],
      Team: ['Backend', 'Frontend', 'DevOps']
    }
  };

  const mockRecommendations: CostOptimizationRecommendation[] = [
    {
      id: 'rec-1',
      title: 'Right-size EC2 instances',
      description: 'Several EC2 instances are running at low utilization and can be downsized.',
      category: 'right-sizing',
      severity: 'high',
      potentialSavings: 150.50,
      potentialSavingsPercentage: 25.9,
      implementationComplexity: 'easy',
      estimatedTimeToImplement: '2-4 hours',
      serviceName: 'EC2',
      actionItems: [
        'Analyze instance utilization metrics',
        'Identify over-provisioned instances',
        'Schedule downtime for instance resizing'
      ],
      resourcesAffected: 5
    },
    {
      id: 'rec-2',
      title: 'Implement S3 lifecycle policies',
      description: 'Move infrequently accessed S3 objects to cheaper storage classes.',
      category: 'lifecycle',
      severity: 'medium',
      potentialSavings: 45.20,
      potentialSavingsPercentage: 18.8,
      implementationComplexity: 'medium',
      estimatedTimeToImplement: '1-2 days',
      serviceName: 'S3',
      actionItems: [
        'Analyze S3 access patterns',
        'Create lifecycle policies',
        'Test policy rules before applying'
      ],
      resourcesAffected: 12
    },
    {
      id: 'rec-3',
      title: 'Purchase RDS Reserved Instances',
      description: 'Switch from on-demand to reserved instances for predictable workloads.',
      category: 'reserved-instances',
      severity: 'low',
      potentialSavings: 120.00,
      potentialSavingsPercentage: 30.0,
      implementationComplexity: 'easy',
      estimatedTimeToImplement: '30 minutes',
      serviceName: 'RDS',
      actionItems: [
        'Review RDS usage patterns',
        'Calculate reserved instance savings',
        'Purchase appropriate reserved instances'
      ],
      resourcesAffected: 2
    }
  ];

  const defaultProps = {
    costData: mockCostData,
    serviceBreakdown: mockServiceBreakdown,
    anomalies: mockAnomalies,
    costTrend: mockCostTrend,
    availableFilters: mockAvailableFilters,
    recommendations: mockRecommendations
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders AWS Cost Metrics panel with correct title', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      expect(screen.getByText('AWS Cost Metrics')).toBeInTheDocument();
      expect(screen.getByText('Monitor your AWS infrastructure costs and spending trends')).toBeInTheDocument();
    });

    it('renders all navigation tabs', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Use getAllByText and check for specific tab texts in navigation buttons
      const overviewTab = screen.getByRole('button', { name: /overview/i });
      const trendsTab = screen.getByRole('button', { name: /trends/i });
      
      // Find Services tab by finding buttons and checking class for tab indicators
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      const anomaliesTab = buttons.find(button => 
        button.textContent?.includes('Anomalies') && 
        button.className.includes('border-b-2')
      );
      
      expect(overviewTab).toBeInTheDocument();
      expect(trendsTab).toBeInTheDocument();
      expect(servicesTab).toBeInTheDocument();
      expect(anomaliesTab).toBeInTheDocument();
    });

    it('renders summary metrics correctly', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Check if summary metrics are displayed
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Daily Average')).toBeInTheDocument();
      
      // Find Services and Anomalies in the metrics context (not tabs)
      // Check for the metric cards containing these labels
      const allServicesTexts = screen.getAllByText('Services');
      const allAnomaliesTexts = screen.getAllByText('Anomalies');
      
      // Should have Services text in both tab and metric card
      expect(allServicesTexts.length).toBeGreaterThan(0);
      expect(allAnomaliesTexts.length).toBeGreaterThan(0);
      
      // Check calculated values
      expect(screen.getByText('$1,420.25')).toBeInTheDocument(); // Latest total cost
      expect(screen.getByText('4')).toBeInTheDocument(); // Number of services
      expect(screen.getByText('1')).toBeInTheDocument(); // Critical anomalies
    });

    it('renders time range selector with correct options', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const select = screen.getByDisplayValue('Last 30 days');
      expect(select).toBeInTheDocument();
      
      fireEvent.click(select);
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('Last 90 days')).toBeInTheDocument();
      expect(screen.getByText('Last year')).toBeInTheDocument();
    });

    it('renders export button', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('renders loading state correctly', () => {
      render(<AwsCostMetricsPanel {...defaultProps} isLoading={true} />);
      
      // Should show loading animation - check for animate-pulse class
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(screen.queryByText('AWS Cost Metrics')).not.toBeInTheDocument();
    });

    it('renders error state correctly', () => {
      const errorMessage = 'Failed to fetch cost data';
      render(<AwsCostMetricsPanel {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText('Failed to load cost data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('switches between different views when tabs are clicked', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Initially on Overview tab
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      
      // Click on Trends tab - use button role to avoid conflicts
      const trendsTab = screen.getByRole('button', { name: /trends/i });
      fireEvent.click(trendsTab);
      expect(screen.getByText('Detailed Trend Analysis')).toBeInTheDocument();
      
      // Click on Services tab - get all buttons and find the one that's a tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      expect(screen.getByText('Service Cost Breakdown')).toBeInTheDocument();
      
      // Click on Anomalies tab - get all buttons and find the one that's a tab
      const anomaliesTab = buttons.find(button => 
        button.textContent?.includes('Anomalies') && 
        button.className.includes('border-b-2')
      );
      if (anomaliesTab) fireEvent.click(anomaliesTab);
      expect(screen.getByText('Cost Anomalies')).toBeInTheDocument();
    });

    it('calls onTimeRangeChange when time range is changed', () => {
      const mockOnTimeRangeChange = jest.fn();
      render(
        <AwsCostMetricsPanel 
          {...defaultProps} 
          onTimeRangeChange={mockOnTimeRangeChange} 
        />
      );
      
      const select = screen.getByDisplayValue('Last 30 days');
      fireEvent.change(select, { target: { value: '7d' } });
      
      expect(mockOnTimeRangeChange).toHaveBeenCalledWith('7d');
    });

    it('calls onExport when export button is clicked', () => {
      const mockOnExport = jest.fn();
      render(<AwsCostMetricsPanel {...defaultProps} onExport={mockOnExport} />);
      
      fireEvent.click(screen.getByText('Export'));
      
      expect(mockOnExport).toHaveBeenCalledWith('csv');
    });

    it('displays anomaly count badge when anomalies exist', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Find the anomalies tab button specifically using its unique structure
      const buttons = screen.getAllByRole('button');
      const anomaliesTab = buttons.find(button => 
        button.textContent?.includes('Anomalies') && 
        button.className.includes('border-b-2')
      );
      expect(anomaliesTab).toHaveTextContent('2'); // Should show badge with count
    });
  });

  describe('Data Visualization', () => {
    it('renders overview charts when on overview tab', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      expect(screen.getByText('Cost Trend')).toBeInTheDocument();
      expect(screen.getByText('Service Breakdown')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('renders anomalies list when on anomalies tab', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const allButtons = screen.getAllByRole('button');
      
      // Find and click the anomalies tab button specifically
      // Try different approaches to find the anomalies tab
      let anomaliesTabButton;
      try {
        anomaliesTabButton = screen.getByRole('button', { name: /anomalies/i });
      } catch {
        // Fallback: find by text content
        anomaliesTabButton = allButtons.find(button => 
          button.textContent?.toLowerCase().includes('anomalies')
        );
      }
      
      if (anomaliesTabButton) {
        fireEvent.click(anomaliesTabButton);
        
        // Wait for the tab content to render
        expect(screen.getByText('Cost Anomalies')).toBeInTheDocument();
        
        // Check for anomaly severity text (as rendered - lowercase with CSS capitalize)
        expect(screen.getByText('critical Anomaly')).toBeInTheDocument();
        expect(screen.getByText('high Anomaly')).toBeInTheDocument();
        
        // Check for dates in the anomaly details
        expect(screen.getByText(/2024-01-02/)).toBeInTheDocument();
        expect(screen.getByText(/2024-01-03/)).toBeInTheDocument();
      } else {
        throw new Error('Could not find anomalies tab button');
      }
    });

    it('shows no anomalies message when anomalies array is empty', () => {
      render(<AwsCostMetricsPanel {...defaultProps} anomalies={[]} />);
      
      // Click on the Anomalies tab button specifically
      const anomaliesTab = screen.getByRole('button', { name: /anomalies/i });
      fireEvent.click(anomaliesTab);
      
      expect(screen.getByText('No cost anomalies detected in the current time period.')).toBeInTheDocument();
    });
  });

  describe('Currency and Percentage Formatting', () => {
    it('formats currency values correctly', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Check if currency is formatted properly
      expect(screen.getByText('$1,420.25')).toBeInTheDocument();
    });

    it('formats percentage changes correctly', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Should show positive percentage change
      expect(screen.getByText('+2.9%')).toBeInTheDocument(); // Change from previous day
    });
  });

  describe('Edge Cases', () => {
    it('handles empty cost data gracefully', () => {
      render(
        <AwsCostMetricsPanel 
          {...defaultProps} 
          costData={[]} 
          serviceBreakdown={[]} 
        />
      );
      
      // Should still render the panel structure
      expect(screen.getByText('AWS Cost Metrics')).toBeInTheDocument();
    });

    it('handles single data point correctly', () => {
      const singleDataPoint = [mockCostData[0]];
      render(
        <AwsCostMetricsPanel 
          {...defaultProps} 
          costData={singleDataPoint}
        />
      );
      
      expect(screen.getByText('AWS Cost Metrics')).toBeInTheDocument();
      // Use getAllByText and check the first occurrence (Total Cost metric)
      const costElements = screen.getAllByText('$1,250.50');
      expect(costElements.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering and View Options', () => {
    it('renders filter toggle button', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });

    it('shows filter panel when filter button is clicked', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Use more specific selectors for filter labels
      expect(screen.getByLabelText(/services/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/regions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/granularity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/chart type/i)).toBeInTheDocument();
      expect(screen.getByText('Cost Range ($)')).toBeInTheDocument();
    });

    it('renders service filter options correctly', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Check if service select is available
      const serviceSelect = screen.getByLabelText(/services/i);
      expect(serviceSelect).toBeInTheDocument();
      
      // Check if service options are available
      expect(screen.getByText('EC2')).toBeInTheDocument();
      expect(screen.getByText('S3')).toBeInTheDocument();
      expect(screen.getByText('RDS')).toBeInTheDocument();
      expect(screen.getByText('Lambda')).toBeInTheDocument();
    });

    it('renders region filter options correctly', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Check if regions are available
      const regionSelects = screen.getAllByRole('listbox');
      expect(regionSelects.length).toBeGreaterThan(1);
    });

    it('renders granularity selector with correct options', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      expect(screen.getByDisplayValue('Daily')).toBeInTheDocument();
      
      const granularitySelect = screen.getByDisplayValue('Daily');
      fireEvent.click(granularitySelect);
      expect(screen.getByText('Weekly')).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Quarterly')).toBeInTheDocument();
    });

    it('renders chart type selector with correct options', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      expect(screen.getByDisplayValue('Line Chart')).toBeInTheDocument();
      
      const chartTypeSelect = screen.getByDisplayValue('Line Chart');
      fireEvent.click(chartTypeSelect);
      expect(screen.getByText('Bar Chart')).toBeInTheDocument();
      expect(screen.getByText('Area Chart')).toBeInTheDocument();
    });

    it('renders cost range inputs', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      expect(screen.getByPlaceholderText('Min')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Max')).toBeInTheDocument();
    });

    it('calls onFiltersChange when filters are updated', async () => {
      const mockOnFiltersChange = jest.fn();
      render(
        <AwsCostMetricsPanel 
          {...defaultProps} 
          onFiltersChange={mockOnFiltersChange}
        />
      );
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Change granularity
      const granularitySelect = screen.getByDisplayValue('Daily');
      fireEvent.change(granularitySelect, { target: { value: 'weekly' } });
      
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({ granularity: 'weekly' })
        );
      });
    });

    it('changes chart type when chart type filter is changed', async () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Change to bar chart
      const chartTypeSelect = screen.getByDisplayValue('Line Chart');
      fireEvent.change(chartTypeSelect, { target: { value: 'bar' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('changes chart type to area chart', async () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Change to area chart
      const chartTypeSelect = screen.getByDisplayValue('Line Chart');
      fireEvent.change(chartTypeSelect, { target: { value: 'area' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });

    it('shows filter count badge when filters are applied', () => {
      const filtersApplied: Partial<FilterOptions> = {
        services: ['EC2', 'S3'],
        granularity: 'weekly'
      };
      
      render(
        <AwsCostMetricsPanel 
          {...defaultProps} 
          filters={filtersApplied}
        />
      );
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      expect(filterButton).toHaveTextContent('2'); // Should show count badge
    });

    it('shows clear filters button when filters are applied', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Apply a filter first
      const granularitySelect = screen.getByDisplayValue('Daily');
      fireEvent.change(granularitySelect, { target: { value: 'weekly' } });
      
      // Clear filters button should appear
      expect(screen.getByText('Clear all filters')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const mockOnFiltersChange = jest.fn();
      render(
        <AwsCostMetricsPanel 
          {...defaultProps} 
          onFiltersChange={mockOnFiltersChange}
        />
      );
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Apply a filter first
      const granularitySelect = screen.getByDisplayValue('Daily');
      fireEvent.change(granularitySelect, { target: { value: 'weekly' } });
      
      // Click clear filters
      const clearButton = screen.getByText('Clear all filters');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({});
      });
    });

    it('updates cost range filters correctly', async () => {
      const mockOnFiltersChange = jest.fn();
      render(
        <AwsCostMetricsPanel 
          {...defaultProps} 
          onFiltersChange={mockOnFiltersChange}
        />
      );
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Set min cost
      const minInput = screen.getByPlaceholderText('Min');
      fireEvent.change(minInput, { target: { value: '100' } });
      
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            costThreshold: expect.objectContaining({ min: 100 })
          })
        );
      });
      
      // Set max cost
      const maxInput = screen.getByPlaceholderText('Max');
      fireEvent.change(maxInput, { target: { value: '2000' } });
      
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            costThreshold: expect.objectContaining({ max: 2000 })
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Check navigation structure
      const tablist = screen.getByRole('navigation');
      expect(tablist).toBeInTheDocument();
      
      // Check buttons are accessible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Each button should be focusable
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('aria-disabled');
      });
    });

    it('filter controls have proper labels', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      // Check form labels using more specific selectors to avoid conflicts
      expect(screen.getByLabelText(/services/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/regions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/granularity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/chart type/i)).toBeInTheDocument();
      expect(screen.getByText('Cost Range ($)')).toBeInTheDocument();
    });
  });

  describe('Detailed Service View', () => {
    it('shows service breakdown list when services tab is clicked', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Click on Services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      expect(screen.getByText('Service Cost Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Click on a service for detailed analysis')).toBeInTheDocument();
      
      // Check if all services are listed
      expect(screen.getByText('EC2')).toBeInTheDocument();
      expect(screen.getByText('RDS')).toBeInTheDocument();
      expect(screen.getByText('S3')).toBeInTheDocument();
      expect(screen.getByText('Lambda')).toBeInTheDocument();
    });

    it('shows service metrics in the service list', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      // Check service costs are displayed
      expect(screen.getByText('$580.00')).toBeInTheDocument(); // EC2 cost
      expect(screen.getByText('$400.00')).toBeInTheDocument(); // RDS cost
      expect(screen.getByText('$240.00')).toBeInTheDocument(); // S3 cost
      
      // Check percentages
      expect(screen.getByText('40.8% of total')).toBeInTheDocument();
      expect(screen.getByText('28.2% of total')).toBeInTheDocument();
    });

    it('shows trend indicators for services', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      // Check trend percentages
      expect(screen.getByText('+16.0%')).toBeInTheDocument(); // EC2 trend
      expect(screen.getByText('+14.3%')).toBeInTheDocument(); // RDS trend
      expect(screen.getByText('-0.1%')).toBeInTheDocument(); // Lambda trend
    });

    it('navigates to detailed service view when service is clicked', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      // Click on EC2 service
      const ec2Service = screen.getByText('EC2').closest('div[role="button"], div[class*="cursor-pointer"]');
      if (ec2Service) fireEvent.click(ec2Service);
      
      // Should show detailed view
      expect(screen.getByText('EC2 Cost Analysis')).toBeInTheDocument();
    });

    it('shows detailed metrics in service drill-down view', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to services tab and click on EC2
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      const ec2Service = screen.getByText('EC2').closest('div[role="button"], div[class*="cursor-pointer"]');
      if (ec2Service) fireEvent.click(ec2Service);
      
      // Check detailed metrics - use getAllByText to handle multiple instances
      const totalCostElements = screen.getAllByText('Total Cost');
      expect(totalCostElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Resources')).toBeInTheDocument();
      expect(screen.getByText('Utilization')).toBeInTheDocument();
      expect(screen.getByText('Trend')).toBeInTheDocument();
    });

    it('shows back button in detailed service view', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to detailed service view
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      const ec2Service = screen.getByText('EC2').closest('div[role="button"], div[class*="cursor-pointer"]');
      if (ec2Service) fireEvent.click(ec2Service);
      
      // Should have back button
      const backButton = screen.getByRole('button', { name: /back to service list/i });
      expect(backButton).toBeInTheDocument();
    });

    it('returns to service list when back button is clicked', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to detailed service view
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      const ec2Service = screen.getByText('EC2').closest('div[role="button"], div[class*="cursor-pointer"]');
      if (ec2Service) fireEvent.click(ec2Service);
      
      // Click back button
      const backButton = screen.getByRole('button', { name: /back to service list/i });
      fireEvent.click(backButton);
      
      // Should return to service list
      expect(screen.getByText('Service Cost Breakdown')).toBeInTheDocument();
    });
  });

  describe('Cost Optimization Recommendations', () => {
    it('shows recommendations overview in services tab', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      expect(screen.getByText('Cost Optimization Recommendations')).toBeInTheDocument();
    });

    it('displays recommendation cards with correct information', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      // Check recommendation titles
      expect(screen.getByText('Right-size EC2 instances')).toBeInTheDocument();
      expect(screen.getByText('Implement S3 lifecycle policies')).toBeInTheDocument();
      expect(screen.getByText('Purchase RDS Reserved Instances')).toBeInTheDocument();
      
      // Check savings amounts
      expect(screen.getByText('$150.50')).toBeInTheDocument();
      expect(screen.getByText('$45.20')).toBeInTheDocument();
      expect(screen.getByText('$120.00')).toBeInTheDocument();
    });

    it('shows recommendation severity badges', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      // Check severity badges
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });

    it('shows service-specific recommendations in detailed view', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to EC2 detailed view
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      const ec2Service = screen.getByText('EC2').closest('div[role="button"], div[class*="cursor-pointer"]');
      if (ec2Service) fireEvent.click(ec2Service);
      
      // Should show EC2-specific recommendations
      expect(screen.getByText('Optimization Recommendations for EC2')).toBeInTheDocument();
      expect(screen.getByText('Right-size EC2 instances')).toBeInTheDocument();
    });

    it('shows detailed recommendation information in service drill-down', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to EC2 detailed view
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      const ec2Service = screen.getByText('EC2').closest('div[role="button"], div[class*="cursor-pointer"]');
      if (ec2Service) fireEvent.click(ec2Service);
      
      // Check detailed recommendation info
      expect(screen.getByText('Potential Savings')).toBeInTheDocument();
      expect(screen.getByText('Resources Affected')).toBeInTheDocument();
      expect(screen.getByText('Time to Implement')).toBeInTheDocument();
      expect(screen.getByText('Action Items:')).toBeInTheDocument();
    });

    it('shows action items for recommendations', () => {
      render(<AwsCostMetricsPanel {...defaultProps} />);
      
      // Navigate to EC2 detailed view
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      const ec2Service = screen.getByText('EC2').closest('div[role="button"], div[class*="cursor-pointer"]');
      if (ec2Service) fireEvent.click(ec2Service);
      
      // Check action items
      expect(screen.getByText('Analyze instance utilization metrics')).toBeInTheDocument();
      expect(screen.getByText('Identify over-provisioned instances')).toBeInTheDocument();
      expect(screen.getByText('Schedule downtime for instance resizing')).toBeInTheDocument();
    });

    it('handles empty recommendations gracefully', () => {
      render(<AwsCostMetricsPanel {...defaultProps} recommendations={[]} />);
      
      // Navigate to services tab
      const buttons = screen.getAllByRole('button');
      const servicesTab = buttons.find(button => 
        button.textContent?.includes('Services') && 
        button.className.includes('border-b-2')
      );
      if (servicesTab) fireEvent.click(servicesTab);
      
      // Should not show recommendations section
      expect(screen.queryByText('Cost Optimization Recommendations')).not.toBeInTheDocument();
    });
  });
}); 