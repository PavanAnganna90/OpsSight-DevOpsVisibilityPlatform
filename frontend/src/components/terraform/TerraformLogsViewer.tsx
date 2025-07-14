import React, { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
  Settings,
  Database,
  Server,
  Cloud,
  Package,
  AlertTriangle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

// Types for Terraform analysis
interface TerraformLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  module: string;
  message_type?: string;
  change?: {
    resource: {
      address: string;
      resource_type: string;
      resource_name: string;
      module: string;
    };
    action: 'create' | 'update' | 'delete' | 'replace' | 'no-op';
    before?: any;
    after?: any;
  };
}

interface TerraformAnalysis {
  summary?: {
    operation: string;
    total_changes: number;
    add_count: number;
    change_count: number;
    remove_count: number;
    duration_seconds?: number;
    succeeded: boolean;
    error_count: number;
    warning_count: number;
  };
  total_entries: number;
  entries: TerraformLogEntry[];
  file_metadata?: {
    filename: string;
    size_bytes: number;
    detected_format: string;
    operation_type?: string;
  };
}

interface TerraformLogsViewerProps {
  className?: string;
}

const TerraformLogsViewer: React.FC<TerraformLogsViewerProps> = ({ className = "" }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logFormat, setLogFormat] = useState<'json' | 'text' | 'auto'>('auto');
  const [analysis, setAnalysis] = useState<TerraformAnalysis | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [showRawLogs, setShowRawLogs] = useState<boolean>(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('log_file', file);
      formData.append('log_format', logFormat);
      
      const response = await fetch('/api/v1/terraform/upload-logs', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload log file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.data);
    },
  });

  // Parse logs mutation
  const parseMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/v1/terraform/parse-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          log_content: content,
          log_format: logFormat,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to parse log content');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.data);
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setLogContent('');
      setAnalysis(null);
    }
  }, []);

  // Handle file upload
  const handleUpload = useCallback(() => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  }, [selectedFile, uploadMutation]);

  // Handle text parsing
  const handleParseText = useCallback(() => {
    if (logContent.trim()) {
      parseMutation.mutate(logContent);
    }
  }, [logContent, parseMutation]);

  // Filter logs based on level and module
  const filteredEntries = useMemo(() => {
    if (!analysis?.entries) return [];
    
    return analysis.entries.filter(entry => {
      const levelMatch = filterLevel === 'all' || entry.level === filterLevel;
      const moduleMatch = filterModule === 'all' || entry.module === filterModule;
      return levelMatch && moduleMatch;
    });
  }, [analysis?.entries, filterLevel, filterModule]);

  // Get unique modules for filter
  const uniqueModules = useMemo(() => {
    if (!analysis?.entries) return [];
    const modules = new Set(analysis.entries.map(entry => entry.module));
    return Array.from(modules);
  }, [analysis?.entries]);

  // Toggle entry expansion
  const toggleEntryExpansion = useCallback((index: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEntries(newExpanded);
  }, [expandedEntries]);

  // Get icon for log level
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get icon for action type
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'update':
        return <Settings className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'replace':
        return <Zap className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get resource type icon
  const getResourceIcon = (resourceType: string) => {
    if (resourceType.includes('instance') || resourceType.includes('vm')) {
      return <Server className="w-4 h-4 text-purple-500" />;
    } else if (resourceType.includes('database') || resourceType.includes('db')) {
      return <Database className="w-4 h-4 text-green-500" />;
    } else if (resourceType.includes('storage') || resourceType.includes('bucket')) {
      return <Package className="w-4 h-4 text-blue-500" />;
    } else {
      return <Cloud className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`terraform-logs-viewer bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FileText className="w-6 h-6 text-purple-400 mr-3" />
          <h2 className="text-xl font-semibold text-white">Terraform Logs Analysis</h2>
        </div>
        
        {analysis && (
          <button
            onClick={() => setShowRawLogs(!showRawLogs)}
            className="flex items-center px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm text-slate-300 transition-colors"
          >
            {showRawLogs ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showRawLogs ? 'Hide Raw' : 'Show Raw'}
          </button>
        )}
      </div>

      {/* Input Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* File Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-400" />
            Upload Log File
          </h3>
          
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".log,.txt,.json,.out"
              onChange={handleFileSelect}
              className="hidden"
              id="log-file-input"
            />
            <label
              htmlFor="log-file-input"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-slate-300">
                {selectedFile ? selectedFile.name : 'Choose a log file'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Supports .log, .txt, .json, .out files (max 10MB)
              </span>
            </label>
          </div>
          
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload & Parse'}
            </button>
          )}
        </div>

        {/* Text Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-400" />
            Paste Log Content
          </h3>
          
          <textarea
            value={logContent}
            onChange={(e) => setLogContent(e.target.value)}
            placeholder="Paste your Terraform logs here..."
            className="w-full h-32 p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          
          <button
            onClick={handleParseText}
            disabled={!logContent.trim() || parseMutation.isPending}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {parseMutation.isPending ? 'Parsing...' : 'Parse Logs'}
          </button>
        </div>
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Log Format
        </label>
        <select
          value={logFormat}
          onChange={(e) => setLogFormat(e.target.value as any)}
          className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
        >
          <option value="auto">Auto-detect</option>
          <option value="json">JSON (terraform apply -json)</option>
          <option value="text">Plain text</option>
        </select>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary */}
          {analysis.summary && (
            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-400" />
                Execution Summary
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{analysis.summary.add_count}</div>
                  <div className="text-sm text-slate-400">Added</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{analysis.summary.change_count}</div>
                  <div className="text-sm text-slate-400">Changed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{analysis.summary.remove_count}</div>
                  <div className="text-sm text-slate-400">Removed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-300">{analysis.summary.total_changes}</div>
                  <div className="text-sm text-slate-400">Total</div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  Operation: <span className="text-white font-medium">{analysis.summary.operation}</span>
                </span>
                <span className="text-slate-400">
                  Status: <span className={`font-medium ${analysis.summary.succeeded ? 'text-green-400' : 'text-red-400'}`}>
                    {analysis.summary.succeeded ? 'Success' : 'Failed'}
                  </span>
                </span>
                {analysis.summary.duration_seconds && (
                  <span className="text-slate-400">
                    Duration: <span className="text-white font-medium">{analysis.summary.duration_seconds.toFixed(1)}s</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-slate-400 mr-2" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-white"
              >
                <option value="all">All Levels</option>
                <option value="error">Errors</option>
                <option value="warn">Warnings</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-white"
            >
              <option value="all">All Modules</option>
              {uniqueModules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
            
            <span className="text-sm text-slate-400 py-1">
              {filteredEntries.length} of {analysis.total_entries} entries
            </span>
          </div>

          {/* Log Entries */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEntries.map((entry, index) => (
              <div key={index} className="bg-slate-700/20 rounded-lg border border-slate-600/30">
                <div 
                  className="p-3 cursor-pointer hover:bg-slate-600/20 transition-colors"
                  onClick={() => toggleEntryExpansion(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedEntries.has(index) ? 
                        <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      }
                      {getLevelIcon(entry.level)}
                      
                      {entry.change && (
                        <div className="flex items-center space-x-1">
                          {getActionIcon(entry.change.action)}
                          {getResourceIcon(entry.change.resource.resource_type)}
                        </div>
                      )}
                      
                      <span className="text-white text-sm font-medium">
                        {entry.change ? 
                          `${entry.change.action} ${entry.change.resource.address}` : 
                          entry.message.slice(0, 80)
                        }
                      </span>
                    </div>
                    
                    <span className="text-xs text-slate-400">
                      {format(new Date(entry.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                </div>
                
                {expandedEntries.has(index) && (
                  <div className="px-3 pb-3 border-t border-slate-600/30">
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="text-slate-300">{entry.message}</div>
                      
                      {entry.change && (
                        <div className="bg-slate-800/50 rounded p-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400">Resource:</span>
                              <span className="text-white ml-1">{entry.change.resource.resource_type}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Action:</span>
                              <span className="text-white ml-1">{entry.change.action}</span>
                            </div>
                          </div>
                          
                          {showRawLogs && (entry.change.before || entry.change.after) && (
                            <details className="mt-2">
                              <summary className="text-slate-400 cursor-pointer">View Changes</summary>
                              <pre className="mt-1 text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto">
                                {JSON.stringify({
                                  before: entry.change.before,
                                  after: entry.change.after
                                }, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* File Metadata */}
          {analysis.file_metadata && (
            <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/30">
              <h4 className="text-sm font-medium text-white mb-2">File Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Filename:</span>
                  <span className="text-white ml-1">{analysis.file_metadata.filename}</span>
                </div>
                <div>
                  <span className="text-slate-400">Size:</span>
                  <span className="text-white ml-1">{(analysis.file_metadata.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-slate-400">Format:</span>
                  <span className="text-white ml-1">{analysis.file_metadata.detected_format}</span>
                </div>
                {analysis.file_metadata.operation_type && (
                  <div>
                    <span className="text-slate-400">Operation:</span>
                    <span className="text-white ml-1">{analysis.file_metadata.operation_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error States */}
      {(uploadMutation.isError || parseMutation.isError) && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-300">
              {uploadMutation.error?.message || parseMutation.error?.message || 'An error occurred'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerraformLogsViewer; 