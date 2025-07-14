"""
Comprehensive unit tests for URL validation utilities.
Tests all validation methods and edge cases.
"""

import pytest
from app.utils.url_validator import (
    URLValidator,
    URLValidationOptions,
    URLValidationResult,
    URLField,
    GitHubURLField,
    WebhookURLField,
    validate_url,
    validate_github_url,
    validate_webhook_url,
)
from pydantic import BaseModel, ValidationError


class TestURLValidator:
    """Test the URLValidator class."""

    def test_basic_url_validation(self):
        """Test basic URL validation."""
        # Valid URLs
        valid_urls = [
            "https://example.com",
            "http://localhost:3000",
            "https://api.github.com/repos/owner/repo",
            "https://192.168.1.1:8080/api",
        ]

        for url in valid_urls:
            result = URLValidator.validate(url)
            assert result.is_valid, f"URL should be valid: {url}"
            assert len(result.errors) == 0
            assert result.parsed_url is not None
            assert result.security_score > 0

    def test_invalid_url_validation(self):
        """Test invalid URL validation."""
        # Invalid URLs
        invalid_urls = [
            "",  # Empty
            "not-a-url",  # Not a URL
            "ftp://example.com",  # Invalid protocol (with default options)
            'javascript:alert("xss")',  # Dangerous protocol
            "http://example.com" + "x" * 3000,  # Too long
        ]

        for url in invalid_urls:
            result = URLValidator.validate(url)
            assert not result.is_valid, f"URL should be invalid: {url}"
            assert len(result.errors) > 0

    def test_https_requirement(self):
        """Test HTTPS requirement validation."""
        options = URLValidationOptions(require_https=True)

        # HTTPS should pass
        result = URLValidator.validate("https://example.com", options)
        assert result.is_valid

        # HTTP should fail
        result = URLValidator.validate("http://example.com", options)
        assert not result.is_valid
        assert "HTTPS is required" in result.errors

    def test_domain_allowlist(self):
        """Test domain allowlist validation."""
        options = URLValidationOptions(allowed_domains=["github.com", "api.github.com"])

        # Allowed domain should pass
        result = URLValidator.validate("https://github.com/owner/repo", options)
        assert result.is_valid

        # Disallowed domain should fail
        result = URLValidator.validate("https://evil.com", options)
        assert not result.is_valid
        assert "Domain 'evil.com' is not allowed" in result.errors

    def test_localhost_restrictions(self):
        """Test localhost restrictions."""
        options = URLValidationOptions(allow_localhost=False)

        localhost_urls = [
            "http://localhost:3000",
            "http://127.0.0.1:8080",
            "http://::1/api",
            "http://0.0.0.0:5000",
        ]

        for url in localhost_urls:
            result = URLValidator.validate(url, options)
            assert not result.is_valid
            assert "Localhost URLs are not allowed" in result.errors

    def test_ip_address_restrictions(self):
        """Test IP address restrictions."""
        options = URLValidationOptions(allow_ip_addresses=False)

        ip_urls = [
            "http://192.168.1.1",
            "http://10.0.0.1:8080",
            "https://172.16.0.1/api",
        ]

        for url in ip_urls:
            result = URLValidator.validate(url, options)
            assert not result.is_valid
            assert "IP addresses are not allowed" in result.errors

    def test_port_allowlist(self):
        """Test port allowlist validation."""
        options = URLValidationOptions(allowed_ports=[80, 443, 8080])

        # Allowed port should pass
        result = URLValidator.validate("http://example.com:8080", options)
        assert result.is_valid

        # Disallowed port should fail
        result = URLValidator.validate("http://example.com:3000", options)
        assert not result.is_valid
        assert "Port 3000 is not allowed" in result.errors

    def test_security_checks(self):
        """Test security pattern detection."""
        dangerous_urls = [
            'javascript:alert("xss")',
            'data:text/html,<script>alert("xss")</script>',
            'vbscript:msgbox("xss")',
            'http://example.com?search=<script>alert("xss")</script>',
            "http://example.com/path?param=" + "%" * 20,  # Excessive encoding
        ]

        for url in dangerous_urls:
            result = URLValidator.validate(url)
            assert not result.is_valid, f"Dangerous URL should be invalid: {url}"
            assert result.security_score < 100

    def test_github_url_validation(self):
        """Test GitHub-specific URL validation."""
        # Valid GitHub URLs
        valid_github_urls = [
            "https://github.com/owner/repo",
            "https://github.com/user-name/repo-name",
            "https://github.com/org123/project.js",
        ]

        for url in valid_github_urls:
            result = URLValidator.validate_github_url(url)
            assert result.is_valid, f"GitHub URL should be valid: {url}"

        # Invalid GitHub URLs
        invalid_github_urls = [
            "http://github.com/owner/repo",  # HTTP instead of HTTPS
            "https://gitlab.com/owner/repo",  # Wrong domain
            "https://github.com/owner",  # Missing repo name
            "https://github.com/",  # No path
            "https://github.com/owner/repo with spaces",  # Invalid characters
        ]

        for url in invalid_github_urls:
            result = URLValidator.validate_github_url(url)
            assert not result.is_valid, f"GitHub URL should be invalid: {url}"

    def test_webhook_url_validation(self):
        """Test webhook URL validation."""
        # Valid webhook URLs
        valid_webhook_urls = [
            "https://api.example.com/webhooks",
            "https://hooks.service.com/webhook/123",
        ]

        for url in valid_webhook_urls:
            result = URLValidator.validate_webhook_url(url)
            assert result.is_valid, f"Webhook URL should be valid: {url}"

        # Invalid webhook URLs
        invalid_webhook_urls = [
            "http://api.example.com/webhooks",  # HTTP instead of HTTPS
            "https://localhost/webhook",  # Localhost not allowed
            "https://192.168.1.1/webhook",  # IP address not allowed
        ]

        for url in invalid_webhook_urls:
            result = URLValidator.validate_webhook_url(url)
            assert not result.is_valid, f"Webhook URL should be invalid: {url}"

    def test_slack_webhook_url_validation(self):
        """Test Slack webhook URL validation."""
        # Valid Slack webhook URL
        valid_slack_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
        result = URLValidator.validate_slack_webhook_url(valid_slack_url)
        assert result.is_valid

        # Invalid Slack webhook URLs
        invalid_slack_urls = [
            "http://hooks.slack.com/services/T00/B00/XXX",  # HTTP
            "https://wrong.slack.com/services/T00/B00/XXX",  # Wrong domain
            "https://hooks.slack.com/wrong/T00/B00/XXX",  # Wrong path
        ]

        for url in invalid_slack_urls:
            result = URLValidator.validate_slack_webhook_url(url)
            assert not result.is_valid, f"Slack webhook URL should be invalid: {url}"

    def test_api_endpoint_validation(self):
        """Test API endpoint validation."""
        # Should allow both HTTP and HTTPS for development
        http_result = URLValidator.validate_api_endpoint("http://localhost:8000/api")
        assert http_result.is_valid

        https_result = URLValidator.validate_api_endpoint("https://api.example.com")
        assert https_result.is_valid

        # Test with localhost restriction
        no_localhost_result = URLValidator.validate_api_endpoint(
            "http://localhost:8000/api", allow_localhost=False
        )
        assert not no_localhost_result.is_valid

    def test_image_url_validation(self):
        """Test image URL validation."""
        # Valid image URLs
        valid_image_urls = [
            "https://example.com/image.jpg",
            "http://localhost/avatar.png",
            "https://cdn.example.com/user/avatar/123",
            "https://images.example.com/photo.webp",
        ]

        for url in valid_image_urls:
            result = URLValidator.validate_image_url(url)
            assert result.is_valid, f"Image URL should be valid: {url}"

        # Non-image URLs (should still be valid but with warnings)
        non_image_url = "https://example.com/api/data"
        result = URLValidator.validate_image_url(non_image_url)
        assert result.is_valid
        assert len(result.warnings) > 0

    def test_quick_validation_methods(self):
        """Test quick validation methods."""
        valid_url = "https://example.com"
        invalid_url = "not-a-url"

        assert URLValidator.is_valid_url(valid_url)
        assert not URLValidator.is_valid_url(invalid_url)

        assert URLValidator.is_valid_https_url("https://example.com")
        assert not URLValidator.is_valid_https_url("http://example.com")

        assert URLValidator.is_valid_github_url("https://github.com/owner/repo")
        assert not URLValidator.is_valid_github_url("https://example.com")

        assert URLValidator.is_valid_webhook_url("https://api.example.com/webhook")
        assert not URLValidator.is_valid_webhook_url("http://example.com/webhook")


