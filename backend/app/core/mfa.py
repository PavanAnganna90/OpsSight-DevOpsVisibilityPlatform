"""
Multi-Factor Authentication (MFA) Implementation

Provides TOTP-based MFA for enhanced security of administrative accounts.
Supports backup codes, recovery options, and audit logging.
"""

import base64
import io
import logging
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import pyotp
import qrcode
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_

from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)


class MFAMethod(Enum):
    """Supported MFA methods."""
    TOTP = "totp"  # Time-based One-Time Password
    SMS = "sms"    # SMS-based codes
    EMAIL = "email"  # Email-based codes
    BACKUP_CODES = "backup_codes"  # Static backup codes


class MFAStatus(Enum):
    """MFA enrollment status."""
    DISABLED = "disabled"
    PENDING = "pending"  # Setup initiated but not confirmed
    ENABLED = "enabled"
    SUSPENDED = "suspended"  # Temporarily disabled


@dataclass
class MFADevice:
    """MFA device information."""
    id: str
    user_id: int
    method: MFAMethod
    status: MFAStatus
    name: str
    secret: str  # Encrypted
    backup_codes: Optional[List[str]]  # Encrypted
    created_at: datetime
    last_used: Optional[datetime]
    use_count: int
    is_primary: bool


@dataclass
class MFAChallenge:
    """Active MFA challenge."""
    challenge_id: str
    user_id: int
    method: MFAMethod
    created_at: datetime
    expires_at: datetime
    attempts: int
    max_attempts: int
    verified: bool


