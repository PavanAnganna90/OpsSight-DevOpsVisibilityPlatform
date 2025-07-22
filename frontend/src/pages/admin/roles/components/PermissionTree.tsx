/**
 * Permission Tree Component
 * 
 * Hierarchical permission selection with categories and search
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { Checkbox } from '@/components/ui/Checkbox';
import { TextField } from '@/components/ui/TextField';

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
  organization_id?: string;
}

interface PermissionCategory {
  name: string;
  permissions: Permission[];
}

interface PermissionTreeProps {
  categories: Record<string, Permission[]>;
  selectedPermissions: string[];
  onPermissionChange: (permissionId: string, checked: boolean) => void;
  onCategoryChange?: (categoryName: string, checked: boolean) => void;
  searchable?: boolean;
  showDescription?: boolean;
}

export function PermissionTree({
  categories,
  selectedPermissions,
  onPermissionChange,
  onCategoryChange,
  searchable = true,
  showDescription = true,
}: PermissionTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Filter categories and permissions based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;

    const filtered: Record<string, Permission[]> = {};
    
    Object.entries(categories).forEach(([categoryName, permissions]) => {
      const matchingPermissions = permissions.filter(
        permission =>
          permission.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchingPermissions.length > 0 || categoryName.toLowerCase().includes(searchTerm.toLowerCase())) {
        filtered[categoryName] = matchingPermissions.length > 0 ? matchingPermissions : permissions;
      }
    });

    return filtered;
  }, [categories, searchTerm]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getCategoryCheckedState = (permissions: Permission[]) => {
    const selectedCount = permissions.filter(p => selectedPermissions.includes(p.id)).length;
    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === permissions.length) return 'checked';
    return 'indeterminate';
  };

  const handleCategoryToggle = (categoryName: string, permissions: Permission[]) => {
    const checkedState = getCategoryCheckedState(permissions);
    const shouldCheck = checkedState !== 'checked';
    
    permissions.forEach(permission => {
      const isCurrentlySelected = selectedPermissions.includes(permission.id);
      if (shouldCheck && !isCurrentlySelected) {
        onPermissionChange(permission.id, true);
      } else if (!shouldCheck && isCurrentlySelected) {
        onPermissionChange(permission.id, false);
      }
    });

    if (onCategoryChange) {
      onCategoryChange(categoryName, shouldCheck);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchable && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {Object.entries(filteredCategories).map(([categoryName, permissions]) => {
          const isExpanded = expandedCategories.has(categoryName);
          const checkedState = getCategoryCheckedState(permissions);
          
          return (
            <div key={categoryName} className="border border-gray-700 rounded-lg">
              {/* Category Header */}
              <div className="flex items-center p-3 bg-gray-800 rounded-t-lg">
                <button
                  onClick={() => toggleCategory(categoryName)}
                  className="flex items-center flex-1 text-left"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 mr-2" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 mr-2" />
                  )}
                  <ShieldCheckIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium text-white capitalize">{categoryName}</span>
                  <span className="ml-2 text-sm text-gray-400">
                    ({permissions.length} {permissions.length === 1 ? 'permission' : 'permissions'})
                  </span>
                </button>
                
                {/* Category Checkbox */}
                <div className="flex items-center ml-4">
                  <Checkbox
                    checked={checkedState === 'checked'}
                    indeterminate={checkedState === 'indeterminate'}
                    onChange={() => handleCategoryToggle(categoryName, permissions)}
                    label=""
                  />
                  <span className="ml-2 text-sm text-gray-400">
                    {selectedPermissions.filter(id => permissions.find(p => p.id === id)).length} selected
                  </span>
                </div>
              </div>

              {/* Category Permissions */}
              {isExpanded && (
                <div className="p-3 space-y-3 bg-gray-800/50 rounded-b-lg">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3 p-2 hover:bg-gray-700/50 rounded">
                      <Checkbox
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={(checked) => onPermissionChange(permission.id, checked)}
                        label=""
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{permission.display_name}</span>
                          {permission.is_system_permission && (
                            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{permission.name}</p>
                        {showDescription && permission.description && (
                          <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {permissions.length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      <XCircleIcon className="h-8 w-8 mx-auto mb-2" />
                      <p>No permissions found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {Object.keys(filteredCategories).length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No permissions found</p>
          <p className="text-sm">Try adjusting your search terms</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-white font-medium">
              {selectedPermissions.length} permissions selected
            </span>
          </div>
          <div className="text-sm text-gray-400">
            Total: {Object.values(categories).flat().length} permissions
          </div>
        </div>
      </div>
    </div>
  );
}