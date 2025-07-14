/**
 * Git Activity Detail View Component Tests
 * 
 * Unit tests for the Git Activity Detail View component including modal behavior,
 * data display, and interactive features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GitActivityDetailView from '../GitActivityDetailView';
import {
  ActivityHeatmapData,
  DetailedActivityView,
  GitCommit,
  GitPullRequest,
  GitContributor
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
  XMarkIcon: () => <div data-testid="x-mark-icon" />,
  CalendarDaysIcon: () => <div data-testid="calendar-icon" />,
  CodeBracketIcon: () => <div data-testid="code-icon" />,
  UserGroupIcon: () => <div data-testid="user-group-icon" />,
  DocumentTextIcon: () => <div data-testid="document-icon" />,
  ArrowTopRightOnSquareIcon: () => <div data-testid="external-link-icon" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  ChevronRightIcon: () => <div data-testid="chevron-right-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  MinusIcon: () => <div data-testid="minus-icon" />,
  EyeIcon: () => <div data-testid="eye-icon" />,
  ChatBubbleLeftRightIcon: () => <div data-testid="chat-icon" />
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'EEEE, MMMM d, yyyy') return 'Monday, January 1, 2024';
    if (formatStr === 'HH:mm') return '10:30';
    if (formatStr === 'MMM d, yyyy HH:mm') return 'Jan 1, 2024 10:30';
    return 'formatted-date';
  }),
  parseISO: jest.fn((dateStr) => new Date(dateStr))
}));

describe('GitActivityDetailView', () => {
  const mockDate = '2024-01-01';
  
  const mockActivityData: ActivityHeatmapData = {
    date: mockDate,
    activity_count: 15,
    commit_count: 8,
    pr_count: 3,
    contributor_count: 2,
    lines_added: 250,
    lines_deleted: 100,
    files_changed: 12,
    activity_types: ['commit', 'pr']
  };

  const mockCommit: GitCommit = {
    sha: 'abc123def456',
    message: 'Fix bug in authentication\n\nThis commit fixes the issue with user login',
    author_login: 'johndoe',
    author_name: 'John Doe',
    author_email: 'john@example.com',
    authored_date: '2024-01-01T10:30:00Z',
    committed_date: '2024-01-01T10:30:00Z',
    additions: 50,
    deletions: 20,
    changed_files: 3,
    url: 'https://github.com/owner/repo/commit/abc123def456',
    verified: true
  };

  const mockPullRequest: GitPullRequest = {
    number: 123,
    title: 'Add new feature for user management',
    state: 'merged',
    author_login: 'janedoe',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T11:00:00Z',
    merged_at: '2024-01-01T11:00:00Z',
    closed_at: null,
    base_branch: 'main',
    head_branch: 'feature/user-management',
    commits_count: 5,
    additions: 200,
    deletions: 80,
    changed_files: 8,
    url: 'https://github.com/owner/repo/pull/123',
    review_comments: 5,
    reviews_count: 2
  };

  const mockContributor: GitContributor = {
    login: 'johndoe',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: 'https://github.com/johndoe.png',
    contributions: 10,
    commits_count: 8,
    additions: 250,
    deletions: 100,
    first_contribution: '2024-01-01T08:00:00Z',
    last_contribution: '2024-01-01T12:00:00Z'
  };

  const mockDetailedData: DetailedActivityView = {
    date: mockDate,
    commits: [mockCommit],
    pullRequests: [mockPullRequest],
    contributors: [mockContributor],
    metrics: {
      total_activity: 15,
      lines_added: 250,
      lines_deleted: 100,
      files_changed: 12,
      code_churn: 350
    }
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    date: mockDate,
    activityData: mockActivityData,
    detailedData: mockDetailedData,
    loading: false,
    error: null,
    onLoadDetails: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when open', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      expect(screen.getByText('Git Activity Details')).toBeInTheDocument();
      expect(screen.getByText('Monday, January 1, 2024')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<GitActivityDetailView {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Git Activity Details')).not.toBeInTheDocument();
    });

    it('displays activity summary stats', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      expect(screen.getByText('15')).toBeInTheDocument(); // Total Activity
      expect(screen.getByText('8')).toBeInTheDocument(); // Commits
      expect(screen.getByText('3')).toBeInTheDocument(); // Pull Requests
      expect(screen.getByText('2')).toBeInTheDocument(); // Contributors
    });

    it('displays lines added/deleted when present', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      expect(screen.getByText('250 lines added')).toBeInTheDocument();
      expect(screen.getByText('100 lines deleted')).toBeInTheDocument();
      expect(screen.getByText('12 files changed')).toBeInTheDocument();
    });

    it('shows tabs for different content types', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      expect(screen.getByText('Commits')).toBeInTheDocument();
      expect(screen.getByText('Pull Requests')).toBeInTheDocument();
      expect(screen.getByText('Contributors')).toBeInTheDocument();
    });

    it('shows tab counts', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      // Should show counts in badges next to tab labels
      expect(screen.getByText('1')).toBeInTheDocument(); // Commits count
    });
  });

  describe('Loading States', () => {
    it('shows loading state', () => {
      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={undefined}
          loading={true}
        />
      );

      expect(screen.getByText('Loading detailed information...')).toBeInTheDocument();
    });

    it('shows load details button when no detailed data', () => {
      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={undefined}
          loading={false}
        />
      );

      expect(screen.getByText('Load Detailed Information')).toBeInTheDocument();
    });

    it('calls onLoadDetails when load button is clicked', async () => {
      const onLoadDetails = jest.fn();
      const user = userEvent.setup();

      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={undefined}
          loading={false}
          onLoadDetails={onLoadDetails}
        />
      );

      const loadButton = screen.getByText('Load Detailed Information');
      await user.click(loadButton);

      expect(onLoadDetails).toHaveBeenCalledWith(mockDate);
    });
  });

  describe('Error Handling', () => {
    it('displays error message', () => {
      const errorMessage = 'Failed to load detailed data';

      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={undefined}
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('shows retry button on error', async () => {
      const onLoadDetails = jest.fn();
      const user = userEvent.setup();

      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={undefined}
          error="Failed to load"
          onLoadDetails={onLoadDetails}
        />
      );

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      expect(onLoadDetails).toHaveBeenCalledWith(mockDate);
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      // Initially on commits tab
      expect(screen.getByText('Commits')).toHaveClass('border-blue-500');

      // Switch to pull requests tab
      const prTab = screen.getByText('Pull Requests');
      await user.click(prTab);

      expect(prTab).toHaveClass('border-blue-500');
    });

    it('shows appropriate content for each tab', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      // Commits tab content
      expect(screen.getByText('abc123d')).toBeInTheDocument(); // Short SHA

      // Switch to pull requests tab
      await user.click(screen.getByText('Pull Requests'));
      expect(screen.getByText('#123')).toBeInTheDocument(); // PR number

      // Switch to contributors tab
      await user.click(screen.getByText('Contributors'));
      expect(screen.getByText('John Doe')).toBeInTheDocument(); // Contributor name
    });
  });

  describe('Commit Items', () => {
    it('displays commit information', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      expect(screen.getByText('abc123d')).toBeInTheDocument(); // Short SHA
      expect(screen.getByText('Fix bug in authentication')).toBeInTheDocument(); // Commit message
      expect(screen.getByText('+50')).toBeInTheDocument(); // Additions
      expect(screen.getByText('-20')).toBeInTheDocument(); // Deletions
      expect(screen.getByText('3 files')).toBeInTheDocument(); // Files changed
      expect(screen.getByText('by John Doe')).toBeInTheDocument(); // Author
    });

    it('shows verified badge for verified commits', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('expands commit details when clicked', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      const expandButton = screen.getByTestId('chevron-right-icon').closest('button');
      await user.click(expandButton!);

      expect(screen.getByText('Full Message:')).toBeInTheDocument();
      expect(screen.getByText('This commit fixes the issue with user login')).toBeInTheDocument();
    });

    it('has external link to commit', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      const externalLink = screen.getByTestId('external-link-icon').closest('a');
      expect(externalLink).toHaveAttribute('href', mockCommit.url);
      expect(externalLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Pull Request Items', () => {
    it('displays pull request information', () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      // Switch to pull requests tab
      fireEvent.click(screen.getByText('Pull Requests'));

      expect(screen.getByText('#123')).toBeInTheDocument(); // PR number
      expect(screen.getByText('Add new feature for user management')).toBeInTheDocument(); // PR title
      expect(screen.getByText('merged')).toBeInTheDocument(); // State
      expect(screen.getByText('+200')).toBeInTheDocument(); // Additions
      expect(screen.getByText('-80')).toBeInTheDocument(); // Deletions
      expect(screen.getByText('by janedoe')).toBeInTheDocument(); // Author
    });

    it('shows correct state colors', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      await user.click(screen.getByText('Pull Requests'));

      const stateElement = screen.getByText('merged');
      expect(stateElement).toHaveClass('bg-purple-100');
    });

    it('expands PR details when clicked', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      await user.click(screen.getByText('Pull Requests'));

      const expandButton = screen.getByTestId('chevron-right-icon').closest('button');
      await user.click(expandButton!);

      expect(screen.getByText('Branches:')).toBeInTheDocument();
      expect(screen.getByText('feature/user-management → main')).toBeInTheDocument();
    });
  });

  describe('Contributors Section', () => {
    it('displays contributor information', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      await user.click(screen.getByText('Contributors'));

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('10 contributions')).toBeInTheDocument();
      expect(screen.getByText('+250')).toBeInTheDocument(); // Lines added
      expect(screen.getByText('-100')).toBeInTheDocument(); // Lines deleted
    });

    it('shows contributor avatar', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      await user.click(screen.getByText('Contributors'));

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toHaveAttribute('src', mockContributor.avatar_url);
    });

    it('handles empty contributors list', async () => {
      const user = userEvent.setup();
      const emptyDetailedData = {
        ...mockDetailedData,
        contributors: []
      };

      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={emptyDetailedData}
        />
      );

      await user.click(screen.getByText('Contributors'));

      expect(screen.getByText('No contributors for this day')).toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<GitActivityDetailView {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTestId('x-mark-icon').closest('button');
      await user.click(closeButton!);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<GitActivityDetailView {...defaultProps} onClose={onClose} />);

      // Click on backdrop (the overlay div)
      const backdrop = screen.getByRole('dialog').previousSibling as HTMLElement;
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      // Modal should have proper role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<GitActivityDetailView {...defaultProps} />);

      // Tab navigation should work
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBeTruthy();
    });

    it('traps focus within modal', () => {
      render(<GitActivityDetailView {...defaultProps} />);

      // Focus should be trapped within the modal
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state for commits', () => {
      const emptyDetailedData = {
        ...mockDetailedData,
        commits: []
      };

      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={emptyDetailedData}
        />
      );

      expect(screen.getByText('No commits found for this day')).toBeInTheDocument();
    });

    it('shows empty state for pull requests', async () => {
      const user = userEvent.setup();
      const emptyDetailedData = {
        ...mockDetailedData,
        pullRequests: []
      };

      render(
        <GitActivityDetailView
          {...defaultProps}
          detailedData={emptyDetailedData}
        />
      );

      await user.click(screen.getByText('Pull Requests'));

      expect(screen.getByText('No pull requests found for this day')).toBeInTheDocument();
    });
  });
}); 