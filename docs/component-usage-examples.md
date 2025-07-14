# Component Usage Examples

Comprehensive examples demonstrating how to use OpsSight UI components in real-world scenarios.

## 📋 Table of Contents

- [Button Component Examples](#button-component-examples)
- [StatusIndicator Component Examples](#statusindicator-component-examples)
- [MetricCard Component Examples](#metriccard-component-examples)
- [Advanced Components](#advanced-components)
- [Dashboard Layout Examples](#dashboard-layout-examples)
- [Common Patterns](#common-patterns)

---

## Button Component Examples

### Basic Usage

```tsx
import { Button } from '@/components/ui/Button';

// Basic button variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="danger">Delete</Button>
<Button variant="success">Confirm</Button>
```

### Buttons with Icons

```tsx
import { Plus, Download, Save, Edit } from 'lucide-react';

// Icon positioning
<Button variant="primary" iconLeft={<Plus />}>
  Add New Item
</Button>

<Button variant="outline" iconRight={<Download />}>
  Export Data
</Button>

// Icon-only buttons
<Button variant="ghost" iconLeft={<Edit />} aria-label="Edit item" />
```

### Button States and Loading

```tsx
// Loading state
<Button variant="primary" loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save Changes'}
</Button>

// Disabled state
<Button variant="secondary" disabled>
  Disabled Button
</Button>

// Full width
<Button variant="primary" fullWidth>
  Full Width Button
</Button>
```

### Button Groups for Related Actions

```tsx
import { ButtonGroup } from '@/components/ui/Button';

// Action group
<ButtonGroup>
  <Button variant="outline">Copy</Button>
  <Button variant="outline">Edit</Button>
  <Button variant="outline">Delete</Button>
</ButtonGroup>

// Toggle group
<ButtonGroup>
  <Button variant={view === 'grid' ? 'primary' : 'outline'}>Grid</Button>
  <Button variant={view === 'list' ? 'primary' : 'outline'}>List</Button>
</ButtonGroup>
```

### Form Integration

```tsx
function ContactForm() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="Email" required />
      <textarea placeholder="Message" required />
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          Send Message
        </Button>
      </div>
    </form>
  );
}
```

---

## StatusIndicator Component Examples

### Basic Status Display

```tsx
import { StatusIndicator } from '@/components/ui/StatusIndicator';

// Different status types
<StatusIndicator status="success">System Operational</StatusIndicator>
<StatusIndicator status="warning">Minor Issues</StatusIndicator>
<StatusIndicator status="error">Service Down</StatusIndicator>
<StatusIndicator status="info">Maintenance Mode</StatusIndicator>
<StatusIndicator status="neutral">Unknown Status</StatusIndicator>
```

### System Health Dashboard

```tsx
function SystemHealth() {
  const services = [
    { name: 'Web Server', status: 'success', uptime: '99.9%' },
    { name: 'Database', status: 'warning', uptime: '99.1%' },
    { name: 'Cache', status: 'success', uptime: '100%' },
    { name: 'Queue', status: 'error', uptime: '85.2%' },
  ];

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <div key={service.name} className="flex items-center justify-between">
          <StatusIndicator status={service.status} size="md">
            {service.name}
          </StatusIndicator>
          <span className="text-sm text-gray-600">
            {service.uptime} uptime
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Real-time Monitoring with Pulse

```tsx
// Live status indicators
<StatusIndicator status="success" size="lg" pulse>
  Live Monitoring Active
</StatusIndicator>

<StatusIndicator status="info" size="md" pulse>
  Processing Queue
</StatusIndicator>
```

### Status Badges

```tsx
import { StatusBadge } from '@/components/ui/StatusIndicator';

// Compact status display
<StatusBadge status="success">Active</StatusBadge>
<StatusBadge status="warning">Pending</StatusBadge>
<StatusBadge status="error">Failed</StatusBadge>
```

### Deployment Pipeline Status

```tsx
function DeploymentStatus() {
  const steps = [
    { name: 'Build', status: 'success', time: '2 min ago' },
    { name: 'Test', status: 'success', time: '1 min ago' },
    { name: 'Deploy', status: 'info', time: 'In progress' },
    { name: 'Verify', status: 'neutral', time: 'Pending' },
  ];

  return (
    <div className="space-y-4">
      {steps.map((step) => (
        <div key={step.name} className="flex items-center justify-between">
          <StatusIndicator 
            status={step.status} 
            size="md"
            pulse={step.status === 'info'}
            dotsOnly={step.status === 'neutral'}
          >
            {step.name}
          </StatusIndicator>
          <span className="text-sm text-gray-500">{step.time}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## MetricCard Component Examples

### Basic Metrics Display

```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { Users, Activity, Server } from 'lucide-react';

// Performance metrics
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <MetricCard
    title="Active Users"
    value="2,345"
    icon={<Users />}
    trend="up"
    trendValue="+12%"
    trendLabel="vs last week"
  />
  
  <MetricCard
    title="Response Time"
    value="142ms"
    icon={<Activity />}
    trend="down"
    trendValue="-8%"
    trendLabel="improved"
  />
  
  <MetricCard
    title="Server Load"
    value="68%"
    icon={<Server />}
    trend="neutral"
    trendValue="0%"
    trendLabel="stable"
  />
</div>
```

### Business Metrics Dashboard

```tsx
import { DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';

function BusinessMetrics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MetricCard
        title="Monthly Revenue"
        value="$24,500"
        icon={<DollarSign />}
        trend="up"
        trendValue="+18%"
        trendLabel="vs last month"
        size="lg"
      />
      
      <MetricCard
        title="Conversion Rate"
        value="3.2%"
        icon={<TrendingUp />}
        trend="up"
        trendValue="+0.4%"
        trendLabel="this week"
        size="lg"
      />
    </div>
  );
}
```

### Loading and Error States

```tsx
// Loading state
<MetricCard
  title="Loading Metric"
  value="..."
  loading={true}
/>

// Error state
<MetricCard
  title="Failed Metric"
  value="Error"
  error={true}
  errorMessage="Failed to load data"
/>
```

### Interactive Metrics with Actions

```tsx
function InteractiveMetric() {
  const [period, setPeriod] = useState('7d');
  
  const data = {
    '7d': { value: '1,234', trend: 'up', trendValue: '+12%' },
    '30d': { value: '5,678', trend: 'up', trendValue: '+25%' },
  };

  return (
    <MetricCard
      title="Page Views"
      value={data[period].value}
      trend={data[period].trend}
      trendValue={data[period].trendValue}
      trendLabel={`vs previous ${period}`}
      interactive
      onClick={() => console.log('Metric clicked')}
    >
      <div className="flex space-x-1 mt-2">
        <button
          className={`px-2 py-1 text-xs rounded ${
            period === '7d' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
          }`}
          onClick={() => setPeriod('7d')}
        >
          7d
        </button>
        <button
          className={`px-2 py-1 text-xs rounded ${
            period === '30d' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
          }`}
          onClick={() => setPeriod('30d')}
        >
          30d
        </button>
      </div>
    </MetricCard>
  );
}
```

### Metric Grid Layout

```tsx
import { MetricCardGrid } from '@/components/ui/MetricCard';

function MetricsDashboard() {
  const metrics = [
    { title: 'Revenue', value: '$125K', trend: 'up', trendValue: '+15%' },
    { title: 'Orders', value: '1,234', trend: 'up', trendValue: '+8%' },
    { title: 'Customers', value: '8,901', trend: 'down', trendValue: '-2%' },
    { title: 'Conversion', value: '3.2%', trend: 'up', trendValue: '+0.5%' },
  ];

  return (
    <MetricCardGrid>
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </MetricCardGrid>
  );
}
```

---

## Advanced Components

### Color Mode Toggle

```tsx
import { ColorModeToggle } from '@/components/ui/ColorModeToggle';

// In header/navigation
function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>OpsSight Dashboard</h1>
      <div className="flex items-center space-x-4">
        <ColorModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
```

### Theme Preview

```tsx
import { ThemePreview } from '@/components/ui/ThemePreview';

// Settings page
function ThemeSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Appearance</h2>
      <ThemePreview />
    </div>
  );
}
```

### Loading Skeleton

```tsx
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

function DataTable({ loading, data }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton height="h-8" width="w-1/4" />
        <LoadingSkeleton height="h-6" count={5} />
      </div>
    );
  }

  return <table>{/* Your table content */}</table>;
}
```

---

## Dashboard Layout Examples

### Complete System Dashboard

```tsx
function SystemDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">OpsSight Dashboard</h1>
            <div className="flex items-center space-x-4">
              <ColorModeToggle />
              <Button variant="primary">Settings</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Status Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatusIndicator status="success" size="md">
              All Systems Operational
            </StatusIndicator>
            <StatusIndicator status="warning" size="md">
              Minor Issues Detected
            </StatusIndicator>
            <StatusIndicator status="info" size="md" pulse>
              Maintenance Scheduled
            </StatusIndicator>
            <StatusIndicator status="neutral" size="md">
              Monitoring Active
            </StatusIndicator>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
          <MetricCardGrid>
            <MetricCard
              title="Active Users"
              value="2,345"
              trend="up"
              trendValue="+12%"
              trendLabel="vs last week"
            />
            <MetricCard
              title="Response Time"
              value="142ms"
              trend="down"
              trendValue="-8%"
              trendLabel="improved"
            />
            <MetricCard
              title="Error Rate"
              value="0.02%"
              trend="down"
              trendValue="-50%"
              trendLabel="vs last month"
            />
            <MetricCard
              title="Throughput"
              value="1.2K/s"
              trend="up"
              trendValue="+25%"
              trendLabel="requests"
            />
          </MetricCardGrid>
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <Button variant="primary">Deploy Changes</Button>
          <Button variant="secondary">View Logs</Button>
          <Button variant="outline">Export Report</Button>
        </div>
      </main>
    </div>
  );
}
```

### DevOps Pipeline Dashboard

```tsx
function PipelineDashboard() {
  const pipelineSteps = [
    { name: 'Build', status: 'success', duration: '2m 34s' },
    { name: 'Test', status: 'success', duration: '4m 12s' },
    { name: 'Deploy', status: 'info', duration: 'In progress...' },
    { name: 'Verify', status: 'neutral', duration: 'Pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Pipeline Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Current Pipeline</h2>
        <div className="space-y-3">
          {pipelineSteps.map((step, index) => (
            <div key={step.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{index + 1}</span>
                <StatusIndicator 
                  status={step.status} 
                  pulse={step.status === 'info'}
                >
                  {step.name}
                </StatusIndicator>
              </div>
              <span className="text-sm text-gray-600">{step.duration}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Metrics */}
      <MetricCardGrid>
        <MetricCard
          title="Deployments Today"
          value="8"
          trend="up"
          trendValue="+2"
        />
        <MetricCard
          title="Success Rate"
          value="98.5%"
          trend="up"
          trendValue="+1.2%"
        />
        <MetricCard
          title="Avg Deploy Time"
          value="12m"
          trend="down"
          trendValue="-3m"
        />
      </MetricCardGrid>
    </div>
  );
}
```

---

## Common Patterns

### Form with Validation

```tsx
function ValidationForm() {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Validation and submission logic
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input 
          type="email" 
          placeholder="Email"
          className={`w-full p-2 border rounded ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && (
          <StatusIndicator status="error" size="sm">
            {errors.email}
          </StatusIndicator>
        )}
      </div>

      <Button type="submit" variant="primary" loading={loading} fullWidth>
        {loading ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

### Data Fetching with States

```tsx
function DataDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton height="h-8" width="w-1/3" />
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <LoadingSkeleton key={i} height="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <StatusIndicator status="error" size="lg">
          {error}
        </StatusIndicator>
        <Button variant="primary" onClick={fetchData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Your dashboard content */}
    </div>
  );
}
```

### Search and Filter Interface

```tsx
function SearchableList({ items }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <div className="flex space-x-2">
          <Button
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('active')}
          >
            Active
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <StatusIndicator status="neutral" size="lg">
            No items found
          </StatusIndicator>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded">
              <span>{item.name}</span>
              <StatusIndicator status={item.status} size="sm">
                {item.status}
              </StatusIndicator>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Quick Reference

### Component Import Paths

```tsx
// Core Components
import { Button, ButtonGroup } from '@/components/ui/Button';
import { StatusIndicator, StatusBadge } from '@/components/ui/StatusIndicator';
import { MetricCard, MetricCardGrid } from '@/components/ui/MetricCard';

// Advanced Components
import { ColorModeToggle } from '@/components/ui/ColorModeToggle';
import { ThemePreview } from '@/components/ui/ThemePreview';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
```

### Common Props

```tsx
// Button Props
variant: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success"
size: "xs" | "sm" | "md" | "lg" | "xl"
loading: boolean
disabled: boolean
fullWidth: boolean

// StatusIndicator Props
status: "success" | "warning" | "error" | "info" | "neutral"
size: "sm" | "md" | "lg"
pulse: boolean

// MetricCard Props
title: string
value: string
trend: "up" | "down" | "neutral"
trendValue: string
size: "sm" | "md" | "lg"
loading: boolean
error: boolean
```

This guide provides comprehensive, real-world examples for implementing OpsSight UI components. Each example includes complete code that can be copied and adapted for your specific use cases. 