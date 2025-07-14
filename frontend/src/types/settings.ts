/**
 * User notification preferences
 */
export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  deploymentAlerts: boolean;
  performanceAlerts: boolean;
  securityAlerts: boolean;
}

/**
 * User display preferences
 */
export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  dashboardLayout: 'grid' | 'list';
  metricsTimeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  compactView: boolean;
}

/**
 * User API integration settings
 */
export interface IntegrationSettings {
  githubEnabled: boolean;
  githubRepositories: string[];
  slackEnabled: boolean;
  slackChannel: string;
  jiraEnabled: boolean;
  jiraProject: string;
}

/**
 * Complete user settings
 */
export interface UserSettings {
  id: string;
  userId: string;
  notifications: NotificationSettings;
  display: DisplaySettings;
  integrations: IntegrationSettings;
  updatedAt: string;
}

/**
 * Settings update request type
 */
export type UpdateSettingsRequest = Partial<{
  notifications: Partial<NotificationSettings>;
  display: Partial<DisplaySettings>;
  integrations: Partial<IntegrationSettings>;
}>;

/**
 * Settings context state
 */
export interface SettingsState {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
}

/**
 * Settings context interface
 */
export interface SettingsContextType extends SettingsState {
  updateSettings: (updates: UpdateSettingsRequest) => Promise<void>;
  resetSettings: () => Promise<void>;
  clearError: () => void;
} 