class MFAService:
    """Multi-Factor Authentication service."""
    
    def __init__(self):
        """Initialize MFA service with encryption."""
        # Use a dedicated MFA encryption key
        mfa_key = settings.MFA_ENCRYPTION_KEY or Fernet.generate_key()
        self.cipher = Fernet(mfa_key)
        self.backup_codes_count = 10
        self.challenge_expiry = timedelta(minutes=5)
        self.max_attempts = 3
    
    async def setup_totp(
        self, 
        user: User, 
        device_name: str = "Authenticator App"
    ) -> Tuple[str, str, List[str]]:
        """
        Setup TOTP MFA for a user.
        
        Args:
            user: User object
            device_name: Name for the MFA device
            
        Returns:
            Tuple of (secret, qr_code_url, backup_codes)
        """
        try:
            # Generate TOTP secret
            secret = pyotp.random_base32()
            
            # Create TOTP URI for QR code
            totp = pyotp.TOTP(secret)
            provisioning_uri = totp.provisioning_uri(
                name=user.email,
                issuer_name=settings.APP_NAME or "OpsSight"
            )
            
            # Generate QR code
            qr_code_url = self._generate_qr_code(provisioning_uri)
            
            # Generate backup codes
            backup_codes = self._generate_backup_codes()
            
            # Store encrypted device info (in production, save to database)
            device = MFADevice(
                id=secrets.token_hex(16),
                user_id=user.id,
                method=MFAMethod.TOTP,
                status=MFAStatus.PENDING,
                name=device_name,
                secret=self._encrypt(secret),
                backup_codes=[self._encrypt(code) for code in backup_codes],
                created_at=datetime.utcnow(),
                last_used=None,
                use_count=0,
                is_primary=True
            )
            
            # In production, save device to database
            await self._save_mfa_device(device)
            
            logger.info(f"TOTP MFA setup initiated for user {user.id}")
            
            return secret, qr_code_url, backup_codes
            
        except Exception as e:
            logger.error(f"Error setting up TOTP for user {user.id}: {e}")
            raise
    
    async def verify_totp_setup(
        self, 
        user: User, 
        totp_code: str,
        device_id: Optional[str] = None
    ) -> bool:
        """
        Verify TOTP code during setup to confirm enrollment.
        
        Args:
            user: User object
            totp_code: 6-digit TOTP code
            device_id: Optional device ID to verify
            
        Returns:
            True if verification successful
        """
        try:
            # Get pending TOTP device
            device = await self._get_mfa_device(user.id, MFAMethod.TOTP, MFAStatus.PENDING)
            if not device:
                logger.warning(f"No pending TOTP device found for user {user.id}")
                return False
            
            # Decrypt secret
            secret = self._decrypt(device.secret)
            
            # Verify TOTP code
            totp = pyotp.TOTP(secret)
            if totp.verify(totp_code, valid_window=1):  # Allow 1 window tolerance
                # Activate the device
                device.status = MFAStatus.ENABLED
                device.last_used = datetime.utcnow()
                device.use_count += 1
                
                # Update in database
                await self._update_mfa_device(device)
                
                # Log successful setup
                await self._log_mfa_event(user.id, "mfa_setup_completed", {
                    'method': MFAMethod.TOTP.value,
                    'device_name': device.name
                })
                
                logger.info(f"TOTP MFA setup completed for user {user.id}")
                return True
            
            logger.warning(f"Invalid TOTP code during setup for user {user.id}")
            return False
            
        except Exception as e:
            logger.error(f"Error verifying TOTP setup for user {user.id}: {e}")
            raise
    
    async def challenge_user(self, user: User) -> Optional[MFAChallenge]:
        """
        Create an MFA challenge for user authentication.
        
        Args:
            user: User object requiring MFA
            
        Returns:
            MFA challenge object or None if no MFA required
        """
        try:
            # Check if user has MFA enabled
            devices = await self._get_user_mfa_devices(user.id, MFAStatus.ENABLED)
            if not devices:
                logger.info(f"No MFA devices found for user {user.id}")
                return None
            
            # Get primary device or first available
            primary_device = next((d for d in devices if d.is_primary), devices[0])
            
            # Create challenge
            challenge = MFAChallenge(
                challenge_id=secrets.token_hex(16),
                user_id=user.id,
                method=primary_device.method,
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + self.challenge_expiry,
                attempts=0,
                max_attempts=self.max_attempts,
                verified=False
            )
            
            # Store challenge (in production, save to cache/database)
            await self._save_mfa_challenge(challenge)
            
            logger.info(f"MFA challenge created for user {user.id}, method: {primary_device.method.value}")
            
            return challenge
            
        except Exception as e:
            logger.error(f"Error creating MFA challenge for user {user.id}: {e}")
            raise
    
    async def verify_challenge(
        self, 
        challenge_id: str, 
        code: str,
        backup_code: bool = False
    ) -> bool:
        """
        Verify an MFA challenge response.
        
        Args:
            challenge_id: Challenge identifier
            code: MFA code provided by user
            backup_code: Whether code is a backup code
            
        Returns:
            True if verification successful
        """
        try:
            # Get challenge
            challenge = await self._get_mfa_challenge(challenge_id)
            if not challenge:
                logger.warning(f"MFA challenge not found: {challenge_id}")
                return False
            
            # Check if challenge is expired
            if datetime.utcnow() > challenge.expires_at:
                logger.warning(f"MFA challenge expired: {challenge_id}")
                await self._delete_mfa_challenge(challenge_id)
                return False
            
            # Check attempt limit
            if challenge.attempts >= challenge.max_attempts:
                logger.warning(f"MFA challenge max attempts exceeded: {challenge_id}")
                await self._log_mfa_event(challenge.user_id, "mfa_max_attempts_exceeded", {
                    'challenge_id': challenge_id,
                    'method': challenge.method.value
                })
                await self._delete_mfa_challenge(challenge_id)
                return False
            
            # Increment attempt counter
            challenge.attempts += 1
            await self._update_mfa_challenge(challenge)
            
            # Verify based on method
            verified = False
            
            if backup_code:
                verified = await self._verify_backup_code(challenge.user_id, code)
            elif challenge.method == MFAMethod.TOTP:
                verified = await self._verify_totp_code(challenge.user_id, code)
            
            if verified:
                challenge.verified = True
                await self._update_mfa_challenge(challenge)
                
                # Log successful verification
                await self._log_mfa_event(challenge.user_id, "mfa_verification_success", {
                    'challenge_id': challenge_id,
                    'method': challenge.method.value,
                    'backup_code_used': backup_code
                })
                
                # Clean up challenge
                await self._delete_mfa_challenge(challenge_id)
                
                logger.info(f"MFA verification successful for challenge {challenge_id}")
                return True
            
            logger.warning(f"MFA verification failed for challenge {challenge_id}")
            return False
            
        except Exception as e:
            logger.error(f"Error verifying MFA challenge {challenge_id}: {e}")
            raise
    
    async def disable_mfa(self, user: User, admin_override: bool = False) -> bool:
        """
        Disable MFA for a user.
        
        Args:
            user: User object
            admin_override: Whether this is an admin override
            
        Returns:
            True if disabled successfully
        """
        try:
            # Get all user MFA devices
            devices = await self._get_user_mfa_devices(user.id)
            
            for device in devices:
                device.status = MFAStatus.DISABLED
                await self._update_mfa_device(device)
            
            # Log MFA disable
            await self._log_mfa_event(user.id, "mfa_disabled", {
                'admin_override': admin_override,
                'device_count': len(devices)
            })
            
            logger.info(f"MFA disabled for user {user.id} (admin_override: {admin_override})")
            return True
            
        except Exception as e:
            logger.error(f"Error disabling MFA for user {user.id}: {e}")
            raise
    
    async def get_user_mfa_status(self, user: User) -> Dict[str, any]:
        """
        Get comprehensive MFA status for a user.
        
        Args:
            user: User object
            
        Returns:
            MFA status information
        """
        try:
            devices = await self._get_user_mfa_devices(user.id)
            enabled_devices = [d for d in devices if d.status == MFAStatus.ENABLED]
            
            return {
                'mfa_enabled': len(enabled_devices) > 0,
                'device_count': len(enabled_devices),
                'methods': [d.method.value for d in enabled_devices],
                'primary_method': enabled_devices[0].method.value if enabled_devices else None,
                'backup_codes_available': any(d.backup_codes for d in enabled_devices),
                'last_used': max(d.last_used for d in enabled_devices if d.last_used) if enabled_devices else None
            }
            
        except Exception as e:
            logger.error(f"Error getting MFA status for user {user.id}: {e}")
            raise
    
    def _generate_qr_code(self, provisioning_uri: str) -> str:
        """Generate QR code for TOTP setup."""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 for web display
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def _generate_backup_codes(self) -> List[str]:
        """Generate backup codes for recovery."""
        codes = []
        for _ in range(self.backup_codes_count):
            # Generate 8-character alphanumeric codes
            code = secrets.token_hex(4).upper()
            codes.append(f"{code[:4]}-{code[4:]}")
        return codes
    
    def _encrypt(self, data: str) -> str:
        """Encrypt sensitive data."""
        return base64.urlsafe_b64encode(
            self.cipher.encrypt(data.encode())
        ).decode()
    
    def _decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data."""
        return self.cipher.decrypt(
            base64.urlsafe_b64decode(encrypted_data.encode())
        ).decode()
    
    async def _verify_totp_code(self, user_id: int, code: str) -> bool:
        """Verify TOTP code against user's device."""
        device = await self._get_mfa_device(user_id, MFAMethod.TOTP, MFAStatus.ENABLED)
        if not device:
            return False
        
        secret = self._decrypt(device.secret)
        totp = pyotp.TOTP(secret)
        
        if totp.verify(code, valid_window=1):
            # Update device usage
            device.last_used = datetime.utcnow()
            device.use_count += 1
            await self._update_mfa_device(device)
            return True
        
        return False
    
    async def _verify_backup_code(self, user_id: int, code: str) -> bool:
        """Verify backup code against user's stored codes."""
        devices = await self._get_user_mfa_devices(user_id, MFAStatus.ENABLED)
        
        for device in devices:
            if device.backup_codes:
                decrypted_codes = [self._decrypt(c) for c in device.backup_codes]
                if code in decrypted_codes:
                    # Remove used backup code
                    device.backup_codes.remove(self._encrypt(code))
                    await self._update_mfa_device(device)
                    
                    await self._log_mfa_event(user_id, "backup_code_used", {
                        'remaining_codes': len(device.backup_codes)
                    })
                    
                    return True
        
        return False
    
    async def _save_mfa_device(self, device: MFADevice):
        """Save MFA device to storage."""
        # In production, implement database storage
        pass
    
    async def _update_mfa_device(self, device: MFADevice):
        """Update MFA device in storage."""
        # In production, implement database update
        pass
    
    async def _get_mfa_device(
        self, 
        user_id: int, 
        method: MFAMethod, 
        status: MFAStatus
    ) -> Optional[MFADevice]:
        """Get specific MFA device."""
        # In production, implement database query
        return None
    
    async def _get_user_mfa_devices(
        self, 
        user_id: int, 
        status: Optional[MFAStatus] = None
    ) -> List[MFADevice]:
        """Get all MFA devices for a user."""
        # In production, implement database query
        return []
    
    async def _save_mfa_challenge(self, challenge: MFAChallenge):
        """Save MFA challenge to cache/storage."""
        # In production, implement Redis/database storage
        pass
    
    async def _get_mfa_challenge(self, challenge_id: str) -> Optional[MFAChallenge]:
        """Get MFA challenge from storage."""
        # In production, implement retrieval
        return None
    
    async def _update_mfa_challenge(self, challenge: MFAChallenge):
        """Update MFA challenge in storage."""
        # In production, implement update
        pass
    
    async def _delete_mfa_challenge(self, challenge_id: str):
        """Delete MFA challenge from storage."""
        # In production, implement deletion
        pass
    
    async def _log_mfa_event(self, user_id: int, event: str, details: Dict[str, any]):
        """Log MFA-related security events."""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'event': event,
            'details': details,
            'component': 'mfa_service'
        }
        logger.info(f"MFA_EVENT: {log_entry}")


# Global MFA service instance
mfa_service = MFAService()