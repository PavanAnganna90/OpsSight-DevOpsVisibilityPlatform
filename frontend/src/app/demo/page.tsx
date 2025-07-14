'use client';

import React, { useState, useEffect } from 'react';
import { useLiveData } from '../../hooks/useLiveData';

/**
 * OpsSight Demo Page - Showcasing All Design Principles
 * Demonstrates: Command-K interface, behavioral psychology, real-time updates,
 * pilot cockpit layout, progress rings, ambient alerts, and modern UX
 */
export default function DemoPage() {
  const { systemPulse, liveEvents, sparklineData } = useLiveData();
  const [commandPaletteHint, setCommandPaletteHint] = useState(true);
  const [activeDemo, setActiveDemo] = useState('overview');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Hide Command-K hint after 10 seconds
    const hintTimer = setTimeout(() => setCommandPaletteHint(false), 10000);
    
    return () => {
      clearInterval(timer);
      clearTimeout(hintTimer);
    };
  }, []);

  // Progress ring component with behavioral psychology
  const ProgressRing = ({ value, label, color, size = 120 }: {
    value: number;
    label: string;
    color: string;
    size?: number;
  }) => {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <div className="relative flex flex-col items-center group">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-700/30"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={`text-${color}-500 transition-all duration-1000 ease-out`}
              style={{
                filter: 'drop-shadow(0 0 8px rgb(59 130 246 / 0.5))'
              }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {Math.round(value)}%
            </span>
          </div>
        </div>
        <span className="mt-3 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
          {label}
        </span>
      </div>
    );
  };

  // Sparkline mini-chart component
  const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <svg width="100" height="30" className="overflow-visible">
        <polyline
          fill="none"
          stroke={`rgb(59 130 246)`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={data
            .map((value, index) => {
              const x = (index / (data.length - 1)) * 95;
              const y = 25 - ((value - min) / range) * 20;
              return `${x},${y}`;
            })
            .join(' ')}
        />
        {/* Glow effect */}
        <polyline
          fill="none"
          stroke={`rgb(59 130 246)`}
          strokeWidth="4"
          strokeOpacity="0.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={data
            .map((value, index) => {
              const x = (index / (data.length - 1)) * 95;
              const y = 25 - ((value - min) / range) * 20;
              return `${x},${y}`;
            })
            .join(' ')}
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Command-K Hint (Behavioral Psychology Touch) */}
      {commandPaletteHint && (
        <div className="fixed top-20 right-6 z-40 bg-blue-600/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-500/50 animate-pulse">
          <p className="text-sm font-medium">
            Press <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">⌘K</kbd> for quick commands
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex space-x-6">
            {[
              { id: 'overview', label: 'System Overview', icon: '🏠' },
              { id: 'progress', label: 'Progress Rings', icon: '⭕' },
              { id: 'realtime', label: 'Real-time Data', icon: '📊' },
              { id: 'interactions', label: 'Micro-interactions', icon: '✨' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemo(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeDemo === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Demo Section: Overview */}
        {activeDemo === 'overview' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                OpsSight Design Principles Demo
              </h1>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                Experience the pilot cockpit design with behavioral psychology touches,
                real-time updates, and modern UX patterns following our design rules.
              </p>
            </div>

            {/* 3-Column Pilot Cockpit Layout */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Panel: System Pulse */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <h2 className="text-lg font-semibold text-slate-300 mb-4">System Pulse</h2>
                {systemPulse.map((metric, index) => (
                  <div
                    key={metric.name}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-300">{metric.name}</span>
                      <span className="text-lg">{metric.icon}</span>
                    </div>
                    
                    {/* Accent line (behavioral psychology) */}
                    <div className={`h-1 rounded-full mb-3 bg-gradient-to-r ${
                      metric.status === 'excellent' ? 'from-emerald-500 to-green-400' :
                      metric.status === 'healthy' ? 'from-blue-500 to-cyan-400' :
                      metric.status === 'warning' ? 'from-amber-500 to-orange-400' :
                      'from-red-500 to-pink-400'
                    }`} />
                    
                    <div className="text-2xl font-bold text-white mb-1">
                      {metric.value}%
                    </div>
                    <div className="text-xs text-slate-400">{metric.details}</div>
                  </div>
                ))}
              </div>

              {/* Center Panel: Command Center */}
              <div className="col-span-12 lg:col-span-6 space-y-6">
                <h2 className="text-lg font-semibold text-slate-300 mb-4">Command Center</h2>
                
                {/* AI Summary Strip */}
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-slate-300">
                      AI Insights: Deployments stable. No critical alerts in last 3h. Performance optimal.
                    </span>
                  </div>
                </div>

                {/* Live Events Feed */}
                <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50">
                  <div className="p-4 border-b border-slate-700/50">
                    <h3 className="font-semibold text-slate-300">Live Activity</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {liveEvents.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className="p-4 border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{event.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{event.message}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-slate-400">{event.service}</span>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-400">{event.time}</span>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            event.status === 'success' ? 'bg-green-400' :
                            event.status === 'warning' ? 'bg-amber-400' :
                            event.status === 'error' ? 'bg-red-400' :
                            'bg-blue-400'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel: Actions & Insights */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <h2 className="text-lg font-semibold text-slate-300 mb-4">Quick Actions</h2>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-600/25">
                    🚀 Deploy
                  </button>
                  <button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-amber-600/25">
                    ⏪ Rollback
                  </button>
                  <button className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105">
                    📋 View Logs
                  </button>
                </div>

                {/* Mini Sparklines */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Resource Usage</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">CPU</span>
                      <MiniSparkline data={sparklineData.cpu} color="blue" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Memory</span>
                      <MiniSparkline data={sparklineData.memory} color="green" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Network</span>
                      <MiniSparkline data={sparklineData.network} color="purple" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Demo Section: Progress Rings */}
        {activeDemo === 'progress' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Progress Rings vs Raw Numbers</h2>
              <p className="text-slate-300">
                Behavioral psychology: Progress rings are easier on cognitive load than raw numbers
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
              {systemPulse.map((metric) => (
                <ProgressRing
                  key={metric.name}
                  value={metric.value}
                  label={metric.name}
                  color={metric.color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Demo Section: Real-time Data */}
        {activeDemo === 'realtime' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Live Real-time Updates</h2>
              <p className="text-slate-300 mb-2">
                Data updates every 2-6 seconds with realistic variations
              </p>
              <p className="text-sm text-slate-400">
                Last updated: {currentTime.toLocaleTimeString()}
              </p>
            </div>

            {/* Real-time metrics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {systemPulse.map((metric) => (
                <div
                  key={metric.name}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-300">{metric.name}</h3>
                    <span className="text-2xl">{metric.icon}</span>
                  </div>
                  
                  <div className="text-3xl font-bold text-white mb-2">
                    {metric.value}%
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{metric.duration}</span>
                    <span className={`font-medium ${
                      metric.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {metric.trend}
                    </span>
                  </div>
                  
                  <div className="mt-3 text-xs text-slate-500">
                    {metric.details}
                  </div>
                  
                  {/* Last update indicator */}
                  <div className="mt-3 text-xs text-slate-600">
                    Updated {metric.lastUpdate ? Math.floor((Date.now() - metric.lastUpdate.getTime()) / 1000) : 0}s ago
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo Section: Micro-interactions */}
        {activeDemo === 'interactions' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Tactile & Responsive Design</h2>
              <p className="text-slate-300">
                Micro-interactions, hover effects, and motion guide attention
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Hover Card */}
              <div className="group bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-600/20 cursor-pointer">
                <div className="text-center">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
                  <h3 className="font-semibold text-white mb-2">Hover Effects</h3>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    Watch the scale, shadows, and colors change on hover
                  </p>
                </div>
              </div>

              {/* Pulse Animation */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="text-4xl mb-4">🔥</div>
                    <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping"></div>
                  </div>
                  <h3 className="font-semibold text-white mb-2">Ambient Alerts</h3>
                  <p className="text-sm text-slate-400">
                    Subtle animations for calm notifications
                  </p>
                </div>
              </div>

              {/* Interactive Button */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                <div className="text-center">
                  <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-110 hover:rotate-1 hover:shadow-lg hover:shadow-purple-600/25 active:scale-95">
                    Interactive Button
                  </button>
                  <h3 className="font-semibold text-white mb-2 mt-4">Tactile Feedback</h3>
                  <p className="text-sm text-slate-400">
                    Scale, rotate, and shadow effects on interaction
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-900/50 border-t border-slate-700/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400">
            OpsSight Demo - Showcasing modern DevOps UX with behavioral psychology and pilot cockpit design
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Try pressing <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">⌘K</kbd> for the command palette
          </p>
        </div>
      </div>
    </div>
  );
} 