/**
 * Main App component with routing and authentication integration.
 * Provides application layout, routing, and authentication context.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import OAuthCallback from './components/auth/OAuthCallback';
import GitHubLoginButton from './components/auth/GitHubLoginButton';
import UserProfile from './components/auth/UserProfile';
import Dashboard from './components/dashboard/Dashboard';
import AdminPage from './components/admin/AdminPage';
import { SettingsProvider } from './contexts/SettingsContext';
import './globals.css';

/**
 * Protected Route Component
 * 
 * Wrapper component that requires authentication to access child routes.
 * Redirects to login page if user is not authenticated.
 * 
 * @param children - Child components to render when authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Public Route Component
 * 
 * Wrapper component for routes that should redirect authenticated users.
 * Redirects to dashboard if user is already authenticated.
 * 
 * @param children - Child components to render when not authenticated
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (state.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Login Page Component
 * 
 * Displays the login interface with GitHub OAuth integration.
 * Includes branding, welcome message, and authentication options.
 */
const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Welcome to OpsSight
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your comprehensive DevOps visibility platform
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-center text-sm text-gray-600 mb-6">
              Sign in with your GitHub account to get started
            </p>
            <div className="flex justify-center">
              <GitHubLoginButton size="lg" variant="primary" />
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our terms of service and privacy policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard Page Component
 * 
 * Main dashboard interface for authenticated users.
 * Uses the comprehensive Dashboard component with layout structure.
 */
const DashboardPage: React.FC = () => {
  return <Dashboard />;
};

/**
 * Profile Page Component
 * 
 * Dedicated user profile page with full user information display.
 */
const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">OpsSight</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <UserProfile variant="compact" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">User Profile</h2>
          <UserProfile variant="full" />
        </div>
      </main>
    </div>
  );
};

/**
 * Main Application Component
 * 
 * Root component that provides routing and authentication context.
 * Handles all application routes and authentication state management.
 */
const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        
        {/* OAuth Callback Route */}
        <Route
          path="/auth/callback"
          element={<OAuthCallback redirectTo="/dashboard" />}
        />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        
        <Route path="/admin" element={<AdminPage />} />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-8">Page not found</p>
                <a
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

/**
 * App Component
 * 
 * Main application wrapper that provides authentication context to the entire app.
 * This is the root component that should be rendered by the React application.
 */
const App: React.FC = () => {
  return (
    <SettingsProvider>
      <ThemeProvider defaultConfig={{ colorMode: 'system' }}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default App; 