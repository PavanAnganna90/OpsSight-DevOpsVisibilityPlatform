/**
 * Automation Coverage Analysis Page
 * 
 * Dedicated page for Ansible automation coverage analysis and log parsing.
 * Provides comprehensive automation insights and playbook analysis.
 */

'use client';

import React from 'react';
import { withPermissions } from '@/components/rbac/withPermissions';
import { AnsibleCoverageViewer } from '@/components/automation/AnsibleCoverageViewer';

const AutomationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnsibleCoverageViewer />
      </div>
    </div>
  );
};

// Protect the automation page - require automation viewing permissions
export default withPermissions(AutomationPage, {
  permissions: ['view_automation', 'view_infrastructure'],
  requireAll: false
});