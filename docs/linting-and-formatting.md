# Linting and Formatting Configuration

This document describes the linting and formatting tools configured for the OpsSight project.

## Overview

The project uses automated tools to maintain code quality and consistency:

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Black**: Python code formatting  
- **isort**: Python import sorting
- **mypy**: Python static type checking

## Pre-commit Hooks

Git hooks are configured to run quality checks before commits:

```bash
# Install pre-commit hooks
npm run prepare

# Manually run all hooks
npm run lint:all
```

## Configuration Files

### ESLint Configuration (.eslintrc.js)
Already configured with:
- TypeScript support
- React/React Native rules
- Jest testing rules
- Module-specific overrides

### Prettier Configuration (.prettierrc.js)
Already configured with:
- Consistent formatting rules
- File-specific overrides
- Integration with ESLint

### Python Configuration (pyproject.toml)
Already configured with:
- Black formatting
- isort import sorting
- mypy type checking
- pytest testing
- flake8 linting

## IDE Integration

### VS Code Settings
Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.linting.mypyEnabled": true
}
```

## CI/CD Integration

Quality checks run automatically in CI pipeline:
- Linting failures block PR merges
- Formatting inconsistencies trigger failures
- Type checking errors prevent deployment

## Manual Usage

### TypeScript/JavaScript
```bash
# Lint all files
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format all files
npm run format
```

### Python
```bash
# Format code
black backend/ ml/ 

# Sort imports
isort backend/ ml/

# Type checking
mypy backend/ ml/

# Linting
flake8 backend/ ml/
```

## Troubleshooting

### Common Issues

1. **ESLint conflicts with Prettier**
   - Configuration already resolves this
   - Run `npm run lint:fix` to apply fixes

2. **Python import order issues**
   - Run `isort .` to fix import ordering
   - Check `.isort.cfg` for configuration

3. **Type checking errors**
   - Add type hints where missing
   - Use `# type: ignore` sparingly for third-party issues

### Getting Help

- Check existing configuration files first
- Review error messages carefully
- Ask team for guidance on complex cases 