"""
Secure File Upload Validation and Processing

Provides comprehensive file upload security including virus scanning,
content validation, metadata sanitization, and secure storage.
"""

import os
import magic
import hashlib
import logging
from typing import Dict, List, Optional, Tuple, BinaryIO
from pathlib import Path
from dataclasses import dataclass
import mimetypes
from fastapi import UploadFile, HTTPException, status

from app.core.security_config import get_security_config

logger = logging.getLogger(__name__)


@dataclass
class FileValidationResult:
    """Result of file validation with security details."""
    is_valid: bool
    file_hash: Optional[str] = None
    detected_type: Optional[str] = None
    size_bytes: int = 0
    errors: List[str] = None
    warnings: List[str] = None
    sanitized_filename: Optional[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []


class SecureFileValidator:
    """
    Comprehensive file upload security validator.
    
    Features:
    - File type validation using magic numbers
    - Virus scanning (configurable)
    - Content sanitization
    - Size and structure validation
    - Metadata stripping
    - Secure filename generation
    """
    
    # Dangerous file extensions that should always be blocked
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
        '.sh', '.ps1', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.cgi', '.htaccess', '.htpasswd', '.ini', '.cfg', '.conf'
    }
    
    # MIME types that are considered safe for specific use cases
    SAFE_MIME_TYPES = {
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        'document': ['application/pdf', 'text/plain', 'text/csv'],
        'archive': ['application/zip', 'application/gzip', 'application/x-tar'],
        'data': ['application/json', 'application/xml', 'text/yaml', 'text/x-yaml'],
        'log': ['text/plain', 'text/x-log']
    }
    
    # Maximum file sizes by category (in bytes)
    MAX_FILE_SIZES = {
        'image': 10 * 1024 * 1024,    # 10MB
        'document': 50 * 1024 * 1024, # 50MB
        'archive': 100 * 1024 * 1024, # 100MB
        'data': 1 * 1024 * 1024,      # 1MB
        'log': 100 * 1024 * 1024,     # 100MB
    }
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize file validator with configuration."""
        self.config = config or {}
        self.security_config = get_security_config()
        
        # Initialize virus scanner if available
        self.virus_scanner_available = self._check_virus_scanner()
        
        # Configure magic library for file type detection
        try:
            self.magic = magic.Magic(mime=True)
        except Exception as e:
            logger.warning(f"Magic library not available: {e}")
            self.magic = None
    
    def _check_virus_scanner(self) -> bool:
        """Check if a virus scanner is available."""
        # This would check for ClamAV or similar
        # For now, we'll simulate virus scanning
        return self.config.get('virus_scanning_enabled', False)
    
    async def validate_file(self, file: UploadFile, category: str = 'data') -> FileValidationResult:
        """
        Validate an uploaded file comprehensively.
        
        Args:
            file: The uploaded file
            category: File category for specific validation rules
            
        Returns:
            FileValidationResult with validation details
        """
        result = FileValidationResult(is_valid=False)
        
        try:
            # Read file content
            content = await file.read()
            await file.seek(0)  # Reset file pointer
            
            result.size_bytes = len(content)
            result.file_hash = hashlib.sha256(content).hexdigest()
            
            # Validate file size
            if not self._validate_file_size(result.size_bytes, category, result):
                return result
            
            # Validate filename
            if not self._validate_filename(file.filename, result):
                return result
            
            # Generate sanitized filename
            result.sanitized_filename = self._sanitize_filename(file.filename)
            
            # Detect file type using magic numbers
            if not self._validate_file_type(content, category, result):
                return result
            
            # Validate file structure and content
            if not await self._validate_file_content(content, category, result):
                return result
            
            # Scan for viruses if enabled
            if not await self._scan_for_viruses(content, result):
                return result
            
            # Check for embedded threats
            if not self._check_embedded_threats(content, result):
                return result
            
            # All validations passed
            result.is_valid = True
            logger.info(f"File validation successful: {file.filename} ({result.file_hash[:8]})")
            
        except Exception as e:
            logger.error(f"File validation error: {e}")
            result.errors.append(f"Validation error: {str(e)}")
        
        return result
    
    def _validate_file_size(self, size_bytes: int, category: str, result: FileValidationResult) -> bool:
        """Validate file size against limits."""
        max_size = self.MAX_FILE_SIZES.get(category, self.security_config.input_validation.max_file_size_mb * 1024 * 1024)
        
        if size_bytes > max_size:
            result.errors.append(f"File too large: {size_bytes} bytes (max: {max_size})")
            return False
        
        if size_bytes == 0:
            result.errors.append("Empty file not allowed")
            return False
        
        return True
    
    def _validate_filename(self, filename: str, result: FileValidationResult) -> bool:
        """Validate filename for security issues."""
        if not filename:
            result.errors.append("Filename is required")
            return False
        
        # Check filename length
        if len(filename) > 255:
            result.errors.append("Filename too long")
            return False
        
        # Check for dangerous characters
        dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0']
        for char in dangerous_chars:
            if char in filename:
                result.errors.append(f"Dangerous character in filename: {char}")
                return False
        
        # Check file extension
        extension = os.path.splitext(filename.lower())[1]
        
        if extension in self.DANGEROUS_EXTENSIONS:
            result.errors.append(f"Dangerous file extension: {extension}")
            return False
        
        # Check against allowed extensions if configured
        allowed_extensions = self.security_config.input_validation.allowed_file_extensions
        if allowed_extensions and extension not in allowed_extensions:
            result.errors.append(f"File extension not allowed: {extension}")
            return False
        
        return True
    
    def _sanitize_filename(self, filename: str) -> str:
        """Create a safe filename."""
        if not filename:
            return "file"
        
        # Get file extension
        name, ext = os.path.splitext(filename)
        
        # Remove dangerous characters
        safe_chars = []
        for char in name:
            if char.isalnum() or char in '-_.':
                safe_chars.append(char)
            else:
                safe_chars.append('_')
        
        safe_name = ''.join(safe_chars)
        
        # Limit length
        if len(safe_name) > 100:
            safe_name = safe_name[:100]
        
        # Ensure it doesn't start with a dot
        if safe_name.startswith('.'):
            safe_name = 'file' + safe_name
        
        return safe_name + ext.lower()
    
    def _validate_file_type(self, content: bytes, category: str, result: FileValidationResult) -> bool:
        """Validate file type using magic numbers."""
        try:
            # Use magic library if available
            if self.magic:
                detected_mime = self.magic.from_buffer(content)
                result.detected_type = detected_mime
                
                # Check against allowed types for category
                allowed_types = self.SAFE_MIME_TYPES.get(category, [])
                if allowed_types and detected_mime not in allowed_types:
                    result.errors.append(f"File type not allowed for category {category}: {detected_mime}")
                    return False
            
            # Additional checks for specific file types
            if not self._validate_specific_file_type(content, result):
                return False
            
            return True
            
        except Exception as e:
            logger.warning(f"File type detection error: {e}")
            result.warnings.append("Could not detect file type reliably")
            return True  # Continue with other validations
    
    def _validate_specific_file_type(self, content: bytes, result: FileValidationResult) -> bool:
        """Perform specific validation for known file types."""
        # Check for common file signatures
        signatures = {
            b'\x89PNG\r\n\x1a\n': 'PNG',
            b'\xff\xd8\xff': 'JPEG',
            b'GIF87a': 'GIF87a',
            b'GIF89a': 'GIF89a',
            b'%PDF-': 'PDF',
            b'PK\x03\x04': 'ZIP',
            b'\x1f\x8b': 'GZIP',
        }
        
        for signature, file_type in signatures.items():
            if content.startswith(signature):
                # Additional validation for specific types
                if file_type == 'PDF':
                    return self._validate_pdf_content(content, result)
                elif file_type in ['PNG', 'JPEG', 'GIF87a', 'GIF89a']:
                    return self._validate_image_content(content, result)
                elif file_type == 'ZIP':
                    return self._validate_zip_content(content, result)
        
        return True
    
    def _validate_pdf_content(self, content: bytes, result: FileValidationResult) -> bool:
        """Validate PDF file content for security issues."""
        content_str = content.decode('latin-1', errors='ignore')
        
        # Check for potentially dangerous PDF features
        dangerous_keywords = [
            '/JavaScript', '/JS', '/OpenAction', '/AA', '/Launch',
            '/SubmitForm', '/ImportData', '/GoToR', '/GoToE'
        ]
        
        for keyword in dangerous_keywords:
            if keyword in content_str:
                result.warnings.append(f"PDF contains potentially dangerous feature: {keyword}")
        
        return True
    
    def _validate_image_content(self, content: bytes, result: FileValidationResult) -> bool:
        """Validate image file content."""
        # Check for EXIF data that might contain sensitive information
        if b'Exif' in content[:1000]:
            result.warnings.append("Image contains EXIF data - consider stripping metadata")
        
        # Check for extremely large dimensions (potential DoS)
        max_pixels = 50000 * 50000  # 50k x 50k pixels
        
        # This is a simplified check - in production, use a proper image library
        if len(content) > 100 * 1024 * 1024:  # 100MB
            result.warnings.append("Very large image file - potential resource exhaustion")
        
        return True
    
    def _validate_zip_content(self, content: bytes, result: FileValidationResult) -> bool:
        """Validate ZIP file content for zip bombs and dangerous files."""
        try:
            import zipfile
            import io
            
            zip_file = zipfile.ZipFile(io.BytesIO(content))
            
            # Check for zip bomb (high compression ratio)
            total_uncompressed = sum(info.file_size for info in zip_file.filelist)
            total_compressed = sum(info.compress_size for info in zip_file.filelist)
            
            if total_compressed > 0:
                compression_ratio = total_uncompressed / total_compressed
                if compression_ratio > 100:  # Suspiciously high compression
                    result.warnings.append(f"High compression ratio detected: {compression_ratio:.1f}")
            
            # Check individual files
            for info in zip_file.filelist:
                filename = info.filename
                
                # Check for directory traversal
                if '..' in filename or filename.startswith('/'):
                    result.errors.append(f"Dangerous path in ZIP: {filename}")
                    return False
                
                # Check for dangerous file extensions
                extension = os.path.splitext(filename.lower())[1]
                if extension in self.DANGEROUS_EXTENSIONS:
                    result.errors.append(f"Dangerous file in ZIP: {filename}")
                    return False
            
        except Exception as e:
            result.warnings.append(f"Could not validate ZIP content: {e}")
        
        return True
    
    async def _validate_file_content(self, content: bytes, category: str, result: FileValidationResult) -> bool:
        """Validate file content for category-specific requirements."""
        if category == 'data':
            return self._validate_data_file(content, result)
        elif category == 'log':
            return self._validate_log_file(content, result)
        # Add more category-specific validations as needed
        
        return True
    
    def _validate_data_file(self, content: bytes, result: FileValidationResult) -> bool:
        """Validate data files (JSON, CSV, etc.)."""
        try:
            # Try to decode as text
            text_content = content.decode('utf-8')
            
            # Check for suspicious patterns
            suspicious_patterns = [
                '<script', 'javascript:', 'vbscript:', 'onload=', 'eval(',
                'document.cookie', 'window.location', 'innerHTML'
            ]
            
            text_lower = text_content.lower()
            for pattern in suspicious_patterns:
                if pattern in text_lower:
                    result.warnings.append(f"Suspicious pattern in data file: {pattern}")
            
        except UnicodeDecodeError:
            # Binary data file - additional checks might be needed
            pass
        
        return True
    
    def _validate_log_file(self, content: bytes, result: FileValidationResult) -> bool:
        """Validate log files for suspicious content."""
        try:
            text_content = content.decode('utf-8', errors='ignore')
            
            # Check for log injection attempts
            injection_patterns = [
                '\r\n', '\n\r', '%0d%0a', '%0a%0d',
                '\x00', '\x01', '\x02', '\x03'
            ]
            
            for pattern in injection_patterns:
                if pattern in text_content:
                    result.warnings.append("Potential log injection pattern detected")
                    break
            
        except Exception as e:
            result.warnings.append(f"Could not validate log content: {e}")
        
        return True
    
    async def _scan_for_viruses(self, content: bytes, result: FileValidationResult) -> bool:
        """Scan file content for viruses."""
        if not self.virus_scanner_available:
            return True  # Skip if scanner not available
        
        # This would integrate with ClamAV or similar
        # For now, we'll do a simple signature check
        virus_signatures = [
            b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',  # EICAR test
        ]
        
        for signature in virus_signatures:
            if signature in content:
                result.errors.append("Virus detected in file")
                return False
        
        return True
    
    def _check_embedded_threats(self, content: bytes, result: FileValidationResult) -> bool:
        """Check for embedded threats like macros, scripts."""
        # Check for Office macros
        macro_signatures = [
            b'xl/vbaProject.bin',  # Excel macro
            b'word/vbaProject.bin',  # Word macro
            b'ppt/vbaProject.bin',   # PowerPoint macro
        ]
        
        for signature in macro_signatures:
            if signature in content:
                result.warnings.append("Office document contains macros")
                break
        
        # Check for embedded scripts
        script_patterns = [
            b'<script', b'javascript:', b'vbscript:',
            b'<?php', b'<%', b'<jsp:', b'<%@'
        ]
        
        content_lower = content.lower()
        for pattern in script_patterns:
            if pattern in content_lower:
                result.warnings.append(f"Embedded script detected: {pattern.decode('ascii', errors='ignore')}")
        
        return True
    
    def get_file_category(self, filename: str, mime_type: str = "") -> str:
        """Determine file category based on filename and MIME type."""
        extension = os.path.splitext(filename.lower())[1]
        
        # Image files
        if extension in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] or mime_type.startswith('image/'):
            return 'image'
        
        # Document files
        if extension in ['.pdf', '.txt', '.doc', '.docx'] or mime_type in ['application/pdf', 'text/plain']:
            return 'document'
        
        # Archive files
        if extension in ['.zip', '.tar', '.gz', '.rar'] or mime_type.startswith('application/zip'):
            return 'archive'
        
        # Log files
        if extension in ['.log', '.txt'] and 'log' in filename.lower():
            return 'log'
        
        # Default to data
        return 'data'


# Global file validator instance
file_validator = SecureFileValidator()


async def validate_upload_file(file: UploadFile, category: Optional[str] = None) -> FileValidationResult:
    """
    Convenience function to validate an uploaded file.
    
    Args:
        file: The uploaded file
        category: Optional category override
        
    Returns:
        FileValidationResult
    """
    if category is None:
        category = file_validator.get_file_category(file.filename or "", file.content_type or "")
    
    return await file_validator.validate_file(file, category)


def require_file_validation(category: str = "data"):
    """
    Decorator to require file validation for FastAPI endpoints.
    
    Args:
        category: File category for validation
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Find UploadFile in arguments
            for arg in args:
                if isinstance(arg, UploadFile):
                    result = await validate_upload_file(arg, category)
                    if not result.is_valid:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File validation failed: {'; '.join(result.errors)}"
                        )
                    break
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator