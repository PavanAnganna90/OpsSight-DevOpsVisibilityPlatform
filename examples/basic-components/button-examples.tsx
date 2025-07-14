/**
 * Button Component Examples
 * 
 * Comprehensive examples demonstrating all Button variants, states, and usage patterns.
 * Copy any example and modify for your specific needs.
 */

import React, { useState } from 'react';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { 
  Plus, 
  Download, 
  Refresh, 
  Save, 
  Trash2, 
  Edit, 
  Copy,
  Settings,
  User,
  Mail
} from 'lucide-react';

// 1. Basic Button Variants
export function BasicButtonVariants() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Basic Button Variants</h3>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="success">Success</Button>
      </div>
    </div>
  );
}

// 2. Button Sizes
export function ButtonSizes() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Button Sizes</h3>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="xs">Extra Small</Button>
        <Button variant="primary" size="sm">Small</Button>
        <Button variant="primary" size="md">Medium</Button>
        <Button variant="primary" size="lg">Large</Button>
        <Button variant="primary" size="xl">Extra Large</Button>
      </div>
    </div>
  );
}

// 3. Buttons with Icons
export function ButtonsWithIcons() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Buttons with Icons</h3>
      
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" iconLeft={<Plus />}>
            Add Item
          </Button>
          <Button variant="outline" iconRight={<Download />}>
            Export Data
          </Button>
          <Button variant="secondary" iconLeft={<Save />} iconRight={<Refresh />}>
            Save & Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" iconLeft={<Edit />} size="sm" />
          <Button variant="outline" iconLeft={<Copy />} size="sm" />
          <Button variant="danger" iconLeft={<Trash2 />} size="sm" />
        </div>
      </div>
    </div>
  );
}

// 4. Button States
export function ButtonStates() {
  const [loading, setLoading] = useState(false);

  const handleAsyncAction = async () => {
    setLoading(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Button States</h3>
      
      <div className="flex flex-wrap gap-3">
        {/* Loading state */}
        <Button 
          variant="primary" 
          loading={loading}
          onClick={handleAsyncAction}
        >
          {loading ? 'Processing...' : 'Start Process'}
        </Button>

        {/* Disabled state */}
        <Button variant="secondary" disabled>
          Disabled Button
        </Button>

        {/* Full width */}
        <div className="w-full max-w-xs">
          <Button variant="outline" fullWidth>
            Full Width Button
          </Button>
        </div>
      </div>
    </div>
  );
}

// 5. Button Groups
export function ButtonGroupExamples() {
  const [selectedView, setSelectedView] = useState('grid');
  const [selectedSort, setSelectedSort] = useState('name');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Button Groups</h3>
      
      <div className="space-y-4">
        {/* Basic button group */}
        <div>
          <label className="block text-sm font-medium mb-2">Actions</label>
          <ButtonGroup>
            <Button variant="outline" iconLeft={<Copy />}>Copy</Button>
            <Button variant="outline" iconLeft={<Edit />}>Edit</Button>
            <Button variant="outline" iconLeft={<Trash2 />}>Delete</Button>
          </ButtonGroup>
        </div>

        {/* Toggle button group */}
        <div>
          <label className="block text-sm font-medium mb-2">View Mode</label>
          <ButtonGroup>
            <Button 
              variant={selectedView === 'grid' ? 'primary' : 'outline'}
              onClick={() => setSelectedView('grid')}
            >
              Grid
            </Button>
            <Button 
              variant={selectedView === 'list' ? 'primary' : 'outline'}
              onClick={() => setSelectedView('list')}
            >
              List
            </Button>
            <Button 
              variant={selectedView === 'card' ? 'primary' : 'outline'}
              onClick={() => setSelectedView('card')}
            >
              Cards
            </Button>
          </ButtonGroup>
        </div>

        {/* Sort options */}
        <div>
          <label className="block text-sm font-medium mb-2">Sort By</label>
          <ButtonGroup>
            <Button 
              variant={selectedSort === 'name' ? 'primary' : 'outline'}
              onClick={() => setSelectedSort('name')}
              size="sm"
            >
              Name
            </Button>
            <Button 
              variant={selectedSort === 'date' ? 'primary' : 'outline'}
              onClick={() => setSelectedSort('date')}
              size="sm"
            >
              Date
            </Button>
            <Button 
              variant={selectedSort === 'size' ? 'primary' : 'outline'}
              onClick={() => setSelectedSort('size')}
              size="sm"
            >
              Size
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}

// 6. Form Integration Examples
export function FormIntegrationExamples() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmitting(false);
    alert('Form submitted!');
  };

  const handleReset = () => {
    setFormData({ name: '', email: '' });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Form Integration</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            disabled={submitting}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            iconLeft={<Save />}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// 7. Navigation Examples
export function NavigationExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Navigation</h3>
      
      <div className="space-y-4">
        {/* Header actions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
          <h4 className="font-semibold">Dashboard</h4>
          <div className="flex space-x-2">
            <Button variant="ghost" iconLeft={<Settings />} size="sm" />
            <Button variant="ghost" iconLeft={<User />} size="sm" />
            <Button variant="primary" iconLeft={<Plus />} size="sm">
              New
            </Button>
          </div>
        </div>

        {/* Sidebar navigation */}
        <div className="flex">
          <div className="w-48 bg-gray-50 p-4 rounded-l">
            <nav className="space-y-2">
              <Button variant="ghost" fullWidth className="justify-start">
                Dashboard
              </Button>
              <Button variant="primary" fullWidth className="justify-start">
                Analytics
              </Button>
              <Button variant="ghost" fullWidth className="justify-start">
                Settings
              </Button>
            </nav>
          </div>
          <div className="flex-1 p-4 bg-white rounded-r border">
            <p>Main content area</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div>
          <ButtonGroup>
            <Button variant="primary">Overview</Button>
            <Button variant="outline">Analytics</Button>
            <Button variant="outline">Reports</Button>
            <Button variant="outline">Settings</Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}

