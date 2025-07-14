# OpsSight Backend Makefile
# Development and deployment automation

.PHONY: help install test lint docs clean build run

# Default target
help:
	@echo "OpsSight Backend - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  install    Install dependencies"
	@echo "  run        Run development server"
	@echo "  test       Run test suite"
	@echo "  lint       Run linting and formatting"
	@echo ""
	@echo "Documentation:"
	@echo "  docs       Generate API documentation"
	@echo "  docs-serve Serve documentation locally"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  build      Build Docker image"
	@echo "  clean      Clean temporary files"

# Development
install:
	pip install -r requirements.txt
	pre-commit install

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html

lint:
	black app/ tests/
	isort app/ tests/
	flake8 app/ tests/
	mypy app/

# Documentation
docs:
	@echo "🚀 Generating API documentation..."
	python scripts/generate_docs.py
	@echo "✅ Documentation generated in docs/api/"
	@echo "🌐 View at: http://localhost:8000/docs"

docs-serve:
	@echo "📚 Starting documentation server..."
	@if command -v mkdocs >/dev/null 2>&1; then \
		mkdocs serve; \
	else \
		echo "⚠️  MkDocs not found. Install with: pip install mkdocs mkdocs-material"; \
	fi

# Build & Deploy
build:
	docker build -t opsight-backend:latest .

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf dist/
	rm -rf build/

# Database
db-upgrade:
	alembic upgrade head

db-downgrade:
	alembic downgrade -1

db-revision:
	alembic revision --autogenerate -m "$(message)"

# Cache
cache-clear:
	python -c "from app.core.cache import get_cache_manager; import asyncio; asyncio.run(get_cache_manager().clear_all())"