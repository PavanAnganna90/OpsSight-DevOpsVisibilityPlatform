import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OfflineAction {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE';
  url: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // time to live in seconds
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  cachedData: CachedData[];
  syncInProgress: boolean;
  lastSync: number;
  autoSync: boolean;
}

const initialState: OfflineState = {
  isOnline: true,
  pendingActions: [],
  cachedData: [],
  syncInProgress: false,
  lastSync: 0,
  autoSync: true,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addPendingAction: (state, action: PayloadAction<Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const newAction: OfflineAction = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
        retryCount: 0,
      };
      state.pendingActions.push(newAction);
    },
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(action => action.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const action_item = state.pendingActions.find(a => a.id === action.payload);
      if (action_item) {
        action_item.retryCount += 1;
      }
    },
    setCachedData: (state, action: PayloadAction<CachedData>) => {
      const existingIndex = state.cachedData.findIndex(item => item.key === action.payload.key);
      if (existingIndex !== -1) {
        state.cachedData[existingIndex] = action.payload;
      } else {
        state.cachedData.push(action.payload);
      }
    },
    removeCachedData: (state, action: PayloadAction<string>) => {
      state.cachedData = state.cachedData.filter(item => item.key !== action.payload);
    },
    clearExpiredCache: (state) => {
      const now = Date.now();
      state.cachedData = state.cachedData.filter(item => {
        const isExpired = now - item.timestamp > item.ttl * 1000;
        return !isExpired;
      });
    },
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
    },
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },
    setAutoSync: (state, action: PayloadAction<boolean>) => {
      state.autoSync = action.payload;
    },
    clearAllPendingActions: (state) => {
      state.pendingActions = [];
    },
    clearAllCachedData: (state) => {
      state.cachedData = [];
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  setCachedData,
  removeCachedData,
  clearExpiredCache,
  setSyncInProgress,
  setLastSync,
  setAutoSync,
  clearAllPendingActions,
  clearAllCachedData,
} = offlineSlice.actions;

export default offlineSlice.reducer;