"""
Configuration management for the application.

This module uses Pydantic's BaseSettings for type-safe configuration
management, loading values from environment variables.
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, RedisDsn, HttpUrl, field_validator, Field
import json
import os


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Attributes:
        APP_NAME (str): Name of the application
        APP_ENV (str): Environment (development, staging, production)
        DEBUG (bool): Debug mode flag
        SECRET_KEY (str): Application secret key

        GITHUB_CLIENT_ID (str): GitHub OAuth client ID
        GITHUB_CLIENT_SECRET (str): GitHub OAuth client secret
        GITHUB_CALLBACK_URL (HttpUrl): GitHub OAuth callback URL

        JWT_SECRET_KEY (str): Secret key for JWT encoding/decoding
        JWT_ALGORITHM (str): Algorithm used for JWT
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES (int): Access token expiration time
        JWT_REFRESH_TOKEN_EXPIRE_DAYS (int): Refresh token expiration time

        DATABASE_URL (PostgresDsn): Database connection URL
        REDIS_URL (RedisDsn): Redis connection URL

        CORS_ORIGINS (List[str]): Allowed CORS origins
        CSRF_SECRET (str): Secret for CSRF token generation
        API_V1_STR (str): API version prefix
        SLACK_SIGNING_SECRET (str): Secret for Slack signing
        PROJECT_NAME (str): Project name
        VERSION (str): Project version
        ALLOWED_ORIGINS (list[str]): Allowed CORS origins
        SLACK_BOT_TOKEN (str): Secret for Slack bot
        SLACK_WEBHOOK_URL (str): Secret for Slack webhook
        SLACK_CLIENT_ID (str): Secret for Slack client ID
        SLACK_CLIENT_SECRET (str): Secret for Slack client secret
    """

    # Application Settings
    APP_NAME: str
    APP_ENV: str
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool
    SECRET_KEY: str

    # OAuth Provider Settings
    # GitHub OAuth Settings
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_CALLBACK_URL: HttpUrl
    
    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = Field(default="", env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", env="GOOGLE_CLIENT_SECRET")
    GOOGLE_CALLBACK_URL: HttpUrl = Field(default="http://localhost:8000/auth/callback/google", env="GOOGLE_CALLBACK_URL")
    
    # Microsoft OAuth Settings
    MICROSOFT_CLIENT_ID: str = Field(default="", env="MICROSOFT_CLIENT_ID")
    MICROSOFT_CLIENT_SECRET: str = Field(default="", env="MICROSOFT_CLIENT_SECRET")
    MICROSOFT_CALLBACK_URL: HttpUrl = Field(default="http://localhost:8000/auth/callback/microsoft", env="MICROSOFT_CALLBACK_URL")
    
    # GitLab OAuth Settings
    GITLAB_CLIENT_ID: str = Field(default="", env="GITLAB_CLIENT_ID")
    GITLAB_CLIENT_SECRET: str = Field(default="", env="GITLAB_CLIENT_SECRET")
    GITLAB_CALLBACK_URL: HttpUrl = Field(default="http://localhost:8000/auth/callback/gitlab", env="GITLAB_CALLBACK_URL")
    
    # Bitbucket OAuth Settings
    BITBUCKET_CLIENT_ID: str = Field(default="", env="BITBUCKET_CLIENT_ID")
    BITBUCKET_CLIENT_SECRET: str = Field(default="", env="BITBUCKET_CLIENT_SECRET")
    BITBUCKET_CALLBACK_URL: HttpUrl = Field(default="http://localhost:8000/auth/callback/bitbucket", env="BITBUCKET_CALLBACK_URL")
    
    # Azure DevOps OAuth Settings
    AZURE_DEVOPS_CLIENT_ID: str = Field(default="", env="AZURE_DEVOPS_CLIENT_ID")
    AZURE_DEVOPS_CLIENT_SECRET: str = Field(default="", env="AZURE_DEVOPS_CLIENT_SECRET")
    AZURE_DEVOPS_CALLBACK_URL: HttpUrl = Field(default="http://localhost:8000/auth/callback/azure_devops", env="AZURE_DEVOPS_CALLBACK_URL")
    
    # SAML 2.0 Settings
    SAML_SP_ENTITY_ID: str = Field(default="opsight-sp", env="SAML_SP_ENTITY_ID")
    SAML_ACS_URL: HttpUrl = Field(default="http://localhost:8000/auth/saml/acs", env="SAML_ACS_URL")
    SAML_SLS_URL: HttpUrl = Field(default="http://localhost:8000/auth/saml/sls", env="SAML_SLS_URL")
    SAML_IDP_ENTITY_ID: str = Field(default="", env="SAML_IDP_ENTITY_ID")
    SAML_IDP_SSO_URL: str = Field(default="", env="SAML_IDP_SSO_URL")
    SAML_IDP_SLO_URL: str = Field(default="", env="SAML_IDP_SLO_URL")
    SAML_IDP_X509_CERT: str = Field(default="", env="SAML_IDP_X509_CERT")
    
    # Email Domain Restrictions
    ALLOWED_EMAIL_DOMAINS: str = Field(default="", env="ALLOWED_EMAIL_DOMAINS")
    
    @property
    def ALLOWED_EMAIL_DOMAINS_LIST(self) -> List[str]:
        """Parse ALLOWED_EMAIL_DOMAINS string into a list."""
        if not self.ALLOWED_EMAIL_DOMAINS:
            return []
        return [domain.strip() for domain in self.ALLOWED_EMAIL_DOMAINS.split(",") if domain.strip()]

    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int

    # Database Settings
    DATABASE_URL: PostgresDsn
    
    # Database Backend Selection
    DATABASE_BACKEND: str = Field(
        default="sqlalchemy",
        env="DATABASE_BACKEND",
        description="Database backend to use: 'sqlalchemy' or 'supabase'"
    )
    
    # Supabase Settings (required when DATABASE_BACKEND=supabase)
    SUPABASE_URL: HttpUrl = Field(
        default="http://localhost:54321",
        env="SUPABASE_URL",
        description="Supabase project URL"
    )
    SUPABASE_ANON_KEY: str = Field(
        default="",
        env="SUPABASE_ANON_KEY",
        description="Supabase anonymous key (for client-side operations)"
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="",
        env="SUPABASE_SERVICE_ROLE_KEY",
        description="Supabase service role key (for server-side operations, bypasses RLS)"
    )

    # Redis Settings
    REDIS_URL: RedisDsn

    # Security Settings
    CSRF_SECRET: str

    # API Settings
    API_V1_STR: str = "/api/v1"

    # Slack Settings
    SLACK_SIGNING_SECRET: str = "dummy"
    SLACK_BOT_TOKEN: str = Field(default="dummy", env="SLACK_BOT_TOKEN")
    SLACK_WEBHOOK_URL: str = Field(
        default="http://localhost/dummy-webhook", env="SLACK_WEBHOOK_URL"
    )
    SLACK_CLIENT_ID: str = Field(default="dummy-client-id", env="SLACK_CLIENT_ID")
    SLACK_CLIENT_SECRET: str = Field(
        default="dummy-client-secret", env="SLACK_CLIENT_SECRET"
    )

    # Project Metadata
    PROJECT_NAME: str = "DevopsApp"
    VERSION: str = "0.1.0"

    # CORS Settings - handled as properties to avoid pydantic parsing issues
    @property
    def CORS_ORIGINS(self) -> List[str]:
        cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000')
        if isinstance(cors_origins, str):
            return [i.strip() for i in cors_origins.split(",") if i.strip()]
        return cors_origins if isinstance(cors_origins, list) else ['http://localhost:3000']
    
    @property  
    def ALLOWED_ORIGINS(self) -> List[str]:
        allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000')
        if isinstance(allowed_origins, str):
            return [i.strip() for i in allowed_origins.split(",") if i.strip()]
        return allowed_origins if isinstance(allowed_origins, list) else ['http://localhost:3000']

    def __init__(self, **values):
        super().__init__(**values)
        print(f"[DEBUG] Loaded CORS_ORIGINS: {self.CORS_ORIGINS}")
        print(f"[DEBUG] Loaded DATABASE_URL: {self.DATABASE_URL}")

    def get_database_url(self):
        return self.DATABASE_URL

    model_config = {"extra": "allow", "env_file": ".env", "case_sensitive": True}


# Create global settings instance
settings = Settings()
