/**
 * Lazy-loaded page components for route-based code splitting
 * 
 * This file provides lazy-loaded versions of page components to improve
 * initial bundle size and enable route-based code splitting.
 */

'use client';

import React from 'react';
import { createLazyComponent } from '../common/LazyWrapper';

// Main application pages
export const LazyDashboardPage = createLazyComponent(
  () => import('../../app/dashboard/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyAnalyticsPage = createLazyComponent(
  () => import('../../app/analytics/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyTeamsPage = createLazyComponent(
  () => import('../../app/teams/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazySettingsPage = createLazyComponent(
  () => import('../../app/settings/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyAdminPage = createLazyComponent(
  () => import('../../app/admin/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyProfilePage = createLazyComponent(
  () => import('../../app/profile/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyMonitoringPage = createLazyComponent(
  () => import('../../app/monitoring/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyAutomationPage = createLazyComponent(
  () => import('../../app/automation/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyThemesPage = createLazyComponent(
  () => import('../../app/themes/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyDemoPage = createLazyComponent(
  () => import('../../app/demo/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

// Authentication pages
export const LazyLoginPage = createLazyComponent(
  () => import('../../app/login/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyOAuthCallbackPage = createLazyComponent(
  () => import('../../app/auth/callback/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen flex items-center justify-center'
  }
);

export const LazyUnauthorizedPage = createLazyComponent(
  () => import('../../app/unauthorized/page'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

// Complex standalone components that are heavy
export const LazyAuditDashboard = createLazyComponent(
  () => import('../audit/AuditDashboard'),
  {
    height: '600px',
    className: 'w-full'
  }
);

export const LazyAuditLogViewer = createLazyComponent(
  () => import('../audit/AuditLogViewer'),
  {
    height: '500px',
    className: 'w-full'
  }
);

export const LazyMonitoringDashboard = createLazyComponent(
  () => import('../monitoring/MonitoringDashboard'),
  {
    height: '600px',
    className: 'w-full'
  }
);

export const LazyAlertManager = createLazyComponent(
  () => import('../monitoring/AlertManager'),
  {
    height: '500px',
    className: 'w-full'
  }
);

export const LazySlackIntegration = createLazyComponent(
  () => import('../notifications/SlackIntegration'),
  {
    height: '400px',
    className: 'w-full'
  }
);

export const LazyWebhookIntegration = createLazyComponent(
  () => import('../notifications/WebhookIntegration'),
  {
    height: '400px',
    className: 'w-full'
  }
);

// Specialized page components
export const LazyAlertManagement = createLazyComponent(
  () => import('../../pages/AlertManagement'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyNotifications = createLazyComponent(
  () => import('../../pages/Notifications'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

export const LazyTeamRBACManagement = createLazyComponent(
  () => import('../../pages/TeamRBACManagement'),
  {
    height: '100vh',
    className: 'w-full min-h-screen'
  }
);

// Export all components for easy importing
export default {
  // Main pages
  LazyDashboardPage,
  LazyAnalyticsPage,
  LazyTeamsPage,
  LazySettingsPage,
  LazyAdminPage,
  LazyProfilePage,
  LazyMonitoringPage,
  LazyAutomationPage,
  LazyThemesPage,
  LazyDemoPage,
  
  // Auth pages
  LazyLoginPage,
  LazyOAuthCallbackPage,
  LazyUnauthorizedPage,
  
  // Complex components
  LazyAuditDashboard,
  LazyAuditLogViewer,
  LazyMonitoringDashboard,
  LazyAlertManager,
  LazySlackIntegration,
  LazyWebhookIntegration,
  
  // Specialized pages
  LazyAlertManagement,
  LazyNotifications,
  LazyTeamRBACManagement,
};