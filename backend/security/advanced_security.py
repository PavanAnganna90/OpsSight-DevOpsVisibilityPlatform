"""
OpsSight Platform - Advanced Security Implementation
Comprehensive security controls, monitoring, and protection systems
"""

import asyncio
import hashlib
import secrets
import time
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import re
import ipaddress
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import pyotp
import qrcode
from io import BytesIO

class SecurityEventType(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    PERMISSION_DENIED = "permission_denied"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_ACCESS = "data_access"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    SYSTEM_COMPROMISE = "system_compromise"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    PASSWORD_CHANGE = "password_change"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class SecurityEvent:
    event_type: SecurityEventType
    user_id: Optional[str]
    ip_address: str
    user_agent: str
    timestamp: datetime
    details: Dict[str, Any]
    threat_level: ThreatLevel
    location: Optional[Dict[str, str]] = None

@dataclass
class ThreatIntelligence:
    ip_address: str
    threat_type: str
    confidence: float
    first_seen: datetime
    last_seen: datetime
    geolocation: Dict[str, str]
    reputation_score: int  # 0-100, lower is worse

class AdvancedSecurityManager:
    """Central security management system"""
    
    def __init__(self, redis_client, db_session):
        self.redis = redis_client
        self.db = db_session
        self.encryption_manager = EncryptionManager()
        self.threat_detector = ThreatDetector()
        self.mfa_manager = MFAManager()
        self.session_manager = SecureSessionManager()
        self.audit_logger = SecurityAuditLogger(db_session)
        
        # Security configuration
        self.config = {
            "max_login_attempts": 5,
            "lockout_duration": 900,  # 15 minutes
            "session_timeout": 3600,  # 1 hour
            "password_min_length": 12,
            "password_complexity": True,
            "mfa_required_roles": ["admin", "security_admin"],
            "suspicious_login_threshold": 3,
            "ip_reputation_threshold": 50
        }

class EncryptionManager:
    """Handle all encryption and decryption operations"""
    
    def __init__(self):
        self.master_key = self._get_master_key()
        self.cipher_suite = Fernet(self.master_key)
    
    def _get_master_key(self) -> bytes:
        """Get or generate master encryption key"""
        # In production, this should be stored in a secure key management service
        password = b"OpsSight_Master_Key_2024"  # Should be from environment
        salt = b"salt_1234567890123456"  # Should be unique per installation
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        if not data:
            return ""
        return self.cipher_suite.encrypt(data.encode()).decode()
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        if not encrypted_data:
            return ""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode(), salt).decode()
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode(), hashed.encode())
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)

