"""
Enhanced Secrets Management System

Provides secure secrets handling with rotation, encryption, and audit logging.
Supports multiple secret stores (Kubernetes secrets, AWS Secrets Manager, Azure Key Vault).
"""

import asyncio
import base64
import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Union
from enum import Enum
from dataclasses import dataclass, asdict
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

logger = logging.getLogger(__name__)


class SecretType(Enum):
    """Types of secrets managed by the system."""
    DATABASE_PASSWORD = "database_password"
    JWT_SECRET = "jwt_secret"
    API_KEY = "api_key"
    ENCRYPTION_KEY = "encryption_key"
    OAUTH_SECRET = "oauth_secret"
    WEBHOOK_SECRET = "webhook_secret"
    CERTIFICATE = "certificate"
    PRIVATE_KEY = "private_key"


class SecretProvider(Enum):
    """Supported secret providers."""
    KUBERNETES = "kubernetes"
    AWS_SECRETS_MANAGER = "aws_secrets_manager"
    AZURE_KEY_VAULT = "azure_key_vault"
    HASHICORP_VAULT = "hashicorp_vault"
    ENVIRONMENT = "environment"
    FILE = "file"


@dataclass
class SecretMetadata:
    """Metadata for a managed secret."""
    name: str
    secret_type: SecretType
    provider: SecretProvider
    created_at: datetime
    last_rotated: datetime
    rotation_interval: timedelta
    next_rotation: datetime
    version: int
    is_active: bool
    access_count: int
    last_accessed: datetime
    tags: Dict[str, str]


@dataclass
class SecretRotationPolicy:
    """Policy for automatic secret rotation."""
    enabled: bool
    interval: timedelta
    max_age: timedelta
    notification_before: timedelta
    auto_rotate: bool
    backup_versions: int


class SecretEncryption:
    """Handles encryption/decryption of secrets at rest."""
    
    def __init__(self, master_key: Optional[str] = None):
        """Initialize encryption with master key."""
        if master_key:
            self.master_key = master_key.encode()
        else:
            self.master_key = os.environ.get('MASTER_ENCRYPTION_KEY', 'default-key-change-in-production').encode()
        
        # Derive encryption key using PBKDF2
        salt = b'opssight-salt'  # In production, use random salt per secret
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
        self.fernet = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt data and return base64 encoded result."""
        return base64.urlsafe_b64encode(
            self.fernet.encrypt(data.encode())
        ).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64 encoded data."""
        return self.fernet.decrypt(
            base64.urlsafe_b64decode(encrypted_data.encode())
        ).decode()


