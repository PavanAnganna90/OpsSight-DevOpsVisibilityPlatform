# Integration Tests

End-to-end and integration tests for the OpsSight platform.

## Overview

Comprehensive testing suite covering:
- Cross-service integration tests
- End-to-end user workflow tests
- API contract testing
- Performance and load testing
- Security and compliance testing

## Test Types

### Integration Tests
- API integration between frontend and backend
- Database integration tests
- External service integration (AWS, GitHub, etc.)
- Mobile app integration with backend APIs

### End-to-End Tests
- Complete user workflows
- Cross-platform functionality
- Real-time feature testing
- Authentication and authorization flows

### Contract Tests
- API contract validation
- Schema compliance testing
- Service interface verification
- Version compatibility tests

### Performance Tests
- Load testing for high traffic
- Stress testing for peak loads
- Scalability testing
- Response time validation

### Security Tests
- Authentication and authorization
- Input validation and sanitization
- SQL injection prevention
- XSS protection testing

## Directory Structure

```
tests/
├── integration/         # Integration test suites
│   ├── api/            # API integration tests
│   ├── database/       # Database integration tests
│   ├── services/       # External service tests
│   └── mobile/         # Mobile app integration tests
├── e2e/                # End-to-end test suites
│   ├── user-workflows/ # Complete user journey tests
│   ├── cross-platform/ # Multi-platform tests
│   ├── real-time/      # Real-time feature tests
│   └── auth/           # Authentication flow tests
├── contract/           # Contract testing
│   ├── api-contracts/  # API contract tests
│   ├── schemas/        # Schema validation tests
│   └── interfaces/     # Service interface tests
├── performance/        # Performance testing
│   ├── load/           # Load testing scripts
│   ├── stress/         # Stress testing scripts
│   ├── scalability/    # Scalability tests
│   └── benchmarks/     # Performance benchmarks
├── security/           # Security testing
│   ├── auth/           # Authentication tests
│   ├── validation/     # Input validation tests
│   ├── injection/      # Injection attack tests
│   └── xss/            # XSS protection tests
├── fixtures/           # Test data and fixtures
│   ├── data/           # Test datasets
│   ├── mocks/          # Mock services
│   └── configs/        # Test configurations
└── utils/              # Test utilities
    ├── helpers/        # Test helper functions
    ├── reporters/      # Custom test reporters
    └── setup/          # Test environment setup
```

## Tech Stack

- **Playwright**: End-to-end testing
- **Jest**: Unit and integration testing
- **Supertest**: API testing
- **Artillery**: Load testing
- **OWASP ZAP**: Security testing
- **TestContainers**: Integration test environments
- **Allure**: Test reporting

## Running Tests

### All Tests
```bash
# Run all integration tests
npm run test:integration

# Run all e2e tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security
```

### Specific Test Suites
```bash
# API integration tests
npm run test:api-integration

# Database integration tests
npm run test:db-integration

# User workflow e2e tests
npm run test:e2e-workflows

# Load testing
npm run test:load

# Contract testing
npm run test:contracts
```

### Test Environment Setup
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run database migrations for testing
npm run migrate:test

# Seed test data
npm run seed:test

# Clean up test environment
docker-compose -f docker-compose.test.yml down
```

## CI/CD Integration

Tests are automatically run in GitHub Actions:
- Integration tests on every PR
- E2E tests on merge to main
- Performance tests on nightly builds
- Security tests on release candidates

## Configuration

### Environment Variables
```bash
# Test database
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/opssight_test

# Test API endpoints
TEST_API_BASE_URL=http://localhost:3001

# Test credentials
TEST_GITHUB_TOKEN=your_test_token
TEST_AWS_ACCESS_KEY=your_test_key
```

### Test Data Management
- Fixtures are stored in `fixtures/data/`
- Test databases are automatically seeded
- Mock services are available in `fixtures/mocks/`
- Test configurations in `fixtures/configs/`

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data after tests
3. **Reliability**: Tests should be deterministic and repeatable
4. **Speed**: Optimize test execution time
5. **Coverage**: Aim for comprehensive test coverage
6. **Documentation**: Document complex test scenarios

## Getting Started

See [Testing Guide](../docs/testing-guide.md) for detailed testing instructions and best practices. 