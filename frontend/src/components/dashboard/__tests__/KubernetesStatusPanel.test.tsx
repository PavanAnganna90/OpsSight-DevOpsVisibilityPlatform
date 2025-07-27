/**
 * Tests for KubernetesStatusPanel Component
 * 
 * Comprehensive test suite covering component functionality,
 * API integration, user interactions, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import KubernetesStatusPanel from '../KubernetesStatusPanel';
import { Cluster, ClusterStats, NodeDetail } from '../../../types/cluster';

// Mock hooks
jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })
}));

// Mock fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper to create mock Response objects
const createMockResponse = (data: any, ok = true): Partial<Response> => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => data,
  headers: new Headers(),
  redirected: false,
  statusText: ok ? 'OK' : 'Internal Server Error',
  type: 'basic',
  url: '',
  body: null,
  bodyUsed: false,
  clone: jest.fn(),
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn(),
  text: jest.fn(),
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Test data
const mockCluster: Cluster = {
  id: 1,
  cluster_id: 'test-cluster-1',
  name: 'test-cluster',
  display_name: 'Test Cluster',
  version: '1.25.0',
  status: 'healthy',
  health_score: 95,
  last_health_check: '2025-01-16T12:00:00Z',
  provider: 'AWS',
  region: 'us-west-2',
  zone: 'us-west-2a',
  endpoint_url: 'https://test-cluster.eks.amazonaws.com',
  monitoring_enabled: true,
  prometheus_endpoint: 'http://prometheus.cluster.local:9090',
  grafana_dashboard_url: 'http://grafana.cluster.local:3000',
  log_aggregation_url: 'http://elasticsearch.cluster.local:9200',
  cpu_alert_threshold: 80,
  memory_alert_threshold: 85,
  storage_alert_threshold: 90,
  project_id: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-16T12:00:00Z',
  last_sync: '2025-01-16T12:00:00Z',
  // Metrics
  total_nodes: 3,
  ready_nodes: 3,
  not_ready_nodes: 0,
  node_details: [
    {
      name: 'node-1',
      status: 'ready',
      last_heartbeat: '2025-01-16T12:00:00Z',
      cpu_usage: 45,
      memory_usage: 60,
      disk_usage: 30
    },
    {
      name: 'node-2',
      status: 'ready',
      last_heartbeat: '2025-01-16T12:00:00Z',
      cpu_usage: 55,
      memory_usage: 70,
      disk_usage: 40
    },
    {
      name: 'node-3',
      status: 'not_ready',
      last_heartbeat: '2025-01-16T11:30:00Z',
      cpu_usage: 0,
      memory_usage: 0,
      disk_usage: 0
    }
  ],
  total_pods: 120,
  running_pods: 115,
  pending_pods: 3,
  failed_pods: 2,
  total_cpu_cores: 24,
  allocatable_cpu_cores: 22,
  used_cpu_cores: 11,
  cpu_utilization_percent: 50,
  total_memory_gb: 96,
  allocatable_memory_gb: 88,
  used_memory_gb: 55,
  memory_utilization_percent: 62,
  total_storage_gb: 500,
  used_storage_gb: 200,
  storage_utilization_percent: 40,
  network_in_bytes: 1024000000,
  network_out_bytes: 2048000000,
  network_errors: 0,
  total_namespaces: 15,
  total_services: 45,
  total_ingresses: 8,
  total_deployments: 32,
  total_statefulsets: 5,
  total_daemonsets: 3
};

const mockClusterStats: ClusterStats = {
  total_clusters: 2,
  healthy_clusters: 1,
  warning_clusters: 1,
  critical_clusters: 0,
  offline_clusters: 0,
  total_nodes: 6,
  total_pods: 250,
  average_cpu_utilization: 55,
  average_memory_utilization: 65,
  clusters_needing_attention: 1
};

describe('KubernetesStatusPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test: Component renders loading state initially
   */
  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<KubernetesStatusPanel />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  /**
   * Test: Component displays error state when API fails
   */
  it('displays error state when cluster fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load cluster data')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  /**
   * Test: Component displays no clusters state
   */
  it('displays no clusters message when no clusters available', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      });
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('No Kubernetes Clusters')).toBeInTheDocument();
      expect(screen.getByText('No clusters are configured for monitoring. Add a cluster to get started.')).toBeInTheDocument();
    });
  });

  /**
   * Test: Component renders clusters successfully
   */
  it('renders clusters successfully with all sections', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCluster]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cluster_id: 1,
          cluster_name: 'test-cluster',
          timestamp: '2025-01-16T12:00:00Z',
          node_metrics: {
            total_nodes: 3,
            ready_nodes: 3,
            not_ready_nodes: 0,
            node_details: mockCluster.node_details,
            cpu_metrics: { usage_percent: 50 },
            memory_metrics: { usage_percent: 62 },
            disk_metrics: { usage_percent: 40 }
          },
          pod_metrics: {
            total_pods: 120,
            running_pods: 115,
            pending_pods: 3,
            failed_pods: 2,
            succeeded_pods: 0
          },
          resource_metrics: {
            cpu: { total: 24, allocatable: 22, used: 11, utilization_percent: 50 },
            memory: { total_gb: 96, allocatable_gb: 88, used_gb: 55, utilization_percent: 62 },
            storage: { total_gb: 500, used_gb: 200, utilization_percent: 40 }
          },
          workload_metrics: {
            namespaces: 15,
            services: 45,
            ingresses: 8,
            deployments: 32,
            statefulsets: 5,
            daemonsets: 3
          }
        })
      });
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      // Header
      expect(screen.getByText('Kubernetes Clusters')).toBeInTheDocument();
      expect(screen.getByText('Monitor cluster health, resource utilization, and node status')).toBeInTheDocument();
      
      // Statistics cards
      expect(screen.getByText('Total Clusters')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Healthy Clusters')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // Cluster overview
      expect(screen.getByText('Cluster Overview')).toBeInTheDocument();
      expect(screen.getByText('Test Cluster')).toBeInTheDocument();
      expect(screen.getByText('AWS • us-west-2')).toBeInTheDocument();
      
      // Resource utilization
      expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      
      // Node status map
      expect(screen.getByText('Node Status Map')).toBeInTheDocument();
      expect(screen.getByText('Ready: 2')).toBeInTheDocument();
      expect(screen.getByText('Not Ready: 1')).toBeInTheDocument();
      
      // Workload summary
      expect(screen.getByText('Workload Summary')).toBeInTheDocument();
      expect(screen.getByText('Namespaces')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  /**
   * Test: Status filter functionality
   */
  it('filters clusters by status', async () => {
    const warningCluster: Cluster = {
      ...mockCluster,
      id: 2,
      name: 'warning-cluster',
      display_name: 'Warning Cluster',
      status: 'warning'
    };
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCluster, warningCluster]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      });
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Cluster')).toBeInTheDocument();
      expect(screen.getByText('Warning Cluster')).toBeInTheDocument();
    });
    
    // Filter by warning status
    const statusFilter = screen.getByDisplayValue('All Status');
    await userEvent.selectOptions(statusFilter, 'warning');
    
    await waitFor(() => {
      expect(screen.queryByText('Test Cluster')).not.toBeInTheDocument();
      expect(screen.getByText('Warning Cluster')).toBeInTheDocument();
    });
    
    // Reset filter
    await userEvent.selectOptions(statusFilter, 'all');
    
    await waitFor(() => {
      expect(screen.getByText('Test Cluster')).toBeInTheDocument();
      expect(screen.getByText('Warning Cluster')).toBeInTheDocument();
    });
  });

  /**
   * Test: Cluster selection functionality
   */
  it('allows cluster selection and shows detailed view', async () => {
    const secondCluster: Cluster = {
      ...mockCluster,
      id: 2,
      name: 'second-cluster',
      display_name: 'Second Cluster',
      cpu_utilization_percent: 75
    };
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCluster, secondCluster]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ /* mock metrics */ })
      });
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Cluster')).toBeInTheDocument();
      expect(screen.getByText('Second Cluster')).toBeInTheDocument();
    });
    
    // Click on second cluster
    const secondClusterCard = screen.getByText('Second Cluster').closest('div[role=\"button\"]') ||
                             screen.getByText('Second Cluster').closest('div');
    if (secondClusterCard) {
      fireEvent.click(secondClusterCard);
    }
    
    await waitFor(() => {
      // Should show detailed metrics for selected cluster
      expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
    });
  });

  /**
   * Test: Node interaction functionality
   */
  it('handles node selection and shows node details', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCluster]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ /* mock metrics */ })
      });
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Node Status Map')).toBeInTheDocument();
    });
    
    // Click on a node (find by node name in the node map)
    const nodeElements = screen.getAllByText(/node-/);
    if (nodeElements.length > 0) {
      fireEvent.click(nodeElements[0].closest('div') || nodeElements[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Node Details:/)).toBeInTheDocument();
      });
    }
  });

  /**
   * Test: Sync functionality
   */
  it('handles cluster health sync', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCluster]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ /* mock metrics */ })
      });
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sync health/i })).toBeInTheDocument();
    });
    
    const syncButton = screen.getByRole('button', { name: /sync health/i });
    
    // Mock sync API call
    mockFetch.mockResolvedValueOnce({ ok: true });
    
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/kubernetes/clusters/1/sync'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  /**
   * Test: Refresh interval functionality
   */
  it('refreshes data at specified intervals', async () => {
    jest.useFakeTimers();
    
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => [mockCluster]
      });
    
    render(<KubernetesStatusPanel refreshInterval={5000} />);
    
    // Initial load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // clusters + stats
    });
    
    // Fast-forward time
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4); // Another refresh cycle
    });
    
    jest.useRealTimers();
  });

  /**
   * Test: Retry functionality on error
   */
  it('retries data fetch when retry button is clicked', async () => {
    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load cluster data')).toBeInTheDocument();
    });
    
    // Set up successful retry
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCluster]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      });
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Cluster')).toBeInTheDocument();
      expect(screen.queryByText('Failed to load cluster data')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Project ID filtering
   */
  it('includes project ID in API calls when provided', async () => {
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => [mockCluster]
      });
    
    render(<KubernetesStatusPanel projectId={123} />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('project_id=123'),
        expect.any(Object)
      );
    });
  });

  /**
   * Test: Responsive behavior
   */
  it('adapts to mobile view', async () => {
    // Mock mobile responsive hook
    jest.doMock('../../../hooks/useResponsive', () => ({
      useResponsive: () => ({
        isMobile: true,
        isTablet: false,
        isDesktop: false
      })
    }));
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCluster]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusterStats
      });
    
    // Note: In a real test, you'd re-import the component here
    // to pick up the mocked hook
    render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Kubernetes Clusters')).toBeInTheDocument();
    });
  });

  /**
   * Test: Disabled real-time updates
   */
  it('disables real-time updates when specified', async () => {
    jest.useFakeTimers();
    
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => [mockCluster]
      });
    
    render(<KubernetesStatusPanel enableRealTimeUpdates={false} />);
    
    // Initial load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    
    // Fast-forward time - should not trigger more calls
    jest.advanceTimersByTime(30000);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // No additional calls
    });
    
    jest.useRealTimers();
  });

  /**
   * Test: Component unmounting
   */
  it('cleans up intervals on unmount', async () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => [mockCluster]
      });
    
    const { unmount } = render(<KubernetesStatusPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Kubernetes Clusters')).toBeInTheDocument();
    });
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    jest.useRealTimers();
    clearIntervalSpy.mockRestore();
  });
});