// 8. Action Patterns
export function ActionPatterns() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const items = ['Item 1', 'Item 2', 'Item 3'];

  const toggleSelection = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Action Patterns</h3>
      
      <div className="space-y-4">
        {/* Bulk actions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {selectedItems.length} items selected
            </span>
            {selectedItems.length > 0 && (
              <ButtonGroup>
                <Button variant="outline" size="sm" iconLeft={<Copy />}>
                  Copy
                </Button>
                <Button variant="outline" size="sm" iconLeft={<Edit />}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" iconLeft={<Trash2 />}>
                  Delete
                </Button>
              </ButtonGroup>
            )}
          </div>
          
          <div className="space-y-2">
            {items.map(item => (
              <div key={item} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item)}
                  onChange={() => toggleSelection(item)}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="p-4 bg-gray-50 rounded">
          <h4 className="font-semibold mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" iconLeft={<Plus />}>
              Create
            </Button>
            <Button variant="outline" size="sm" iconLeft={<Download />}>
              Import
            </Button>
            <Button variant="outline" size="sm" iconLeft={<Mail />}>
              Invite
            </Button>
            <Button variant="outline" size="sm" iconLeft={<Settings />}>
              Configure
            </Button>
          </div>
        </div>

        {/* Confirmation pattern */}
        <div className="p-4 border-l-4 border-red-400 bg-red-50">
          <p className="text-sm text-red-700 mb-2">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          <div className="flex space-x-2">
            <Button variant="danger" size="sm">
              Delete
            </Button>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Complete example combining multiple patterns
export function ComprehensiveButtonExample() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold">Button Component Examples</h2>
      
      <BasicButtonVariants />
      <ButtonSizes />
      <ButtonsWithIcons />
      <ButtonStates />
      <ButtonGroupExamples />
      <FormIntegrationExamples />
      <NavigationExamples />
      <ActionPatterns />
    </div>
  );
} 