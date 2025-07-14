/**
 * Admin Page Route
 * 
 * Protected admin interface for role and permission management.
 * Requires admin permissions to access.
 */

'use client';

import React from 'react';
import AdminPage from '@/components/admin/AdminPage';
import { withPermissions } from '@/components/rbac/withPermissions';

const AdminPageRoute: React.FC = () => {
  return <AdminPage />;
};

// Export with admin permission protection
export default withPermissions(AdminPageRoute, {
  adminOnly: true,
  redirectTo: '/unauthorized',
});