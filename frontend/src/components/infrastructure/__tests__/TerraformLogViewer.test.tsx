/**
 * Tests for TerraformLogViewer Component
 * 
 * Comprehensive test suite covering component functionality, filtering,
 * error states, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerraformLogViewer } from '../TerraformLogViewer';
import {
  ParsedLogData,
  ResourceChange,
  RiskAssessment,
  TerraformViewerFilters
} from '../../../types/terraform';

// Mock the UI components
jest.mock('../../ui', () => ({
  StatusIndicator: ({ status, label }: { status: string; label: string }) => (
    <div data-testid="status-indicator" data-status={status}>
      {label}
    </div>
  ),
  MetricCard: ({ title, value, status }: { title: string; value: string; status: string }) => (
    <div data-testid="metric-card" data-status={status}>
      <div data-testid="metric-title">{title}</div>
      <div data-testid="metric-value">{value}</div>
    </div>
  ),
  MetricCardGrid: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="metric-grid">{children}</div>
  ),
  LoadingSkeleton: ({ variant }: { variant: string }) => (
    <div data-testid="loading-skeleton" data-variant={variant}>Loading...</div>
  ),
  Button: ({ children, onClick, variant, size }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

// Sample test data
const mockResourceChange: ResourceChange = {
  address: 'aws_instance.web_server',
  resource_type: 'aws_instance',
  resource_name: 'web_server',
  action: 'create',
  risk_level: 'MEDIUM',
  change_summary: 'Creating new EC2 instance',
  requires_replacement: false,
  before: undefined,
  after: {
    instance_type: 't3.micro',
    ami: 'ami-12345678',
    tags: {
      Name: 'web-server',
      Environment: 'production'
    }
  },
  provider_name: 'aws',
  sensitive_attributes: []
};

const mockRiskAssessment: RiskAssessment = {
  overall_risk: 'MEDIUM',
  risk_score: 0.6,
  impact_scope: 'service',
  compliance_impact: 'low',
  requires_approval: true,
  recommended_approvers: ['devops-team'],
  mitigation_recommendations: [
    'Review instance configuration',
    'Ensure proper security groups',
    'Validate backup strategies'
  ],
  testing_strategy: [
    'Deploy to staging first',
    'Run integration tests',
    'Monitor resource utilization'
  ],
  rollback_plan: 'Terminate instance and restore from backup',
  estimated_downtime: '5 minutes',
  business_impact: 'Low - affects staging environment only'
};

const mockParsedLogData: ParsedLogData = {
  success: true,
  format: 'json',
  terraform_version: '1.5.0',
  resource_changes: [mockResourceChange],
  modules: {},
  summary: {
    total_changes: 1,
    resources_to_add: 1,
    resources_to_change: 0,
    resources_to_destroy: 0
  },
  risk_assessment: mockRiskAssessment,
  metadata: {
    parsing_time_ms: 150,
    detected_format: 'json',
    has_sensitive_data: false,
    warnings: []
  }
};

describe('TerraformLogViewer', () => {
  const defaultProps = {
    logData: mockParsedLogData,
    loading: false,
    error: undefined,
    filters: {},
    config: {},
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('displays loading skeleton when loading is true', () => {
      render(<TerraformLogViewer {...defaultProps} loading={true} logData={undefined} />);
      
      expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(3);
      expect(screen.getByTestId('loading-skeleton')).toHaveAttribute('data-variant', 'metric');
    });

    it('displays loading skeleton for summary stats when loading', () => {
      render(<TerraformLogViewer {...defaultProps} loading={true} />);
      
      const metricSkeletons = screen.getAllByTestId('loading-skeleton').filter(
        el => el.getAttribute('data-variant') === 'metric'
      );
      expect(metricSkeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error States', () => {
    it('displays error message when error prop is provided', () => {
      const errorMessage = 'Failed to parse Terraform logs';
      render(<TerraformLogViewer {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText('Error Loading Terraform Data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('shows retry button when onRefresh is provided with error', () => {
      const mockOnRefresh = jest.fn();
      render(
        <TerraformLogViewer 
          {...defaultProps} 
          error="Test error" 
          onRefresh={mockOnRefresh} 
        />
      );
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Data State', () => {
    it('displays no data message when logData is null', () => {
      render(<TerraformLogViewer {...defaultProps} logData={undefined} />);
      
      expect(screen.getByText('No Terraform Data')).toBeInTheDocument();
      expect(screen.getByText('Upload or paste Terraform logs to view parsed results.')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('displays Terraform version and format info', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      expect(screen.getByText('Terraform Log Analysis')).toBeInTheDocument();
      expect(screen.getByText('Terraform v1.5.0 • json format')).toBeInTheDocument();
    });

    it('displays summary statistics', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      expect(screen.getByTestId('metric-grid')).toBeInTheDocument();
      expect(screen.getByText('Total Changes')).toBeInTheDocument();
      expect(screen.getByText('High Risk Changes')).toBeInTheDocument();
      expect(screen.getByText('Requires Approval')).toBeInTheDocument();
    });

    it('displays risk assessment information', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM RISK')).toBeInTheDocument();
      expect(screen.getByText('60.0%')).toBeInTheDocument(); // Risk score
      expect(screen.getByText('service')).toBeInTheDocument(); // Impact scope
    });

    it('displays mitigation recommendations', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Review instance configuration')).toBeInTheDocument();
      expect(screen.getByText('Ensure proper security groups')).toBeInTheDocument();
      expect(screen.getByText('Validate backup strategies')).toBeInTheDocument();
    });

    it('displays resource changes list', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      expect(screen.getByText('Resource Changes (1)')).toBeInTheDocument();
      expect(screen.getByText('aws_instance.web_server')).toBeInTheDocument();
      expect(screen.getByText('aws_instance • create')).toBeInTheDocument();
    });
  });

  describe('Resource Change Interactions', () => {
    it('expands resource details when clicked', async () => {
      const user = userEvent.setup();
      render(<TerraformLogViewer {...defaultProps} />);
      
      const resourceHeader = screen.getByText('aws_instance.web_server').closest('div');
      expect(resourceHeader).toBeInTheDocument();
      
      // Click to expand
      await user.click(resourceHeader!);
      
      // Should show expanded content
      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument();
        expect(screen.getByText('Creating new EC2 instance')).toBeInTheDocument();
      });
    });

    it('calls onResourceSelect when View Details is clicked', async () => {
      const user = userEvent.setup();
      const mockOnResourceSelect = jest.fn();
      render(
        <TerraformLogViewer 
          {...defaultProps} 
          onResourceSelect={mockOnResourceSelect} 
        />
      );
      
      // First expand the resource
      const resourceHeader = screen.getByText('aws_instance.web_server').closest('div');
      await user.click(resourceHeader!);
      
      // Wait for expansion and click View Details
      await waitFor(() => {
        const viewDetailsButton = screen.getByText('View Details');
        expect(viewDetailsButton).toBeInTheDocument();
        return user.click(viewDetailsButton);
      });
      
      expect(mockOnResourceSelect).toHaveBeenCalledWith(mockResourceChange);
    });

    it('displays before and after values when expanded', async () => {
      const user = userEvent.setup();
      render(<TerraformLogViewer {...defaultProps} />);
      
      const resourceHeader = screen.getByText('aws_instance.web_server').closest('div');
      await user.click(resourceHeader!);
      
      await waitFor(() => {
        expect(screen.getByText('After')).toBeInTheDocument();
        // Should show JSON content
        expect(screen.getByText(/"instance_type": "t3.micro"/)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('displays filter controls when enableFiltering is not disabled', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      expect(screen.getByText('Filter Resources')).toBeInTheDocument();
      expect(screen.getByText('Risk Level')).toBeInTheDocument();
      expect(screen.getByText('Resource Type')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('hides filter controls when enableFiltering is false', () => {
      render(
        <TerraformLogViewer 
          {...defaultProps} 
          config={{ enableFiltering: false }} 
        />
      );
      
      expect(screen.queryByText('Filter Resources')).not.toBeInTheDocument();
    });

    it('calls onFiltersChange when filter is modified', async () => {
      const user = userEvent.setup();
      const mockOnFiltersChange = jest.fn();
      render(
        <TerraformLogViewer 
          {...defaultProps} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );
      
      const riskLevelSelect = screen.getByDisplayValue('All Risk Levels');
      await user.selectOptions(riskLevelSelect, 'HIGH');
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'HIGH'
        })
      );
    });

    it('filters resources by risk level', () => {
      const filters: TerraformViewerFilters = {
        riskLevel: 'HIGH'
      };
      
      render(<TerraformLogViewer {...defaultProps} filters={filters} />);
      
      // Should show no resources since our mock data has MEDIUM risk
      expect(screen.getByText('Resource Changes (0)')).toBeInTheDocument();
      expect(screen.getByText('No resources match the current filters.')).toBeInTheDocument();
    });

    it('shows sensitive data toggle', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      const sensitiveToggle = screen.getByLabelText('Show sensitive data');
      expect(sensitiveToggle).toBeInTheDocument();
      expect(sensitiveToggle).not.toBeChecked();
    });
  });

  describe('Refresh Functionality', () => {
    it('displays refresh button when onRefresh is provided', () => {
      const mockOnRefresh = jest.fn();
      render(<TerraformLogViewer {...defaultProps} onRefresh={mockOnRefresh} />);
      
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
      
      fireEvent.click(refreshButton);
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not display refresh button when onRefresh is not provided', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(<TerraformLogViewer {...defaultProps} />);
      
      // Check filter labels
      expect(screen.getByLabelText('Risk Level')).toBeInTheDocument();
      expect(screen.getByLabelText('Resource Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Action')).toBeInTheDocument();
      expect(screen.getByLabelText('Show sensitive data')).toBeInTheDocument();
    });

    it('maintains focus management for expandable sections', async () => {
      const user = userEvent.setup();
      render(<TerraformLogViewer {...defaultProps} />);
      
      const resourceHeader = screen.getByText('aws_instance.web_server').closest('div');
      
      // Should be clickable and maintain focus
      await user.click(resourceHeader!);
      expect(resourceHeader).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty resource changes array', () => {
      const emptyLogData: ParsedLogData = {
        ...mockParsedLogData,
        resource_changes: [],
        summary: {
          total_changes: 0,
          resources_to_add: 0,
          resources_to_change: 0,
          resources_to_destroy: 0
        }
      };
      
      render(<TerraformLogViewer {...defaultProps} logData={emptyLogData} />);
      
      expect(screen.getByText('Resource Changes (0)')).toBeInTheDocument();
      expect(screen.getByText('No resources match the current filters.')).toBeInTheDocument();
    });

    it('handles missing risk assessment data', () => {
      const noRiskData: ParsedLogData = {
        ...mockParsedLogData,
        risk_assessment: {
          ...mockRiskAssessment,
          mitigation_recommendations: []
        }
      };
      
      render(<TerraformLogViewer {...defaultProps} logData={noRiskData} />);
      
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.queryByText('Recommendations')).not.toBeInTheDocument();
    });

    it('handles sensitive data masking', async () => {
      const user = userEvent.setup();
      const sensitiveResource: ResourceChange = {
        ...mockResourceChange,
        sensitive_attributes: ['password', 'secret_key'],
        after: {
          username: 'admin',
          password: 'secret123',
          secret_key: 'abc123'
        }
      };
      
      const sensitiveLogData: ParsedLogData = {
        ...mockParsedLogData,
        resource_changes: [sensitiveResource]
      };
      
      render(<TerraformLogViewer {...defaultProps} logData={sensitiveLogData} />);
      
      // Expand resource
      const resourceHeader = screen.getByText('aws_instance.web_server').closest('div');
      await user.click(resourceHeader!);
      
      await waitFor(() => {
        // Should show masked data by default
        expect(screen.getByText('********')).toBeInTheDocument();
        expect(screen.queryByText('secret123')).not.toBeInTheDocument();
      });
      
      // Enable sensitive data display
      const sensitiveToggle = screen.getByLabelText('Show sensitive data');
      await user.click(sensitiveToggle);
      
      await waitFor(() => {
        // Should now show actual data
        expect(screen.getByText(/"password": "secret123"/)).toBeInTheDocument();
      });
    });
  });
}); 