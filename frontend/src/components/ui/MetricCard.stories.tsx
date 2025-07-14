import type { Meta, StoryObj } from '@storybook/react';
import { MetricCard, MetricCardGrid } from './MetricCard';
import { 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ClockIcon,
  ServerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const meta: Meta<typeof MetricCard> = {
  title: 'UI/MetricCard',
  component: MetricCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Displays metrics in a visually appealing card format with support for icons, trends, loading states, and interactive capabilities.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Metric title/label',
    },
    value: {
      control: 'text',
      description: 'Main metric value',
    },
    subtitle: {
      control: 'text',
      description: 'Optional subtitle/description',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Card size variant',
    },
    isLoading: {
      control: 'boolean',
      description: 'Loading state',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    context: {
      control: 'text',
      description: 'Additional context or help text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic metric cards
export const Basic: Story = {
  args: {
    title: 'Total Users',
    value: '12,345',
    subtitle: 'Active users this month',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Total Users',
    value: '12,345',
    subtitle: 'Active users this month',
    icon: <UserGroupIcon className="h-8 w-8 text-blue-500" />,
  },
};

export const WithTrendUp: Story = {
  args: {
    title: 'Revenue',
    value: '$45,231',
    subtitle: 'Monthly revenue',
    icon: <CurrencyDollarIcon className="h-8 w-8 text-green-500" />,
    trend: {
      value: '+12.5%',
      direction: 'up',
      label: 'vs last month',
    },
  },
};

export const WithTrendDown: Story = {
  args: {
    title: 'Response Time',
    value: '245ms',
    subtitle: 'Average API response',
    icon: <ClockIcon className="h-8 w-8 text-orange-500" />,
    trend: {
      value: '+8.2%',
      direction: 'down',
      label: 'vs last week',
    },
  },
};

export const WithTrendNeutral: Story = {
  args: {
    title: 'Server Load',
    value: '67%',
    subtitle: 'CPU utilization',
    icon: <ServerIcon className="h-8 w-8 text-gray-500" />,
    trend: {
      value: '0.1%',
      direction: 'neutral',
      label: 'vs last hour',
    },
  },
};

// Size variants
export const Sizes: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Small Card"
        value="1,234"
        subtitle="Small size"
        size="sm"
        icon={<ChartBarIcon className="h-6 w-6 text-blue-500" />}
        trend={{ value: '+5%', direction: 'up' }}
      />
      <MetricCard
        title="Medium Card"
        value="5,678"
        subtitle="Medium size (default)"
        size="md"
        icon={<ChartBarIcon className="h-8 w-8 text-blue-500" />}
        trend={{ value: '+5%', direction: 'up' }}
      />
      <MetricCard
        title="Large Card"
        value="9,012"
        subtitle="Large size"
        size="lg"
        icon={<ChartBarIcon className="h-10 w-10 text-blue-500" />}
        trend={{ value: '+5%', direction: 'up' }}
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// States
export const Loading: Story = {
  args: {
    title: 'Loading Metric',
    value: '0',
    isLoading: true,
  },
};

export const Error: Story = {
  args: {
    title: 'Error Metric',
    value: '0',
    error: 'Failed to load metric data',
  },
};

export const WithContext: Story = {
  args: {
    title: 'Conversion Rate',
    value: '3.24%',
    subtitle: 'Website conversions',
    icon: <ChartBarIcon className="h-8 w-8 text-purple-500" />,
    trend: {
      value: '+0.8%',
      direction: 'up',
      label: 'vs last month',
    },
    context: 'Based on 10,000 unique visitors',
  },
};

// Interactive card
export const Interactive: Story = {
  args: {
    title: 'Click Me',
    value: '42',
    subtitle: 'Interactive metric',
    icon: <UserGroupIcon className="h-8 w-8 text-blue-500" />,
    onClick: () => alert('Metric card clicked!'),
  },
};

// Real-world examples
export const DashboardMetrics: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Users"
        value="12,345"
        subtitle="Registered users"
        icon={<UserGroupIcon className="h-8 w-8 text-blue-500" />}
        trend={{
          value: '+12.5%',
          direction: 'up',
          label: 'vs last month',
        }}
      />
      <MetricCard
        title="Revenue"
        value="$45,231"
        subtitle="Monthly revenue"
        icon={<CurrencyDollarIcon className="h-8 w-8 text-green-500" />}
        trend={{
          value: '+8.2%',
          direction: 'up',
          label: 'vs last month',
        }}
      />
      <MetricCard
        title="Response Time"
        value="245ms"
        subtitle="Average API response"
        icon={<ClockIcon className="h-8 w-8 text-orange-500" />}
        trend={{
          value: '+15ms',
          direction: 'down',
          label: 'vs last week',
        }}
      />
      <MetricCard
        title="Error Rate"
        value="0.12%"
        subtitle="System errors"
        icon={<ExclamationTriangleIcon className="h-8 w-8 text-red-500" />}
        trend={{
          value: '-0.05%',
          direction: 'up',
          label: 'vs last week',
        }}
      />
    </div>
  ),
  name: 'Dashboard Example',
  parameters: {
    layout: 'padded',
  },
};

// Different trend directions
export const TrendDirections: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Sales"
        value="$12,345"
        subtitle="This month"
        icon={<CurrencyDollarIcon className="h-8 w-8 text-green-500" />}
        trend={{
          value: '+15.3%',
          direction: 'up',
          label: 'vs last month',
        }}
      />
      <MetricCard
        title="Bounce Rate"
        value="32.1%"
        subtitle="Website bounce rate"
        icon={<ChartBarIcon className="h-8 w-8 text-red-500" />}
        trend={{
          value: '+2.1%',
          direction: 'down',
          label: 'vs last month',
        }}
      />
      <MetricCard
        title="Page Views"
        value="45,678"
        subtitle="Monthly page views"
        icon={<ChartBarIcon className="h-8 w-8 text-gray-500" />}
        trend={{
          value: '0.1%',
          direction: 'neutral',
          label: 'vs last month',
        }}
      />
    </div>
  ),
  name: 'Trend Directions',
  parameters: {
    layout: 'padded',
  },
};

