#!/bin/bash

# OpsSight Platform - Comprehensive Monitoring Setup Script
# Sets up Prometheus, Grafana, AlertManager, and ELK stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌${NC} $1"
    exit 1
}

# Configuration
PROJECT_ROOT="/Users/pavan/Desktop/Devops-app-dev-cursor"
MONITORING_DIR="$PROJECT_ROOT/monitoring"
COMPOSE_FILE="$MONITORING_DIR/docker-compose.monitoring.yml"

# Create monitoring directory structure
setup_directories() {
    log "🏗️ Setting up monitoring directory structure..."
    
    mkdir -p "$MONITORING_DIR"/{prometheus,grafana,alertmanager,elasticsearch,logstash,kibana}
    mkdir -p "$MONITORING_DIR"/{prometheus/{data,rules},grafana/{data,dashboards,provisioning/{datasources,dashboards}}}
    mkdir -p "$MONITORING_DIR"/{alertmanager/data,elasticsearch/data,logstash/{config,pipeline}}
    
    success "Directory structure created"
}

# Create Prometheus configuration
create_prometheus_config() {
    log "⚙️ Creating Prometheus configuration..."
    
    cat > "$MONITORING_DIR/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'opssight-production'
    region: 'us-east-1'

rule_files:
  - "rules/*.yml"

scrape_configs:
  # OpsSight Backend
  - job_name: 'opssight-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  # Node Exporter (System Metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 15s

  # PostgreSQL Exporter
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 15s

  # Redis Exporter
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 15s

  # Docker Exporter
  - job_name: 'docker-exporter'
    static_configs:
      - targets: ['docker-exporter:9323']
    scrape_interval: 15s

  # Nginx Exporter
  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['nginx-exporter:9113']
    scrape_interval: 15s

  # Blackbox Exporter (Endpoint Monitoring)
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - http://frontend:80
        - http://backend:8000/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Recording rules for better performance
rule_files:
  - "rules/recording_rules.yml"
  - "rules/alert_rules.yml"
EOF
    
    success "Prometheus configuration created"
}

