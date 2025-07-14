"""
Enhanced Input Validation and Sanitization Module

Provides comprehensive input validation, sanitization, and security checks
for all user inputs to prevent injection attacks and data corruption.
"""

import re
import html
import json
import logging
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse, parse_qs
from pydantic import BaseModel, ValidationError
import bleach
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class ValidationResult:
    """Result of validation with details about what was found."""
    
    def __init__(self, is_valid: bool, sanitized_value: Any = None, errors: List[str] = None):
        self.is_valid = is_valid
        self.sanitized_value = sanitized_value
        self.errors = errors or []
        
    def __bool__(self):
        return self.is_valid


class InputValidator:
    """Comprehensive input validation and sanitization service."""
    
    # XSS patterns to detect
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'onload\s*=',
        r'onerror\s*=',
        r'onclick\s*=',
        r'onmouseover\s*=',
        r'<iframe[^>]*>',
        r'<object[^>]*>',
        r'<embed[^>]*>',
        r'<link[^>]*>',
        r'<meta[^>]*>',
        r'eval\s*\(',
        r'expression\s*\(',
    ]
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r'\bunion\s+select\b',
        r'\bselect\s+.*\bfrom\b',
        r'\binsert\s+into\b',
        r'\bupdate\s+.*\bset\b',
        r'\bdelete\s+from\b',
        r'\bdrop\s+table\b',
        r'\bdrop\s+database\b',
        r'\bcreate\s+table\b',
        r'\balter\s+table\b',
        r';\s*--',
        r"'\s*or\s*'1'\s*=\s*'1",
        r'"\s*or\s*"1"\s*=\s*"1',
        r'\bor\s+1\s*=\s*1\b',
        r'\band\s+1\s*=\s*1\b',
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        r';\s*cat\b',
        r';\s*ls\b',
        r';\s*pwd\b',
        r';\s*whoami\b',
        r';\s*id\b',
        r';\s*rm\b',
        r';\s*curl\b',
        r';\s*wget\b',
        r'`.*`',
        r'\$\(.*\)',
        r'&&\s*\w+',
        r'\|\|\s*\w+',
        r'&\s*\w+',
        r'\|\s*\w+',
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r'\.\./+',
        r'\.\.\\+',
        r'%2e%2e%2f',
        r'%252e%252e%252f',
        r'..%2f',
        r'..%5c',
        r'%2e%2e/',
        r'%252e%252e/',
    ]
    
    # LDAP injection patterns
    LDAP_INJECTION_PATTERNS = [
        r'\(\|\(.*\)\)',
        r'\(&\(.*\)\)',
        r'\(!\(.*\)\)',
        r'\*\)',
        r'\(\*\)',
        r'%2a%29',
        r'%28%2a%29',
    ]
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize validator with configuration."""
        self.config = config or {}
        self.max_string_length = self.config.get("max_string_length", 10000)
        self.max_json_size = self.config.get("max_json_size_mb", 1)
        self.allowed_html_tags = self.config.get("allowed_html_tags", [])
        self.strict_mode = self.config.get("strict_mode", True)
        
        # Compile regex patterns for performance
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for better performance."""
        self.xss_regex = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in self.XSS_PATTERNS]
        self.sql_regex = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in self.SQL_INJECTION_PATTERNS]
        self.cmd_regex = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in self.COMMAND_INJECTION_PATTERNS]
        self.path_regex = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in self.PATH_TRAVERSAL_PATTERNS]
        self.ldap_regex = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in self.LDAP_INJECTION_PATTERNS]
    
    def validate_string(self, value: str, field_name: str = "input") -> ValidationResult:
        """Validate and sanitize a string input."""
        if not isinstance(value, str):
            return ValidationResult(False, None, [f"{field_name}: Input must be a string"])
        
        errors = []
        
        # Check length
        if len(value) > self.max_string_length:
            errors.append(f"{field_name}: String length exceeds maximum of {self.max_string_length}")
            value = value[:self.max_string_length]
        
        # Check for null bytes
        if '\x00' in value:
            errors.append(f"{field_name}: Null bytes not allowed")
            value = value.replace('\x00', '')
        
        # Check for XSS patterns
        xss_found = []
        for pattern in self.xss_regex:
            if pattern.search(value):
                xss_found.append(pattern.pattern)
        
        if xss_found:
            errors.append(f"{field_name}: XSS patterns detected: {', '.join(xss_found[:3])}")
            if self.strict_mode:
                return ValidationResult(False, None, errors)
        
        # Check for SQL injection patterns
        sql_found = []
        for pattern in self.sql_regex:
            if pattern.search(value):
                sql_found.append(pattern.pattern)
        
        if sql_found:
            errors.append(f"{field_name}: SQL injection patterns detected: {', '.join(sql_found[:3])}")
            if self.strict_mode:
                return ValidationResult(False, None, errors)
        
        # Check for command injection patterns
        cmd_found = []
        for pattern in self.cmd_regex:
            if pattern.search(value):
                cmd_found.append(pattern.pattern)
        
        if cmd_found:
            errors.append(f"{field_name}: Command injection patterns detected: {', '.join(cmd_found[:3])}")
            if self.strict_mode:
                return ValidationResult(False, None, errors)
        
        # Check for path traversal patterns
        path_found = []
        for pattern in self.path_regex:
            if pattern.search(value):
                path_found.append(pattern.pattern)
        
        if path_found:
            errors.append(f"{field_name}: Path traversal patterns detected: {', '.join(path_found[:3])}")
            if self.strict_mode:
                return ValidationResult(False, None, errors)
        
        # Check for LDAP injection patterns
        ldap_found = []
        for pattern in self.ldap_regex:
            if pattern.search(value):
                ldap_found.append(pattern.pattern)
        
        if ldap_found:
            errors.append(f"{field_name}: LDAP injection patterns detected: {', '.join(ldap_found[:3])}")
            if self.strict_mode:
                return ValidationResult(False, None, errors)
        
        # Sanitize the string
        sanitized = self._sanitize_string(value)
        
        return ValidationResult(
            is_valid=len(errors) == 0 or not self.strict_mode,
            sanitized_value=sanitized,
            errors=errors
        )
    
    def _sanitize_string(self, value: str) -> str:
        """Sanitize a string by removing/escaping dangerous content."""
        # HTML escape
        value = html.escape(value)
        
        # Remove control characters except newline, carriage return, and tab
        value = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')
        
        # If HTML tags are allowed, use bleach to clean
        if self.allowed_html_tags:
            value = bleach.clean(
                value,
                tags=self.allowed_html_tags,
                attributes={},
                strip=True
            )
        
        return value
    
    def validate_email(self, email: str, field_name: str = "email") -> ValidationResult:
        """Validate email address format."""
        if not isinstance(email, str):
            return ValidationResult(False, None, [f"{field_name}: Must be a string"])
        
        # Basic string validation first
        string_result = self.validate_string(email, field_name)
        if not string_result.is_valid and self.strict_mode:
            return string_result
        
        # Email regex validation
        email_pattern = re.compile(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )
        
        if not email_pattern.match(email):
            return ValidationResult(False, None, [f"{field_name}: Invalid email format"])
        
        # Additional email security checks
        if len(email) > 254:  # RFC 5321 limit
            return ValidationResult(False, None, [f"{field_name}: Email too long"])
        
        local, domain = email.rsplit('@', 1)
        if len(local) > 64:  # RFC 5321 limit
            return ValidationResult(False, None, [f"{field_name}: Email local part too long"])
        
        return ValidationResult(True, email.lower())
    
    def validate_url(self, url: str, field_name: str = "url") -> ValidationResult:
        """Validate URL format and security."""
        if not isinstance(url, str):
            return ValidationResult(False, None, [f"{field_name}: Must be a string"])
        
        # Basic string validation first
        string_result = self.validate_string(url, field_name)
        if not string_result.is_valid and self.strict_mode:
            return string_result
        
        try:
            parsed = urlparse(url)
        except Exception as e:
            return ValidationResult(False, None, [f"{field_name}: Invalid URL format: {str(e)}"])
        
        errors = []
        
        # Check scheme
        allowed_schemes = ['http', 'https']
        if parsed.scheme.lower() not in allowed_schemes:
            errors.append(f"{field_name}: Scheme must be http or https")
        
        # Check for dangerous schemes
        dangerous_schemes = ['javascript', 'data', 'vbscript', 'file', 'ftp']
        if parsed.scheme.lower() in dangerous_schemes:
            errors.append(f"{field_name}: Dangerous URL scheme: {parsed.scheme}")
        
        # Check hostname
        if not parsed.netloc:
            errors.append(f"{field_name}: URL must have a hostname")
        
        # Check for localhost/private IPs in production
        if self.config.get("block_private_urls", True):
            hostname = parsed.hostname
            if hostname:
                if hostname in ['localhost', '127.0.0.1', '0.0.0.0']:
                    errors.append(f"{field_name}: Localhost URLs not allowed")
                elif hostname.startswith('10.') or hostname.startswith('192.168.') or hostname.startswith('172.'):
                    errors.append(f"{field_name}: Private IP addresses not allowed")
        
        if errors and self.strict_mode:
            return ValidationResult(False, None, errors)
        
        return ValidationResult(True, url, errors)
    
    def validate_json(self, json_str: str, field_name: str = "json") -> ValidationResult:
        """Validate JSON string."""
        if not isinstance(json_str, str):
            return ValidationResult(False, None, [f"{field_name}: Must be a string"])
        
        # Check size
        size_mb = len(json_str.encode('utf-8')) / (1024 * 1024)
        if size_mb > self.max_json_size:
            return ValidationResult(False, None, [f"{field_name}: JSON too large ({size_mb:.1f}MB > {self.max_json_size}MB)"])
        
        # Basic string validation
        string_result = self.validate_string(json_str, field_name)
        if not string_result.is_valid and self.strict_mode:
            return string_result
        
        # JSON parsing validation
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            return ValidationResult(False, None, [f"{field_name}: Invalid JSON: {str(e)}"])
        
        # Check for deeply nested objects (DoS protection)
        max_depth = self.config.get("max_json_depth", 20)
        if self._get_json_depth(parsed) > max_depth:
            return ValidationResult(False, None, [f"{field_name}: JSON nesting too deep"])
        
        return ValidationResult(True, parsed)
    
    def _get_json_depth(self, obj: Any, depth: int = 0) -> int:
        """Calculate the maximum depth of a JSON object."""
        if isinstance(obj, dict):
            return max([self._get_json_depth(v, depth + 1) for v in obj.values()], default=depth)
        elif isinstance(obj, list):
            return max([self._get_json_depth(item, depth + 1) for item in obj], default=depth)
        else:
            return depth
    
    def validate_integer(self, value: Union[int, str], field_name: str = "integer", 
                        min_val: Optional[int] = None, max_val: Optional[int] = None) -> ValidationResult:
        """Validate integer value."""
        if isinstance(value, str):
            try:
                value = int(value)
            except ValueError:
                return ValidationResult(False, None, [f"{field_name}: Must be a valid integer"])
        
        if not isinstance(value, int):
            return ValidationResult(False, None, [f"{field_name}: Must be an integer"])
        
        errors = []
        
        if min_val is not None and value < min_val:
            errors.append(f"{field_name}: Must be >= {min_val}")
        
        if max_val is not None and value > max_val:
            errors.append(f"{field_name}: Must be <= {max_val}")
        
        return ValidationResult(len(errors) == 0, value, errors)
    
    def validate_list(self, items: List[Any], field_name: str = "list",
                     max_items: Optional[int] = None) -> ValidationResult:
        """Validate list of items."""
        if not isinstance(items, list):
            return ValidationResult(False, None, [f"{field_name}: Must be a list"])
        
        errors = []
        
        if max_items is not None and len(items) > max_items:
            errors.append(f"{field_name}: Too many items (max: {max_items})")
        
        # Validate each item in the list
        sanitized_items = []
        for i, item in enumerate(items):
            if isinstance(item, str):
                result = self.validate_string(item, f"{field_name}[{i}]")
                if not result.is_valid and self.strict_mode:
                    errors.extend(result.errors)
                else:
                    sanitized_items.append(result.sanitized_value)
            else:
                sanitized_items.append(item)
        
        return ValidationResult(
            len(errors) == 0 or not self.strict_mode,
            sanitized_items,
            errors
        )
    
    def validate_dict(self, data: Dict[str, Any], field_name: str = "dict",
                     max_keys: Optional[int] = None) -> ValidationResult:
        """Validate dictionary data."""
        if not isinstance(data, dict):
            return ValidationResult(False, None, [f"{field_name}: Must be a dictionary"])
        
        errors = []
        
        if max_keys is not None and len(data) > max_keys:
            errors.append(f"{field_name}: Too many keys (max: {max_keys})")
        
        # Validate keys and values
        sanitized_data = {}
        for key, value in data.items():
            # Validate key
            key_result = self.validate_string(str(key), f"{field_name}.{key}")
            if not key_result.is_valid and self.strict_mode:
                errors.extend(key_result.errors)
                continue
            
            # Validate value
            if isinstance(value, str):
                value_result = self.validate_string(value, f"{field_name}.{key}")
                if not value_result.is_valid and self.strict_mode:
                    errors.extend(value_result.errors)
                else:
                    sanitized_data[key_result.sanitized_value] = value_result.sanitized_value
            elif isinstance(value, (dict, list)):
                # Recursively validate nested structures
                if isinstance(value, dict):
                    nested_result = self.validate_dict(value, f"{field_name}.{key}")
                else:
                    nested_result = self.validate_list(value, f"{field_name}.{key}")
                
                if not nested_result.is_valid and self.strict_mode:
                    errors.extend(nested_result.errors)
                else:
                    sanitized_data[key_result.sanitized_value] = nested_result.sanitized_value
            else:
                sanitized_data[key_result.sanitized_value] = value
        
        return ValidationResult(
            len(errors) == 0 or not self.strict_mode,
            sanitized_data,
            errors
        )
    
    def validate_and_raise(self, value: Any, field_name: str, validation_type: str = "string") -> Any:
        """Validate input and raise HTTPException if invalid."""
        if validation_type == "string":
            result = self.validate_string(value, field_name)
        elif validation_type == "email":
            result = self.validate_email(value, field_name)
        elif validation_type == "url":
            result = self.validate_url(value, field_name)
        elif validation_type == "json":
            result = self.validate_json(value, field_name)
        elif validation_type == "integer":
            result = self.validate_integer(value, field_name)
        elif validation_type == "list":
            result = self.validate_list(value, field_name)
        elif validation_type == "dict":
            result = self.validate_dict(value, field_name)
        else:
            raise ValueError(f"Unknown validation type: {validation_type}")
        
        if not result.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation failed: {'; '.join(result.errors)}"
            )
        
        return result.sanitized_value


# Global validator instance
input_validator = InputValidator()


def validate_request_data(data: Dict[str, Any], schema: Dict[str, str]) -> Dict[str, Any]:
    """
    Validate request data against a schema.
    
    Args:
        data: Request data to validate
        schema: Schema mapping field names to validation types
        
    Returns:
        Dict with validated and sanitized data
        
    Raises:
        HTTPException: If validation fails
    """
    validated_data = {}
    
    for field_name, validation_type in schema.items():
        if field_name in data:
            validated_data[field_name] = input_validator.validate_and_raise(
                data[field_name], field_name, validation_type
            )
    
    return validated_data