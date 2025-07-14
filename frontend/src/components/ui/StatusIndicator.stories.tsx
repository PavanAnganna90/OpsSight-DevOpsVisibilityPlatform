import type { Meta, StoryObj } from '@storybook/react';
import { StatusIndicator, StatusBadge } from './StatusIndicator';

const meta: Meta<typeof StatusIndicator> = {
  title: 'UI/StatusIndicator',
  component: StatusIndicator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Flexible status display component supporting multiple status types, sizes, and variants with full accessibility support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info', 'neutral'],
      description: 'Status type determining color and icon',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'Size variant',
    },
    label: {
      control: 'text',
      description: 'Optional text label',
    },
    showIcon: {
      control: 'boolean',
      description: 'Show icon alongside status',
    },
    pulse: {
      control: 'boolean',
      description: 'Enable pulse animation for real-time updates',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible description for screen readers',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic status indicators
export const Success: Story = {
  args: {
    status: 'success',
    label: 'Operation completed',
  },
};

export const Warning: Story = {
  args: {
    status: 'warning',
    label: 'Attention required',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    label: 'Operation failed',
  },
};

export const Info: Story = {
  args: {
    status: 'info',
    label: 'Information available',
  },
};

export const Neutral: Story = {
  args: {
    status: 'neutral',
    label: 'No status',
  },
};

// Size variants
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <StatusIndicator status="success" size="xs" label="Extra Small" />
        <StatusIndicator status="success" size="sm" label="Small" />
        <StatusIndicator status="success" size="md" label="Medium" />
        <StatusIndicator status="success" size="lg" label="Large" />
      </div>
    </div>
  ),
};

// All status types showcase
export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-3">
      <StatusIndicator status="success" label="Success - Operation completed" />
      <StatusIndicator status="warning" label="Warning - Attention required" />
      <StatusIndicator status="error" label="Error - Operation failed" />
      <StatusIndicator status="info" label="Info - Information available" />
      <StatusIndicator status="neutral" label="Neutral - No status" />
    </div>
  ),
};

// Without labels (dots only)
export const DotsOnly: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusIndicator status="success" showIcon={false} />
      <StatusIndicator status="warning" showIcon={false} />
      <StatusIndicator status="error" showIcon={false} />
      <StatusIndicator status="info" showIcon={false} />
      <StatusIndicator status="neutral" showIcon={false} />
    </div>
  ),
};

// With pulse animation
export const WithPulse: Story = {
  render: () => (
    <div className="space-y-3">
      <StatusIndicator status="success" label="Live - Connected" pulse />
      <StatusIndicator status="warning" label="Live - Degraded" pulse />
      <StatusIndicator status="error" label="Live - Disconnected" pulse />
      <StatusIndicator status="info" label="Live - Syncing" pulse />
    </div>
  ),
};

// Icons only (no labels)
export const IconsOnly: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusIndicator status="success" />
      <StatusIndicator status="warning" />
      <StatusIndicator status="error" />
      <StatusIndicator status="info" />
      <StatusIndicator status="neutral" />
    </div>
  ),
};

// Different sizes with dots
export const DotSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <StatusIndicator status="success" size="xs" showIcon={false} />
      <StatusIndicator status="success" size="sm" showIcon={false} />
      <StatusIndicator status="success" size="md" showIcon={false} />
      <StatusIndicator status="success" size="lg" showIcon={false} />
    </div>
  ),
};

// Status Badge stories
export const StatusBadgeStory: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Filled Badges</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="success" label="Active" />
          <StatusBadge status="warning" label="Pending" />
          <StatusBadge status="error" label="Failed" />
          <StatusBadge status="info" label="Processing" />
          <StatusBadge status="neutral" label="Draft" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Outline Badges</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="success" label="Active" outline />
          <StatusBadge status="warning" label="Pending" outline />
          <StatusBadge status="error" label="Failed" outline />
          <StatusBadge status="info" label="Processing" outline />
          <StatusBadge status="neutral" label="Draft" outline />
        </div>
      </div>
    </div>
  ),
  name: 'Status Badges',
  parameters: {
    layout: 'padded',
  },
};

// Real-world usage examples
export const UsageExamples: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Server Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span>API Server</span>
            <StatusIndicator status="success" label="Online" />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span>Database</span>
            <StatusIndicator status="warning" label="Degraded" pulse />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span>Cache Server</span>
            <StatusIndicator status="error" label="Offline" />
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-3">Build Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StatusIndicator status="success" size="sm" showIcon={false} />
            <span className="text-sm">main branch - Build #1234</span>
          </div>
          <div className="flex items-center gap-3">
            <StatusIndicator status="warning" size="sm" showIcon={false} pulse />
            <span className="text-sm">develop branch - Build #1235 (in progress)</span>
          </div>
          <div className="flex items-center gap-3">
            <StatusIndicator status="error" size="sm" showIcon={false} />
            <span className="text-sm">feature/auth branch - Build #1236</span>
          </div>
        </div>
      </div>
    </div>
  ),
  name: 'Usage Examples',
  parameters: {
    layout: 'padded',
  },
};

// Interactive playground
export const Playground: Story = {
  args: {
    status: 'success',
    size: 'md',
    label: 'Status Label',
    showIcon: true,
    pulse: false,
  },
}; 