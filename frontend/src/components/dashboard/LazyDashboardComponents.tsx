/**
 * Lazy-loaded dashboard components for improved performance
 * 
 * This file provides lazy-loaded versions of heavy dashboard components
 * to improve initial page load performance through code splitting.
 */

'use client';

import React from 'react';
import { createLazyComponent } from '../common/LazyWrapper';

// Lazy load heavy dashboard components
export const LazyPipelineExecutionView = createLazyComponent(
  () => import('./PipelineExecutionView'),
  {
    height: '500px',
    className: 'w-full'
  }
);

export const LazyKubernetesStatusPanel = createLazyComponent(
  () => import('./KubernetesStatusPanel'),
  {
    height: '400px',
    className: 'w-full'
  }
);

export const LazyAutomationCoveragePanel = createLazyComponent(
  () => import('./AutomationCoveragePanel'),
  {
    height: '350px',
    className: 'w-full'
  }
);

export const LazyPipelineHealthDashboard = createLazyComponent(
  () => import('./PipelineHealthDashboard'),
  {
    height: '600px',
    className: 'w-full'
  }
);

export const LazyInfrastructurePanel = createLazyComponent(
  () => import('./InfrastructurePanel'),
  {
    height: '450px',
    className: 'w-full'
  }
);

export const LazyResourceUsagePanel = createLazyComponent(
  () => import('./ResourceUsagePanel'),
  {
    height: '300px',
    className: 'w-full'
  }
);

export const LazySystemPulsePanel = createLazyComponent(
  () => import('./SystemPulsePanel'),
  {
    height: '400px',
    className: 'w-full'
  }
);

export const LazyCommandCenterPanel = createLazyComponent(
  () => import('./CommandCenterPanel'),
  {
    height: '500px',
    className: 'w-full'
  }
);

export const LazyAlertsPanel = createLazyComponent(
  () => import('./AlertsPanel'),
  {
    height: '350px',
    className: 'w-full'
  }
);

export const LazyActionInsightsPanel = createLazyComponent(
  () => import('./ActionInsightsPanel'),
  {
    height: '400px',
    className: 'w-full'
  }
);

export const LazyMonitoringSessionControl = createLazyComponent(
  () => import('./MonitoringSessionControl'),
  {
    height: '200px',
    className: 'w-full'
  }
);

export const LazyEventsTimeline = createLazyComponent(
  () => import('./EventsTimeline'),
  {
    height: '400px',
    className: 'w-full'
  }
);

export const LazyContainerLogsViewer = createLazyComponent(
  () => import('./ContainerLogsViewer'),
  {
    height: '500px',
    className: 'w-full'
  }
);

export const LazyPodDetailView = createLazyComponent(
  () => import('./PodDetailView'),
  {
    height: '400px',
    className: 'w-full'
  }
);

// Chart components
export const LazyBuildTimeTrendChart = createLazyComponent(
  () => import('../charts/BuildTimeTrendChart'),
  {
    height: '300px',
    className: 'w-full'
  }
);

export const LazyDeploymentFrequencyChart = createLazyComponent(
  () => import('../charts/DeploymentFrequencyChart'),
  {
    height: '300px',
    className: 'w-full'
  }
);

export const LazyTestCoverageWidget = createLazyComponent(
  () => import('../charts/TestCoverageWidget'),
  {
    height: '250px',
    className: 'w-full'
  }
);

export const LazyKubernetesMetricsChart = createLazyComponent(
  () => import('../charts/KubernetesMetricsChart'),
  {
    height: '350px',
    className: 'w-full'
  }
);

export const LazyResourceTrendChart = createLazyComponent(
  () => import('../charts/ResourceTrendChart'),
  {
    height: '300px',
    className: 'w-full'
  }
);

export const LazyGitActivityDashboard = createLazyComponent(
  () => import('../charts/GitActivityDashboard'),
  {
    height: '400px',
    className: 'w-full'
  }
);

export const LazyClusterNodeMap = createLazyComponent(
  () => import('../charts/ClusterNodeMap'),
  {
    height: '350px',
    className: 'w-full'
  }
);

// AI/Automation components
export const LazyOpsCopilot = createLazyComponent(
  () => import('../ai/OpsCopilot'),
  {
    height: '600px',
    className: 'w-full h-full'
  }
);

export const LazyAnsibleCoverageViewer = createLazyComponent(
  () => import('../automation/AnsibleCoverageViewer'),
  {
    height: '500px',
    className: 'w-full'
  }
);

// Infrastructure components
export const LazyTerraformLogViewer = createLazyComponent(
  () => import('../infrastructure/TerraformLogViewer'),
  {
    height: '500px',
    className: 'w-full'
  }
);

export const LazyEnhancedKubernetesMonitor = createLazyComponent(
  () => import('../infrastructure/EnhancedKubernetesMonitor'),
  {
    height: '600px',
    className: 'w-full'
  }
);

export const LazyAwsCostMetricsPanel = createLazyComponent(
  () => import('../infrastructure/AwsCostMetricsPanel'),
  {
    height: '400px',
    className: 'w-full'
  }
);

// Team/Admin components
export const LazyRBACManagement = createLazyComponent(
  () => import('../rbac/RBACManagement'),
  {
    height: '500px',
    className: 'w-full'
  }
);

export const LazyTeamManagementDashboard = createLazyComponent(
  () => import('../teams/TeamManagementDashboard'),
  {
    height: '600px',
    className: 'w-full'
  }
);

// Settings components
export const LazySettingsPageContent = createLazyComponent(
  () => import('../settings/SettingsPageContent'),
  {
    height: '500px',
    className: 'w-full'
  }
);

// Complex interactive components that benefit most from lazy loading
export const LazyWebhookManager = createLazyComponent(
  () => import('../webhooks/WebhookManager'),
  {
    height: '400px',
    className: 'w-full'
  }
);

export const LazyNotificationCenter = createLazyComponent(
  () => import('../notifications/NotificationCenter'),
  {
    height: '450px',
    className: 'w-full'
  }
);

export default {
  LazyPipelineExecutionView,
  LazyKubernetesStatusPanel,
  LazyAutomationCoveragePanel,
  LazyPipelineHealthDashboard,
  LazyInfrastructurePanel,
  LazyResourceUsagePanel,
  LazySystemPulsePanel,
  LazyCommandCenterPanel,
  LazyAlertsPanel,
  LazyActionInsightsPanel,
  LazyMonitoringSessionControl,
  LazyEventsTimeline,
  LazyContainerLogsViewer,
  LazyPodDetailView,
  LazyBuildTimeTrendChart,
  LazyDeploymentFrequencyChart,
  LazyTestCoverageWidget,
  LazyKubernetesMetricsChart,
  LazyResourceTrendChart,
  LazyGitActivityDashboard,
  LazyClusterNodeMap,
  LazyOpsCopilot,
  LazyAnsibleCoverageViewer,
  LazyTerraformLogViewer,
  LazyEnhancedKubernetesMonitor,
  LazyAwsCostMetricsPanel,
  LazyRBACManagement,
  LazyTeamManagementDashboard,
  LazySettingsPageContent,
  LazyWebhookManager,
  LazyNotificationCenter,
};