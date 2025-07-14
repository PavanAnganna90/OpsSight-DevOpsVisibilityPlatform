/**
 * Alert Types
 * 
 * Type definitions for the alert system including alerts,
 * categorization, lifecycle management, and API responses.
 */

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';
export type AlertChannel = 'SLACK' | 'WEBHOOK' | 'EMAIL' | 'SMS';
export type AlertCategory = 'INFRASTRUCTURE' | 'PERFORMANCE' | 'SECURITY' | 'AVAILABILITY' | 'DEPLOYMENT' | 'MONITORING' | 'NETWORK' | 'DATABASE' | 'APPLICATION' | 'GENERAL';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  channel: AlertChannel;
  source?: string;
  external_id?: string;
  project_id?: number;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
  resolved_by?: string;
  tags?: string[];
  priority_boost?: number;
}

export interface AlertFilter {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  category?: AlertCategory[];
  channel?: AlertChannel[];
  source?: string[];
  project_id?: number;
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
  tags?: string[];
}

export interface AlertSortOptions {
  field: 'created_at' | 'updated_at' | 'severity' | 'status' | 'category';
  direction: 'asc' | 'desc';
}

export interface AlertSummary {
  total: number;
  by_severity: Record<AlertSeverity, number>;
  by_status: Record<AlertStatus, number>;
  by_category: Record<AlertCategory, number>;
  by_channel: Record<AlertChannel, number>;
  recent_alerts: Alert[];
  critical_count: number;
  unresolved_count: number;
}

export interface AlertMetrics {
  total_count: number;
  status_counts: Record<AlertStatus, number>;
  severity_counts: Record<AlertSeverity, number>;
  category_counts: Record<AlertCategory, number>;
  source_counts: Record<string, number>;
  avg_resolution_time_minutes?: number;
  avg_acknowledgment_time_minutes?: number;
  escalation_count: number;
  suppression_count: number;
  top_sources: Array<{
    source: string;
    count: number;
  }>;
  timeline: Array<{
    timestamp: string;
    event_type: string;
    count: number;
  }>;
}

export interface AlertListResponse {
  alerts: Alert[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
  summary: AlertSummary;
}

export interface AlertActionRequest {
  action: 'acknowledge' | 'resolve' | 'suppress';
  user_id?: string;
  comment?: string;
}

export interface AlertActionResponse {
  success: boolean;
  message: string;
  alert: Alert;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: AlertChannel[];
  severity_threshold: AlertSeverity;
  quiet_hours?: {
    start: string;
    end: string;
  };
  rate_limit?: {
    max_per_hour: number;
    cooldown_minutes: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  category: AlertCategory;
  severity: AlertSeverity;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  conditions: {
    severity?: AlertSeverity[];
    category?: AlertCategory[];
    time_threshold_minutes: number;
  };
  actions: {
    escalate_to?: string[];
    notify_channels?: AlertChannel[];
    increase_severity?: boolean;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Lifecycle management types
export type LifecycleStage = 'RECEIVED' | 'CATEGORIZED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'SUPPRESSED';

export interface LifecycleTransition {
  id: string;
  alert_id: string;
  from_stage: LifecycleStage;
  to_stage: LifecycleStage;
  reason?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AlertWithLifecycle extends Alert {
  current_stage: LifecycleStage;
  lifecycle_history: LifecycleTransition[];
}

// Component-specific types
export interface AlertCardProps {
  alert: Alert;
  onAction?: (alertId: string, action: string) => void;
  compact?: boolean;
  showActions?: boolean;
}

export interface AlertListProps {
  alerts: Alert[];
  loading?: boolean;
  error?: string;
  onFilter?: (filter: AlertFilter) => void;
  onSort?: (sort: AlertSortOptions) => void;
  onAction?: (alertId: string, action: string) => void;
  onRefresh?: () => void;
}

export interface AlertDetailProps {
  alert: AlertWithLifecycle;
  onAction?: (alertId: string, action: string) => void;
  onClose?: () => void;
} 