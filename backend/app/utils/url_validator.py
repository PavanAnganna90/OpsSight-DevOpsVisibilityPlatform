"""
Comprehensive URL validation utilities for the OpsSight backend.
Provides validation for different URL types and security contexts.
"""

import re
import ipaddress
from typing import List, Optional, Dict, Any, Union
from urllib.parse import urlparse, parse_qs
from pydantic import BaseModel, Field, validator
import validators
from loguru import logger


class URLValidationOptions(BaseModel):
    """Configuration options for URL validation."""

    allowed_protocols: Optional[List[str]] = Field(default=["https", "http"])
    allowed_domains: Optional[List[str]] = None
    allowed_ports: Optional[List[int]] = None
    require_https: bool = False
    allow_localhost: bool = True
    allow_ip_addresses: bool = True
    max_length: int = 2048
    check_reachability: bool = False


class URLValidationResult(BaseModel):
    """Result of URL validation with detailed information."""

    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    parsed_url: Optional[Dict[str, Any]] = None
    security_score: int = Field(default=0, ge=0, le=100)


class URLValidator:
    """Comprehensive URL validation utility."""

    # Common localhost patterns
    LOCALHOST_PATTERNS = {
        "localhost",
        "127.0.0.1",
        "::1",
        "0.0.0.0",
    }

    # Suspicious URL patterns for security scanning
    SUSPICIOUS_PATTERNS = [
        r"<script",
        r"javascript:",
        r"vbscript:",
        r"data:",
        r"on\w+\s*=",
        r"expression\s*\(",
        r"eval\s*\(",
        r"\\x[0-9a-fA-F]{2}",  # Hex encoding
        r"%[0-9a-fA-F]{2}",  # URL encoding of suspicious chars
    ]

    @classmethod
    def validate(
        cls, url: str, options: Optional[URLValidationOptions] = None
    ) -> URLValidationResult:
        """
        Comprehensive URL validation.

        Args:
            url: URL string to validate
            options: Validation options

        Returns:
            URLValidationResult with validation details
        """
        if options is None:
            options = URLValidationOptions()

        errors = []
        warnings = []
        security_score = 100
        parsed_url = None

        # Basic validation
        if not isinstance(url, str):
            return URLValidationResult(
                is_valid=False, errors=["URL must be a string"], security_score=0
            )

        if not url.strip():
            return URLValidationResult(
                is_valid=False, errors=["URL cannot be empty"], security_score=0
            )

        # Length validation
        if len(url) > options.max_length:
            errors.append(
                f"URL exceeds maximum length of {options.max_length} characters"
            )

        # Parse URL
        try:
            parsed = urlparse(url.strip())
            parsed_url = {
                "scheme": parsed.scheme,
                "netloc": parsed.netloc,
                "hostname": parsed.hostname,
                "port": parsed.port,
                "path": parsed.path,
                "params": parsed.params,
                "query": parsed.query,
                "fragment": parsed.fragment,
            }
        except Exception as e:
            return URLValidationResult(
                is_valid=False,
                errors=[f"Failed to parse URL: {str(e)}"],
                security_score=0,
            )

        # Basic format validation using validators library
        if not validators.url(url):
            errors.append("Invalid URL format")
            security_score -= 30

        # Protocol validation
        if options.allowed_protocols and parsed.scheme not in options.allowed_protocols:
            errors.append(
                f"Protocol '{parsed.scheme}' is not allowed. "
                f"Allowed: {', '.join(options.allowed_protocols)}"
            )
            security_score -= 20

        # HTTPS requirement
        if options.require_https and parsed.scheme != "https":
            errors.append("HTTPS is required")
            security_score -= 25

        # Domain validation
        if options.allowed_domains and parsed.hostname not in options.allowed_domains:
            errors.append(f"Domain '{parsed.hostname}' is not allowed")
            security_score -= 20

        # Localhost validation
        if not options.allow_localhost and cls._is_localhost(parsed.hostname):
            errors.append("Localhost URLs are not allowed")
            security_score -= 15

        # IP address validation
        if not options.allow_ip_addresses and cls._is_ip_address(parsed.hostname):
            errors.append("IP addresses are not allowed")
            security_score -= 10

        # Port validation
        if options.allowed_ports and parsed.port:
            if parsed.port not in options.allowed_ports:
                errors.append(f"Port {parsed.port} is not allowed")
                security_score -= 10

        # Security checks
        security_errors, sec_score_reduction = cls._perform_security_checks(url, parsed)
        errors.extend(security_errors)
        security_score -= sec_score_reduction

        # Additional warnings
        if parsed.scheme == "http" and not cls._is_localhost(parsed.hostname):
            warnings.append("Using HTTP instead of HTTPS for remote URL")
            security_score -= 5

        return URLValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            parsed_url=parsed_url,
            security_score=max(0, security_score),
        )

    @classmethod
    def validate_github_url(cls, url: str) -> URLValidationResult:
        """Validate GitHub repository URL."""
        options = URLValidationOptions(
            allowed_protocols=["https"],
            allowed_domains=["github.com"],
            require_https=True,
            allow_localhost=False,
            allow_ip_addresses=False,
        )

        result = cls.validate(url, options)

        if not result.is_valid:
            return result

        # GitHub-specific validation
        parsed = urlparse(url)
        path_parts = [part for part in parsed.path.split("/") if part]

        if len(path_parts) < 2:
            result.errors.append("GitHub URL must include owner and repository name")
            result.is_valid = False
        elif not all(re.match(r"^[a-zA-Z0-9._-]+$", part) for part in path_parts[:2]):
            result.errors.append("Invalid GitHub repository name format")
            result.is_valid = False

        return result

    @classmethod
    def validate_webhook_url(cls, url: str) -> URLValidationResult:
        """Validate webhook URL with strict security requirements."""
        options = URLValidationOptions(
            allowed_protocols=["https"],
            require_https=True,
            allow_localhost=False,
            allow_ip_addresses=False,
            max_length=1024,
        )

        return cls.validate(url, options)

    @classmethod
    def validate_slack_webhook_url(cls, url: str) -> URLValidationResult:
        """Validate Slack webhook URL."""
        options = URLValidationOptions(
            allowed_protocols=["https"],
            allowed_domains=["hooks.slack.com"],
            require_https=True,
            allow_localhost=False,
            allow_ip_addresses=False,
        )

        result = cls.validate(url, options)

        if result.is_valid:
            parsed = urlparse(url)
            if not parsed.path.startswith("/services/"):
                result.errors.append("Invalid Slack webhook URL format")
                result.is_valid = False

        return result

    @classmethod
    def validate_api_endpoint(
        cls, url: str, allow_localhost: bool = True
    ) -> URLValidationResult:
        """Validate API endpoint URL."""
        options = URLValidationOptions(
            allowed_protocols=["https", "http"],
            require_https=False,  # Allow HTTP for development
            allow_localhost=allow_localhost,
            allow_ip_addresses=allow_localhost,
        )

        return cls.validate(url, options)

    @classmethod
    def validate_image_url(cls, url: str) -> URLValidationResult:
        """Validate image URL."""
        options = URLValidationOptions(
            allowed_protocols=["https", "http"],
            require_https=False,
            allow_localhost=True,
            allow_ip_addresses=True,
            max_length=512,
        )

        result = cls.validate(url, options)

        if result.is_valid:
            parsed = urlparse(url)
            path = parsed.path.lower()

            image_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
            has_image_extension = any(path.endswith(ext) for ext in image_extensions)

            if not has_image_extension and "avatar" not in path and "image" not in path:
                result.warnings.append("URL does not appear to be an image")

        return result

    @classmethod
    def _is_localhost(cls, hostname: Optional[str]) -> bool:
        """Check if hostname is localhost."""
        if not hostname:
            return False
        return hostname.lower() in cls.LOCALHOST_PATTERNS

    @classmethod
    def _is_ip_address(cls, hostname: Optional[str]) -> bool:
        """Check if hostname is an IP address."""
        if not hostname:
            return False

        try:
            ipaddress.ip_address(hostname)
            return True
        except ValueError:
            return False

    @classmethod
    def _perform_security_checks(cls, url: str, parsed) -> tuple[List[str], int]:
        """Perform security checks on URL."""
        errors = []
        score_reduction = 0

        # Check for dangerous protocols
        if parsed.scheme in ["javascript", "data", "vbscript"]:
            errors.append(f"Dangerous protocol '{parsed.scheme}' is not allowed")
            score_reduction += 40

        # Check for suspicious patterns
        url_lower = url.lower()
        for pattern in cls.SUSPICIOUS_PATTERNS:
            if re.search(pattern, url_lower):
                errors.append("URL contains suspicious content")
                score_reduction += 30
                break

        # Check for excessive URL encoding
        if url.count("%") > 10:
            errors.append("Excessive URL encoding detected")
            score_reduction += 20

        # Check for very long query strings (potential DoS)
        if len(parsed.query) > 1000:
            errors.append("Query string is excessively long")
            score_reduction += 15

        return errors, score_reduction

    @classmethod
    def is_valid_url(cls, url: str) -> bool:
        """Quick validation check."""
        return cls.validate(url).is_valid

    @classmethod
    def is_valid_https_url(cls, url: str) -> bool:
        """Quick HTTPS validation check."""
        options = URLValidationOptions(require_https=True)
        return cls.validate(url, options).is_valid

    @classmethod
    def is_valid_github_url(cls, url: str) -> bool:
        """Quick GitHub URL validation check."""
        return cls.validate_github_url(url).is_valid

    @classmethod
    def is_valid_webhook_url(cls, url: str) -> bool:
        """Quick webhook URL validation check."""
        return cls.validate_webhook_url(url).is_valid


