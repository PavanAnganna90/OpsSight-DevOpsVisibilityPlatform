'use client';

import React from 'react';
import { Server, Cpu, HardDrive, Network, Activity, AlertTriangle, Zap, TrendingUp } from 'lucide-react';

// Modern Metric Card Component
function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  trend 
}: {
  title: string;
  value: string;
  change: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  trend?: number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <div className="flex items-center mt-3 gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              changeType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              changeType === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
              {changeType === 'negative' && <TrendingUp className="h-3 w-3 rotate-180" />}
              <span>{change}</span>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}

// Modern Cluster Card Component  
function ClusterCard({ 
  name, 
  description, 
  status, 
  version, 
  lastDeployed, 
  nodes, 
  cpuUsage 
}: {
  name: string;
  description: string;
  status: 'healthy' | 'warning' | 'error';
  version: string;
  lastDeployed: string;
  nodes: number;
  cpuUsage: number;
}) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    error: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
  };

  const statusDots = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500', 
    error: 'bg-red-500'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
            <div className={`w-3 h-3 rounded-full ${statusDots[status]}`}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{version}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Nodes</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{nodes}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{cpuUsage}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Last Deploy</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{lastDeployed}</span>
        </div>
      </div>
      
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border ${statusColors[status]}`}>
        <div className={`w-2 h-2 rounded-full ${statusDots[status]}`}></div>
        <span className="capitalize">{status}</span>
      </div>
    </div>
  );
}

export default function InfrastructurePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Platform Engineering</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage services, deployments, and infrastructure</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">All Systems Operational</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">99.9% uptime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Infrastructure Overview */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Platform Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Services" 
              value="24"
              change="+2 this week"
              changeType="positive"
              icon={Server}
            />
            <MetricCard
              title="System Uptime"
              value="99.9%"
              change="Last 30 days"
              changeType="positive"
              icon={Activity}
            />
            <MetricCard
              title="Deployments Today"
              value="12"
              change="+4 vs yesterday"
              changeType="positive"
              icon={Zap}
            />
            <MetricCard
              title="Active Developers"
              value="8"
              change="2 deploying now"
              changeType="neutral"
              icon={HardDrive}
            />
          </div>
        </section>

        {/* Services Status */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Services Status</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Authentication API</h3>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">healthy</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Resource Usage */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resource Usage</h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">CPU Usage</span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">67%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: '67%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Memory Usage</span>
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">84%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="bg-yellow-500 h-3 rounded-full transition-all duration-500" style={{ width: '84%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Storage Usage</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">78%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}