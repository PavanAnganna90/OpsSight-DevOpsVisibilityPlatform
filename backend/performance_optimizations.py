"""
OpsSight Platform - Performance Optimization Module
Advanced performance optimizations for backend services
"""

import asyncio
import time
import functools
from typing import Any, Callable, Dict, List, Optional, Union
from contextlib import asynccontextmanager
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json

class PerformanceOptimizer:
    """Central performance optimization coordinator"""
    
    def __init__(self, redis_client: redis.Redis, db_session: AsyncSession):
        self.redis = redis_client
        self.db = db_session
        self.metrics = {}
    
    async def track_performance(self, operation: str, duration: float):
        """Track performance metrics"""
        key = f"perf:metrics:{operation}"
        await self.redis.lpush(key, duration)
        await self.redis.ltrim(key, 0, 99)  # Keep last 100 measurements
        await self.redis.expire(key, 3600)  # 1 hour TTL

class DatabaseOptimizer:
    """Database-specific performance optimizations"""
    
    def __init__(self, db_session: AsyncSession, redis_client: redis.Redis):
        self.db = db_session
        self.redis = redis_client
    
    async def create_performance_indexes(self):
        """Create performance-critical database indexes"""
        indexes = [
            # User table indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_github_id ON users(github_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true",
            
            # Organization indexes  
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name ON organizations(name)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)",
            
            # Team indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_org_id ON teams(organization_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_name_org ON teams(organization_id, name)",
            
            # User-Team relationship indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_teams_composite ON user_teams(user_id, team_id)",
            
            # Role and permission indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)",
            
            # Audit log indexes (for frequently queried data)
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)",
            
            # Metrics and monitoring indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_type ON metrics(metric_type, timestamp DESC)",
            
            # Composite indexes for common query patterns
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_active ON users(organization_id, is_active) WHERE is_active = true",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_org_active ON teams(organization_id, is_active) WHERE is_active = true",
        ]
        
        for index_sql in indexes:
            try:
                await self.db.execute(text(index_sql))
                await self.db.commit()
                print(f"✅ Created index: {index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'index'}")
            except Exception as e:
                print(f"⚠️ Index creation failed or already exists: {e}")
                await self.db.rollback()
    
    async def optimize_database_settings(self):
        """Apply database-level optimizations"""
        optimizations = [
            # Connection and memory settings
            "SET shared_preload_libraries = 'pg_stat_statements'",
            "SET effective_cache_size = '1GB'",
            "SET shared_buffers = '256MB'",
            "SET work_mem = '4MB'",
            "SET maintenance_work_mem = '64MB'",
            
            # Query optimization
            "SET random_page_cost = 1.1",  # For SSD storage
            "SET effective_io_concurrency = 200",
            
            # WAL and checkpointing
            "SET checkpoint_completion_target = 0.9",
            "SET wal_buffers = '16MB'",
            
            # Statistics
            "SET default_statistics_target = 100",
        ]
        
        for setting in optimizations:
            try:
                await self.db.execute(text(setting))
                print(f"✅ Applied setting: {setting}")
            except Exception as e:
                print(f"⚠️ Setting failed: {e}")

class CacheOptimizer:
    """Advanced caching strategies"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_ttl = 300  # 5 minutes
        self.long_ttl = 3600    # 1 hour
        self.short_ttl = 60     # 1 minute
    
    def cache_key(self, prefix: str, *args) -> str:
        """Generate consistent cache keys"""
        key_parts = [str(arg) for arg in args if arg is not None]
        return f"{prefix}:{':'.join(key_parts)}"
    
    async def get_or_set(self, key: str, factory: Callable, ttl: int = None) -> Any:
        """Get from cache or set using factory function"""
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        value = await factory() if asyncio.iscoroutinefunction(factory) else factory()
        await self.redis.setex(key, ttl or self.default_ttl, json.dumps(value, default=str))
        return value
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate cache keys matching pattern"""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)
    
    async def warm_cache(self, warm_functions: List[Callable]):
        """Pre-populate cache with common queries"""
        for func in warm_functions:
            try:
                await func()
                print(f"✅ Cache warmed for: {func.__name__}")
            except Exception as e:
                print(f"⚠️ Cache warm failed for {func.__name__}: {e}")