// MetricCardGrid example
export const GridLayout: Story = {
  render: () => (
    <MetricCardGrid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap="md">
      <MetricCard
        title="Active Users"
        value="2,345"
        subtitle="Online now"
        icon={<UserGroupIcon className="h-8 w-8 text-blue-500" />}
        trend={{ value: '+5%', direction: 'up' }}
      />
      <MetricCard
        title="Revenue"
        value="$12,456"
        subtitle="This week"
        icon={<CurrencyDollarIcon className="h-8 w-8 text-green-500" />}
        trend={{ value: '+12%', direction: 'up' }}
      />
      <MetricCard
        title="Avg Response"
        value="123ms"
        subtitle="API latency"
        icon={<ClockIcon className="h-8 w-8 text-orange-500" />}
        trend={{ value: '+5ms', direction: 'down' }}
      />
      <MetricCard
        title="Uptime"
        value="99.9%"
        subtitle="System availability"
        icon={<ServerIcon className="h-8 w-8 text-green-500" />}
        trend={{ value: '0%', direction: 'neutral' }}
      />
      <MetricCard
        title="Error Rate"
        value="0.01%"
        subtitle="System errors"
        icon={<ExclamationTriangleIcon className="h-8 w-8 text-red-500" />}
        trend={{ value: '-0.02%', direction: 'up' }}
      />
      <MetricCard
        title="Storage Used"
        value="67.8%"
        subtitle="Disk utilization"
        icon={<ServerIcon className="h-8 w-8 text-purple-500" />}
        trend={{ value: '+2.1%', direction: 'down' }}
      />
    </MetricCardGrid>
  ),
  name: 'Grid Layout',
  parameters: {
    layout: 'padded',
  },
};

// Loading states
export const LoadingStates: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard title="Loading Small" value="0" size="sm" isLoading />
      <MetricCard title="Loading Medium" value="0" size="md" isLoading />
      <MetricCard title="Loading Large" value="0" size="lg" isLoading />
    </div>
  ),
  name: 'Loading States',
  parameters: {
    layout: 'padded',
  },
};

// Error states
export const ErrorStates: Story = {
  render: () => (
    <div className="space-y-4">
      <MetricCard
        title="Network Error"
        value="0"
        error="Failed to connect to API"
      />
      <MetricCard
        title="Permission Error"
        value="0"
        error="Insufficient permissions to view this metric"
      />
      <MetricCard
        title="Data Error"
        value="0"
        error="Invalid data format received"
      />
    </div>
  ),
  name: 'Error States',
  parameters: {
    layout: 'padded',
  },
};

// Interactive playground
export const Playground: Story = {
  args: {
    title: 'Sample Metric',
    value: '1,234',
    subtitle: 'Sample description',
    size: 'md',
    isLoading: false,
    error: '',
    context: '',
  },
}; 