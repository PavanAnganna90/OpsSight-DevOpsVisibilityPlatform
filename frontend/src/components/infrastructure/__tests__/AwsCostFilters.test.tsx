/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AwsCostFilters, FilterOptions } from '../AwsCostFilters';

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  FunnelIcon: ({ className }: { className?: string }) => <div data-testid="funnel-icon" className={className} />,
  XMarkIcon: ({ className }: { className?: string }) => <div data-testid="x-mark-icon" className={className} />,
  ChevronDownIcon: ({ className }: { className?: string }) => <div data-testid="chevron-down-icon" className={className} />,
  GlobeAltIcon: ({ className }: { className?: string }) => <div data-testid="globe-alt-icon" className={className} />,
  CubeIcon: ({ className }: { className?: string }) => <div data-testid="cube-icon" className={className} />,
  AdjustmentsHorizontalIcon: ({ className }: { className?: string }) => <div data-testid="adjustments-horizontal-icon" className={className} />
}));

describe('AwsCostFilters', () => {
  const mockFilters: FilterOptions = {
    services: [],
    regions: [],
    tags: {},
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    groupBy: 'service',
    granularity: 'daily',
    costType: 'unblended',
    includeCredits: false,
    includeRefunds: false,
    includeUpfront: false
  };

  const mockProps = {
    filters: mockFilters,
    availableServices: ['EC2', 'S3', 'RDS', 'Lambda'],
    availableRegions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    availableTags: {},
    onFiltersChange: jest.fn(),
    onResetFilters: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with basic elements', () => {
      render(<AwsCostFilters {...mockProps} />);
      
      expect(screen.getByText('Filters & View Options')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Regions')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Group by Service')).toBeInTheDocument();
    });

    it('renders date range inputs', () => {
      render(<AwsCostFilters {...mockProps} />);
      
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    });

    it('shows active filter count when filters are applied', () => {
      const filtersWithSelections = {
        ...mockFilters,
        services: ['EC2', 'S3'],
        regions: ['us-east-1']
      };

      render(<AwsCostFilters {...mockProps} filters={filtersWithSelections} />);
      
      expect(screen.getByText('3 active')).toBeInTheDocument();
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('does not show active filter count when no filters are applied', () => {
      render(<AwsCostFilters {...mockProps} />);
      
      expect(screen.queryByText(/active/)).not.toBeInTheDocument();
      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });
  });

  describe('Service Filtering', () => {
    it('opens services dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<AwsCostFilters {...mockProps} />);
      
      const servicesButton = screen.getByText('Services');
      await user.click(servicesButton);
      
      expect(screen.getByText('EC2')).toBeInTheDocument();
      expect(screen.getByText('S3')).toBeInTheDocument();
      expect(screen.getByText('RDS')).toBeInTheDocument();
      expect(screen.getByText('Lambda')).toBeInTheDocument();
    });

    it('selects and deselects services', async () => {
      const user = userEvent.setup();
      render(<AwsCostFilters {...mockProps} />);
      
      // Open dropdown
      await user.click(screen.getByText('Services'));
      
      // Select EC2
      const ec2Checkbox = screen.getByRole('checkbox', { name: /EC2/ });
      await user.click(ec2Checkbox);
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        services: ['EC2']
      });
    });

    it('shows selected service count in button', () => {
      const filtersWithServices = {
        ...mockFilters,
        services: ['EC2', 'S3']
      };

      render(<AwsCostFilters {...mockProps} filters={filtersWithServices} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('calls onResetFilters when clear all is clicked', async () => {
      const user = userEvent.setup();
      const filtersWithSelections = {
        ...mockFilters,
        services: ['EC2'],
        regions: ['us-east-1']
      };

      render(<AwsCostFilters {...mockProps} filters={filtersWithSelections} />);
      
      const clearAllButton = screen.getByText('Clear all');
      await user.click(clearAllButton);
      
      expect(mockProps.onResetFilters).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AwsCostFilters {...mockProps} />);
      
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('handles loading state properly', () => {
      render(<AwsCostFilters {...mockProps} isLoading={true} />);
      
      // Component should still render but could show loading indicators
      expect(screen.getByText('Filters & View Options')).toBeInTheDocument();
    });
  });
});
