#!/bin/bash

# OpsSight Platform Monitoring Stack Startup Script
# Starts Prometheus, Grafana, Loki, Promtail, and all monitoring services

set -e

echo "🚀 Starting OpsSight Monitoring Stack..."
echo "==========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set environment variables
export COMPOSE_PROJECT_NAME=opssight-monitoring
export PROMETHEUS_RETENTION_TIME=30d
export PROMETHEUS_RETENTION_SIZE=10GB
export GRAFANA_ADMIN_PASSWORD=opssight123

# Create necessary directories
echo "📁 Creating monitoring directories..."
mkdir -p {prometheus,grafana,loki,promtail,alertmanager}/data
mkdir -p logs

# Set proper permissions
chmod -R 755 prometheus grafana loki promtail alertmanager
chmod -R 777 logs

# Start the monitoring stack
echo "🔧 Starting monitoring services..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."

# Check Prometheus
echo "Checking Prometheus..."
for i in {1..30}; do
    if curl -s http://localhost:9090/-/ready > /dev/null; then
        echo "✅ Prometheus is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Prometheus failed to start"
        exit 1
    fi
    sleep 2
done

# Check Grafana
echo "Checking Grafana..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo "✅ Grafana is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Grafana failed to start"
        exit 1
    fi
    sleep 2
done

# Check Loki
echo "Checking Loki..."
for i in {1..30}; do
    if curl -s http://localhost:3100/ready > /dev/null; then
        echo "✅ Loki is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Loki failed to start"
        exit 1
    fi
    sleep 2
done

# Check AlertManager
echo "Checking AlertManager..."
for i in {1..30}; do
    if curl -s http://localhost:9093/-/ready > /dev/null; then
        echo "✅ AlertManager is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ AlertManager failed to start"
        exit 1
    fi
    sleep 2
done

# Import Grafana dashboards
echo "📊 Importing Grafana dashboards..."
sleep 5  # Give Grafana more time to fully initialize

# Configure Grafana data sources
echo "🔗 Configuring Grafana data sources..."

# Add Prometheus data source
curl -X POST \
  http://admin:${GRAFANA_ADMIN_PASSWORD}@localhost:3001/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://prometheus:9090",
    "access": "proxy",
    "isDefault": true,
    "basicAuth": false
  }' || echo "Prometheus datasource may already exist"

# Add Loki data source
curl -X POST \
  http://admin:${GRAFANA_ADMIN_PASSWORD}@localhost:3001/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Loki",
    "type": "loki",
    "url": "http://loki:3100",
    "access": "proxy",
    "basicAuth": false
  }' || echo "Loki datasource may already exist"

# Add Jaeger data source
curl -X POST \
  http://admin:${GRAFANA_ADMIN_PASSWORD}@localhost:3001/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jaeger",
    "type": "jaeger",
    "url": "http://jaeger:16686",
    "access": "proxy",
    "basicAuth": false
  }' || echo "Jaeger datasource may already exist"

# Show service status
echo ""
echo "🎉 OpsSight Monitoring Stack Started Successfully!"
echo "=================================================="
echo ""
echo "📊 Service URLs:"
echo "  • Grafana:       http://localhost:3001 (admin/opssight123)"
echo "  • Prometheus:    http://localhost:9090"
echo "  • AlertManager:  http://localhost:9093"
echo "  • Loki:          http://localhost:3100"
echo "  • Jaeger:        http://localhost:16686"
echo "  • Uptime Kuma:   http://localhost:3002"
echo ""
echo "🔍 Monitoring Components:"
echo "  • Node Exporter: http://localhost:9100/metrics"
echo "  • cAdvisor:      http://localhost:8080"
echo "  • Redis Export:  http://localhost:9121/metrics"
echo "  • DB Exporter:   http://localhost:9187/metrics"
echo ""
echo "📋 Next Steps:"
echo "  1. Access Grafana and explore the pre-built dashboards"
echo "  2. Configure alert notification channels in AlertManager"
echo "  3. Set up log forwarding from your applications to Promtail"
echo "  4. Configure uptime monitoring in Uptime Kuma"
echo ""
echo "🔧 Management Commands:"
echo "  • View logs:     docker-compose -f docker-compose.monitoring.yml logs -f [service]"
echo "  • Stop stack:    docker-compose -f docker-compose.monitoring.yml down"
echo "  • Restart:       docker-compose -f docker-compose.monitoring.yml restart [service]"
echo ""

# Show running containers
echo "🐳 Running Containers:"
docker-compose -f docker-compose.monitoring.yml ps

echo ""
echo "✨ Monitoring stack is ready for use!"
echo "Check the service URLs above to access the monitoring tools."