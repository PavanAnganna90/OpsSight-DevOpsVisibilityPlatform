# StatusIndicator Component

A flexible status display component for showing various states with consistent styling and accessibility features.

## Overview

The StatusIndicator component provides a visual way to communicate status information to users. It supports multiple status types with semantic colors, optional text labels, icons, and pulse animations for real-time updates.

## Features

- 🎨 **Status Types**: Success, warning, error, info, neutral
- 📏 **Size Variants**: Extra small (xs) to large (lg)
- 🔄 **Pulse Animation**: Real-time status updates
- 🎯 **Icon Support**: Built-in semantic icons
- 📝 **Text Labels**: Optional descriptive text
- ♿ **Accessibility**: Full ARIA support and screen reader compatibility
- 🌙 **Dark Mode**: Complete dark mode support
- 🏷️ **Badge Variant**: Filled and outline badge styles

## Basic Usage

```tsx
import { StatusIndicator } from '@/components/ui/StatusIndicator';

// Basic status with label
<StatusIndicator status="success" label="Operation completed" />

// Icon only
<StatusIndicator status="warning" />

// With pulse animation
<StatusIndicator status="error" label="Connection lost" pulse />
```

## Props

### StatusIndicator Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `StatusType` | - | Status type determining color and icon |
| `size` | `StatusSize` | `'md'` | Size variant |
| `label` | `string` | - | Optional text label |
| `showIcon` | `boolean` | `true` | Show icon alongside status |
| `className` | `string` | `''` | Additional CSS classes |
| `pulse` | `boolean` | `false` | Enable pulse animation |
| `ariaLabel` | `string` | - | Accessible description for screen readers |

### Types

```tsx
type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type StatusSize = 'xs' | 'sm' | 'md' | 'lg';
```

## Status Types

### Success
Used for positive outcomes, completed operations, or healthy states.

```tsx
<StatusIndicator status="success" label="Connected" />
<StatusIndicator status="success" label="Task completed" />
<StatusIndicator status="success" label="All systems operational" />
```

### Warning
Used for cautionary states, degraded performance, or attention-required situations.

```tsx
<StatusIndicator status="warning" label="Limited connectivity" />
<StatusIndicator status="warning" label="High CPU usage" />
<StatusIndicator status="warning" label="Maintenance scheduled" />
```

### Error
Used for failures, critical issues, or broken states.

```tsx
<StatusIndicator status="error" label="Connection failed" />
<StatusIndicator status="error" label="Authentication error" />
<StatusIndicator status="error" label="Service unavailable" />
```

### Info
Used for informational messages, processing states, or neutral updates.

```tsx
<StatusIndicator status="info" label="Syncing data" />
<StatusIndicator status="info" label="Update available" />
<StatusIndicator status="info" label="Processing request" />
```

### Neutral
Used for inactive states, unknown status, or placeholder content.

```tsx
<StatusIndicator status="neutral" label="Inactive" />
<StatusIndicator status="neutral" label="No data" />
<StatusIndicator status="neutral" label="Pending" />
```

## Size Variants

```tsx
<StatusIndicator status="success" size="xs" label="Extra Small" />
<StatusIndicator status="success" size="sm" label="Small" />
<StatusIndicator status="success" size="md" label="Medium" />
<StatusIndicator status="success" size="lg" label="Large" />
```

## Advanced Usage

### Dots Only (No Icons)

```tsx
<StatusIndicator status="success" showIcon={false} />
<StatusIndicator status="warning" showIcon={false} />
<StatusIndicator status="error" showIcon={false} />
```

### With Pulse Animation

Perfect for real-time status updates:

```tsx
<StatusIndicator 
  status="success" 
  label="Live - Connected" 
  pulse 
/>
<StatusIndicator 
  status="warning" 
  label="Live - Degraded" 
  pulse 
/>
```

### Custom Accessibility Labels

```tsx
<StatusIndicator 
  status="error" 
  label="Offline"
  ariaLabel="Server status: offline, connection failed"
/>
```

## Status Badge

For badge-style status indicators:

```tsx
import { StatusBadge } from '@/components/ui/StatusIndicator';

// Filled badges
<StatusBadge status="success" label="Active" />
<StatusBadge status="warning" label="Pending" />
<StatusBadge status="error" label="Failed" />

// Outline badges
<StatusBadge status="success" label="Active" outline />
<StatusBadge status="info" label="Processing" outline />
```

### StatusBadge Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `StatusType` | - | Status type determining color |
| `size` | `StatusSize` | `'sm'` | Size variant |
| `label` | `string` | - | Badge text |
| `outline` | `boolean` | `false` | Use outline variant |
| `pulse` | `boolean` | `false` | Enable pulse animation |
| `className` | `string` | `''` | Additional CSS classes |

## Real-World Examples

### Server Status Dashboard

```tsx
<div className="space-y-3">
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
```

### Build Status List

```tsx
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
```

### User Status Badges

```tsx
<div className="flex flex-wrap gap-2">
  <StatusBadge status="success" label="Online" />
  <StatusBadge status="warning" label="Away" />
  <StatusBadge status="neutral" label="Offline" />
  <StatusBadge status="info" label="Busy" outline />
</div>
```

### System Health Indicators

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="p-4 border rounded-lg">
    <h3 className="font-medium mb-2">CPU Usage</h3>
    <StatusIndicator 
      status="warning" 
      label="78%" 
      size="lg"
    />
  </div>
  <div className="p-4 border rounded-lg">
    <h3 className="font-medium mb-2">Memory</h3>
    <StatusIndicator 
      status="success" 
      label="45%" 
      size="lg"
    />
  </div>
</div>
```

## Accessibility

The StatusIndicator component includes comprehensive accessibility features:

- **ARIA Support**: Proper `role="status"` and `aria-label` attributes
- **Screen Reader**: Descriptive status announcements
- **Semantic Colors**: Color is not the only indicator of status
- **High Contrast**: Meets WCAG contrast requirements
- **Focus Management**: Proper focus handling when interactive

### Best Practices

1. **Provide descriptive labels**: Use clear, actionable status text
2. **Use appropriate status types**: Match semantic meaning to visual style
3. **Include aria-label for complex states**: Provide additional context
4. **Don't rely on color alone**: Always include text or icons
5. **Use pulse sparingly**: Reserve for truly real-time updates

## Color Mapping

| Status | Light Mode | Dark Mode | Semantic Meaning |
|--------|------------|-----------|------------------|
| Success | Green | Green | Positive, completed, healthy |
| Warning | Yellow/Orange | Yellow/Orange | Caution, degraded, attention needed |
| Error | Red | Red | Failed, critical, broken |
| Info | Blue | Blue | Informational, processing, neutral |
| Neutral | Gray | Gray | Inactive, unknown, placeholder |

## Styling

The StatusIndicator component uses Tailwind CSS classes and supports dark mode automatically. Custom styling can be applied using the `className` prop:

```tsx
<StatusIndicator 
  status="success"
  label="Custom styled"
  className="shadow-lg rounded-full"
/>
```

## Testing

The component is fully tested with Jest and React Testing Library. Test files are located in `__tests__/StatusIndicator.test.tsx`.

## Related Components

- [StatusBadge](#status-badge) - Badge variant of status indicators
- [Alert](../Alert/README.md) - For more detailed status messages
- [Toast](../Toast/README.md) - For temporary status notifications 