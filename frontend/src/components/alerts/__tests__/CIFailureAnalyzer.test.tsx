/**
 * Tests for CIFailureAnalyzer Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CIFailureAnalyzer from '../CIFailureAnalyzer';

// Mock the UI components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid="tabs-content" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid="tabs-trigger" data-value={value} onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, onClose, title }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

describe('CIFailureAnalyzer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<CIFailureAnalyzer />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders compact view when compact prop is true', async () => {
    render(<CIFailureAnalyzer compact={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('CI Failure Summary')).toBeInTheDocument();
    });
    
    // Should show limited failures in compact mode
    const analyzeButtons = screen.getAllByText('Analyze');
    expect(analyzeButtons.length).toBeLessThanOrEqual(3);
  });

  it('renders full view with statistics when compact is false', async () => {
    render(<CIFailureAnalyzer compact={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('CI Failure Analysis')).toBeInTheDocument();
    });
    
    // Should show statistics cards
    expect(screen.getByText('Total Failures')).toBeInTheDocument();
    expect(screen.getByText('Failure Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Fix Time')).toBeInTheDocument();
    expect(screen.getByText('Top Issue')).toBeInTheDocument();
  });

  it('displays failure information correctly', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      // Should display mock failure data
      expect(screen.getByText('test-backend')).toBeInTheDocument();
      expect(screen.getByText('build-frontend')).toBeInTheDocument();
      expect(screen.getByText('security-scan')).toBeInTheDocument();
    });
  });

  it('opens analysis modal when View Details button is clicked', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText(/Failure Analysis:/)).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      const trendsTab = screen.getByRole('button', { name: /trends/i });
      fireEvent.click(trendsTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Common Failure Types')).toBeInTheDocument();
      expect(screen.getByText('Trending Issues')).toBeInTheDocument();
    });
  });

  it('handles time range selection', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(timeRangeSelect, { target: { value: '7d' } });
    });
    
    expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
  });

  it('calls onFixSuggestion when fix is applied', async () => {
    const mockOnFixSuggestion = jest.fn();
    render(<CIFailureAnalyzer onFixSuggestion={mockOnFixSuggestion} />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);
    });
    
    await waitFor(() => {
      const applyFixButton = screen.getByText('Apply Fix Suggestion');
      fireEvent.click(applyFixButton);
    });
    
    expect(mockOnFixSuggestion).toHaveBeenCalledWith(
      expect.stringContaining('Add null check')
    );
  });

  it('displays severity badges with correct styling', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      const severityBadges = badges.filter(badge => 
        badge.textContent?.includes('test') ||
        badge.textContent?.includes('build') ||
        badge.textContent?.includes('security')
      );
      
      expect(severityBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows external links for logs and pull requests', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      const viewLogsLinks = screen.getAllByText('View Logs');
      const viewPRLinks = screen.getAllByText('View PR');
      
      expect(viewLogsLinks.length).toBeGreaterThan(0);
      expect(viewPRLinks.length).toBeGreaterThan(0);
    });
  });

  it('handles pipeline health tab correctly', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      const healthTab = screen.getByRole('button', { name: /pipeline health/i });
      fireEvent.click(healthTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Pipeline Health Status')).toBeInTheDocument();
      expect(screen.getByText('test-backend')).toBeInTheDocument();
      expect(screen.getByText('build-frontend')).toBeInTheDocument();
    });
  });

  it('displays error analysis with confidence levels', async () => {
    render(<CIFailureAnalyzer />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);
    });
    
    await waitFor(() => {
      expect(screen.getByText('AI Analysis')).toBeInTheDocument();
      expect(screen.getByText(/85% confidence/)).toBeInTheDocument();
      expect(screen.getByText(/Null Pointer Exception/)).toBeInTheDocument();
    });
  });
});