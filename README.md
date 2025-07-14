# OpsSight DevOps Visibility Platform

A comprehensive DevOps visibility platform that provides real-time insights into CI/CD pipelines, infrastructure health, and development workflows. OpsSight combines a modern, accessible theme system with powerful monitoring capabilities to create a unified dashboard for DevOps teams.

## 🚀 Features

### Core Platform
- 🔐 **GitHub OAuth Authentication** - Secure authentication with GitHub integration
- 📊 **Real-time Monitoring** - Live metrics from CI/CD pipelines and infrastructure
- 🎯 **Kubernetes Cluster Monitoring** - Comprehensive cluster health and resource tracking
- 🤖 **Ansible Automation Tracking** - Monitor automation coverage and execution
- 📈 **Performance Analytics** - Detailed insights into system performance and trends
- 🔔 **Alert Integration** - Slack and webhook notifications for critical events

### Advanced Theme System
- 🎨 **7 Theme Variants** - Minimal, neo-brutalist, glassmorphic, cyberpunk, editorial, accessible, dynamic
- 🌓 **4 Color Modes** - Light, dark, high-contrast, and system preference
- 🎯 **Contextual Themes** - Default, focus, relax, and energize modes for different workflows
- ♿ **WCAG 2.1 AA Compliant** - Full accessibility support with screen reader compatibility
- 🚀 **Performance Optimized** - Smooth transitions and efficient rendering
- 📱 **Responsive Design** - Mobile-first approach with adaptive layouts
- 💾 **Persistent Preferences** - User settings saved across sessions

### Developer Experience
- 📚 **Comprehensive Documentation** - Storybook integration with interactive component docs
- 🧪 **Extensive Testing** - Unit, integration, and accessibility testing
- 🔧 **TypeScript Support** - Full type safety with comprehensive TSDoc comments
- 🎨 **Design System** - Consistent design tokens and reusable components
- 🔄 **Hot Reload** - Fast development with instant feedback

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 15 with React 19 and TypeScript 5
- **Styling**: Tailwind CSS 4 with design tokens
- **State Management**: React Context + TanStack Query
- **Testing**: Jest + React Testing Library + Vitest
- **Documentation**: Storybook 9 with accessibility addon
- **Build Tool**: Vite with Turbopack

#### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **Authentication**: GitHub OAuth + JWT
- **API Integration**: GitHub API, Kubernetes API, Ansible
- **Containerization**: Docker + Docker Compose

#### Infrastructure
- **Cloud Provider**: AWS
- **Container Orchestration**: Kubernetes
- **Monitoring**: Prometheus + Grafana
- **CI/CD**: GitHub Actions
- **Infrastructure as Code**: Terraform

## 🎯 Live Demo

