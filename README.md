# OpsSight DevOps Visibility Platform

[![CI/CD Pipeline](https://github.com/pavan-official/Devops-app-dev-cursor/actions/workflows/enhanced-ci-cd.yml/badge.svg)](https://github.com/pavan-official/Devops-app-dev-cursor/actions/workflows/enhanced-ci-cd.yml)
[![Security Scan](https://github.com/pavan-official/Devops-app-dev-cursor/actions/workflows/security-scan.yml/badge.svg)](https://github.com/pavan-official/Devops-app-dev-cursor/actions/workflows/security-scan.yml)
[![Coverage](https://codecov.io/gh/pavan-official/Devops-app-dev-cursor/branch/main/graph/badge.svg)](https://codecov.io/gh/pavan-official/Devops-app-dev-cursor)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Discord](https://img.shields.io/discord/YOUR_DISCORD_ID?color=7289da&label=Discord&logo=discord)](https://discord.gg/opssight)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue?logo=kubernetes)](https://kubernetes.io/)

A comprehensive DevOps visibility platform that provides real-time insights into CI/CD pipelines, infrastructure health, and development workflows. OpsSight combines a modern, accessible theme system with powerful monitoring capabilities to create a unified dashboard for DevOps teams.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=pavan-official/Devops-app-dev-cursor&type=Date)](https://star-history.com/#pavan-official/Devops-app-dev-cursor&Date)

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

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or helping with translations, your contributions make OpsSight better for everyone.

### Quick Start for Contributors

1. **⭐ Star the repository** to show your support
2. **🍴 Fork the repository** and clone your fork
3. **📖 Read our [Contributing Guide](CONTRIBUTING.md)** for detailed guidelines
4. **🏷️ Check [Good First Issues](https://github.com/pavan-official/Devops-app-dev-cursor/labels/good%20first%20issue)** for beginner-friendly tasks
5. **💬 Join our [Discord](https://discord.gg/opssight)** to discuss ideas and get help

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run quality checks: `npm run validate`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Ways to Contribute

- 🐛 **Report Bugs**: Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- ✨ **Request Features**: Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- 📝 **Improve Documentation**: Help make our docs even better
- 🧪 **Add Tests**: Increase test coverage and reliability
- 🌍 **Translations**: Help make OpsSight accessible globally
- 🎨 **UI/UX**: Improve the user experience and design

### Code Standards

- Follow TypeScript best practices with strict mode
- Write comprehensive tests (aim for >80% coverage)
- Ensure accessibility compliance (WCAG 2.1 AA)
- Document all public APIs with TSDoc comments
- Follow the established file structure and naming conventions
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

## 🏆 Contributors

Thanks to all our amazing contributors! 🎉

[![Contributors](https://contrib.rocks/image?repo=pavan-official/Devops-app-dev-cursor)](https://github.com/pavan-official/Devops-app-dev-cursor/graphs/contributors)

## 💬 Community & Support

### 🆘 Getting Help

- 📚 **Documentation**: Check our [comprehensive docs](docs/)
- 💬 **GitHub Discussions**: [Ask questions and share ideas](https://github.com/pavan-official/Devops-app-dev-cursor/discussions)
- 🐛 **Bug Reports**: [Report issues using our templates](https://github.com/pavan-official/Devops-app-dev-cursor/issues)
- 💬 **Discord**: [Join our community chat](https://discord.gg/opssight)
- 📧 **Email**: [contact@opssight.dev](mailto:contact@opssight.dev)

### 🌐 Community Channels

- **Discord**: Real-time chat and support
- **GitHub Discussions**: Longer-form discussions and Q&A
- **Twitter**: [@OpsSightDev](https://twitter.com/OpsSightDev) - Updates and announcements
- **LinkedIn**: [OpsSight Platform](https://linkedin.com/company/opssight) - Professional updates
- **YouTube**: [OpsSight Channel](https://youtube.com/@opssight) - Tutorials and demos

### 🔔 Stay Updated

- ⭐ **Star this repository** to get notifications
- 👀 **Watch releases** for new version notifications
- 📧 **Subscribe to our newsletter** at [opssight.dev/newsletter](https://opssight.dev/newsletter)
- 🐦 **Follow us on Twitter** [@OpsSightDev](https://twitter.com/OpsSightDev)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 OpsSight DevOps Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🙏 Acknowledgments

We extend our gratitude to the amazing open-source community and the following projects that make OpsSight possible:

### 🏗️ Core Technologies
- **[Next.js](https://nextjs.org/)** - The React framework for production
- **[React](https://reactjs.org/)** - A JavaScript library for building user interfaces
- **[TypeScript](https://www.typescriptlang.org/)** - Typed JavaScript at any scale
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern, fast web framework for Python
- **[PostgreSQL](https://www.postgresql.org/)** - Advanced open source database
- **[Redis](https://redis.io/)** - In-memory data structure store

### 🎨 UI & Design
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Headless UI](https://headlessui.dev/)** - Unstyled, accessible UI components
- **[Heroicons](https://heroicons.com/)** - Beautiful hand-crafted SVG icons
- **[Lucide React](https://lucide.dev/)** - Beautiful & consistent icon toolkit
- **[Recharts](https://recharts.org/)** - Redefined chart library built with React

### 🧪 Testing & Quality
- **[Jest](https://jestjs.io/)** - Delightful JavaScript testing framework
- **[React Testing Library](https://testing-library.com/)** - Testing utilities for React
- **[Playwright](https://playwright.dev/)** - End-to-end testing framework
- **[ESLint](https://eslint.org/)** - Find and fix problems in JavaScript code
- **[Prettier](https://prettier.io/)** - Opinionated code formatter

### 🔧 DevOps & Infrastructure
- **[Docker](https://www.docker.com/)** - Containerization platform
- **[Kubernetes](https://kubernetes.io/)** - Container orchestration system
- **[Prometheus](https://prometheus.io/)** - Monitoring system & time series database
- **[Grafana](https://grafana.com/)** - Open observability platform
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD platform

### 🌟 Special Thanks
- **Contributors**: All the amazing people who contribute code, documentation, and ideas
- **Community**: Our Discord community for feedback and support
- **Beta Testers**: Early adopters who help us improve the platform
- **Open Source**: The entire open-source ecosystem that makes projects like this possible

## 📊 Project Stats

<!-- GitHub Stats -->
![GitHub stars](https://img.shields.io/github/stars/pavan-official/Devops-app-dev-cursor?style=social)
![GitHub forks](https://img.shields.io/github/forks/pavan-official/Devops-app-dev-cursor?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/pavan-official/Devops-app-dev-cursor?style=social)

![GitHub issues](https://img.shields.io/github/issues/pavan-official/Devops-app-dev-cursor)
![GitHub pull requests](https://img.shields.io/github/issues-pr/pavan-official/Devops-app-dev-cursor)
![GitHub last commit](https://img.shields.io/github/last-commit/pavan-official/Devops-app-dev-cursor)
![GitHub contributors](https://img.shields.io/github/contributors/pavan-official/Devops-app-dev-cursor)

## 🔗 Related Projects

Check out these related projects in the DevOps ecosystem:

- **[Backstage](https://backstage.io/)** - Open platform for building developer portals
- **[Grafana](https://grafana.com/)** - Open source analytics & monitoring solution
- **[Prometheus](https://prometheus.io/)** - Monitoring system & time series database
- **[ArgoCD](https://argoproj.github.io/cd/)** - Declarative GitOps continuous delivery tool
- **[Tekton](https://tekton.dev/)** - Cloud native solution for building CI/CD systems

---

<div align="center">

### 🚀 Ready to get started?

[**📖 Read the Docs**](docs/) • [**🎮 Try the Demo**](http://localhost:3000) • [**💬 Join Discord**](https://discord.gg/opssight) • [**🐦 Follow on Twitter**](https://twitter.com/OpsSightDev)

**Made with ❤️ by the OpsSight team and contributors**

⭐ **Star us on GitHub** — it motivates us a lot!

</div> 