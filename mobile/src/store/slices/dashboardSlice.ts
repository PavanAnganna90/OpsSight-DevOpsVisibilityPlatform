import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DashboardWidget {
  id: string;
  type: 'metrics' | 'alerts' | 'deployments' | 'logs' | 'performance';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
  visible: boolean;
}

interface DashboardState {
  widgets: DashboardWidget[];
  layout: 'grid' | 'list';
  refreshInterval: number;
  lastRefresh: number;
  isRefreshing: boolean;
  selectedTeamId: string | null;
  favoriteWidgets: string[];
}

const initialState: DashboardState = {
  widgets: [],
  layout: 'grid',
  refreshInterval: 30, // seconds
  lastRefresh: 0,
  isRefreshing: false,
  selectedTeamId: null,
  favoriteWidgets: [],
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setWidgets: (state, action: PayloadAction<DashboardWidget[]>) => {
      state.widgets = action.payload;
    },
    addWidget: (state, action: PayloadAction<DashboardWidget>) => {
      state.widgets.push(action.payload);
    },
    updateWidget: (state, action: PayloadAction<{ id: string; updates: Partial<DashboardWidget> }>) => {
      const widget = state.widgets.find(w => w.id === action.payload.id);
      if (widget) {
        Object.assign(widget, action.payload.updates);
      }
    },
    removeWidget: (state, action: PayloadAction<string>) => {
      state.widgets = state.widgets.filter(w => w.id !== action.payload);
    },
    setLayout: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.layout = action.payload;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    setLastRefresh: (state, action: PayloadAction<number>) => {
      state.lastRefresh = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
    setSelectedTeamId: (state, action: PayloadAction<string | null>) => {
      state.selectedTeamId = action.payload;
    },
    toggleFavoriteWidget: (state, action: PayloadAction<string>) => {
      const widgetId = action.payload;
      if (state.favoriteWidgets.includes(widgetId)) {
        state.favoriteWidgets = state.favoriteWidgets.filter(id => id !== widgetId);
      } else {
        state.favoriteWidgets.push(widgetId);
      }
    },
    reorderWidgets: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const widget = state.widgets[fromIndex];
      state.widgets.splice(fromIndex, 1);
      state.widgets.splice(toIndex, 0, widget);
    },
  },
});

export const {
  setWidgets,
  addWidget,
  updateWidget,
  removeWidget,
  setLayout,
  setRefreshInterval,
  setLastRefresh,
  setRefreshing,
  setSelectedTeamId,
  toggleFavoriteWidget,
  reorderWidgets,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;