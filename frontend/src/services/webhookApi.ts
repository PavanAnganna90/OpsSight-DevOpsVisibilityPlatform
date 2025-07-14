import { apiClient } from './api';

export interface WebhookConfig {
  id: number;
  name: string;
  source: string;
  url_path: string;
  webhook_url: string;
  is_active: boolean;
  has_secret: boolean;
  has_auth_token: boolean;
  created_at: string;
  updated_at: string;
  last_received: string | null;
  settings: Record<string, any>;
  alert_rules: Record<string, any>;
}

export interface WebhookConfigCreate {
  name: string;
  source: string;
  url_path: string;
  secret?: string;
  auth_token?: string;
  is_active?: boolean;
  settings?: Record<string, any>;
  alert_rules?: Record<string, any>;
}

export interface WebhookConfigUpdate {
  name?: string;
  url_path?: string;
  secret?: string;
  auth_token?: string;
  is_active?: boolean;
  settings?: Record<string, any>;
  alert_rules?: Record<string, any>;
}

export interface WebhookEvent {
  id: number;
  webhook_config_id: number;
  event_id: string | null;
  event_type: string | null;
  method: string;
  payload_size: number | null;
  processed: boolean;
  processing_status: string | null;
  alert_created_id: number | null;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}

export interface WebhookStatistics {
  total_webhooks: number;
  active_webhooks: number;
  total_events: number;
  events_last_24h: number;
  events_last_7d: number;
  successful_events: number;
  failed_events: number;
  success_rate: number;
  alerts_created: number;
  sources: Record<string, number>;
  recent_events: WebhookEvent[];
}

export interface WebhookTestRequest {
  webhook_config_id: number;
  test_payload: Record<string, any>;
  validate_only?: boolean;
}

export interface WebhookTestResponse {
  success: boolean;
  message: string;
  validation_result?: Record<string, any>;
  alert_created?: boolean;
  processing_time?: number;
  errors: string[];
}

export interface AlertIntegrationConfig {
  slack_channels: SlackChannelConfig[];
  prometheus_config: PrometheusConfig;
  grafana_config: GrafanaConfig;
  pagerduty_config: PagerDutyConfig;
}

export interface SlackChannelConfig {
  channel_id: string;
  channel_name: string;
  alert_keywords: string[];
  severity_mapping: Record<string, string>;
  ignore_bots: boolean;
  monitor_threads: boolean;
}

export interface PrometheusConfig {
  severity_label: string;
  instance_label: string;
  job_label: string;
  ignore_resolved: boolean;
  alert_name_field: string;
}

export interface GrafanaConfig {
  dashboard_url_pattern?: string;
  panel_url_pattern?: string;
  severity_mapping: Record<string, string>;
  ignore_test_alerts: boolean;
}

export interface PagerDutyConfig {
  service_mapping: Record<string, string>;
  urgency_mapping: Record<string, string>;
  ignore_acknowledged: boolean;
  sync_status: boolean;
}

class WebhookApiService {
  private baseUrl = '/webhooks';

  // Webhook Configuration Management
  async getWebhooks(): Promise<{ data: WebhookConfig[] }> {
    const response = await apiClient.get(`${this.baseUrl}/configs`);
    return response.data;
  }

  async getWebhook(id: number): Promise<{ data: WebhookConfig }> {
    const response = await apiClient.get(`${this.baseUrl}/configs/${id}`);
    return response.data;
  }

  async createWebhook(config: WebhookConfigCreate): Promise<{ data: WebhookConfig }> {
    const response = await apiClient.post(`${this.baseUrl}/configs`, config);
    return response.data;
  }

  async updateWebhook(id: number, config: WebhookConfigUpdate): Promise<{ data: WebhookConfig }> {
    const response = await apiClient.patch(`${this.baseUrl}/configs/${id}`, config);
    return response.data;
  }

