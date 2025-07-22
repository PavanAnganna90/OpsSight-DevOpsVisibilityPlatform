'use client';

import React from 'react';
import { Server, Cpu, HardDrive, Network, Activity, AlertTriangle } from 'lucide-react';
import { MetricCard } from '@/components/orbit/MetricCard';
import { ServiceCard } from '@/components/orbit/ServiceCard';
import { StatusIndicator } from '@/components/orbit/StatusIndicator';

export default function InfrastructurePage() {
  const infrastructureMetrics = [
    {
      title: "Active Servers",
      value: "24",
      change: "+2 this week",
      changeType: "positive" as const,
      icon: Server
    },
    {
      title: "CPU Usage",
      value: "67%",
      change: "Average across cluster",
      changeType: "neutral" as const,
      icon: Cpu
    },
    {
      title: "Storage Used",
      value: "1.2TB",
      change: "78% of total capacity",
      changeType: "neutral" as const,
      icon: HardDrive
    },
    {
      title: "Network Traffic",
      value: "450GB",
      change: "+12% this month",
      changeType: "positive" as const,
      icon: Network
    }
  ];

  const clusters = [
    {
      name: "Production Cluster",
      description: "Main production environment with high availability",
      status: "healthy" as const,
      version: "k8s v1.28.2",
      lastDeployed: "1 hour ago",
      url: "https://prod.cluster.com"
    },
    {
      name: "Staging Cluster",
      description: "Pre-production testing environment",
      status: "warning" as const,
      version: "k8s v1.28.1",
      lastDeployed: "3 hours ago",
      url: "https://staging.cluster.com"
    },
    {
      name: "Development Cluster",
      description: "Development and testing environment",
      status: "healthy" as const,
      version: "k8s v1.27.8",
      lastDeployed: "2 days ago"
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text-primary truncate">
                Infrastructure
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Monitor and manage your infrastructure resources
              </p>
            </div>
            <div className="shrink-0">
              <StatusIndicator status="healthy" label="Infrastructure Healthy" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Infrastructure Metrics */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Infrastructure Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {infrastructureMetrics.map((metric, index) => (
              <MetricCard 
                key={metric.title}
                {...metric}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              />
            ))}
          </div>
        </section>

        {/* Clusters */}
        <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Kubernetes Clusters
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {clusters.map((cluster, index) => (
              <ServiceCard 
                key={cluster.name} 
                {...cluster}
                className="animate-slide-up"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              />
            ))}
          </div>
        </section>

        {/* Resource Usage */}
        <section className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Resource Usage
          </h2>
          <div className="bg-gradient-card border border-border rounded-lg p-6 shadow-soft">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">CPU Usage</span>
                  <span className="text-sm font-semibold text-primary">67%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: '67%' }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Memory Usage</span>
                  <span className="text-sm font-semibold text-warning">84%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className="bg-warning h-2.5 rounded-full transition-all duration-300" style={{ width: '84%' }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Storage Usage</span>
                  <span className="text-sm font-semibold text-success">78%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className="bg-success h-2.5 rounded-full transition-all duration-300" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}