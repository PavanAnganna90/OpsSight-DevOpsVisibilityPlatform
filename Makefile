# OpsSight DevOps Platform - Development Makefile
# Comprehensive development environment setup and management

.PHONY: help setup install start stop restart clean test build docs deploy

# Configuration
PYTHON_VERSION := 3.9
NODE_VERSION := 18
COMPOSE_FILE := docker-compose.yml
COMPOSE_FILE_DEV := docker-compose.dev.yml
COMPOSE_FILE_PROD := docker-compose.prod.yml

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
WHITE := \033[0;37m
NC := \033[0m # No Color

# Default target
help: ## Show this help message
	@echo "$(CYAN)OpsSight DevOps Platform - Development Commands$(NC)"
	@echo "=================================================="
	@echo ""
	@echo "$(GREEN)Setup Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(setup|install|init)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(start|stop|restart|dev)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Testing Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(test|lint|check)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Build & Deploy Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(build|deploy|docker)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Maintenance Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(clean|reset|backup|logs)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

# Setup Commands
setup: ## Complete development environment setup
	@echo "$(CYAN)🚀 Setting up OpsSight development environment...$(NC)"
	@$(MAKE) check-dependencies
	@$(MAKE) setup-env
	@$(MAKE) install-backend
	@$(MAKE) install-frontend
	@$(MAKE) setup-git-hooks
	@$(MAKE) setup-database
	@echo "$(GREEN)✅ Setup complete! Run 'make start' to begin development.$(NC)"

check-dependencies: ## Check required dependencies
	@echo "$(BLUE)🔍 Checking dependencies...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)❌ Docker is required but not installed.$(NC)"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "$(RED)❌ Docker Compose is required but not installed.$(NC)"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js $(NODE_VERSION)+ is required but not installed.$(NC)"; exit 1; }
	@command -v python3 >/dev/null 2>&1 || { echo "$(RED)❌ Python $(PYTHON_VERSION)+ is required but not installed.$(NC)"; exit 1; }
	@command -v git >/dev/null 2>&1 || { echo "$(RED)❌ Git is required but not installed.$(NC)"; exit 1; }
	@echo "$(GREEN)✅ All dependencies are installed$(NC)"

setup-env: ## Setup environment files from templates
	@echo "$(BLUE)📝 Setting up environment files...$(NC)"
	@if [ ! -f .env ]; then cp env.example .env && echo "$(YELLOW)📄 Created .env from template$(NC)"; fi
	@if [ ! -f backend/.env ]; then cp backend/env.example backend/.env 2>/dev/null || echo "$(YELLOW)📄 Backend env.example not found, skipping$(NC)"; fi
	@if [ ! -f frontend/.env.local ]; then cp frontend/env.example frontend/.env.local 2>/dev/null || echo "$(YELLOW)📄 Frontend env.example not found, skipping$(NC)"; fi
	@echo "$(GREEN)✅ Environment files created$(NC)"

generate-keys: ## Generate secure keys for environment
	@echo "$(BLUE)🔐 Generating secure keys...$(NC)"
	@echo "SECRET_KEY=$$(openssl rand -base64 32)" >> .env.tmp
	@echo "JWT_SECRET_KEY=$$(openssl rand -base64 32)" >> .env.tmp
	@echo "ENCRYPTION_KEY=$$(openssl rand -base64 32)" >> .env.tmp
	@echo "$(GREEN)✅ Secure keys generated and added to .env.tmp$(NC)"
	@echo "$(YELLOW)⚠️  Please review and copy these keys to your .env file$(NC)"

install-backend: ## Install backend dependencies
	@echo "$(BLUE)🐍 Installing backend dependencies...$(NC)"
	@cd backend && python3 -m venv venv 2>/dev/null || echo "Virtual environment already exists"
	@cd backend && . venv/bin/activate && pip install --upgrade pip
	@cd backend && . venv/bin/activate && pip install -r requirements.txt
	@echo "$(GREEN)✅ Backend dependencies installed$(NC)"

install-frontend: ## Install frontend dependencies
	@echo "$(BLUE)📦 Installing frontend dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)✅ Frontend dependencies installed$(NC)"

setup-git-hooks: ## Setup Git hooks for development
	@echo "$(BLUE)🪝 Setting up Git hooks...$(NC)"
	@chmod +x scripts/*.sh 2>/dev/null || echo "No scripts to make executable"
	@if [ -d .git ]; then \
		echo "#!/bin/bash\nmake lint-staged" > .git/hooks/pre-commit; \
		chmod +x .git/hooks/pre-commit; \
		echo "$(GREEN)✅ Pre-commit hook installed$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Not a git repository, skipping Git hooks$(NC)"; \
	fi

# Development Commands
start: ## Start all development services
	@echo "$(CYAN)🚀 Starting OpsSight development environment...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) up -d --build
	@echo "$(GREEN)✅ Services started$(NC)"
	@$(MAKE) show-urls

start-prod: ## Start production-like environment
	@echo "$(CYAN)🚀 Starting OpsSight production environment...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_PROD) up -d --build
	@echo "$(GREEN)✅ Production services started$(NC)"
	@$(MAKE) show-urls

stop: ## Stop all services
	@echo "$(YELLOW)🛑 Stopping OpsSight services...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) down
	@docker-compose -f $(COMPOSE_FILE_PROD) down 2>/dev/null || true
	@echo "$(GREEN)✅ Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(YELLOW)🔄 Restarting OpsSight services...$(NC)"
	@$(MAKE) stop
	@$(MAKE) start

dev-backend: ## Start backend in development mode
	@echo "$(BLUE)🐍 Starting backend development server...$(NC)"
	@cd backend && . venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev-frontend: ## Start frontend in development mode
	@echo "$(BLUE)⚛️  Starting frontend development server...$(NC)"
	@cd frontend && npm run dev

dev-monitoring: ## Start monitoring stack
	@echo "$(BLUE)📊 Starting monitoring stack...$(NC)"
	@cd monitoring && ./start-monitoring.sh

show-urls: ## Show service URLs
	@echo ""
	@echo "$(CYAN)🌐 Service URLs:$(NC)"
	@echo "  $(YELLOW)Frontend:$(NC)     http://localhost:3000"
	@echo "  $(YELLOW)Backend API:$(NC)  http://localhost:8000"
	@echo "  $(YELLOW)API Docs:$(NC)     http://localhost:8000/docs"
	@echo "  $(YELLOW)Monitoring:$(NC)   http://localhost:3001 (admin/opssight123)"
	@echo "  $(YELLOW)Prometheus:$(NC)   http://localhost:9090"
	@echo "  $(YELLOW)Database:$(NC)     localhost:5432 (postgres/password)"
	@echo ""

# Database Commands
setup-database: ## Setup database with migrations
	@echo "$(BLUE)🗄️  Setting up database...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) up -d postgres redis
	@sleep 5
	@cd backend && . venv/bin/activate && alembic upgrade head
	@echo "$(GREEN)✅ Database setup complete$(NC)"

reset-db: ## Reset database (WARNING: destroys all data)
	@echo "$(RED)⚠️  WARNING: This will destroy all database data!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@docker-compose -f $(COMPOSE_FILE_DEV) down -v
	@docker volume prune -f
	@$(MAKE) setup-database
	@echo "$(GREEN)✅ Database reset complete$(NC)"

seed-data: ## Load sample data into database
	@echo "$(BLUE)🌱 Loading sample data...$(NC)"
	@cd backend && . venv/bin/activate && python app/scripts/seed_data.py
	@echo "$(GREEN)✅ Sample data loaded$(NC)"

db-shell: ## Open database shell
	@echo "$(BLUE)🗄️  Opening database shell...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) exec postgres psql -U postgres -d opssight_dev

# Testing Commands
test: ## Run all tests
	@echo "$(BLUE)🧪 Running all tests...$(NC)"
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@echo "$(GREEN)✅ All tests passed$(NC)"

test-backend: ## Run backend tests
	@echo "$(BLUE)🐍 Running backend tests...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@cd backend && PYTHONPATH=. pytest --maxfail=3 --disable-warnings -v

test-frontend: ## Run frontend tests
	@echo "$(BLUE)⚛️  Running frontend tests...$(NC)"
	@cd frontend && npm test -- --watchAll=false

test-integration: ## Run integration tests
	@echo "$(BLUE)🔗 Running integration tests...$(NC)"
	@cd tests && npm test

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)🎭 Running E2E tests...$(NC)"
	@cd frontend && npm run test:e2e

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)👀 Running tests in watch mode...$(NC)"
	@cd backend && PYTHONPATH=. pytest -f

coverage: ## Generate test coverage report
	@echo "$(BLUE)📊 Generating coverage report...$(NC)"
	@cd backend && PYTHONPATH=. pytest --cov=app --cov-report=html --cov-report=term
	@cd frontend && npm run coverage
	@echo "$(GREEN)✅ Coverage reports generated$(NC)"

# Linting and Code Quality
lint: ## Run all linting
	@echo "$(BLUE)🔍 Running linting...$(NC)"
	@$(MAKE) lint-backend
	@$(MAKE) lint-frontend
	@echo "$(GREEN)✅ Linting complete$(NC)"

lint-backend: ## Lint backend code
	@echo "$(BLUE)🐍 Linting backend...$(NC)"
	@cd backend && . venv/bin/activate && flake8 app/ --max-line-length=100
	@cd backend && . venv/bin/activate && black app/ --check
	@cd backend && . venv/bin/activate && isort app/ --check-only

lint-frontend: ## Lint frontend code
	@echo "$(BLUE)⚛️  Linting frontend...$(NC)"
	@cd frontend && npm run lint

lint-fix: ## Fix linting issues
	@echo "$(BLUE)🔧 Fixing linting issues...$(NC)"
	@cd backend && . venv/bin/activate && black app/
	@cd backend && . venv/bin/activate && isort app/
	@cd frontend && npm run lint:fix
	@echo "$(GREEN)✅ Linting issues fixed$(NC)"

lint-staged: ## Lint only staged files (for git hooks)
	@echo "$(BLUE)🔍 Linting staged files...$(NC)"
	@git diff --cached --name-only --diff-filter=ACM | grep -E "\\.py$$" | xargs -r flake8 || true
	@git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(ts|tsx|js|jsx)$$" | xargs -r npm run lint:check --prefix frontend || true

type-check: ## Run type checking
	@echo "$(BLUE)🔍 Running type checking...$(NC)"
	@cd backend && . venv/bin/activate && mypy app/ --ignore-missing-imports
	@cd frontend && npm run type-check
	@echo "$(GREEN)✅ Type checking complete$(NC)"

# Build Commands
build: ## Build all services for production
	@echo "$(BLUE)🏗️  Building for production...$(NC)"
	@$(MAKE) build-backend
	@$(MAKE) build-frontend
	@echo "$(GREEN)✅ Build complete$(NC)"

build-backend: ## Build backend Docker image
	@echo "$(BLUE)🐍 Building backend image...$(NC)"
	@cd backend && docker build -t opssight/backend:latest .
	@echo "$(GREEN)✅ Backend image built$(NC)"

build-frontend: ## Build frontend for production
	@echo "$(BLUE)⚛️  Building frontend...$(NC)"
	@cd frontend && npm run build
	@cd frontend && docker build -t opssight/frontend:latest .
	@echo "$(GREEN)✅ Frontend built$(NC)"

docker-build: ## Build all Docker images
	@echo "$(BLUE)🐳 Building Docker images...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_PROD) build
	@echo "$(GREEN)✅ Docker images built$(NC)"

# Documentation Commands
docs: ## Generate and serve documentation
	@echo "$(BLUE)📚 Generating documentation...$(NC)"
	@$(MAKE) docs-api
	@echo "$(GREEN)✅ Documentation generated$(NC)"
	@echo "$(YELLOW)📖 API Docs: http://localhost:8000/docs$(NC)"

docs-api: ## Generate API documentation, Postman collection, and changelog
	@echo "$(BLUE)📚 Generating API documentation...$(NC)"
	@mkdir -p backend/docs/api
	@cd backend && . ../.venv/bin/activate && python scripts/generate_docs.py 2>/dev/null || echo "$(YELLOW)⚠️  Could not run generate_docs.py (app needs to be running)$(NC)"
	@echo "$(GREEN)✅ API documentation files created:$(NC)"
	@echo "  $(YELLOW)📄 Postman Collection:$(NC) backend/docs/api/postman_collection.json"
	@echo "  $(YELLOW)📄 API Changelog:$(NC) backend/docs/api/CHANGELOG.md"
	@echo "  $(YELLOW)📄 Complete API Docs:$(NC) backend/docs/api_documentation_complete.md"

docs-serve: ## Serve documentation locally
	@echo "$(BLUE)📚 Serving documentation...$(NC)"
	@cd docs && python3 -m http.server 8080
	@echo "$(YELLOW)📖 Docs available at: http://localhost:8080$(NC)"

# Health Checks
health-check: ## Check health of all services
	@echo "$(BLUE)🏥 Checking service health...$(NC)"
	@curl -f http://localhost:3000 >/dev/null 2>&1 && echo "$(GREEN)✅ Frontend: OK$(NC)" || echo "$(RED)❌ Frontend: DOWN$(NC)"
	@curl -f http://localhost:8000/health >/dev/null 2>&1 && echo "$(GREEN)✅ Backend: OK$(NC)" || echo "$(RED)❌ Backend: DOWN$(NC)"
	@curl -f http://localhost:9090/-/ready >/dev/null 2>&1 && echo "$(GREEN)✅ Prometheus: OK$(NC)" || echo "$(RED)❌ Prometheus: DOWN$(NC)"
	@curl -f http://localhost:3001/api/health >/dev/null 2>&1 && echo "$(GREEN)✅ Grafana: OK$(NC)" || echo "$(RED)❌ Grafana: DOWN$(NC)"

check-db: ## Check database connection
	@echo "$(BLUE)🗄️  Checking database connection...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) exec postgres pg_isready -U postgres >/dev/null 2>&1 && echo "$(GREEN)✅ Database: OK$(NC)" || echo "$(RED)❌ Database: DOWN$(NC)"

# Logging Commands
logs: ## Show logs for all services
	@echo "$(BLUE)📋 Showing service logs...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) logs -f

logs-backend: ## Show backend logs
	@echo "$(BLUE)🐍 Showing backend logs...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) logs -f backend

logs-frontend: ## Show frontend logs
	@echo "$(BLUE)⚛️  Showing frontend logs...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) logs -f frontend

logs-db: ## Show database logs
	@echo "$(BLUE)🗄️  Showing database logs...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) logs -f postgres

# Cleanup Commands
clean: ## Clean up development environment
	@echo "$(YELLOW)🧹 Cleaning up...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) down --remove-orphans
	@docker-compose -f $(COMPOSE_FILE_PROD) down --remove-orphans 2>/dev/null || true
	@docker system prune -f
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type d -name "node_modules" -path "./frontend/node_modules" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup complete$(NC)"

clean-docker: ## Clean Docker images and volumes
	@echo "$(YELLOW)🐳 Cleaning Docker resources...$(NC)"
	@docker-compose -f $(COMPOSE_FILE_DEV) down -v --remove-orphans
	@docker system prune -a -f --volumes
	@echo "$(GREEN)✅ Docker cleanup complete$(NC)"

reset: ## Reset entire development environment
	@echo "$(RED)⚠️  WARNING: This will reset the entire development environment!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@$(MAKE) clean-docker
	@$(MAKE) setup
	@echo "$(GREEN)✅ Environment reset complete$(NC)"

# Backup Commands
backup-db: ## Backup database
	@echo "$(BLUE)💾 Backing up database...$(NC)"
	@mkdir -p backups
	@docker-compose -f $(COMPOSE_FILE_DEV) exec postgres pg_dump -U postgres opssight_dev > backups/db_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Database backup created$(NC)"

restore-db: ## Restore database from backup (requires BACKUP_FILE=path)
	@echo "$(BLUE)📥 Restoring database...$(NC)"
	@if [ -z "$(BACKUP_FILE)" ]; then echo "$(RED)❌ Please specify BACKUP_FILE=path/to/backup.sql$(NC)"; exit 1; fi
	@docker-compose -f $(COMPOSE_FILE_DEV) exec -T postgres psql -U postgres -d opssight_dev < $(BACKUP_FILE)
	@echo "$(GREEN)✅ Database restored$(NC)"

# Deployment Commands
deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)🚀 Deploying to staging...$(NC)"
	@kubectl apply -k k8s/staging
	@echo "$(GREEN)✅ Deployed to staging$(NC)"

deploy-production: ## Deploy to production environment
	@echo "$(BLUE)🚀 Deploying to production...$(NC)"
	@kubectl apply -k k8s/production
	@echo "$(GREEN)✅ Deployed to production$(NC)"

# Utility Commands
ps: ## Show running containers
	@docker-compose -f $(COMPOSE_FILE_DEV) ps

shell-backend: ## Open shell in backend container
	@docker-compose -f $(COMPOSE_FILE_DEV) exec backend bash

shell-frontend: ## Open shell in frontend container
	@docker-compose -f $(COMPOSE_FILE_DEV) exec frontend bash

update-deps: ## Update all dependencies
	@echo "$(BLUE)📦 Updating dependencies...$(NC)"
	@cd backend && . venv/bin/activate && pip install --upgrade -r requirements.txt
	@cd frontend && npm update
	@echo "$(GREEN)✅ Dependencies updated$(NC)"

version: ## Show version information
	@echo "$(CYAN)OpsSight DevOps Platform$(NC)"
	@echo "========================"
	@echo "$(YELLOW)Backend:$(NC)  $$(cd backend && python3 -c 'import app; print(getattr(app, "__version__", "1.0.0"))')"
	@echo "$(YELLOW)Frontend:$(NC) $$(cd frontend && node -p 'require("./package.json").version')"
	@echo "$(YELLOW)Docker:$(NC)   $$(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
	@echo "$(YELLOW)Node.js:$(NC)  $$(node --version)"
	@echo "$(YELLOW)Python:$(NC)   $$(python3 --version | cut -d' ' -f2)"

# Load testing
load-test: ## Run load tests
	@echo "$(BLUE)⚡ Running load tests...$(NC)"
	@cd scripts && ./load-test.sh
	@echo "$(GREEN)✅ Load tests complete$(NC)"

# Security
security-scan: ## Run security scans
	@echo "$(BLUE)🔒 Running security scans...$(NC)"
	@cd backend && . venv/bin/activate && safety check
	@cd frontend && npm audit
	@echo "$(GREEN)✅ Security scans complete$(NC)"

# Migration helpers
migrate: ## Run database migrations
	@echo "$(BLUE)🔄 Running database migrations...$(NC)"
	@cd backend && . venv/bin/activate && alembic upgrade head
	@echo "$(GREEN)✅ Migrations complete$(NC)"

migration: ## Create new database migration (requires MESSAGE="description")
	@echo "$(BLUE)📝 Creating new migration...$(NC)"
	@if [ -z "$(MESSAGE)" ]; then echo "$(RED)❌ Please specify MESSAGE=\"description\"$(NC)"; exit 1; fi
	@cd backend && . venv/bin/activate && alembic revision --autogenerate -m "$(MESSAGE)"
	@echo "$(GREEN)✅ Migration created$(NC)"

# Quick development shortcuts
quick-start: setup start ## Quick setup and start (alias for setup + start)

dev: ## Start development with hot reload
	@echo "$(CYAN)🔥 Starting development with hot reload...$(NC)"
	@$(MAKE) -j2 dev-backend dev-frontend

monitor: ## Open monitoring dashboard
	@echo "$(BLUE)📊 Opening monitoring dashboard...$(NC)"
	@open http://localhost:3001 || xdg-open http://localhost:3001 || echo "$(YELLOW)📊 Monitoring: http://localhost:3001$(NC)"

api-docs: ## Open API documentation
	@echo "$(BLUE)📖 Opening API documentation...$(NC)"
	@open http://localhost:8000/docs || xdg-open http://localhost:8000/docs || echo "$(YELLOW)📖 API Docs: http://localhost:8000/docs$(NC)"