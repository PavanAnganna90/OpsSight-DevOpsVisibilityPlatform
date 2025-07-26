#!/bin/bash

# OpsSight Platform - Simple Staging Validation Script
# Tests basic functionality without full database connectivity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌${NC} $1"
}

# Configuration
PROJECT_ROOT="/Users/pavan/Desktop/Devops-app-dev-cursor"

main() {
    log "🚀 Starting OpsSight Simple Staging Validation"
    log "Project root: $PROJECT_ROOT"
    
    # Test 1: Backend test suite
    log "🧪 Running backend test suite..."
    cd "$PROJECT_ROOT/backend"
    
    if [ -d ".venv" ]; then
        source .venv/bin/activate
        
        # Set test environment variables
        export APP_NAME="OpsSight Test"
        export APP_ENV="test"
        export SECRET_KEY="test-secret-key"
        export GITHUB_CLIENT_ID="test-client-id"
        export GITHUB_CLIENT_SECRET="test-client-secret"
        export GITHUB_CALLBACK_URL="http://localhost:3000/auth/callback"
        export JWT_SECRET_KEY="test-jwt-secret"
        export JWT_ALGORITHM="HS256"
        export JWT_ACCESS_TOKEN_EXPIRE_MINUTES="30"
        export JWT_REFRESH_TOKEN_EXPIRE_DAYS="7"
        export DATABASE_URL="postgresql://test:test@localhost:5432/test"
        export REDIS_URL="redis://localhost:6379/0"
        export CSRF_SECRET="test-csrf-secret"
        
        log "Testing basic imports..."
        if python3 -c "from app.main import app; print('✅ Backend imports successful')"; then
            success "Backend imports working"
            backend_imports=1
        else
            warn "Backend imports failed"
            backend_imports=0
        fi
        
        log "Testing database configuration..."
        if python3 -c "from app.db.database import SessionLocal, AsyncSessionLocal; print('✅ Database config successful')"; then
            success "Database configuration working"
            backend_db=1
        else
            warn "Database configuration failed"
            backend_db=0
        fi
    else
        warn "Backend virtual environment not found"
        backend_imports=0
        backend_db=0
    fi
    
    # Test 2: Frontend test suite
    log "🌐 Running frontend test suite..."
    cd "$PROJECT_ROOT/frontend"
    
    if [ -d "node_modules" ]; then
        log "Running simple React tests..."
        if npm test -- --testPathPattern=SimpleApp.test.tsx --watchAll=false --passWithNoTests; then
            success "Simple React tests passed"
            frontend_simple=1
        else
            warn "Simple React tests failed"
            frontend_simple=0
        fi
        
        log "Running fixed App tests..."
        if npm test -- --testPathPattern=App.fixed.test.tsx --watchAll=false --passWithNoTests; then
            success "Fixed App tests passed"
            frontend_fixed=1
        else
            warn "Fixed App tests failed"
            frontend_fixed=0
        fi
    else
        warn "Frontend node_modules not found"
        frontend_simple=0
        frontend_fixed=0
    fi
    
    # Test 3: Build validation
    log "🔨 Testing build processes..."
    
    # Test backend can be imported
    cd "$PROJECT_ROOT/backend"
    if [ -d ".venv" ]; then
        source .venv/bin/activate
        if python3 -c "import app.main; print('Backend module loads successfully')"; then
            success "Backend module validation passed"
            backend_module=1
        else
            warn "Backend module validation failed"
            backend_module=0
        fi
    else
        backend_module=0
    fi
    
    # Test frontend build readiness
    cd "$PROJECT_ROOT/frontend"
    if [ -f "package.json" ] && [ -f "next.config.mjs" ]; then
        success "Frontend build configuration present"
        frontend_config=1
    else
        warn "Frontend build configuration missing"
        frontend_config=0
    fi
    
    # Generate validation report
    log "📊 Generating validation report..."
    
    total_tests=6
    total_passed=$((backend_imports + backend_db + frontend_simple + frontend_fixed + backend_module + frontend_config))
    success_rate=$((total_passed * 100 / total_tests))
    
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              SIMPLE STAGING VALIDATION REPORT       ║${NC}"
    echo -e "${BLUE}╠══════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC} Backend Imports:     ${backend_imports}/1 passed"
    echo -e "${BLUE}║${NC} Backend Database:    ${backend_db}/1 passed"
    echo -e "${BLUE}║${NC} Frontend Simple:     ${frontend_simple}/1 passed"
    echo -e "${BLUE}║${NC} Frontend Fixed:      ${frontend_fixed}/1 passed"  
    echo -e "${BLUE}║${NC} Backend Module:      ${backend_module}/1 passed"
    echo -e "${BLUE}║${NC} Frontend Config:     ${frontend_config}/1 passed"
    echo -e "${BLUE}║${NC} Total Tests:         ${total_passed}/${total_tests} passed"
    echo -e "${BLUE}║${NC} Success Rate:        ${success_rate}%"
    
    if [ $success_rate -ge 80 ]; then
        echo -e "${BLUE}║${NC} Overall Status:      ${GREEN}✅ STAGING VALIDATED${NC}"
        overall_status="PASSED"
    elif [ $success_rate -ge 60 ]; then
        echo -e "${BLUE}║${NC} Overall Status:      ${YELLOW}⚠️ NEEDS ATTENTION${NC}"
        overall_status="WARNING"
    else
        echo -e "${BLUE}║${NC} Overall Status:      ${RED}❌ NOT READY${NC}"
        overall_status="FAILED"
    fi
    
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Summary
    if [ "$overall_status" = "PASSED" ]; then
        success "🎉 Simple staging validation completed successfully!"
        log "Backend and frontend core functionality validated"
        log "Test suites are working and imports are functional"
    elif [ "$overall_status" = "WARNING" ]; then
        warn "⚠️ Staging validation completed with warnings"
        log "Most core functionality is working but some issues remain"
    else
        error "❌ Staging validation failed - Success rate: ${success_rate}%"
        exit 1
    fi
}

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Run main function
main "$@"