**🌐 Primary Demo URL**: [http://localhost:3000](http://localhost:3000)

Experience the complete OpsSight platform with realistic mock data:

```bash
# Launch full demo environment (recommended)
./scripts/demo-setup.sh
```

### 🎮 Demo Features
- **7 Theme Variants** - Test all visual themes and color modes
- **Complete DevOps Dashboard** - Real-time metrics with mock CI/CD data  
- **Interactive Components** - Full Storybook with 50+ components
- **Monitoring Stack** - Grafana, Prometheus, AlertManager
- **Notification System** - Email/Slack preferences and digest management
- **Responsive Design** - Mobile, tablet, desktop optimized
- **Accessibility** - WCAG 2.1 AA compliant with screen reader support

📖 **[Full Demo Guide](docs/demo-environment-guide.md)** - Complete testing scenarios and URLs

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose
- Python 3.9+ (for backend development)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/opsight-devops-platform.git
   cd opsight-devops-platform
   ```

2. **Set up environment variables:**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp frontend/.env.local.example frontend/.env.local
   
   # Configure your GitHub OAuth app credentials
   # See docs/setup-guide.md for detailed instructions
   ```

3. **Start with Docker Compose (Recommended):**
   ```bash
   docker-compose up -d
   ```

4. **Or run locally:**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Start frontend development server
   npm run dev
   
   # In another terminal, start backend
   cd ../backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

5. **Launch the complete demo environment:**
   ```bash
   # Full demo with mock data (recommended)
   ./scripts/demo-setup.sh
   
   # Or quick start with Docker only
   ./scripts/quick-demo.sh
   ```

6. **Access the application:**
   - **🎯 Primary Demo**: [http://localhost:3000](http://localhost:3000) - **Main application interface**
   - **📚 Component Library**: [http://localhost:6006](http://localhost:6006) - **Interactive Storybook**
   - **🛠️ API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs) - FastAPI docs
   - **📊 Monitoring**: [http://localhost:3001](http://localhost:3001) - Grafana dashboards (admin/admin)
   - **🔍 API Health**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) - Service status

## 📁 Project Structure

```
opsight-devops-platform/
├── frontend/                    # Next.js React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # Core UI components (Button, MetricCard, etc.)
│   │   │   ├── auth/          # Authentication components
│   │   │   ├── dashboard/     # Dashboard-specific components
│   │   │   └── charts/        # Data visualization components
│   │   ├── pages/             # Next.js pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── contexts/          # React contexts (Auth, Theme, Settings)
│   │   ├── utils/             # Helper functions and utilities
│   │   ├── types/             # TypeScript type definitions
│   │   └── styles/            # Global styles and theme tokens
│   ├── stories/               # Storybook stories
│   └── tests/                 # Test files
├── backend/                    # FastAPI Python application
│   ├── app/
│   │   ├── api/               # API routes and endpoints
│   │   ├── core/              # Core configuration and settings
│   │   ├── models/            # Database models
│   │   ├── services/          # Business logic and external integrations
│   │   └── tests/             # Backend test files
│   └── requirements.txt       # Python dependencies
├── infrastructure/            # Terraform and deployment configs
├── monitoring/               # Prometheus, Grafana configurations
├── docs/                     # Additional documentation
├── scripts/                  # Utility scripts
└── docker-compose.yml        # Local development environment
```

## 🎨 Component Documentation

Our UI components are fully documented with interactive examples:

### Core Components
- **[Button](frontend/src/components/ui/Button/README.md)** - Flexible button component with multiple variants and states
- **[MetricCard](frontend/src/components/ui/MetricCard/README.md)** - Display key metrics with trends and contextual information
- **[StatusIndicator](frontend/src/components/ui/StatusIndicator/README.md)** - Visual status indicators with accessibility support

### Component Library
- **[UI Components Overview](frontend/src/components/ui/README.md)** - Complete component library documentation
- **[Storybook](http://localhost:6006)** - Interactive component playground (run `npm run storybook`)

### Theme System
- **[Theme Documentation](docs/theme-system.md)** - Comprehensive theme system guide
- **[Design Tokens](frontend/src/styles/tokens/)** - Design token definitions and usage

## 🧪 Development

### Available Scripts

#### Frontend
```bash
cd frontend

# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test            # Run Jest tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run coverage:ci     # CI-optimized coverage

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format with Prettier
npm run type-check      # TypeScript type checking
npm run validate        # Run all quality checks

# Documentation
npm run storybook       # Start Storybook
npm run build-storybook # Build Storybook

# Performance
npm run lighthouse:audit # Run Lighthouse audit
npm run analyze         # Bundle analysis
```

#### Backend
```bash
cd backend

# Development
uvicorn app.main:app --reload    # Start development server
python -m pytest                # Run tests
python -m pytest --cov          # Run tests with coverage

# Code Quality
black .                          # Format code
isort .                          # Sort imports
flake8 .                        # Lint code
mypy .                          # Type checking
```

### Testing Strategy

- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: API endpoint testing with FastAPI TestClient
- **Accessibility Tests**: Automated a11y testing with axe-core
- **Visual Tests**: Storybook visual regression testing
- **Performance Tests**: Lighthouse CI for performance monitoring

### Code Quality

- **TypeScript**: Full type safety with strict mode enabled
- **ESLint**: Comprehensive linting with React and accessibility rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality gates
- **TSDoc**: Comprehensive documentation for all TypeScript code

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

#### Backend (.env)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/opsight
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET_KEY=your_jwt_secret
```

### Theme Customization

The theme system supports extensive customization through design tokens:

```typescript
// Example: Custom theme configuration
const customTheme = {
  colors: {
    primary: '#your-brand-color',
    secondary: '#your-secondary-color',
  },
  spacing: {
    // Custom spacing scale
  },
  typography: {
    // Custom font configuration
  }
};
```

See [Theme Customization Guide](docs/theme-system.md#customization) for detailed instructions.

## 📚 Documentation

- **[Setup Guide](docs/setup-guide.md)** - Detailed setup and configuration
- **[Theme System](docs/theme-system.md)** - Complete theme system documentation
- **[Testing Guide](docs/testing-and-validation.md)** - Testing strategies and best practices
- **[Monitoring Setup](docs/monitoring-setup.md)** - Infrastructure monitoring configuration
- **[Security Guide](docs/secrets-management.md)** - Security best practices and secrets management
- **[API Documentation](http://localhost:8000/docs)** - Interactive API documentation (when backend is running)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run quality checks: `npm run validate`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Ensure accessibility compliance (WCAG 2.1 AA)
- Document all public APIs with TSDoc
- Follow the established file structure and naming conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- UI components inspired by [Headless UI](https://headlessui.dev/)
- Icons from [Heroicons](https://heroicons.com/)
- Charts powered by [Recharts](https://recharts.org/)
- Testing with [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/)

---

For more information, visit our [documentation](docs/) or check out the [live demo](https://opsight-demo.vercel.app). 