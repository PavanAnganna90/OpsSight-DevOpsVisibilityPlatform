'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Server, 
  Activity, 
  Zap, 
  Users, 
  GitBranch,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Layers,
  Settings
} from "lucide-react";
import { MetricCard } from "@/components/orbit/MetricCard";
import { StatusIndicator } from "@/components/orbit/StatusIndicator";

/**
 * OpsSight Platform Engineering Dashboard
 * Redesigned with Orbit Platform Builder aesthetics
 */
export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const metrics = [
    {
      title: "Active Services",
      value: "24",
      change: "+2 this week",
      changeType: "positive" as const,
      icon: Server
    },
    {
      title: "System Uptime", 
      value: "99.9%",
      change: "Last 30 days",
      changeType: "positive" as const,
      icon: Activity
    },
    {
      title: "Deployments Today",
      value: "12",
      change: "+4 vs yesterday", 
      changeType: "positive" as const,
      icon: GitBranch
    },
    {
      title: "Active Developers",
      value: "8",
      change: "2 deploying now",
      changeType: "neutral" as const,
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text-primary truncate">
                Platform Engineering
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Manage services, deployments, and infrastructure
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shrink-0">
              <StatusIndicator status="healthy" label="All Systems Operational" />
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>99.9% uptime</span>
              </div>
              <Link
                href="/auth/sso"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Platform Overview */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Platform Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {metrics.map((metric, index) => (
              <MetricCard 
                key={metric.title}
                {...metric}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              />
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Link
              href="/dashboard"
              className="group relative bg-gradient-card border border-border rounded-lg p-6 shadow-soft hover:shadow-glow transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Dashboard</h3>
                  <p className="text-sm text-muted-foreground">Real-time insights</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Monitor system health, deployments, and performance metrics in real-time.
              </p>
              <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-300">
                <span>View Dashboard</span>
                <TrendingUp className="h-4 w-4 ml-1" />
              </div>
            </Link>

            <Link
              href="/infrastructure"
              className="group relative bg-gradient-card border border-border rounded-lg p-6 shadow-soft hover:shadow-glow transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Infrastructure</h3>
                  <p className="text-sm text-muted-foreground">Manage resources</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Comprehensive infrastructure monitoring and resource management.
              </p>
              <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-300">
                <span>Manage Infrastructure</span>
                <Server className="h-4 w-4 ml-1" />
              </div>
            </Link>

            <Link
              href="/settings"
              className="group relative bg-gradient-card border border-border rounded-lg p-6 shadow-soft hover:shadow-glow transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure platform</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Configure platform settings, user management, and integrations.
              </p>
              <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-300">
                <span>Platform Settings</span>
                <Settings className="h-4 w-4 ml-1" />
              </div>
            </Link>
          </div>
        </section>

        {/* System Status */}
        <section className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            System Status
          </h2>
          <div className="bg-gradient-card border border-border rounded-lg p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">All Systems Operational</h3>
                  <p className="text-muted-foreground">
                    All services are running normally. No incidents reported in the last 24 hours.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
