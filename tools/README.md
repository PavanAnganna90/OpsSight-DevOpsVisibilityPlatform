# Development Tools

Development utilities, scripts, and tooling for the OpsSight platform.

## Overview

Development tools and automation scripts for:
- Code generation and scaffolding
- Database migrations and seeding
- Testing utilities and fixtures
- Build and deployment automation
- Development environment setup
- Code quality and linting tools

## Contents

### Code Generation
- Component generators for React/React Native
- API endpoint scaffolding
- Database model generators
- Test file generators

### Database Tools
- Migration scripts
- Seed data generators
- Database backup and restore utilities
- Schema validation tools

### Testing Tools
- Test data factories
- Mock data generators
- Integration test helpers
- Performance testing utilities

### Build Tools
- Custom build scripts
- Asset optimization tools
- Environment configuration generators
- Docker image builders

### Development Utilities
- Local development setup scripts
- Environment switchers
- Log analyzers
- Performance profilers

## Directory Structure

```
tools/
├── generators/          # Code generation scripts
│   ├── component/      # Component scaffolding
│   ├── api/           # API endpoint generation
│   ├── model/         # Database model generation
│   └── test/          # Test file generation
├── database/           # Database utilities
│   ├── migrations/    # Migration scripts
│   ├── seeders/       # Data seeding scripts
│   ├── backup/        # Backup and restore tools
│   └── validators/    # Schema validation
├── testing/            # Testing utilities
│   ├── factories/     # Test data factories
│   ├── mocks/         # Mock generators
│   ├── fixtures/      # Test fixtures
│   └── helpers/       # Test helper functions
├── build/              # Build and deployment tools
│   ├── scripts/       # Custom build scripts
│   ├── docker/        # Docker utilities
│   ├── assets/        # Asset processing tools
│   └── deploy/        # Deployment scripts
└── dev/               # Development utilities
    ├── setup/         # Environment setup scripts
    ├── config/        # Configuration generators
    ├── logs/          # Log analysis tools
    └── profiling/     # Performance profiling
```

## Usage

### Component Generation
```bash
# Generate React component
./tools/generators/component/create-component.sh UserDashboard

# Generate API endpoint
./tools/generators/api/create-endpoint.sh users

# Generate database model
./tools/generators/model/create-model.sh UserProfile
```

### Database Operations
```bash
# Run migrations
./tools/database/migrations/migrate.sh up

# Seed development data
./tools/database/seeders/seed-dev-data.sh

# Backup database
./tools/database/backup/backup-db.sh production
```

### Testing
```bash
# Generate test data
./tools/testing/factories/generate-test-data.sh

# Run integration tests
./tools/testing/run-integration-tests.sh

# Performance testing
./tools/testing/run-load-tests.sh
```

### Development Setup
```bash
# Initial project setup
./tools/dev/setup/init-project.sh

# Switch environment
./tools/dev/config/switch-env.sh staging

# Analyze logs
./tools/dev/logs/analyze-logs.sh error
```

## Requirements

- Node.js 18+ (for JavaScript tools)
- Python 3.11+ (for Python tools)
- Docker (for containerized tools)
- PostgreSQL client (for database tools)

## Getting Started

See [Development Tools Guide](../docs/development-tools.md) for detailed usage instructions. 