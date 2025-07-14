# Contributing to OpsSight DevOps Platform

Thank you for your interest in contributing to OpsSight! This document provides guidelines and information for contributors to help make the contribution process smooth and effective.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contributing Guidelines](#contributing-guidelines)
5. [Code Standards](#code-standards)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)
9. [Issue Reporting](#issue-reporting)
10. [Community](#community)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project team. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ and npm 8+
- Python 3.9+ and pip
- Docker and Docker Compose
- Git
- A GitHub account

### First-Time Setup

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/opsight-devops-platform.git
   cd opsight-devops-platform
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/your-org/opsight-devops-platform.git
   ```

3. **Install Dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

4. **Setup Environment**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp frontend/.env.local.example frontend/.env.local
   
   # Edit configuration files as needed
   ```

5. **Run the Application**
   ```bash
   # Start the full development environment
   docker-compose up -d
   
   # Or run components separately
   cd frontend && npm run dev
   cd backend && uvicorn app.main:app --reload
   ```

## Development Setup

### Development Environment

#### Frontend Development
```bash
cd frontend

# Start development server
npm run dev

# Run Storybook
npm run storybook

# Run tests
npm run test
npm run test:watch
npm run test:coverage

# Code quality checks
npm run lint
npm run lint:fix
npm run type-check
npm run format
```

#### Backend Development
```bash
cd backend

# Start development server
uvicorn app.main:app --reload --port 8000

# Run tests
python -m pytest
python -m pytest --cov

# Code quality checks
black .
isort .
flake8 .
mypy .
```

### Pre-commit Hooks
```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

## Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

1. **Bug Reports**: Help us identify and fix issues
2. **Feature Requests**: Suggest new functionality
3. **Code Contributions**: Implement bug fixes or new features
4. **Documentation**: Improve or add to our documentation
5. **Testing**: Add tests to improve coverage
6. **Performance**: Optimize existing code
7. **UI/UX**: Improve user experience and design

### Finding Issues to Work On

- **Good First Issues**: Look for issues labeled `good first issue`
- **Help Wanted**: Issues labeled `help wanted` are great for new contributors
- **Bug Reports**: Issues labeled `bug` that need fixing
- **Feature Requests**: Issues labeled `enhancement` or `feature`

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Comment on the issue** you want to work on
3. **Wait for maintainer approval** before starting work
4. **Ask questions** if anything is unclear

## Code Standards

### Frontend Standards

#### TypeScript Guidelines
```typescript
// Use explicit types
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

// Use functional components with hooks
const UserCard: React.FC<UserCardProps> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <Card>
      <Card.Header>
        <h3>{user.name}</h3>
      </Card.Header>
      <Card.Content>
        {/* Component content */}
      </Card.Content>
    </Card>
  );
};
```

#### CSS/Tailwind Guidelines
```typescript
// Use utility classes with proper grouping
const buttonClasses = cn(
  'px-4 py-2 rounded-lg font-medium transition-colors',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
  variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  disabled && 'opacity-50 cursor-not-allowed'
);
```

### Backend Standards

#### Python Guidelines
```python
# Use type hints
from typing import Optional, List

async def get_user(user_id: int) -> Optional[User]:
    """Get user by ID."""
    return await user_repository.get_by_id(user_id)

# Use dataclasses for data structures
@dataclass
class UserResponse:
    id: int
    name: str
    email: str
    created_at: datetime
```

#### FastAPI Guidelines
```python
# Use dependency injection
@app.get("/api/v1/users/{user_id}")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Get user by ID."""
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.from_orm(user)
```

## Testing Requirements

### Test Coverage

We aim for:
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical user paths
- **End-to-End Tests**: Main user workflows
- **Accessibility Tests**: WCAG 2.1 AA compliance

### Frontend Testing

#### Unit Tests
```typescript
describe('UserCard', () => {
  it('renders user information', () => {
    const user = { id: 1, name: 'John Doe', email: 'john@example.com' };
    render(<UserCard user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

### Backend Testing

#### Unit Tests
```python
def test_user_service_get_user():
    user = User(id=1, name="John Doe", email="john@example.com")
    mock_repo = Mock()
    mock_repo.get_by_id.return_value = user
    
    service = UserService(mock_repo)
    result = service.get_user(1)
    
    assert result == user
    mock_repo.get_by_id.assert_called_once_with(1)
```

### Running Tests

```bash
# Frontend tests
cd frontend
npm run test                 # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage

# Backend tests
cd backend
python -m pytest           # Run all tests
python -m pytest --cov     # With coverage
python -m pytest -v        # Verbose output
```

## Documentation

### Documentation Requirements

All contributions should include appropriate documentation:

1. **Code Documentation**: TSDoc/JSDoc comments for functions and classes
2. **API Documentation**: OpenAPI/Swagger documentation for API endpoints
3. **User Documentation**: User-facing documentation for new features
4. **Developer Documentation**: Technical documentation for developers

### Documentation Standards

#### Code Documentation
```typescript
/**
 * Fetches user data from the API
 * @param userId - The ID of the user to fetch
 * @param options - Optional fetch options
 * @returns Promise resolving to user data
 * @throws {ApiError} When the API request fails
 */
async function fetchUser(
  userId: number,
  options?: FetchOptions
): Promise<User> {
  // Implementation
}
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest changes from upstream
2. **Run all tests** and ensure they pass
3. **Run code quality checks** and fix any issues
4. **Update documentation** as needed
5. **Test your changes** thoroughly

### Pull Request Guidelines

#### Title Format
```
type(scope): description

Examples:
feat(dashboard): add metrics filtering
fix(auth): resolve token refresh issue
docs(api): update authentication guide
```

#### Description Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Accessibility testing completed

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer must approve
3. **Testing**: Manual testing may be required for UI changes
4. **Documentation**: Documentation must be updated if needed

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Clear Title**: Descriptive summary of the issue
2. **Environment**: OS, browser, Node.js version, etc.
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Expected Behavior**: What you expected to happen
5. **Actual Behavior**: What actually happened
6. **Screenshots**: If applicable
7. **Error Messages**: Full error messages and stack traces

#### Bug Report Template
```markdown
## Bug Description
A clear and concise description of the bug.

## Environment
- OS: [e.g., macOS 12.0]
- Browser: [e.g., Chrome 96]
- Node.js: [e.g., 16.14.0]
- npm: [e.g., 8.3.1]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots.

## Additional Context
Any other context about the problem.
```

### Feature Requests

When requesting features, please include:

1. **Clear Title**: Descriptive summary of the feature
2. **Problem Statement**: What problem does this solve?
3. **Proposed Solution**: How should it work?
4. **Alternatives**: Alternative solutions considered
5. **Use Cases**: How would this be used?

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussions and questions
- **Discord**: Real-time chat (invite link in README)

### Getting Help

- **Documentation**: Check the docs/ directory
- **GitHub Discussions**: Ask questions and get help
- **Stack Overflow**: Use the `opsight` tag

### Recognition

We recognize contributors through:
- **Contributors page**: Listed in README.md
- **Release notes**: Significant contributions mentioned
- **GitHub achievements**: Contributions tracked on GitHub

## Development Workflow

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   ```bash
   # Make your changes
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Keep Updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push Changes**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use the GitHub interface
   - Fill out the PR template
   - Link any related issues

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Types:
- feat: new feature
- fix: bug fix
- docs: documentation changes
- style: formatting changes
- refactor: code refactoring
- test: adding tests
- chore: maintenance tasks
```

## Questions?

If you have questions about contributing, please:

1. Check the documentation
2. Search existing issues
3. Ask in GitHub Discussions
4. Join our Discord server

Thank you for contributing to OpsSight! 🚀

## License

By contributing, you agree that your contributions will be licensed under the MIT License that covers the project. 