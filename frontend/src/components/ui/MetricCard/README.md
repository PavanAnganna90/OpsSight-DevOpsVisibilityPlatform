# MetricCard Component

A reusable card component for displaying key metrics with icons, values, trends, and contextual information.

## Overview

The MetricCard component provides a visually appealing way to display important metrics and KPIs. It supports icons, trend indicators, loading states, error handling, and interactive capabilities, making it perfect for dashboards and analytics interfaces.

## Features

- 📊 **Metric Display**: Clear value presentation with titles and subtitles
- 📈 **Trend Indicators**: Up, down, and neutral trend arrows with percentages
- 🎨 **Icon Support**: Customizable icons for visual context
- 📏 **Size Variants**: Small, medium, and large sizes
- ⚡ **Loading States**: Built-in skeleton loading animation
- ❌ **Error Handling**: Graceful error state display
- 🖱️ **Interactive**: Optional click handlers for drill-down functionality
- ♿ **Accessibility**: Full ARIA support and keyboard navigation
- 🌙 **Dark Mode**: Complete dark mode compatibility
- 📱 **Responsive**: Grid layouts and responsive design

## Basic Usage

```tsx
import { MetricCard } from '@/components/ui/MetricCard';

// Basic metric card
<MetricCard
  title="Total Users"
  value="12,345"
  subtitle="Active users this month"
/>

// With icon and trend
<MetricCard
  title="Revenue"
  value="$45,231"
  subtitle="Monthly revenue"
  icon={<CurrencyDollarIcon className="h-8 w-8 text-green-500" />}
  trend={{
    value: '+12.5%',
    direction: 'up',
    label: 'vs last month',
  }}
/>
```

## Props

### MetricCard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Metric title/label |
| `value` | `string \| number` | - | Main metric value |
| `subtitle` | `string` | - | Optional subtitle/description |
| `icon` | `React.ReactNode` | - | Icon component or element |
| `trend` | `TrendObject` | - | Trend information |
| `context` | `string` | - | Additional context or help text |
| `size` | `MetricSize` | `'md'` | Card size variant |
| `isLoading` | `boolean` | `false` | Loading state |
| `error` | `string` | - | Error message |
| `onClick` | `() => void` | - | Click handler for interactive cards |
| `className` | `string` | `''` | Additional CSS classes |

### Types

```tsx
type MetricSize = 'sm' | 'md' | 'lg';
type TrendDirection = 'up' | 'down' | 'neutral';

interface TrendObject {
  value: string;
  direction: TrendDirection;
  label?: string;
}
```

## Size Variants

```tsx
// Small - Compact display
<MetricCard
  title="Small Card"
  value="1,234"
  size="sm"
/>

// Medium - Default size
<MetricCard
  title="Medium Card"
  value="5,678"
  size="md"
/>

// Large - Prominent display
<MetricCard
  title="Large Card"
  value="9,012"
  size="lg"
/>
```

## Trend Indicators

### Positive Trends (Up)

```tsx
<MetricCard
  title="Sales"
  value="$12,345"
  trend={{
    value: '+15.3%',
    direction: 'up',
    label: 'vs last month',
  }}
/>
```

### Negative Trends (Down)

```tsx
<MetricCard
  title="Response Time"
  value="245ms"
  trend={{
    value: '+8.2%',
    direction: 'down',
    label: 'vs last week',
  }}
/>
```

### Neutral Trends

```tsx
<MetricCard
  title="Server Load"
  value="67%"
  trend={{
    value: '0.1%',
    direction: 'neutral',
    label: 'vs last hour',
  }}
/>
```

## Advanced Usage

### With Icons

```tsx
import { 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';

<MetricCard
  title="Active Users"
  value="2,345"
  subtitle="Currently online"
  icon={<UserGroupIcon className="h-8 w-8 text-blue-500" />}
/>
```

### Loading State

```tsx
<MetricCard
  title="Loading Metric"
  value="0"
  isLoading={true}
/>
```

### Error State

```tsx
<MetricCard
  title="Failed Metric"
  value="0"
  error="Failed to load metric data"
/>
```

### Interactive Cards

```tsx
<MetricCard
  title="Click for Details"
  value="42"
  subtitle="Interactive metric"
  onClick={() => console.log('Card clicked!')}
/>
```

### With Context

```tsx
<MetricCard
  title="Conversion Rate"
  value="3.24%"
  subtitle="Website conversions"
  trend={{
    value: '+0.8%',
    direction: 'up',
    label: 'vs last month',
  }}
  context="Based on 10,000 unique visitors"
/>
```

## Real-World Examples

### Dashboard Metrics

```tsx
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
```

