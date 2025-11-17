/**
 * Repository Manager Component
 * 
 * Comprehensive repository management interface for discovering, connecting,
 * and monitoring GitHub repositories and other version control systems
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language?: string;
  visibility: string;
  stargazers_count: number;
  forks_count: number;
  has_actions: boolean;
  updated_at: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

interface RepositoryConnection {
  id: string;
  name: string;
  connection_type: string;
  repository_url: string;
  status: 'active' | 'inactive' | 'error' | 'syncing' | 'disconnected';
  last_sync?: string;
  created_at: string;
  metadata: Record<string, any>;
}

interface RepositoryStatus {
  connection_id: string;
  name: string;
  status: string;
  health_metrics: {
    health_score: number;
    commit_frequency: number;
    ci_success_rate: number;
    security_alerts: number;
    code_quality_score: number;
  };
  recent_activity: Array<{
    type: string;
    message?: string;
    title?: string;
    author: string;
    timestamp: string;
  }>;
  ci_status: {
    status: string;
    last_build: string;
    success_rate: number;
  };
  security_status: {
    security_alerts: number;
    security_score: number;
  };
}

const RepositoryManager: React.FC = () => {
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('discover');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [connections, setConnections] = useState<RepositoryConnection[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<RepositoryConnection | null>(null);
  const [repositoryStatus, setRepositoryStatus] = useState<RepositoryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    visibility: 'all',
    language: 'all',
    hasActions: false
  });

  // Load data on component mount
  useEffect(() => {
    loadConnections();
  }, []);

  const discoverRepositories = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual API
      const mockRepos: Repository[] = [
        {
          id: 1,
          name: 'opssight-platform',
          full_name: 'company/opssight-platform',
          description: 'DevOps monitoring and automation platform',
          html_url: 'https://github.com/company/opssight-platform',
          clone_url: 'https://github.com/company/opssight-platform.git',
          default_branch: 'main',
          language: 'TypeScript',
          visibility: 'private',
          stargazers_count: 25,
          forks_count: 8,
          has_actions: true,
          updated_at: '2024-01-16T10:30:00Z',
          permissions: { admin: true, push: true, pull: true }
        },
        {
          id: 2,
          name: 'web-api',
          full_name: 'company/web-api',
          description: 'Main web API service',
          html_url: 'https://github.com/company/web-api',
          clone_url: 'https://github.com/company/web-api.git',
          default_branch: 'main',
          language: 'Python',
          visibility: 'private',
          stargazers_count: 15,
          forks_count: 4,
          has_actions: true,
          updated_at: '2024-01-16T09:15:00Z',
          permissions: { admin: false, push: true, pull: true }
        },
        {
          id: 3,
          name: 'frontend-app',
          full_name: 'company/frontend-app',
          description: 'React frontend application',
          html_url: 'https://github.com/company/frontend-app',
          clone_url: 'https://github.com/company/frontend-app.git',
          default_branch: 'main',
          language: 'JavaScript',
          visibility: 'private',
          stargazers_count: 12,
          forks_count: 6,
          has_actions: true,
          updated_at: '2024-01-15T16:45:00Z',
          permissions: { admin: false, push: true, pull: true }
        }
      ];

      setRepositories(mockRepos);
      showToast('Repositories discovered successfully', 'success');
    } catch (error) {
      console.error('Failed to discover repositories:', error);
      showToast('Failed to discover repositories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      // Mock API call
      const mockConnections: RepositoryConnection[] = [
        {
          id: 'conn_1',
          name: 'opssight-platform',
          connection_type: 'github',
          repository_url: 'https://github.com/company/opssight-platform',
          status: 'active',
          last_sync: '2024-01-16T10:30:00Z',
          created_at: '2024-01-10T09:00:00Z',
          metadata: { branch: 'main', language: 'TypeScript' }
        },
        {
          id: 'conn_2',
          name: 'web-api',
          connection_type: 'github',
          repository_url: 'https://github.com/company/web-api',
          status: 'syncing',
          last_sync: '2024-01-16T09:15:00Z',
          created_at: '2024-01-12T14:30:00Z',
          metadata: { branch: 'main', language: 'Python' }
        }
      ];

      setConnections(mockConnections);
    } catch (error) {
      console.error('Failed to load connections:', error);
      showToast('Failed to load repository connections', 'error');
    }
  };

  const connectRepository = async (repository: Repository) => {
    try {
      setIsLoading(true);
      
      // Mock API call to connect repository
      const newConnection: RepositoryConnection = {
        id: `conn_${Date.now()}`,
        name: repository.name,
        connection_type: 'github',
        repository_url: repository.clone_url,
        status: 'syncing',
        created_at: new Date().toISOString(),
        metadata: {
          branch: repository.default_branch,
          language: repository.language,
          has_actions: repository.has_actions
        }
      };

      setConnections(prev => [...prev, newConnection]);
      setShowConnectModal(false);
      setSelectedRepo(null);
      showToast(`Repository ${repository.name} connected successfully`, 'success');
    } catch (error) {
      console.error('Failed to connect repository:', error);
      showToast('Failed to connect repository', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectRepository = async (connectionId: string) => {
    try {
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      showToast('Repository disconnected successfully', 'success');
    } catch (error) {
      console.error('Failed to disconnect repository:', error);
      showToast('Failed to disconnect repository', 'error');
    }
  };

  const syncRepository = async (connectionId: string) => {
    try {
      // Update status to syncing
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'syncing' as const }
          : conn
      ));

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status back to active
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'active' as const, last_sync: new Date().toISOString() }
          : conn
      ));

      showToast('Repository synced successfully', 'success');
    } catch (error) {
      console.error('Failed to sync repository:', error);
      showToast('Failed to sync repository', 'error');
      
      // Revert status on error
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'error' as const }
          : conn
      ));
    }
  };

  const viewRepositoryDetails = async (connection: RepositoryConnection) => {
    try {
      setSelectedConnection(connection);
      
      // Mock repository status data
      const mockStatus: RepositoryStatus = {
        connection_id: connection.id,
        name: connection.name,
        status: connection.status,
        health_metrics: {
          health_score: 85.0,
          commit_frequency: 4.2,
          ci_success_rate: 92.5,
          security_alerts: 0,
          code_quality_score: 88.0
        },
        recent_activity: [
          {
            type: 'commit',
            message: 'Fix authentication bug',
            author: 'john.doe',
            timestamp: '2024-01-16T10:30:00Z'
          },
          {
            type: 'pr_opened',
            title: 'Add new feature',
            author: 'jane.smith',
            timestamp: '2024-01-16T09:15:00Z'
          }
        ],
        ci_status: {
          status: 'passing',
          last_build: '2024-01-16T10:30:00Z',
          success_rate: 92.5
        },
        security_status: {
          security_alerts: 0,
          security_score: 95.0
        }
      };

      setRepositoryStatus(mockStatus);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load repository details:', error);
      showToast('Failed to load repository details', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'syncing': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'disconnected': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         repo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility = filters.visibility === 'all' || repo.visibility === filters.visibility;
    const matchesLanguage = filters.language === 'all' || repo.language === filters.language;
    const matchesActions = !filters.hasActions || repo.has_actions;
    
    return matchesSearch && matchesVisibility && matchesLanguage && matchesActions;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Repository Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Discover, connect, and monitor your repositories
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {connections.length}
            </div>
            <div className="text-sm text-gray-600">Connected Repositories</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {connections.filter(c => c.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {connections.filter(c => c.status === 'syncing').length}
            </div>
            <div className="text-sm text-gray-600">Syncing</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {connections.filter(c => c.status === 'error').length}
            </div>
            <div className="text-sm text-gray-600">Errors</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="connected">Connected ({connections.length})</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Repository Discovery */}
        <TabsContent value="discover" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={discoverRepositories} disabled={isLoading}>
                {isLoading ? 'Discovering...' : 'Discover Repositories'}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <select
              value={filters.visibility}
              onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Repositories</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            <select
              value={filters.language}
              onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              <option value="TypeScript">TypeScript</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.hasActions}
                onChange={(e) => setFilters(prev => ({ ...prev, hasActions: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Has GitHub Actions</span>
            </label>
          </div>

          {/* Repository List */}
          <div className="space-y-3">
            {filteredRepositories.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No repositories found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {repositories.length === 0 
                      ? 'Click "Discover Repositories" to find your repositories'
                      : 'Try adjusting your search or filters'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRepositories.map((repo) => (
                <Card key={repo.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {repo.name}
                          </h3>
                          <Badge variant="outline">{repo.visibility}</Badge>
                          {repo.language && (
                            <Badge variant="outline">{repo.language}</Badge>
                          )}
                          {repo.has_actions && (
                            <Badge className="bg-green-100 text-green-800">Actions</Badge>
                          )}
                        </div>
                        
                        {repo.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {repo.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>⭐ {repo.stargazers_count}</span>
                          <span>🍴 {repo.forks_count}</span>
                          <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(repo.html_url, '_blank')}
                        >
                          View on GitHub
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRepo(repo);
                            setShowConnectModal(true);
                          }}
                          disabled={connections.some(c => c.repository_url === repo.clone_url)}
                        >
                          {connections.some(c => c.repository_url === repo.clone_url) ? 'Connected' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Connected Repositories */}
        <TabsContent value="connected" className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No repositories connected
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Connect your first repository to start monitoring
                </p>
                <Button onClick={() => setActiveTab('discover')}>
                  Discover Repositories
                </Button>
              </CardContent>
            </Card>
          ) : (
            connections.map((connection) => (
              <Card key={connection.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {connection.name}
                        </h3>
                        <Badge className={getStatusColor(connection.status)}>
                          {connection.status}
                        </Badge>
                        <Badge variant="outline">{connection.connection_type}</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {connection.repository_url}
                      </p>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span>Connected: {new Date(connection.created_at).toLocaleDateString()}</span>
                        {connection.last_sync && (
                          <span> • Last sync: {new Date(connection.last_sync).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewRepositoryDetails(connection)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncRepository(connection.id)}
                        disabled={connection.status === 'syncing'}
                      >
                        {connection.status === 'syncing' ? 'Syncing...' : 'Sync'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectRepository(connection.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Monitoring */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Repository Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">Repository Monitoring</h3>
                <p>Comprehensive monitoring dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Repository Modal */}
      {showConnectModal && selectedRepo && (
        <Modal
          isOpen={showConnectModal}
          onClose={() => {
            setShowConnectModal(false);
            setSelectedRepo(null);
          }}
          title={`Connect ${selectedRepo.name}`}
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Repository Details</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2">
                <div><strong>Name:</strong> {selectedRepo.name}</div>
                <div><strong>URL:</strong> {selectedRepo.html_url}</div>
                <div><strong>Language:</strong> {selectedRepo.language || 'N/A'}</div>
                <div><strong>Default Branch:</strong> {selectedRepo.default_branch}</div>
                <div><strong>Visibility:</strong> {selectedRepo.visibility}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => connectRepository(selectedRepo)}
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect Repository'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConnectModal(false);
                  setSelectedRepo(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Repository Details Modal */}
      {showDetailsModal && selectedConnection && repositoryStatus && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedConnection(null);
            setRepositoryStatus(null);
          }}
          title={`${repositoryStatus.name} - Details`}
        >
          <div className="space-y-6">
            {/* Health Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Health Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className={`text-2xl font-bold ${getHealthScoreColor(repositoryStatus.health_metrics.health_score)}`}>
                    {repositoryStatus.health_metrics.health_score}%
                  </div>
                  <div className="text-sm text-gray-600">Health Score</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {repositoryStatus.health_metrics.ci_success_rate}%
                  </div>
                  <div className="text-sm text-gray-600">CI Success Rate</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {repositoryStatus.health_metrics.commit_frequency}
                  </div>
                  <div className="text-sm text-gray-600">Commits/Day</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {repositoryStatus.health_metrics.code_quality_score}%
                  </div>
                  <div className="text-sm text-gray-600">Code Quality</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {repositoryStatus.recent_activity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-sm">
                      <span className="font-medium">{activity.author}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {activity.type === 'commit' ? ' committed: ' : ' opened PR: '}
                        {activity.message || activity.title}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 ml-auto">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CI and Security Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">CI Status</h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${
                      repositoryStatus.ci_status.status === 'passing' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium">{repositoryStatus.ci_status.status}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Last build: {new Date(repositoryStatus.ci_status.last_build).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Security</h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm font-medium mb-1">
                    {repositoryStatus.security_status.security_alerts} alerts
                  </div>
                  <div className="text-xs text-gray-600">
                    Score: {repositoryStatus.security_status.security_score}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RepositoryManager;