/**
 * SSO Settings Management Component
 * 
 * Admin interface for configuring SSO providers and settings
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  KeyIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { DashboardCard } from '@/components/layout/DashboardCard';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TextField } from '@/components/ui/TextField';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { AdminOnly } from '@/components/rbac/PermissionGuard';

interface SSOProviderStatus {
  provider_name: string;
  provider_type: 'oauth2' | 'saml';
  enabled: boolean;
  configured: boolean;
  health_status: 'healthy' | 'degraded' | 'error';
  last_checked: string;
  error_message?: string;
  user_count: number;
}

interface SSOHealthCheck {
  overall_status: string;
  enabled_providers: number;
  total_providers: number;
  active_sessions: number;
  providers: SSOProviderStatus[];
  last_updated: string;
}

interface OAuthConfig {
  provider_name: string;
  client_id: string;
  client_secret: string;
  enabled: boolean;
  auto_create_users: boolean;
  default_role: string;
  domain_restriction?: string[];
}

interface SAMLConfig {
  provider_name: string;
  entity_id: string;
  sso_url: string;
  x509_cert: string;
  enabled: boolean;
  auto_create_users: boolean;
  default_role: string;
  domain_restriction?: string[];
}

export function SSOSettings() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<SSOProviderStatus | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [configType, setConfigType] = useState<'oauth2' | 'saml'>('oauth2');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
    show: boolean;
  }>({ message: '', type: 'success', show: false });

  // Fetch SSO health check
  const { data: ssoHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['sso-health'],
    queryFn: async () => {
      const response = await fetch('/api/v1/auth/sso/health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch SSO health');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const getProviderIcon = (provider: string, type: string) => {
    if (type === 'saml') {
      return <KeyIcon className="h-6 w-6 text-purple-500" />;
    }
    
    switch (provider) {
      case 'google':
        return <CloudIcon className="h-6 w-6 text-blue-500" />;
      case 'github':
        return <CogIcon className="h-6 w-6 text-gray-800" />;
      case 'azure':
        return <CloudIcon className="h-6 w-6 text-blue-600" />;
      default:
        return <ShieldCheckIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (healthLoading) {
    return (
      <AdminOnly>
        <div className="min-h-screen bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
              <div className="h-96 bg-gray-800 rounded-lg"></div>
            </div>
          </div>
        </div>
      </AdminOnly>
    );
  }

  return (
    <AdminOnly>
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-500" />
                SSO Settings
              </h1>
              <p className="text-gray-400 mt-2">
                Configure Single Sign-On providers and authentication settings
              </p>
            </div>
            <Button
              onClick={() => setShowConfigModal(true)}
              variant="primary"
              leftIcon={<PlusIcon className="h-5 w-5" />}
            >
              Add Provider
            </Button>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <DashboardCard>
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${getOverallStatusColor(ssoHealth?.overall_status || 'error')}/10`}>
                  <div className={`h-6 w-6 rounded-full ${getOverallStatusColor(ssoHealth?.overall_status || 'error')}`}></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">System Status</p>
                  <p className="text-2xl font-bold text-white capitalize">
                    {ssoHealth?.overall_status || 'Unknown'}
                  </p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="flex items-center">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ShieldCheckIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Active Providers</p>
                  <p className="text-2xl font-bold text-white">
                    {ssoHealth?.enabled_providers || 0}
                  </p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="flex items-center">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Active Sessions</p>
                  <p className="text-2xl font-bold text-white">
                    {ssoHealth?.active_sessions || 0}
                  </p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="flex items-center">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <CogIcon className="h-6 w-6 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Total Providers</p>
                  <p className="text-2xl font-bold text-white">
                    {ssoHealth?.total_providers || 0}
                  </p>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Providers List */}
          <DashboardCard>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">SSO Providers</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Last updated:</span>
                  <span className="text-sm text-gray-300">
                    {ssoHealth?.last_updated ? new Date(ssoHealth.last_updated).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {ssoHealth?.providers.map((provider) => (
                  <div key={provider.provider_name} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getProviderIcon(provider.provider_name, provider.provider_type)}
                        <div>
                          <h3 className="font-medium text-white capitalize">
                            {provider.provider_name.replace('_', ' ')}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {provider.provider_type.toUpperCase()} Provider
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Users</p>
                          <p className="text-white font-medium">{provider.user_count}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <StatusIndicator
                            status={provider.enabled ? "success" : "error"}
                            label={provider.enabled ? "Enabled" : "Disabled"}
                          />
                          <span className={`text-sm ${getHealthStatusColor(provider.health_status)}`}>
                            {provider.health_status}
                          </span>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              setSelectedProvider(provider);
                              setConfigType(provider.provider_type);
                              setShowConfigModal(true);
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedProvider(provider);
                              setShowDeleteModal(true);
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {provider.error_message && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                        <ExclamationTriangleIcon className="h-4 w-4 inline mr-2" />
                        {provider.error_message}
                      </div>
                    )}
                  </div>
                ))}

                {(!ssoHealth?.providers || ssoHealth.providers.length === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No SSO providers configured</p>
                    <p className="text-sm">Add your first provider to get started</p>
                  </div>
                )}
              </div>
            </div>
          </DashboardCard>

          {/* Configuration Modal */}
          <Modal
            isOpen={showConfigModal}
            onClose={() => setShowConfigModal(false)}
            title={selectedProvider ? `Edit ${selectedProvider.provider_name}` : 'Add SSO Provider'}
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Provider Type
                </label>
                <Select
                  value={configType}
                  onChange={setConfigType}
                  options={[
                    { value: 'oauth2', label: 'OAuth 2.0' },
                    { value: 'saml', label: 'SAML' }
                  ]}
                  disabled={!!selectedProvider}
                />
              </div>

              {configType === 'oauth2' && (
                <OAuthConfigForm
                  provider={selectedProvider}
                  onSave={(config) => {
                    showToast('OAuth provider configured successfully', 'success');
                    setShowConfigModal(false);
                    queryClient.invalidateQueries({ queryKey: ['sso-health'] });
                  }}
                  onCancel={() => setShowConfigModal(false)}
                />
              )}

              {configType === 'saml' && (
                <SAMLConfigForm
                  provider={selectedProvider}
                  onSave={(config) => {
                    showToast('SAML provider configured successfully', 'success');
                    setShowConfigModal(false);
                    queryClient.invalidateQueries({ queryKey: ['sso-health'] });
                  }}
                  onCancel={() => setShowConfigModal(false)}
                />
              )}
            </div>
          </Modal>

          {/* Delete Modal */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Delete SSO Provider"
          >
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-red-500/10 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
                <div>
                  <h3 className="text-red-500 font-medium">Confirm Deletion</h3>
                  <p className="text-red-400 text-sm">This action cannot be undone.</p>
                </div>
              </div>

              <div className="text-gray-300">
                <p>Are you sure you want to delete the SSO provider:</p>
                <p className="font-medium text-white mt-2">
                  {selectedProvider?.provider_name.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedProvider?.user_count} users are currently using this provider.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    showToast('Provider deleted successfully', 'success');
                    setShowDeleteModal(false);
                    queryClient.invalidateQueries({ queryKey: ['sso-health'] });
                  }}
                  variant="danger"
                >
                  Delete Provider
                </Button>
              </div>
            </div>
          </Modal>

          {/* Toast */}
          {toast.show && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
          )}
        </div>
      </div>
    </AdminOnly>
  );
}

