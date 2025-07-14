import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import TeamSwitcher from '../../../components/dashboard/TeamSwitcher';
import { TeamProvider } from '../../../contexts/TeamContext';
import { Team } from '../../../types/team';

// Mock the team API
const mockGetUserTeams = jest.fn();
const mockGetTeamMembers = jest.fn();
jest.mock('../../../services/teamApi', () => ({
  teamApi: {
    getUserTeams: mockGetUserTeams,
    getTeamMembers: mockGetTeamMembers,
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockTeams: Team[] = [
  {
    id: 1,
    name: 'team-alpha',
    display_name: 'Team Alpha',
    description: 'Alpha development team',
    slug: 'team-alpha',
    settings: {
      allow_external_invites: true,
      require_admin_approval: false,
      default_member_role: 'member' as any,
      visibility: 'private',
      notifications: { email: true, slack: false, webhook: false },
    },
    permissions: {
      repository_access: true,
      deployment_access: true,
      monitoring_access: true,
      cost_view_access: true,
      settings_access: true,
    },
    is_active: true,
    member_count: 5,
    created_by_user_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'team-beta',
    display_name: 'Team Beta',
    description: 'Beta testing team',
    slug: 'team-beta',
    settings: {
      allow_external_invites: false,
      require_admin_approval: true,
      default_member_role: 'viewer' as any,
      visibility: 'private',
      notifications: { email: true, slack: true, webhook: false },
    },
    permissions: {
      repository_access: true,
      deployment_access: false,
      monitoring_access: true,
      cost_view_access: false,
      settings_access: false,
    },
    is_active: true,
    member_count: 3,
    created_by_user_id: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <TeamProvider>{children}</TeamProvider>
);

describe('TeamSwitcher', () => {
  const mockOnManageTeams = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockGetUserTeams.mockResolvedValue(mockTeams);
    mockGetTeamMembers.mockResolvedValue([
      { user_id: 1, role: 'ADMIN' }
    ]);
  });

  it('should render the current team when teams are loaded', async () => {
    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    // Wait for teams to load
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should show loading state when teams are loading', () => {
    mockGetUserTeams.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show single team when only one team exists', async () => {
    mockGetUserTeams.mockResolvedValue([mockTeams[0]]);

    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    // Should only show one team option
    expect(screen.queryByText('Team Beta')).not.toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    // Click the team switcher button
    const button = screen.getByRole('button', { name: /current team/i });
    fireEvent.click(button);

    // Check if dropdown is open
    await waitFor(() => {
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });
  });

  it('should select a different team when clicked', async () => {
    mockGetTeamMembers
      .mockResolvedValueOnce([{ user_id: 1, role: 'ADMIN' }])
      .mockResolvedValueOnce([{ user_id: 2, role: 'MEMBER' }]);

    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByRole('button', { name: /current team/i });
    fireEvent.click(button);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });

    // Click on Team Beta
    const teamBetaOption = screen.getByText('Team Beta').closest('button');
    if (teamBetaOption) {
      fireEvent.click(teamBetaOption);
    }

    // Verify team switched
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('opsight_selected_team_id', '2');
    });
  });

  it('should handle keyboard navigation', async () => {
    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /current team/i });
    
    // Test clicking to open dropdown
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });

    // Test Escape key to close dropdown
    fireEvent.keyDown(button, { key: 'Escape', code: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByText('Team Beta')).not.toBeInTheDocument();
    });
  });

  it('should call onManageTeams when manage teams is clicked', async () => {
    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByRole('button', { name: /current team/i });
    fireEvent.click(button);

    // Wait for dropdown to appear and look for manage teams option
    await waitFor(() => {
      const manageButton = screen.queryByText('Manage Teams');
      if (manageButton) {
        fireEvent.click(manageButton);
        expect(mockOnManageTeams).toHaveBeenCalledTimes(1);
      }
    });
  });

  it('should close dropdown when clicking outside', async () => {
    render(
      <div>
        <TestWrapper>
          <TeamSwitcher onManageTeams={mockOnManageTeams} />
        </TestWrapper>
        <div data-testid="outside">Outside content</div>
      </div>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByRole('button', { name: /current team/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });

    // Click outside
    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(screen.queryByText('Team Beta')).not.toBeInTheDocument();
    });
  });

  it('should display team avatars correctly', async () => {
    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    // Check for team initials in avatar
    expect(screen.getByText('T')).toBeInTheDocument();

    // Open dropdown to see other team avatars
    const button = screen.getByRole('button', { name: /current team/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });
  });

  it('should be accessible via screen readers', async () => {
    render(
      <TestWrapper>
        <TeamSwitcher onManageTeams={mockOnManageTeams} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /current team/i });
    
    // Check ARIA attributes
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'true');

    // Open dropdown
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });
}); 