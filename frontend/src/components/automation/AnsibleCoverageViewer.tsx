/**
 * Ansible Automation Coverage Viewer
 * 
 * Interactive component for analyzing Ansible playbook executions,
 * tracking automation coverage, and visualizing infrastructure automation patterns.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Play, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Types for Ansible analysis data
interface AnsibleExecutionSummary {
  total_tasks: number;
  total_hosts: number;
  total_plays: number;
  success_rate: number;
  failure_rate: number;
  change_rate: number;
  execution_time_seconds?: number;
  status_breakdown: Record<string, number>;
}

interface AutomationCoverage {
  overall_score: number;
  total_unique_modules: number;
  total_module_executions: number;
  automation_breadth: number;
  automation_depth: number;
}

interface HostReliability {
  host_count: number;
  overall_reliability: number;
  problematic_hosts: Array<{
    host: string;
    issues: string[];
  }>;
}

interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
}

interface AnsibleAnalysis {
  execution_summary: AnsibleExecutionSummary;
  automation_coverage: AutomationCoverage;
  host_reliability: HostReliability;
  recommendations: Recommendation[];
  metadata: {
    analysis_timestamp: string;
    log_format: string;
    total_lines_processed: number;
  };
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200'
} as const;

export const AnsibleCoverageViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logFormat, setLogFormat] = useState<string>('auto');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'paste'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState<AnsibleAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API endpoints
  const API_BASE = '/api/v1/ansible';

  // Mutation for parsing logs
  const parseLogsMutation = useMutation({
    mutationFn: async ({ content, format }: { content: string; format: string }) => {
      const response = await fetch(`${API_BASE}/parse-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          log_content: content,
          log_format: format
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to parse logs');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Transform backend response to match UI expected format
      const transformedAnalysis: AnsibleAnalysis = {
        execution_summary: {
          total_tasks: data.summary?.total_tasks || 0,
          total_hosts: data.summary?.total_hosts || 0,
          total_plays: data.summary?.total_plays || 0,
          success_rate: data.summary?.success_rate || 0,
          failure_rate: data.summary?.failure_rate || 0,
          change_rate: data.summary?.change_rate || 0,
          execution_time_seconds: data.metadata?.execution_time || 0,
          status_breakdown: data.summary?.status_breakdown || {}
        },
        automation_coverage: {
          overall_score: data.coverage_metrics?.automation_coverage || 0,
          total_unique_modules: data.coverage_metrics?.total_unique_modules || 0,
          total_module_executions: data.coverage_metrics?.total_module_executions || 0,
          automation_breadth: data.coverage_metrics?.automation_breadth || 0,
          automation_depth: data.coverage_metrics?.automation_depth || 0
        },
        host_reliability: {
          host_count: data.summary?.total_hosts || 0,
          overall_reliability: data.coverage_metrics?.host_reliability || 0,
          problematic_hosts: data.coverage_metrics?.problematic_hosts || []
        },
        recommendations: data.coverage_metrics?.recommendations || [],
        metadata: {
          analysis_timestamp: new Date().toISOString(),
          log_format: data.format || 'unknown',
          total_lines_processed: data.metadata?.total_lines_processed || 0
        }
      };
      setAnalysis(transformedAnalysis);
    },
  });

  // Mutation for uploading files
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, format }: { file: File; format: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('log_format', format);

      const response = await fetch(`${API_BASE}/parse-log-file`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload file');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Transform backend response to match UI expected format
      const transformedAnalysis: AnsibleAnalysis = {
        execution_summary: {
          total_tasks: data.summary?.total_tasks || 0,
          total_hosts: data.summary?.total_hosts || 0,
          total_plays: data.summary?.total_plays || 0,
          success_rate: data.summary?.success_rate || 0,
          failure_rate: data.summary?.failure_rate || 0,
          change_rate: data.summary?.change_rate || 0,
          execution_time_seconds: data.metadata?.execution_time || 0,
          status_breakdown: data.summary?.status_breakdown || {}
        },
        automation_coverage: {
          overall_score: data.coverage_metrics?.automation_coverage || 0,
          total_unique_modules: data.coverage_metrics?.total_unique_modules || 0,
          total_module_executions: data.coverage_metrics?.total_module_executions || 0,
          automation_breadth: data.coverage_metrics?.automation_breadth || 0,
          automation_depth: data.coverage_metrics?.automation_depth || 0
        },
        host_reliability: {
          host_count: data.summary?.total_hosts || 0,
          overall_reliability: data.coverage_metrics?.host_reliability || 0,
          problematic_hosts: data.coverage_metrics?.problematic_hosts || []
        },
        recommendations: data.coverage_metrics?.recommendations || [],
        metadata: {
          analysis_timestamp: new Date().toISOString(),
          log_format: data.format || 'unknown',
          total_lines_processed: data.metadata?.total_lines_processed || 0
        }
      };
      setAnalysis(transformedAnalysis);
    },
  });

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
      setUploadMethod('file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleAnalyze = () => {
    if (uploadMethod === 'file' && selectedFile) {
      uploadFileMutation.mutate({ file: selectedFile, format: logFormat });
    } else if (uploadMethod === 'paste' && logContent.trim()) {
      parseLogsMutation.mutate({ content: logContent, format: logFormat });
    }
  };

  const isLoading = parseLogsMutation.isPending || uploadFileMutation.isPending;
  const error = parseLogsMutation.error || uploadFileMutation.error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ansible Automation Coverage</h1>
          <p className="text-muted-foreground mt-1">
            Analyze playbook executions and track automation coverage across your infrastructure
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Ansible Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Button
              variant={uploadMethod === 'file' ? 'primary' : 'outline'}
              onClick={() => setUploadMethod('file')}
              size="sm"
            >
              Upload File
            </Button>
            <Button
              variant={uploadMethod === 'paste' ? 'primary' : 'outline'}
              onClick={() => setUploadMethod('paste')}
              size="sm"
            >
              Paste Content
            </Button>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="format" className="block text-sm font-medium mb-2">Log Format</label>
              <select 
                id="format"
                value={logFormat} 
                onChange={(e) => setLogFormat(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              >
                <option value="auto">Auto-detect</option>
                <option value="json">JSON (with callbacks)</option>
                <option value="standard">Standard Output</option>
                <option value="awx">AWX/Tower Format</option>
              </select>
            </div>
          </div>

          {uploadMethod === 'file' ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".log,.txt,.out"
              />
              
              <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">
                    Drag and drop your Ansible log file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .log, .txt, .out files up to 50MB
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="log-content" className="block text-sm font-medium">Log Content</label>
              <textarea
                id="log-content"
                value={logContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLogContent(e.target.value)}
                placeholder="Paste your Ansible playbook execution logs here..."
                className="w-full min-h-[200px] px-3 py-2 font-mono text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
            </div>
          )}

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-red-700">
                  {error instanceof Error ? error.message : 'An error occurred while processing the logs'}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={isLoading || (!selectedFile && !logContent.trim())}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Logs...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Analyze Automation Coverage
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recommendations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recommendations
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600">
                          {analysis.execution_summary.success_rate.toFixed(1)}%
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                        <p className="text-2xl font-bold">{analysis.execution_summary.total_tasks}</p>
                      </div>
                      <Activity className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Hosts</p>
                        <p className="text-2xl font-bold">{analysis.execution_summary.total_hosts}</p>
                      </div>
                      <Activity className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Execution Time</p>
                        <p className="text-2xl font-bold">
                          {analysis.execution_summary.execution_time_seconds 
                            ? `${(analysis.execution_summary.execution_time_seconds / 60).toFixed(1)}m` 
                            : 'N/A'}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coverage Score */}
              <Card>
                <CardHeader>
                  <CardTitle>Automation Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Coverage Score</span>
                      <span>{analysis.automation_coverage.overall_score}%</span>
                    </div>
                    <Progress value={analysis.automation_coverage.overall_score} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Unique Modules</p>
                      <p className="font-medium">{analysis.automation_coverage.total_unique_modules}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Module Categories</p>
                      <p className="font-medium">{analysis.automation_coverage.automation_breadth}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Automation Depth</p>
                      <p className="font-medium">{analysis.automation_coverage.automation_depth.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Host Reliability</p>
                      <p className="font-medium">{analysis.host_reliability.overall_reliability.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Problematic Hosts */}
              {analysis.host_reliability.problematic_hosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Problematic Hosts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.host_reliability.problematic_hosts.map((host, index) => (
                        <div key={index} className="p-3 border rounded-md bg-orange-50 border-orange-200">
                          <span className="font-medium">{host.host}:</span> {host.issues.join(', ')}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Insights & Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className={`p-4 border rounded-md ${PRIORITY_COLORS[rec.priority]}`}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{rec.title}</h4>
                            <Badge variant="outline" className="capitalize">
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm opacity-90">{rec.description}</p>
                          <p className="text-sm"><strong>Action:</strong> {rec.action}</p>
                        </div>
                      </div>
                    ))}
                    
                    {analysis.recommendations.length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                        <p className="text-lg font-medium">Excellent automation coverage!</p>
                        <p className="text-muted-foreground">No specific recommendations at this time.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Analysis Time</p>
                      <p className="font-medium">
                        {new Date(analysis.metadata.analysis_timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Log Format</p>
                      <p className="font-medium">{analysis.metadata.log_format}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lines Processed</p>
                      <p className="font-medium">{analysis.metadata.total_lines_processed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unique Modules</p>
                      <p className="font-medium">{analysis.automation_coverage.total_unique_modules}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 