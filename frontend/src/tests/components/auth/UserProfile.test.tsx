/**
 * Unit tests for UserProfile component.
 * Tests user display, logout functionality, and accessibility features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfile from '../../../components/auth/UserProfile';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock the auth context
const mockAuthState = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    id: 1,
    github_id: '12345',
    github_username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Test bio description',
    company: 'Test Company',
    location: 'Test Location',
    blog: 'https://test.com',
    is_active: true,
    is_superuser: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    last_login: '2023-06-01T12:00:00Z',
  },
  tokens: {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    token_type: 'bearer',
  },
  error: null,
};

const mockLogout = jest.fn();
const mockLogin = jest.fn();
const mockRefreshToken = jest.fn();
const mockGetCurrentUser = jest.fn();

// Mock the useAuth hook
jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: () => ({
    state: mockAuthState,
    login: mockLogin,
    logout: mockLogout,
    refreshToken: mockRefreshToken,
    getCurrentUser: mockGetCurrentUser,
  }),
}));

describe('UserProfile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  describe('Compact Variant', () => {
    it('should render user information in compact format', () => {
      render(<UserProfile variant="compact" />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByAltText('testuser avatar')).toBeInTheDocument();
    });

    it('should render username when full name is not available', () => {
      const stateWithoutFullName = {
        ...mockAuthState,
        user: { ...mockAuthState.user, full_name: null },
      };

      jest.mocked(require('../../../contexts/AuthContext').useAuth).mockReturnValue({
        state: stateWithoutFullName,
        login: mockLogin,
        logout: mockLogout,
        refreshToken: mockRefreshToken,
        getCurrentUser: mockGetCurrentUser,
      });

      render(<UserProfile variant="compact" />);

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('should show initials when avatar is not available', () => {
      const stateWithoutAvatar = {
        ...mockAuthState,
        user: { ...mockAuthState.user, avatar_url: null },
      };

      jest.mocked(require('../../../contexts/AuthContext').useAuth).mockReturnValue({
        state: stateWithoutAvatar,
        login: mockLogin,
        logout: mockLogout,
        refreshToken: mockRefreshToken,
        getCurrentUser: mockGetCurrentUser,
      });

      render(<UserProfile variant="compact" />);

      expect(screen.getByText('TU')).toBeInTheDocument(); // Test User initials
    });

    it('should show first letter of username when full name is not available', () => {
      const stateMinimal = {
        ...mockAuthState,
        user: { 
          ...mockAuthState.user, 
          avatar_url: null,
          full_name: null 
        },
      };

      jest.mocked(require('../../../contexts/AuthContext').useAuth).mockReturnValue({
        state: stateMinimal,
        login: mockLogin,
        logout: mockLogout,
        refreshToken: mockRefreshToken,
        getCurrentUser: mockGetCurrentUser,
      });

      render(<UserProfile variant="compact" />);

      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of testuser
    });

    it('should handle logout button click', async () => {
      render(<UserProfile variant="compact" showLogout={true} />);

      const logoutButton = screen.getByLabelText('Logout');
      fireEvent.click(logoutButton);

      // Should show confirmation buttons
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Click confirm
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should handle logout cancellation', () => {
      render(<UserProfile variant="compact" showLogout={true} />);

      const logoutButton = screen.getByLabelText('Logout');
      fireEvent.click(logoutButton);

      // Should show confirmation buttons
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Should hide confirmation buttons
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should hide logout button when showLogout is false', () => {
      render(<UserProfile variant="compact" showLogout={false} />);

      expect(screen.queryByLabelText('Logout')).not.toBeInTheDocument();
    });

    it('should handle onClick callback', () => {
      const mockOnClick = jest.fn();
      render(<UserProfile variant="compact" onClick={mockOnClick} />);

      const profileDiv = screen.getByRole('button');
      fireEvent.click(profileDiv);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should handle keyboard navigation', () => {
      const mockOnClick = jest.fn();
      render(<UserProfile variant="compact" onClick={mockOnClick} />);

      const profileDiv = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(profileDiv, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      // Test Space key
      fireEvent.keyDown(profileDiv, { key: ' ' });
      expect(mockOnClick).toHaveBeenCalledTimes(2);

      // Test other key (should not trigger)
      fireEvent.keyDown(profileDiv, { key: 'Tab' });
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper accessibility attributes when clickable', () => {
      const mockOnClick = jest.fn();
      render(<UserProfile variant="compact" onClick={mockOnClick} />);

      const profileDiv = screen.getByRole('button');
      expect(profileDiv).toHaveAttribute('tabIndex', '0');
      expect(profileDiv).toHaveAttribute('aria-label', 'User profile: testuser');
    });
  });

  describe('Full Variant', () => {
    it('should render complete user information', () => {
      render(<UserProfile variant="full" />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('Test bio description')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
      expect(screen.getByText('Test Location')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://test.com')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<UserProfile variant="full" />);

      expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument(); // Member since
      expect(screen.getByText('Jun 1, 2023')).toBeInTheDocument(); // Last login
    });

    it('should handle missing optional fields gracefully', () => {
      const stateMinimal = {
        ...mockAuthState,
        user: {
          ...mockAuthState.user,
          email: null,
          bio: null,
          company: null,
          location: null,
          blog: null,
          last_login: null,
        },
      };

      jest.mocked(require('../../../contexts/AuthContext').useAuth).mockReturnValue({
        state: stateMinimal,
        login: mockLogin,
        logout: mockLogout,
        refreshToken: mockRefreshToken,
        getCurrentUser: mockGetCurrentUser,
      });

      render(<UserProfile variant="full" />);

      // Should still show required fields
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument(); // Member since

      // Should not show optional fields
      expect(screen.queryByText('Email')).not.toBeInTheDocument();
      expect(screen.queryByText('Company')).not.toBeInTheDocument();
      expect(screen.queryByText('Last login')).not.toBeInTheDocument();
    });

    it('should handle invalid dates gracefully', () => {
      const stateInvalidDate = {
        ...mockAuthState,
        user: {
          ...mockAuthState.user,
          created_at: 'invalid-date',
          last_login: null,
        },
      };

      jest.mocked(require('../../../contexts/AuthContext').useAuth).mockReturnValue({
        state: stateInvalidDate,
        login: mockLogin,
        logout: mockLogout,
        refreshToken: mockRefreshToken,
        getCurrentUser: mockGetCurrentUser,
      });

      render(<UserProfile variant="full" />);

      expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });

    it('should handle blog URL with and without protocol', () => {
      render(<UserProfile variant="full" />);

      const blogLink = screen.getByRole('link', { name: 'https://test.com' });
      expect(blogLink).toHaveAttribute('href', 'https://test.com');
      expect(blogLink).toHaveAttribute('target', '_blank');
      expect(blogLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should add protocol to blog URL when missing', () => {
      const stateWithoutProtocol = {
        ...mockAuthState,
        user: { ...mockAuthState.user, blog: 'test.com' },
      };

      jest.mocked(require('../../../contexts/AuthContext').useAuth).mockReturnValue({
        state: stateWithoutProtocol,
        login: mockLogin,
        logout: mockLogout,
        refreshToken: mockRefreshToken,
        getCurrentUser: mockGetCurrentUser,
      });

      render(<UserProfile variant="full" />);

      const blogLink = screen.getByRole('link', { name: 'test.com' });
      expect(blogLink).toHaveAttribute('href', 'https://test.com');
    });

    it('should handle logout flow with confirmation', async () => {
      render(<UserProfile variant="full" showLogout={true} />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      // Should show confirmation
      expect(screen.getByText('Confirm Logout')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Click confirm
      fireEvent.click(screen.getByText('Confirm Logout'));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should show loading state during logout', async () => {
      mockLogout.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<UserProfile variant="full" showLogout={true} />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      fireEvent.click(screen.getByText('Confirm Logout'));

      expect(screen.getByText('Logging out...')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle logout errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogout.mockRejectedValueOnce(new Error('Logout failed'));

      render(<UserProfile variant="compact" />);

      const logoutButton = screen.getByLabelText('Logout');
      fireEvent.click(logoutButton);
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle avatar image load errors', () => {
      render(<UserProfile variant="compact" />);

      const avatarImg = screen.getByAltText('testuser avatar');
      
      // Simulate image load error
      fireEvent.error(avatarImg);

      // Image should be hidden (display: none)
      expect(avatarImg.style.display).toBe('none');
    });
  });

  describe('Props and Customization', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <UserProfile variant="compact" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should stop event propagation for logout button clicks', () => {
      const mockOnClick = jest.fn();
      render(<UserProfile variant="compact" onClick={mockOnClick} />);

      const logoutButton = screen.getByLabelText('Logout');
      fireEvent.click(logoutButton);

      // Parent onClick should not be called
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should return null when user is not available', () => {
      const stateNoUser = {
        ...mockAuthState,
        user: null,
      };

      jest.mocked(require('../../../contexts/AuthContext').useAuth).mockReturnValue({
        state: stateNoUser,
        login: mockLogin,
        logout: mockLogout,
        refreshToken: mockRefreshToken,
        getCurrentUser: mockGetCurrentUser,
      });

      const { container } = render(<UserProfile />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for logout button', () => {
      render(<UserProfile variant="compact" />);

      const logoutButton = screen.getByLabelText('Logout');
      expect(logoutButton).toHaveAttribute('aria-label', 'Logout');
      expect(logoutButton).toHaveAttribute('title', 'Logout');
    });

    it('should maintain focus management during logout confirmation', () => {
      render(<UserProfile variant="compact" />);

      const logoutButton = screen.getByLabelText('Logout');
      fireEvent.click(logoutButton);

      // Confirmation buttons should be focusable
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    it('should have proper heading structure in full variant', () => {
      render(<UserProfile variant="full" />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test User');
    });
  });
}); 