# Accessibility Guide

Comprehensive accessibility documentation for the OpsSight DevOps Visibility Platform.

## Overview

OpsSight is designed with accessibility as a core principle, ensuring that all users can effectively use our DevOps visibility platform.

### Standards Compliance
- WCAG 2.1 AA Compliance
- Section 508 Compatible
- ARIA 1.2 Support
- Full Keyboard Navigation

## Component Accessibility

### Button Component
Provides comprehensive accessibility support with proper ARIA attributes.

```tsx
// Standard accessible button
<Button variant="primary" size="md">
  Save Changes
</Button>

// Icon-only button with aria-label
<Button 
  variant="ghost" 
  size="sm" 
  iconLeft={<RefreshIcon />} 
  aria-label="Refresh data"
/>
```

### StatusIndicator Component
Accessible status information with proper color contrast.

```tsx
<StatusIndicator 
  status="error" 
  size="sm"
  aria-label="Service status: Critical error"
>
  API Service: Down
</StatusIndicator>
```

### MetricCard Component
Displays metrics with accessible formatting.

```tsx
<MetricCard
  title="CPU Usage"
  value="78%"
  trend="up"
  trendValue="+5%"
  aria-label="CPU Usage: 78 percent, trending up by 5 percent"
  role="status"
  aria-live="polite"
/>
```

## Keyboard Navigation

Complete keyboard navigation support for all interactive elements.

### Key Bindings
- Tab: Navigate forward
- Shift + Tab: Navigate backward
- Enter/Space: Activate buttons
- Escape: Close dialogs/menus
- Arrow Keys: Navigate within groups

## Color and Contrast

### Contrast Requirements
- Normal Text: Minimum 4.5:1 contrast ratio
- Large Text: Minimum 3:1 contrast ratio
- UI Components: Minimum 3:1 contrast ratio

## Testing

### Automated Testing
```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

test('should not have accessibility violations', async () => {
  const { container } = render(<Button>Test</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist
- [ ] Keyboard navigation works
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets standards
- [ ] Focus indicators are visible

## Best Practices

1. Use semantic HTML first
2. Provide proper ARIA labels
3. Ensure keyboard accessibility
4. Test with screen readers
5. Maintain color independence

For more details, see individual component documentation. 