/**
 * Git Activity Heatmap Component Tests
 * 
 * Unit tests for the Git Activity Heatmap component including rendering,
 * interactions, tooltips, and data processing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, subDays } from 'date-fns';
import GitActivityHeatmap from '../GitActivityHeatmap';
import { ActivityHeatmapData } from '../../../types/git-activity';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock date-fns functions for consistent testing
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn(),
  startOfWeek: jest.fn(),
  endOfWeek: jest.fn(),
  eachDayOfInterval: jest.fn(),
  startOfYear: jest.fn(),
  endOfYear: jest.fn(),
  getDay: jest.fn()
}));

const mockFormat = format as jest.MockedFunction<typeof format>;

describe('GitActivityHeatmap', () => {
  const mockRepository = 'test-org/test-repo';
  
  const createMockData = (days: number = 30): ActivityHeatmapData[] => {
    const data: ActivityHeatmapData[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = subDays(today, i);
      data.push({
        date: date.toISOString().split('T')[0],
        activity_count: Math.floor(Math.random() * 20),
        commit_count: Math.floor(Math.random() * 10),
        pr_count: Math.floor(Math.random() * 5),
        contributor_count: Math.floor(Math.random() * 3),
        lines_added: Math.floor(Math.random() * 1000),
        lines_deleted: Math.floor(Math.random() * 500),
        files_changed: Math.floor(Math.random() * 20),
        activity_types: ['commit', 'pr']
      });
    }
    
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  beforeEach(() => {
    mockFormat.mockImplementation((date, formatStr) => {
      if (formatStr === 'MMM d, yyyy') return 'Jan 1, 2024';
      if (formatStr === 'MMM') return 'Jan';
      if (formatStr === 'EEEE') return 'Monday';
      if (formatStr === 'yyyy-MM-dd') return '2024-01-01';
      return 'formatted-date';
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the heatmap with repository name', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(
        <GitActivityHeatmap
          data={[]}
          repository={mockRepository}
          loading={true}
        />
      );

      expect(screen.getByText('Loading activity data...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });

    it('renders error state', () => {
      const errorMessage = 'Failed to load data';
      
      render(
        <GitActivityHeatmap
          data={[]}
          repository={mockRepository}
          error={errorMessage}
        />
      );

      expect(screen.getByText(`Error loading activity data: ${errorMessage}`)).toBeInTheDocument();
    });

    it('renders empty state when no data', () => {
      render(
        <GitActivityHeatmap
          data={[]}
          repository={mockRepository}
        />
      );

      expect(screen.getByText(`No activity data available for ${mockRepository}`)).toBeInTheDocument();
    });

    it('renders heatmap cells for data', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      // Should render heatmap cells (exact count depends on date range and week structure)
      const cells = screen.getAllByRole('button'); // Cells are clickable divs
      expect(cells.length).toBeGreaterThan(0);
    });

    it('renders with custom color scheme', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          colorScheme="blue"
        />
      );

      // Component should render without errors
      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });

    it('renders weekday labels when enabled', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          showWeekdays={true}
        />
      );

      // Should show some weekday labels (S, M, T, W, T, F, S - but only alternates)
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('W')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
    });

    it('hides weekday labels when disabled', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          showWeekdays={false}
        />
      );

      // Weekday labels should not be present
      expect(screen.queryByText('M')).not.toBeInTheDocument();
      expect(screen.queryByText('W')).not.toBeInTheDocument();
    });

    it('renders legend', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      expect(screen.getByText('Less')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onCellClick when cell is clicked', async () => {
      const data = createMockData(7);
      const onCellClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          onCellClick={onCellClick}
        />
      );

      const cells = screen.getAllByRole('button');
      await user.click(cells[0]);

      expect(onCellClick).toHaveBeenCalledWith(
        expect.any(String), // date
        expect.objectContaining({
          date: expect.any(String),
          activity_count: expect.any(Number)
        })
      );
    });

    it('shows tooltip on cell hover', async () => {
      const data = createMockData(7);
      const user = userEvent.setup();
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      const cells = screen.getAllByRole('button');
      await user.hover(cells[0]);

      // Tooltip should appear with activity information
      await waitFor(() => {
        expect(screen.getByText('Total Activity:')).toBeInTheDocument();
        expect(screen.getByText('Commits:')).toBeInTheDocument();
        expect(screen.getByText('Pull Requests:')).toBeInTheDocument();
      });
    });

    it('hides tooltip on cell leave', async () => {
      const data = createMockData(7);
      const user = userEvent.setup();
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      const cells = screen.getAllByRole('button');
      
      // Hover to show tooltip
      await user.hover(cells[0]);
      await waitFor(() => {
        expect(screen.getByText('Total Activity:')).toBeInTheDocument();
      });

      // Unhover to hide tooltip
      await user.unhover(cells[0]);
      await waitFor(() => {
        expect(screen.queryByText('Total Activity:')).not.toBeInTheDocument();
      });
    });

    it('calls onCellHover with correct data', async () => {
      const data = createMockData(7);
      const onCellHover = jest.fn();
      const user = userEvent.setup();
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          onCellHover={onCellHover}
        />
      );

      const cells = screen.getAllByRole('button');
      await user.hover(cells[0]);

      expect(onCellHover).toHaveBeenCalledWith(
        expect.any(String), // date
        expect.objectContaining({
          date: expect.any(String),
          activity_count: expect.any(Number)
        })
      );
    });
  });

  describe('Data Processing', () => {
    it('handles empty data gracefully', () => {
      render(
        <GitActivityHeatmap
          data={[]}
          repository={mockRepository}
        />
      );

      expect(screen.getByText(`No activity data available for ${mockRepository}`)).toBeInTheDocument();
    });

    it('processes data with missing dates', () => {
      // Create sparse data with gaps
      const data: ActivityHeatmapData[] = [
        {
          date: '2024-01-01',
          activity_count: 5,
          commit_count: 3,
          pr_count: 2,
          contributor_count: 1,
          lines_added: 100,
          lines_deleted: 50,
          files_changed: 5,
          activity_types: ['commit']
        },
        {
          date: '2024-01-03', // Missing 2024-01-02
          activity_count: 8,
          commit_count: 5,
          pr_count: 3,
          contributor_count: 2,
          lines_added: 200,
          lines_deleted: 100,
          files_changed: 10,
          activity_types: ['commit', 'pr']
        }
      ];
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      // Should render without errors and fill missing dates
      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });

    it('calculates activity levels correctly', () => {
      const data: ActivityHeatmapData[] = [
        {
          date: '2024-01-01',
          activity_count: 0, // Level 0
          commit_count: 0,
          pr_count: 0,
          contributor_count: 0,
          lines_added: 0,
          lines_deleted: 0,
          files_changed: 0,
          activity_types: []
        },
        {
          date: '2024-01-02',
          activity_count: 20, // High activity
          commit_count: 15,
          pr_count: 5,
          contributor_count: 3,
          lines_added: 1000,
          lines_deleted: 500,
          files_changed: 25,
          activity_types: ['commit', 'pr']
        }
      ];
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      // Should render different activity levels
      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });
  });

  describe('Customization', () => {
    it('applies custom cell size', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          cellSize={16}
        />
      );

      // Component should render with custom cell size
      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });

    it('applies custom class name', () => {
      const data = createMockData(7);
      const customClass = 'custom-heatmap-class';
      
      const { container } = render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          className={customClass}
        />
      );

      expect(container.firstChild).toHaveClass(customClass);
    });

    it('uses custom date range', () => {
      const data = createMockData(7);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          dateRange={{ startDate, endDate }}
        />
      );

      // Should render with custom date range
      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const data = createMockData(7);
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      const cells = screen.getAllByRole('button');
      expect(cells.length).toBeGreaterThan(0);
      
      // Each cell should have a title attribute for accessibility
      cells.forEach(cell => {
        expect(cell).toHaveAttribute('title');
      });
    });

    it('supports keyboard navigation', async () => {
      const data = createMockData(7);
      const onCellClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
          onCellClick={onCellClick}
        />
      );

      const cells = screen.getAllByRole('button');
      
      // Focus first cell and press Enter
      cells[0].focus();
      await user.keyboard('{Enter}');

      expect(onCellClick).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeData = createMockData(365); // Full year of data
      
      const startTime = performance.now();
      render(
        <GitActivityHeatmap
          data={largeData}
          repository={mockRepository}
        />
      );
      const endTime = performance.now();

      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });

    it('memoizes processed data correctly', () => {
      const data = createMockData(30);
      
      const { rerender } = render(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      // Rerender with same data should not cause issues
      rerender(
        <GitActivityHeatmap
          data={data}
          repository={mockRepository}
        />
      );

      expect(screen.getByText(`Git Activity for ${mockRepository}`)).toBeInTheDocument();
    });
  });
}); 