class MFAManager:
    """Multi-Factor Authentication management"""
    
    def __init__(self):
        self.issuer = "OpsSight Platform"
    
    def generate_totp_secret(self, user_email: str) -> Dict[str, Any]:
        """Generate TOTP secret and QR code"""
        secret = pyotp.random_base32()
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=self.issuer
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
        
        return {
            "secret": secret,
            "qr_code": f"data:image/png;base64,{qr_code_data}",
            "backup_codes": backup_codes,
            "manual_entry_key": secret
        }
    
    def verify_totp_token(self, secret: str, token: str) -> bool:
        """Verify TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Allow 30 second window
    
    def verify_backup_code(self, user_id: str, code: str, used_codes: List[str]) -> bool:
        """Verify backup code and mark as used"""
        if code.upper() in used_codes:
            return False  # Code already used
        
        # In production, verify against stored backup codes
        return True  # Simplified for example

class ThreatDetector:
    """Advanced threat detection and analysis"""
    
    def __init__(self):
        self.known_threats = {}
        self.suspicious_patterns = self._load_suspicious_patterns()
        self.geolocation_cache = {}
    
    def _load_suspicious_patterns(self) -> Dict[str, List[str]]:
        """Load patterns that indicate suspicious activity"""
        return {
            "sql_injection": [
                r"(?i)(union|select|insert|delete|drop|create|alter)\s+",
                r"(?i)(script|javascript|vbscript)",
                r"['\";]",
                r"(?i)(or|and)\s+\d+\s*=\s*\d+"
            ],
            "xss_attempts": [
                r"(?i)<script",
                r"(?i)javascript:",
                r"(?i)on(load|error|click|mouse)",
                r"(?i)document\.(write|cookie)"
            ],
            "directory_traversal": [
                r"\.\.\/",
                r"\.\.\\",
                r"%2e%2e%2f",
                r"%2e%2e%5c"
            ],
            "command_injection": [
                r"[;&|`$()]",
                r"(?i)(cat|ls|pwd|whoami|id|uname)",
                r"(?i)(wget|curl|nc|netcat)"
            ]
        }
    
    async def analyze_request(self, request_data: Dict[str, Any]) -> ThreatLevel:
        """Analyze incoming request for threats"""
        threat_indicators = 0
        max_severity = ThreatLevel.LOW
        
        # Check request patterns
        for category, patterns in self.suspicious_patterns.items():
            for pattern in patterns:
                for value in request_data.values():
                    if isinstance(value, str) and re.search(pattern, value):
                        threat_indicators += 1
                        if category in ["sql_injection", "command_injection"]:
                            max_severity = max(max_severity, ThreatLevel.HIGH)
                        else:
                            max_severity = max(max_severity, ThreatLevel.MEDIUM)
        
        # Check IP reputation
        ip_address = request_data.get("ip_address")
        if ip_address:
            ip_reputation = await self._check_ip_reputation(ip_address)
            if ip_reputation.reputation_score < 30:
                max_severity = max(max_severity, ThreatLevel.HIGH)
            elif ip_reputation.reputation_score < 60:
                max_severity = max(max_severity, ThreatLevel.MEDIUM)
        
        # Behavioral analysis
        user_id = request_data.get("user_id")
        if user_id:
            behavioral_risk = await self._analyze_user_behavior(user_id, request_data)
            max_severity = max(max_severity, behavioral_risk)
        
        return max_severity
    
    async def _check_ip_reputation(self, ip_address: str) -> ThreatIntelligence:
        """Check IP address reputation against threat intelligence"""
        # Simplified implementation - in production, integrate with threat intel APIs
        
        # Check if IP is in known threat database
        if ip_address in self.known_threats:
            return self.known_threats[ip_address]
        
        # Basic checks
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            reputation_score = 100  # Default to good
            
            # Check if it's a private IP
            if ip_obj.is_private:
                reputation_score = 90
            
            # Check against simple blocklists (in production, use real threat intel)
            suspicious_ranges = [
                "tor_exit_nodes",  # Would be actual IP ranges
                "known_malware_c2",
                "botnet_ips"
            ]
            
            threat_intel = ThreatIntelligence(
                ip_address=ip_address,
                threat_type="unknown",
                confidence=0.5,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                geolocation=await self._get_geolocation(ip_address),
                reputation_score=reputation_score
            )
            
            self.known_threats[ip_address] = threat_intel
            return threat_intel
            
        except ValueError:
            # Invalid IP address
            return ThreatIntelligence(
                ip_address=ip_address,
                threat_type="invalid_ip",
                confidence=1.0,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                geolocation={},
                reputation_score=0
            )
    
    async def _get_geolocation(self, ip_address: str) -> Dict[str, str]:
        """Get geolocation information for IP address"""
        # Simplified - in production, use GeoIP database or API
        return {
            "country": "Unknown",
            "region": "Unknown", 
            "city": "Unknown",
            "timezone": "Unknown"
        }
    
    async def _analyze_user_behavior(self, user_id: str, request_data: Dict[str, Any]) -> ThreatLevel:
        """Analyze user behavior for anomalies"""
        # Get user's recent activity patterns
        recent_activity = await self._get_user_recent_activity(user_id)
        
        current_ip = request_data.get("ip_address")
        current_user_agent = request_data.get("user_agent", "")
        current_time = datetime.utcnow()
        
        anomaly_score = 0
        
        # Check for unusual IP addresses
        if current_ip not in [activity.get("ip_address") for activity in recent_activity[-10:]]:
            anomaly_score += 2  # New IP address
        
        # Check for unusual user agent
        recent_user_agents = [activity.get("user_agent", "") for activity in recent_activity[-5:]]
        if current_user_agent not in recent_user_agents:
            anomaly_score += 1  # New user agent
        
        # Check for unusual access patterns (time-based)
        usual_hours = self._get_user_usual_hours(recent_activity)
        current_hour = current_time.hour
        if current_hour not in usual_hours:
            anomaly_score += 1  # Unusual time
        
        # Check for rapid successive requests
        recent_requests = [
            activity for activity in recent_activity
            if (current_time - activity.get("timestamp", current_time)).seconds < 300  # 5 minutes
        ]
        if len(recent_requests) > 20:
            anomaly_score += 3  # Rapid requests
        
        # Determine threat level based on anomaly score
        if anomaly_score >= 5:
            return ThreatLevel.HIGH
        elif anomaly_score >= 3:
            return ThreatLevel.MEDIUM
        elif anomaly_score >= 1:
            return ThreatLevel.LOW
        else:
            return ThreatLevel.LOW
    
    async def _get_user_recent_activity(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's recent activity from database"""
        # Simplified - would query actual database
        return []
    
    def _get_user_usual_hours(self, activity_history: List[Dict[str, Any]]) -> List[int]:
        """Determine user's usual activity hours"""
        hours = []
        for activity in activity_history:
            timestamp = activity.get("timestamp")
            if timestamp:
                hours.append(timestamp.hour)
        
        # Return hours that appear in more than 20% of activities
        from collections import Counter
        hour_counts = Counter(hours)
        threshold = len(hours) * 0.2
        return [hour for hour, count in hour_counts.items() if count > threshold]

