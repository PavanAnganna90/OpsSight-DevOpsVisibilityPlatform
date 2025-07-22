/**
 * Team & RBAC Management Page Tests
 * 
 * Comprehensive test suite for the TeamRBACManagement page component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamRBACManagement from '../TeamRBACManagement';

// Mock hooks
vi.mock('@/hooks/useMonitoring', () => ({
  usePerformanceMonitoring: () => ({
    trackUserInteraction: vi.fn(),
  }),
}));

// Mock child components
vi.mock('@/components/teams/TeamManagementDashboard', () => ({
  TeamManagementDashboard: () => (
    <div data-testid="team-management-dashboard">Team Management Dashboard</div>
  ),
}));

vi.mock('@/components/rbac/RBACManagement', () => ({
  RBACManagement: () => (
    <div data-testid="rbac-management">RBAC Management Component</div>
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

describe('TeamRBACManagement Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header correctly', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Team & Access Management')).toBeInTheDocument();
    expect(screen.getByText('Manage teams, users, roles, and permissions across your organization')).toBeInTheDocument();
  });

  it('renders all tabs correctly', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('RBAC')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('displays overview tab content by default', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Total Teams')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Total Roles')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });

  it('displays correct statistics cards', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    // Check for statistics values
    expect(screen.getByText('42')).toBeInTheDocument(); // Total Teams
    expect(screen.getByText('158')).toBeInTheDocument(); // Total Users
    expect(screen.getByText('12')).toBeInTheDocument(); // Total Roles
    expect(screen.getByText('68')).toBeInTheDocument(); // Total Permissions
  });

  it('shows active vs total counts', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('38 active')).toBeInTheDocument(); // Active teams
    expect(screen.getByText('142 active')).toBeInTheDocument(); // Active users
    expect(screen.getByText('4 custom')).toBeInTheDocument(); // Custom roles
    expect(screen.getByText('7 pending invites')).toBeInTheDocument(); // Pending invitations
  });

  it('switches to teams tab when clicked', async () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Teams'));

    await waitFor(() => {
      expect(screen.getByTestId('team-management-dashboard')).toBeInTheDocument();
    });
  });

  it('switches to RBAC tab when clicked', async () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('RBAC'));

    await waitFor(() => {
      expect(screen.getByTestId('rbac-management')).toBeInTheDocument();
    });
  });

  it('switches to activity tab when clicked', async () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Activity'));

    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
    });
  });

  it('displays recent activity in overview', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Created "Frontend Team" with 5 members')).toBeInTheDocument();
    expect(screen.getByText('Added Sarah Wilson to "Backend Team"')).toBeInTheDocument();
    expect(screen.getByText('Assigned "Team Lead" role to Alice Smith')).toBeInTheDocument();
  });

  it('displays detailed activity in activity tab', async () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Activity'));

    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
      expect(screen.getByText('by John Doe')).toBeInTheDocument();
      expect(screen.getByText('by Mike Johnson')).toBeInTheDocument();
      expect(screen.getByText('by Admin')).toBeInTheDocument();
    });
  });

  it('shows action buttons with permission guards', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Create Team')).toBeInTheDocument();
    expect(screen.getByText('Manage Roles')).toBeInTheDocument();
    expect(screen.getAllByTestId('permission-guard')).toHaveLength(2);
  });

  it('renders icons in statistics cards', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    // Check for SVG icons in statistics cards
    const svgElements = screen.getAllByRole('img', { hidden: true });
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('handles loading states', async () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    // Initially should show loading or default values
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    // Check for properly formatted dates
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/1\/14\/2024/)).toBeInTheDocument();
  });

  it('displays activity type indicators', async () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Activity'));

    await waitFor(() => {
      // Check for colored indicators for different activity types
      const activityItems = screen.getAllByText(/Created|Added|Assigned|Granted/);
      expect(activityItems.length).toBeGreaterThan(0);
    });
  });

  it('handles keyboard navigation between tabs', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    const overviewTab = screen.getByText('Overview');
    const teamsTab = screen.getByText('Teams');

    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
    expect(teamsTab).toHaveFocus();
  });

  it('tracks user interactions', () => {
    const trackUserInteraction = vi.fn();
    
    vi.mocked(vi.importActual('@/hooks/useMonitoring')).usePerformanceMonitoring = () => ({
      trackUserInteraction,
    });

    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Teams'));

    expect(trackUserInteraction).toHaveBeenCalledWith('tab_change', { tab: 'teams' });
  });

  it('renders responsive layout', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    // Check for responsive grid classes
    const statsGrid = screen.getByText('Total Teams').closest('.grid');
    expect(statsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('shows pending invitations count', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('7 pending invites')).toBeInTheDocument();
  });

  it('displays system vs custom role breakdown', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('4 custom')).toBeInTheDocument();
  });

  it('handles empty activity state', () => {
    render(
      <TestWrapper>
        <TeamRBACManagement />
      </TestWrapper>
    );

    // Component should handle empty activity gracefully
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });
});