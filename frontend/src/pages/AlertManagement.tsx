/**
 * Alert Management Page
 * 
 * Main page for comprehensive alert management and monitoring.
 * Integrates all alert components into a unified interface.
 */

'use client';

import React from 'react';
import { Helmet } from 'react-helmet-async';
import AlertSummaryDashboard from '@/components/alerts/AlertSummaryDashboard';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';

const AlertManagementPage: React.FC = () => {
  const { trackPageView } = usePerformanceMonitoring('AlertManagementPage');

  React.useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  return (
    <>
      <Helmet>
        <title>Alert Management - OpsSight DevOps Platform</title>
        <meta 
          name="description" 
          content="Comprehensive alert management dashboard for monitoring system health, managing alerts, and tracking performance metrics"
        />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AlertSummaryDashboard />
        </div>
      </div>
    </>
  );
};

export default AlertManagementPage;