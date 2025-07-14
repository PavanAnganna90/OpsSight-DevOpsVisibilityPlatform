# UI Components Library

A comprehensive collection of reusable React components built with TypeScript, Tailwind CSS, and accessibility in mind.

## Overview

This UI components library provides a consistent design system for building modern web applications. All components are fully typed, accessible, responsive, and support dark mode out of the box.

## Design Principles

- **Accessibility First**: WCAG 2.1 AA compliance with full keyboard navigation and screen reader support
- **Type Safety**: Comprehensive TypeScript definitions for all components and props
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Dark Mode**: Built-in dark mode support using Tailwind CSS
- **Consistency**: Unified design tokens and styling patterns
- **Performance**: Optimized for performance with minimal bundle impact
- **Developer Experience**: Clear APIs, comprehensive documentation, and Storybook integration

## Available Components

### Core Components

#### [Button](./Button/README.md)
Flexible button component with multiple variants, sizes, and states.

```tsx
<Button variant="primary" size="md" leftIcon={<PlusIcon />}>
  Add Item
</Button>
```

**Features:**
- 6 visual variants (primary, secondary, outline, ghost, danger, success)
- 5 size options (xs, sm, md, lg, xl)
- Loading states with spinner
- Icon support (left, right, or both)
- Button groups and icon-only variants

---

#### [StatusIndicator](./StatusIndicator/README.md)
Visual status display component for showing various states.

```tsx
<StatusIndicator 
  status="success" 
  label="Connected" 
  pulse 
/>
```

**Features:**
- 5 status types (success, warning, error, info, neutral)
- Size variants and pulse animations
- Icon and dot-only modes
- Badge variants (filled and outline)

---

#### [MetricCard](./MetricCard/README.md)
Card component for displaying key metrics with trends and context.

```tsx
<MetricCard
  title="Revenue"
  value="$45,231"
  trend={{ value: '+12.5%', direction: 'up' }}
  icon={<CurrencyDollarIcon />}
/>
```

**Features:**
- Trend indicators with directional arrows
- Loading and error states
- Interactive capabilities
- Grid layout support
- Multiple size variants

---

### Layout Components

#### [Container](./Container/README.md)
Responsive container component for consistent page layouts.

#### [Grid](./Grid/README.md)
Flexible grid system for responsive layouts.

#### [Stack](./Stack/README.md)
Vertical and horizontal stacking component.

### Form Components

#### [Input](./Input/README.md)
Text input component with validation and states.

#### [Select](./Select/README.md)
Dropdown selection component.

#### [Checkbox](./Checkbox/README.md)
Checkbox input with custom styling.

#### [Radio](./Radio/README.md)
Radio button input component.

### Feedback Components

#### [Alert](./Alert/README.md)
Alert messages for user notifications.

#### [Toast](./Toast/README.md)
Temporary notification component.

#### [Modal](./Modal/README.md)
Modal dialog component.

#### [Tooltip](./Tooltip/README.md)
Contextual tooltip component.

### Navigation Components

#### [Tabs](./Tabs/README.md)
Tab navigation component.

#### [Breadcrumb](./Breadcrumb/README.md)
Breadcrumb navigation component.

#### [Pagination](./Pagination/README.md)
Pagination component for data sets.

### Data Display Components

#### [Table](./Table/README.md)
Data table component with sorting and filtering.

#### [Card](./Card/README.md)
Generic card component for content grouping.

#### [Badge](./Badge/README.md)
Small status and labeling component.

#### [Avatar](./Avatar/README.md)
User avatar component with fallbacks.

## Getting Started

### Installation

All components are available as part of the project's component library. Import them directly from the components directory:

```tsx
import { Button, StatusIndicator, MetricCard } from '@/components/ui';
```

### Basic Usage

