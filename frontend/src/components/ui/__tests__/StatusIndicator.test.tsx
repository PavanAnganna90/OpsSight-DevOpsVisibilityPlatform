/**
 * StatusIndicator Component Tests
 * 
 * Comprehensive test suite covering:
 * - Component snapshots for different status types
 * - Accessibility testing
 * - Theme integration
 * - Size variants
 * - Animation states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '../StatusIndicator';

describe('StatusIndicator Component', () => {
  describe('Snapshots', () => {
    it('should match snapshot for success status', () => {
      const { container } = render(
        <StatusIndicator status="success" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for error status', () => {
      const { container } = render(
        <StatusIndicator status="error" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for warning status', () => {
      const { container } = render(
        <StatusIndicator status="warning" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for info status', () => {
      const { container } = render(
        <StatusIndicator status="info" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for neutral status', () => {
      const { container } = render(
        <StatusIndicator status="neutral" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with pulse animation', () => {
      const { container } = render(
        <StatusIndicator status="info" pulse />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with text label', () => {
      const { container } = render(
        <StatusIndicator status="success" label="Operation Complete" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with small size', () => {
      const { container } = render(
        <StatusIndicator status="success" size="sm" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with large size', () => {
      const { container } = render(
        <StatusIndicator status="error" size="lg" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with custom className', () => {
      const { container } = render(
        <StatusIndicator status="warning" className="custom-indicator" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(<StatusIndicator status="success" label="Success" />);
      
      const indicator = screen.getByText('Success');
      expect(indicator).toBeInTheDocument();
    });

    it('should support custom aria-label', () => {
      render(<StatusIndicator status="error" aria-label="Error occurred" />);
      
      const indicator = screen.getByLabelText('Error occurred');
      expect(indicator).toBeInTheDocument();
    });

    it('should indicate status semantically', () => {
      const { rerender } = render(<StatusIndicator status="success" />);
      let indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toBeInTheDocument();

      rerender(<StatusIndicator status="error" />);
      indicator = screen.getByRole('alert', { hidden: true });
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Status Variants', () => {
    it('should render different status types correctly', () => {
      const statuses = ['success', 'error', 'warning', 'info', 'neutral'] as const;
      
      statuses.forEach(status => {
        const { container } = render(<StatusIndicator status={status} />);
        const indicator = container.firstChild as HTMLElement;
        
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveClass('inline-flex');
      });
    });

    it('should apply correct color classes for each status', () => {
      const { rerender } = render(<StatusIndicator status="success" />);
      let indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toHaveClass('text-green-600');

      rerender(<StatusIndicator status="error" />);
      indicator = screen.getByRole('alert', { hidden: true });
      expect(indicator).toHaveClass('text-red-600');

      rerender(<StatusIndicator status="warning" />);
      indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toHaveClass('text-yellow-600');
    });
  });

  describe('Size Variants', () => {
    it('should apply correct size classes', () => {
      const { rerender } = render(<StatusIndicator status="success" size="sm" />);
      let indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toHaveClass('h-3', 'w-3');

      rerender(<StatusIndicator status="success" size="md" />);
      indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toHaveClass('h-4', 'w-4');

      rerender(<StatusIndicator status="success" size="lg" />);
      indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toHaveClass('h-5', 'w-5');
    });
  });

  describe('Animation States', () => {
    it('should show pulse animation when enabled', () => {
      render(<StatusIndicator status="info" pulse />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
    });

    it('should not show animation by default', () => {
      render(<StatusIndicator status="success" />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('should render label text when provided', () => {
      render(<StatusIndicator status="success" label="All systems operational" />);
      
      expect(screen.getByText('All systems operational')).toBeInTheDocument();
    });

    it('should render without label', () => {
      const { container } = render(<StatusIndicator status="success" />);
      
      expect(container.textContent).toBe('');
    });

    it('should render with custom aria-label', () => {
      render(<StatusIndicator status="info" ariaLabel="Custom status description" />);
      
      const indicator = screen.getByLabelText('Custom status description');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined status gracefully', () => {
      expect(() => {
        render(<StatusIndicator status={undefined as any} />);
      }).not.toThrow();
    });

    it('should merge custom classes correctly', () => {
      render(<StatusIndicator status="success" className="custom-class" />);
      
      const indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toHaveClass('custom-class');
      expect(indicator).toHaveClass('inline-flex'); // Should preserve base classes
    });

    it('should handle empty label gracefully', () => {
      render(<StatusIndicator status="success" label="" />);
      
      const indicator = screen.getByRole('status', { hidden: true });
      expect(indicator).toBeInTheDocument();
    });
  });
}); 