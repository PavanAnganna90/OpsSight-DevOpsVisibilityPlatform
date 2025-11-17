'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LogEntry, LogQuery, LogSearchResult, LogInsight, SavedQuery } from '@/types/logs';
import { useToast } from '@/contexts/ToastContext';

export function useLogs() {
  const [searchResult, setSearchResult] = useState<LogSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<LogQuery>({
    query: '',
    filters: {
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        preset: '24h'
      },
      levels: ['debug', 'info', 'warn', 'error', 'fatal'],
      services: [],
      components: [],
      environments: [],
      regions: [],
      labels: {}
    },
    sorting: {
      field: 'timestamp',
      direction: 'desc'
    },
    pagination: {
      limit: 100,
      offset: 0
    },
    highlighting: {
      enabled: true,
      fields: ['message', 'stack']
    }
  });
  const [insights, setInsights] = useState<LogInsight[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [streaming, setStreaming] = useState(false);
  const { addToast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate mock log entries
  const generateMockLogs = useCallback((count: number = 100): LogEntry[] => {
    const services = ['api-gateway', 'user-service', 'order-service', 'payment-service', 'notification-service', 'analytics-service'];
    const components = ['controller', 'service', 'repository', 'middleware', 'validator'];
    const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const environments: LogEntry['metadata']['environment'][] = ['production', 'staging', 'development', 'testing'];
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];

    const messageTemplates = [
      'Request processed successfully',
      'Database connection established',
      'Cache miss for key: {key}',
      'Rate limit exceeded for user: {userId}',
      'Payment processed: ${amount}',
      'Authentication failed for user: {email}',
      'File upload completed: {filename}',
      'Background job started: {jobId}',
      'Email sent to: {recipient}',
      'Configuration updated: {config}',
      'Health check passed',
      'Memory usage: {memory}MB',
      'Database query executed in {duration}ms',
      'Invalid request parameters',
      'Service unavailable - circuit breaker open',
      'SSL certificate expires in {days} days',
      'Backup completed successfully',
      'Failed to connect to external service',
      'User session expired',
      'Validation error: {field} is required'
    ];

    const errorMessages = [
      'NullPointerException in UserController.getUserById',
      'Connection timeout to database after 30s',
      'OutOfMemoryError: Java heap space',
      'Failed to deserialize JSON payload',
      'Deadlock detected in transaction processing',
      'Redis connection pool exhausted',
      'Elasticsearch query timeout',
      'Failed to send notification: SMTP server unreachable',
      'JWT token validation failed',
      'Rate limiter service unavailable'
    ];

    return Array.from({ length: count }, (_, i) => {
      const service = services[Math.floor(Math.random() * services.length)];
      const component = components[Math.floor(Math.random() * components.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const environment = environments[Math.floor(Math.random() * environments.length)];
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      
      let message: string;
      if (level === 'error' || level === 'fatal') {
        message = errorMessages[Math.floor(Math.random() * errorMessages.length)];
      } else {
        message = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
      }

      // Replace placeholders
      message = message
        .replace('{key}', `cache_${Math.random().toString(36).substr(2, 9)}`)
        .replace('{userId}', `user_${Math.floor(Math.random() * 10000)}`)
        .replace('{email}', `user${Math.floor(Math.random() * 1000)}@example.com`)
        .replace('{amount}', (Math.random() * 1000 + 10).toFixed(2))
        .replace('{filename}', `document_${Math.random().toString(36).substr(2, 9)}.pdf`)
        .replace('{jobId}', `job_${Math.random().toString(36).substr(2, 9)}`)
        .replace('{recipient}', `user${Math.floor(Math.random() * 1000)}@example.com`)
        .replace('{config}', ['logging', 'cache', 'database', 'auth'][Math.floor(Math.random() * 4)])
        .replace('{memory}', Math.floor(Math.random() * 2048 + 512).toString())
        .replace('{duration}', Math.floor(Math.random() * 5000 + 10).toString())
        .replace('{days}', Math.floor(Math.random() * 30 + 1).toString())
        .replace('{field}', ['email', 'password', 'username', 'phone'][Math.floor(Math.random() * 4)]);

      const hasError = level === 'error' || level === 'fatal';
      const traceId = Math.random() > 0.7 ? `trace_${Math.random().toString(36).substr(2, 16)}` : undefined;

      return {
        id: `log_${i + 1}`,
        timestamp: timestamp.toISOString(),
        level,
        message,
        source: {
          service,
          component,
          instance: `${service}-${Math.floor(Math.random() * 5) + 1}`,
          pod: `${service}-${Math.random().toString(36).substr(2, 8)}`,
          node: `node-${Math.floor(Math.random() * 10) + 1}`,
          namespace: environment === 'production' ? 'prod' : environment
        },
        metadata: {
          traceId,
          spanId: traceId ? `span_${Math.random().toString(36).substr(2, 16)}` : undefined,
          userId: Math.random() > 0.6 ? `user_${Math.floor(Math.random() * 10000)}` : undefined,
          requestId: `req_${Math.random().toString(36).substr(2, 16)}`,
          sessionId: Math.random() > 0.8 ? `sess_${Math.random().toString(36).substr(2, 16)}` : undefined,
          environment,
          region: regions[Math.floor(Math.random() * regions.length)],
          version: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
        },
        labels: {
          team: ['platform', 'backend', 'frontend', 'data'][Math.floor(Math.random() * 4)],
          tier: ['critical', 'important', 'standard'][Math.floor(Math.random() * 3)]
        },
        fields: {
          duration: Math.random() > 0.5 ? Math.floor(Math.random() * 1000 + 10) : undefined,
          statusCode: Math.random() > 0.5 ? [200, 201, 400, 401, 403, 404, 500, 502, 503][Math.floor(Math.random() * 9)] : undefined,
          responseSize: Math.random() > 0.5 ? Math.floor(Math.random() * 10000 + 100) : undefined
        },
        stack: hasError && Math.random() > 0.5 ? `  at ${component}.method(${service}.java:${Math.floor(Math.random() * 200 + 1)})\n  at ${service}.Controller.handle(Controller.java:${Math.floor(Math.random() * 100 + 1)})\n  at org.springframework.web.method.support.InvocableHandlerMethod.invoke(InvocableHandlerMethod.java:${Math.floor(Math.random() * 50 + 200)})` : undefined,
        context: Math.random() > 0.8 ? {
          correlationId: `corr_${Math.random().toString(36).substr(2, 16)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        } : undefined
      };
    });
  }, []);

  // Generate mock insights
  const generateMockInsights = useCallback((): LogInsight[] => {
    return [
      {
        id: 'insight-1',
        type: 'anomaly',
        severity: 'high',
        title: 'Unusual error rate spike in payment-service',
        description: 'Error rate increased by 400% in the last hour, primarily NullPointerException errors',
        detection: {
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          confidence: 94,
          algorithm: 'statistical_anomaly_detection',
          parameters: { threshold: 3.5, window: '1h' }
        },
        data: {
          affectedServices: ['payment-service'],
          timeRange: {
            start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          metrics: {
            errorRate: 0.12,
            baselineErrorRate: 0.03,
            totalEvents: 1547,
            errorEvents: 186
          },
          samples: []
        },
        investigation: {
          status: 'investigating',
          assignee: 'platform-team@opssight.com',
          notes: 'Correlating with recent deployment at 14:30'
        },
        actions: [
          { type: 'alert', taken: true, timestamp: new Date().toISOString() },
          { type: 'escalate', taken: false }
        ]
      },
      {
        id: 'insight-2',
        type: 'pattern',
        severity: 'medium',
        title: 'Recurring timeout pattern in database connections',
        description: 'Database connection timeouts occurring every 15 minutes, likely related to connection pool configuration',
        detection: {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          confidence: 87,
          algorithm: 'pattern_detection',
          parameters: { pattern: 'periodic', interval: '15m' }
        },
        data: {
          affectedServices: ['user-service', 'order-service'],
          timeRange: {
            start: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          metrics: {
            occurrences: 16,
            intervalStdDev: 0.8,
            affectedRequests: 342
          },
          samples: []
        },
        investigation: {
          status: 'open'
        },
        actions: [
          { type: 'investigate', taken: false }
        ]
      }
    ];
  }, []);

  // Generate mock saved queries
  const generateMockSavedQueries = useCallback((): SavedQuery[] => {
    return [
      {
        id: 'query-1',
        name: 'Production Errors',
        description: 'All error and fatal logs from production environment',
        query: {
          ...query,
          query: 'level:(error OR fatal) AND environment:production',
          filters: {
            ...query.filters,
            levels: ['error', 'fatal'],
            environments: ['production']
          }
        },
        tags: ['production', 'errors', 'monitoring'],
        shared: true,
        createdBy: 'admin@opssight.com',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        usage: {
          lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          useCount: 45,
          popularity: 0.8
        }
      },
      {
        id: 'query-2',
        name: 'Payment Service Logs',
        description: 'All logs from payment-service with transaction context',
        query: {
          ...query,
          query: 'service:payment-service AND (transaction OR payment)',
          filters: {
            ...query.filters,
            services: ['payment-service']
          }
        },
        tags: ['payments', 'transactions', 'finance'],
        shared: false,
        createdBy: 'backend-team@opssight.com',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        usage: {
          lastUsed: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          useCount: 12,
          popularity: 0.3
        }
      }
    ];
  }, [query]);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: LogQuery) => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const logs = generateMockLogs(searchQuery.pagination.limit);
      
      // Apply filters
      let filteredLogs = logs.filter(log => {
        // Level filter
        if (!searchQuery.filters.levels.includes(log.level)) return false;
        
        // Service filter
        if (searchQuery.filters.services.length > 0 && !searchQuery.filters.services.includes(log.source.service)) return false;
        
        // Environment filter
        if (searchQuery.filters.environments.length > 0 && !searchQuery.filters.environments.includes(log.metadata.environment)) return false;
        
        // Text search
        if (searchQuery.query) {
          const searchText = searchQuery.query.toLowerCase();
          const searchIn = `${log.message} ${log.source.service} ${log.source.component || ''}`.toLowerCase();
          if (!searchIn.includes(searchText)) return false;
        }
        
        return true;
      });

      // Sort logs
      filteredLogs.sort((a, b) => {
        const direction = searchQuery.sorting.direction === 'asc' ? 1 : -1;
        switch (searchQuery.sorting.field) {
          case 'timestamp':
            return direction * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          case 'level':
            const levelOrder = { debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
            return direction * (levelOrder[a.level] - levelOrder[b.level]);
          case 'service':
            return direction * a.source.service.localeCompare(b.source.service);
          default:
            return 0;
        }
      });

      // Calculate aggregations
      const levelCounts = filteredLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<LogEntry['level'], number>);

      const serviceCounts = filteredLogs.reduce((acc, log) => {
        acc[log.source.service] = (acc[log.source.service] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Time distribution (hourly buckets for last 24h)
      const timeDistribution = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
        hour.setMinutes(0, 0, 0);
        
        const hourLogs = filteredLogs.filter(log => {
          const logHour = new Date(log.timestamp);
          logHour.setMinutes(0, 0, 0);
          return logHour.getTime() === hour.getTime();
        });

        const hourLevelCounts = hourLogs.reduce((acc, log) => {
          acc[log.level] = (acc[log.level] || 0) + 1;
          return acc;
        }, {} as Record<LogEntry['level'], number>);

        return {
          timestamp: hour.toISOString(),
          count: hourLogs.length,
          levels: hourLevelCounts
        };
      });

      // Top errors
      const errorLogs = filteredLogs.filter(log => log.level === 'error' || log.level === 'fatal');
      const errorGroups = errorLogs.reduce((acc, log) => {
        const key = log.message.split(':')[0]; // Group by error type
        if (!acc[key]) {
          acc[key] = {
            message: key,
            count: 0,
            services: new Set<string>(),
            lastSeen: log.timestamp
          };
        }
        acc[key].count++;
        acc[key].services.add(log.source.service);
        if (new Date(log.timestamp) > new Date(acc[key].lastSeen)) {
          acc[key].lastSeen = log.timestamp;
        }
        return acc;
      }, {} as Record<string, any>);

      const topErrors = Object.values(errorGroups)
        .map((group: any) => ({
          ...group,
          services: Array.from(group.services)
        }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10);

      const result: LogSearchResult = {
        entries: filteredLogs.slice(searchQuery.pagination.offset, searchQuery.pagination.offset + searchQuery.pagination.limit),
        total: filteredLogs.length,
        aggregations: {
          levelCounts,
          serviceCounts,
          timeDistribution,
          topErrors
        },
        executionTime: Math.random() * 500 + 100,
        queryHints: searchQuery.query ? [
          'Try using field:value syntax for more precise results',
          'Use quotes for exact phrase matching',
          'Add time filters to improve performance'
        ] : undefined
      };

      setSearchResult(result);
    } catch (err) {
      setError('Failed to search logs');
      console.error('Log search error:', err);
    } finally {
      setLoading(false);
    }
  }, [generateMockLogs]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [insightsData, queriesData] = await Promise.all([
          Promise.resolve(generateMockInsights()),
          Promise.resolve(generateMockSavedQueries())
        ]);
        
        setInsights(insightsData);
        setSavedQueries(queriesData);
        
        // Perform initial search
        await performSearch(query);
      } catch (err) {
        setError('Failed to load logs data');
      }
    };

    loadInitialData();
  }, [generateMockInsights, generateMockSavedQueries, performSearch, query]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Action functions
  const saveQuery = useCallback(async (name: string, description?: string) => {
    try {
      const newQuery: SavedQuery = {
        id: `query-${Date.now()}`,
        name,
        description,
        query: { ...query },
        tags: [],
        shared: false,
        createdBy: 'current-user@opssight.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usage: {
          useCount: 0,
          popularity: 0
        }
      };

      setSavedQueries(prev => [...prev, newQuery]);
      
      addToast({
        type: 'success',
        title: 'Query Saved',
        description: `Query "${name}" has been saved successfully`,
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not save query',
        duration: 5000
      });
    }
  }, [query, addToast]);

  const loadSavedQuery = useCallback((savedQuery: SavedQuery) => {
    setQuery(savedQuery.query);
    addToast({
      type: 'info',
      title: 'Query Loaded',
      description: `Loaded query "${savedQuery.name}"`,
      duration: 3000
    });
  }, [addToast]);

  const exportLogs = useCallback(async (format: 'json' | 'csv' | 'txt') => {
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addToast({
        type: 'success',
        title: 'Export Complete',
        description: `Logs exported as ${format.toUpperCase()} format`,
        duration: 5000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Could not export logs',
        duration: 5000
      });
    }
  }, [addToast]);

  const toggleStreaming = useCallback(() => {
    setStreaming(prev => !prev);
    addToast({
      type: 'info',
      title: streaming ? 'Streaming Stopped' : 'Streaming Started',
      description: streaming ? 'Real-time log streaming disabled' : 'Real-time log streaming enabled',
      duration: 3000
    });
  }, [streaming, addToast]);

  return {
    searchResult,
    loading,
    error,
    query,
    setQuery,
    insights,
    savedQueries,
    streaming,
    performSearch: () => performSearch(query),
    saveQuery,
    loadSavedQuery,
    exportLogs,
    toggleStreaming,
    clearSearch: () => {
      setQuery(prev => ({
        ...prev,
        query: '',
        filters: {
          ...prev.filters,
          services: [],
          components: [],
          environments: [],
          regions: [],
          labels: {}
        }
      }));
    }
  };
}