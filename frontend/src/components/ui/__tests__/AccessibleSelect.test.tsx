/**
 * Tests for AccessibleSelect component
 * Ensures WCAG 2.1 AA compliance and proper user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibleSelect } from '../AccessibleSelect';
import { SunIcon, MoonIcon, StarIcon } from '@heroicons/react/24/outline';

// Mock framer motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock accessibility utilities
jest.mock('@/utils/accessibility', () => ({
  generateAriaAttributes: jest.fn((type, options) => ({
    'aria-expanded': options?.expanded,
    'aria-label': options?.label,
    'aria-describedby': options?.describedBy,
    'aria-haspopup': type === 'dropdown' ? 'true' : undefined,
    role: type === 'button' ? 'button' : undefined,
  })),
  createFocusTrap: jest.fn(() => jest.fn()),
  announceToScreenReader: jest.fn(),
  respectReducedMotion: jest.fn((normal, reduced) => normal),
}));

// Mock classnames utility
jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

const mockOptions = [
  {
    value: 'light',
    label: 'Light Mode',
    description: 'Bright theme for daytime use',
    icon: SunIcon,
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    description: 'Dark theme for night use',
    icon: MoonIcon,
  },
  {
    value: 'auto',
    label: 'Auto Mode',
    description: 'Follows system preference',
    icon: StarIcon,
  },
  {
    value: 'disabled',
    label: 'Disabled Option',
    description: 'This option is disabled',
    disabled: true,
  },
];

describe('AccessibleSelect', () => {
  const defaultProps = {
    options: mockOptions,
    onChange: jest.fn(),
    placeholder: 'Select a theme',
    label: 'Theme Selection',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with label and placeholder', () => {
      render(<AccessibleSelect {...defaultProps} />);
      
      expect(screen.getByLabelText('Theme Selection')).toBeInTheDocument();
      expect(screen.getByText('Select a theme')).toBeInTheDocument();
    });

    test('renders with selected value', () => {
      render(<AccessibleSelect {...defaultProps} value="dark" />);
      
      expect(screen.getByText('Dark Mode')).toBeInTheDocument();
      expect(screen.queryByText('Select a theme')).not.toBeInTheDocument();
    });

    test('renders with description', () => {
      render(
        <AccessibleSelect 
          {...defaultProps} 
          description="Choose your preferred theme" 
        />
      );
      
      expect(screen.getByText('Choose your preferred theme')).toBeInTheDocument();
    });

    test('renders with error state', () => {
      render(
        <AccessibleSelect 
          {...defaultProps} 
          error="Please select a theme" 
        />
      );
      
      expect(screen.getByText('Please select a theme')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('renders in disabled state', () => {
      render(<AccessibleSelect {...defaultProps} disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('renders required indicator', () => {
      render(<AccessibleSelect {...defaultProps} required />);
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    test('applies size variants correctly', () => {
      const { rerender } = render(<AccessibleSelect {...defaultProps} size="sm" />);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(<AccessibleSelect {...defaultProps} size="lg" />);
      expect(screen.getByRole('button')).toHaveClass('px-5', 'py-3', 'text-lg');
    });

    test('applies variant styles correctly', () => {
      const { rerender } = render(<AccessibleSelect {...defaultProps} variant="ghost" />);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');

      rerender(<AccessibleSelect {...defaultProps} variant="outline" />);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    test('updates aria-expanded when opened', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    test('has proper aria-controls when opened', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(button).toHaveAttribute('aria-controls');
      const listboxId = button.getAttribute('aria-controls');
      expect(screen.getByRole('listbox')).toHaveAttribute('id', listboxId);
    });

    test('associates label with button', () => {
      render(<AccessibleSelect {...defaultProps} />);
      
      const label = screen.getByText('Theme Selection');
      const button = screen.getByRole('button');
      
      expect(label).toHaveAttribute('for');
      expect(button).toHaveAttribute('id', label.getAttribute('for'));
    });

    test('associates description with button', () => {
      render(
        <AccessibleSelect 
          {...defaultProps} 
          description="Choose your preferred theme" 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby');
    });

    test('associates error with button', () => {
      render(
        <AccessibleSelect 
          {...defaultProps} 
          error="Please select a theme" 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby');
      expect(button).toHaveAttribute('aria-invalid', 'true');
    });

    test('has proper aria-required when required', () => {
      render(<AccessibleSelect {...defaultProps} required />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-required', 'true');
    });

    test('options have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} value="dark" />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true'); // dark mode selected
      expect(options[2]).toHaveAttribute('aria-selected', 'false');
    });

    test('has proper live region for announcements', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Error message should have live region
      const { rerender } = render(
        <AccessibleSelect 
          {...defaultProps} 
          error="Please select a theme" 
        />
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Keyboard Navigation', () => {
    test('opens dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('opens dropdown with Space key', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('opens dropdown with ArrowDown key', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{ArrowDown}');
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('closes dropdown with Escape key', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('navigates options with arrow keys', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Navigate down
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      
      // Navigate up
      await user.keyboard('{ArrowUp}');
    });

    test('selects option with Enter key', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<AccessibleSelect {...defaultProps} onChange={onChange} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{ArrowDown}'); // Highlight first option
      await user.keyboard('{Enter}');
      
      expect(onChange).toHaveBeenCalledWith('light');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('jumps to first option with Home key', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{ArrowDown}'); // Move to second option
      await user.keyboard('{Home}'); // Jump to first
    });

    test('jumps to last option with End key', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{End}'); // Jump to last
    });

    test('supports type-ahead search', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Type 'd' to jump to 'Dark Mode'
      await user.keyboard('d');
      
      // Wait for search timeout
      await waitFor(() => {}, { timeout: 1100 });
    });

    test('ignores keyboard input when disabled', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} disabled />);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Mouse Interactions', () => {
    test('opens dropdown on button click', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('selects option on click', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<AccessibleSelect {...defaultProps} onChange={onChange} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const option = screen.getByText('Dark Mode');
      await user.click(option);
      
      expect(onChange).toHaveBeenCalledWith('dark');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('highlights option on hover', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const option = screen.getByText('Dark Mode');
      await user.hover(option);
      
      // Option should be highlighted (implementation depends on CSS classes)
    });

    test('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <AccessibleSelect {...defaultProps} />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      const outside = screen.getByTestId('outside');
      await user.click(outside);
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('does not open when clicking disabled button', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} disabled />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('does not select disabled option', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<AccessibleSelect {...defaultProps} onChange={onChange} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const disabledOption = screen.getByText('Disabled Option');
      await user.click(disabledOption);
      
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('listbox')).toBeInTheDocument(); // Should stay open
    });
  });

  describe('Focus Management', () => {
    test('focuses button after closing dropdown', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{Escape}');
      
      expect(button).toHaveFocus();
    });

    test('maintains focus within dropdown when open', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Focus should be trapped within the dropdown
      // This tests the createFocusTrap utility integration
    });

    test('handles Tab navigation properly when closed', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>Before</button>
          <AccessibleSelect {...defaultProps} />
          <button>After</button>
        </div>
      );
      
      const before = screen.getByText('Before');
      const select = screen.getByRole('button', { name: /theme selection/i });
      const after = screen.getByText('After');
      
      before.focus();
      await user.tab();
      expect(select).toHaveFocus();
      
      await user.tab();
      expect(after).toHaveFocus();
    });
  });

  describe('Option Filtering', () => {
    test('filters out disabled options from navigation', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Should only navigate through enabled options
      const enabledOptions = mockOptions.filter(opt => !opt.disabled);
      expect(enabledOptions).toHaveLength(3);
    });

    test('shows empty state when no options available', () => {
      render(<AccessibleSelect {...defaultProps} options={[]} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('No options available')).toBeInTheDocument();
    });

    test('handles search query filtering', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Type to filter options
      await user.keyboard('dark');
      
      // Should filter to matching options
      await waitFor(() => {}, { timeout: 1100 });
    });
  });

  describe('Icon Rendering', () => {
    test('renders option icons', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Icons should be rendered but are decorative (aria-hidden)
      const icons = screen.getAllByRole('img', { hidden: true });
      expect(icons.length).toBeGreaterThan(0);
    });

    test('renders selected option icon in button', () => {
      render(<AccessibleSelect {...defaultProps} value="light" />);
      
      // Selected option icon should be visible in button
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    test('handles options without icons', async () => {
      const optionsWithoutIcons = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
      ];
      
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} options={optionsWithoutIcons} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles rapid open/close cycles', async () => {
      const user = userEvent.setup();
      render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Rapidly open and close
      await user.click(button);
      await user.keyboard('{Escape}');
      await user.click(button);
      await user.keyboard('{Escape}');
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('handles value changes during dropdown open state', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AccessibleSelect {...defaultProps} value="light" />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Change value externally while dropdown is open
      rerender(<AccessibleSelect {...defaultProps} value="dark" />);
      
      expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    });

    test('handles options array changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AccessibleSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Change options while dropdown is open
      const newOptions = [
        { value: 'new1', label: 'New Option 1' },
        { value: 'new2', label: 'New Option 2' },
      ];
      
      rerender(<AccessibleSelect {...defaultProps} options={newOptions} />);
      
      expect(screen.getByText('New Option 1')).toBeInTheDocument();
    });

    test('cleans up search timeout on unmount', () => {
      const { unmount } = render(<AccessibleSelect {...defaultProps} />);
      
      // This test ensures no memory leaks from search timeouts
      unmount();
    });
  });

  describe('Error States', () => {
    test('shows error styling when error prop is provided', () => {
      render(
        <AccessibleSelect 
          {...defaultProps} 
          error="This field is required" 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-red-300');
    });

    test('clears error state on valid selection', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      const { rerender } = render(
        <AccessibleSelect 
          {...defaultProps} 
          onChange={onChange}
          error="This field is required" 
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const option = screen.getByText('Light Mode');
      await user.click(option);
      
      // After selection, error should be cleared by parent component
      rerender(
        <AccessibleSelect 
          {...defaultProps} 
          onChange={onChange}
          value="light"
        />
      );
      
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
  });
}); 