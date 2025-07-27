# Production-ready FastAPI backend Dockerfile
# Uses requirements.txt instead of Poetry for simpler builds

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

# Copy minimal requirements file (no dependency conflicts)
COPY ./requirements-minimal.txt /code/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy application code
COPY ./app /code/app
COPY ./setup_database.py /code/
COPY ./database.py /code/
COPY ./alembic.ini /code/
COPY ./alembic /code/alembic
COPY ./alembic_migrations /code/alembic_migrations

# Create metrics directory for Prometheus
RUN mkdir -p /tmp/metrics

# Change ownership to non-root user
RUN chown -R appuser:appuser /code /tmp/metrics

# Switch to non-root user
USER appuser

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Expose port
EXPOSE 8000

# Use exec form for proper signal handling with uvicorn for production
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]