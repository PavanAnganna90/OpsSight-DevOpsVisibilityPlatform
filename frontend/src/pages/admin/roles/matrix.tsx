/**
 * Role Permissions Matrix Page
 * 
 * Visual matrix view of all roles and their permissions
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TableCellsIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/layout/DashboardCard';
import { RolePermissionsMatrix } from './components/RolePermissionsMatrix';
import { Toast } from '@/components/ui/Toast';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  priority: number;
  is_system_role: boolean;
  permissions: Permission[];
  user_count: number;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
}

export default function RolePermissionsMatrixPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
    show: boolean;
  }>({ message: '', type: 'success', show: false });

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await fetch('/api/v1/roles/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Fetch permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const handleRoleClick = (role: Role) => {
    router.push(`/admin/roles/${role.id}`);
  };

  const handlePermissionClick = (permission: Permission) => {
    showToast(`Permission: ${permission.display_name}`, 'info');
  };

  const handleCellClick = (role: Role, permission: Permission, hasPermission: boolean) => {
    showToast(
      `${role.display_name} ${hasPermission ? 'has' : 'does not have'} ${permission.display_name}`,
      hasPermission ? 'success' : 'warning'
    );
  };

  const handleExportMatrix = () => {
    // TODO: Implement matrix export functionality
    showToast('Export functionality coming soon', 'info');
  };

  const handlePrintMatrix = () => {
    window.print();
  };

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push('/admin/roles')}
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Back to Roles
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <TableCellsIcon className="h-8 w-8 mr-3 text-blue-500" />
                Role Permissions Matrix
              </h1>
              <p className="text-gray-400 mt-2">
                Visual overview of all roles and their assigned permissions
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleExportMatrix}
              variant="secondary"
              leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
            >
              Export
            </Button>
            <Button
              onClick={handlePrintMatrix}
              variant="secondary"
              leftIcon={<PrinterIcon className="h-4 w-4" />}
            >
              Print
            </Button>
          </div>
        </div>

        {/* Matrix */}
        <DashboardCard>
          <div className="p-6">
            <RolePermissionsMatrix
              roles={roles || []}
              permissions={permissions || []}
              onRoleClick={handleRoleClick}
              onPermissionClick={handlePermissionClick}
              onCellClick={handleCellClick}
            />
          </div>
        </DashboardCard>

        {/* Toast */}
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
          />
        )}
      </div>
    </div>
  );
}