# Pydantic validators for use in schemas
class URLField(str):
    """Custom Pydantic field for URL validation."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise ValueError("URL must be a string")

        result = URLValidator.validate(v)
        if not result.is_valid:
            raise ValueError(f"Invalid URL: {', '.join(result.errors)}")

        return v


class GitHubURLField(str):
    """Custom Pydantic field for GitHub URL validation."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise ValueError("GitHub URL must be a string")

        result = URLValidator.validate_github_url(v)
        if not result.is_valid:
            raise ValueError(f"Invalid GitHub URL: {', '.join(result.errors)}")

        return v


class WebhookURLField(str):
    """Custom Pydantic field for webhook URL validation."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise ValueError("Webhook URL must be a string")

        result = URLValidator.validate_webhook_url(v)
        if not result.is_valid:
            raise ValueError(f"Invalid webhook URL: {', '.join(result.errors)}")

        return v


# Helper functions for backward compatibility
def validate_url(url: str, **kwargs) -> bool:
    """Simple URL validation function."""
    return URLValidator.is_valid_url(url)


def validate_github_url(url: str) -> bool:
    """Simple GitHub URL validation function."""
    return URLValidator.is_valid_github_url(url)


def validate_webhook_url(url: str) -> bool:
    """Simple webhook URL validation function."""
    return URLValidator.is_valid_webhook_url(url)
