# OpsSight Platform Monitoring & Logging

Complete observability stack for the OpsSight DevOps platform providing metrics, logs, traces, and alerting.

## 🎯 Overview

The OpsSight monitoring stack implements comprehensive observability with:

- **📊 Metrics Collection**: Prometheus with custom application metrics
- **📝 Log Aggregation**: Loki with Promtail for centralized logging
- **🔍 Distributed Tracing**: Jaeger for request tracing
- **📈 Visualization**: Grafana dashboards for metrics and logs
- **🚨 Alerting**: AlertManager with multi-channel notifications
- **💚 Health Monitoring**: Service health checks and uptime monitoring

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpsSight Monitoring Stack                   │
├─────────────────────────────────────────────────────────────────┤
│  Applications (Backend, Frontend, DB, Cache)                   │
│         │                    │                    │            │
│    ┌────▼────┐         ┌─────▼─────┐        ┌─────▼─────┐       │
│    │ Metrics │         │   Logs    │        │  Traces   │       │
│    │Endpoint │         │ (stdout)  │        │ (OTLP)    │       │
│    └────┬────┘         └─────┬─────┘        └─────┬─────┘       │
│         │                    │                    │            │
│    ┌────▼────┐         ┌─────▼─────┐        ┌─────▼─────┐       │
│    │Prometheus│         │ Promtail  │        │  Jaeger   │       │
│    │         │         │           │        │           │       │
│    └────┬────┘         └─────┬─────┘        └─────┬─────┘       │
│         │                    │                    │            │
│         │               ┌────▼────┐               │            │
│         │               │  Loki   │               │            │
│         │               └────┬────┘               │            │
│         │                    │                    │            │
│    ┌────▼────────────────────▼────────────────────▼─────┐       │
│    │                 Grafana                            │       │
│    │        (Dashboards, Alerts, Exploration)          │       │
│    └────┬───────────────────────────────────────────────┘       │
│         │                                                      │
│    ┌────▼────┐                                                 │
│    │AlertMgr │                                                 │
│    │         │                                                 │
│    └────┬────┘                                                 │
│         │                                                      │
│    ┌────▼────┐                                                 │
│    │Notifications (Slack, Email, PagerDuty)                   │
│    └─────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- At least 4GB RAM available
- Ports 3001, 3100, 9090, 9093, 16686 available

### Start Monitoring Stack

```bash
# Navigate to monitoring directory
cd monitoring

# Start the complete monitoring stack
./start-monitoring.sh

# Or manually with docker-compose
docker-compose -f docker-compose.monitoring.yml up -d
```

### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3001 | admin/opssight123 |
| **Prometheus** | http://localhost:9090 | None |
| **AlertManager** | http://localhost:9093 | None |
| **Loki** | http://localhost:3100 | None |
| **Jaeger** | http://localhost:16686 | None |
| **Uptime Kuma** | http://localhost:3002 | Setup required |

## 📊 Metrics Collection

### System Metrics

The platform collects comprehensive system metrics:

```yaml
# CPU and Load
system_cpu_usage_percent
system_cpu_load_1m, system_cpu_load_5m, system_cpu_load_15m

# Memory
system_memory_usage_bytes{type="used|available|cached|buffers"}
system_memory_usage_percent

# Disk
system_disk_usage_bytes{path="/", type="used|free|total"}
system_disk_usage_percent{path="/"}

# Network
system_network_bytes_total{interface, direction="rx|tx"}

# Process
system_process_count
system_file_descriptors_open
```

### Application Metrics

```yaml
# HTTP Requests
http_requests_total{method, endpoint, status_code, user_type}
http_request_duration_seconds{method, endpoint}
http_request_size_bytes{method, endpoint}
http_response_size_bytes{method, endpoint}

# Database
db_connections_active{database}
db_connections_idle{database}
db_query_duration_seconds{operation, table}
db_slow_queries_total{operation, table}

# Cache
cache_operations_total{operation, cache_type, result}
cache_hit_ratio{cache_type}
cache_memory_usage_bytes{cache_type}

# Background Tasks
background_tasks_active{task_type}
background_task_duration_seconds{task_type}
background_task_errors_total{task_type, error_type}
```

### Business Metrics

```yaml
# Users
business_active_users{time_window="1h|1d|1w"}
business_user_sessions_active
business_user_actions_total{action_type, user_role}

# Pipelines
business_pipeline_executions_total{pipeline_type, status, environment}
business_pipeline_duration_seconds{pipeline_type, environment}
business_pipeline_queue_size{priority}

# Deployments
business_deployments_total{environment, status, deployment_type}
business_deployment_frequency_per_day{environment}

# Integrations
business_integration_calls_total{service, operation, status}
business_integration_latency_seconds{service, operation}
```

### Security Metrics