class TestPydanticFields:
    """Test Pydantic field validators."""

    def test_url_field(self):
        """Test URLField validation."""

        class TestModel(BaseModel):
            url: URLField

        # Valid URL should pass
        model = TestModel(url="https://example.com")
        assert model.url == "https://example.com"

        # Invalid URL should raise ValidationError
        with pytest.raises(ValidationError):
            TestModel(url="not-a-url")

    def test_github_url_field(self):
        """Test GitHubURLField validation."""

        class TestModel(BaseModel):
            github_url: GitHubURLField

        # Valid GitHub URL should pass
        model = TestModel(github_url="https://github.com/owner/repo")
        assert model.github_url == "https://github.com/owner/repo"

        # Invalid GitHub URL should raise ValidationError
        with pytest.raises(ValidationError):
            TestModel(github_url="https://example.com")

    def test_webhook_url_field(self):
        """Test WebhookURLField validation."""

        class TestModel(BaseModel):
            webhook_url: WebhookURLField

        # Valid webhook URL should pass
        model = TestModel(webhook_url="https://api.example.com/webhook")
        assert model.webhook_url == "https://api.example.com/webhook"

        # Invalid webhook URL should raise ValidationError
        with pytest.raises(ValidationError):
            TestModel(webhook_url="http://localhost/webhook")