# Create alert rules
create_alert_rules() {
    log "🚨 Creating alert rules..."
    
    # Create alert rules directory
    mkdir -p "$MONITORING_DIR/prometheus/rules"
    
    # Main alert rules
    cat > "$MONITORING_DIR/prometheus/rules/alert_rules.yml" << 'EOF'
groups:
  - name: opssight.critical
    interval: 30s
    rules:
      # Application Alerts
      - alert: HighErrorRate
        expr: rate(opssight_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
          service: application
          team: backend
        annotations:
          summary: "High error rate detected in OpsSight"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 10%)"
          runbook_url: "https://wiki.opssight.com/runbooks/high-error-rate"
          dashboard_url: "https://grafana.opssight.com/d/app-overview"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(opssight_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
          service: application
          team: backend
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s (threshold: 2s)"

      - alert: ApplicationDown
        expr: up{job="opssight-backend"} == 0
        for: 1m
        labels:
          severity: critical
          service: application
          team: backend
        annotations:
          summary: "OpsSight application is down"
          description: "OpsSight backend service is not responding"

      # Database Alerts
      - alert: DatabaseConnectionsHigh
        expr: opssight_db_connections > 80
        for: 2m
        labels:
          severity: warning
          service: database
          team: backend
        annotations:
          summary: "Database connection pool usage high"
          description: "Database connection usage is {{ $value }}% (threshold: 80%)"

      - alert: DatabaseDown
        expr: up{job="postgres-exporter"} == 0
        for: 1m
        labels:
          severity: critical
          service: database
          team: infrastructure
        annotations:
          summary: "PostgreSQL database is down"
          description: "PostgreSQL service is not responding"

      - alert: DatabaseSlowQueries
        expr: rate(pg_stat_activity_max_tx_duration_seconds[5m]) > 10
        for: 3m
        labels:
          severity: warning
          service: database
          team: backend
        annotations:
          summary: "Database slow queries detected"
          description: "Average query duration is {{ $value }}s (threshold: 10s)"

  - name: opssight.infrastructure
    interval: 30s
    rules:
      # System Resource Alerts
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          service: infrastructure
          team: infrastructure
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
          service: infrastructure
          team: infrastructure
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: (1 - (node_filesystem_free_bytes / node_filesystem_size_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
          service: infrastructure
          team: infrastructure
        annotations:
          summary: "Disk space running low"
          description: "Disk usage is {{ $value }}% on {{ $labels.instance }}:{{ $labels.mountpoint }}"

      - alert: DiskSpaceCritical
        expr: (1 - (node_filesystem_free_bytes / node_filesystem_size_bytes)) * 100 > 95
        for: 2m
        labels:
          severity: critical
          service: infrastructure
          team: infrastructure
        annotations:
          summary: "Disk space critically low"
          description: "Disk usage is {{ $value }}% on {{ $labels.instance }}:{{ $labels.mountpoint }}"

  - name: opssight.security
    interval: 15s
    rules:
      # Security Alerts
      - alert: HighFailedLogins
        expr: increase(opssight_login_failures_total[5m]) > 10
        for: 1m
        labels:
          severity: warning
          service: security
          team: security
        annotations:
          summary: "High number of failed login attempts"
          description: "{{ $value }} failed login attempts in the last 5 minutes"

      - alert: SuspiciousSecurityActivity
        expr: increase(opssight_security_events_total{threat_level="high"}[5m]) > 0
        for: 0m
        labels:
          severity: critical
          service: security
          team: security
        annotations:
          summary: "Suspicious security activity detected"
          description: "High-threat security events detected: {{ $value }}"

      - alert: UnauthorizedAPIAccess
        expr: increase(opssight_requests_total{status="401"}[5m]) > 50
        for: 2m
        labels:
          severity: warning
          service: security
          team: security
        annotations:
          summary: "High number of unauthorized API access attempts"
          description: "{{ $value }} unauthorized access attempts in 5 minutes"

  - name: opssight.business
    interval: 60s
    rules:
      # Business KPI Alerts
      - alert: LowDailyActiveUsers
        expr: opssight_daily_active_users < 1000
        for: 30m
        labels:
          severity: warning
          service: business
          team: product
        annotations:
          summary: "Daily active users below threshold"
          description: "DAU is {{ $value }}, below threshold of 1000"

      - alert: HighUserChurnRate
        expr: opssight_user_churn_rate > 0.05
        for: 1h
        labels:
          severity: warning
          service: business
          team: product
        annotations:
          summary: "User churn rate above threshold"
          description: "User churn rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      - alert: RevenueImpact
        expr: opssight_revenue{period="daily"} < 5000
        for: 1h
        labels:
          severity: critical
          service: business
          team: executive
        annotations:
          summary: "Daily revenue below target"
          description: "Daily revenue is ${{ $value }}, below target of $5000"
EOF

    # Recording rules for performance
    cat > "$MONITORING_DIR/prometheus/rules/recording_rules.yml" << 'EOF'
groups:
  - name: opssight.recording_rules
    interval: 30s
    rules:
      # Request rate calculations
      - record: opssight:request_rate_5m
        expr: rate(opssight_requests_total[5m])

      - record: opssight:error_rate_5m
        expr: rate(opssight_requests_total{status=~"5.."}[5m]) / rate(opssight_requests_total[5m])

      # Response time percentiles
      - record: opssight:response_time_p50
        expr: histogram_quantile(0.50, rate(opssight_request_duration_seconds_bucket[5m]))

      - record: opssight:response_time_p95
        expr: histogram_quantile(0.95, rate(opssight_request_duration_seconds_bucket[5m]))

      - record: opssight:response_time_p99
        expr: histogram_quantile(0.99, rate(opssight_request_duration_seconds_bucket[5m]))

      # System resource utilization
      - record: node:cpu_utilization
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

      - record: node:memory_utilization
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

      - record: node:disk_utilization
        expr: (1 - (node_filesystem_free_bytes / node_filesystem_size_bytes)) * 100
EOF

    success "Alert rules created"
}

# Create AlertManager configuration
create_alertmanager_config() {
    log "📢 Creating AlertManager configuration..."
    
    cat > "$MONITORING_DIR/alertmanager/alertmanager.yml" << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@opssight.com'
  smtp_auth_username: 'alerts@opssight.com'
  smtp_auth_password: 'alert_password'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    # Critical alerts go to multiple channels
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 5s
      repeat_interval: 5m

    # Security alerts have special handling
    - match:
        service: security
      receiver: 'security-team'
      group_wait: 0s
      repeat_interval: 1m

    # Business alerts go to product team
    - match:
        service: business
      receiver: 'product-team'
      repeat_interval: 4h

    # Infrastructure alerts
    - match:
        service: infrastructure
      receiver: 'infrastructure-team'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://webhook-service:8080/alerts'
        send_resolved: true

  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@opssight.com'
        subject: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        html: |
          <h2>Critical Alert: {{ .GroupLabels.alertname }}</h2>
          <p><strong>Service:</strong> {{ .GroupLabels.service }}</p>
          <p><strong>Severity:</strong> {{ .CommonLabels.severity }}</p>
          
          {{ range .Alerts }}
          <div style="border: 1px solid #red; margin: 10px; padding: 10px;">
            <h3>{{ .Annotations.summary }}</h3>
            <p>{{ .Annotations.description }}</p>
            <p><strong>Started:</strong> {{ .StartsAt.Format "2006-01-02 15:04:05" }}</p>
            {{ if .Annotations.runbook_url }}
            <p><a href="{{ .Annotations.runbook_url }}">📖 Runbook</a></p>
            {{ end }}
            {{ if .Annotations.dashboard_url }}
            <p><a href="{{ .Annotations.dashboard_url }}">📊 Dashboard</a></p>
            {{ end }}
          </div>
          {{ end }}
    
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts-critical'
        title: '🚨 Critical Alert'
        text: |
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          {{ end }}
        color: 'danger'

  - name: 'security-team'
    email_configs:
      - to: 'security@opssight.com'
        subject: '🔒 SECURITY ALERT: {{ .GroupLabels.alertname }}'
        html: |
          <h2 style="color: red;">🔒 Security Alert</h2>
          {{ range .Alerts }}
          <p><strong>{{ .Annotations.summary }}</strong></p>
          <p>{{ .Annotations.description }}</p>
          <p>Immediate action may be required.</p>
          {{ end }}
    
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SECURITY/WEBHOOK'
        channel: '#security-alerts'
        title: '🔒 Security Alert'
        text: |
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          {{ end }}
        color: 'warning'

  - name: 'product-team'
    email_configs:
      - to: 'product@opssight.com'
        subject: '📊 Business Alert: {{ .GroupLabels.alertname }}'
    
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/PRODUCT/WEBHOOK'
        channel: '#product-alerts'
        title: '📊 Business Metrics Alert'

  - name: 'infrastructure-team'
    email_configs:
      - to: 'infrastructure@opssight.com'
        subject: '🖥️ Infrastructure Alert: {{ .GroupLabels.alertname }}'
    
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/INFRA/WEBHOOK'
        channel: '#infrastructure'
        title: '🖥️ Infrastructure Alert'

inhibit_rules:
  # Inhibit warnings if critical alert is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']

  # Don't alert on high CPU if the application is down
  - source_match:
      alertname: 'ApplicationDown'
    target_match:
      alertname: 'HighCPUUsage'
    equal: ['instance']
EOF

    success "AlertManager configuration created"
}

# Create Grafana provisioning
create_grafana_config() {
    log "📊 Creating Grafana configuration..."
    
    # Datasource provisioning
    cat > "$MONITORING_DIR/grafana/provisioning/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: 15s
      queryTimeout: 60s
      httpMethod: POST

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "opssight-logs-*"
    jsonData:
      interval: Daily
      timeField: "@timestamp"
      esVersion: 70
EOF

    # Dashboard provisioning
    cat > "$MONITORING_DIR/grafana/provisioning/dashboards/dashboards.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'OpsSight Dashboards'
    orgId: 1
    folder: 'OpsSight'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    success "Grafana configuration created"
}

# Create Docker Compose for monitoring stack
create_monitoring_compose() {
    log "🐳 Creating monitoring Docker Compose configuration..."
    
    cat > "$COMPOSE_FILE" << 'EOF'
version: '3.8'

networks:
  monitoring:
    driver: bridge
  opssight-network:
    external: true

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
  elasticsearch_data:

services:
  # Prometheus - Metrics Collection
  prometheus:
    image: prom/prometheus:latest
    container_name: opssight-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
      - '--storage.tsdb.wal-compression'
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules/:/etc/prometheus/rules/:ro
      - prometheus_data:/prometheus
    networks:
      - monitoring
      - opssight-network
    depends_on:
      - node-exporter
      - postgres-exporter
      - redis-exporter

  # AlertManager - Alert Management
  alertmanager:
    image: prom/alertmanager:latest
    container_name: opssight-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    networks:
      - monitoring
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'

  # Grafana - Visualization
  grafana:
    image: grafana/grafana:latest
    container_name: opssight-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SECURITY_DISABLE_GRAVATAR=true
      - GF_SECURITY_COOKIE_SECURE=true
      - GF_SECURITY_COOKIE_SAMESITE=strict
      - GF_ANALYTICS_REPORTING_ENABLED=false
      - GF_ANALYTICS_CHECK_FOR_UPDATES=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel,grafana-clock-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    networks:
      - monitoring
    depends_on:
      - prometheus

  # Node Exporter - System Metrics
  node-exporter:
    image: prom/node-exporter:latest
    container_name: opssight-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

  # PostgreSQL Exporter
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: opssight-postgres-exporter
    restart: unless-stopped
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://opssight:${POSTGRES_PASSWORD:-secure_prod_password}@postgres:5432/opssight_prod?sslmode=disable"
    networks:
      - monitoring
      - opssight-network

  # Redis Exporter
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: opssight-redis-exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    environment:
      REDIS_ADDR: "redis://redis:6379"
      REDIS_PASSWORD: "${REDIS_PASSWORD:-secure_redis_password}"
    networks:
      - monitoring
      - opssight-network

  # Blackbox Exporter - Endpoint Monitoring
  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    container_name: opssight-blackbox-exporter
    restart: unless-stopped
    ports:
      - "9115:9115"
    volumes:
      - ./blackbox/blackbox.yml:/etc/blackbox_exporter/config.yml:ro
    networks:
      - monitoring
      - opssight-network

  # Elasticsearch - Log Storage
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    container_name: opssight-elasticsearch
    restart: unless-stopped
    environment:
      - node.name=elasticsearch
      - cluster.name=opssight-logs
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - monitoring

  # Kibana - Log Visualization
  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    container_name: opssight-kibana
    restart: unless-stopped
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    networks:
      - monitoring
    depends_on:
      - elasticsearch

  # Logstash - Log Processing
  logstash:
    image: docker.elastic.co/logstash/logstash:8.12.0
    container_name: opssight-logstash
    restart: unless-stopped
    volumes:
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      - ./logstash/pipeline/:/usr/share/logstash/pipeline/:ro
    ports:
      - "5044:5044"
      - "9600:9600"
    environment:
      LS_JAVA_OPTS: "-Xmx256m -Xms256m"
    networks:
      - monitoring
    depends_on:
      - elasticsearch

  # Filebeat - Log Shipping
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.12.0
    container_name: opssight-filebeat
    restart: unless-stopped
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - monitoring
    depends_on:
      - logstash
EOF

    success "Monitoring Docker Compose created"
}

# Create Blackbox exporter config
create_blackbox_config() {
    log "🔍 Creating Blackbox exporter configuration..."
    
    mkdir -p "$MONITORING_DIR/blackbox"
    
    cat > "$MONITORING_DIR/blackbox/blackbox.yml" << 'EOF'
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: []
      method: GET
      headers:
        Host: localhost
        Accept-Language: en-US
      no_follow_redirects: false
      fail_if_ssl: false
      fail_if_not_ssl: false
      tls_config:
        insecure_skip_verify: false
      preferred_ip_protocol: "ip4"

  http_post_2xx:
    prober: http
    timeout: 5s
    http:
      method: POST
      headers:
        Content-Type: application/json
      body: '{}'

  tcp_connect:
    prober: tcp
    timeout: 5s

  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"
EOF

    success "Blackbox exporter configuration created"
}

# Create Logstash configuration
create_logstash_config() {
    log "📝 Creating Logstash configuration..."
    
    # Logstash main config
    cat > "$MONITORING_DIR/logstash/config/logstash.yml" << 'EOF'
http.host: "0.0.0.0"
xpack.monitoring.elasticsearch.hosts: [ "http://elasticsearch:9200" ]
path.config: /usr/share/logstash/pipeline
EOF

    # Pipeline configuration
    cat > "$MONITORING_DIR/logstash/pipeline/logstash.conf" << 'EOF'
input {
  beats {
    port => 5044
  }
}

filter {
  # Parse OpsSight backend logs
  if [fields][service] == "opssight-backend" {
    grok {
      match => { 
        "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{DATA:logger}: %{GREEDYDATA:message}" 
      }
      overwrite => [ "message" ]
    }
    
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }
  
  # Parse Nginx access logs
  if [fields][service] == "nginx" {
    grok {
      match => { 
        "message" => "%{NGINXACCESS}" 
      }
    }
  }
  
  # Parse PostgreSQL logs  
  if [fields][service] == "postgresql" {
    grok {
      match => { 
        "message" => "%{TIMESTAMP_ISO8601:timestamp} \[%{POSINT:pid}\] %{WORD:level}: %{GREEDYDATA:message}" 
      }
      overwrite => [ "message" ]
    }
  }
  
  # Add common fields
  mutate {
    add_field => { 
      "environment" => "${ENVIRONMENT:production}"
      "cluster" => "opssight-main"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "opssight-logs-%{+YYYY.MM.dd}"
    template_name => "opssight-logs"
    template_pattern => "opssight-logs-*"
    template => {
      "index_patterns" => ["opssight-logs-*"]
      "settings" => {
        "number_of_shards" => 1
        "number_of_replicas" => 0
        "index.refresh_interval" => "30s"
      }
      "mappings" => {
        "properties" => {
          "@timestamp" => { "type" => "date" }
          "level" => { "type" => "keyword" }
          "service" => { "type" => "keyword" }
          "message" => { "type" => "text" }
          "environment" => { "type" => "keyword" }
        }
      }
    }
  }
  
  # Debug output (remove in production)
  stdout {
    codec => rubydebug
  }
}
EOF

    success "Logstash configuration created"
}

# Create Filebeat configuration
create_filebeat_config() {
    log "📦 Creating Filebeat configuration..."
    
    cat > "$MONITORING_DIR/filebeat/filebeat.yml" << 'EOF'
filebeat.inputs:
  # OpsSight application logs
  - type: log
    enabled: true
    paths:
      - /var/lib/docker/containers/opssight-backend-*/*.log
    fields:
      service: opssight-backend
      environment: production
    fields_under_root: false
    multiline.pattern: '^\d{4}-\d{2}-\d{2}'
    multiline.negate: true
    multiline.match: after

  # Nginx logs
  - type: log
    enabled: true
    paths:
      - /var/lib/docker/containers/opssight-frontend-*/*.log
    fields:
      service: nginx
      environment: production
    fields_under_root: false

  # PostgreSQL logs
  - type: log
    enabled: true
    paths:
      - /var/lib/docker/containers/opssight-postgres-*/*.log
    fields:
      service: postgresql
      environment: production
    fields_under_root: false

output.logstash:
  hosts: ["logstash:5044"]

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_docker_metadata: ~
  - decode_json_fields:
      fields: ["message"]
      target: ""
      overwrite_keys: true

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
EOF

    success "Filebeat configuration created"
}

# Start monitoring stack
start_monitoring() {
    log "🚀 Starting monitoring stack..."
    
    cd "$MONITORING_DIR"
    
    # Start the monitoring stack
    docker-compose -f docker-compose.monitoring.yml up -d
    
    success "Monitoring stack started"
    
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    log "Checking service health..."
    
    # Check Prometheus
    if curl -s http://localhost:9090/-/healthy >/dev/null; then
        success "Prometheus is healthy"
    else
        warn "Prometheus health check failed"
    fi
    
    # Check Grafana
    if curl -s http://localhost:3001/api/health >/dev/null; then
        success "Grafana is healthy" 
    else
        warn "Grafana health check failed"
    fi
    
    # Check AlertManager
    if curl -s http://localhost:9093/-/healthy >/dev/null; then
        success "AlertManager is healthy"
    else
        warn "AlertManager health check failed"
    fi
    
    # Check Elasticsearch
    if curl -s http://localhost:9200/_cluster/health >/dev/null; then
        success "Elasticsearch is healthy"
    else
        warn "Elasticsearch health check failed"
    fi
}

# Display monitoring information
display_monitoring_info() {
    log "📋 Monitoring Stack Information"
    
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            MONITORING STACK DEPLOYED               ║${NC}"
    echo -e "${BLUE}╠══════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC} Prometheus:      http://localhost:9090"
    echo -e "${BLUE}║${NC} Grafana:         http://localhost:3001"
    echo -e "${BLUE}║${NC} AlertManager:    http://localhost:9093"
    echo -e "${BLUE}║${NC} Elasticsearch:   http://localhost:9200"
    echo -e "${BLUE}║${NC} Kibana:          http://localhost:5601"
    echo -e "${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} Default Credentials:"
    echo -e "${BLUE}║${NC}   Grafana: admin/admin"
    echo -e "${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} Key Metrics:"
    echo -e "${BLUE}║${NC}   - Application performance"
    echo -e "${BLUE}║${NC}   - System resources"
    echo -e "${BLUE}║${NC}   - Security events"
    echo -e "${BLUE}║${NC}   - Business KPIs"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    success "🎉 Monitoring setup completed successfully!"
    
    log "📚 Next steps:"
    echo "  1. Access Grafana at http://localhost:3001"
    echo "  2. Import custom dashboards"
    echo "  3. Configure notification channels"
    echo "  4. Set up alert routing rules"
    echo "  5. Test alert notifications"
    echo ""
    log "📖 Management commands:"
    echo "  - View logs: docker-compose -f docker-compose.monitoring.yml logs -f [service]"
    echo "  - Restart: docker-compose -f docker-compose.monitoring.yml restart [service]"
    echo "  - Stop: docker-compose -f docker-compose.monitoring.yml down"
    echo "  - Update: docker-compose -f docker-compose.monitoring.yml pull && docker-compose -f docker-compose.monitoring.yml up -d"
    echo ""
}

# Main function
main() {
    log "🚀 Starting OpsSight Monitoring Setup"
    log "Project root: $PROJECT_ROOT"
    
    # Setup monitoring stack
    setup_directories
    create_prometheus_config
    create_alert_rules
    create_alertmanager_config
    create_grafana_config
    create_blackbox_config
    create_logstash_config
    create_filebeat_config
    create_monitoring_compose
    start_monitoring
    display_monitoring_info
}

# Run main function
main "$@"