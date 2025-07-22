/**
 * Notifications Page
 * 
 * Main page for managing all notification settings including Slack, webhooks, and email.
 */

'use client';

import React from 'react';
import { Helmet } from 'react-helmet-async';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';

const NotificationsPage: React.FC = () => {
  const { trackPageView } = usePerformanceMonitoring('NotificationsPage');

  React.useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  return (
    <>
      <Helmet>
        <title>Notifications - OpsSight DevOps Platform</title>
        <meta 
          name="description" 
          content="Manage notification settings for alerts, webhooks, and integrations in OpsSight DevOps Platform"
        />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <NotificationCenter />
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;