#!/bin/bash
# Production Secrets Generation Script

set -e

SECRETS_DIR="/Users/pavan/Desktop/Devops-app-dev-cursor/secrets"
mkdir -p "$SECRETS_DIR"

echo "🔐 Generating production secrets..."

# Generate secure random secrets
openssl rand -base64 32 > "$SECRETS_DIR/app_secret_key.txt"
openssl rand -base64 32 > "$SECRETS_DIR/jwt_secret_key.txt"
openssl rand -base64 16 > "$SECRETS_DIR/db_password.txt"
openssl rand -base64 16 > "$SECRETS_DIR/redis_password.txt"

# Generate SSL certificate (self-signed for development)
openssl req -x509 -newkey rsa:4096 -keyout "$SECRETS_DIR/opssight.key" -out "$SECRETS_DIR/opssight.crt" -days 365 -nodes -subj "/C=US/ST=CA/L=SF/O=OpsSight/OU=DevOps/CN=opssight.local"

# Create .env file for production
cat > "/Users/pavan/Desktop/Devops-app-dev-cursor/.env.prod" << EOF
# Production Environment Variables
SECRET_KEY=$(cat "$SECRETS_DIR/app_secret_key.txt")
JWT_SECRET_KEY=$(cat "$SECRETS_DIR/jwt_secret_key.txt")
DB_PASSWORD=$(cat "$SECRETS_DIR/db_password.txt")
REDIS_PASSWORD=$(cat "$SECRETS_DIR/redis_password.txt")

# Domain Configuration
DOMAIN=opssight.local
APP_VERSION=2.0.0

# Database Configuration
POSTGRES_USER=opssight
POSTGRES_DB=opssight

# Security Settings
CORS_ORIGINS=https://opssight.local
TLS_ENABLED=true
EOF

# Secure the secrets
chmod 600 "$SECRETS_DIR"/*
chmod 600 "/Users/pavan/Desktop/Devops-app-dev-cursor/.env.prod"

echo "✅ Production secrets generated:"
echo "   - App Secret Key: $SECRETS_DIR/app_secret_key.txt"
echo "   - JWT Secret Key: $SECRETS_DIR/jwt_secret_key.txt" 
echo "   - DB Password: $SECRETS_DIR/db_password.txt"
echo "   - Redis Password: $SECRETS_DIR/redis_password.txt"
echo "   - SSL Certificate: $SECRETS_DIR/opssight.crt"
echo "   - Environment: .env.prod"
echo ""
echo "⚠️  IMPORTANT: Store these secrets securely in production!"
echo "⚠️  The SSL certificate is self-signed for development only"