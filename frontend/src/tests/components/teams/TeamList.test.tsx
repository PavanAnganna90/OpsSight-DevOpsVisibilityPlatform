import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TeamList } from '@/components/teams/TeamList';
import { teamApi } from '@/services/teamApi';
import { Team, TeamFilter } from '@/types/team';

// Mock the team API
vi.mock('@/services/teamApi', () => ({
  teamApi: {
    getTeams: vi.fn(),
  },
}));

// Mock UI components
vi.mock('@/componen../ui', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/StatusIndicator', () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

const mockTeams: Team[] = [
  {
    id: 1,
    name: 'Development Team',
    display_name: 'Development Team',
    description: 'Main development team',
    slug: 'dev-team',
    is_active: true,
    member_count: 5,
    settings: {
      allow_external_invites: true,
      require_admin_approval: false,
      default_member_role: 'MEMBER' as any,
      visibility: 'private',
      notifications: {
        email: true,
        slack: false,
        webhook: false,
      },
    },
    permissions: {
      repository_access: true,
      deployment_access: true,
      monitoring_access: true,
      cost_view_access: false,
      settings_access: true,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Design Team',
    display_name: 'Design Team',
    description: 'UI/UX design team',
    slug: 'design-team',
    is_active: true,
    member_count: 3,
    settings: {
      allow_external_invites: false,
      require_admin_approval: true,
      default_member_role: 'VIEWER' as any,
      visibility: 'public',
      notifications: {
        email: true,
        slack: true,
        webhook: false,
      },
    },
    permissions: {
      repository_access: false,
      deployment_access: false,
      monitoring_access: true,
      cost_view_access: false,
      settings_access: false,
    },
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockProps = {
  onCreateTeam: vi.fn(),
  onEditTeam: vi.fn(),
  onDeleteTeam: vi.fn(),
  onViewTeam: vi.fn(),
};

describe('TeamList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (teamApi.getTeams as any).mockResolvedValue({
      teams: mockTeams,
      total: mockTeams.length,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
  });

  it('renders team list with teams', async () => {
    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
      expect(screen.getByText('Design Team')).toBeInTheDocument();
    });

    expect(screen.getByText('5 members')).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    (teamApi.getTeams as any).mockImplementation(() => new Promise(() => {}));
    render(<TeamList {...mockProps} />);

    expect(screen.getByText('Loading teams...')).toBeInTheDocument();
  });

  it('shows empty state when no teams', async () => {
    (teamApi.getTeams as any).mockResolvedValue({
      teams: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 0,
    });

    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No teams found')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    render(<TeamList {...mockProps} />);

    const searchInput = screen.getByPlaceholderText('Search teams...');
    fireEvent.change(searchInput, { target: { value: 'Development' } });

    await waitFor(() => {
      expect(teamApi.getTeams).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Development',
        })
      );
    });
  });

  it('handles filter changes', async () => {
    render(<TeamList {...mockProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('all');
    fireEvent.change(statusFilter, { target: { value: 'active' } });

    await waitFor(() => {
      expect(teamApi.getTeams).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });
  });

  it('handles pagination', async () => {
    render(<TeamList {...mockProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(teamApi.getTeams).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  it('calls onCreateTeam when create button is clicked', async () => {
    render(<TeamList {...mockProps} />);

    const createButton = screen.getByRole('button', { name: /create team/i });
    fireEvent.click(createButton);

    expect(mockProps.onCreateTeam).toHaveBeenCalled();
  });

  it('calls onEditTeam when edit button is clicked', async () => {
    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(mockProps.onEditTeam).toHaveBeenCalledWith(mockTeams[0]);
  });

  it('calls onViewTeam when view button is clicked', async () => {
    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);

    expect(mockProps.onViewTeam).toHaveBeenCalledWith(mockTeams[0]);
  });

  it('handles API errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (teamApi.getTeams as any).mockRejectedValue(new Error('API Error'));

    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load teams/i)).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('displays team status indicators correctly', async () => {
    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      const statusIndicators = screen.getAllByTestId('status-indicator');
      expect(statusIndicators).toHaveLength(mockTeams.length);
      statusIndicators.forEach(indicator => {
        expect(indicator).toHaveTextContent('active');
      });
    });
  });

  it('shows team visibility badges', async () => {
    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
    });
  });

  it('displays correct member counts', async () => {
    render(<TeamList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('5 members')).toBeInTheDocument();
      expect(screen.getByText('3 members')).toBeInTheDocument();
    });
  });
}); 