// OAuth Configuration Form Component
function OAuthConfigForm({ 
  provider, 
  onSave, 
  onCancel 
}: { 
  provider: SSOProviderStatus | null;
  onSave: (config: OAuthConfig) => void;
  onCancel: () => void;
}) {
  const [config, setConfig] = useState<OAuthConfig>({
    provider_name: provider?.provider_name || '',
    client_id: '',
    client_secret: '',
    enabled: provider?.enabled || true,
    auto_create_users: true,
    default_role: 'viewer',
    domain_restriction: []
  });

  return (
    <div className="space-y-4">
      <TextField
        label="Provider Name"
        value={config.provider_name}
        onChange={(value) => setConfig(prev => ({ ...prev, provider_name: value }))}
        placeholder="google, github, azure"
        required
      />
      
      <TextField
        label="Client ID"
        value={config.client_id}
        onChange={(value) => setConfig(prev => ({ ...prev, client_id: value }))}
        required
      />
      
      <TextField
        label="Client Secret"
        value={config.client_secret}
        onChange={(value) => setConfig(prev => ({ ...prev, client_secret: value }))}
        type="password"
        required
      />

      <div className="flex space-x-4">
        <Checkbox
          label="Enabled"
          checked={config.enabled}
          onChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
        />
        <Checkbox
          label="Auto-create users"
          checked={config.auto_create_users}
          onChange={(checked) => setConfig(prev => ({ ...prev, auto_create_users: checked }))}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button onClick={() => onSave(config)} variant="primary">
          Save Configuration
        </Button>
      </div>
    </div>
  );
}

// SAML Configuration Form Component
function SAMLConfigForm({ 
  provider, 
  onSave, 
  onCancel 
}: { 
  provider: SSOProviderStatus | null;
  onSave: (config: SAMLConfig) => void;
  onCancel: () => void;
}) {
  const [config, setConfig] = useState<SAMLConfig>({
    provider_name: provider?.provider_name || '',
    entity_id: '',
    sso_url: '',
    x509_cert: '',
    enabled: provider?.enabled || true,
    auto_create_users: true,
    default_role: 'viewer',
    domain_restriction: []
  });

  return (
    <div className="space-y-4">
      <TextField
        label="Provider Name"
        value={config.provider_name}
        onChange={(value) => setConfig(prev => ({ ...prev, provider_name: value }))}
        placeholder="azure_saml, okta"
        required
      />
      
      <TextField
        label="Entity ID"
        value={config.entity_id}
        onChange={(value) => setConfig(prev => ({ ...prev, entity_id: value }))}
        required
      />
      
      <TextField
        label="SSO URL"
        value={config.sso_url}
        onChange={(value) => setConfig(prev => ({ ...prev, sso_url: value }))}
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          X.509 Certificate
        </label>
        <textarea
          value={config.x509_cert}
          onChange={(e) => setConfig(prev => ({ ...prev, x509_cert: e.target.value }))}
          className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
          required
        />
      </div>

      <div className="flex space-x-4">
        <Checkbox
          label="Enabled"
          checked={config.enabled}
          onChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
        />
        <Checkbox
          label="Auto-create users"
          checked={config.auto_create_users}
          onChange={(checked) => setConfig(prev => ({ ...prev, auto_create_users: checked }))}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button onClick={() => onSave(config)} variant="primary">
          Save Configuration
        </Button>
      </div>
    </div>
  );
}

export default SSOSettings;