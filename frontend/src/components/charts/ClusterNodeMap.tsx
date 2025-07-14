/**
 * Cluster Node Map Component
 * 
 * Visual representation of Kubernetes cluster nodes in a grid layout,
 * showing status, health, and resource utilization for each node.
 */

import React, { useMemo } from 'react';
import { NodeDetail, NodeStatus } from '../../types/cluster';

interface ClusterNodeMapProps {
  /** Array of node details to display */
  nodes: NodeDetail[];
  /** Optional click handler for node selection */
  onNodeClick?: (node: NodeDetail) => void;
  /** Selected node (for highlighting) */
  selectedNode?: NodeDetail;
  /** Show detailed info on hover */
  showTooltip?: boolean;
  /** Grid layout configuration */
  gridConfig?: {
    columns?: 'auto' | 2 | 3 | 4 | 5 | 6;
    maxWidth?: string;
  };
  /** Component size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get node status configuration for styling and icons
 */
const getNodeStatusConfig = (status: NodeStatus) => {
  const configs = {
    ready: {
      color: 'bg-green-500',
      textColor: 'text-green-700 dark:text-green-300',
      borderColor: 'border-green-500',
      icon: '✓',
      label: 'Ready'
    },
    not_ready: {
      color: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-300',
      borderColor: 'border-red-500',
      icon: '✕',
      label: 'Not Ready'
    },
    scheduling_disabled: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      borderColor: 'border-yellow-500',
      icon: '⏸',
      label: 'Disabled'
    },
    unknown: {
      color: 'bg-gray-500',
      textColor: 'text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-500',
      icon: '?',
      label: 'Unknown'
    }
  };

  return configs[status] || configs.unknown;
};

/**
 * Get resource utilization color based on percentage
 */
const getUtilizationColor = (percentage?: number): string => {
  if (percentage === undefined) return 'bg-gray-200 dark:bg-gray-700';
  if (percentage < 50) return 'bg-green-200 dark:bg-green-800';
  if (percentage < 80) return 'bg-yellow-200 dark:bg-yellow-800';
  return 'bg-red-200 dark:bg-red-800';
};

/**
 * Format node name for display
 */
const formatNodeName = (name: string, maxLength = 15): string => {
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength - 3)}...`;
};

/**
 * Format percentage for display
 */
const formatPercentage = (value?: number): string => {
  if (value === undefined) return 'N/A';
  return `${Math.round(value)}%`;
};

/**
 * ClusterNodeMap Component
 */
export const ClusterNodeMap: React.FC<ClusterNodeMapProps> = ({
  nodes,
  onNodeClick,
  selectedNode,
  showTooltip = true,
  gridConfig = { columns: 'auto', maxWidth: '100%' },
  size = 'md',
  isLoading = false,
  className = '',
}) => {
  // Size configuration
  const sizeConfig = useMemo(() => {
    const configs = {
      sm: {
        nodeSize: 'w-20 h-20',
        fontSize: 'text-xs',
        iconSize: 'text-sm',
        padding: 'p-2',
        gap: 'gap-2'
      },
      md: {
        nodeSize: 'w-24 h-24',
        fontSize: 'text-sm',
        iconSize: 'text-base',
        padding: 'p-3',
        gap: 'gap-3'
      },
      lg: {
        nodeSize: 'w-28 h-28',
        fontSize: 'text-base',
        iconSize: 'text-lg',
        padding: 'p-4',
        gap: 'gap-4'
      }
    };
    return configs[size];
  }, [size]);

  // Grid configuration
  const gridClasses = useMemo(() => {
    if (gridConfig.columns === 'auto') {
      return 'grid-cols-auto-fit';
    }
    
    const columnClasses: Record<number, string> = {
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6'
    };
    
    return columnClasses[gridConfig.columns as number] || 'grid-cols-auto-fit';
  }, [gridConfig.columns]);

  // Node statistics
  const nodeStats = useMemo(() => {
    const ready = nodes.filter(n => n.status === 'ready').length;
    const notReady = nodes.filter(n => n.status === 'not_ready').length;
    const disabled = nodes.filter(n => n.status === 'scheduling_disabled').length;
    const unknown = nodes.filter(n => n.status === 'unknown').length;

    return { ready, notReady, disabled, unknown, total: nodes.length };
  }, [nodes]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`} style={{ maxWidth: gridConfig.maxWidth }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
          <div className={`grid ${gridClasses} ${sizeConfig.gap}`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`${sizeConfig.nodeSize} bg-gray-200 dark:bg-gray-700 rounded-lg`}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No nodes state
  if (nodes.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 dark:text-gray-600">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">No cluster nodes available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ maxWidth: gridConfig.maxWidth }}>
      {/* Node Statistics Summary */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-700 dark:text-gray-300">Ready: {nodeStats.ready}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-700 dark:text-gray-300">Not Ready: {nodeStats.notReady}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-700 dark:text-gray-300">Disabled: {nodeStats.disabled}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span className="text-gray-700 dark:text-gray-300">Unknown: {nodeStats.unknown}</span>
        </div>
      </div>

      {/* Node Grid */}
      <div className={`grid ${gridClasses} ${sizeConfig.gap}`}>
        {nodes.map((node, index) => {
          const statusConfig = getNodeStatusConfig(node.status);
          const isSelected = selectedNode?.name === node.name;

          return (
            <div
              key={node.name}
              className={`
                ${sizeConfig.nodeSize} ${sizeConfig.padding}
                bg-white dark:bg-gray-800 border-2 rounded-lg shadow-sm
                ${statusConfig.borderColor}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                ${onNodeClick ? 'cursor-pointer hover:shadow-md' : ''}
                transition-all duration-200 relative group
              `}
              onClick={() => onNodeClick?.(node)}
              role={onNodeClick ? 'button' : undefined}
              tabIndex={onNodeClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onNodeClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onNodeClick(node);
                }
              }}
            >
              {/* Status Indicator */}
              <div className={`absolute -top-1 -right-1 w-6 h-6 ${statusConfig.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                {statusConfig.icon}
              </div>

              {/* Node Content */}
              <div className="flex flex-col justify-between h-full">
                {/* Node Name */}
                <div className={`${sizeConfig.fontSize} font-medium text-gray-900 dark:text-gray-100 truncate`}>
                  {formatNodeName(node.name)}
                </div>

                {/* Resource Utilization Bars */}
                <div className="space-y-1">
                  {/* CPU Usage */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                      <span>CPU</span>
                      <span>{formatPercentage(node.cpu_usage)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${getUtilizationColor(node.cpu_usage)}`}
                        style={{ width: `${Math.min(node.cpu_usage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                      <span>RAM</span>
                      <span>{formatPercentage(node.memory_usage)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${getUtilizationColor(node.memory_usage)}`}
                        style={{ width: `${Math.min(node.memory_usage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Disk Usage */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                      <span>Disk</span>
                      <span>{formatPercentage(node.disk_usage)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${getUtilizationColor(node.disk_usage)}`}
                        style={{ width: `${Math.min(node.disk_usage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="space-y-2">
                    <div className="font-medium">{node.name}</div>
                    <div className="text-xs">
                      <div>Status: <span className={statusConfig.textColor}>{statusConfig.label}</span></div>
                      <div>CPU: {formatPercentage(node.cpu_usage)}</div>
                      <div>Memory: {formatPercentage(node.memory_usage)}</div>
                      <div>Disk: {formatPercentage(node.disk_usage)}</div>
                      <div>Last Heartbeat: {new Date(node.last_heartbeat).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClusterNodeMap; 