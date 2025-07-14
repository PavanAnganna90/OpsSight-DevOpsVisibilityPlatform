/**
 * CI Failure Analyzer Component
 * 
 * Provides detailed analysis and context for CI/CD pipeline failures
 * Integrates with alert system to show actionable insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface CIFailure {
  id: string;
  pipeline_id: string;
  job_name: string;
  stage: string;
  failure_type: 'build' | 'test' | 'deploy' | 'security' | 'quality';
  error_message: string;
  stack_trace?: string;
  timestamp: string;
  duration: number;
  commit_sha: string;
  commit_message: string;
  author: string;
  branch: string;
  pull_request?: {
    number: number;
    title: string;
    url: string;
  };
  failure_analysis?: {
    category: string;
    confidence: number;
    suggested_fix: string;
    similar_failures?: number;
    impact_level: 'low' | 'medium' | 'high' | 'critical';
  };
  artifacts?: {
    logs_url?: string;
    test_results_url?: string;
    coverage_url?: string;
    screenshots?: string[];
  };
}

interface CIFailureStats {
  total_failures: number;
  failure_rate: number;
  avg_time_to_fix: number;
  common_failure_types: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  trending_issues: Array<{
    pattern: string;
    occurrences: number;
    first_seen: string;
    last_seen: string;
  }>;
  pipeline_health: {
    [key: string]: {
      success_rate: number;
      avg_duration: number;
      last_success: string;
    };
  };
}

interface CIFailureAnalyzerProps {
  alertId?: string;
  pipelineId?: string;
  projectId?: string;
  compact?: boolean;
  onFixSuggestion?: (suggestion: string) => void;
}

const CIFailureAnalyzer: React.FC<CIFailureAnalyzerProps> = ({
  alertId,
  pipelineId,
  projectId,
  compact = false,
  onFixSuggestion,
}) => {
  const { showToast } = useToast();
  
  const [failures, setFailures] = useState<CIFailure[]>([]);
  const [stats, setStats] = useState<CIFailureStats | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<CIFailure | null>(null);
  const [activeTab, setActiveTab] = useState('failures');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    loadCIFailures();
  }, [alertId, pipelineId, projectId, timeRange]);

  const loadCIFailures = async () => {
    setLoading(true);
    try {
      // Mock data - in real implementation, this would call the API
      const mockFailures: CIFailure[] = [
        {
          id: 'fail_1',
          pipeline_id: 'pipe_123',
          job_name: 'test-backend',
          stage: 'test',
          failure_type: 'test',
          error_message: 'TypeError: Cannot read property \'id\' of undefined',
          stack_trace: 'at UserService.getUserById (src/services/user.service.ts:45:20)\nat /tests/user.service.test.ts:123:5',
          timestamp: '2024-01-16T10:30:00Z',
          duration: 180,
          commit_sha: 'abc123def456',
          commit_message: 'Fix user authentication flow',
          author: 'john.doe@company.com',
          branch: 'feature/auth-fix',
          pull_request: {
            number: 142,
            title: 'Fix user authentication flow',
            url: 'https://github.com/company/repo/pull/142'
          },
          failure_analysis: {
            category: 'Null Pointer Exception',
            confidence: 85,
            suggested_fix: 'Add null check before accessing user.id property',
            similar_failures: 3,
            impact_level: 'medium'
          },
          artifacts: {
            logs_url: 'https://github.com/company/repo/actions/runs/123/logs',
            test_results_url: 'https://github.com/company/repo/actions/runs/123/results',
            coverage_url: 'https://codecov.io/gh/company/repo/commit/abc123'
          }
        },
        {
          id: 'fail_2',
          pipeline_id: 'pipe_124',
          job_name: 'build-frontend',
          stage: 'build',
          failure_type: 'build',
          error_message: 'Module not found: Error: Can\'t resolve \'@/components/NewComponent\'',
          timestamp: '2024-01-16T09:15:00Z',
          duration: 45,
          commit_sha: 'def456ghi789',
          commit_message: 'Add new dashboard component',
          author: 'jane.smith@company.com',
          branch: 'feature/dashboard',
          failure_analysis: {
            category: 'Import Error',
            confidence: 95,
            suggested_fix: 'Check if the file path is correct and the component exists',
            similar_failures: 1,
            impact_level: 'low'
          },
          artifacts: {
            logs_url: 'https://github.com/company/repo/actions/runs/124/logs'
          }
        },
        {
          id: 'fail_3',
          pipeline_id: 'pipe_125',
          job_name: 'security-scan',
          stage: 'security',
          failure_type: 'security',
          error_message: 'High severity vulnerability detected in npm package',
          timestamp: '2024-01-16T08:45:00Z',
          duration: 120,
          commit_sha: 'ghi789jkl012',
          commit_message: 'Update dependencies',
          author: 'bob.wilson@company.com',
          branch: 'chore/deps-update',
          failure_analysis: {
            category: 'Security Vulnerability',
            confidence: 100,
            suggested_fix: 'Update the vulnerable package to latest secure version',
            similar_failures: 0,
            impact_level: 'high'
          }
        }
      ];

      const mockStats: CIFailureStats = {
        total_failures: 12,
        failure_rate: 15.8,
        avg_time_to_fix: 45.5,
        common_failure_types: [
          { type: 'test', count: 5, percentage: 41.7 },
          { type: 'build', count: 4, percentage: 33.3 },
          { type: 'security', count: 2, percentage: 16.7 },
          { type: 'deploy', count: 1, percentage: 8.3 }
        ],
        trending_issues: [
          {
            pattern: 'Null pointer exceptions in user service',
            occurrences: 3,
            first_seen: '2024-01-14T00:00:00Z',
            last_seen: '2024-01-16T10:30:00Z'
          },
          {
            pattern: 'Import path resolution errors',
            occurrences: 2,
            first_seen: '2024-01-15T00:00:00Z',
            last_seen: '2024-01-16T09:15:00Z'
          }
        ],
        pipeline_health: {
          'test-backend': { success_rate: 92.5, avg_duration: 180, last_success: '2024-01-15T14:30:00Z' },
          'build-frontend': { success_rate: 88.2, avg_duration: 45, last_success: '2024-01-15T16:45:00Z' },
          'security-scan': { success_rate: 95.0, avg_duration: 120, last_success: '2024-01-15T12:20:00Z' }
        }
      };

      setFailures(mockFailures);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load CI failures:', error);
      showToast('Failed to load CI failure data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeFailure = (failure: CIFailure) => {
    setSelectedFailure(failure);
    setShowAnalysisModal(true);
  };

  const handleApplyFix = (suggestion: string) => {
    showToast('Fix suggestion applied to development workflow', 'success');
    if (onFixSuggestion) {
      onFixSuggestion(suggestion);
    }
  };

  const getFailureTypeColor = (type: string) => {
    switch (type) {
      case 'build': return 'bg-orange-100 text-orange-800';
      case 'test': return 'bg-red-100 text-red-800';
      case 'deploy': return 'bg-purple-100 text-purple-800';
      case 'security': return 'bg-yellow-100 text-yellow-800';
      case 'quality': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-red-400 text-white';
      case 'medium': return 'bg-yellow-400 text-black';
      case 'low': return 'bg-green-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CI Failure Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {failures.slice(0, 3).map((failure) => (
              <div key={failure.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Badge className={getFailureTypeColor(failure.failure_type)}>
                    {failure.failure_type}
                  </Badge>
                  <span className="text-sm font-medium">{failure.job_name}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAnalyzeFailure(failure)}>
                  Analyze
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.total_failures}</div>
              <div className="text-sm text-gray-600">Total Failures</div>
              <div className="text-xs text-gray-500">{timeRange}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.failure_rate}%</div>
              <div className="text-sm text-gray-600">Failure Rate</div>
              <div className="text-xs text-gray-500">vs last period</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.avg_time_to_fix}m</div>
              <div className="text-sm text-gray-600">Avg Fix Time</div>
              <div className="text-xs text-gray-500">median resolution</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.common_failure_types[0]?.type || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Top Issue</div>
              <div className="text-xs text-gray-500">
                {stats.common_failure_types[0]?.percentage || 0}% of failures
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">CI Failure Analysis</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="failures">Recent Failures</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
          <TabsTrigger value="health">Pipeline Health</TabsTrigger>
        </TabsList>

        {/* Recent Failures */}
        <TabsContent value="failures" className="space-y-4">
          {failures.map((failure) => (
            <Card key={failure.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getFailureTypeColor(failure.failure_type)}>
                        {failure.failure_type}
                      </Badge>
                      <Badge variant="outline">{failure.stage}</Badge>
                      {failure.failure_analysis && (
                        <Badge className={getImpactColor(failure.failure_analysis.impact_level)}>
                          {failure.failure_analysis.impact_level}
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">{failure.job_name}</h3>
                    <p className="text-red-600 text-sm mb-2">{failure.error_message}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Branch:</span> {failure.branch}
                      </div>
                      <div>
                        <span className="font-medium">Author:</span> {failure.author}
                      </div>
                      <div>
                        <span className="font-medium">Commit:</span> {failure.commit_sha.slice(0, 8)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {failure.duration}s
                      </div>
                    </div>

                    {failure.commit_message && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Commit:</span> {failure.commit_message}
                      </div>
                    )}

                    {failure.failure_analysis && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">Analysis:</span> {failure.failure_analysis.category}
                          <span className="ml-2 text-blue-600">
                            ({failure.failure_analysis.confidence}% confidence)
                          </span>
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-medium">Suggested Fix:</span> {failure.failure_analysis.suggested_fix}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" onClick={() => handleAnalyzeFailure(failure)}>
                      View Details
                    </Button>
                    {failure.artifacts?.logs_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={failure.artifacts.logs_url} target="_blank" rel="noopener noreferrer">
                          View Logs
                        </a>
                      </Button>
                    )}
                    {failure.pull_request && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={failure.pull_request.url} target="_blank" rel="noopener noreferrer">
                          View PR
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Trends & Patterns */}
        <TabsContent value="trends" className="space-y-4">
          {stats && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Common Failure Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.common_failure_types.map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getFailureTypeColor(type.type)}>
                            {type.type}
                          </Badge>
                          <span className="text-sm">{type.count} failures</span>
                        </div>
                        <span className="text-sm text-gray-600">{type.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trending Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.trending_issues.map((issue, index) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                        <div className="font-medium text-yellow-800">{issue.pattern}</div>
                        <div className="text-sm text-yellow-600">
                          {issue.occurrences} occurrences since {new Date(issue.first_seen).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Pipeline Health */}
        <TabsContent value="health" className="space-y-4">
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.pipeline_health).map(([pipeline, health]) => (
                    <div key={pipeline} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{pipeline}</h4>
                        <div className="text-sm text-gray-600">
                          Last success: {new Date(health.last_success).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {health.success_rate}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {health.avg_duration}s avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Analysis Modal */}
      {showAnalysisModal && selectedFailure && (
        <Modal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          title={`Failure Analysis: ${selectedFailure.job_name}`}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Error Details</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {selectedFailure.error_message}
              </pre>
            </div>

            {selectedFailure.stack_trace && (
              <div>
                <h4 className="font-semibold mb-2">Stack Trace</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-32">
                  {selectedFailure.stack_trace}
                </pre>
              </div>
            )}

            {selectedFailure.failure_analysis && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-900">AI Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Category:</span> {selectedFailure.failure_analysis.category}
                  </div>
                  <div>
                    <span className="font-medium">Confidence:</span> {selectedFailure.failure_analysis.confidence}%
                  </div>
                  <div>
                    <span className="font-medium">Suggested Fix:</span>
                    <p className="mt-1">{selectedFailure.failure_analysis.suggested_fix}</p>
                  </div>
                  {selectedFailure.failure_analysis.similar_failures && selectedFailure.failure_analysis.similar_failures > 0 && (
                    <div>
                      <span className="font-medium">Similar Failures:</span> {selectedFailure.failure_analysis.similar_failures} in the past
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Button 
                    size="sm" 
                    onClick={() => handleApplyFix(selectedFailure.failure_analysis!.suggested_fix)}
                  >
                    Apply Fix Suggestion
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {selectedFailure.artifacts?.logs_url && (
                <Button variant="outline" asChild>
                  <a href={selectedFailure.artifacts.logs_url} target="_blank" rel="noopener noreferrer">
                    View Full Logs
                  </a>
                </Button>
              )}
              {selectedFailure.artifacts?.test_results_url && (
                <Button variant="outline" asChild>
                  <a href={selectedFailure.artifacts.test_results_url} target="_blank" rel="noopener noreferrer">
                    Test Results
                  </a>
                </Button>
              )}
              {selectedFailure.pull_request && (
                <Button variant="outline" asChild>
                  <a href={selectedFailure.pull_request.url} target="_blank" rel="noopener noreferrer">
                    View Pull Request
                  </a>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CIFailureAnalyzer;