```tsx
import React from 'react';
import { Button, StatusIndicator, MetricCard } from '@/components/ui';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';

function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Active Users"
          value="2,345"
          trend={{ value: '+12%', direction: 'up' }}
          icon={<UserGroupIcon className="h-8 w-8 text-blue-500" />}
        />
        {/* More metrics... */}
      </div>

      {/* Status Indicators */}
      <div className="flex gap-4">
        <StatusIndicator status="success" label="API Online" />
        <StatusIndicator status="warning" label="High Load" pulse />
        <StatusIndicator status="error" label="DB Offline" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="primary" leftIcon={<PlusIcon />}>
          Add New
        </Button>
        <Button variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

## Design Tokens

### Colors

The component library uses a semantic color system:

- **Primary**: Blue tones for main actions and branding
- **Secondary**: Gray tones for secondary actions
- **Success**: Green tones for positive states
- **Warning**: Yellow/Orange tones for caution states
- **Error**: Red tones for error states
- **Info**: Blue tones for informational content

### Typography

- **Font Family**: Inter (system fallbacks included)
- **Font Sizes**: 12px to 48px with consistent scale
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Line Heights**: Optimized for readability

### Spacing

Consistent spacing scale based on 4px increments:
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

### Breakpoints

Mobile-first responsive breakpoints:
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Focus Management**: Clear focus indicators
- **Color Contrast**: Meets minimum contrast ratios
- **Semantic HTML**: Proper HTML structure and landmarks

### Testing Accessibility

```bash
# Run accessibility tests
npm run test:a11y

# Lighthouse accessibility audit
npm run lighthouse:audit
```

## Dark Mode

All components support dark mode using Tailwind CSS's dark mode utilities:

```tsx
// Dark mode is automatically applied based on system preference
// or can be toggled programmatically
<div className="dark">
  <Button variant="primary">Dark Mode Button</Button>
</div>
```

## Storybook

Interactive component documentation is available in Storybook:

```bash
# Start Storybook
npm run storybook
```

Visit `http://localhost:6006` to explore all components with live examples and controls.

## Testing

All components include comprehensive test suites:

```bash
# Run component tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Contributing

### Adding New Components

1. Create component directory: `src/components/ui/ComponentName/`
2. Implement component with TypeScript
3. Add comprehensive tests
4. Create Storybook stories
5. Write README documentation
6. Export from main index file

### Component Structure

```
ComponentName/
├── index.ts          # Main export
├── ComponentName.tsx # Component implementation
├── ComponentName.stories.tsx # Storybook stories
├── ComponentName.test.tsx    # Test suite
└── README.md         # Component documentation
```

### Best Practices

1. **TypeScript**: Use strict typing for all props and state
2. **Accessibility**: Include ARIA attributes and keyboard support
3. **Testing**: Achieve >90% test coverage
4. **Documentation**: Provide clear examples and API documentation
5. **Performance**: Optimize for bundle size and runtime performance
6. **Consistency**: Follow established patterns and conventions

## Performance

### Bundle Size

Components are designed to be tree-shakeable:

```tsx
// Import only what you need
import { Button } from '@/components/ui/Button';

// Avoid importing the entire library
import { Button } from '@/components/ui'; // ❌ Imports everything
```

### Optimization Tips

- Use React.memo for expensive components
- Implement proper key props for lists
- Lazy load heavy components
- Optimize images and icons
- Use CSS-in-JS sparingly

## Browser Support

- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions
- **Mobile**: iOS Safari 12+, Chrome Android 80+

## Resources

- [Storybook Documentation](http://localhost:6006)
- [Design System Guidelines](./docs/design-system.md)
- [Accessibility Guide](./docs/accessibility.md)
- [Testing Guide](./docs/testing.md)
- [Contributing Guide](./docs/contributing.md)

## Support

For questions, issues, or contributions:

1. Check existing documentation
2. Search through Storybook examples
3. Review component test files for usage patterns
4. Create an issue for bugs or feature requests

---

*This component library is continuously evolving. Check the changelog for updates and new components.* 