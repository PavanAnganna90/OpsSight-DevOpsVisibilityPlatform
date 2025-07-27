import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsPageContent } from '@/components/settings/SettingsPageContent';

// Mock all dependencies
jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      id: '1',
      userId: 'user1',
      notifications: {
        emailNotifications: true,
        pushNotifications: false,
        deploymentAlerts: true,
        performanceAlerts: false,
        securityAlerts: true,
      },
      display: {
        theme: 'light',
        dashboardLayout: 'grid',
        metricsTimeRange: '24h',
        compactView: false,
      },
      integrations: {
        githubEnabled: true,
        githubRepositories: ['user/repo1', 'user/repo2'],
        slackEnabled: false,
        slackChannel: '#devops',
        jiraEnabled: false,
        jiraProject: 'OPS',
      },
      updatedAt: '2024-01-01T00:00:00Z',
    },
    loading: false,
    error: null,
    updateSettings: jest.fn().mockResolvedValue(undefined),
    resetSettings: jest.fn().mockResolvedValue(undefined),
    clearError: jest.fn(),
  }),
}));

jest.mock('@/components/settings/ThemeSelector', () => ({
  ThemeSelector: () => <div data-testid="theme-selector">Theme Selector</div>,
}));

jest.mock('@/components/settings/ToggleSwitch', () => ({
  ToggleSwitch: ({ label, description, checked, onChange }: any) => (
    <div data-testid={`toggle-${label?.toLowerCase()?.replace(/\s+/g, '-')}`}>
      <label>
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={(e) => onChange?.(e.target.checked)}
        />
        {label}
      </label>
      {description && <p>{description}</p>}
    </div>
  ),
}));

jest.mock('@/components/settings/Toast', () => ({
  Toast: ({ message, isVisible }: any) => (
    isVisible ? <div data-testid="toast">{message}</div> : null
  ),
}));

// Mock icons
jest.mock('@heroicons/react/24/outline', () => {
  const MockIcon = ({ className, ...props }: any) => (
    <svg className={className} {...props} data-testid="mock-icon">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );

  return {
    CogIcon: MockIcon,
    SwatchIcon: MockIcon,
    BellIcon: MockIcon,
    CodeBracketIcon: MockIcon,
    ArrowPathIcon: MockIcon,
  };
});

describe('SettingsPageContent - Direct Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders main settings heading', () => {
    render(<SettingsPageContent />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your DevOps dashboard preferences and integrations.')).toBeInTheDocument();
  });

  test('displays all main sections', () => {
    render(<SettingsPageContent />);
    
    expect(screen.getByText('Theme & Appearance')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('Reset Settings')).toBeInTheDocument();
  });

  test('displays theme selector component', () => {
    render(<SettingsPageContent />);
    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
  });

  test('displays notification toggle switches', () => {
    render(<SettingsPageContent />);
    
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Deployment Alerts')).toBeInTheDocument();
    expect(screen.getByText('Performance Alerts')).toBeInTheDocument();
    expect(screen.getByText('Security Alerts')).toBeInTheDocument();
  });

  test('displays integration options', () => {
    render(<SettingsPageContent />);
    
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Repository management and code tracking')).toBeInTheDocument();
    expect(screen.getByText('2 repositories connected')).toBeInTheDocument();
    
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Team communication and notifications')).toBeInTheDocument();
    
    expect(screen.getByText('JIRA')).toBeInTheDocument();
    expect(screen.getByText('Issue tracking and project management')).toBeInTheDocument();
  });

  test('displays reset settings section', () => {
    render(<SettingsPageContent />);
    
    expect(screen.getByText('Reset Settings')).toBeInTheDocument();
    expect(screen.getByText('Reset all settings to their default values.')).toBeInTheDocument();
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
  });

  test('displays section descriptions', () => {
    render(<SettingsPageContent />);
    
    expect(screen.getByText('Customize the look and feel of your dashboard.')).toBeInTheDocument();
    expect(screen.getByText('Control when and how you receive notifications.')).toBeInTheDocument();
    expect(screen.getByText('Connect your DevOps tools and services.')).toBeInTheDocument();
  });

  test('renders appropriate number of icons', () => {
    render(<SettingsPageContent />);
    
    const icons = screen.getAllByTestId('mock-icon');
    expect(icons.length).toBeGreaterThanOrEqual(5); // Main icon + section icons
  });
}); 