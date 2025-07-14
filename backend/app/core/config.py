"""
Configuration settings for the application
"""
import os
from typing import Optional, List
from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):
    """Application settings."""
    
    # Core Application Settings
    APP_NAME: str = "OpsSight DevOps Platform"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    BASE_URL: str = os.getenv("BASE_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "development-secret-key-change-in-production")
    
    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "development-secret-key")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    
    # Cache Settings
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "100"))
    
    # Security
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # OAuth2 Settings
    OAUTH_REDIRECT_URI: str = os.getenv("OAUTH_REDIRECT_URI", f"{BASE_URL}/auth/callback")
    
    # Google OAuth2
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
    
    # GitHub OAuth2
    GITHUB_CLIENT_ID: Optional[str] = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: Optional[str] = os.getenv("GITHUB_CLIENT_SECRET")
    
    # Microsoft Azure OAuth2
    AZURE_CLIENT_ID: Optional[str] = os.getenv("AZURE_CLIENT_ID")
    AZURE_CLIENT_SECRET: Optional[str] = os.getenv("AZURE_CLIENT_SECRET")
    AZURE_TENANT_ID: Optional[str] = os.getenv("AZURE_TENANT_ID")
    
    # GitLab OAuth2
    GITLAB_CLIENT_ID: Optional[str] = os.getenv("GITLAB_CLIENT_ID")
    GITLAB_CLIENT_SECRET: Optional[str] = os.getenv("GITLAB_CLIENT_SECRET")
    GITLAB_URL: str = os.getenv("GITLAB_URL", "https://gitlab.com")
    
    # SAML Settings
    SAML_ENTITY_ID: str = os.getenv("SAML_ENTITY_ID", f"{BASE_URL}/saml/metadata")
    SAML_ACS_URL: str = os.getenv("SAML_ACS_URL", f"{BASE_URL}/api/v1/auth/saml/acs")
    SAML_SLO_URL: str = os.getenv("SAML_SLO_URL", f"{BASE_URL}/api/v1/auth/saml/slo")
    
    # Azure SAML
    AZURE_SAML_ENTITY_ID: Optional[str] = os.getenv("AZURE_SAML_ENTITY_ID")
    AZURE_SAML_SSO_URL: Optional[str] = os.getenv("AZURE_SAML_SSO_URL")
    AZURE_SAML_CERT: Optional[str] = os.getenv("AZURE_SAML_CERT")
    
    # Okta SAML
    OKTA_SAML_ENTITY_ID: Optional[str] = os.getenv("OKTA_SAML_ENTITY_ID")
    OKTA_SAML_SSO_URL: Optional[str] = os.getenv("OKTA_SAML_SSO_URL")
    OKTA_SAML_CERT: Optional[str] = os.getenv("OKTA_SAML_CERT")
    
    # Generic SAML
    SAML_PROVIDER_NAME: Optional[str] = os.getenv("SAML_PROVIDER_NAME")
    SAML_PROVIDER_SSO_URL: Optional[str] = os.getenv("SAML_PROVIDER_SSO_URL")
    SAML_PROVIDER_CERT: Optional[str] = os.getenv("SAML_PROVIDER_CERT")
    
    # LDAP Settings
    LDAP_SERVER: Optional[str] = os.getenv("LDAP_SERVER")
    LDAP_PORT: int = int(os.getenv("LDAP_PORT", "389"))
    LDAP_USE_TLS: bool = os.getenv("LDAP_USE_TLS", "false").lower() == "true"
    LDAP_BIND_DN: Optional[str] = os.getenv("LDAP_BIND_DN")
    LDAP_BIND_PASSWORD: Optional[str] = os.getenv("LDAP_BIND_PASSWORD")
    LDAP_SEARCH_BASE: Optional[str] = os.getenv("LDAP_SEARCH_BASE")
    LDAP_USER_FILTER: str = os.getenv("LDAP_USER_FILTER", "(uid={username})")
    LDAP_GROUP_FILTER: str = os.getenv("LDAP_GROUP_FILTER", "(memberUid={username})")
    
    # SSO Configuration
    SSO_ENABLED: bool = os.getenv("SSO_ENABLED", "false").lower() == "true"
    SSO_REQUIRED: bool = os.getenv("SSO_REQUIRED", "false").lower() == "true"
    SSO_DEFAULT_PROVIDER: Optional[str] = os.getenv("SSO_DEFAULT_PROVIDER")
    SSO_SESSION_TIMEOUT: int = int(os.getenv("SSO_SESSION_TIMEOUT", "3600"))
    SSO_ALLOW_LOCAL_LOGIN: bool = os.getenv("SSO_ALLOW_LOCAL_LOGIN", "true").lower() == "true"
    SSO_AUTO_REDIRECT: bool = os.getenv("SSO_AUTO_REDIRECT", "false").lower() == "true"
    
    # Domain Restrictions
    ALLOWED_EMAIL_DOMAINS: Optional[List[str]] = None
    
    @validator('ALLOWED_EMAIL_DOMAINS', pre=True)
    def parse_allowed_domains(cls, v):
        if isinstance(v, str):
            return [domain.strip() for domain in v.split(',') if domain.strip()]
        return v
    
    # Session Management
    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "opssight_session")
    SESSION_COOKIE_SECURE: bool = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
    SESSION_COOKIE_HTTPONLY: bool = os.getenv("SESSION_COOKIE_HTTPONLY", "true").lower() == "true"
    SESSION_COOKIE_SAMESITE: str = os.getenv("SESSION_COOKIE_SAMESITE", "lax")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "json")
    
    # Monitoring
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    METRICS_PORT: int = int(os.getenv("METRICS_PORT", "8080"))
    
    # Push Notification Settings
    # Firebase Cloud Messaging (FCM) for Android
    FCM_SERVER_KEY: Optional[str] = os.getenv("FCM_SERVER_KEY")
    FCM_PROJECT_ID: Optional[str] = os.getenv("FCM_PROJECT_ID")
    
    # Apple Push Notification service (APNs) for iOS
    APNS_KEY_PATH: Optional[str] = os.getenv("APNS_KEY_PATH")
    APNS_KEY_ID: Optional[str] = os.getenv("APNS_KEY_ID")
    APNS_TEAM_ID: Optional[str] = os.getenv("APNS_TEAM_ID")
    APNS_BUNDLE_ID: str = os.getenv("APNS_BUNDLE_ID", "com.opssight.mobile")
    APNS_USE_SANDBOX: bool = os.getenv("APNS_USE_SANDBOX", "true").lower() == "true"
    
    # Push notification general settings
    PUSH_NOTIFICATIONS_ENABLED: bool = os.getenv("PUSH_NOTIFICATIONS_ENABLED", "true").lower() == "true"
    PUSH_NOTIFICATION_TTL: int = int(os.getenv("PUSH_NOTIFICATION_TTL", "86400"))  # 24 hours
    PUSH_MAX_RETRY_ATTEMPTS: int = int(os.getenv("PUSH_MAX_RETRY_ATTEMPTS", "3"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()