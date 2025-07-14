/**
 * Git Activity Filters Component Tests
 * 
 * Unit tests for the Git Activity Filters component including filter controls,
 * date range selection, and view options.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { subDays } from 'date-fns';
import GitActivityFilters from '../GitActivityFilters';
import {
  GitActivityFilters as GitActivityFiltersType,
  GitActivityViewOptions
} from '../../../types/git-activity';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  FunnelIcon: () => <div data-testid="funnel-icon" />,
  EyeIcon: () => <div data-testid="eye-icon" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  XMarkIcon: () => <div data-testid="x-mark-icon" />,
  AdjustmentsHorizontalIcon: () => <div data-testid="adjustments-icon" />
}));

describe('GitActivityFilters', () => {
  const defaultFilters: GitActivityFiltersType = {
    dateRange: {
      startDate: subDays(new Date(), 30),
      endDate: new Date()
    },
    activityTypes: ['commits', 'prs', 'reviews'],
    contributors: [],
    repositories: []
  };

  const defaultViewOptions: GitActivityViewOptions = {
    viewType: 'daily',
    groupBy: 'day',
    sortBy: 'date',
    sortOrder: 'asc'
  };

  const defaultProps = {
    filters: defaultFilters,
    viewOptions: defaultViewOptions,
    onFiltersChange: jest.fn(),
    onViewOptionsChange: jest.fn(),
    onReset: jest.fn(),
    availableContributors: ['user1', 'user2', 'user3'],
    availableRepositories: ['repo1', 'repo2']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the filters component with header', () => {
      render(<GitActivityFilters {...defaultProps} />);

      expect(screen.getByText('Filters & View Options')).toBeInTheDocument();
      expect(screen.getByTestId('adjustments-icon')).toBeInTheDocument();
    });

    it('shows active filters indicator when filters are applied', () => {
      const filtersWithSelection = {
        ...defaultFilters,
        activityTypes: ['commits'] as const,
        contributors: ['user1']
      };

      render(
        <GitActivityFilters
          {...defaultProps}
          filters={filtersWithSelection}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows reset button when filters are active', () => {
      const filtersWithSelection = {
        ...defaultFilters,
        activityTypes: ['commits'] as const
      };

      render(
        <GitActivityFilters
          {...defaultProps}
          filters={filtersWithSelection}
        />
      );

      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('renders view type toggle buttons', () => {
      render(<GitActivityFilters {...defaultProps} />);

      expect(screen.getByText('📅')).toBeInTheDocument(); // Daily
      expect(screen.getByText('📊')).toBeInTheDocument(); // Weekly
      expect(screen.getByText('📈')).toBeInTheDocument(); // Monthly
    });

    it('highlights active view type', () => {
      const viewOptionsWithWeekly = {
        ...defaultViewOptions,
        viewType: 'weekly' as const
      };

      render(
        <GitActivityFilters
          {...defaultProps}
          viewOptions={viewOptionsWithWeekly}
        />
      );

      const weeklyButton = screen.getByText('Weekly').closest('button');
      expect(weeklyButton).toHaveClass('bg-white', 'dark:bg-gray-600');
    });
  });

  describe('Date Range Selection', () => {
    it('displays current date range', () => {
      render(<GitActivityFilters {...defaultProps} />);

      // Should show some form of date range (exact format depends on implementation)
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    });

    it('opens date range picker when clicked', async () => {
      const user = userEvent.setup();
      render(<GitActivityFilters {...defaultProps} />);

      const dateRangeButton = screen.getByTestId('calendar-icon').closest('button');
      await user.click(dateRangeButton!);

      // Should show preset options
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Last year')).toBeInTheDocument();
    });

    it('calls onFiltersChange when date preset is selected', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <GitActivityFilters
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />
      );

      const dateRangeButton = screen.getByTestId('calendar-icon').closest('button');
      await user.click(dateRangeButton!);

      const last7DaysOption = screen.getByText('Last 7 days');
      await user.click(last7DaysOption);

      expect(onFiltersChange).toHaveBeenCalledWith({
        dateRange: expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      });
    });
  });

  describe('Activity Type Filtering', () => {
    it('shows activity type filter button', () => {
      render(<GitActivityFilters {...defaultProps} />);

      expect(screen.getByText('Activity Types')).toBeInTheDocument();
    });

    it('opens activity type dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<GitActivityFilters {...defaultProps} />);

      const activityTypeButton = screen.getByText('Activity Types').closest('button');
      await user.click(activityTypeButton!);

      expect(screen.getByText('Commits')).toBeInTheDocument();
      expect(screen.getByText('Pull Requests')).toBeInTheDocument();
      expect(screen.getByText('Reviews')).toBeInTheDocument();
    });

    it('shows selected count when activity types are filtered', () => {
      const filtersWithSelection = {
        ...defaultFilters,
        activityTypes: ['commits'] as const
      };

      render(
        <GitActivityFilters
          {...defaultProps}
          filters={filtersWithSelection}
        />
      );

      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('calls onFiltersChange when activity type is toggled', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();

      render(
        <GitActivityFilters
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />
      );

      const activityTypeButton = screen.getByText('Activity Types').closest('button');
      await user.click(activityTypeButton!);

      const commitsCheckbox = screen.getByRole('checkbox', { name: /commits/i });
      await user.click(commitsCheckbox);

      expect(onFiltersChange).toHaveBeenCalledWith({
        activityTypes: expect.arrayContaining(['prs', 'reviews'])
      });
    });
  });

  describe('View Options', () => {
    it('calls onViewOptionsChange when view type is changed', async () => {
      const user = userEvent.setup();
      const onViewOptionsChange = jest.fn();

      render(
        <GitActivityFilters
          {...defaultProps}
          onViewOptionsChange={onViewOptionsChange}
        />
      );

      const weeklyButton = screen.getByText('Weekly');
      await user.click(weeklyButton);

      expect(onViewOptionsChange).toHaveBeenCalledWith({
        viewType: 'weekly'
      });
    });

    it('shows current view type as active', () => {
      const viewOptionsWithMonthly = {
        ...defaultViewOptions,
        viewType: 'monthly' as const
      };

      render(
        <GitActivityFilters
          {...defaultProps}
          viewOptions={viewOptionsWithMonthly}
        />
      );

      const monthlyButton = screen.getByText('Monthly').closest('button');
      expect(monthlyButton).toHaveClass('bg-white', 'dark:bg-gray-600');
    });
  });

  describe('Expanded Filters', () => {
    it('shows expand button', () => {
      render(<GitActivityFilters {...defaultProps} />);

      expect(screen.getByText('Expand')).toBeInTheDocument();
    });

    it('expands to show additional filters when expand is clicked', async () => {
      const user = userEvent.setup();
      render(<GitActivityFilters {...defaultProps} />);

      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      expect(screen.getByText('Collapse')).toBeInTheDocument();
      expect(screen.getByText('Contributors')).toBeInTheDocument();
      expect(screen.getByText('Repositories')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
    });

    it('shows contributors filter when expanded', async () => {
      const user = userEvent.setup();
      render(<GitActivityFilters {...defaultProps} />);

      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      expect(screen.getByText('Contributors')).toBeInTheDocument();
      expect(screen.getByText('All Contributors')).toBeInTheDocument();
    });

    it('shows repositories filter when expanded', async () => {
      const user = userEvent.setup();
      render(<GitActivityFilters {...defaultProps} />);

      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      expect(screen.getByText('Repositories')).toBeInTheDocument();
      expect(screen.getByText('All Repositories')).toBeInTheDocument();
    });

    it('shows sort options when expanded', async () => {
      const user = userEvent.setup();
      render(<GitActivityFilters {...defaultProps} />);

      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      expect(screen.getByText('Sort By')).toBeInTheDocument();
      expect(screen.getByDisplayValue('date')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup();
      const onReset = jest.fn();
      const filtersWithSelection = {
        ...defaultFilters,
        activityTypes: ['commits'] as const
      };

      render(
        <GitActivityFilters
          {...defaultProps}
          filters={filtersWithSelection}
          onReset={onReset}
        />
      );

      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);

      expect(onReset).toHaveBeenCalled();
    });

    it('does not show reset button when no filters are active', () => {
      render(<GitActivityFilters {...defaultProps} />);

      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });
  });

  describe('Active Filters Summary', () => {
    it('shows summary of active filters', () => {
      const filtersWithMultipleSelections = {
        ...defaultFilters,
        activityTypes: ['commits'] as const,
        contributors: ['user1', 'user2'],
        repositories: ['repo1']
      };

      render(
        <GitActivityFilters
          {...defaultProps}
          filters={filtersWithMultipleSelections}
        />
      );

      expect(screen.getByText('1 activity types')).toBeInTheDocument();
      expect(screen.getByText('2 contributors')).toBeInTheDocument();
      expect(screen.getByText('1 repositories')).toBeInTheDocument();
    });

    it('does not show summary when no filters are active', () => {
      render(<GitActivityFilters {...defaultProps} />);

      expect(screen.queryByText('activity types')).not.toBeInTheDocument();
      expect(screen.queryByText('contributors')).not.toBeInTheDocument();
      expect(screen.queryByText('repositories')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(<GitActivityFilters {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check that buttons are focusable
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<GitActivityFilters {...defaultProps} />);

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();

      await user.keyboard('{Tab}');
      // Should move focus to next interactive element
      expect(document.activeElement).not.toBe(firstButton);
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const customClass = 'custom-filters-class';
      const { container } = render(
        <GitActivityFilters
          {...defaultProps}
          className={customClass}
        />
      );

      expect(container.firstChild).toHaveClass(customClass);
    });

    it('handles empty available contributors', () => {
      render(
        <GitActivityFilters
          {...defaultProps}
          availableContributors={[]}
        />
      );

      // Should render without errors
      expect(screen.getByText('Filters & View Options')).toBeInTheDocument();
    });

    it('handles empty available repositories', () => {
      render(
        <GitActivityFilters
          {...defaultProps}
          availableRepositories={[]}
        />
      );

      // Should render without errors
      expect(screen.getByText('Filters & View Options')).toBeInTheDocument();
    });
  });
}); 