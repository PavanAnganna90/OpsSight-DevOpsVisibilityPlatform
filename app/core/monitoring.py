from prometheus_client import Counter, Histogram, Gauge, Info, REGISTRY

def init_metrics():
    """
    Initialize Prometheus metrics. Call this once at app startup.
    """
    global APP_INFO, REQUEST_COUNT, REQUEST_LATENCY, DB_CONNECTION_POOL, DB_QUERY_DURATION
    global CACHE_HITS, CACHE_MISSES, ACTIVE_USERS, PIPELINE_EXECUTIONS, _metrics_initialized
    if _metrics_initialized:
        return
    # Prevent duplicate registration of db_query_duration_seconds
    if 'db_query_duration_seconds' in REGISTRY._names_to_collectors:
        return
    # Application info
    APP_INFO = Info('application', 'Application information')
    APP_INFO.info({
        'version': '1.0.0',
        'environment': 'development'
    })
    # Request metrics
    REQUEST_COUNT = Counter(
        'http_requests_total',
        'Total number of HTTP requests',
        ['method', 'endpoint', 'status']
    )
    REQUEST_LATENCY = Histogram(
        'http_request_duration_seconds',
        'HTTP request duration in seconds',
        ['method', 'endpoint'],
        buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
    )
    # Database metrics
    DB_CONNECTION_POOL = Gauge(
        'db_connections_pool_size',
        'Database connection pool size',
        ['status']  # active, idle, total
    )
    DB_QUERY_DURATION = Histogram(
        'db_query_duration_seconds',
        'Database query duration in seconds',
        ['operation', 'table'],
        buckets=[0.01, 0.05, 0.1, 0.5, 1.0]
    )
    # Cache metrics
    CACHE_HITS = Counter(
        'cache_hits_total',
        'Total number of cache hits',
        ['cache_type']
    )
    CACHE_MISSES = Counter(
        'cache_misses_total',
        'Total number of cache misses',
        ['cache_type']
    )
    # Business metrics
    ACTIVE_USERS = Gauge(
        'active_users',
        'Number of currently active users'
    )
    PIPELINE_EXECUTIONS = Counter(
        'pipeline_executions_total',
        'Total number of pipeline executions',
        ['status', 'pipeline_type']
    )
    _metrics_initialized = True 