#!/bin/bash

# OpsSight DevOps Platform - Development Environment Setup Script
# Automated setup for new developers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PYTHON_VERSION="3.9"
NODE_VERSION="18"
PROJECT_NAME="OpsSight DevOps Platform"

# Helper functions
print_header() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

install_docker() {
    local os=$1
    print_step "Installing Docker..."
    
    case $os in
        "linux")
            if ! command_exists docker; then
                curl -fsSL https://get.docker.com -o get-docker.sh
                sudo sh get-docker.sh
                sudo usermod -aG docker $USER
                rm get-docker.sh
                print_warning "Please log out and back in for Docker group membership to take effect"
            fi
            
            if ! command_exists docker-compose; then
                sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                sudo chmod +x /usr/local/bin/docker-compose
            fi
            ;;
        "macos")
            if ! command_exists docker; then
                print_warning "Please install Docker Desktop for Mac from: https://docs.docker.com/desktop/mac/install/"
                print_warning "Then run this script again"
                exit 1
            fi
            ;;
        "windows")
            if ! command_exists docker; then
                print_warning "Please install Docker Desktop for Windows from: https://docs.docker.com/desktop/windows/install/"
                print_warning "Then run this script again"
                exit 1
            fi
            ;;
        *)
            print_error "Unsupported operating system for automatic Docker installation"
            exit 1
            ;;
    esac
}

install_node() {
    local os=$1
    print_step "Installing Node.js $NODE_VERSION..."
    
    if command_exists node; then
        local current_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -ge "$NODE_VERSION" ]; then
            print_success "Node.js $current_version is already installed"
            return
        fi
    fi
    
    case $os in
        "linux")
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "macos")
            if command_exists brew; then
                brew install node@${NODE_VERSION}
                brew link node@${NODE_VERSION} --force
            else
                print_warning "Please install Node.js $NODE_VERSION from: https://nodejs.org/"
                exit 1
            fi
            ;;
        "windows")
            print_warning "Please install Node.js $NODE_VERSION from: https://nodejs.org/"
            exit 1
            ;;
        *)
            print_error "Unsupported operating system for automatic Node.js installation"
            exit 1
            ;;
    esac
}

install_python() {
    local os=$1
    print_step "Installing Python $PYTHON_VERSION..."
    
    if command_exists python3; then
        local current_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
        if [ "$current_version" = "$PYTHON_VERSION" ]; then
            print_success "Python $current_version is already installed"
            return
        fi
    fi
    
    case $os in
        "linux")
            sudo apt-get update
            sudo apt-get install -y python${PYTHON_VERSION} python${PYTHON_VERSION}-venv python${PYTHON_VERSION}-pip
            ;;
        "macos")
            if command_exists brew; then
                brew install python@${PYTHON_VERSION}
            else
                print_warning "Please install Python $PYTHON_VERSION from: https://www.python.org/"
                exit 1
            fi
            ;;
        "windows")
            print_warning "Please install Python $PYTHON_VERSION from: https://www.python.org/"
            exit 1
            ;;
        *)
            print_error "Unsupported operating system for automatic Python installation"
            exit 1
            ;;
    esac
}

setup_project() {
    print_step "Setting up project environment..."
    
    # Create environment files
    if [ ! -f .env ]; then
        print_step "Creating .env file from template..."
        cp env.example .env
        print_success "Created .env file"
    fi
    
    # Generate secure keys
    print_step "Generating secure keys..."
    if command_exists openssl; then
        {
            echo ""
            echo "# Generated secure keys"
            echo "SECRET_KEY=$(openssl rand -base64 32)"
            echo "JWT_SECRET_KEY=$(openssl rand -base64 32)"
            echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
        } >> .env
        print_success "Secure keys generated and added to .env"
    else
        print_warning "OpenSSL not found. Please manually set SECRET_KEY, JWT_SECRET_KEY, and ENCRYPTION_KEY in .env"
    fi
    
    # Set up backend
    if [ -d "backend" ]; then
        print_step "Setting up backend environment..."
        cd backend
        
        # Create virtual environment
        if [ ! -d "venv" ]; then
            python3 -m venv venv
            print_success "Created Python virtual environment"
        fi
        
        # Activate virtual environment and install dependencies
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        print_success "Backend dependencies installed"
        
        cd ..
    fi
    
    # Set up frontend
    if [ -d "frontend" ]; then
        print_step "Setting up frontend environment..."
        cd frontend
        
        # Install dependencies
        npm install
        print_success "Frontend dependencies installed"
        
        cd ..
    fi
}

setup_git_hooks() {
    print_step "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        # Pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."
make lint-staged
EOF
        chmod +x .git/hooks/pre-commit
        
        # Pre-push hook
        cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
echo "Running pre-push checks..."
make test
EOF
        chmod +x .git/hooks/pre-push
        
        print_success "Git hooks installed"
    else
        print_warning "Not a git repository, skipping Git hooks"
    fi
}

