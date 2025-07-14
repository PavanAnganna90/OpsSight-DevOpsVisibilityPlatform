# Multi-stage build for FastAPI backend following Context7 best practices

# Stage 1: Build stage for dependencies
FROM python:3.11-slim as requirements-stage

WORKDIR /tmp

# Install Poetry for dependency management
RUN pip install poetry

# Copy dependency files
COPY ./pyproject.toml ./poetry.lock* /tmp/

# Export dependencies to requirements.txt (without Poetry in final image)
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

# Stage 2: Production stage
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        gcc \
        libc6-dev \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /code

# Copy requirements from build stage
COPY --from=requirements-stage /tmp/requirements.txt /code/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy application code
COPY ./app /code/app

# Change ownership to non-root user
RUN chown -R appuser:appuser /code

# Switch to non-root user
USER appuser

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Use exec form for proper signal handling (Context7 recommendation)
CMD ["fastapi", "run", "app/main.py", "--port", "80", "--proxy-headers"] 