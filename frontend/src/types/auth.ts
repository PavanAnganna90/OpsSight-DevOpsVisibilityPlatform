/**
 * Authentication-related TypeScript types.
 */

/**
 * User profile information from GitHub
 */
export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Authentication context interface
 */
export interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Authentication API response types
 */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: GitHubUser;
}

/**
 * Error response from authentication API
 */
export interface AuthError {
  message: string;
  code: string;
  status: number;
} 