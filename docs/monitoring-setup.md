# Monitoring and Error Tracking Setup

This document describes the comprehensive monitoring and error tracking setup for the OpsSight DevOps platform.

## Overview

The OpsSight platform includes a complete monitoring stack with:

- **Prometheus** - Metrics collection and storage
- **Grafana** - Metrics visualization and dashboards
- **AlertManager** - Alert routing and notifications
- **Sentry** - Error tracking and performance monitoring
- **Custom Metrics** - Application-specific business metrics

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Kubernetes    │
│                 │    │                 │    │                 │
│ • Sentry Client │    │ • Sentry Server │    │ • Node Exporter │
│ • Performance   │    │ • Prometheus    │    │ • Metrics       │
│ • Error Tracking│    │ • Custom Metrics│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Prometheus    │
                    │                 │
                    │ • Scrapes       │
                    │ • Stores        │
                    │ • Alerts        │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │    Grafana      │
                    │                 │
                    │ • Dashboards    │
                    │ • Visualization │
                    │ • Queries       │
                    └─────────────────┘
```

## Components

### 1. Prometheus Metrics Collection

#### Backend Metrics Endpoint
- **URL**: `/api/v1/metrics`
- **Format**: Prometheus exposition format
- **Scrape Interval**: 10 seconds

#### Available Metrics
- `http_requests_total` - Total HTTP requests by method, endpoint, status
- `http_request_duration_seconds` - Request latency histogram
- `db_connections_pool_size` - Database connection pool metrics
- `db_query_duration_seconds` - Database query performance
- `cache_hits_total` / `cache_misses_total` - Cache effectiveness
- `active_users` - Current active user count
- `pipeline_executions_total` - CI/CD pipeline execution metrics

#### Configuration
Located in `monitoring/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'backend'
    metrics_path: '/api/v1/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['backend:9090']
```

### 2. Grafana Dashboards

#### Pre-configured Dashboards
1. **OpsSight Application Dashboard** (`monitoring/grafana/dashboards/opsight-application.json`)
   - API request rates and latencies
   - Database performance metrics
   - Cache hit rates
   - Active user counts

2. **Kubernetes Overview Dashboard** (`monitoring/grafana/dashboards/kubernetes-overview.json`)
   - Cluster health and resource usage
   - Node and pod status
   - Resource consumption trends

#### Access
- **URL**: `http://localhost:3001` (development)
- **Default Credentials**: admin/admin (change in production)

### 3. AlertManager Configuration

#### Alert Routing
Located in `monitoring/alertmanager/config.yml`:

- **Critical Alerts** → PagerDuty (1-hour repeat)
- **Warning Alerts** → Slack (12-hour repeat)
- **Infrastructure Alerts** → Email (4-hour repeat)

#### Notification Channels
1. **Slack Integration**
   - Channel: `#alerts`
   - Webhook URL: Configure `SLACK_WEBHOOK_URL`

2. **PagerDuty Integration**
   - Service Key: Configure `PAGERDUTY_SERVICE_KEY`
   - Severity: Critical only

3. **Email Notifications**
   - SMTP Configuration required
   - Infrastructure team notifications

### 4. Sentry Error Tracking

#### Backend Configuration
File: `backend/app/core/sentry.py`

Features:
- FastAPI integration for request tracking
- SQLAlchemy integration for database queries
- Redis integration for cache operations
- HTTPX integration for external API calls
- Structured logging integration

#### Frontend Configuration
Files: 
- `frontend/sentry.client.config.ts` (client-side)
- `frontend/sentry.server.config.ts` (server-side)

Features:
- React error boundaries
- Performance monitoring
- User session tracking
- Route change tracking
- Custom error filtering

## Environment Configuration

### Backend Environment Variables

```bash
# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ENVIRONMENT=development|staging|production

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
ENABLE_METRICS=true

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
PAGERDUTY_SERVICE_KEY=your-pagerduty-service-key
```

### Frontend Environment Variables

```bash
# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_ENVIRONMENT=development|staging|production
NEXT_PUBLIC_VERSION=0.1.0
```

## Deployment

### Docker Compose
The monitoring stack is included in the main `docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus:/etc/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - ./monitoring/grafana:/etc/grafana/provisioning

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager:/etc/alertmanager
```

### Kubernetes Deployment
Helm charts are available in the `helm/` directory for production deployment.

## Usage

### Starting the Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Start only monitoring services
docker-compose up -d prometheus grafana alertmanager
```

### Accessing Services

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
- **AlertManager**: http://localhost:9093
- **Backend Metrics**: http://localhost:8000/api/v1/metrics

### Custom Metrics

#### Adding New Metrics (Backend)
1. Define metric in `backend/app/core/monitoring.py`:
```python
CUSTOM_METRIC = Counter('custom_metric_total', 'Description', ['label'])
```

2. Use in your code:
```python
from app.core.monitoring import CUSTOM_METRIC
CUSTOM_METRIC.labels(label='value').inc()
```

#### Adding New Dashboards
1. Create dashboard in Grafana UI
2. Export JSON configuration
3. Save to `monitoring/grafana/dashboards/`
4. Restart Grafana service

### Error Tracking

#### Backend Error Capture
```python
from app.core.sentry import capture_exception, capture_message

try:
    # Your code here
    pass
except Exception as e:
    capture_exception(e, context={"user_id": user.id})
```

#### Frontend Error Capture
```typescript
import { captureException, captureMessage } from '../sentry.client.config';

try {
  // Your code here
} catch (error) {
  captureException(error, { userId: user.id, action: 'button_click' });
}
```

## Troubleshooting

### Common Issues

1. **Metrics not appearing in Prometheus**
   - Check backend `/api/v1/metrics` endpoint is accessible
   - Verify Prometheus configuration and target health
   - Check Docker network connectivity

2. **Grafana dashboards not loading**
   - Verify Prometheus data source configuration
   - Check dashboard JSON syntax
   - Ensure proper permissions

3. **Alerts not firing**
   - Check AlertManager configuration
   - Verify webhook URLs and credentials
   - Test alert rules in Prometheus

4. **Sentry errors not appearing**
   - Verify DSN configuration
   - Check network connectivity to Sentry
   - Review error filtering rules

### Health Checks

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check backend metrics endpoint
curl http://localhost:8000/api/v1/metrics

# Check AlertManager status
curl http://localhost:9093/api/v1/status

# Check Grafana health
curl http://localhost:3001/api/health
```

## Security Considerations

1. **Sensitive Data**
   - Never expose sensitive metrics publicly
   - Use authentication for Grafana in production
   - Secure AlertManager webhook URLs

2. **Network Security**
   - Restrict Prometheus scrape targets
   - Use TLS for external communications
   - Implement proper firewall rules

3. **Data Retention**
   - Configure appropriate retention policies
   - Regularly backup Grafana dashboards
   - Monitor storage usage

## Performance Impact

- **Prometheus Scraping**: Minimal impact (~1-2ms per request)
- **Sentry Sampling**: Configurable rates by environment
- **Grafana Queries**: Optimized for real-time dashboards
- **Storage**: Prometheus data retention configurable (default: 15 days)

## Maintenance

### Regular Tasks
1. Update Grafana dashboards based on new requirements
2. Review and tune alert thresholds
3. Clean up old Prometheus data
4. Update Sentry error filters
5. Monitor storage usage and performance

### Backup Strategy
1. Export Grafana dashboards regularly
2. Backup Prometheus configuration
3. Store AlertManager configuration in version control
4. Document custom metric definitions 