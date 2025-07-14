# OpsSight Component Examples

This directory contains comprehensive usage examples for all OpsSight UI components and patterns.

## 📁 Example Categories

### [Basic Components](./basic-components/)
- **Button Examples** - All button variants, states, and patterns
- **StatusIndicator Examples** - Status displays, badges, and indicators  
- **MetricCard Examples** - Metrics, dashboards, and data visualization

### [Advanced Components](./advanced-components/)
- **ColorModeToggle** - Theme switching and dark mode
- **ThemePreview** - Theme selection interfaces
- **AccessibilitySettings** - Accessibility features and controls
- **LoadingSkeleton** - Loading states and placeholders

### [Layout Patterns](./layout-patterns/)
- **Dashboard Layouts** - Complete dashboard examples
- **Grid Systems** - Responsive component grids
- **Navigation** - Headers, sidebars, and menus

### [Interactive Examples](./interactive-examples/)
- **Forms and Validation** - Complete form implementations
- **Data Fetching** - Loading, error, and success states
- **Modals and Dialogs** - Overlay interfaces
- **Search and Filter** - Data manipulation interfaces

### [Theme Integration](./theme-integration/)
- **Theme Switching** - Dynamic theme changes
- **Custom Themes** - Creating and applying custom themes
- **Color Mode Support** - Light, dark, and high-contrast modes

## 🚀 Quick Start Examples

### Basic Dashboard

```tsx
import { MetricCard, StatusIndicator, Button } from '@/components/ui';

function QuickDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusIndicator status="success">All Systems</StatusIndicator>
        <StatusIndicator status="warning">Minor Issues</StatusIndicator>
        <StatusIndicator status="info" pulse>Processing</StatusIndicator>
        <StatusIndicator status="neutral">Maintenance</StatusIndicator>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Users"
          value="2,345"
          trend="up"
          trendValue="+12%"
        />
        <MetricCard
          title="Response Time"
          value="142ms"
          trend="down"
          trendValue="-8%"
        />
        <MetricCard
          title="Error Rate"
          value="0.02%"
          trend="down"
          trendValue="-50%"
        />
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <Button variant="primary">Deploy</Button>
        <Button variant="secondary">View Logs</Button>
        <Button variant="outline">Export</Button>
      </div>
    </div>
  );
}
```

### Form with Validation

```tsx
import { Button, StatusIndicator } from '@/components/ui';
import { useState } from 'react';

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Handle form submission
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <input 
        type="email" 
        placeholder="Email" 
        className="w-full p-2 border rounded"
        required 
      />
      <input 
        type="password" 
        placeholder="Password" 
        className="w-full p-2 border rounded"
        required 
      />
      
      {error && (
        <StatusIndicator status="error" size="sm">
          {error}
        </StatusIndicator>
      )}

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        fullWidth
      >
        Sign In
      </Button>
    </form>
  );
}
```

## 📖 Component Documentation

Each example includes:
- **Complete Code** - Copy-paste ready implementations
- **Props Reference** - All available properties and options
- **Best Practices** - Recommended usage patterns
- **Accessibility** - WCAG compliance guidelines
- **Responsive Design** - Mobile-first implementations

## 🎨 Theme Examples

### Switching Themes

```tsx
import { applyTheme, themes } from '@/styles/themes';

// Apply a specific theme
applyTheme(themes.cyberpunk);

// Switch between light/dark modes
applyTheme(themes.minimal, 'dark');
```

### Custom Theme Creation

```tsx
import { createTheme } from '@/styles/themes';

const myTheme = createTheme('custom', {
  colors: {
    primary: { 500: '#your-brand-color' }
  }
});
```

## 🔗 Related Documentation

- [Theme System Guide](../docs/theme-system.md)
- [Theme Customization](../docs/theme-customization-guide.md)
- [Component READMEs](../frontend/src/components/ui/)
- [Storybook Documentation](http://localhost:6006)

## 💡 Tips for Using Examples

1. **Copy and Modify** - Start with an example and customize for your needs
2. **Combine Patterns** - Mix different examples to create complex interfaces
3. **Check Props** - Review component documentation for all available options
4. **Test Responsively** - Ensure examples work across different screen sizes
5. **Follow Accessibility** - Maintain WCAG compliance in your implementations

---

*These examples demonstrate real-world usage patterns for building production-ready interfaces with the OpsSight design system.* 