```yaml
# Authentication
security_auth_attempts_total{method, result, user_type}
security_failed_logins_total{reason, source_ip_class}

# Rate Limiting
security_rate_limit_violations_total{endpoint, limit_type}
security_blocked_ips_count

# Security Events
security_events_total{event_type, severity}
security_input_validation_failures_total{validation_type, endpoint}
```

## 📝 Log Management

### Log Structure

All logs follow a structured JSON format:

```json
{
  "timestamp": "2025-01-20T15:30:45.123Z",
  "level": "info",
  "message": "Request processed successfully",
  "category": "api_request", 
  "component": "backend",
  "context": {
    "request_id": "req_123",
    "user_id": "user_456",
    "endpoint": "/api/v1/users"
  },
  "labels": {
    "service": "opssight-backend",
    "environment": "production"
  },
  "metadata": {
    "logger": "app.api.users",
    "duration_ms": 45
  }
}
```

### Log Categories

- `api_request` - HTTP API requests
- `api_response` - HTTP API responses
- `db_query` - Database operations
- `cache_op` - Cache operations
- `security` - Security events
- `performance` - Performance metrics
- `business` - Business logic events
- `system` - System events
- `external_api` - External API calls
- `background` - Background tasks
- `audit` - Audit trail events

### Log Aggregation

Logs are collected by Promtail and forwarded to Loki with:

- **Automatic parsing** of JSON logs
- **Label extraction** for filtering
- **Rate limiting** to prevent log storms
- **Filtering** of noisy logs (health checks)
- **Retention** of 7 days by default

## 🔍 Distributed Tracing

### Trace Collection

The platform uses OpenTelemetry for distributed tracing:

- **Automatic instrumentation** for HTTP requests
- **Database query tracing** with query details
- **Cache operation tracing** with hit/miss info
- **External API call tracing** with latency
- **Custom span creation** for business operations

### Trace Data

Each trace includes:

```json
{
  "trace_id": "abc123def456",
  "span_id": "span789",
  "operation": "user_login",
  "service": "opssight-backend",
  "duration_ms": 145,
  "status": "ok",
  "tags": {
    "user_id": "user_123",
    "endpoint": "/api/v1/auth/login",
    "db_query_count": 3,
    "cache_hits": 2
  }
}
```

## 📈 Dashboards

### Available Dashboards

1. **OpsSight Platform Overview**
   - System health status
   - Key performance indicators
   - Error rates and response times
   - Resource utilization

2. **Application Performance**
   - HTTP request metrics
   - Database performance
   - Cache performance
   - Background task status

3. **Infrastructure Monitoring**
   - System resources (CPU, Memory, Disk)
   - Network metrics
   - Container metrics
   - Kubernetes metrics (if applicable)

4. **Security Dashboard**
   - Security events timeline
   - Failed authentication attempts
   - Blocked IPs and rate limiting
   - Security incidents

5. **Business Metrics**
   - User activity and sessions
   - Pipeline executions
   - Deployment frequency
   - Integration health

### Custom Dashboards

Create custom dashboards using:

- **PromQL queries** for metrics
- **LogQL queries** for logs
- **Mixed datasources** for comprehensive views
- **Template variables** for dynamic filtering

## 🚨 Alerting

### Alert Rules

The platform includes pre-configured alerts:

#### Critical Alerts
- Service down (Backend, Frontend, Database)
- High error rate (>10% for 5 minutes)
- Database connection pool exhaustion (>90%)
- High memory usage (>90%)
- Disk space critical (<10% free)

#### Warning Alerts
- High response time (95th percentile >2s)
- High memory usage (>80%)
- Cache hit ratio low (<80%)
- Failed authentication spike
- Slow database queries

#### Info Alerts
- Deployment detected
- Configuration changes
- Security events

### Notification Channels

Configure notifications via:

- **Slack** - Real-time team notifications
- **Email** - Critical alert emails
- **PagerDuty** - On-call escalation
- **Webhooks** - Custom integrations

### Alert Configuration

Edit `alertmanager/config.yml`:

```yaml
route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        
  - name: 'critical-alerts'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#critical-alerts'
    email_configs:
      - to: 'oncall@company.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
        
  - name: 'warning-alerts'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#warnings'
```

## 🔧 Configuration

### Environment Variables

```bash
# Prometheus
PROMETHEUS_RETENTION_TIME=30d
PROMETHEUS_RETENTION_SIZE=10GB

# Grafana
GRAFANA_ADMIN_PASSWORD=your_secure_password
GF_SECURITY_SECRET_KEY=your_secret_key

# Loki
LOKI_RETENTION_PERIOD=168h  # 7 days

# AlertManager
ALERTMANAGER_SLACK_URL=your_slack_webhook
ALERTMANAGER_EMAIL_FROM=alerts@company.com
```

### Customization

#### Add Custom Metrics

