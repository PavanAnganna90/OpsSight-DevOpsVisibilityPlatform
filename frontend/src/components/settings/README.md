# ThemeSelector Component

An interactive and comprehensive theme customization interface for the OpsSight application.

## Overview

The `ThemeSelector` component provides users with a complete interface to customize their application experience through:

- **Theme Variants**: Multiple design styles (Minimal, Neo-Brutalist, Glassmorphic, Cyberpunk, Editorial, Accessible)
- **Color Modes**: Light, Dark, High-Contrast, and System preference options
- **Contextual Themes**: Specialized theme contexts (Default, Focus, Relax, Energize)
- **Accessibility Settings**: System preferences respect and animation toggles
- **Live Preview**: Hover effects with color previews and smooth animations

## Features

### 🎨 **Theme Customization**
- **6 Theme Variants** with unique design philosophies
- **4 Color Modes** including automatic system detection
- **4 Contextual Themes** for different usage scenarios
- **Live Color Previews** on hover with theme-specific palettes

### ⚡ **Interactive Features**
- **Smooth Animations** powered by Framer Motion
- **Hover Previews** with contextual color information
- **Keyboard Navigation** with full accessibility support
- **Touch-Friendly** design for mobile devices

### 🔧 **Accessibility**
- **System Preference Respect** for reduced motion and high contrast
- **Keyboard Navigation** support throughout all controls
- **Screen Reader Friendly** with proper ARIA labels
- **Focus Management** with clear visual indicators

### 📱 **Responsive Design**
- **Mobile-First** approach with touch-friendly controls
- **Grid Layouts** that adapt to different screen sizes
- **Progressive Enhancement** for various device capabilities

## Usage

```tsx
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { ThemeProvider } from '@/contexts/ThemeContext';

function SettingsPage() {
  return (
    <ThemeProvider>
      <div className="p-6">
        <ThemeSelector />
      </div>
    </ThemeProvider>
  );
}
```

## Architecture

### **Dependencies**
- **React 18+** with hooks and context
- **Framer Motion** for smooth animations
- **Headless UI** for accessible radio groups
- **Heroicons** for consistent iconography
- **ThemeContext** for state management

### **Component Structure**
```
ThemeSelector/
├── Theme Variant Selection
│   ├── Radio group with 6 options
│   ├── Icon + label + description
│   └── Color preview dots
├── Color Mode Selection
│   ├── Radio group with 4 options
│   └── System preference detection
├── Contextual Theme Selection
│   ├── Radio group with 4 contexts
│   └── Context-specific accent colors
├── Accessibility Settings
│   ├── System preferences toggle
│   └── Animation control toggle
└── Current Configuration Display
    └── Live status overview
```

### **State Management**
All theme state is managed through the `ThemeContext`:

- `config`: Current theme configuration
- `currentTheme`: Resolved theme object
- `resolvedColorMode`: Actual color mode in use
- `systemPreferences`: OS-level settings detection
- Various setter functions for theme updates

## Theme Variants

### **Minimal** 🌿
Clean and focused design with ample whitespace
- Best for: Focus and productivity
- Color palette: Soft blues and grays
- Typography: Clean sans-serif

### **Neo-Brutalist** 🔥
Bold typography and raw structural elements
- Best for: Creative work and bold statements
- Color palette: High contrast blacks and whites
- Typography: Strong, geometric fonts

### **Glassmorphic** ✨
Semi-transparent elements with blur effects
- Best for: Modern, elegant interfaces
- Color palette: Translucent layers
- Typography: Light, airy fonts

### **Cyberpunk** ⚡
High contrast neon aesthetics on dark backgrounds
- Best for: Gaming and tech-focused work
- Color palette: Neon greens, blues, and purples
- Typography: Futuristic, digital fonts

### **Editorial** 📖
Typography-focused with newspaper inspiration
- Best for: Content creation and reading
- Color palette: Classic black and white
- Typography: Serif fonts with strong hierarchy

### **Accessible** ♿
Enhanced contrast and simplified interface
- Best for: Users with visual impairments
- Color palette: High contrast, colorblind-friendly
- Typography: Highly legible fonts

## Color Modes

- **Light**: Bright theme for well-lit environments
- **Dark**: Dark theme for low-light environments  
- **High Contrast**: Enhanced contrast for accessibility
- **System**: Automatically follows OS preferences

## Contextual Themes

- **Default**: Standard theme experience
- **Focus**: Minimizes distractions for deep work
- **Relax**: Calming colors for reduced stress
- **Energize**: Vibrant colors for high energy

## Animation System

### **Motion Variants**
```tsx
const animationVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }
};
```

### **Hover Effects**
- **Scale transformations** for interactive elements
- **Color transitions** for preview states
- **Smooth entrance/exit** animations

### **Accessibility Considerations**
- Respects `prefers-reduced-motion` system setting
- Provides toggle to disable animations
- Maintains functionality when animations are disabled

## Testing

The component includes comprehensive test coverage:

```bash
npm test -- --testPathPattern="ThemeSelector.test"
```

### **Test Coverage**
- ✅ Component rendering without crashes
- ✅ All main sections display correctly
- ✅ Theme configuration status
- ✅ Accessibility features
- ✅ Radio group interactions
- ✅ Theme variant options
- ✅ Color mode options
- ✅ Contextual theme options
- ✅ Icon rendering
- ✅ Descriptive text content

## Performance

### **Optimizations**
- `useCallback` for event handlers to prevent unnecessary re-renders
- Memoized theme calculations
- Efficient state updates through context
- Minimal re-renders with proper dependency arrays

### **Bundle Size**
- Tree-shaken icon imports
- Conditional animation loading
- Optimized CSS classes with utility-first approach

## Troubleshooting

### **Common Issues**

**Theme not applying correctly**
- Ensure `ThemeProvider` wraps the component
- Check that theme context is properly initialized
- Verify localStorage permissions in browser

**Animations not working**
- Check if `framer-motion` is installed
- Verify system motion preferences
- Ensure animation toggle is enabled

**Icons not displaying**
- Confirm `@heroicons/react` is installed
- Check icon import paths
- Verify proper icon component usage

### **Development Tips**
- Use React DevTools to inspect theme context state
- Check browser console for theme application logs
- Test with different system preferences
- Verify accessibility with screen readers

## Future Enhancements

- **Custom Theme Creation**: Allow users to create and save custom themes
- **Theme Sharing**: Export/import theme configurations
- **Advanced Animations**: More sophisticated transition effects
- **Theme Scheduling**: Automatic theme switching based on time
- **Color Picker Integration**: Fine-grained color customization
- **Theme Analytics**: Usage tracking for popular themes 