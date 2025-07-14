export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api/v1' 
  : 'https://api.opssight.com/api/v1';

export const WEBSOCKET_URL = __DEV__ 
  ? 'ws://localhost:8000/ws' 
  : 'wss://api.opssight.com/ws';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  SETTINGS: 'settings',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  PUSH_TOKEN: 'push_token',
  OFFLINE_ACTIONS: 'offline_actions',
  CACHED_DATA: 'cached_data',
} as const;

export const NOTIFICATION_TYPES = {
  ALERT: 'alert',
  DEPLOYMENT: 'deployment',
  MAINTENANCE: 'maintenance',
  SECURITY: 'security',
  TEAM_UPDATE: 'team_update',
  SYSTEM: 'system',
} as const;

export const ALERT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const ALERT_STATUSES = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  ACKNOWLEDGED: 'acknowledged',
} as const;

export const REFRESH_INTERVALS = {
  DASHBOARD: 30000, // 30 seconds
  ALERTS: 10000, // 10 seconds
  NOTIFICATIONS: 60000, // 1 minute
} as const;

export const CACHE_DURATIONS = {
  SHORT: 300000, // 5 minutes
  MEDIUM: 900000, // 15 minutes
  LONG: 3600000, // 1 hour
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
} as const;

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // 1 second

export const BIOMETRIC_PROMPT_MESSAGES = {
  TITLE: 'Biometric Authentication',
  SUBTITLE: 'Use your fingerprint or face to authenticate',
  DESCRIPTION: 'Place your finger on the fingerprint scanner or look at the camera to authenticate',
  FALLBACK_TITLE: 'Use Passcode',
  CANCEL_TITLE: 'Cancel',
} as const;

export const DEEP_LINK_PREFIXES = [
  'opssight://',
  'https://opssight.com',
  'https://app.opssight.com',
] as const;

export const SUPPORTED_FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt'],
  ARCHIVE: ['zip', 'tar', 'gz'],
} as const;

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export const LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  JA: 'ja',
  ZH: 'zh',
} as const;

export const LOCK_TIMEOUT_OPTIONS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: 'Never', value: -1 },
] as const;

export const SYNC_INTERVAL_OPTIONS = [
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
] as const;