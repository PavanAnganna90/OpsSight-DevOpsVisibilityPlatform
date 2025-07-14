import type { Meta, StoryObj } from '@storybook/react';
import { Button, IconButton, ButtonGroup } from './Button';
import { ChevronRightIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Flexible button component supporting multiple variants, sizes, and states with full accessibility support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Size preset',
    },
    isLoading: {
      control: 'boolean',
      description: 'Loading state with spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Full width button',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic button stories
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success Button',
  },
};

// Size variants
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

// States
export const Loading: Story = {
  args: {
    variant: 'primary',
    isLoading: true,
    children: 'Loading...',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Button',
  },
};

export const FullWidth: Story = {
  args: {
    variant: 'primary',
    fullWidth: true,
    children: 'Full Width Button',
  },
  parameters: {
    layout: 'padded',
  },
};

// With icons
export const WithLeftIcon: Story = {
  args: {
    variant: 'primary',
    leftIcon: <PlusIcon className="h-4 w-4" />,
    children: 'Add Item',
  },
};

export const WithRightIcon: Story = {
  args: {
    variant: 'outline',
    rightIcon: <ChevronRightIcon className="h-4 w-4" />,
    children: 'Continue',
  },
};

export const WithBothIcons: Story = {
  args: {
    variant: 'secondary',
    leftIcon: <PlusIcon className="h-4 w-4" />,
    rightIcon: <ChevronRightIcon className="h-4 w-4" />,
    children: 'Add & Continue',
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};

// Icon Button stories
export const IconButtonStory: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <IconButton
        icon={<PlusIcon />}
        aria-label="Add item"
        variant="primary"
        size="sm"
      />
      <IconButton
        icon={<TrashIcon />}
        aria-label="Delete item"
        variant="danger"
        size="md"
      />
      <IconButton
        icon={<ChevronRightIcon />}
        aria-label="Next"
        variant="outline"
        size="lg"
      />
    </div>
  ),
  name: 'Icon Buttons',
};

// Button Group stories
export const ButtonGroupStory: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2">Horizontal Group</h3>
        <ButtonGroup orientation="horizontal">
          <Button variant="outline">First</Button>
          <Button variant="outline">Second</Button>
          <Button variant="outline">Third</Button>
        </ButtonGroup>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Vertical Group</h3>
        <ButtonGroup orientation="vertical">
          <Button variant="outline">First</Button>
          <Button variant="outline">Second</Button>
          <Button variant="outline">Third</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
  name: 'Button Groups',
  parameters: {
    layout: 'padded',
  },
};

// Interactive playground
export const Playground: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Button Text',
    isLoading: false,
    disabled: false,
    fullWidth: false,
  },
}; 