setup_development_tools() {
    print_step "Setting up development tools..."
    
    # Make scripts executable
    chmod +x scripts/*.sh 2>/dev/null || true
    
    # Create useful aliases
    if [ -f "$HOME/.bashrc" ]; then
        {
            echo ""
            echo "# OpsSight Development Aliases"
            echo "alias ops-start='make start'"
            echo "alias ops-stop='make stop'"
            echo "alias ops-test='make test'"
            echo "alias ops-logs='make logs'"
            echo "alias ops-shell-backend='make shell-backend'"
            echo "alias ops-shell-frontend='make shell-frontend'"
        } >> "$HOME/.bashrc"
        print_success "Development aliases added to .bashrc"
    fi
    
    if [ -f "$HOME/.zshrc" ]; then
        {
            echo ""
            echo "# OpsSight Development Aliases"
            echo "alias ops-start='make start'"
            echo "alias ops-stop='make stop'"
            echo "alias ops-test='make test'"
            echo "alias ops-logs='make logs'"
            echo "alias ops-shell-backend='make shell-backend'"
            echo "alias ops-shell-frontend='make shell-frontend'"
        } >> "$HOME/.zshrc"
        print_success "Development aliases added to .zshrc"
    fi
}

setup_monitoring() {
    print_step "Setting up monitoring configuration..."
    
    # Create monitoring configuration files if they don't exist
    mkdir -p monitoring/prometheus monitoring/grafana/dashboards monitoring/loki
    
    if [ ! -f "monitoring/prometheus/prometheus-dev.yml" ]; then
        cat > monitoring/prometheus/prometheus-dev.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'opssight-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'opssight-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF
        print_success "Created Prometheus development configuration"
    fi
}

create_helpful_scripts() {
    print_step "Creating helpful development scripts..."
    
    # Quick start script
    cat > scripts/quick-start.sh << 'EOF'
#!/bin/bash
# Quick start for new developers
echo "🚀 Starting OpsSight development environment..."
make check-dependencies
make setup-env
make start
make show-urls
echo "✅ Development environment is ready!"
EOF
    chmod +x scripts/quick-start.sh
    
    # Debug script
    cat > scripts/debug.sh << 'EOF'
#!/bin/bash
# Debug helper script
echo "🔍 OpsSight Debug Information"
echo "============================="
echo "Docker status:"
docker version --format '{{.Server.Version}}' 2>/dev/null || echo "Docker not running"
echo ""
echo "Services status:"
docker-compose -f docker-compose.dev.yml ps
echo ""
echo "Resource usage:"
docker stats --no-stream
echo ""
echo "Recent logs:"
docker-compose -f docker-compose.dev.yml logs --tail=10
EOF
    chmod +x scripts/debug.sh
    
    print_success "Helper scripts created"
}

run_initial_tests() {
    print_step "Running initial tests to verify setup..."
    
    # Check if we can build the project
    if command_exists docker && command_exists docker-compose; then
        print_step "Testing Docker setup..."
        docker-compose -f docker-compose.dev.yml config > /dev/null
        print_success "Docker Compose configuration is valid"
    fi
    
    # Test backend setup
    if [ -d "backend" ] && [ -f "backend/requirements.txt" ]; then
        print_step "Testing backend setup..."
        cd backend
        if [ -d "venv" ]; then
            source venv/bin/activate
            python -c "import app" 2>/dev/null && print_success "Backend imports working" || print_warning "Backend import issues"
        fi
        cd ..
    fi
    
    # Test frontend setup
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        print_step "Testing frontend setup..."
        cd frontend
        npm run build > /dev/null 2>&1 && print_success "Frontend builds successfully" || print_warning "Frontend build issues"
        cd ..
    fi
}

# Main execution
main() {
    print_header "$PROJECT_NAME - Development Environment Setup"
    
    # Detect operating system
    OS=$(check_os)
    print_step "Detected operating system: $OS"
    
    # Check for required tools and install if missing
    print_header "Installing Required Dependencies"
    
    if ! command_exists git; then
        print_error "Git is required but not installed. Please install Git first."
        exit 1
    fi
    
    install_docker "$OS"
    install_node "$OS"
    install_python "$OS"
    
    # Verify installations
    print_header "Verifying Installations"
    command_exists docker && print_success "Docker installed" || print_error "Docker installation failed"
    command_exists docker-compose && print_success "Docker Compose installed" || print_error "Docker Compose installation failed"
    command_exists node && print_success "Node.js installed ($(node --version))" || print_error "Node.js installation failed"
    command_exists python3 && print_success "Python installed ($(python3 --version))" || print_error "Python installation failed"
    
    # Set up project
    print_header "Setting Up Project Environment"
    setup_project
    setup_git_hooks
    setup_development_tools
    setup_monitoring
    create_helpful_scripts
    
    # Run tests
    print_header "Verifying Setup"
    run_initial_tests
    
    # Final instructions
    print_header "Setup Complete!"
    echo -e "${GREEN}🎉 $PROJECT_NAME development environment is ready!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "${YELLOW}1.${NC} Review and update the .env file with your configuration"
    echo -e "${YELLOW}2.${NC} Run 'make start' to start the development environment"
    echo -e "${YELLOW}3.${NC} Run 'make show-urls' to see service URLs"
    echo -e "${YELLOW}4.${NC} Run 'make help' to see all available commands"
    echo ""
    echo -e "${CYAN}Useful commands:${NC}"
    echo -e "${YELLOW}•${NC} ops-start - Start development environment"
    echo -e "${YELLOW}•${NC} ops-stop - Stop development environment"
    echo -e "${YELLOW}•${NC} ops-test - Run all tests"
    echo -e "${YELLOW}•${NC} ops-logs - View service logs"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Run main function
main "$@"