class TestHelperFunctions:
    """Test helper functions."""

    def test_validate_url_function(self):
        """Test validate_url helper function."""
        assert validate_url("https://example.com")
        assert not validate_url("not-a-url")

    def test_validate_github_url_function(self):
        """Test validate_github_url helper function."""
        assert validate_github_url("https://github.com/owner/repo")
        assert not validate_github_url("https://example.com")

    def test_validate_webhook_url_function(self):
        """Test validate_webhook_url helper function."""
        assert validate_webhook_url("https://api.example.com/webhook")
        assert not validate_webhook_url("http://localhost/webhook")


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_none_and_empty_inputs(self):
        """Test None and empty inputs."""
        # None input
        result = URLValidator.validate(None)
        assert not result.is_valid

        # Empty string
        result = URLValidator.validate("")
        assert not result.is_valid

        # Whitespace only
        result = URLValidator.validate("   ")
        assert not result.is_valid

    def test_very_long_urls(self):
        """Test very long URLs."""
        base_url = "https://example.com/"
        long_path = "x" * 5000
        long_url = base_url + long_path

        result = URLValidator.validate(long_url)
        assert not result.is_valid
        assert any("exceeds maximum length" in error for error in result.errors)

    def test_unicode_urls(self):
        """Test URLs with Unicode characters."""
        unicode_url = "https://example.com/ñäme"
        result = URLValidator.validate(unicode_url)
        # Should handle Unicode URLs gracefully
        assert result.parsed_url is not None

    def test_url_with_credentials(self):
        """Test URLs with embedded credentials."""
        url_with_creds = "https://user:pass@example.com/api"
        result = URLValidator.validate(url_with_creds)
        # Should parse but might have security warnings
        assert result.parsed_url is not None

    def test_security_score_calculation(self):
        """Test security score calculation."""
        # Perfect HTTPS URL should have high score
        result = URLValidator.validate("https://example.com")
        assert result.security_score > 90

        # HTTP URL should have lower score
        result = URLValidator.validate("http://example.com")
        assert result.security_score < 100

        # Dangerous URL should have very low score
        result = URLValidator.validate('javascript:alert("xss")')
        assert result.security_score < 70


# Pytest fixtures for common test data
@pytest.fixture
def valid_urls():
    """Fixture providing valid URLs for testing."""
    return [
        "https://example.com",
        "http://localhost:3000",
        "https://api.github.com",
        "https://192.168.1.1:8080",
    ]


@pytest.fixture
def invalid_urls():
    """Fixture providing invalid URLs for testing."""
    return [
        "",
        "not-a-url",
        'javascript:alert("xss")',
        "ftp://example.com",
        "http://example.com" + "x" * 3000,
    ]


@pytest.fixture
def github_urls():
    """Fixture providing GitHub URLs for testing."""
    return {
        "valid": [
            "https://github.com/owner/repo",
            "https://github.com/user-name/repo-name",
            "https://github.com/org123/project.js",
        ],
        "invalid": [
            "http://github.com/owner/repo",
            "https://gitlab.com/owner/repo",
            "https://github.com/owner",
            "https://github.com/",
        ],
    }


if __name__ == "__main__":
    pytest.main([__file__])
