# OpsSight Platform - Development Guide

Complete guide for setting up and developing the OpsSight DevOps Platform locally.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │   Infrastructure│
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (AWS/K8s)     │
│   Port: 3000    │    │   Port: 8000    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Monitoring    │
│   Port: 5432    │    │   Port: 6379    │    │  (Prometheus)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ and pip
- **Docker** and Docker Compose
- **Git** for version control
- **VS Code** (recommended with extensions)

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/opssight-platform
cd opssight-platform

# Install VS Code extensions (if using VS Code)
code --install-extension ms-python.python
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start the frontend server
npm run dev
```

### 4. Database Setup

#### Using Docker (Recommended)
```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Check if services are running
docker-compose -f docker-compose.dev.yml ps
```

#### Using Local Installation
```bash
# Install PostgreSQL locally
# macOS: brew install postgresql redis
# Ubuntu: sudo apt install postgresql postgresql-contrib redis-server

# Start services
# macOS: brew services start postgresql redis
# Ubuntu: sudo systemctl start postgresql redis-server

# Create database
createdb opssight_dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (opssight_dev)
- **Redis**: localhost:6379

## 🛠️ Development Workflow

### VS Code Integration

The project includes comprehensive VS Code configuration:

- **Launch Configurations**: Debug frontend, backend, and full-stack
- **Tasks**: Build, test, lint, and format commands
- **Extensions**: Recommended extensions for optimal development
- **Settings**: Consistent formatting and linting

### Available Scripts

#### Frontend Scripts
```bash
cd frontend

npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests with Playwright
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking
```

#### Backend Scripts
```bash
cd backend

# Development
uvicorn app.main:app --reload

# Testing
pytest tests/ -v --cov=app
pytest tests/ -k "test_specific"

# Code Quality
black .              # Format code
isort .              # Sort imports
flake8 .             # Linting
mypy .               # Type checking

# Database
alembic upgrade head         # Apply migrations
alembic revision --autogenerate -m "Description"  # Create migration
```

### Docker Development

```bash
# Start all services (frontend, backend, database)
docker-compose -f docker-compose.dev.yml up

# Start specific services
docker-compose -f docker-compose.dev.yml up postgres redis

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Rebuild after changes
docker-compose -f docker-compose.dev.yml up --build
```

## 🧪 Testing

### Frontend Testing

```bash
cd frontend

# Unit tests with Jest
npm run test

# E2E tests with Playwright
npm run test:e2e

# Coverage report
npm run test:coverage

# Visual regression tests
npm run test:visual
```

### Backend Testing

```bash
cd backend

# Unit tests
pytest tests/

# Integration tests
pytest tests/integration/

# API tests
pytest tests/api/

# Coverage report
pytest tests/ --cov=app --cov-report=html
```

### Full Test Suite

```bash
# Run all tests from project root
make test

# Or using scripts
./scripts/run-all-tests.sh
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/opssight_dev
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET_KEY=your-secret-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# External Services
SLACK_BOT_TOKEN=xoxb-your-slack-token
PROMETHEUS_URL=http://localhost:9090

# Development
DEBUG=true
ENVIRONMENT=development
LOG_LEVEL=INFO
```

#### Frontend (.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Authentication
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# Development
NEXT_PUBLIC_ENV=development
```

### Database Configuration

```python
# backend/app/core/config.py
DATABASE_URL = "postgresql://postgres:password@localhost:5432/opssight_dev"
TEST_DATABASE_URL = "postgresql://postgres:password@localhost:5432/opssight_test"
```

## 🐛 Debugging

### VS Code Debugging

1. **Frontend Debugging**:
   - Set breakpoints in TypeScript/React code
   - Run "Frontend: Debug Next.js" configuration
   - Debug in VS Code integrated terminal

2. **Backend Debugging**:
   - Set breakpoints in Python code
   - Run "Backend: Debug FastAPI" configuration
   - Step through API requests and business logic

3. **Full-Stack Debugging**:
   - Run "Full Stack: Frontend + Backend" compound configuration
   - Debug both services simultaneously

### Browser Debugging

- **React DevTools**: Install browser extension
- **Redux DevTools**: For state management debugging
- **Network Tab**: Monitor API requests
- **Console**: Check for JavaScript errors

### Database Debugging

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d opssight_dev

# Common queries
\dt                    # List tables
\d table_name          # Describe table
SELECT * FROM users;   # Query data

# Check connections
SELECT * FROM pg_stat_activity;
```

## 📊 Monitoring and Observability

### Local Monitoring Stack

```bash
# Start monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Access monitoring tools
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
# AlertManager: http://localhost:9093
```

### Application Metrics

The application exposes metrics at:
- **Backend**: http://localhost:8000/metrics
- **Frontend**: Built-in Next.js analytics

### Logging

```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend logs (browser console)
# Docker logs
docker-compose logs -f backend frontend
```

## 🔐 Security

### Development Security

```bash
# Security scanning
npm audit                    # Frontend dependencies
pip-audit                   # Backend dependencies
docker scout cves           # Container vulnerabilities

# Code security
bandit -r backend/app/      # Python security issues
eslint frontend/src/ --ext .ts,.tsx  # JavaScript security
```

### HTTPS in Development

```bash
# Generate self-signed certificates
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes

# Update docker-compose.dev.yml to use HTTPS
```

## 🎯 Performance Optimization

### Frontend Performance

```bash
# Bundle analysis
npm run analyze

# Lighthouse CI
npm run lighthouse

# Performance monitoring
npm run build && npm run start
```

### Backend Performance

```bash
# Profile API endpoints
py-spy top --pid $(pgrep -f uvicorn)

# Database query analysis
# Enable query logging in PostgreSQL configuration
```

## 📱 Mobile Development

```bash
cd mobile

# Install dependencies
npm install

# Start Metro bundler
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

## 🚢 Deployment

### Local Kubernetes

```bash
# Start local Kubernetes (Docker Desktop, minikube, or kind)
kubectl cluster-info

# Deploy to local cluster
kubectl apply -k k8s/base/

# Port forward to access services
kubectl port-forward svc/frontend 3000:3000
kubectl port-forward svc/backend 8000:8000
```

### Staging Deployment

```bash
# Deploy to staging environment
./scripts/deploy.sh -e staging -a apply

# Check deployment status
kubectl get pods -n opssight-staging
```

## 🤝 Contributing

### Code Style

- **Frontend**: ESLint + Prettier configuration
- **Backend**: Black + isort + flake8 + mypy
- **Commit Messages**: Conventional Commits format

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Run full test suite
4. Update documentation if needed
5. Submit PR with clear description

### Code Review Checklist

- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance impact considered

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # Backend
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
brew services list | grep postgresql  # macOS
systemctl status postgresql           # Linux

# Reset database
dropdb opssight_dev && createdb opssight_dev
alembic upgrade head
```

#### Node Modules Issues
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Python Environment Issues
```bash
# Recreate virtual environment
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Getting Help

- **Documentation**: Check `/docs` directory
- **Issues**: Create GitHub issue with reproduction steps
- **Discussions**: Use GitHub Discussions for questions
- **Team Chat**: Slack #dev-platform channel

## 📚 Additional Resources

- [API Documentation](./docs/api-documentation.md)
- [Architecture Guide](./docs/architecture.md)
- [Deployment Guide](./docs/deployment/README.md)
- [Security Guide](./docs/security-guide.md)
- [Testing Strategy](./docs/testing-strategy.md)

---

**Happy Coding! 🚀**