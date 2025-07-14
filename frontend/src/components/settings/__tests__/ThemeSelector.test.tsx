import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the ThemeContext completely to avoid any dependency issues
const mockUseTheme = {
  config: {
    variant: 'minimal' as const,
    colorMode: 'light' as const,
    contextualTheme: 'default' as const,
    respectSystemPreferences: true,
    enableTransitions: true,
  },
  currentTheme: {
    name: 'Minimal Light',
  },
  resolvedColorMode: 'light' as const,
  setThemeVariant: jest.fn(),
  setColorMode: jest.fn(),
  setContextualTheme: jest.fn(),
  toggleSystemPreferences: jest.fn(),
  toggleTransitions: jest.fn(),
  hasTransitions: true,
  isReducedMotion: false,
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    label: React.forwardRef<HTMLLabelElement, any>(({ children, ...props }, ref) => (
      <label ref={ref} {...props}>{children}</label>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Headless UI RadioGroup - Define components inline to avoid hoisting issues
jest.mock('@headlessui/react', () => {
  const MockRadioGroupOption = React.forwardRef<HTMLDivElement, any>(({ children, value, className, onMouseEnter, onMouseLeave }, ref) => {
    const childrenFunction = typeof children === 'function' 
      ? children({ checked: false, active: false }) 
      : children;
    
    return (
      <div 
        ref={ref}
        className={className}
        data-testid={`radio-option-${value}`}
        data-value={value}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {childrenFunction}
      </div>
    );
  });
  MockRadioGroupOption.displayName = 'MockRadioGroupOption';

  const MockRadioGroup: any = React.forwardRef<HTMLDivElement, any>(({ children, value, onChange, className }, ref) => (
    <div ref={ref} className={className} data-testid="radio-group" data-value={value}>
      {children}
    </div>
  ));
  MockRadioGroup.displayName = 'MockRadioGroup';
  MockRadioGroup.Option = MockRadioGroupOption;

  return {
    RadioGroup: MockRadioGroup,
  };
});

// Mock all the icons 
jest.mock('@heroicons/react/24/outline', () => {
  const MockIcon = ({ className, ...props }: any) => (
    <svg className={className} {...props} data-testid="mock-icon">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );

  return {
    SunIcon: MockIcon,
    MoonIcon: MockIcon,
    ComputerDesktopIcon: MockIcon,
    SparklesIcon: MockIcon,
    BeakerIcon: MockIcon,
    NewspaperIcon: MockIcon,
    EyeIcon: MockIcon,
    ClockIcon: MockIcon,
    BoltIcon: MockIcon,
    HeartIcon: MockIcon,
    FireIcon: MockIcon,
    SwatchIcon: MockIcon,
    Cog6ToothIcon: MockIcon,
    CheckIcon: MockIcon,
  };
});

// Mock the cn utility
jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Now import the component after all mocks are set up
import { ThemeSelector } from '../ThemeSelector';

describe('ThemeSelector Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the component without crashing', () => {
    render(<ThemeSelector />);
    expect(screen.getByText('Theme Customization')).toBeInTheDocument();
  });

  test('displays all main sections', () => {
    render(<ThemeSelector />);
    
    expect(screen.getByText('Theme Style')).toBeInTheDocument();
    expect(screen.getByText('Color Mode')).toBeInTheDocument();
    expect(screen.getByText('Theme Context')).toBeInTheDocument();
    expect(screen.getByText('Accessibility & Preferences')).toBeInTheDocument();
  });

  test('shows current theme configuration', () => {
    render(<ThemeSelector />);
    
    expect(screen.getByText('Current Configuration')).toBeInTheDocument();
    expect(screen.getByText('Minimal Light')).toBeInTheDocument();
    expect(screen.getByText('light')).toBeInTheDocument();
  });

  test('renders accessibility toggles', () => {
    render(<ThemeSelector />);
    
    expect(screen.getByText('Respect System Preferences')).toBeInTheDocument();
    expect(screen.getByText('Enable Animations')).toBeInTheDocument();
  });

  test('contains radio groups for different theme options', () => {
    render(<ThemeSelector />);
    
    // Should have multiple radio groups (theme variants, color modes, contextual themes)
    const radioGroups = screen.getAllByTestId('radio-group');
    expect(radioGroups.length).toBeGreaterThan(0);
  });

  test('displays theme variant options', () => {
    render(<ThemeSelector />);
    
    // Check for some theme variant options
    expect(screen.getByTestId('radio-option-minimal')).toBeInTheDocument();
    expect(screen.getByTestId('radio-option-neo-brutalist')).toBeInTheDocument();
  });

  test('displays color mode options', () => {
    render(<ThemeSelector />);
    
    // Check for color mode options
    expect(screen.getByTestId('radio-option-light')).toBeInTheDocument();
    expect(screen.getByTestId('radio-option-dark')).toBeInTheDocument();
    expect(screen.getByTestId('radio-option-system')).toBeInTheDocument();
  });

  test('displays contextual theme options', () => {
    render(<ThemeSelector />);
    
    // Check for contextual theme options
    expect(screen.getByTestId('radio-option-default')).toBeInTheDocument();
    expect(screen.getByTestId('radio-option-focus')).toBeInTheDocument();
  });

  test('renders multiple icons', () => {
    render(<ThemeSelector />);
    
    // Should have multiple icons for different sections and options
    const icons = screen.getAllByTestId('mock-icon');
    expect(icons.length).toBeGreaterThan(5);
  });

  test('shows proper descriptions', () => {
    render(<ThemeSelector />);
    
    expect(screen.getByText(/Personalize your OpsSight experience/)).toBeInTheDocument();
    expect(screen.getByText(/Follow OS settings for motion and contrast/)).toBeInTheDocument();
  });
}); 