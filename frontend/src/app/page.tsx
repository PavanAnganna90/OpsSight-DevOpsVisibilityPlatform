'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * OpsSight Landing Page - Following Design Rules
 * Design Goals: Clarity & Focus, Calmness Under Chaos, Tactile & Responsive, Trust & Control
 * Hierarchy: Overview → Drill-down → Action
 */
export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringAction, setIsHoveringAction] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearInterval(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Real-time System Health (Progress Rings - Behavioral Psychology)
  const [systemHealth, setSystemHealth] = useState([
    { name: 'CI/CD', status: 'healthy', value: 98.7, trend: '+2.3%', icon: '🚀', color: 'emerald' },
    { name: 'K8s Pods', status: 'excellent', value: 99.2, trend: '-1 restart', icon: '⚙️', color: 'blue' },
    { name: 'Cost', status: 'warning', value: 87.4, trend: '+12%', icon: '💰', color: 'amber' },
    { name: 'Latency', status: 'excellent', value: 95.8, trend: '-8ms', icon: '⚡', color: 'cyan' }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemHealth(prev => prev.map(metric => {
        const change = (Math.random() - 0.5) * 1.5;
        const newValue = Math.max(85, Math.min(100, metric.value + change));
        return { ...metric, value: Math.round(newValue * 10) / 10 };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return { bg: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/25' };
      case 'healthy': return { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/25' };
      case 'warning': return { bg: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/25' };
      case 'critical': return { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/25' };
      default: return { bg: 'bg-slate-500', text: 'text-slate-400', glow: 'shadow-slate-500/25' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden font-['Inter'] relative">
      {/* Ambient Background with Mouse Parallax */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        <div 
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`,
            top: '10%',
            left: '10%'
          }}
        ></div>
        <div 
          className="absolute w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${-mousePosition.x * 0.05}px, ${-mousePosition.y * 0.05}px)`,
            bottom: '10%',
            right: '10%'
          }}
        ></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section - Overview Level */}
        <section className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            
            {/* Ambient Alert - System Status */}
            <div className={`inline-flex items-center px-6 py-3 rounded-full bg-slate-800/40 backdrop-blur-lg border border-emerald-500/30 mb-12 transition-all duration-1000 hover:border-emerald-500/50 hover:bg-slate-800/60 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="relative mr-3">
                <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <span className="text-sm font-medium text-emerald-400">All Systems Operational</span>
              <div className="mx-4 w-px h-4 bg-slate-600"></div>
              <span className="text-xs text-slate-400 tabular-nums">{currentTime.toLocaleTimeString()}</span>
              <kbd className="ml-4 px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400 border border-slate-600">⌘K</kbd>
            </div>

            {/* Clear Hierarchy - Main Message */}
            <div className="text-center mb-20">
              <h1 className={`text-6xl lg:text-8xl font-bold mb-8 transition-all duration-1000 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <span className="text-white">DevOps</span>{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Visibility
                </span>
                <br />
                <span className="text-slate-400 text-4xl lg:text-5xl font-light">Platform</span>
              </h1>

              <p className={`max-w-4xl mx-auto text-xl text-slate-300 leading-relaxed mb-16 transition-all duration-1000 delay-400 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                Transform chaos into clarity with AI-powered monitoring. Like a{' '}
                <span className="text-cyan-400 font-semibold">pilot's cockpit</span>, 
                everything you need at a glance.
              </p>

              {/* Primary Action - Confident & Tactile */}
              <div className={`transition-all duration-1000 delay-600 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <Link
                  href="/dashboard"
                  onMouseEnter={() => setIsHoveringAction(true)}
                  onMouseLeave={() => setIsHoveringAction(false)}
                  className={`group relative inline-flex items-center px-12 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-2xl shadow-2xl transform transition-all duration-300 hover:shadow-cyan-500/30 hover:-translate-y-2 hover:scale-105 ${isHoveringAction ? 'animate-pulse' : ''}`}
                >
                  <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Launch Command Center
                  <div className="ml-4 w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                </Link>
              </div>
            </div>

            {/* System Health Overview - Progress Rings (Behavioral Psychology) */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20 transition-all duration-1000 delay-800 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              {systemHealth.map((metric, index) => {
                const colors = getStatusColor(metric.status);
                const circumference = 2 * Math.PI * 45;
                const strokeDasharray = `${(metric.value / 100) * circumference} ${circumference}`;
                
                return (
                  <div key={metric.name} className="group relative">
                    <div className={`bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-500 hover:scale-105 ${colors.glow} hover:shadow-2xl`}>
                      {/* Accent line (clean color cue) */}
                      <div className={`absolute top-0 left-8 right-8 h-1 ${colors.bg} rounded-full opacity-80`}></div>
                      
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-3xl">{metric.icon}</span>
                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${colors.text} bg-current/10 border border-current/20`}>
                          {metric.trend}
                        </div>
                      </div>

                      {/* Progress Ring - Visual, not numbers */}
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            className="text-slate-700"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            className={colors.text}
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={strokeDasharray}
                            strokeLinecap="round"
                            style={{
                              transition: 'stroke-dasharray 1s ease-in-out',
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${colors.text}`}>
                            {Math.round(metric.value)}%
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-white font-bold text-center text-lg">{metric.name}</h3>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* What's Happening Now Strip - AI Summary */}
            <div className={`bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-3xl p-8 border border-cyan-500/30 mb-20 transition-all duration-1000 delay-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-cyan-400 font-bold text-lg mb-2">AI Operations Summary</div>
                  <div className="text-slate-200 text-lg">
                    <span className="text-emerald-400 font-semibold">Deployments stable.</span> No critical alerts in last 3 hours. 
                    <span className="text-amber-400 font-semibold"> Cost trending up 12%</span> - optimization recommendations available.
                  </div>
                </div>
                <div className="text-slate-400 text-sm">
                  Last updated: {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Action Cards - Drill-down Level */}
            <div className={`grid md:grid-cols-3 gap-8 transition-all duration-1000 delay-1200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              {[
                {
                  title: 'Command Center',
                  description: 'Real-time dashboard with AI insights and interactive controls',
                  href: '/dashboard',
                  gradient: 'from-cyan-400 to-blue-600',
                  icon: '📊',
                  badge: 'Live'
                },
                {
                  title: 'Theme System',
                  description: 'Sophisticated themes with accessibility and circadian rhythm support',
                  href: '/themes',
                  gradient: 'from-purple-400 to-pink-600',
                  icon: '🎨',
                  badge: 'Premium'
                },
                {
                  title: 'Component Lab',
                  description: 'Interactive component library with live documentation',
                  href: 'http://localhost:6006',
                  gradient: 'from-emerald-400 to-green-600',
                  icon: '🧪',
                  badge: 'Interactive',
                  external: true
                }
              ].map((feature, index) => (
                <Link
                  key={feature.title}
                  href={feature.href}
                  target={feature.external ? '_blank' : '_self'}
                  rel={feature.external ? 'noopener noreferrer' : undefined}
                  className="group relative bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-4xl">{feature.icon}</div>
                    <div className={`px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${feature.gradient} text-white`}>
                      {feature.badge}
                    </div>
                  </div>
                  
                  <h3 className="text-white font-bold text-xl mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-cyan-400 group-hover:to-blue-600 transition-all duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-300 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  <div className="flex items-center text-cyan-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    <span>Explore</span>
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  
                  {/* Hover gradient overlay */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