class QueryOptimizer:
    """SQL query optimization utilities"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
    
    async def analyze_slow_queries(self) -> List[Dict]:
        """Identify slow queries using pg_stat_statements"""
        query = """
        SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows,
            100.0 * total_time / sum(total_time) OVER() AS percentage
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_time DESC 
        LIMIT 10
        """
        
        try:
            result = await self.db.execute(text(query))
            return [dict(row) for row in result.fetchall()]
        except Exception as e:
            print(f"⚠️ Could not analyze slow queries: {e}")
            return []
    
    async def get_index_usage(self) -> List[Dict]:
        """Check index usage statistics"""
        query = """
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_tup_read,
            idx_tup_fetch,
            idx_scan,
            CASE WHEN idx_scan = 0 THEN 0 
                 ELSE ROUND((idx_tup_fetch::numeric / idx_scan), 2) 
            END AS avg_tuples_per_scan
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC
        """
        
        try:
            result = await self.db.execute(text(query))
            return [dict(row) for row in result.fetchall()]
        except Exception as e:
            print(f"⚠️ Could not get index usage: {e}")
            return []

def performance_monitor(operation: str = None):
    """Decorator to monitor function performance"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                op_name = operation or f"{func.__module__}.{func.__name__}"
                print(f"⏱️ {op_name}: {duration:.3f}s")
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                op_name = operation or f"{func.__module__}.{func.__name__}"
                print(f"⏱️ {op_name}: {duration:.3f}s")
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

class ResponseOptimizer:
    """HTTP response optimization"""
    
    @staticmethod
    def compress_response(data: Any, compression_level: int = 6) -> bytes:
        """Compress response data"""
        import gzip
        json_data = json.dumps(data, default=str).encode()
        return gzip.compress(json_data, compresslevel=compression_level)
    
    @staticmethod
    def paginate_response(data: List[Any], page: int = 1, page_size: int = 25) -> Dict:
        """Paginate large response datasets"""
        total = len(data)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            "data": data[start:end],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": (total + page_size - 1) // page_size,
                "has_next": end < total,
                "has_prev": page > 1
            }
        }

class MemoryOptimizer:
    """Memory usage optimization"""
    
    @staticmethod
    @asynccontextmanager
    async def batch_processor(items: List[Any], batch_size: int = 100):
        """Process items in batches to control memory usage"""
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            yield batch
            # Force garbage collection between batches
            import gc
            gc.collect()

# Performance optimization configuration
PERFORMANCE_CONFIG = {
    "cache": {
        "default_ttl": 300,
        "user_session_ttl": 1800,
        "static_data_ttl": 3600,
        "query_result_ttl": 600
    },
    "database": {
        "connection_pool_size": 20,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_recycle": 3600
    },
    "response": {
        "default_page_size": 25,
        "max_page_size": 100,
        "compression_level": 6
    },
    "monitoring": {
        "slow_query_threshold": 1.0,  # seconds
        "memory_alert_threshold": 0.8,  # 80% of available memory
        "response_time_alert": 2.0  # seconds
    }
}

async def initialize_performance_optimizations(db_session: AsyncSession, redis_client: redis.Redis):
    """Initialize all performance optimizations"""
    print("🚀 Initializing performance optimizations...")
    
    # Database optimizations
    db_optimizer = DatabaseOptimizer(db_session, redis_client)
    await db_optimizer.create_performance_indexes()
    await db_optimizer.optimize_database_settings()
    
    # Cache optimization
    cache_optimizer = CacheOptimizer(redis_client)
    
    # Warm critical caches
    async def warm_user_cache():
        # Pre-load active users count
        query = "SELECT COUNT(*) FROM users WHERE is_active = true"
        result = await db_session.execute(text(query))
        count = result.scalar()
        await redis_client.setex("cache:active_users_count", 3600, str(count))
    
    async def warm_organization_cache():
        # Pre-load organization stats
        query = "SELECT COUNT(*) FROM organizations"
        result = await db_session.execute(text(query))
        count = result.scalar()
        await redis_client.setex("cache:organizations_count", 3600, str(count))
    
    await cache_optimizer.warm_cache([warm_user_cache, warm_organization_cache])
    
    print("✅ Performance optimizations initialized successfully!")

# Export main classes and functions
__all__ = [
    'PerformanceOptimizer',
    'DatabaseOptimizer', 
    'CacheOptimizer',
    'QueryOptimizer',
    'ResponseOptimizer',
    'MemoryOptimizer',
    'performance_monitor',
    'PERFORMANCE_CONFIG',
    'initialize_performance_optimizations'
]