"""
Configuration settings for the application
"""
from typing import Optional, List
from pydantic import computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Core Application Settings
    APP_NAME: str = "OpsSight DevOps Platform"
    PROJECT_NAME: str = "OpsSight DevOps Platform"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Security Settings
    CORS_ORIGINS: str = "http://localhost:3000"
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"
    
    @computed_field
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return self.CORS_ORIGINS.split(",")
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "development-secret-key-change-in-production"
    
    # JWT Settings
    JWT_SECRET_KEY: str = "development-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./app.db"
    
    # Cache Settings
    REDIS_URL: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 100
    
    # OAuth2 Settings
    @computed_field
    @property
    def OAUTH_REDIRECT_URI(self) -> str:
        return f"{self.BASE_URL}/auth/callback"
    
    # Google OAuth2
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # GitHub OAuth2
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    
    # Microsoft Azure OAuth2
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    AZURE_TENANT_ID: Optional[str] = None
    
    # GitLab OAuth2
    GITLAB_CLIENT_ID: Optional[str] = None
    GITLAB_CLIENT_SECRET: Optional[str] = None
    GITLAB_URL: str = "https://gitlab.com"
    
    # SAML Settings
    @computed_field
    @property
    def SAML_ENTITY_ID(self) -> str:
        return f"{self.BASE_URL}/saml/metadata"
    
    @computed_field
    @property
    def SAML_ACS_URL(self) -> str:
        return f"{self.BASE_URL}/api/v1/auth/saml/acs"
    
    @computed_field
    @property
    def SAML_SLO_URL(self) -> str:
        return f"{self.BASE_URL}/api/v1/auth/saml/slo"
    
    # Azure SAML
    AZURE_SAML_ENTITY_ID: Optional[str] = None
    AZURE_SAML_SSO_URL: Optional[str] = None
    AZURE_SAML_CERT: Optional[str] = None
    
    # Okta SAML
    OKTA_SAML_ENTITY_ID: Optional[str] = None
    OKTA_SAML_SSO_URL: Optional[str] = None
    OKTA_SAML_CERT: Optional[str] = None
    
    # Generic SAML
    SAML_PROVIDER_NAME: Optional[str] = None
    SAML_PROVIDER_SSO_URL: Optional[str] = None
    SAML_PROVIDER_CERT: Optional[str] = None
    
    # LDAP Settings
    LDAP_SERVER: Optional[str] = None
    LDAP_PORT: int = 389
    LDAP_USE_TLS: bool = False
    LDAP_BIND_DN: Optional[str] = None
    LDAP_BIND_PASSWORD: Optional[str] = None
    LDAP_SEARCH_BASE: Optional[str] = None
    LDAP_USER_FILTER: str = "(uid={username})"
    LDAP_GROUP_FILTER: str = "(memberUid={username})"
    
    # SSO Configuration
    SSO_ENABLED: bool = False
    SSO_REQUIRED: bool = False
    SSO_DEFAULT_PROVIDER: Optional[str] = None
    SSO_SESSION_TIMEOUT: int = 3600
    SSO_ALLOW_LOCAL_LOGIN: bool = True
    SSO_AUTO_REDIRECT: bool = False
    
    # Domain Restrictions
    ALLOWED_EMAIL_DOMAINS: Optional[str] = None
    
    # Session Management
    SESSION_COOKIE_NAME: str = "opssight_session"
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 8080
    
    # Push Notification Settings
    # Firebase Cloud Messaging (FCM) for Android
    FCM_SERVER_KEY: Optional[str] = None
    FCM_PROJECT_ID: Optional[str] = None
    
    # Apple Push Notification service (APNs) for iOS
    APNS_KEY_PATH: Optional[str] = None
    APNS_KEY_ID: Optional[str] = None
    APNS_TEAM_ID: Optional[str] = None
    APNS_BUNDLE_ID: str = "com.opssight.mobile"
    APNS_USE_SANDBOX: bool = True
    
    # Push notification general settings
    PUSH_NOTIFICATIONS_ENABLED: bool = True
    PUSH_NOTIFICATION_TTL: int = 86400  # 24 hours
    PUSH_MAX_RETRY_ATTEMPTS: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()