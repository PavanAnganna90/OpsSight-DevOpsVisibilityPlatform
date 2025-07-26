/**
 * Simple App component test to verify React setup
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple test component to verify React setup
const TestComponent = () => {
  return <div data-testid="test-component">Test Component Works</div>;
};

describe('Simple React Test', () => {
  it('should render a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Test Component Works')).toBeInTheDocument();
  });

  it('should handle basic props', () => {
    const TestWithProps = ({ title }: { title: string }) => (
      <div data-testid="test-with-props">{title}</div>
    );

    render(<TestWithProps title="Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});