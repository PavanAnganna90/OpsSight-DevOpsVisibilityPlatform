'use client';

import React, { useState, useEffect } from 'react';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { LoadingSpinner, ProgressBar } from '../../components/ui/LoadingStates';
import Sparkline from '../../components/Sparkline';

interface AnalyticsData {
  deployments: {
    totalCount: number;
    dailyAverage: number;
    successRate: number;
    trend: number[];
  };
  alerts: {
    totalCount: number;
    frequency: number;
    severityBreakdown: { [key: string]: number };
    trend: number[];
  };
  anomalies: Array<{
    id: string;
    timestamp: Date;
    service: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mlConfidence: number;
    resolution?: string;
  }>;
  costOptimization: Array<{
    id: string;
    type: 'unused' | 'oversized' | 'policy' | 'scheduling';
    resource: string;
    currentCost: number;
    potentialSavings: number;
    recommendation: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  usage: {
    apiCalls: { current: number; previous: number; trend: number[] };
    activeUsers: { current: number; previous: number; trend: number[] };
    dataTransfer: { current: number; previous: number; trend: number[] };
  };
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'anomalies' | 'costs' | 'usage'>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    // Simulate data loading
    const loadAnalytics = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAnalyticsData({
        deployments: {
          totalCount: 127,
          dailyAverage: 4.2,
          successRate: 94.5,
          trend: [5, 3, 7, 4, 6, 5, 8, 3, 5, 4, 6, 7, 4, 5]
        },
        alerts: {
          totalCount: 89,
          frequency: 2.8,
          severityBreakdown: { low: 45, medium: 32, high: 9, critical: 3 },
          trend: [3, 5, 2, 4, 1, 6, 3, 2, 4, 3, 5, 2, 1, 3]
        },
        anomalies: [
          {
            id: '1',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            service: 'payment-api',
            type: 'Response Time Spike',
            severity: 'high',
            description: 'API response time increased by 340% during peak hours',
            mlConfidence: 0.94,
            resolution: 'Auto-scaled to 3 additional instances'
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            service: 'user-database',
            type: 'Connection Pool Exhaustion',
            severity: 'critical',
            description: 'Database connection pool reached 98% capacity',
            mlConfidence: 0.97,
            resolution: 'Increased pool size and optimized queries'
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            service: 'cache-cluster',
            type: 'Memory Usage Anomaly',
            severity: 'medium',
            description: 'Cache hit ratio dropped from 95% to 67%',
            mlConfidence: 0.89
          }
        ],
        costOptimization: [
          {
            id: '1',
            type: 'unused',
            resource: 'Application Load Balancer (dev-alb-2)',
            currentCost: 340,
            potentialSavings: 340,
            recommendation: 'Delete unused load balancer in development environment',
            effort: 'low'
          },
          {
            id: '2',
            type: 'oversized',
            resource: 'RDS Instance (production-db)',
            currentCost: 580,
            potentialSavings: 220,
            recommendation: 'Downgrade from db.r5.2xlarge to db.r5.xlarge',
            effort: 'medium'
          },
          {
            id: '3',
            type: 'scheduling',
            resource: 'Development Environment EC2',
            currentCost: 480,
            potentialSavings: 240,
            recommendation: 'Implement auto-shutdown outside business hours',
            effort: 'low'
          }
        ],
        usage: {
          apiCalls: { 
            current: 2340000, 
            previous: 2180000, 
            trend: [180, 195, 210, 225, 240, 235, 245, 250, 260, 255, 270, 275, 280, 285]
          },
          activeUsers: { 
            current: 15670, 
            previous: 14920, 
            trend: [149, 151, 153, 156, 158, 155, 159, 162, 165, 163, 167, 169, 171, 157]
          },
          dataTransfer: { 
            current: 1240, 
            previous: 1180, 
            trend: [118, 120, 125, 128, 130, 127, 132, 135, 138, 136, 140, 142, 145, 124]
          }
        }
      });
      
      setIsLoading(false);
    };

