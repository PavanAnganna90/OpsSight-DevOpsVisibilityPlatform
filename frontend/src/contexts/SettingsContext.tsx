'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * Dashboard settings context for user preferences.
 */
export interface PanelVisibility {
  systemPulse: boolean;
  commandCenter: boolean;
  actionInsights: boolean;
  alerts: boolean;
  teams: boolean;
  infrastructure: boolean;
}

export interface NotificationPrefs {
  muteAlerts: boolean;
  alertThreshold: number;
}

export interface SettingsContextType {
  panelVisibility: PanelVisibility;
  setPanelVisibility: (v: PanelVisibility) => void;
  refreshInterval: number;
  setRefreshInterval: (n: number) => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: (p: NotificationPrefs) => void;
}

const defaultPanelVisibility: PanelVisibility = {
  systemPulse: true,
  commandCenter: true,
  actionInsights: true,
  alerts: true,
  teams: true,
  infrastructure: true,
};

const defaultNotificationPrefs: NotificationPrefs = {
  muteAlerts: false,
  alertThreshold: 1,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [panelVisibility, setPanelVisibility] = useState<PanelVisibility>(defaultPanelVisibility);
  const [refreshInterval, setRefreshInterval] = useState<number>(0);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);

  return (
    <SettingsContext.Provider value={{
      panelVisibility,
      setPanelVisibility,
      refreshInterval,
      setRefreshInterval,
      notificationPrefs,
      setNotificationPrefs,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Hook to use dashboard settings context.
 */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
} 