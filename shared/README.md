# Shared

Shared utilities, types, and components used across multiple services in the OpsSight platform.

## Overview

Common code shared between:
- Frontend (React/Next.js)
- Backend (FastAPI/Python)
- Mobile (React Native)
- ML (Python)

## Contents

### Types & Interfaces
- TypeScript definitions for API contracts
- Python type annotations and Pydantic models
- Shared data structures and schemas

### Utilities
- Date/time formatting and timezone handling
- Validation helpers
- Common constants and configuration
- Logging utilities
- Error handling patterns

### Components
- UI components shared between web and mobile
- Chart and visualization components
- Form components with validation

### API Contracts
- OpenAPI specifications
- GraphQL schemas
- WebSocket event definitions
- Error response formats

## Directory Structure

```
shared/
├── types/               # TypeScript and Python type definitions
│   ├── api/            # API request/response types
│   ├── models/         # Data model definitions
│   └── events/         # Event type definitions
├── utils/              # Utility functions
│   ├── validation/     # Input validation helpers
│   ├── formatting/     # Data formatting utilities
│   ├── constants/      # Application constants
│   └── helpers/        # General helper functions
├── components/         # Shared UI components
│   ├── charts/         # Chart and visualization components
│   ├── forms/          # Form components
│   └── common/         # Common UI elements
├── schemas/            # API and data schemas
│   ├── openapi/        # OpenAPI specifications
│   ├── graphql/        # GraphQL schemas
│   └── validation/     # Validation schemas
└── configs/            # Shared configuration files
    ├── environments/   # Environment-specific configs
    ├── themes/         # Theme definitions
    └── defaults/       # Default configurations
```

## Usage

### TypeScript/JavaScript
```typescript
import { UserModel, ApiResponse } from '@shared/types';
import { formatDate, validateEmail } from '@shared/utils';
```

### Python
```python
from shared.types import UserModel, ApiResponse
from shared.utils import format_date, validate_email
```

## Development

```bash
# Install dependencies for TypeScript
cd shared && npm install

# Install dependencies for Python
pip install -r requirements.txt

# Run tests
npm test  # TypeScript tests
pytest   # Python tests

# Type checking
npm run type-check  # TypeScript
mypy .             # Python
```

## Getting Started

See [Shared Library Guide](../docs/shared-library.md) for detailed usage instructions. 