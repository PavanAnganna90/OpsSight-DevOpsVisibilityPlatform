# OpsSight Platform - Quick Start Guide

Get OpsSight running in 5 minutes with this streamlined setup guide.

## 🎯 Prerequisites

- **Docker & Docker Compose** - For containerized services
- **Node.js 18+** - For frontend development
- **Python 3.9+** - For backend development
- **Git** - For version control

## 🚀 Quick Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/opssight-platform
cd opssight-platform
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Generate secure keys
make generate-keys  # or manually edit .env with secure values
```

### 3. Start Services

```bash
# Start all services with one command
make start

# This will:
# - Start PostgreSQL and Redis containers
# - Install frontend and backend dependencies
# - Run database migrations
# - Start development servers
```

### 4. Access Platform

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | GitHub OAuth |
| **Backend API** | http://localhost:8000 | API documentation |
| **Monitoring** | http://localhost:3001 | admin/opssight123 |
| **Database** | localhost:5432 | postgres/password |

## 🔐 Initial Setup

### 1. GitHub OAuth Setup

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/callback`
3. Copy Client ID and Secret to `.env`:
   ```bash
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

### 2. First Login

1. Visit http://localhost:3000
2. Click "Sign in with GitHub"
3. Authorize the application
4. You'll be redirected to the dashboard

## 📊 Initial Configuration

### 1. Connect Your First Repository

```bash
# Via API
curl -X POST http://localhost:8000/api/v1/repositories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-project",
    "url": "https://github.com/username/repo",
    "github_owner": "username",
    "github_repo": "repo"
  }'
```

### 2. Set Up Monitoring

The monitoring stack starts automatically. Access Grafana at http://localhost:3001:

- **Username**: admin
- **Password**: opssight123

Pre-configured dashboards include:
- System Overview
- Application Performance
- Infrastructure Monitoring
- Security Dashboard

## 🔧 Development Workflow

### Backend Development

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest tests/
```

### Frontend Development

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test
```

## 🛠️ Common Commands

```bash
# Start all services
make start

# Stop all services
make stop

# View logs
make logs

# Run tests
make test

# Reset database
make reset-db

# Generate API documentation
make docs

# Build for production
make build
```

## 🔍 Verify Installation

### Health Checks

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend (should return HTML)
curl http://localhost:3000

# Check database connection
make check-db

# Check monitoring stack
curl http://localhost:9090/-/ready  # Prometheus
curl http://localhost:3001/api/health  # Grafana
```

### Test Data

```bash
# Load sample data
make seed-data

# This creates:
# - Sample users and teams
# - Example repositories
# - Demo projects
# - Test CI/CD pipelines
```

## 🚨 Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using ports
lsof -i :3000,8000,5432,6379

# Kill processes if needed
kill -9 PID
```

### Database Issues

```bash
# Reset database completely
make reset-db

# Check database logs
docker logs opssight-postgres

# Manual database access
make db-shell
```

### Permission Issues

```bash
# Fix file permissions
chmod +x scripts/*.sh
sudo chown -R $USER:$USER .
```

### Service Startup Issues

```bash
# Check service status
docker-compose ps

# View detailed logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]
```

## 📚 Next Steps

Once everything is running:

1. **[Installation Guide](./installation.md)** - Detailed installation options
2. **[Configuration Guide](./configuration.md)** - Advanced configuration
3. **[Development Setup](../development/setup.md)** - Development environment
4. **[API Reference](../development/api-reference.md)** - API documentation
5. **[Features Overview](../features/)** - Platform capabilities

## 🆘 Getting Help

- **Documentation**: Check the `/docs` directory
- **Issues**: Create GitHub issue with logs
- **Logs**: `make logs` or `docker-compose logs -f`
- **Health**: `make health-check`

---

**🎉 Welcome to OpsSight! Your DevOps platform is ready.**