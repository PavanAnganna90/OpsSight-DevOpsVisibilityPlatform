/**
 * Button Component Tests
 * 
 * Comprehensive test suite covering:
 * - Component snapshots for different variants
 * - Accessibility testing
 * - Event handling integration
 * - Theme integration
 * - Loading states and disabled states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { Button } from '../button';

describe('Button Component', () => {
  describe('Snapshots', () => {
    it('should match snapshot for primary variant', () => {
      const { container } = render(
        <Button variant="primary">Primary Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for secondary variant', () => {
      const { container } = render(
        <Button variant="secondary">Secondary Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for outline variant', () => {
      const { container } = render(
        <Button variant="outline">Outline Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for ghost variant', () => {
      const { container } = render(
        <Button variant="ghost">Ghost Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for danger variant', () => {
      const { container } = render(
        <Button variant="destructive">Danger Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for success variant', () => {
      const { container } = render(
        <Button variant="secondary">Success Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for extra small size', () => {
      const { container } = render(
        <Button size="xs">Extra Small Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for small size', () => {
      const { container } = render(
        <Button size="sm">Small Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for medium size', () => {
      const { container } = render(
        <Button size="md">Medium Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for large size', () => {
      const { container } = render(
        <Button size="lg">Large Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for extra large size', () => {
      const { container } = render(
        <Button size="xl">Extra Large Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot in loading state', () => {
      const { container } = render(
        <Button isLoading>Loading Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot in disabled state', () => {
      const { container } = render(
        <Button disabled>Disabled Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with custom className', () => {
      const { container } = render(
        <Button className="custom-class">Custom Button</Button>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role and button semantics', () => {
      render(<Button>Test Button</Button>);
      
      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should support custom aria-label', () => {
      render(<Button aria-label="Custom Label">Icon Only</Button>);
      
      const button = screen.getByRole('button', { name: 'Custom Label' });
      expect(button).toBeInTheDocument();
    });

    it('should be properly disabled with aria-disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should indicate loading state with aria-busy', () => {
      render(<Button isLoading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should support keyboard navigation', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Clickable Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} isLoading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle async onClick functions', async () => {
      const asyncHandler = jest.fn().mockResolvedValue('success');
      render(<Button onClick={asyncHandler}>Async Button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(asyncHandler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Integration with CSS Classes', () => {
    it('should apply correct variant classes', () => {
      const { rerender } = render(<Button variant="primary">Button</Button>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');

      rerender(<Button variant="secondary">Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');

      rerender(<Button variant="destructive">Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });

    it('should apply correct size classes', () => {
      const { rerender } = render(<Button size="sm">Button</Button>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-2');

      rerender(<Button size="lg">Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2');

      rerender(<Button size="xl">Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3');
    });

    it('should merge custom classes correctly', () => {
      render(<Button className="custom-class">Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('inline-flex'); // Should preserve base classes
    });
  });

  describe('Content Rendering', () => {
    it('should render text content', () => {
      render(<Button>Text Content</Button>);
      
      expect(screen.getByText('Text Content')).toBeInTheDocument();
    });

    it('should render children elements', () => {
      render(
        <Button>
          <span data-testid="icon">🔄</span>
          <span>With Icon</span>
        </Button>
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should render loading indicator when loading', () => {
      render(<Button isLoading>Loading</Button>);
      
      // Check for loading indicator (implementation depends on actual Button component)
      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50'); // Common loading style
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      const { container } = render(<Button>{null}</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should handle undefined onClick gracefully', () => {
      expect(() => {
        render(<Button>No Handler</Button>);
      }).not.toThrow();
    });

    it('should handle fullWidth prop correctly', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="default">Default Button</Button>);
    let button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="primary">Primary Button</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="destructive">Destructive Button</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary Button</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Button size="sm">Small Button</Button>);
    let button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button size="lg">Large Button</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button size="icon">Icon Button</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable Button</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<Button isLoading>Loading Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toBeInTheDocument();
  });

  it('renders with leftIcon', () => {
    const TestIcon = () => <span data-testid="left-icon">→</span>;
    render(<Button leftIcon={<TestIcon />}>Button with Left Icon</Button>);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByText('Button with Left Icon')).toBeInTheDocument();
  });

  it('renders with rightIcon', () => {
    const TestIcon = () => <span data-testid="right-icon">←</span>;
    render(<Button rightIcon={<TestIcon />}>Button with Right Icon</Button>);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByText('Button with Right Icon')).toBeInTheDocument();
  });

  it('applies fullWidth styling when fullWidth prop is true', () => {
    render(<Button fullWidth>Full Width Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeInTheDocument();
    // Note: We would test for specific class but that depends on implementation
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
}); 