  async deleteWebhook(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/configs/${id}`);
  }

  async toggleWebhook(id: number, active: boolean): Promise<{ data: WebhookConfig }> {
    const response = await apiClient.patch(`${this.baseUrl}/configs/${id}`, { is_active: active });
    return response.data;
  }

  // Webhook Testing
  async testWebhook(id: number, payload: Record<string, any>): Promise<WebhookTestResponse> {
    const testRequest: WebhookTestRequest = {
      webhook_config_id: id,
      test_payload: payload,
    };
    const response = await apiClient.post(`${this.baseUrl}/test`, testRequest);
    return response.data;
  }

  async validateWebhook(id: number, payload: Record<string, any>): Promise<WebhookTestResponse> {
    const testRequest: WebhookTestRequest = {
      webhook_config_id: id,
      test_payload: payload,
      validate_only: true,
    };
    const response = await apiClient.post(`${this.baseUrl}/test`, testRequest);
    return response.data;
  }

  // Webhook Events and Statistics
  async getWebhookEvents(
    webhookId?: number,
    limit?: number,
    processed?: boolean
  ): Promise<{ data: WebhookEvent[] }> {
    const params = new URLSearchParams();
    if (webhookId) params.append('webhook_id', webhookId.toString());
    if (limit) params.append('limit', limit.toString());
    if (processed !== undefined) params.append('processed', processed.toString());

    const response = await apiClient.get(`${this.baseUrl}/events?${params}`);
    return response.data;
  }

  async getStatistics(): Promise<{ data: WebhookStatistics }> {
    const response = await apiClient.get(`${this.baseUrl}/statistics`);
    return response.data;
  }

  // Slack Integration
  async getSlackChannels(): Promise<{ data: SlackChannelConfig[] }> {
    const response = await apiClient.get(`${this.baseUrl}/slack/channels`);
    return response.data;
  }

  async configureSlackChannel(config: SlackChannelConfig): Promise<{ data: SlackChannelConfig }> {
    const response = await apiClient.post(`${this.baseUrl}/slack/channels`, config);
    return response.data;
  }

  async testSlackConnection(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/slack/test`);
    return response.data;
  }

  // Alert Integration Configuration
  async getAlertIntegrationConfig(): Promise<{ data: AlertIntegrationConfig }> {
    const response = await apiClient.get(`${this.baseUrl}/alert-integration/config`);
    return response.data;
  }

  async updateAlertIntegrationConfig(config: Partial<AlertIntegrationConfig>): Promise<{ data: AlertIntegrationConfig }> {
    const response = await apiClient.patch(`${this.baseUrl}/alert-integration/config`, config);
    return response.data;
  }

  // Bulk Operations
  async bulkOperation(
    webhookIds: number[],
    operation: 'activate' | 'deactivate' | 'delete' | 'test',
    testPayload?: Record<string, any>
  ): Promise<{ success: boolean; results: any[] }> {
    const requestData = {
      webhook_ids: webhookIds,
      operation,
      test_payload: testPayload,
    };
    const response = await apiClient.post(`${this.baseUrl}/bulk`, requestData);
    return response.data;
  }

  // Webhook Templates
  async getWebhookTemplates(): Promise<{ data: WebhookTemplate[] }> {
    const response = await apiClient.get(`${this.baseUrl}/templates`);
    return response.data;
  }

  async createWebhookFromTemplate(
    templateName: string,
    config: { name: string; settings?: Record<string, any> }
  ): Promise<{ data: WebhookConfig }> {
    const response = await apiClient.post(`${this.baseUrl}/templates/${templateName}`, config);
    return response.data;
  }

  // Webhook Logs and Debugging
  async getWebhookLogs(
    webhookId: number,
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<{ data: WebhookLogEntry[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get(`${this.baseUrl}/configs/${webhookId}/logs?${params}`);
    return response.data;
  }

  async retryFailedEvent(eventId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/events/${eventId}/retry`);
    return response.data;
  }

  // Webhook URL Generation
  generateWebhookUrl(urlPath: string): string {
    const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
    return `${baseUrl}/api/v1/webhooks${urlPath}`;
  }

  // Webhook Documentation
  async getWebhookDocumentation(source: string): Promise<{ data: WebhookDocumentation }> {
    const response = await apiClient.get(`${this.baseUrl}/documentation/${source}`);
    return response.data;
  }

  // Monitoring and Health
  async checkWebhookHealth(id: number): Promise<{ healthy: boolean; issues: string[] }> {
    const response = await apiClient.get(`${this.baseUrl}/configs/${id}/health`);
    return response.data;
  }

  async getWebhookMetrics(
    id: number,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{ data: WebhookMetrics }> {
    const response = await apiClient.get(`${this.baseUrl}/configs/${id}/metrics?range=${timeRange}`);
    return response.data;
  }
}

// Additional interfaces for extended functionality
export interface WebhookTemplate {
  name: string;
  source: string;
  description: string;
  default_settings: Record<string, any>;
  default_alert_rules: Record<string, any>;
  required_fields: string[];
}

export interface WebhookLogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, any>;
}

export interface WebhookDocumentation {
  source: string;
  description: string;
  setup_instructions: string;
  payload_examples: Record<string, any>[];
  configuration_options: ConfigurationOption[];
}

export interface ConfigurationOption {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default_value?: any;
  examples?: any[];
}

export interface WebhookMetrics {
  requests_per_hour: number[];
  success_rate: number[];
  avg_processing_time: number[];
  alerts_created_per_hour: number[];
  error_distribution: Record<string, number>;
}

// External Webhook and Slack Integration Types
export interface ExternalWebhookEndpoint {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  enabled: boolean;
  alert_types: string[];
  threshold: string;
  retry_config: {
    enabled: boolean;
    max_retries: number;
    retry_delay: number;
  };
  auth_config: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    api_key?: string;
    api_key_header?: string;
  };
  created_at: string;
  updated_at?: string;
  last_used_at?: string;
  success_count: number;
  error_count: number;
}

export interface ExternalWebhookCreate {
  name: string;
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  enabled?: boolean;
  alert_types?: string[];
  threshold?: string;
  retry_config?: {
    enabled: boolean;
    max_retries: number;
    retry_delay: number;
  };
  auth_config?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    api_key?: string;
    api_key_header?: string;
  };
}

export interface ExternalWebhookUpdate {
  name?: string;
  url?: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  enabled?: boolean;
  alert_types?: string[];
  threshold?: string;
  retry_config?: {
    enabled: boolean;
    max_retries: number;
    retry_delay: number;
  };
  auth_config?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    api_key?: string;
    api_key_header?: string;
  };
}

export interface WebhookTestResult {
  success: boolean;
  duration: number;
  response: Record<string, any>;
  timestamp: string;
}

export interface SlackWorkspace {
  id: string;
  user_id: string;
  team_id: string;
  team_name: string;
  bot_user_id?: string;
  connected: boolean;
  connected_at: string;
  channels: SlackChannel[];
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  member_count: number;
  purpose?: string;
}

export interface SlackWorkspaceCreate {
  team_name: string;
  access_token: string;
}

export interface SlackConfig {
  id: string;
  user_id: string;
  workspace_id: string;
  channel_id: string;
  enabled: boolean;
  alert_types: string[];
  threshold: string;
  mention_users: string[];
  custom_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface SlackConfigCreate {
  workspace_id: string;
  channel_id: string;
  enabled?: boolean;
  alert_types?: string[];
  threshold?: string;
  mention_users?: string[];
  custom_message?: string;
}

export interface AlertNotification {
  type: string;
  severity: string;
  message: string;
  source?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// Extended WebhookApiService with external integrations
class ExtendedWebhookApiService extends WebhookApiService {
  
  // External Webhook Endpoints
  async getExternalWebhooks(): Promise<{ data: ExternalWebhookEndpoint[] }> {
    const response = await apiClient.get(`${this.baseUrl}/endpoints`);
    return response.data;
  }

  async createExternalWebhook(webhook: ExternalWebhookCreate): Promise<{ data: ExternalWebhookEndpoint }> {
    const response = await apiClient.post(`${this.baseUrl}/endpoints`, webhook);
    return response.data;
  }

  async updateExternalWebhook(id: string, webhook: ExternalWebhookUpdate): Promise<{ data: ExternalWebhookEndpoint }> {
    const response = await apiClient.put(`${this.baseUrl}/endpoints/${id}`, webhook);
    return response.data;
  }

  async deleteExternalWebhook(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/endpoints/${id}`);
  }

  async testExternalWebhook(id: string): Promise<WebhookTestResult> {
    const response = await apiClient.post(`${this.baseUrl}/endpoints/${id}/test`);
    return response.data;
  }

  // Slack Integration
  async connectSlackWorkspace(workspace: SlackWorkspaceCreate): Promise<{ data: SlackWorkspace }> {
    const response = await apiClient.post(`${this.baseUrl}/slack/connect`, workspace);
    return response.data;
  }

  async getSlackWorkspaces(): Promise<{ data: SlackWorkspace[] }> {
    const response = await apiClient.get(`${this.baseUrl}/slack/workspaces`);
    return response.data;
  }

  async disconnectSlackWorkspace(workspaceId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/slack/workspaces/${workspaceId}`);
  }

  async createSlackConfig(config: SlackConfigCreate): Promise<{ data: SlackConfig }> {
    const response = await apiClient.post(`${this.baseUrl}/slack/configs`, config);
    return response.data;
  }

  async getSlackConfigs(): Promise<{ data: SlackConfig[] }> {
    const response = await apiClient.get(`${this.baseUrl}/slack/configs`);
    return response.data;
  }

  async sendTestAlert(alert: AlertNotification): Promise<{ data: any }> {
    const response = await apiClient.post(`${this.baseUrl}/test-alert`, alert);
    return response.data;
  }

  // Slack OAuth URL generation
  generateSlackOAuthUrl(state?: string): string {
    const clientId = process.env.REACT_APP_SLACK_CLIENT_ID;
    const redirectUri = `${window.location.origin}/integrations/slack/callback`;
    const scope = 'chat:write,channels:read,groups:read';
    
    const params = new URLSearchParams({
      client_id: clientId || '',
      scope,
      redirect_uri: redirectUri,
    });
    
    if (state) {
      params.append('state', state);
    }
    
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }
}

export const webhookApi = new ExtendedWebhookApiService();