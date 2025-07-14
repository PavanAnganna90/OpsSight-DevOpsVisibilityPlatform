# Architecture Guide

This document provides a comprehensive overview of the OpsSight DevOps Platform architecture, design patterns, and technical decisions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Technology Stack](#technology-stack)
4. [Design Patterns](#design-patterns)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Performance Considerations](#performance-considerations)
8. [Scalability Strategy](#scalability-strategy)
9. [Deployment Architecture](#deployment-architecture)
10. [Monitoring and Observability](#monitoring-and-observability)

## Architecture Overview

OpsSight follows a modern microservices architecture with a React-based frontend and FastAPI backend, designed for scalability, maintainability, and developer experience.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Services                        │
├─────────────────────────────────────────────────────────────────┤
│  GitHub API  │  Kubernetes API  │  Prometheus  │  Grafana       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
├─────────────────────────────────────────────────────────────────┤
│                      NGINX / AWS ALB                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App  │  React Components  │  TypeScript  │  Tailwind   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                              │
├─────────────────────────────────────────────────────────────────┤
│                      FastAPI Backend                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Auth Service  │  Metrics Service  │  K8s Service  │  CI/CD Svc │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis  │  InfluxDB  │  File Storage            │
└─────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Separation of Concerns**: Clear boundaries between frontend, backend, and data layers
2. **Microservices**: Loosely coupled services with well-defined APIs
3. **Event-Driven**: Asynchronous communication through events and webhooks
4. **Scalability**: Horizontal scaling with container orchestration
5. **Observability**: Comprehensive logging, monitoring, and tracing
6. **Security**: Defense-in-depth with authentication, authorization, and encryption

## System Components

### Frontend Components

#### Next.js Application
- **Framework**: Next.js 15 with React 19
- **Rendering**: Server-side rendering (SSR) and static site generation (SSG)
- **Routing**: File-based routing with dynamic routes
- **API Routes**: Backend API integration
- **Middleware**: Authentication and security middleware

#### React Component Library
- **UI Components**: Reusable, accessible components
- **Theme System**: Dynamic theming with 7 variants and 4 color modes
- **State Management**: React Context and TanStack Query
- **Performance**: Lazy loading, code splitting, and memoization

#### TypeScript Integration
- **Type Safety**: Comprehensive type definitions
- **API Types**: Generated from OpenAPI schema
- **Component Props**: Strongly typed component interfaces
- **Error Handling**: Type-safe error boundaries

### Backend Components

#### FastAPI Application
- **Framework**: FastAPI with Python 3.9+
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Validation**: Pydantic models for request/response validation
- **Async Support**: Asynchronous request handling
- **Dependency Injection**: FastAPI's dependency system

#### Service Layer
```python
# services/
├── auth_service.py          # Authentication and authorization
├── metrics_service.py       # Metrics collection and aggregation
├── kubernetes_service.py    # Kubernetes API integration
├── github_service.py        # GitHub API integration
├── notification_service.py  # Email and Slack notifications
└── monitoring_service.py    # System monitoring and alerting
```

#### Data Access Layer
```python
# models/
├── user.py                  # User models
├── metric.py               # Metrics models
├── pipeline.py             # CI/CD pipeline models
├── alert.py                # Alert models
└── kubernetes.py           # Kubernetes resource models
```

### Data Storage

#### PostgreSQL
- **Primary Database**: User data, configurations, and metadata
- **ACID Compliance**: Transactional integrity
- **Indexing**: Optimized queries with proper indexes
- **Backup**: Automated backups and point-in-time recovery

#### Redis
- **Caching**: API response caching and session storage
- **Pub/Sub**: Real-time notifications and events
- **Rate Limiting**: Request throttling and abuse prevention
- **Session Management**: User session storage

#### InfluxDB (Optional)
- **Time Series Data**: Metrics and monitoring data
- **High Performance**: Optimized for time-series operations
- **Retention Policies**: Automated data lifecycle management
- **Downsampling**: Data aggregation for long-term storage

## Technology Stack

### Frontend Stack

#### Core Technologies
- **React 19**: Latest React features and concurrent rendering
- **Next.js 15**: Full-stack React framework
- **TypeScript 5**: Type safety and developer experience
- **Tailwind CSS 4**: Utility-first CSS framework

#### State Management
- **React Context**: Global state management
- **TanStack Query**: Server state management and caching
- **Zustand**: Client-side state management (where needed)

#### UI and Styling
- **Headless UI**: Unstyled, accessible UI components
- **Heroicons**: Icon library
- **Framer Motion**: Animation library
- **Recharts**: Data visualization

#### Development Tools
- **Vite**: Build tool and development server
- **Storybook**: Component documentation and testing
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Playwright**: End-to-end testing

### Backend Stack

#### Core Technologies
- **FastAPI**: Modern, fast web framework
- **Python 3.9+**: Programming language
- **Pydantic**: Data validation and serialization
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migration tool

#### Authentication and Security
- **JWT**: JSON Web Tokens for authentication
- **OAuth 2.0**: GitHub OAuth integration
- **BCrypt**: Password hashing
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling

#### External Integrations
- **GitHub API**: Repository and user data
- **Kubernetes API**: Cluster monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Ansible**: Automation tracking

#### Infrastructure
- **Docker**: Containerization
- **Kubernetes**: Container orchestration
- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **NGINX**: Reverse proxy and load balancing

## Design Patterns

### Frontend Patterns

#### Component Composition
```typescript
// Compound component pattern
const Card = ({ children, className }: CardProps) => (
  <div className={cn("card", className)}>{children}</div>
);

Card.Header = ({ children }: CardHeaderProps) => (
  <div className="card-header">{children}</div>
);

Card.Content = ({ children }: CardContentProps) => (
  <div className="card-content">{children}</div>
);

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Content>Content</Card.Content>
</Card>
```

#### Custom Hooks
```typescript
// Data fetching hook
const useMetrics = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: () => fetchMetrics(timeRange),
    refetchInterval: 30000, // 30 seconds
  });
};

// Feature flag hook
const useFeatureFlag = (flag: string) => {
  const { user } = useAuth();
  return useMemo(() => {
    return checkFeatureFlag(user, flag);
  }, [user, flag]);
};
```

#### Higher-Order Components
```typescript
// Authentication HOC
const withAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" />;
    
    return <Component {...props} />;
  };
};
```

### Backend Patterns

#### Dependency Injection
```python
# Dependencies
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    # Validate token and return user
    return await auth_service.get_user_by_token(db, token)

# Route with dependency injection
@app.get("/api/v1/users/me")
async def get_me(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    return UserResponse.from_orm(current_user)
```

#### Repository Pattern
```python
# Abstract repository
class BaseRepository(ABC):
    @abstractmethod
    async def get_by_id(self, id: int) -> Optional[Model]:
        pass
    
    @abstractmethod
    async def create(self, data: dict) -> Model:
        pass

# Concrete repository
class UserRepository(BaseRepository):
    def __init__(self, db: Session):
        self.db = db
    
    async def get_by_id(self, id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == id).first()
    
    async def create(self, data: dict) -> User:
        user = User(**data)
        self.db.add(user)
        self.db.commit()
        return user
```

#### Service Layer Pattern
```python
# Service layer
class MetricsService:
    def __init__(self, repo: MetricsRepository):
        self.repo = repo
    
    async def get_metrics(
        self, 
        start_time: datetime, 
        end_time: datetime
    ) -> List[Metric]:
        # Business logic
        metrics = await self.repo.get_by_time_range(start_time, end_time)
        return self._process_metrics(metrics)
    
    def _process_metrics(self, metrics: List[Metric]) -> List[Metric]:
        # Apply business rules
        return [m for m in metrics if self._is_valid_metric(m)]
```

### Event-Driven Architecture

#### Event Publisher
```python
# Event system
class EventPublisher:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
    
    async def publish(self, event: Event):
        await self.redis.publish(
            event.channel, 
            event.to_json()
        )

# Usage
await event_publisher.publish(
    Event(
        type="pipeline.completed",
        data={"pipeline_id": "123", "status": "success"}
    )
)
```

#### Event Subscriber
```python
# Event subscriber
class EventSubscriber:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.handlers = {}
    
    def on(self, event_type: str, handler: Callable):
        self.handlers[event_type] = handler
    
    async def start(self):
        pubsub = self.redis.pubsub()
        await pubsub.subscribe("events")
        
        async for message in pubsub.listen():
            event = Event.from_json(message["data"])
            if event.type in self.handlers:
                await self.handlers[event.type](event)
```

## Data Flow

### Request Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   NGINX     │───▶│   Next.js   │
│  (Browser)  │    │    LB       │    │   Frontend  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   FastAPI   │◀───│   API Call  │◀───│   React     │
│   Backend   │    │             │    │  Component  │
└─────────────┘    └─────────────┘    └─────────────┘
        │
        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Database   │    │   Redis     │    │  External   │
│ PostgreSQL  │    │   Cache     │    │   APIs      │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   GitHub    │───▶│   OAuth     │
│             │    │   OAuth     │    │  Callback   │
└─────────────┘    └─────────────┘    └─────────────┘
        ▲                                      │
        │                                      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Store     │◀───│   JWT       │◀───│   Backend   │
│   Token     │    │   Token     │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Metrics Collection Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Kubernetes  │───▶│  Prometheus │───▶│   Grafana   │
│   Metrics   │    │   Scraper   │    │  Dashboard  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   OpsSight  │◀───│   Metrics   │◀───│   Query     │
│   Backend   │    │    API      │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
        │
        ▼
┌─────────────┐    ┌─────────────┐
│   Database  │    │   Cache     │
│   Storage   │    │   Layer     │
└─────────────┘    └─────────────┘
```

## Security Architecture

### Authentication and Authorization

#### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "iat": 1640995200,
    "exp": 1640998800,
    "permissions": ["read", "write"],
    "roles": ["user", "admin"]
  }
}
```

#### Role-Based Access Control (RBAC)
```python
# Permission system
class Permission:
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    METRICS_VIEW = "metrics:view"
    PIPELINES_MANAGE = "pipelines:manage"

# Role definitions
ROLES = {
    "user": [Permission.READ],
    "developer": [Permission.READ, Permission.WRITE],
    "admin": [Permission.READ, Permission.WRITE, Permission.ADMIN],
    "viewer": [Permission.READ, Permission.METRICS_VIEW]
}
```

### Security Headers

```python
# Security middleware
def add_security_headers(response: Response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

### Data Encryption

#### At Rest
- Database encryption using PostgreSQL's built-in encryption
- File storage encryption using cloud provider encryption
- Secret management with encrypted storage

#### In Transit
- HTTPS/TLS 1.3 for all communications
- Certificate management with Let's Encrypt
- API authentication using JWT tokens

### Input Validation

```python
# Pydantic models for validation
class MetricCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    value: float = Field(..., ge=0)
    unit: Optional[str] = Field(None, max_length=20)
    tags: Optional[Dict[str, str]] = Field(None, max_length=10)
    
    @validator('tags')
    def validate_tags(cls, v):
        if v and len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        return v
```

## Performance Considerations

### Frontend Performance

#### Code Splitting
```typescript
// Route-based code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Metrics = lazy(() => import('./pages/Metrics'));

// Component-based code splitting
const HeavyComponent = lazy(() => import('./components/HeavyComponent'));
```

#### Caching Strategy
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

#### Bundle Optimization
```javascript
// Next.js configuration
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups = {
        vendor: {
          test: /node_modules/,
          name: 'vendors',
          chunks: 'all',
        },
      };
    }
    return config;
  },
};
```

### Backend Performance

#### Database Optimization
```python
# Database indexing
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, index=True)
    
    # Composite index for common queries
    __table_args__ = (
        Index('idx_user_email_created', 'email', 'created_at'),
    )
```

#### Connection Pooling
```python
# Database connection pool
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

#### Caching Layer
```python
# Redis caching
class CacheService:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
    
    async def get_or_set(
        self, 
        key: str, 
        fetch_fn: Callable,
        ttl: int = 3600
    ):
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        data = await fetch_fn()
        await self.redis.setex(key, ttl, json.dumps(data))
        return data
```

## Scalability Strategy

### Horizontal Scaling

#### Load Balancing
```yaml
# Kubernetes service configuration
apiVersion: v1
kind: Service
metadata:
  name: opsight-backend
spec:
  selector:
    app: opsight-backend
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

#### Auto-scaling
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: opsight-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: opsight-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Scaling

#### Read Replicas
```python
# Read/write splitting
class DatabaseService:
    def __init__(self):
        self.write_engine = create_engine(WRITE_DATABASE_URL)
        self.read_engine = create_engine(READ_DATABASE_URL)
    
    def get_write_session(self):
        return sessionmaker(bind=self.write_engine)()
    
    def get_read_session(self):
        return sessionmaker(bind=self.read_engine)()
```

#### Database Partitioning
```sql
-- Time-based partitioning for metrics
CREATE TABLE metrics_2023 PARTITION OF metrics
FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE metrics_2024 PARTITION OF metrics
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Caching Strategy

#### Multi-level Caching
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │───▶│   CDN       │───▶│   Redis     │
│   Cache     │    │   Cache     │    │   Cache     │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                   ┌─────────────┐
                                   │   Database  │
                                   │   Storage   │
                                   └─────────────┘
```

## Deployment Architecture

### Container Strategy

#### Multi-stage Builds
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

#### Resource Limits
```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opsight-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: opsight-backend
  template:
    metadata:
      labels:
        app: opsight-backend
    spec:
      containers:
      - name: backend
        image: opsight-backend:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Environment Management

#### Configuration Management
```python
# Environment-specific configuration
class Settings:
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.database_url = os.getenv("DATABASE_URL")
        self.redis_url = os.getenv("REDIS_URL")
        self.github_client_id = os.getenv("GITHUB_CLIENT_ID")
        self.github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        
        # Environment-specific settings
        if self.environment == "production":
            self.debug = False
            self.log_level = "INFO"
        else:
            self.debug = True
            self.log_level = "DEBUG"
```

### Service Mesh Architecture

#### Istio Configuration
```yaml
# Service mesh configuration
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: opsight-backend
spec:
  hosts:
  - opsight-backend
  http:
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: opsight-backend
        subset: v1
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
```

## Monitoring and Observability

### Logging Strategy

#### Structured Logging
```python
# Structured logging configuration
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Usage
logger = structlog.get_logger()
logger.info("User login", user_id=123, ip_address="192.168.1.1")
```

### Metrics Collection

#### Prometheus Metrics
```python
# Custom metrics
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

# Business metrics
ACTIVE_USERS = Gauge(
    'active_users_total',
    'Number of active users'
)
```

### Distributed Tracing

#### OpenTelemetry Integration
```python
# Tracing setup
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure tracer
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)

span_processor = BatchSpanProcessor(jaeger_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)

# Usage
@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: int):
    with tracer.start_as_current_span("get_user"):
        # Business logic
        pass
```

### Health Checks

#### Comprehensive Health Monitoring
```python
# Health check endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health/detailed")
async def detailed_health_check():
    checks = {
        "database": await check_database_health(),
        "redis": await check_redis_health(),
        "external_apis": await check_external_apis_health()
    }
    
    overall_status = "healthy" if all(
        check["status"] == "healthy" 
        for check in checks.values()
    ) else "unhealthy"
    
    return {
        "status": overall_status,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

This architecture guide provides a comprehensive overview of the OpsSight platform's design and implementation. For specific implementation details, refer to the codebase and individual component documentation.