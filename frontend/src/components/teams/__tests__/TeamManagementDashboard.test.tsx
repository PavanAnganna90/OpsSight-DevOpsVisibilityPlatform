/**
 * Team Management Dashboard Tests
 * 
 * Comprehensive test suite for the TeamManagementDashboard component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamManagementDashboard } from '../TeamManagementDashboard';

// Mock hooks
vi.mock('@/hooks/useMonitoring', () => ({
  usePerformanceMonitoring: () => ({
    trackUserInteraction: vi.fn(),
  }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock child components
vi.mock('../TeamList', () => ({
  TeamList: ({ onTeamSelect }: { onTeamSelect: (team: any) => void }) => (
    <div data-testid="team-list">
      <button onClick={() => onTeamSelect({ id: '1', name: 'Test Team' })}>
        Select Team
      </button>
    </div>
  ),
}));

vi.mock('../TeamMembersList', () => ({
  TeamMembersList: ({ teamId }: { teamId: string }) => (
    <div data-testid="team-members-list">Members for team {teamId}</div>
  ),
}));

vi.mock('@/components/rbac/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="permission-guard">{children}</div>
  ),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('TeamManagementDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('renders the dashboard with all tabs', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Team Management')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays overview tab by default', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Team Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total Teams')).toBeInTheDocument();
    expect(screen.getByText('Total Members')).toBeInTheDocument();
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
  });

  it('switches to teams tab when clicked', async () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Teams'));

    await waitFor(() => {
      expect(screen.getByTestId('team-list')).toBeInTheDocument();
    });
  });

  it('switches to members tab when clicked', async () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Members'));

    await waitFor(() => {
      expect(screen.getByText('All Team Members')).toBeInTheDocument();
    });
  });

  it('handles team selection', async () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Teams'));

    await waitFor(() => {
      expect(screen.getByTestId('team-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select Team'));

    await waitFor(() => {
      expect(screen.getByText('Members for team 1')).toBeInTheDocument();
    });
  });

  it('renders statistics with correct labels', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Total Teams')).toBeInTheDocument();
    expect(screen.getByText('Total Members')).toBeInTheDocument();
    expect(screen.getByText('Active Teams')).toBeInTheDocument();
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
  });

  it('displays recent activity section', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('shows permission-guarded actions', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    expect(screen.getAllByTestId('permission-guard')).toHaveLength(2);
  });

  it('handles loading states', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    // Check for loading indicators
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error states', async () => {
    // Mock error in data loading
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Component should handle errors gracefully
      expect(screen.getByText('Team Management')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('renders team distribution chart', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Team Distribution')).toBeInTheDocument();
  });

  it('renders member activity chart', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Member Activity')).toBeInTheDocument();
  });

  it('allows tab navigation via keyboard', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    const overviewTab = screen.getByText('Overview');
    const teamsTab = screen.getByText('Teams');

    expect(overviewTab).toBeInTheDocument();
    expect(teamsTab).toBeInTheDocument();

    // Test keyboard navigation
    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
    expect(teamsTab).toHaveFocus();
  });

  it('displays correct team statistics', () => {
    render(
      <TestWrapper>
        <TeamManagementDashboard />
      </TestWrapper>
    );

    // Check for numeric values in statistics
    expect(screen.getByText('15')).toBeInTheDocument(); // Total Teams
    expect(screen.getByText('127')).toBeInTheDocument(); // Total Members
    expect(screen.getByText('12')).toBeInTheDocument(); // Active Teams
    expect(screen.getByText('8')).toBeInTheDocument(); // Pending Invitations
  });
});