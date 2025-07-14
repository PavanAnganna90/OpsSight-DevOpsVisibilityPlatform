/**
 * Notification Service API
 * 
 * Handles communication with the notification preferences API endpoints.
 */

// Note: Using direct fetch for now - could integrate with existing API utilities later

// Types
export interface NotificationPreference {
  id: number;
  notification_type: string;
  channel: string;
  frequency: string;
  enabled: boolean;
  team_id?: number;
  project_id?: number;
  min_severity?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferenceCreate {
  notification_type: string;
  channel: string;
  frequency: string;
  enabled: boolean;
  timezone: string;
  team_id?: number;
  project_id?: number;
  min_severity?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface NotificationPreferenceUpdate {
  enabled?: boolean;
  frequency?: string;
  min_severity?: string;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string;
}

export interface ChannelOption {
  value: string;
  label: string;
}

export interface TestResult {
  status: string;
  error?: string;
}

// API base URL
const API_BASE = '/api/v1/notifications';

/**
 * Get all notification preferences for the current user
 */
export const getNotificationPreferences = async (): Promise<NotificationPreference[]> => {
  try {
    const response = await fetch(`${API_BASE}/preferences`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    throw error;
  }
};

/**
 * Create a new notification preference
 */
export const createNotificationPreference = async (
  preference: NotificationPreferenceCreate
): Promise<NotificationPreference> => {
  try {
    const response = await fetch(`${API_BASE}/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to create notification preference:', error);
    throw error;
  }
};

/**
 * Update an existing notification preference
 */
export const updateNotificationPreference = async (
  id: number,
  updates: NotificationPreferenceUpdate
): Promise<NotificationPreference> => {
  try {
    const response = await fetch(`${API_BASE}/preferences/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to update notification preference:', error);
    throw error;
  }
};

/**
 * Reset notification preferences to defaults
 */
export const resetNotificationPreferences = async (): Promise<NotificationPreference[]> => {
  try {
    const response = await fetch(`${API_BASE}/preferences/reset`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to reset notification preferences:', error);
    throw error;
  }
};

/**
 * Test a notification channel
 */
export const testNotificationChannel = async (
  channel: string,
  message?: string
): Promise<TestResult> => {
  try {
    const response = await fetch(`${API_BASE}/test/${channel}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message || 'Test notification from OpsSight' }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to test notification channel:', error);
    throw error;
  }
};

/**
 * Get available notification channels
 */
export const getAvailableChannels = async (): Promise<ChannelOption[]> => {
  // Return static data for now - this could be fetched from API
  return [
    { value: 'email', label: 'Email' },
    { value: 'slack', label: 'Slack' },
    { value: 'webhook', label: 'Webhook' }
  ];
};

/**
 * Get available notification types
 */
export const getNotificationTypes = async (): Promise<ChannelOption[]> => {
  // Return static data for now - this could be fetched from API
  return [
    { value: 'alert_triggered', label: 'Alert Triggered' },
    { value: 'alert_resolved', label: 'Alert Resolved' },
    { value: 'pipeline_failed', label: 'Pipeline Failed' },
    { value: 'pipeline_succeeded', label: 'Pipeline Succeeded' },
    { value: 'deployment_started', label: 'Deployment Started' },
    { value: 'deployment_completed', label: 'Deployment Completed' },
    { value: 'security_vulnerability', label: 'Security Vulnerability' },
    { value: 'system_maintenance', label: 'System Maintenance' }
  ];
};

/**
 * Get available notification frequencies
 */
export const getNotificationFrequencies = async (): Promise<ChannelOption[]> => {
  // Return static data for now - this could be fetched from API
  return [
    { value: 'immediate', label: 'Immediate' },
    { value: 'hourly', label: 'Hourly Digest' },
    { value: 'daily', label: 'Daily Digest' },
    { value: 'weekly', label: 'Weekly Digest' }
  ];
}; 