/**
 * Monitoring Page
 * 
 * Dedicated page for system monitoring and metrics dashboard.
 * Protected with appropriate RBAC permissions.
 */

'use client';

import React from 'react';
import { withPermissions } from '@/components/rbac/withPermissions';
import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';

const MonitoringPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MonitoringDashboard />
      </div>
    </div>
  );
};

// Protect the monitoring page - require admin or monitoring permissions
export default withPermissions(MonitoringPage, {
  permissions: ['view_monitoring', 'admin'],
  requireAll: false
});