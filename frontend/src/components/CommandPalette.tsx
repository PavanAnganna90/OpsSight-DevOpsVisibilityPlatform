'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Command {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  action: () => void;
  keywords: string[];
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Command definitions
  const commands: Command[] = [
    {
      id: 'deploy-prod',
      title: 'Deploy to Production',
      description: 'Release the latest build to production environment',
      category: 'Deployment',
      icon: '🚀',
      action: () => console.log('Deploying to production...'),
      keywords: ['deploy', 'production', 'release', 'ship']
    },
    {
      id: 'deploy-staging',
      title: 'Deploy to Staging',
      description: 'Release the latest build to staging environment',
      category: 'Deployment',
      icon: '🧪',
      action: () => console.log('Deploying to staging...'),
      keywords: ['deploy', 'staging', 'test', 'preview']
    },
    {
      id: 'rollback',
      title: 'Rollback Last Deploy',
      description: 'Revert to the previous stable deployment',
      category: 'Deployment',
      icon: '⏪',
      action: () => console.log('Rolling back...'),
      keywords: ['rollback', 'revert', 'undo', 'previous']
    },
    {
      id: 'view-logs',
      title: 'View System Logs',
      description: 'Open the comprehensive system logs viewer',
      category: 'Monitoring',
      icon: '📋',
      action: () => console.log('Opening logs...'),
      keywords: ['logs', 'monitoring', 'debug', 'errors']
    },
    {
      id: 'find-alert-prod',
      title: 'Find Alert from Production',
      description: 'Search for alerts and incidents in production',
      category: 'Monitoring',
      icon: '⚠️',
      action: () => console.log('Searching production alerts...'),
      keywords: ['alert', 'production', 'incident', 'error', 'find']
    },
    {
      id: 'scale-pods',
      title: 'Scale Kubernetes Pods',
      description: 'Adjust the number of running pod replicas',
      category: 'Infrastructure',
      icon: '📈',
      action: () => console.log('Scaling pods...'),
      keywords: ['scale', 'kubernetes', 'pods', 'replicas', 'k8s']
    },
    {
      id: 'restart-service',
      title: 'Restart Service',
      description: 'Restart a specific microservice',
      category: 'Infrastructure',
      icon: '🔄',
      action: () => console.log('Restarting service...'),
      keywords: ['restart', 'service', 'reboot', 'refresh']
    },
    {
      id: 'check-health',
      title: 'System Health Check',
      description: 'Run comprehensive health diagnostics',
      category: 'Monitoring',
      icon: '💚',
      action: () => console.log('Running health check...'),
      keywords: ['health', 'check', 'status', 'diagnostics']
    },
    {
      id: 'manage-team',
      title: 'Manage Team Access',
      description: 'Configure user permissions and roles',
      category: 'Administration',
      icon: '👥',
      action: () => console.log('Opening team management...'),
      keywords: ['team', 'users', 'permissions', 'access', 'roles']
    },
    {
      id: 'cost-analysis',
      title: 'Cost Analysis Report',
      description: 'Generate detailed cloud cost breakdown',
      category: 'Analytics',
      icon: '💰',
      action: () => console.log('Generating cost report...'),
      keywords: ['cost', 'billing', 'report', 'analysis', 'spend']
    },
    {
      id: 'analytics-dashboard',
      title: 'Open Analytics Dashboard',
      description: 'View detailed usage analytics and AI insights',
      category: 'Navigation',
      icon: '📊',
      action: () => window.location.href = '/analytics',
      keywords: ['analytics', 'dashboard', 'insights', 'metrics', 'data']
    },
    {
      id: 'ask-copilot',
      title: 'Ask OpsCopilot',
      description: 'Get AI-powered operational assistance',
      category: 'AI Assistant',
      icon: '🤖',
      action: () => {
        // Trigger OpsCopilot modal
        const event = new CustomEvent('openOpsCopilot');
        window.dispatchEvent(event);
      },
      keywords: ['ai', 'copilot', 'assistant', 'help', 'ask', 'chat']
    },
    {
      id: 'anomaly-detection',
      title: 'View Anomaly History',
      description: 'Browse ML-detected system anomalies',
      category: 'AI Assistant',
      icon: '🔍',
      action: () => window.location.href = '/analytics?tab=anomalies',
      keywords: ['anomaly', 'detection', 'ml', 'ai', 'issues', 'problems']
    },
    {
      id: 'cost-optimization',
      title: 'Cost Optimization Recommendations',
      description: 'View AI-generated cost saving opportunities',
      category: 'AI Assistant',
      icon: '💡',
      action: () => window.location.href = '/analytics?tab=costs',
      keywords: ['cost', 'optimization', 'savings', 'recommendations', 'efficiency']
    }
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(command => {
    const searchLower = search.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchLower) ||
      command.description.toLowerCase().includes(searchLower) ||
      command.category.toLowerCase().includes(searchLower) ||
      command.keywords.some(keyword => keyword.includes(searchLower))
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
        setSelectedIndex(0);
        return;
      }

      if (!isOpen) return;

      // Close with Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
        return;
      }

      // Navigate with arrow keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      }

      // Execute with Enter
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
        setSearch('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32">
      <div className="w-full max-w-2xl mx-4">
        <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center px-6 py-4 border-b border-slate-700/50">
            <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-lg"
              autoFocus
            />
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <kbd className="px-2 py-1 bg-slate-700/50 rounded border border-slate-600 font-mono">
                ⌘K
              </kbd>
              <span>to open</span>
            </div>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {Object.keys(groupedCommands).length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.56-.961-6.172-2.472" />
                </svg>
                <p className="text-lg font-medium mb-2">No commands found</p>
                <p className="text-sm">Try searching for deploy, logs, or scale</p>
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                  <div key={category} className="mb-1">
                    <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {category}
                    </div>
                    {categoryCommands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <button
                          key={command.id}
                          onClick={() => {
                            command.action();
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={`w-full px-6 py-3 text-left transition-all duration-150 ${
                            isSelected 
                              ? 'bg-cyan-500/20 border-l-2 border-cyan-400' 
                              : 'hover:bg-slate-700/30'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{command.icon}</span>
                            <div className="flex-1">
                              <div className={`font-medium ${
                                isSelected ? 'text-cyan-400' : 'text-white'
                              }`}>
                                {command.title}
                              </div>
                              <div className="text-sm text-slate-400">
                                {command.description}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="text-xs text-slate-400 flex items-center space-x-1">
                                <kbd className="px-1 py-0.5 bg-slate-700/50 rounded text-xs">
                                  ↵
                                </kbd>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-slate-700/50 rounded">↑↓</kbd>
                  <span>navigate</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-slate-700/50 rounded">↵</kbd>
                  <span>select</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-slate-700/50 rounded">esc</kbd>
                  <span>close</span>
                </div>
              </div>
              <div className="text-slate-500">
                {filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 