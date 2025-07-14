# OpsSight Coding Standards

This document defines the coding standards and best practices for the OpsSight project. These standards ensure code consistency, maintainability, and collaboration across the development team.

## Table of Contents

1. [General Principles](#general-principles)
2. [File Organization](#file-organization)
3. [Naming Conventions](#naming-conventions)
4. [TypeScript/JavaScript Standards](#typescriptjavascript-standards)
5. [Python Standards](#python-standards)
6. [React/React Native Standards](#reactreact-native-standards)
7. [Error Handling](#error-handling)
8. [Logging](#logging)
9. [Documentation](#documentation)
10. [Testing](#testing)
11. [Git Conventions](#git-conventions)
12. [Code Review Guidelines](#code-review-guidelines)

## General Principles

### 1. Code Clarity Over Cleverness
- Write code that is easy to read and understand
- Prefer explicit code over implicit magic
- Use descriptive variable and function names

### 2. Consistency
- Follow established patterns within the codebase
- Use the same approach for similar problems
- Maintain consistent formatting and style

### 3. Maintainability
- Write code that is easy to modify and extend
- Keep functions and classes focused on single responsibilities
- Minimize dependencies between modules

### 4. Performance Considerations
- Optimize for readability first, performance second
- Profile before optimizing
- Document performance-critical sections

## File Organization

### Directory Structure
```
project-root/
├── frontend/          # Next.js web application
├── mobile/           # React Native mobile app
├── backend/          # FastAPI backend services
├── shared/           # Shared utilities and types
├── ml/              # Machine learning models and services
├── infrastructure/   # Infrastructure as code
├── monitoring/       # Monitoring and observability
├── k8s/             # Kubernetes manifests
├── helm/            # Helm charts
├── tests/           # Integration and e2e tests
├── tools/           # Development tools and scripts
└── docs/            # Documentation
```

### File Naming
- Use kebab-case for files and directories: `user-dashboard.tsx`, `api-client.ts`
- Use PascalCase for React components: `UserDashboard.tsx`, `MetricCard.tsx`
- Use snake_case for Python files: `user_service.py`, `metric_collector.py`
- Prefix test files with the component name: `user-dashboard.test.tsx`

### Import Organization
```typescript
// 1. Node modules
import React from 'react';
import { NextPage } from 'next';

// 2. Internal modules (absolute imports)
import { ApiClient } from '@/lib/api-client';
import { UserService } from '@/services/user-service';

// 3. Relative imports
import { MetricCard } from './metric-card';
import { styles } from './dashboard.styles';
```

## Naming Conventions

### Variables and Functions
- Use camelCase for variables and functions
- Use descriptive names that explain intent
- Avoid abbreviations unless they're widely understood

```typescript
// ✅ Good
const userMetrics = await fetchUserMetrics(userId);
const isAuthenticated = checkUserAuthentication();

// ❌ Bad
const um = await fetchUM(uid);
const auth = checkAuth();
```

### Constants
- Use SCREAMING_SNAKE_CASE for constants
- Group related constants in enums or const objects

```typescript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3;
const API_ENDPOINTS = {
  USERS: '/api/users',
  METRICS: '/api/metrics',
} as const;

// ✅ Good - Enum
enum MetricType {
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
}
```

### Classes and Interfaces
- Use PascalCase for classes and interfaces
- Prefix interfaces with 'I' only when needed for disambiguation
- Use descriptive names that indicate purpose

```typescript
// ✅ Good
class UserService {
  // ...
}

interface MetricData {
  timestamp: number;
  value: number;
  tags: Record<string, string>;
}

// ✅ Good - When disambiguation is needed
interface IUserRepository {
  // ...
}

class UserRepository implements IUserRepository {
  // ...
}
```

## TypeScript/JavaScript Standards

### Type Definitions
- Always use TypeScript for new code
- Define explicit types for function parameters and return values
- Use union types instead of any when possible

```typescript
// ✅ Good
interface MetricQueryParams {
  startTime: Date;
  endTime: Date;
  metricTypes: MetricType[];
  aggregation?: 'avg' | 'sum' | 'max' | 'min';
}

async function queryMetrics(params: MetricQueryParams): Promise<MetricData[]> {
  // Implementation
}

// ❌ Bad
async function queryMetrics(params: any): Promise<any> {
  // Implementation
}
```

### Function Declarations
- Prefer function declarations for top-level functions
- Use arrow functions for callbacks and inline functions
- Keep functions focused on a single responsibility

```typescript
// ✅ Good - Top-level function
function calculateMetricAverage(metrics: MetricData[]): number {
  return metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
}

// ✅ Good - Arrow function for callbacks
const processedMetrics = rawMetrics.map(metric => ({
  ...metric,
  normalizedValue: normalizeValue(metric.value),
}));

// ✅ Good - Async/await over promises
async function fetchUserData(userId: string): Promise<UserData> {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw new UserFetchError(`Failed to fetch user ${userId}`, error);
  }
}
```

### Object and Array Handling
- Use destructuring for object and array access
- Prefer immutable operations
- Use optional chaining and nullish coalescing

```typescript
// ✅ Good
const { name, email, preferences = {} } = user;
const [firstMetric, ...remainingMetrics] = metrics;

// ✅ Good - Immutable operations
const updatedUser = {
  ...user,
  lastLoginAt: new Date(),
  preferences: {
    ...user.preferences,
    theme: 'dark',
  },
};

// ✅ Good - Optional chaining
const userTheme = user?.preferences?.theme ?? 'light';
```

## Python Standards

### Code Style
- Follow PEP 8 guidelines
- Use Black for code formatting
- Use isort for import organization
- Maximum line length: 88 characters (Black default)

### Type Hints
- Use type hints for all function parameters and return values
- Import types from typing module when needed

```python
# ✅ Good
from typing import List, Dict, Optional, Union
from datetime import datetime

def process_metrics(
    metrics: List[Dict[str, Union[str, float]]], 
    aggregation_type: str = "avg"
) -> Dict[str, float]:
    """Process metrics data and return aggregated results."""
    # Implementation
    pass

def get_user_by_id(user_id: str) -> Optional[User]:
    """Retrieve user by ID, return None if not found."""
    # Implementation
    pass
```

### Class Definitions
- Use dataclasses for simple data containers
- Follow single responsibility principle
- Use descriptive docstrings

```python
# ✅ Good
from dataclasses import dataclass
from typing import Optional

@dataclass
class MetricDataPoint:
    """Represents a single metric data point."""
    timestamp: datetime
    value: float
    tags: Dict[str, str]
    unit: str = "count"

class MetricProcessor:
    """Processes and aggregates metric data."""
    
    def __init__(self, config: ProcessorConfig) -> None:
        """Initialize processor with configuration."""
        self.config = config
        self._cache: Dict[str, Any] = {}
    
    def process_batch(self, metrics: List[MetricDataPoint]) -> ProcessedMetrics:
        """Process a batch of metrics and return aggregated results."""
        # Implementation
        pass
```

## React/React Native Standards

### Component Structure
- Prefer functional components with hooks
- Use TypeScript for all components
- Export components as named exports

```typescript
// ✅ Good
import React, { useState, useEffect, useCallback } from 'react';
import { MetricData } from '@/types/metrics';

interface MetricCardProps {
  metric: MetricData;
  onSelect?: (metric: MetricData) => void;
  className?: string;
}

export function MetricCard({ metric, onSelect, className }: MetricCardProps) {
  const [isSelected, setIsSelected] = useState(false);
  
  const handleClick = useCallback(() => {
    setIsSelected(!isSelected);
    onSelect?.(metric);
  }, [isSelected, metric, onSelect]);
  
  useEffect(() => {
    // Effect logic
  }, []);
  
  return (
    <div className={`metric-card ${className}`} onClick={handleClick}>
      {/* Component content */}
    </div>
  );
}
```

### Custom Hooks
- Extract reusable logic into custom hooks
- Use descriptive names starting with 'use'
- Return objects for multiple values

```typescript
// ✅ Good
interface UseMetricsReturn {
  metrics: MetricData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMetrics(query: MetricQuery): UseMetricsReturn {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchMetrics(query);
      setMetrics(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [query]);
  
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  return { metrics, isLoading, error, refetch };
}
```

## Error Handling

### TypeScript/JavaScript
- Use custom error classes for different error types
- Include context information in error messages
- Handle errors at appropriate levels

```typescript
// ✅ Good - Custom error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Good - Error handling
async function fetchUserMetrics(userId: string): Promise<MetricData[]> {
  try {
    const response = await fetch(`/api/users/${userId}/metrics`);
    
    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch metrics for user ${userId}`,
        response.status,
        `/api/users/${userId}/metrics`
      );
    }
    
    const data = await response.json();
    return validateMetricData(data);
  } catch (error) {
    if (error instanceof ApiError) {
      // Log API errors with context
      logger.error('API request failed', {
        endpoint: error.endpoint,
        status: error.status,
        userId,
      });
    }
    throw error;
  }
}
```

### Python
- Use specific exception types
- Include context in exception messages
- Use proper exception chaining

```python
# ✅ Good - Custom exceptions
class MetricProcessingError(Exception):
    """Raised when metric processing fails."""
    
    def __init__(self, message: str, metric_id: str, original_error: Exception = None):
        super().__init__(message)
        self.metric_id = metric_id
        self.original_error = original_error

# ✅ Good - Error handling
async def process_metric_batch(metrics: List[RawMetric]) -> List[ProcessedMetric]:
    """Process a batch of metrics with proper error handling."""
    processed_metrics = []
    
    for metric in metrics:
        try:
            processed = await process_single_metric(metric)
            processed_metrics.append(processed)
        except ValidationError as e:
            logger.warning(f"Skipping invalid metric {metric.id}: {e}")
            continue
        except Exception as e:
            raise MetricProcessingError(
                f"Failed to process metric {metric.id}",
                metric.id,
                e
            ) from e
    
    return processed_metrics
```

## Logging

### Structured Logging
- Use structured logging with consistent fields
- Include correlation IDs for request tracing
- Use appropriate log levels

```typescript
// ✅ Good - TypeScript/JavaScript
import { logger } from '@/lib/logger';

async function processUserRequest(userId: string, requestId: string) {
  logger.info('Processing user request', {
    userId,
    requestId,
    timestamp: new Date().toISOString(),
  });
  
  try {
    const result = await performOperation(userId);
    
    logger.info('User request completed successfully', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });
    
    return result;
  } catch (error) {
    logger.error('User request failed', {
      userId,
      requestId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
```

```python
# ✅ Good - Python
import logging
import structlog

logger = structlog.get_logger()

async def process_metrics(user_id: str, request_id: str) -> ProcessedMetrics:
    """Process metrics with structured logging."""
    logger.info(
        "Starting metric processing",
        user_id=user_id,
        request_id=request_id,
    )
    
    try:
        result = await perform_processing(user_id)
        
        logger.info(
            "Metric processing completed",
            user_id=user_id,
            request_id=request_id,
            metrics_count=len(result.metrics),
        )
        
        return result
    except Exception as e:
        logger.error(
            "Metric processing failed",
            user_id=user_id,
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise
```

## Documentation

### Code Documentation
- Write clear docstrings for all public functions and classes
- Include parameter and return type information
- Provide usage examples for complex functions

```typescript
/**
 * Calculates the moving average of metric values over a specified window.
 * 
 * @param metrics - Array of metric data points, must be sorted by timestamp
 * @param windowSize - Size of the moving average window (number of data points)
 * @returns Array of moving average values
 * 
 * @example
 * ```typescript
 * const metrics = [
 *   { timestamp: 1000, value: 10 },
 *   { timestamp: 2000, value: 20 },
 *   { timestamp: 3000, value: 30 },
 * ];
 * const movingAvg = calculateMovingAverage(metrics, 2);
 * // Returns: [10, 15, 25]
 * ```
 */
export function calculateMovingAverage(
  metrics: MetricData[], 
  windowSize: number
): number[] {
  // Implementation
}
```

```python
def aggregate_metrics(
    metrics: List[MetricDataPoint], 
    aggregation_type: str = "avg",
    time_bucket: timedelta = timedelta(minutes=5)
) -> Dict[datetime, float]:
    """
    Aggregate metrics into time buckets using the specified aggregation type.
    
    Args:
        metrics: List of metric data points to aggregate
        aggregation_type: Type of aggregation ("avg", "sum", "max", "min")
        time_bucket: Time bucket size for aggregation
        
    Returns:
        Dictionary mapping bucket timestamps to aggregated values
        
    Raises:
        ValueError: If aggregation_type is not supported
        
    Example:
        >>> metrics = [
        ...     MetricDataPoint(datetime(2023, 1, 1, 10, 0), 10.0, {}),
        ...     MetricDataPoint(datetime(2023, 1, 1, 10, 2), 20.0, {}),
        ... ]
        >>> result = aggregate_metrics(metrics, "avg", timedelta(minutes=5))
        >>> # Returns: {datetime(2023, 1, 1, 10, 0): 15.0}
    """
    # Implementation
```

### API Documentation
- Document all API endpoints with OpenAPI/Swagger
- Include request/response examples
- Document error responses and status codes

## Testing

### Test Organization
- Mirror the source code structure in test directories
- Use descriptive test names that explain the scenario
- Group related tests using describe blocks

```typescript
// ✅ Good - Test structure
describe('MetricProcessor', () => {
  describe('processMetrics', () => {
    it('should calculate average when aggregation type is avg', async () => {
      // Test implementation
    });
    
    it('should throw ValidationError when metrics array is empty', async () => {
      // Test implementation
    });
    
    it('should handle network errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

### Test Patterns
- Use the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both happy path and error scenarios

```typescript
// ✅ Good - Test implementation
describe('fetchUserMetrics', () => {
  it('should return user metrics when API call succeeds', async () => {
    // Arrange
    const userId = 'user-123';
    const expectedMetrics = [
      { id: 'metric-1', value: 100, timestamp: new Date() },
    ];
    
    vi.mocked(apiClient.get).mockResolvedValue({
      data: expectedMetrics,
    });
    
    // Act
    const result = await fetchUserMetrics(userId);
    
    // Assert
    expect(result).toEqual(expectedMetrics);
    expect(apiClient.get).toHaveBeenCalledWith(`/users/${userId}/metrics`);
  });
  
  it('should throw ApiError when API call fails', async () => {
    // Arrange
    const userId = 'user-123';
    const apiError = new Error('Network error');
    
    vi.mocked(apiClient.get).mockRejectedValue(apiError);
    
    // Act & Assert
    await expect(fetchUserMetrics(userId)).rejects.toThrow(ApiError);
  });
});
```

## Git Conventions

### Commit Messages
- Use conventional commit format
- Keep subject line under 50 characters
- Include detailed description for complex changes

```bash
# ✅ Good commit messages
feat(dashboard): add real-time metric updates
fix(api): handle timeout errors in metric service
docs(readme): update installation instructions
refactor(auth): extract token validation logic
test(metrics): add unit tests for aggregation functions

# ✅ Good commit with description
feat(monitoring): implement custom metric collection

- Add support for custom metric definitions
- Implement metric validation and sanitization
- Add configuration for metric retention policies
- Update API documentation with new endpoints

Closes #123
```

### Branch Naming
- Use descriptive branch names with prefixes
- Include ticket numbers when applicable

```bash
# ✅ Good branch names
feature/metric-dashboard-redesign
bugfix/api-timeout-handling
hotfix/critical-memory-leak
chore/update-dependencies
docs/api-documentation-update
```

## Code Review Guidelines

### Review Checklist
- [ ] Code follows established patterns and conventions
- [ ] Functions have appropriate tests
- [ ] Error handling is implemented correctly
- [ ] Performance implications are considered
- [ ] Security best practices are followed
- [ ] Documentation is updated where necessary

### Review Comments
- Be constructive and specific in feedback
- Suggest alternatives when pointing out issues
- Acknowledge good practices and improvements

```markdown
# ✅ Good review comments
"Consider extracting this logic into a separate function for better reusability."

"This error handling looks good. Have you considered logging the error context for debugging?"

"Nice use of TypeScript here! This will help catch errors at compile time."

# ❌ Bad review comments
"This is wrong."
"Fix this."
"Bad code."
```

## Tools and Automation

### Code Quality Tools
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Black**: Python code formatting
- **isort**: Python import sorting
- **mypy**: Python static type checking

### Pre-commit Hooks
- Run linting and formatting checks
- Execute tests for changed files
- Validate commit message format

### CI/CD Pipeline
- Automated testing on all pull requests
- Code quality checks and coverage reports
- Automated dependency vulnerability scanning

---

## Conclusion

These coding standards are living guidelines that should evolve with the project and team. Regular reviews and updates ensure they remain relevant and helpful for maintaining code quality and team productivity.

For questions or suggestions about these standards, please open an issue or discuss in team meetings. 