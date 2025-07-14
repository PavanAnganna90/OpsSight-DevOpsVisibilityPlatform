# Multi-stage build for Next.js frontend

# Stage 1: Dependencies stage
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN \
    if [ -f pnpm-lock.yaml ]; then \
        corepack enable pnpm && pnpm install --frozen-lockfile; \
    else \
        npm ci --only=production && npm cache clean --force; \
    fi

# Stage 2: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN \
    if [ -f pnpm-lock.yaml ]; then \
        corepack enable pnpm && pnpm build; \
    else \
        npm run build; \
    fi

# Stage 3: Production stage
FROM node:20-alpine AS production

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

# Expose port
EXPOSE 80

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# =============================================================================
# Development Dockerfile
# =============================================================================
FROM node:20-alpine AS development

WORKDIR /app

# Install all dependencies including dev dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Create development user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port for development
EXPOSE 3000

# Set development environment
ENV NODE_ENV development
ENV NEXT_TELEMETRY_DISABLED 1

# Health check for development
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# =============================================================================
# Testing Dockerfile
# =============================================================================
FROM node:20-alpine AS testing

WORKDIR /app

# Install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Install additional testing tools
RUN npx playwright install --with-deps

# Copy source code
COPY . .

# Create test user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

# Set test environment
ENV NODE_ENV test
ENV CI true

# Run tests
CMD ["npm", "run", "test:ci"]

# =============================================================================
# Build Arguments Documentation
# =============================================================================
# Build arguments that can be passed during docker build:
#
# --build-arg NODE_ENV=production
# --build-arg NEXT_PUBLIC_APP_NAME=OpsSight
# --build-arg NEXT_PUBLIC_APP_VERSION=1.0.0
# --build-arg NEXT_PUBLIC_APP_ENV=production
# --build-arg NEXT_PUBLIC_APP_URL=https://opssight.com
# --build-arg NEXT_PUBLIC_API_URL=https://api.opssight.com
#
# Example build commands:
#
# Production build:
# docker build --target runner --tag opssight:latest .
#
# Development build:
# docker build --target development --tag opssight:dev .
#
# Testing build:
# docker build --target testing --tag opssight:test .
#
# Multi-platform build:
# docker buildx build --platform linux/amd64,linux/arm64 --tag opssight:latest . 