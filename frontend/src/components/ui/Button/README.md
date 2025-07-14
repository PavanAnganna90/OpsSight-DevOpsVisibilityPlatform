# Button Component

A flexible and accessible button component with multiple variants, sizes, and states.

## Overview

The Button component provides a consistent interface for user interactions across the application. It supports multiple visual variants, sizes, loading states, and icon combinations while maintaining full accessibility compliance.

## Features

- 🎨 **Multiple Variants**: Primary, secondary, outline, ghost, danger, success
- 📏 **Size Options**: Extra small (xs) to extra large (xl)
- ⚡ **Loading States**: Built-in spinner with loading state management
- 🔗 **Icon Support**: Left and right icon positioning
- ♿ **Accessibility**: Full ARIA support and keyboard navigation
- 🌙 **Dark Mode**: Complete dark mode compatibility
- 📱 **Responsive**: Works across all device sizes

## Basic Usage

```tsx
import { Button } from '@/components/ui/Button';

// Basic button
<Button>Click me</Button>

// Primary button with icon
<Button variant="primary" leftIcon={<PlusIcon />}>
  Add Item
</Button>

// Loading state
<Button isLoading>
  Processing...
</Button>
```

## Props

### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `ButtonVariant` | `'primary'` | Visual style variant |
| `size` | `ButtonSize` | `'md'` | Size preset |
| `isLoading` | `boolean` | `false` | Loading state with spinner |
| `disabled` | `boolean` | `false` | Disabled state |
| `leftIcon` | `React.ReactNode` | - | Icon to display before text |
| `rightIcon` | `React.ReactNode` | - | Icon to display after text |
| `fullWidth` | `boolean` | `false` | Full width button |
| `className` | `string` | `''` | Additional CSS classes |
| `children` | `React.ReactNode` | - | Button content |

### Types

```tsx
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
```

## Variants

### Visual Variants

```tsx
// Primary - Main call-to-action
<Button variant="primary">Primary</Button>

// Secondary - Secondary actions
<Button variant="secondary">Secondary</Button>

// Outline - Subtle actions
<Button variant="outline">Outline</Button>

// Ghost - Minimal actions
<Button variant="ghost">Ghost</Button>

// Danger - Destructive actions
<Button variant="danger">Delete</Button>

// Success - Positive actions
<Button variant="success">Save</Button>
```

### Sizes

```tsx
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

## Advanced Usage

### With Icons

```tsx
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// Left icon
<Button leftIcon={<PlusIcon className="h-4 w-4" />}>
  Add Item
</Button>

// Right icon
<Button rightIcon={<ChevronRightIcon className="h-4 w-4" />}>
  Continue
</Button>

// Both icons
<Button 
  leftIcon={<PlusIcon className="h-4 w-4" />}
  rightIcon={<ChevronRightIcon className="h-4 w-4" />}
>
  Add & Continue
</Button>
```

### Loading States

```tsx
// Basic loading
<Button isLoading>
  Processing...
</Button>

// Loading with custom text
<Button isLoading variant="primary">
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

### Full Width

```tsx
<Button fullWidth variant="primary">
  Full Width Button
</Button>
```

## Icon Button

For icon-only buttons, use the `IconButton` component:

```tsx
import { IconButton } from '@/components/ui/Button';
import { TrashIcon } from '@heroicons/react/24/outline';

<IconButton
  icon={<TrashIcon />}
  ariaLabel="Delete item"
  variant="danger"
  size="sm"
/>
```

### IconButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `React.ReactNode` | - | Icon to display |
| `ariaLabel` | `string` | - | Accessible label for screen readers |
| `tooltip` | `string` | - | Tooltip text |
| `size` | `ButtonSize` | `'md'` | Size preset |
| `variant` | `ButtonVariant` | `'primary'` | Visual style variant |

## Button Group

For grouping related buttons:

```tsx
import { ButtonGroup } from '@/components/ui/Button';

// Horizontal group
<ButtonGroup orientation="horizontal">
  <Button variant="outline">First</Button>
  <Button variant="outline">Second</Button>
  <Button variant="outline">Third</Button>
</ButtonGroup>

// Vertical group
<ButtonGroup orientation="vertical">
  <Button variant="outline">Option 1</Button>
  <Button variant="outline">Option 2</Button>
  <Button variant="outline">Option 3</Button>
</ButtonGroup>
```

## Accessibility

The Button component includes comprehensive accessibility features:

- **ARIA Support**: Proper `aria-disabled` and `aria-label` attributes
- **Keyboard Navigation**: Full keyboard support with focus management
- **Screen Reader**: Descriptive labels and state announcements
- **Focus Indicators**: Clear focus rings for keyboard navigation
- **Loading States**: Proper loading state announcements

### Best Practices

1. **Use descriptive text**: Button text should clearly indicate the action
2. **Provide aria-label for icon buttons**: Always include accessible labels
3. **Handle loading states**: Disable buttons during async operations
4. **Use appropriate variants**: Match button importance to visual hierarchy
5. **Consider context**: Use outline/ghost variants for secondary actions

## Examples

### Form Actions

```tsx
<div className="flex gap-3">
  <Button variant="outline" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="primary" isLoading={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save Changes'}
  </Button>
</div>
```

### Toolbar Actions

```tsx
<div className="flex gap-2">
  <IconButton
    icon={<PlusIcon />}
    ariaLabel="Add new item"
    variant="primary"
    size="sm"
  />
  <IconButton
    icon={<EditIcon />}
    ariaLabel="Edit selected"
    variant="outline"
    size="sm"
  />
  <IconButton
    icon={<TrashIcon />}
    ariaLabel="Delete selected"
    variant="danger"
    size="sm"
  />
</div>
```

### Call-to-Action

```tsx
<Button 
  variant="primary" 
  size="lg" 
  fullWidth
  rightIcon={<ArrowRightIcon className="h-5 w-5" />}
>
  Get Started Today
</Button>
```

## Styling

The Button component uses Tailwind CSS classes and supports dark mode out of the box. Custom styling can be applied using the `className` prop:

```tsx
<Button 
  className="shadow-lg hover:shadow-xl transition-shadow"
  variant="primary"
>
  Custom Styled Button
</Button>
```

## Testing

The component is fully tested with Jest and React Testing Library. Test files are located in `__tests__/Button.test.tsx`.

## Related Components

- [IconButton](#icon-button) - Icon-only button variant
- [ButtonGroup](#button-group) - Grouping related buttons
- [Link Button](../Link/README.md) - Navigation buttons 