    loadAnalytics();
  }, [dateRange, timezone]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPercentageChange = (current: number, previous: number) => {
    return ((current - previous) / previous * 100);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'low': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-400 mt-4">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-slate-300 mt-2">Detailed usage analytics and AI-powered insights</p>
            </div>
            <DateRangeFilter
              onDateRangeChange={setDateRange}
              onTimezoneChange={setTimezone}
              initialRange={dateRange}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-800/40 rounded-lg p-1 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'anomalies', label: 'Anomaly History', icon: '🔍' },
            { id: 'costs', label: 'Cost Optimization', icon: '💰' },
            { id: 'usage', label: 'Usage Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {/* Deployments Card */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Deployments</h3>
                <span className="text-2xl">🚀</span>
              </div>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-white">{analyticsData.deployments.totalCount}</div>
                <div className="text-sm text-slate-400">
                  {analyticsData.deployments.dailyAverage}/day average
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Success Rate</span>
                  <span className="text-emerald-400 font-medium">{analyticsData.deployments.successRate}%</span>
                </div>
                <Sparkline data={analyticsData.deployments.trend} className="h-8" color="#10b981" />
              </div>
            </div>

            {/* Alerts Card */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Alerts</h3>
                <span className="text-2xl">🚨</span>
              </div>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-white">{analyticsData.alerts.totalCount}</div>
                <div className="text-sm text-slate-400">
                  {analyticsData.alerts.frequency}/day frequency
                </div>
                <div className="space-y-1">
                  {Object.entries(analyticsData.alerts.severityBreakdown).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between text-xs">
                      <span className={`capitalize ${getSeverityColor(severity)}`}>{severity}</span>
                      <span className="text-slate-400">{count}</span>
                    </div>
                  ))}
                </div>
                <Sparkline data={analyticsData.alerts.trend} className="h-8" color="#ef4444" />
              </div>
            </div>

            {/* Usage Metrics */}
            {[
              { label: 'API Calls', data: analyticsData.usage.apiCalls, unit: '' },
              { label: 'Active Users', data: analyticsData.usage.activeUsers, unit: '' }
            ].map((metric) => {
              const change = getPercentageChange(metric.data.current, metric.data.previous);
              return (
                <div key={metric.label} className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{metric.label}</h3>
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold text-white">{formatNumber(metric.data.current)}</div>
                    <div className={`text-sm flex items-center space-x-1 ${
                      change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      <span>{change >= 0 ? '↗' : '↘'}</span>
                      <span>{Math.abs(change).toFixed(1)}% vs last period</span>
                    </div>
                    <Sparkline data={metric.data.trend} className="h-8" color="#06b6d4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Anomalies Tab */}
        {selectedTab === 'anomalies' && analyticsData && (
          <div className="space-y-6">
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <span className="mr-3">🔍</span>
                ML-Detected Anomalies
              </h3>
              
              <div className="space-y-4">
                {analyticsData.anomalies.map((anomaly) => (
                  <div key={anomaly.id} className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-cyan-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-white font-medium">{anomaly.type}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(anomaly.severity)}`}>
                            {anomaly.severity}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {anomaly.timestamp.toLocaleDateString()} {anomaly.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{anomaly.description}</p>
                        <div className="flex items-center space-x-4 text-xs">
                          <span className="text-slate-400">Service: <span className="text-cyan-400">{anomaly.service}</span></span>
                          <span className="text-slate-400">ML Confidence: <span className="text-emerald-400">{(anomaly.mlConfidence * 100).toFixed(1)}%</span></span>
                        </div>
                        {anomaly.resolution && (
                          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
                            <span className="text-emerald-400 text-sm font-medium">Resolution: </span>
                            <span className="text-slate-300 text-sm">{anomaly.resolution}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cost Optimization Tab */}
        {selectedTab === 'costs' && analyticsData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-3">Potential Savings</h3>
                <div className="text-3xl font-bold text-emerald-400">
                  ${analyticsData.costOptimization.reduce((sum, item) => sum + item.potentialSavings, 0)}/month
                </div>
              </div>
              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-3">Opportunities</h3>
                <div className="text-3xl font-bold text-cyan-400">{analyticsData.costOptimization.length}</div>
              </div>
              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-3">Quick Wins</h3>
                <div className="text-3xl font-bold text-blue-400">
                  {analyticsData.costOptimization.filter(item => item.effort === 'low').length}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <span className="mr-3">💰</span>
                Cost Optimization Recommendations
              </h3>
              
              <div className="space-y-4">
                {analyticsData.costOptimization.map((item) => (
                  <div key={item.id} className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-amber-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-white font-medium">{item.resource}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs border ${
                            item.effort === 'low' ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' :
                            item.effort === 'medium' ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' :
                            'text-red-400 bg-red-500/20 border-red-500/30'
                          }`}>
                            {item.effort} effort
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm mb-3">{item.recommendation}</p>
                        <div className="flex items-center space-x-6 text-sm">
                          <span className="text-slate-400">Current: <span className="text-red-400">${item.currentCost}/month</span></span>
                          <span className="text-slate-400">Savings: <span className="text-emerald-400">${item.potentialSavings}/month</span></span>
                        </div>
                      </div>
                      <button className="ml-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors">
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Usage Analytics Tab */}
        {selectedTab === 'usage' && analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { label: 'API Calls', data: analyticsData.usage.apiCalls, unit: 'calls' },
              { label: 'Active Users', data: analyticsData.usage.activeUsers, unit: 'users' },
              { label: 'Data Transfer', data: analyticsData.usage.dataTransfer, unit: 'GB' }
            ].map((metric) => {
              const change = getPercentageChange(metric.data.current, metric.data.previous);
              return (
                <div key={metric.label} className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-semibold text-white mb-6">{metric.label}</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-white">{formatNumber(metric.data.current)}</div>
                        <div className="text-slate-400 text-sm">{metric.unit}</div>
                      </div>
                      <div className={`text-right ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        <div className="flex items-center space-x-1">
                          <span>{change >= 0 ? '↗' : '↘'}</span>
                          <span className="font-medium">{Math.abs(change).toFixed(1)}%</span>
                        </div>
                        <div className="text-xs text-slate-400">vs last period</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Trend (14 days)</span>
                        <span>Current: {formatNumber(metric.data.current)}</span>
                      </div>
                      <Sparkline data={metric.data.trend} className="h-16" color="#3b82f6" />
                    </div>
                    
                    <ProgressBar
                      progress={Math.min((metric.data.current / (metric.data.previous * 1.5)) * 100, 100)}
                      label="Capacity Usage"
                      className="mt-4"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 