class SecretsManager:
    """Enhanced secrets management with rotation and monitoring."""
    
    def __init__(self, provider: SecretProvider = SecretProvider.ENVIRONMENT):
        """Initialize secrets manager with specified provider."""
        self.provider = provider
        self.encryption = SecretEncryption()
        self.secrets_cache: Dict[str, Any] = {}
        self.metadata_store: Dict[str, SecretMetadata] = {}
        self.rotation_policies: Dict[str, SecretRotationPolicy] = {}
        self._setup_default_policies()
    
    def _setup_default_policies(self):
        """Setup default rotation policies for different secret types."""
        self.rotation_policies = {
            SecretType.DATABASE_PASSWORD.value: SecretRotationPolicy(
                enabled=True,
                interval=timedelta(days=90),
                max_age=timedelta(days=365),
                notification_before=timedelta(days=7),
                auto_rotate=False,  # Manual approval required
                backup_versions=3
            ),
            SecretType.JWT_SECRET.value: SecretRotationPolicy(
                enabled=True,
                interval=timedelta(days=30),
                max_age=timedelta(days=90),
                notification_before=timedelta(days=3),
                auto_rotate=True,
                backup_versions=2
            ),
            SecretType.API_KEY.value: SecretRotationPolicy(
                enabled=True,
                interval=timedelta(days=180),
                max_age=timedelta(days=365),
                notification_before=timedelta(days=14),
                auto_rotate=False,
                backup_versions=2
            ),
            SecretType.ENCRYPTION_KEY.value: SecretRotationPolicy(
                enabled=True,
                interval=timedelta(days=365),
                max_age=timedelta(days=1095),  # 3 years
                notification_before=timedelta(days=30),
                auto_rotate=False,
                backup_versions=5
            ),
        }
    
    async def get_secret(self, name: str, secret_type: SecretType) -> Optional[str]:
        """
        Retrieve a secret with audit logging and access tracking.
        
        Args:
            name: Secret name/identifier
            secret_type: Type of secret being retrieved
            
        Returns:
            Decrypted secret value or None if not found
        """
        try:
            # Update access tracking
            if name in self.metadata_store:
                metadata = self.metadata_store[name]
                metadata.access_count += 1
                metadata.last_accessed = datetime.utcnow()
            
            # Check cache first
            if name in self.secrets_cache:
                logger.info(f"Secret '{name}' retrieved from cache")
                return self.secrets_cache[name]
            
            # Retrieve from provider
            secret_value = await self._retrieve_from_provider(name, secret_type)
            
            if secret_value:
                # Cache the secret (consider TTL in production)
                self.secrets_cache[name] = secret_value
                
                # Audit log
                await self._audit_log({
                    'action': 'secret_accessed',
                    'secret_name': name,
                    'secret_type': secret_type.value,
                    'provider': self.provider.value,
                    'timestamp': datetime.utcnow().isoformat(),
                    'success': True
                })
                
                logger.info(f"Secret '{name}' retrieved successfully")
                return secret_value
            
            logger.warning(f"Secret '{name}' not found")
            return None
            
        except Exception as e:
            await self._audit_log({
                'action': 'secret_access_failed',
                'secret_name': name,
                'secret_type': secret_type.value,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            logger.error(f"Error retrieving secret '{name}': {e}")
            raise
    
    async def store_secret(
        self, 
        name: str, 
        value: str, 
        secret_type: SecretType,
        tags: Optional[Dict[str, str]] = None
    ) -> bool:
        """
        Store a secret with encryption and metadata.
        
        Args:
            name: Secret name/identifier
            value: Secret value to store
            secret_type: Type of secret
            tags: Optional metadata tags
            
        Returns:
            True if stored successfully
        """
        try:
            # Encrypt the secret value
            encrypted_value = self.encryption.encrypt(value)
            
            # Store in provider
            success = await self._store_to_provider(name, encrypted_value, secret_type)
            
            if success:
                # Create/update metadata
                now = datetime.utcnow()
                policy = self.rotation_policies.get(secret_type.value, self.rotation_policies[SecretType.API_KEY.value])
                
                self.metadata_store[name] = SecretMetadata(
                    name=name,
                    secret_type=secret_type,
                    provider=self.provider,
                    created_at=now,
                    last_rotated=now,
                    rotation_interval=policy.interval,
                    next_rotation=now + policy.interval,
                    version=1,
                    is_active=True,
                    access_count=0,
                    last_accessed=now,
                    tags=tags or {}
                )
                
                # Update cache
                self.secrets_cache[name] = value
                
                # Audit log
                await self._audit_log({
                    'action': 'secret_stored',
                    'secret_name': name,
                    'secret_type': secret_type.value,
                    'provider': self.provider.value,
                    'timestamp': now.isoformat(),
                    'success': True
                })
                
                logger.info(f"Secret '{name}' stored successfully")
                return True
            
            return False
            
        except Exception as e:
            await self._audit_log({
                'action': 'secret_store_failed',
                'secret_name': name,
                'secret_type': secret_type.value,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            logger.error(f"Error storing secret '{name}': {e}")
            raise
    
    async def rotate_secret(self, name: str, new_value: Optional[str] = None) -> bool:
        """
        Rotate a secret with the new value.
        
        Args:
            name: Secret name to rotate
            new_value: New secret value (auto-generated if None)
            
        Returns:
            True if rotated successfully
        """
        try:
            if name not in self.metadata_store:
                logger.error(f"Secret '{name}' not found for rotation")
                return False
            
            metadata = self.metadata_store[name]
            
            # Generate new value if not provided
            if not new_value:
                new_value = await self._generate_secret(metadata.secret_type)
            
            # Store new version
            success = await self.store_secret(name, new_value, metadata.secret_type, metadata.tags)
            
            if success:
                # Update rotation metadata
                now = datetime.utcnow()
                metadata.last_rotated = now
                metadata.version += 1
                policy = self.rotation_policies.get(metadata.secret_type.value)
                if policy:
                    metadata.next_rotation = now + policy.interval
                
                # Clear cache to force reload
                self.secrets_cache.pop(name, None)
                
                # Audit log
                await self._audit_log({
                    'action': 'secret_rotated',
                    'secret_name': name,
                    'secret_type': metadata.secret_type.value,
                    'version': metadata.version,
                    'timestamp': now.isoformat(),
                    'success': True
                })
                
                logger.info(f"Secret '{name}' rotated successfully to version {metadata.version}")
                return True
            
            return False
            
        except Exception as e:
            await self._audit_log({
                'action': 'secret_rotation_failed',
                'secret_name': name,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            logger.error(f"Error rotating secret '{name}': {e}")
            raise
    
    async def check_rotation_schedule(self) -> List[Dict[str, Any]]:
        """
        Check which secrets need rotation based on policies.
        
        Returns:
            List of secrets requiring rotation
        """
        rotation_needed = []
        now = datetime.utcnow()
        
        for name, metadata in self.metadata_store.items():
            if metadata.next_rotation <= now:
                policy = self.rotation_policies.get(metadata.secret_type.value)
                rotation_needed.append({
                    'name': name,
                    'type': metadata.secret_type.value,
                    'last_rotated': metadata.last_rotated,
                    'auto_rotate': policy.auto_rotate if policy else False,
                    'overdue_by': now - metadata.next_rotation
                })
        
        return rotation_needed
    
    async def get_secret_health(self) -> Dict[str, Any]:
        """
        Get overall health status of secrets management.
        
        Returns:
            Health status and metrics
        """
        total_secrets = len(self.metadata_store)
        rotation_needed = await self.check_rotation_schedule()
        overdue = len(rotation_needed)
        
        # Calculate expiring soon (within notification period)
        expiring_soon = 0
        now = datetime.utcnow()
        
        for metadata in self.metadata_store.values():
            policy = self.rotation_policies.get(metadata.secret_type.value)
            if policy and metadata.next_rotation <= now + policy.notification_before:
                expiring_soon += 1
        
        return {
            'total_secrets': total_secrets,
            'overdue_rotation': overdue,
            'expiring_soon': expiring_soon,
            'health_score': max(0, 100 - (overdue * 10) - (expiring_soon * 5)),
            'last_check': now.isoformat(),
            'rotation_compliance': (total_secrets - overdue) / total_secrets * 100 if total_secrets > 0 else 100
        }
    
    async def _retrieve_from_provider(self, name: str, secret_type: SecretType) -> Optional[str]:
        """Retrieve secret from the configured provider."""
        if self.provider == SecretProvider.ENVIRONMENT:
            encrypted_value = os.environ.get(name)
            if encrypted_value:
                try:
                    return self.encryption.decrypt(encrypted_value)
                except Exception:
                    # Fallback to plain text for backward compatibility
                    return encrypted_value
            return None
        
        elif self.provider == SecretProvider.KUBERNETES:
            # Implement Kubernetes secrets retrieval
            # This would use the Kubernetes API to retrieve secrets
            pass
        
        elif self.provider == SecretProvider.AWS_SECRETS_MANAGER:
            # Implement AWS Secrets Manager retrieval
            pass
        
        # Add other providers as needed
        return None
    
    async def _store_to_provider(self, name: str, encrypted_value: str, secret_type: SecretType) -> bool:
        """Store secret to the configured provider."""
        if self.provider == SecretProvider.ENVIRONMENT:
            # For demo purposes - in production this would update K8s secrets
            os.environ[name] = encrypted_value
            return True
        
        # Implement other providers
        return False
    
    async def _generate_secret(self, secret_type: SecretType) -> str:
        """Generate a new secret value based on type."""
        if secret_type == SecretType.JWT_SECRET:
            # Generate 256-bit random key
            return base64.urlsafe_b64encode(os.urandom(32)).decode()
        elif secret_type == SecretType.API_KEY:
            # Generate API key format
            return f"sk_{base64.urlsafe_b64encode(os.urandom(24)).decode()}"
        elif secret_type == SecretType.DATABASE_PASSWORD:
            # Generate strong password
            chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
            return ''.join(os.urandom(1)[0] % len(chars) and chars[os.urandom(1)[0] % len(chars)] for _ in range(32))
        else:
            # Default: 256-bit random value
            return base64.urlsafe_b64encode(os.urandom(32)).decode()
    
    async def _audit_log(self, event: Dict[str, Any]):
        """Log security events for audit purposes."""
        # In production, this would send to a centralized logging system
        event['component'] = 'secrets_manager'
        event['level'] = 'security'
        logger.info(f"SECURITY_AUDIT: {json.dumps(event)}")


# Global secrets manager instance
secrets_manager = SecretsManager()


async def get_secret(name: str, secret_type: SecretType) -> Optional[str]:
    """Convenience function to get a secret."""
    return await secrets_manager.get_secret(name, secret_type)


async def rotate_secrets_on_schedule():
    """Background task to handle automatic secret rotation."""
    rotation_needed = await secrets_manager.check_rotation_schedule()
    
    for secret_info in rotation_needed:
        if secret_info['auto_rotate']:
            logger.info(f"Auto-rotating secret: {secret_info['name']}")
            await secrets_manager.rotate_secret(secret_info['name'])
        else:
            logger.warning(f"Secret requires manual rotation: {secret_info['name']}")