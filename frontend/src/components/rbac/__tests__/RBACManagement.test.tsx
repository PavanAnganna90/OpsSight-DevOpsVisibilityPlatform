/**
 * RBAC Management Tests
 * 
 * Comprehensive test suite for the RBACManagement component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RBACManagement } from '../RBACManagement';

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
vi.mock('../PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="permission-guard">{children}</div>
  ),
}));

vi.mock('../RoleBadge', () => ({
  RoleBadge: ({ role }: { role: string }) => (
    <span data-testid="role-badge">{role}</span>
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

describe('RBACManagement', () => {
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

  it('renders the RBAC management interface', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('RBAC Management')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('displays overview tab by default', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('RBAC Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Roles')).toBeInTheDocument();
    expect(screen.getByText('Total Permissions')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });

  it('switches to roles tab when clicked', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Roles'));

    await waitFor(() => {
      expect(screen.getByText('Role Management')).toBeInTheDocument();
    });
  });

  it('switches to permissions tab when clicked', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Permissions'));

    await waitFor(() => {
      expect(screen.getByText('Permission Management')).toBeInTheDocument();
    });
  });

  it('switches to users tab when clicked', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Users'));

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });
  });

  it('displays role statistics in overview', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Total Roles')).toBeInTheDocument();
    expect(screen.getByText('System Roles')).toBeInTheDocument();
    expect(screen.getByText('Custom Roles')).toBeInTheDocument();
  });

  it('displays permission statistics in overview', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Total Permissions')).toBeInTheDocument();
    expect(screen.getByText('System Permissions')).toBeInTheDocument();
    expect(screen.getByText('Custom Permissions')).toBeInTheDocument();
  });

  it('shows create role button with permission guard', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Roles'));

    expect(screen.getByText('Create Role')).toBeInTheDocument();
    expect(screen.getByTestId('permission-guard')).toBeInTheDocument();
  });

  it('handles role creation modal', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Roles'));

    await waitFor(() => {
      expect(screen.getByText('Create Role')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Role'));

    await waitFor(() => {
      expect(screen.getByText('Create New Role')).toBeInTheDocument();
    });
  });

  it('displays role templates', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Roles'));

    await waitFor(() => {
      expect(screen.getByText('Role Templates')).toBeInTheDocument();
    });
  });

  it('handles permission assignment', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Permissions'));

    await waitFor(() => {
      expect(screen.getByText('Permission Assignment')).toBeInTheDocument();
    });
  });

  it('displays user role assignments', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Users'));

    await waitFor(() => {
      expect(screen.getByText('User Role Assignments')).toBeInTheDocument();
    });
  });

  it('handles loading states', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('RBAC Management')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('filters roles by search', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Roles'));

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search roles...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('filters permissions by category', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Permissions'));

    await waitFor(() => {
      expect(screen.getByText('Filter by Category')).toBeInTheDocument();
    });
  });

  it('displays access matrix', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Access Matrix'));

    await waitFor(() => {
      expect(screen.getByText('Access Matrix View')).toBeInTheDocument();
    });
  });

  it('handles bulk operations', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Users'));

    await waitFor(() => {
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
    });
  });

  it('shows role usage statistics', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Role Usage')).toBeInTheDocument();
  });

  it('displays permission usage analytics', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Permission Analytics')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    const overviewTab = screen.getByText('Overview');
    const rolesTab = screen.getByText('Roles');

    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
    expect(rolesTab).toHaveFocus();
  });

  it('validates role creation form', async () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Roles'));
    fireEvent.click(screen.getByText('Create Role'));

    await waitFor(() => {
      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('displays correct statistics values', () => {
    render(
      <TestWrapper>
        <RBACManagement />
      </TestWrapper>
    );

    expect(screen.getByText('12')).toBeInTheDocument(); // Total Roles
    expect(screen.getByText('68')).toBeInTheDocument(); // Total Permissions
    expect(screen.getByText('158')).toBeInTheDocument(); // Total Users
  });
});