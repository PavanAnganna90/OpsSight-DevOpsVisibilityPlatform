# Simple Python backend Dockerfile for OpsSight Backend

FROM python:3.14-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements-minimal.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-minimal.txt || \
    pip install --no-cache-dir fastapi uvicorn python-dotenv

# Copy application code
COPY simple_server.py ./

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Start the application
CMD ["python", "simple_server.py"]