```python
from app.core.enhanced_metrics import get_enhanced_metrics

metrics = get_enhanced_metrics()

# Record custom business metric
metrics.record_pipeline_execution(
    pipeline_type="deployment",
    status="success", 
    environment="production",
    duration=300.0
)
```

#### Add Custom Logs

```python
from app.core.enhanced_logging import get_logger, LogCategory

logger = get_logger(__name__)

logger.info(
    "Custom business event occurred",
    category=LogCategory.BUSINESS_LOGIC,
    extra={
        "user_id": "123",
        "action": "purchase",
        "amount": 99.99
    }
)
```

#### Add Custom Traces

```python
from app.core.telemetry import trace_operation

@trace_operation("business_operation")
async def process_order(order_id):
    # Your business logic here
    pass
```

## 🛠️ Maintenance

### Daily Tasks

- Review critical alerts
- Check dashboard health
- Monitor disk usage
- Verify log ingestion rates

### Weekly Tasks

- Review performance trends
- Update alert thresholds
- Clean old data if needed
- Review security events

### Monthly Tasks

- Update monitoring stack versions
- Review and optimize queries
- Audit alert rules
- Performance baseline review

### Backup and Recovery

```bash
# Backup Prometheus data
docker run --rm -v prometheus_data:/data -v $(pwd):/backup busybox tar czf /backup/prometheus-backup.tar.gz /data

# Backup Grafana dashboards
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3001/api/search?type=dash-db | jq -r '.[]| .uri' | xargs -I {} curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3001/api/dashboards/{} > dashboards-backup.json

# Backup Loki data
docker run --rm -v loki_data:/data -v $(pwd):/backup busybox tar czf /backup/loki-backup.tar.gz /data
```

## 🔍 Troubleshooting

### Common Issues

#### Prometheus not scraping metrics
```bash
# Check target status
curl http://localhost:9090/api/v1/targets

# Check configuration
docker logs opssight-prometheus
```

#### Grafana dashboards not loading
```bash
# Check Grafana logs
docker logs opssight-grafana

# Verify data sources
curl -u admin:password http://localhost:3001/api/datasources
```

#### Loki not receiving logs
```bash
# Check Promtail logs
docker logs opssight-promtail

# Check Loki ingestion
curl http://localhost:3100/metrics | grep loki_ingester
```

#### High memory usage
```bash
# Check container resource usage
docker stats

# Optimize Prometheus retention
# Edit prometheus.yml and restart
```

### Performance Tuning

#### Prometheus Optimization
- Adjust scrape intervals based on needs
- Use recording rules for complex queries
- Optimize storage retention settings
- Use external storage for long-term data

#### Loki Optimization  
- Configure proper log retention
- Use appropriate chunk sizes
- Optimize label cardinality
- Configure compaction properly

#### Grafana Optimization
- Use query caching
- Optimize dashboard refresh rates
- Use template variables effectively
- Monitor dashboard performance

## 📚 API Reference

### Monitoring API Endpoints

The backend provides comprehensive monitoring APIs:

#### Dashboard Data
```http
GET /api/v1/monitoring/dashboard
```
Returns complete monitoring dashboard data including system, application, database, security, and log metrics.

#### Prometheus Metrics
```http
GET /api/v1/monitoring/metrics
```
Returns all metrics in Prometheus format for scraping.

#### Health Check
```http
GET /api/v1/monitoring/health/detailed
```
Returns detailed health status of all system components.

#### Log Search
```http
GET /api/v1/monitoring/logs/search?level=error&category=api_request&limit=100
```
Search and filter application logs with various parameters.

#### Security Events
```http
GET /api/v1/monitoring/security/events?hours=24
```
Get recent security events and incidents.

#### Performance Traces
```http
GET /api/v1/monitoring/performance/traces?service=backend&limit=20
```
Get distributed tracing data for performance analysis.

#### System Resources
```http
GET /api/v1/monitoring/system/resources
```
Get detailed system resource information.

## 🤝 Contributing

### Adding New Metrics

1. Define metric in `enhanced_metrics.py`
2. Add collection logic
3. Update Grafana dashboards
4. Add alert rules if needed
5. Update documentation

### Adding New Dashboards

1. Create dashboard in Grafana UI
2. Export JSON definition
3. Add to `grafana/dashboards/`
4. Update provisioning config
5. Document dashboard purpose

### Adding New Alerts

1. Define alert rule in `prometheus/rules/`
2. Test alert conditions
3. Configure notification routing
4. Update runbook documentation
5. Test alert delivery

## 📄 License

This monitoring stack is part of the OpsSight platform and follows the same license terms.

## 🆘 Support

For support with the monitoring stack:

1. Check this documentation
2. Review logs in the troubleshooting section
3. Check GitHub issues
4. Contact the DevOps team

---

**Happy Monitoring! 📊✨**