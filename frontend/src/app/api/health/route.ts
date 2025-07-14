import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database?: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    cache?: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    external_apis?: {
      status: 'up' | 'down';
      services: Record<string, 'up' | 'down'>;
    };
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  metadata: {
    node_env: string;
    build_time?: string;
    commit_hash?: string;
    deployment_id?: string;
  };
}

/**
 * Health check endpoint for monitoring and load balancer health checks.
 * 
 * Returns:
 * - 200: All systems operational
 * - 207: Some systems degraded but still functional
 * - 503: Critical systems down
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || 'production',
      checks: {},
      metadata: {
        node_env: process.env.NODE_ENV || 'production',
        build_time: process.env.BUILD_TIME,
        commit_hash: process.env.COMMIT_HASH,
        deployment_id: process.env.DEPLOYMENT_ID,
      },
    };

    // Memory check
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      const totalMemory = memory.heapTotal + memory.external;
      const usedMemory = memory.heapUsed;
      
      health.checks.memory = {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((usedMemory / totalMemory) * 100),
      };
      
      // Mark as degraded if memory usage is high
      if (health.checks.memory.percentage > 90) {
        health.status = 'degraded';
      }
    }

    // Database connectivity check (if database is configured)
    if (process.env.DATABASE_URL) {
      try {
        const dbStart = Date.now();
        // Simulate database check - replace with actual database ping
        await new Promise(resolve => setTimeout(resolve, 1));
        const dbLatency = Date.now() - dbStart;
        
        health.checks.database = {
          status: 'up',
          latency: dbLatency,
        };
      } catch (error) {
        health.checks.database = {
          status: 'down',
          error: error instanceof Error ? error.message : 'Database connection failed',
        };
        health.status = 'unhealthy';
      }
    }

    // Cache connectivity check (if Redis is configured)
    if (process.env.REDIS_URL) {
      try {
        const cacheStart = Date.now();
        // Simulate cache check - replace with actual Redis ping
        await new Promise(resolve => setTimeout(resolve, 1));
        const cacheLatency = Date.now() - cacheStart;
        
        health.checks.cache = {
          status: 'up',
          latency: cacheLatency,
        };
      } catch (error) {
        health.checks.cache = {
          status: 'down',
          error: error instanceof Error ? error.message : 'Cache connection failed',
        };
        // Cache failure is degraded, not unhealthy
        if (health.status === 'healthy') {
          health.status = 'degraded';
        }
      }
    }

    // External API checks (if configured)
    const externalApis = [
      { name: 'grafana', url: process.env.GRAFANA_API_URL },
      { name: 'prometheus', url: process.env.PROMETHEUS_URL },
    ].filter(api => api.url);

    if (externalApis.length > 0) {
      health.checks.external_apis = {
        status: 'up',
        services: {},
      };

      for (const api of externalApis) {
        try {
          // Simulate external API check - replace with actual API ping
          await new Promise(resolve => setTimeout(resolve, 1));
          health.checks.external_apis.services[api.name] = 'up';
        } catch {
          health.checks.external_apis.services[api.name] = 'down';
          health.checks.external_apis.status = 'down';
          // External API failure is degraded, not unhealthy
          if (health.status === 'healthy') {
            health.status = 'degraded';
          }
        }
      }
    }

    // Determine response status code
    let statusCode = 200;
    if (health.status === 'degraded') {
      statusCode = 207; // Multi-Status
    } else if (health.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    // Add response time
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        ...health,
        response_time_ms: responseTime,
      },
      { 
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    // Critical error in health check itself
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
        uptime: process.uptime(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NEXT_PUBLIC_APP_ENV || 'production',
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

/**
 * Simple health check for basic liveness probe.
 * Always returns 200 OK if the application is running.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
} 