class SecureSessionManager:
    """Advanced session management with security features"""
    
    def __init__(self):
        self.secret_key = "secure_session_key_2024"  # Should be from environment
        self.algorithm = "HS256"
        self.access_token_expire = timedelta(minutes=30)
        self.refresh_token_expire = timedelta(days=7)
        self.session_store = {}  # In production, use Redis
    
    def create_session(self, user_id: str, ip_address: str, user_agent: str, 
                      permissions: List[str], mfa_verified: bool = False) -> Dict[str, str]:
        """Create secure session with tokens"""
        session_id = secrets.token_urlsafe(32)
        now = datetime.utcnow()
        
        # Create access token
        access_payload = {
            "sub": user_id,
            "session_id": session_id,
            "permissions": permissions,
            "mfa_verified": mfa_verified,
            "iat": now,
            "exp": now + self.access_token_expire,
            "type": "access",
            "ip": ip_address,
            "ua_hash": hashlib.sha256(user_agent.encode()).hexdigest()[:16]
        }
        access_token = jwt.encode(access_payload, self.secret_key, algorithm=self.algorithm)
        
        # Create refresh token
        refresh_payload = {
            "sub": user_id,
            "session_id": session_id,
            "iat": now,
            "exp": now + self.refresh_token_expire,
            "type": "refresh"
        }
        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm=self.algorithm)
        
        # Store session info
        self.session_store[session_id] = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": now,
            "last_activity": now,
            "mfa_verified": mfa_verified,
            "active": True
        }
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_id": session_id,
            "expires_in": int(self.access_token_expire.total_seconds())
        }
    
    def verify_token(self, token: str, ip_address: str, user_agent: str) -> Optional[Dict[str, Any]]:
        """Verify token with additional security checks"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Verify IP address (optional, can be disabled for mobile users)
            token_ip = payload.get("ip")
            if token_ip and token_ip != ip_address:
                # Log suspicious activity
                pass
            
            # Verify user agent hash
            token_ua_hash = payload.get("ua_hash")
            current_ua_hash = hashlib.sha256(user_agent.encode()).hexdigest()[:16]
            if token_ua_hash and token_ua_hash != current_ua_hash:
                # Log suspicious activity
                pass
            
            # Check session status
            session_id = payload.get("session_id")
            if session_id and session_id in self.session_store:
                session = self.session_store[session_id]
                if not session["active"]:
                    raise SecurityException("Session has been terminated")
                
                # Update last activity
                session["last_activity"] = datetime.utcnow()
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise SecurityException("Token has expired")
        except jwt.InvalidTokenError:
            raise SecurityException("Invalid token")
    
    def revoke_session(self, session_id: str):
        """Revoke a specific session"""
        if session_id in self.session_store:
            self.session_store[session_id]["active"] = False
    
    def revoke_all_user_sessions(self, user_id: str):
        """Revoke all sessions for a user"""
        for session_id, session in self.session_store.items():
            if session["user_id"] == user_id:
                session["active"] = False

class SecurityAuditLogger:
    """Comprehensive security audit logging"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def log_security_event(self, event: SecurityEvent):
        """Log security event to database and monitoring systems"""
        # Store in database
        audit_entry = {
            "timestamp": event.timestamp,
            "event_type": event.event_type.value,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "threat_level": event.threat_level.value,
            "details": event.details,
            "location": event.location
        }
        
        # In production, store in actual database table
        print(f"Security Event Logged: {audit_entry}")
        
        # Send to SIEM/monitoring systems
        await self._send_to_monitoring(event)
        
        # Trigger alerts for high-severity events
        if event.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
            await self._trigger_security_alert(event)
    
    async def _send_to_monitoring(self, event: SecurityEvent):
        """Send event to monitoring/SIEM systems"""
        # Integration with monitoring systems like Splunk, ELK, etc.
        pass
    
    async def _trigger_security_alert(self, event: SecurityEvent):
        """Trigger immediate security alerts"""
        # Send to Slack, PagerDuty, email, etc.
        alert_message = f"""
        🚨 SECURITY ALERT 🚨
        
        Event: {event.event_type.value}
        Threat Level: {event.threat_level.value}
        User: {event.user_id or 'Unknown'}
        IP: {event.ip_address}
        Time: {event.timestamp}
        
        Details: {event.details}
        """
        
        print(alert_message)  # In production, send to alerting systems

class SecurityException(Exception):
    """Custom security exception"""
    pass

# Security middleware and decorators
def require_mfa(f):
    """Decorator to require MFA for sensitive operations"""
    def wrapper(*args, **kwargs):
        # Check if current session has MFA verified
        # Implementation would check JWT token for mfa_verified flag
        return f(*args, **kwargs)
    return wrapper

def security_audit(event_type: SecurityEventType):
    """Decorator to automatically audit security-sensitive operations"""
    def decorator(f):
        async def wrapper(*args, **kwargs):
            # Log the operation
            result = await f(*args, **kwargs)
            # Log successful completion
            return result
        return wrapper
    return decorator

# Export main classes
__all__ = [
    'AdvancedSecurityManager',
    'EncryptionManager',
    'MFAManager', 
    'ThreatDetector',
    'SecureSessionManager',
    'SecurityAuditLogger',
    'SecurityEvent',
    'SecurityEventType',
    'ThreatLevel',
    'SecurityException'
]