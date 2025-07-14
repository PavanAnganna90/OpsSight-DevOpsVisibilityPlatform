"""
Webhook validation service for verifying webhook authenticity and security.
"""

import hmac
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of webhook validation."""
    is_valid: bool
    error_message: Optional[str] = None
    warning_message: Optional[str] = None


class WebhookValidator:
    """Service for validating webhook requests."""

    def __init__(self):
        """Initialize webhook validator."""
        self.max_timestamp_diff = 300  # 5 minutes
        self.max_payload_size = 1024 * 1024  # 1MB

    def validate_generic_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str],
        body: bytes,
        secret: Optional[str] = None
    ) -> ValidationResult:
        """Validate a generic webhook request."""
        try:
            # Check payload size
            if len(body) > self.max_payload_size:
                return ValidationResult(
                    is_valid=False,
                    error_message=f"Payload too large: {len(body)} bytes"
                )

            # Validate signature if secret is provided
            if secret:
                signature = headers.get('x-signature') or headers.get('x-hub-signature-256')
                if signature:
                    if not self._verify_signature(body, signature, secret):
                        return ValidationResult(
                            is_valid=False,
                            error_message="Invalid webhook signature"
                        )
                else:
                    return ValidationResult(
                        is_valid=False,
                        error_message="Missing webhook signature"
                    )

            # Check for required fields in payload
            validation_result = self._validate_payload_structure(payload)
            if not validation_result.is_valid:
                return validation_result

            return ValidationResult(is_valid=True)

        except Exception as e:
            logger.error(f"Failed to validate generic webhook: {str(e)}")
            return ValidationResult(
                is_valid=False,
                error_message=f"Validation error: {str(e)}"
            )

    def validate_slack_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str],
        body: bytes,
        signing_secret: str
    ) -> ValidationResult:
        """Validate a Slack webhook request."""
        try:
            # Get Slack-specific headers
            signature = headers.get('x-slack-signature')
            timestamp = headers.get('x-slack-request-timestamp')

            if not signature or not timestamp:
                return ValidationResult(
                    is_valid=False,
                    error_message="Missing Slack signature or timestamp"
                )

            # Verify timestamp to prevent replay attacks
            try:
                request_time = int(timestamp)
                current_time = int(datetime.utcnow().timestamp())
                
                if abs(current_time - request_time) > self.max_timestamp_diff:
                    return ValidationResult(
                        is_valid=False,
                        error_message="Request timestamp too old"
                    )
            except ValueError:
                return ValidationResult(
                    is_valid=False,
                    error_message="Invalid timestamp format"
                )

            # Verify Slack signature
            if not self._verify_slack_signature(body, signature, timestamp, signing_secret):
                return ValidationResult(
                    is_valid=False,
                    error_message="Invalid Slack signature"
                )

            # Validate Slack payload structure
            if payload.get('type') == 'url_verification':
                if 'challenge' not in payload:
                    return ValidationResult(
                        is_valid=False,
                        error_message="Missing challenge in URL verification"
                    )
            elif payload.get('type') == 'event_callback':
                if 'event' not in payload:
                    return ValidationResult(
                        is_valid=False,
                        error_message="Missing event in event callback"
                    )

            return ValidationResult(is_valid=True)

        except Exception as e:
            logger.error(f"Failed to validate Slack webhook: {str(e)}")
            return ValidationResult(
                is_valid=False,
                error_message=f"Slack validation error: {str(e)}"
            )

    def validate_prometheus_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> ValidationResult:
        """Validate a Prometheus webhook request."""
        try:
            # Check required Prometheus fields
            if 'alerts' not in payload:
                return ValidationResult(
                    is_valid=False,
                    error_message="Missing 'alerts' field in Prometheus payload"
                )

            alerts = payload['alerts']
            if not isinstance(alerts, list):
                return ValidationResult(
                    is_valid=False,
                    error_message="'alerts' field must be a list"
                )

            # Validate each alert
            for i, alert in enumerate(alerts):
                if not isinstance(alert, dict):
                    return ValidationResult(
                        is_valid=False,
                        error_message=f"Alert {i} is not a valid object"
                    )

                # Check required alert fields
                required_fields = ['status', 'labels']
                for field in required_fields:
                    if field not in alert:
                        return ValidationResult(
                            is_valid=False,
                            error_message=f"Alert {i} missing required field: {field}"
                        )

            return ValidationResult(is_valid=True)

        except Exception as e:
            logger.error(f"Failed to validate Prometheus webhook: {str(e)}")
            return ValidationResult(
                is_valid=False,
                error_message=f"Prometheus validation error: {str(e)}"
            )

    def validate_grafana_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> ValidationResult:
        """Validate a Grafana webhook request."""
        try:
            # Check required Grafana fields
            required_fields = ['title', 'state']
            for field in required_fields:
                if field not in payload:
                    return ValidationResult(
                        is_valid=False,
                        error_message=f"Missing required field: {field}"
                    )

            # Validate state values
            valid_states = ['alerting', 'ok', 'no_data', 'paused', 'pending']
            state = payload.get('state')
            if state not in valid_states:
                return ValidationResult(
                    is_valid=False,
                    warning_message=f"Unknown Grafana state: {state}"
                )

            return ValidationResult(is_valid=True)

        except Exception as e:
            logger.error(f"Failed to validate Grafana webhook: {str(e)}")
            return ValidationResult(
                is_valid=False,
                error_message=f"Grafana validation error: {str(e)}"
            )

    def validate_pagerduty_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> ValidationResult:
        """Validate a PagerDuty webhook request."""
        try:
            # Check required PagerDuty fields
            if 'messages' not in payload:
                return ValidationResult(
                    is_valid=False,
                    error_message="Missing 'messages' field in PagerDuty payload"
                )

            messages = payload['messages']
            if not isinstance(messages, list):
                return ValidationResult(
                    is_valid=False,
                    error_message="'messages' field must be a list"
                )

            # Validate each message
            for i, message in enumerate(messages):
                if not isinstance(message, dict):
                    return ValidationResult(
                        is_valid=False,
                        error_message=f"Message {i} is not a valid object"
                    )

                # Check for incident data
                if 'incident' not in message:
                    return ValidationResult(
                        is_valid=False,
                        error_message=f"Message {i} missing incident data"
                    )

            return ValidationResult(is_valid=True)

        except Exception as e:
            logger.error(f"Failed to validate PagerDuty webhook: {str(e)}")
            return ValidationResult(
                is_valid=False,
                error_message=f"PagerDuty validation error: {str(e)}"
            )

    def _verify_signature(self, body: bytes, signature: str, secret: str) -> bool:
        """Verify generic webhook signature."""
        try:
            # Support different signature formats
            if signature.startswith('sha256='):
                expected_signature = 'sha256=' + hmac.new(
                    secret.encode(),
                    body,
                    hashlib.sha256
                ).hexdigest()
            elif signature.startswith('sha1='):
                expected_signature = 'sha1=' + hmac.new(
                    secret.encode(),
                    body,
                    hashlib.sha1
                ).hexdigest()
            else:
                # Assume plain HMAC-SHA256
                expected_signature = hmac.new(
                    secret.encode(),
                    body,
                    hashlib.sha256
                ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)

        except Exception as e:
            logger.error(f"Failed to verify signature: {str(e)}")
            return False

    def _verify_slack_signature(
        self,
        body: bytes,
        signature: str,
        timestamp: str,
        signing_secret: str
    ) -> bool:
        """Verify Slack webhook signature."""
        try:
            # Slack signature format: v0=<signature>
            if not signature.startswith('v0='):
                return False

            # Create signature base string
            sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
            
            # Compute expected signature
            expected_signature = 'v0=' + hmac.new(
                signing_secret.encode(),
                sig_basestring.encode(),
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)

        except Exception as e:
            logger.error(f"Failed to verify Slack signature: {str(e)}")
            return False

    def _validate_payload_structure(self, payload: Dict[str, Any]) -> ValidationResult:
        """Validate basic payload structure."""
        try:
            # Check if payload is empty
            if not payload:
                return ValidationResult(
                    is_valid=False,
                    error_message="Empty payload"
                )

            # Check for common malicious patterns
            if self._contains_malicious_content(payload):
                return ValidationResult(
                    is_valid=False,
                    error_message="Potentially malicious content detected"
                )

            return ValidationResult(is_valid=True)

        except Exception as e:
            logger.error(f"Failed to validate payload structure: {str(e)}")
            return ValidationResult(
                is_valid=False,
                error_message=f"Structure validation error: {str(e)}"
            )

    def _contains_malicious_content(self, payload: Dict[str, Any]) -> bool:
        """Check for potentially malicious content in payload."""
        try:
            # Convert payload to string for pattern matching
            payload_str = json.dumps(payload).lower()
            
            # Check for common injection patterns
            malicious_patterns = [
                'javascript:',
                '<script',
                'eval(',
                'exec(',
                'system(',
                'shell_exec(',
                'passthru(',
                'file_get_contents(',
                '../',
                '..\\',
                'union select',
                'drop table',
                'delete from',
                'insert into'
            ]
            
            for pattern in malicious_patterns:
                if pattern in payload_str:
                    logger.warning(f"Detected malicious pattern: {pattern}")
                    return True
            
            return False

        except Exception as e:
            logger.error(f"Failed to check for malicious content: {str(e)}")
            return True  # Err on the side of caution

    def validate_webhook_config(self, config: Dict[str, Any]) -> ValidationResult:
        """Validate webhook configuration."""
        try:
            required_fields = ['name', 'source', 'url_path']
            for field in required_fields:
                if field not in config or not config[field]:
                    return ValidationResult(
                        is_valid=False,
                        error_message=f"Missing required field: {field}"
                    )

            # Validate source
            valid_sources = ['slack', 'prometheus', 'grafana', 'pagerduty', 'generic']
            source = config.get('source')
            if source not in valid_sources:
                return ValidationResult(
                    is_valid=False,
                    error_message=f"Invalid source: {source}. Must be one of: {', '.join(valid_sources)}"
                )

            # Validate URL path
            url_path = config.get('url_path', '')
            if not url_path.startswith('/'):
                return ValidationResult(
                    is_valid=False,
                    error_message="URL path must start with '/'"
                )

            if len(url_path) > 500:
                return ValidationResult(
                    is_valid=False,
                    error_message="URL path too long (max 500 characters)"
                )

            return ValidationResult(is_valid=True)

        except Exception as e:
            logger.error(f"Failed to validate webhook config: {str(e)}")
            return ValidationResult(
                is_valid=False,
                error_message=f"Config validation error: {str(e)}"
            )


# Global service instance
webhook_validator = WebhookValidator()