"""
Comprehensive Security Configuration System

Centralizes all security settings, provides secure defaults,
and manages security policies across the application.
"""

import os
import logging
from typing import Dict, List, Optional, Set
from enum import Enum
from dataclasses import dataclass, field
from pydantic_settings import BaseSettings
from pydantic import Field, validator

logger = logging.getLogger(__name__)


class SecurityLevel(Enum):
    """Security levels for different environments."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    HIGH_SECURITY = "high_security"


class EncryptionAlgorithm(Enum):
    """Supported encryption algorithms."""
    AES_256_GCM = "aes_256_gcm"
    CHACHA20_POLY1305 = "chacha20_poly1305"
    FERNET = "fernet"


@dataclass
class SecurityHeaders:
    """Security headers configuration."""
    # Core security headers
    x_content_type_options: str = "nosniff"
    x_frame_options: str = "DENY"
    x_xss_protection: str = "1; mode=block"
    strict_transport_security: str = "max-age=31536000; includeSubDomains; preload"
    referrer_policy: str = "strict-origin-when-cross-origin"
    
    # Enhanced security headers
    permissions_policy: str = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()"
    x_permitted_cross_domain_policies: str = "none"
    cross_origin_embedder_policy: str = "require-corp"
    cross_origin_opener_policy: str = "same-origin"
    cross_origin_resource_policy: str = "same-origin"
    
    # Cache control
    cache_control_sensitive: str = "no-store, no-cache, must-revalidate, private"
    cache_control_public: str = "public, max-age=3600"
    cache_control_health: str = "public, max-age=60"
    
    # Server identification (hide for security)
    server: str = "OpsSight-API"
    x_powered_by: str = ""


@dataclass
class CSPConfig:
    """Content Security Policy configuration."""
    default_src: List[str] = field(default_factory=lambda: ["'self'"])
    script_src: List[str] = field(default_factory=lambda: ["'self'"])
    style_src: List[str] = field(default_factory=lambda: ["'self'"])
    img_src: List[str] = field(default_factory=lambda: ["'self'", "data:", "https:"])
    font_src: List[str] = field(default_factory=lambda: ["'self'", "https://fonts.gstatic.com"])
    connect_src: List[str] = field(default_factory=lambda: ["'self'"])
    media_src: List[str] = field(default_factory=lambda: ["'self'"])
    object_src: List[str] = field(default_factory=lambda: ["'none'"])
    frame_src: List[str] = field(default_factory=lambda: ["'none'"])
    worker_src: List[str] = field(default_factory=lambda: ["'self'"])
    manifest_src: List[str] = field(default_factory=lambda: ["'self'"])
    base_uri: List[str] = field(default_factory=lambda: ["'self'"])
    form_action: List[str] = field(default_factory=lambda: ["'self'"])
    frame_ancestors: List[str] = field(default_factory=lambda: ["'none'"])
    upgrade_insecure_requests: bool = True
    
    def build_header(self, environment: SecurityLevel = SecurityLevel.PRODUCTION) -> str:
        """Build CSP header string."""
        directives = []
        
        # Add all directives
        for attr_name in self.__dataclass_fields__:
            if attr_name == "upgrade_insecure_requests":
                if self.upgrade_insecure_requests:
                    directives.append("upgrade-insecure-requests")
                continue
            
            values = getattr(self, attr_name)
            if values:
                directive_name = attr_name.replace("_", "-")
                directives.append(f"{directive_name} {' '.join(values)}")
        
        # Environment-specific modifications
        if environment == SecurityLevel.DEVELOPMENT:
            # Allow unsafe-inline and unsafe-eval in development
            directives = [d.replace("'self'", "'self' 'unsafe-inline' 'unsafe-eval'") 
                         if "script-src" in d or "style-src" in d else d for d in directives]
        
        return "; ".join(directives)


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""
    # API rate limits
    api_requests_per_minute: int = 100
    api_requests_per_hour: int = 1000
    api_burst_requests: int = 20
    api_burst_window: int = 10
    
    # Authentication rate limits
    auth_requests_per_minute: int = 5
    auth_requests_per_hour: int = 20
    auth_burst_requests: int = 3
    auth_burst_window: int = 60
    
    # Upload rate limits
    upload_requests_per_hour: int = 10
    upload_requests_per_day: int = 50
    upload_burst_requests: int = 3
    upload_burst_window: int = 300
    
    # Admin rate limits
    admin_requests_per_minute: int = 1000
    admin_requests_per_hour: int = 10000
    
    # Threat detection
    suspicious_requests_per_hour: int = 500
    failed_auth_attempts_limit: int = 10
    different_endpoints_per_minute: int = 50
    
    # Blocking
    block_duration_rate_limit: int = 3600  # 1 hour
    block_duration_threat: int = 7200      # 2 hours
    block_duration_severe: int = 86400     # 24 hours


@dataclass
class EncryptionConfig:
    """Encryption configuration."""
    algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM
    key_derivation_iterations: int = 100000
    salt_length: int = 32
    nonce_length: int = 12
    tag_length: int = 16
    
    # Key rotation
    key_rotation_days: int = 90
    key_backup_count: int = 3
    
    # Password hashing
    password_hash_algorithm: str = "argon2"
    password_hash_time_cost: int = 3
    password_hash_memory_cost: int = 65536
    password_hash_parallelism: int = 1


@dataclass
class InputValidationConfig:
    """Input validation configuration."""
    max_string_length: int = 10000
    max_json_size_mb: int = 1
    max_json_depth: int = 20
    max_array_items: int = 1000
    max_dict_keys: int = 100
    
    # File upload validation
    max_file_size_mb: int = 10
    allowed_file_extensions: Set[str] = field(default_factory=lambda: {
        '.txt', '.json', '.yaml', '.yml', '.csv', '.log',
        '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg'
    })
    blocked_file_extensions: Set[str] = field(default_factory=lambda: {
        '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
        '.vbs', '.js', '.jar', '.sh', '.ps1', '.php'
    })
    
    # Content validation
    scan_for_malware: bool = True
    scan_for_secrets: bool = True
    allowed_html_tags: List[str] = field(default_factory=list)
    
    # Strict mode (reject on any suspicious pattern)
    strict_mode: bool = True


class SecuritySettings(BaseSettings):
    """Main security settings loaded from environment."""
    
    # Environment
    security_level: SecurityLevel = SecurityLevel.PRODUCTION
    debug_mode: bool = False
    
    # Database encryption
    database_encryption_key: Optional[str] = None
    encrypt_sensitive_fields: bool = True
    
    # JWT Configuration
    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # Session Security
    session_timeout_minutes: int = 480  # 8 hours
    session_absolute_timeout_hours: int = 24
    max_concurrent_sessions: int = 5
    session_hijacking_detection: bool = True
    
    # Password Policy
    password_min_length: int = 12
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_symbols: bool = True
    password_prevent_reuse_count: int = 5
    password_expiry_days: int = 90
    
    # Account Security
    max_login_attempts: int = 5
    account_lockout_duration_minutes: int = 30
    require_mfa_for_admin: bool = True
    require_mfa_for_sensitive_ops: bool = True
    
    # Network Security
    allowed_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    blocked_ips: List[str] = Field(default_factory=list)
    allowed_ip_ranges: List[str] = Field(default_factory=list)
    block_private_urls: bool = True
    
    # Security Headers
    enable_security_headers: bool = True
    custom_security_headers: Dict[str, str] = Field(default_factory=dict)
    
    # Monitoring
    security_event_logging: bool = True
    failed_login_alerting: bool = True
    suspicious_activity_alerting: bool = True
    security_scan_frequency_hours: int = 24
    
    # Compliance
    gdpr_compliance: bool = True
    pci_compliance: bool = False
    soc2_compliance: bool = False
    hipaa_compliance: bool = False
    
    # Backup and Recovery
    security_backup_encryption: bool = True
    security_backup_frequency_hours: int = 6
    security_incident_response_plan: bool = True
    
    class Config:
        env_prefix = "SECURITY_"
        case_sensitive = False
    
    @validator('jwt_secret_key')
    def validate_jwt_secret(cls, v):
        if len(v) < 32:
            raise ValueError('JWT secret key must be at least 32 characters long')
        return v
    
    @validator('password_min_length')
    def validate_password_length(cls, v):
        if v < 8:
            raise ValueError('Minimum password length must be at least 8 characters')
        return v


class SecurityConfigManager:
    """Manages security configuration and provides convenient access."""
    
    def __init__(self, settings: Optional[SecuritySettings] = None):
        """Initialize with settings or load from environment."""
        self.settings = settings or SecuritySettings()
        self.headers = SecurityHeaders()
        self.csp = CSPConfig()
        self.rate_limits = RateLimitConfig()
        self.encryption = EncryptionConfig()
        self.input_validation = InputValidationConfig()
        
        # Apply security level adjustments
        self._apply_security_level_config()
    
    def _apply_security_level_config(self):
        """Apply security level-specific configurations."""
        level = self.settings.security_level
        
        if level == SecurityLevel.DEVELOPMENT:
            # Relaxed settings for development
            self.rate_limits.api_requests_per_minute = 1000
            self.rate_limits.auth_requests_per_minute = 50
            self.input_validation.strict_mode = False
            self.input_validation.max_string_length = 50000
            
        elif level == SecurityLevel.STAGING:
            # Moderate security for staging
            self.rate_limits.api_requests_per_minute = 200
            self.rate_limits.auth_requests_per_minute = 10
            
        elif level == SecurityLevel.PRODUCTION:
            # Standard production security
            pass  # Use defaults
            
        elif level == SecurityLevel.HIGH_SECURITY:
            # Enhanced security for sensitive environments
            self.rate_limits.api_requests_per_minute = 50
            self.rate_limits.auth_requests_per_minute = 3
            self.rate_limits.suspicious_requests_per_hour = 100
            self.input_validation.max_string_length = 5000
            self.input_validation.max_file_size_mb = 5
            self.settings.session_timeout_minutes = 120  # 2 hours
            self.settings.max_concurrent_sessions = 2
    
    def get_security_headers(self, path: str = "/") -> Dict[str, str]:
        """Get security headers for a specific path."""
        headers = {}
        
        if not self.settings.enable_security_headers:
            return headers
        
        # Base security headers
        headers.update({
            "X-Content-Type-Options": self.headers.x_content_type_options,
            "X-Frame-Options": self.headers.x_frame_options,
            "X-XSS-Protection": self.headers.x_xss_protection,
            "Strict-Transport-Security": self.headers.strict_transport_security,
            "Referrer-Policy": self.headers.referrer_policy,
            "Permissions-Policy": self.headers.permissions_policy,
            "X-Permitted-Cross-Domain-Policies": self.headers.x_permitted_cross_domain_policies,
            "Cross-Origin-Embedder-Policy": self.headers.cross_origin_embedder_policy,
            "Cross-Origin-Opener-Policy": self.headers.cross_origin_opener_policy,
            "Cross-Origin-Resource-Policy": self.headers.cross_origin_resource_policy,
            "Server": self.headers.server,
            "X-Powered-By": self.headers.x_powered_by,
        })
        
        # CSP header
        headers["Content-Security-Policy"] = self.csp.build_header(self.settings.security_level)
        
        # Path-specific cache control
        if path.startswith("/api/auth") or path.startswith("/api/admin"):
            headers["Cache-Control"] = self.headers.cache_control_sensitive
        elif path.startswith("/health") or path.startswith("/metrics"):
            headers["Cache-Control"] = self.headers.cache_control_health
        elif path.startswith("/api/public"):
            headers["Cache-Control"] = self.headers.cache_control_public
        else:
            headers["Cache-Control"] = self.headers.cache_control_sensitive
        
        # Add custom headers
        headers.update(self.settings.custom_security_headers)
        
        return headers
    
    def get_rate_limit_config(self, limit_type: str) -> Dict:
        """Get rate limit configuration for a specific type."""
        config_map = {
            "api": {
                "requests_per_minute": self.rate_limits.api_requests_per_minute,
                "requests_per_hour": self.rate_limits.api_requests_per_hour,
                "burst_requests": self.rate_limits.api_burst_requests,
                "burst_window": self.rate_limits.api_burst_window,
            },
            "auth": {
                "requests_per_minute": self.rate_limits.auth_requests_per_minute,
                "requests_per_hour": self.rate_limits.auth_requests_per_hour,
                "burst_requests": self.rate_limits.auth_burst_requests,
                "burst_window": self.rate_limits.auth_burst_window,
            },
            "upload": {
                "requests_per_hour": self.rate_limits.upload_requests_per_hour,
                "requests_per_day": self.rate_limits.upload_requests_per_day,
                "burst_requests": self.rate_limits.upload_burst_requests,
                "burst_window": self.rate_limits.upload_burst_window,
            },
            "admin": {
                "requests_per_minute": self.rate_limits.admin_requests_per_minute,
                "requests_per_hour": self.rate_limits.admin_requests_per_hour,
            },
        }
        
        return config_map.get(limit_type, config_map["api"])
    
    def is_file_allowed(self, filename: str, content_type: str = "") -> bool:
        """Check if a file is allowed based on extension and content type."""
        if not filename:
            return False
        
        # Get file extension
        extension = os.path.splitext(filename.lower())[1]
        
        # Check blocked extensions first
        if extension in self.input_validation.blocked_file_extensions:
            return False
        
        # Check allowed extensions
        if self.input_validation.allowed_file_extensions:
            return extension in self.input_validation.allowed_file_extensions
        
        return True
    
    def get_security_context(self) -> Dict:
        """Get complete security context for debugging/monitoring."""
        return {
            "security_level": self.settings.security_level.value,
            "debug_mode": self.settings.debug_mode,
            "encryption_enabled": self.settings.encrypt_sensitive_fields,
            "mfa_required_admin": self.settings.require_mfa_for_admin,
            "session_timeout": self.settings.session_timeout_minutes,
            "rate_limits": {
                "api_per_minute": self.rate_limits.api_requests_per_minute,
                "auth_per_minute": self.rate_limits.auth_requests_per_minute,
            },
            "compliance": {
                "gdpr": self.settings.gdpr_compliance,
                "pci": self.settings.pci_compliance,
                "soc2": self.settings.soc2_compliance,
                "hipaa": self.settings.hipaa_compliance,
            },
        }


# Global security config instance
security_config = SecurityConfigManager()


def get_security_config() -> SecurityConfigManager:
    """Get global security configuration."""
    return security_config