### System Monitoring

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <MetricCard
    title="CPU Usage"
    value="67.8%"
    subtitle="Current utilization"
    icon={<ServerIcon className="h-8 w-8 text-orange-500" />}
    trend={{
      value: '+2.1%',
      direction: 'down',
      label: 'vs 1 hour ago',
    }}
    onClick={() => navigateToDetails('cpu')}
  />
  <MetricCard
    title="Memory Usage"
    value="4.2 GB"
    subtitle="of 8 GB total"
    icon={<ServerIcon className="h-8 w-8 text-blue-500" />}
    trend={{
      value: '+0.3 GB',
      direction: 'down',
      label: 'vs 1 hour ago',
    }}
  />
  <MetricCard
    title="Disk Space"
    value="156 GB"
    subtitle="of 500 GB used"
    icon={<ServerIcon className="h-8 w-8 text-green-500" />}
    trend={{
      value: '+1.2 GB',
      direction: 'down',
      label: 'vs yesterday',
    }}
  />
</div>
```

### E-commerce Analytics

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <MetricCard
    title="Orders Today"
    value="127"
    subtitle="New orders"
    icon={<ShoppingCartIcon className="h-8 w-8 text-blue-500" />}
    trend={{
      value: '+23%',
      direction: 'up',
      label: 'vs yesterday',
    }}
  />
  <MetricCard
    title="Conversion Rate"
    value="3.24%"
    subtitle="Visitors to customers"
    icon={<ChartBarIcon className="h-8 w-8 text-green-500" />}
    trend={{
      value: '+0.8%',
      direction: 'up',
      label: 'vs last week',
    }}
    context="Based on 10,000 unique visitors"
  />
  <MetricCard
    title="Average Order"
    value="$89.50"
    subtitle="Per transaction"
    icon={<CurrencyDollarIcon className="h-8 w-8 text-purple-500" />}
    trend={{
      value: '+$5.20',
      direction: 'up',
      label: 'vs last month',
    }}
  />
  <MetricCard
    title="Cart Abandonment"
    value="68.2%"
    subtitle="Abandoned carts"
    icon={<ExclamationTriangleIcon className="h-8 w-8 text-red-500" />}
    trend={{
      value: '+2.1%',
      direction: 'down',
      label: 'vs last week',
    }}
  />
</div>
```

## MetricCardGrid

For organized layouts, use the `MetricCardGrid` component:

```tsx
import { MetricCardGrid } from '@/components/ui/MetricCard';

<MetricCardGrid 
  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} 
  gap="md"
>
  <MetricCard title="Metric 1" value="123" />
  <MetricCard title="Metric 2" value="456" />
  <MetricCard title="Metric 3" value="789" />
  {/* More cards... */}
</MetricCardGrid>
```

### MetricCardGrid Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Child metric cards |
| `columns` | `ColumnsObject` | `{ sm: 1, md: 2, lg: 3, xl: 4 }` | Responsive column configuration |
| `gap` | `'sm' \| 'md' \| 'lg'` | `'md'` | Gap between cards |
| `className` | `string` | `''` | Additional CSS classes |

## States

### Loading State

The loading state displays a skeleton animation:

```tsx
<MetricCard
  title="Loading..."
  value="0"
  isLoading={true}
/>
```

### Error State

Error states show a clear error message with an icon:

```tsx
<MetricCard
  title="Error Metric"
  value="0"
  error="Failed to connect to API"
/>
```

## Accessibility

The MetricCard component includes comprehensive accessibility features:

- **ARIA Support**: Proper labeling and descriptions
- **Keyboard Navigation**: Full keyboard support for interactive cards
- **Screen Reader**: Descriptive announcements for values and trends
- **Focus Management**: Clear focus indicators
- **Semantic HTML**: Proper heading hierarchy and structure

### Best Practices

1. **Use descriptive titles**: Make metric purposes clear
2. **Provide context**: Include subtitles and context when helpful
3. **Handle loading states**: Always show loading indicators during data fetching
4. **Error handling**: Provide clear error messages
5. **Trend clarity**: Use clear trend labels and directions
6. **Interactive feedback**: Provide visual feedback for clickable cards

## Styling

The MetricCard component uses Tailwind CSS classes and supports dark mode automatically. Custom styling can be applied using the `className` prop:

```tsx
<MetricCard
  title="Custom Styled"
  value="123"
  className="border-2 border-blue-500 shadow-xl"
/>
```

## Performance

- **Optimized rendering**: Efficient re-renders with React.memo
- **Lazy loading**: Supports lazy loading of metric data
- **Skeleton loading**: Smooth loading transitions
- **Error boundaries**: Graceful error handling

## Testing

The component is fully tested with Jest and React Testing Library. Test files are located in `__tests__/MetricCard.test.tsx`.

## Related Components

- [MetricCardGrid](#metriccardgrid) - Grid layout for multiple cards
- [StatusIndicator](../StatusIndicator/README.md) - For status displays
- [Chart](../Chart/README.md) - For detailed metric visualizations 