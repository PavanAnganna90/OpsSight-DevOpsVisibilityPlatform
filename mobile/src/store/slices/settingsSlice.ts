import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  alerts: boolean;
  deployments: boolean;
  maintenance: boolean;
  security: boolean;
}

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
  autoLock: boolean;
  lockTimeout: number; // in minutes
  biometricAuth: boolean;
  cacheSize: number; // in MB
  syncInterval: number; // in minutes
  offlineMode: boolean;
}

const initialState: SettingsState = {
  theme: 'system',
  language: 'en',
  notifications: {
    pushEnabled: true,
    emailEnabled: true,
    alerts: true,
    deployments: true,
    maintenance: true,
    security: true,
  },
  autoLock: true,
  lockTimeout: 5,
  biometricAuth: false,
  cacheSize: 100,
  syncInterval: 5,
  offlineMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setAutoLock: (state, action: PayloadAction<boolean>) => {
      state.autoLock = action.payload;
    },
    setLockTimeout: (state, action: PayloadAction<number>) => {
      state.lockTimeout = action.payload;
    },
    setBiometricAuth: (state, action: PayloadAction<boolean>) => {
      state.biometricAuth = action.payload;
    },
    setCacheSize: (state, action: PayloadAction<number>) => {
      state.cacheSize = action.payload;
    },
    setSyncInterval: (state, action: PayloadAction<number>) => {
      state.syncInterval = action.payload;
    },
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.offlineMode = action.payload;
    },
    resetSettings: () => initialState,
  },
});

export const {
  setTheme,
  setLanguage,
  updateNotificationSettings,
  setAutoLock,
  setLockTimeout,
  setBiometricAuth,
  setCacheSize,
  setSyncInterval,
  setOfflineMode,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;