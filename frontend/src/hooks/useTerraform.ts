/**
 * Custom React hook for Terraform API integration.
 * Provides simplified access to log parsing, risk assessment, and infrastructure changes.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ParsedLogData,
  ParseLogRequest,
  RiskAssessmentRequest,
  InfrastructureChange,
  InfrastructureChangeListParams,
  InfrastructureChangeListResponse,
  TerraformSupportInfo
} from '../types/terraform';

// API base URL
const API_BASE = '/api/v1/terraform';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper function to handle API errors
const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `API Error: ${response.status} ${response.statusText}`;
  
  try {
    const errorData = await response.json();
    if (errorData.detail) {
      errorMessage = errorData.detail;
    }
  } catch {
    // Use default error message if JSON parsing fails
  }
  
  throw new Error(errorMessage);
};

// Parse log hook
export const useParseLog = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ParsedLogData | null>(null);

  const parseLog = useCallback(async (request: ParseLogRequest): Promise<ParsedLogData> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/parse-log`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse log';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const parseLogFile = useCallback(async (
    file: File, 
    projectId?: number, 
    environment?: string, 
    logFormat?: string
  ): Promise<ParsedLogData> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) formData.append('project_id', projectId.toString());
      if (environment) formData.append('environment', environment);
      if (logFormat) formData.append('log_format', logFormat);

      const response = await fetch(`${API_BASE}/parse-log-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse log file';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    data,
    parseLog,
    parseLogFile,
    clearData
  };
};

// Risk assessment hook
export const useRiskAssessment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assessRisk = useCallback(async (request: RiskAssessmentRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/assess-risk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assess risk';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    assessRisk
  };
};

// Infrastructure changes hook
export const useInfrastructureChanges = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<InfrastructureChange[]>([]);
  const [total, setTotal] = useState(0);

  const fetchChanges = useCallback(async (params: InfrastructureChangeListParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (params.project_id) queryParams.append('project_id', params.project_id.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.environment) queryParams.append('environment', params.environment);
      if (params.change_type) queryParams.append('change_type', params.change_type);
      if (params.skip) queryParams.append('skip', params.skip.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/infrastructure-changes?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const result: InfrastructureChangeListResponse = await response.json();
      setChanges(result.changes);
      setTotal(result.total);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch infrastructure changes';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChange = useCallback(async (changeId: number, includeLogs = false): Promise<InfrastructureChange> => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (includeLogs) queryParams.append('include_logs', 'true');

      const response = await fetch(`${API_BASE}/infrastructure-changes/${changeId}?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch infrastructure change';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveChange = useCallback(async (changeId: number, approvalNote?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/infrastructure-changes/${changeId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ approval_note: approvalNote }),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      // Refresh the changes list after approval
      await fetchChanges();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve infrastructure change';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchChanges]);

  return {
    loading,
    error,
    changes,
    total,
    fetchChanges,
    fetchChange,
    approveChange
  };
};

// Terraform support info hook
export const useTerraformSupport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportInfo, setSupportInfo] = useState<TerraformSupportInfo | null>(null);

  const fetchSupportInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/status`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const result = await response.json();
      setSupportInfo(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch support info';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRiskLevels = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/risk-levels`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch risk levels';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSupportedResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/supported-resources`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch supported resources';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch support info on mount
  useEffect(() => {
    fetchSupportInfo();
  }, [fetchSupportInfo]);

  return {
    loading,
    error,
    supportInfo,
    fetchSupportInfo,
    fetchRiskLevels,
    fetchSupportedResources
  };
};

// Combined hook for comprehensive Terraform functionality
export const useTerraform = () => {
  const parseLog = useParseLog();
  const riskAssessment = useRiskAssessment();
  const infrastructureChanges = useInfrastructureChanges();
  const support = useTerraformSupport();

  return {
    parseLog,
    riskAssessment,
    infrastructureChanges,
    support
  };
}; 