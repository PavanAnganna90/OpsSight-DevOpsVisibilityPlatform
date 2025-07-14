"""
Security Monitoring and Incident Response System

Provides real-time security event monitoring, threat detection, and automated response.
Integrates with existing security systems and provides comprehensive security analytics.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import ipaddress
from collections import defaultdict, deque
import hashlib
import statistics

logger = logging.getLogger(__name__)


class ThreatLevel(Enum):
    """Security threat severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(Enum):
    """Security incident status."""
    OPEN = "open"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class SecurityEventType(Enum):
    """Types of security events."""
    AUTHENTICATION_FAILURE = "auth_failure"
    BRUTE_FORCE_ATTACK = "brute_force"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_EXFILTRATION = "data_exfiltration"
    MALWARE_DETECTED = "malware_detected"
    VULNERABILITY_EXPLOITED = "vulnerability_exploited"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"


@dataclass
class SecurityEvent:
    """Security event data structure."""
    event_id: str
    timestamp: datetime
    event_type: SecurityEventType
    threat_level: ThreatLevel
    source_ip: str
    user_id: Optional[int]
    endpoint: str
    user_agent: Optional[str]
    details: Dict[str, Any]
    raw_data: Dict[str, Any]
    geolocation: Optional[Dict[str, str]]
    risk_score: float
    indicators: List[str]


@dataclass
class SecurityIncident:
    """Security incident tracking."""
    incident_id: str
    title: str
    description: str
    threat_level: ThreatLevel
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
    assigned_to: Optional[str]
    events: List[str]  # Event IDs
    timeline: List[Dict[str, Any]]
    remediation_steps: List[str]
    affected_resources: List[str]
    false_positive_reason: Optional[str]


class SecurityAnalytics:
    """Security analytics and pattern detection."""
    
    def __init__(self):
        """Initialize analytics engine."""
        self.event_buffer = deque(maxlen=10000)  # Ring buffer for recent events
        self.ip_activity = defaultdict(list)  # IP-based activity tracking
        self.user_activity = defaultdict(list)  # User-based activity tracking
        self.endpoint_activity = defaultdict(list)  # Endpoint-based activity
        self.baseline_metrics = {}  # Normal behavior baselines
        
    def add_event(self, event: SecurityEvent):
        """Add event to analytics buffer."""
        self.event_buffer.append(event)
        
        # Update activity trackers
        if event.source_ip:
            self.ip_activity[event.source_ip].append(event)
            # Keep only recent events (last 24 hours)
            cutoff = datetime.utcnow() - timedelta(hours=24)
            self.ip_activity[event.source_ip] = [
                e for e in self.ip_activity[event.source_ip] 
                if e.timestamp > cutoff
            ]
        
        if event.user_id:
            self.user_activity[event.user_id].append(event)
            cutoff = datetime.utcnow() - timedelta(hours=24)
            self.user_activity[event.user_id] = [
                e for e in self.user_activity[event.user_id]
                if e.timestamp > cutoff
            ]
        
        if event.endpoint:
            self.endpoint_activity[event.endpoint].append(event)
            cutoff = datetime.utcnow() - timedelta(hours=24)
            self.endpoint_activity[event.endpoint] = [
                e for e in self.endpoint_activity[event.endpoint]
                if e.timestamp > cutoff
            ]
    
    def detect_brute_force(self, ip: str, time_window: int = 300) -> bool:
        """Detect brute force attacks from an IP."""
        if ip not in self.ip_activity:
            return False
        
        cutoff = datetime.utcnow() - timedelta(seconds=time_window)
        recent_failures = [
            e for e in self.ip_activity[ip]
            if e.timestamp > cutoff and 
            e.event_type == SecurityEventType.AUTHENTICATION_FAILURE
        ]
        
        return len(recent_failures) >= 5  # 5+ failures in time window
    
    def detect_anomalous_access_pattern(self, user_id: int) -> bool:
        """Detect anomalous user access patterns."""
        if user_id not in self.user_activity:
            return False
        
        recent_events = [
            e for e in self.user_activity[user_id]
            if e.timestamp > datetime.utcnow() - timedelta(hours=1)
        ]
        
        if len(recent_events) < 3:
            return False
        
        # Check for access from multiple IPs in short time
        unique_ips = set(e.source_ip for e in recent_events)
        if len(unique_ips) > 3:
            return True
        
        # Check for unusual time patterns
        current_hour = datetime.utcnow().hour
        if current_hour < 6 or current_hour > 22:  # Outside normal hours
            if len(recent_events) > 10:  # High activity
                return True
        
        return False
    
    def calculate_risk_score(self, event: SecurityEvent) -> float:
        """Calculate risk score for an event."""
        base_score = {
            ThreatLevel.LOW: 2.0,
            ThreatLevel.MEDIUM: 5.0,
            ThreatLevel.HIGH: 8.0,
            ThreatLevel.CRITICAL: 10.0
        }[event.threat_level]
        
        # Adjust based on patterns
        if event.source_ip and self.detect_brute_force(event.source_ip):
            base_score += 2.0
        
        if event.user_id and self.detect_anomalous_access_pattern(event.user_id):
            base_score += 1.5
        
        # Check if IP is from known malicious ranges
        if self._is_suspicious_ip(event.source_ip):
            base_score += 1.0
        
        return min(base_score, 10.0)  # Cap at 10
    
    def _is_suspicious_ip(self, ip: str) -> bool:
        """Check if IP is from suspicious ranges."""
        try:
            ip_obj = ipaddress.ip_address(ip)
            
            # Check for known malicious ranges (simplified)
            suspicious_ranges = [
                '10.0.0.0/8',      # Private (if external)
                '172.16.0.0/12',   # Private (if external) 
                '192.168.0.0/16',  # Private (if external)
                '127.0.0.0/8',     # Loopback
            ]
            
            for range_str in suspicious_ranges:
                if ip_obj in ipaddress.ip_network(range_str):
                    return True
                    
        except ValueError:
            return True  # Invalid IP is suspicious
        
        return False


class SecurityMonitor:
    """Main security monitoring system."""
    
    def __init__(self):
        """Initialize security monitor."""
        self.analytics = SecurityAnalytics()
        self.active_incidents: Dict[str, SecurityIncident] = {}
        self.event_handlers: Dict[SecurityEventType, List[Callable]] = defaultdict(list)
        self.alert_rules: List[Dict[str, Any]] = []
        self.monitoring_enabled = True
        self._setup_default_rules()
    
    def _setup_default_rules(self):
        """Setup default security monitoring rules."""
        self.alert_rules = [
            {
                'name': 'brute_force_detection',
                'condition': lambda event: self.analytics.detect_brute_force(event.source_ip),
                'threat_level': ThreatLevel.HIGH,
                'auto_block': True,
                'notification': True
            },
            {
                'name': 'critical_endpoint_access',
                'condition': lambda event: '/admin' in event.endpoint and event.user_id is None,
                'threat_level': ThreatLevel.CRITICAL,
                'auto_block': True,
                'notification': True
            },
            {
                'name': 'anomalous_user_behavior',
                'condition': lambda event: event.user_id and self.analytics.detect_anomalous_access_pattern(event.user_id),
                'threat_level': ThreatLevel.MEDIUM,
                'auto_block': False,
                'notification': True
            },
            {
                'name': 'high_rate_limit_violations',
                'condition': lambda event: event.event_type == SecurityEventType.RATE_LIMIT_EXCEEDED,
                'threat_level': ThreatLevel.MEDIUM,
                'auto_block': True,
                'notification': False
            }
        ]
    
    async def process_event(self, event_data: Dict[str, Any]) -> Optional[SecurityEvent]:
        """
        Process incoming security event.
        
        Args:
            event_data: Raw event data
            
        Returns:
            Processed SecurityEvent or None if filtered
        """
        try:
            if not self.monitoring_enabled:
                return None
            
            # Create security event
            event = await self._create_security_event(event_data)
            if not event:
                return None
            
            # Add to analytics
            self.analytics.add_event(event)
            
            # Calculate risk score
            event.risk_score = self.analytics.calculate_risk_score(event)
            
            # Check alert rules
            await self._check_alert_rules(event)
            
            # Execute event handlers
            await self._execute_event_handlers(event)
            
            # Log the event
            await self._log_security_event(event)
            
            return event
            
        except Exception as e:
            logger.error(f"Error processing security event: {e}")
            return None
    
    async def _create_security_event(self, event_data: Dict[str, Any]) -> Optional[SecurityEvent]:
        """Create SecurityEvent from raw data."""
        try:
            # Extract core fields
            event_type_str = event_data.get('event_type', 'suspicious_activity')
            event_type = SecurityEventType(event_type_str)
            
            # Determine threat level based on event type
            threat_level_map = {
                SecurityEventType.AUTHENTICATION_FAILURE: ThreatLevel.LOW,
                SecurityEventType.BRUTE_FORCE_ATTACK: ThreatLevel.HIGH,
                SecurityEventType.RATE_LIMIT_EXCEEDED: ThreatLevel.MEDIUM,
                SecurityEventType.UNAUTHORIZED_ACCESS: ThreatLevel.HIGH,
                SecurityEventType.PRIVILEGE_ESCALATION: ThreatLevel.CRITICAL,
                SecurityEventType.VULNERABILITY_EXPLOITED: ThreatLevel.CRITICAL,
            }
            threat_level = threat_level_map.get(event_type, ThreatLevel.MEDIUM)
            
            # Generate event ID
            event_id = hashlib.sha256(
                f"{event_data.get('timestamp', datetime.utcnow().isoformat())}"
                f"{event_data.get('source_ip', '')}"
                f"{event_type_str}".encode()
            ).hexdigest()[:16]
            
            return SecurityEvent(
                event_id=event_id,
                timestamp=datetime.fromisoformat(event_data.get('timestamp', datetime.utcnow().isoformat())),
                event_type=event_type,
                threat_level=threat_level,
                source_ip=event_data.get('source_ip', ''),
                user_id=event_data.get('user_id'),
                endpoint=event_data.get('endpoint', ''),
                user_agent=event_data.get('user_agent'),
                details=event_data.get('details', {}),
                raw_data=event_data,
                geolocation=await self._get_geolocation(event_data.get('source_ip')),
                risk_score=0.0,  # Will be calculated later
                indicators=event_data.get('indicators', [])
            )
            
        except Exception as e:
            logger.error(f"Error creating security event: {e}")
            return None
    
    async def _check_alert_rules(self, event: SecurityEvent):
        """Check event against alert rules."""
        for rule in self.alert_rules:
            try:
                if rule['condition'](event):
                    await self._trigger_alert(event, rule)
            except Exception as e:
                logger.error(f"Error checking alert rule {rule['name']}: {e}")
    
    async def _trigger_alert(self, event: SecurityEvent, rule: Dict[str, Any]):
        """Trigger security alert based on rule."""
        logger.warning(f"SECURITY_ALERT: {rule['name']} triggered for event {event.event_id}")
        
        # Create or update incident
        incident_id = await self._create_or_update_incident(event, rule)
        
        # Auto-block if configured
        if rule.get('auto_block', False):
            await self._auto_block_source(event)
        
        # Send notification if configured
        if rule.get('notification', False):
            await self._send_security_notification(event, rule, incident_id)
    
    async def _create_or_update_incident(self, event: SecurityEvent, rule: Dict[str, Any]) -> str:
        """Create or update security incident."""
        # Check for existing related incidents
        for incident in self.active_incidents.values():
            if (incident.status in [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING] and
                event.source_ip in incident.affected_resources):
                # Update existing incident
                incident.events.append(event.event_id)
                incident.updated_at = datetime.utcnow()
                incident.timeline.append({
                    'timestamp': event.timestamp.isoformat(),
                    'action': f"Related event: {event.event_type.value}",
                    'details': event.details
                })
                return incident.incident_id
        
        # Create new incident
        incident_id = f"INC-{datetime.utcnow().strftime('%Y%m%d')}-{len(self.active_incidents) + 1:04d}"
        
        incident = SecurityIncident(
            incident_id=incident_id,
            title=f"{rule['name'].replace('_', ' ').title()} - {event.source_ip}",
            description=f"Security rule '{rule['name']}' triggered by event from {event.source_ip}",
            threat_level=rule['threat_level'],
            status=IncidentStatus.OPEN,
            created_at=event.timestamp,
            updated_at=event.timestamp,
            assigned_to=None,
            events=[event.event_id],
            timeline=[{
                'timestamp': event.timestamp.isoformat(),
                'action': 'Incident created',
                'details': {'rule': rule['name'], 'event_type': event.event_type.value}
            }],
            remediation_steps=[],
            affected_resources=[event.source_ip],
            false_positive_reason=None
        )
        
        self.active_incidents[incident_id] = incident
        
        logger.info(f"Created security incident: {incident_id}")
        return incident_id
    
    async def _auto_block_source(self, event: SecurityEvent):
        """Automatically block suspicious source."""
        # In production, this would integrate with firewall/WAF
        logger.warning(f"AUTO_BLOCK: Blocking source {event.source_ip} due to security event")
        
        # Add to blocklist (implement actual blocking mechanism)
        await self._add_to_blocklist(event.source_ip, reason=f"Auto-blocked due to {event.event_type.value}")
    
    async def _send_security_notification(self, event: SecurityEvent, rule: Dict[str, Any], incident_id: str):
        """Send security notification to administrators."""
        notification = {
            'type': 'security_alert',
            'incident_id': incident_id,
            'rule_name': rule['name'],
            'threat_level': rule['threat_level'].value,
            'event_type': event.event_type.value,
            'source_ip': event.source_ip,
            'timestamp': event.timestamp.isoformat(),
            'risk_score': event.risk_score,
            'details': event.details
        }
        
        # In production, send via email, Slack, PagerDuty, etc.
        logger.critical(f"SECURITY_NOTIFICATION: {json.dumps(notification)}")
    
    async def _execute_event_handlers(self, event: SecurityEvent):
        """Execute registered event handlers."""
        handlers = self.event_handlers.get(event.event_type, [])
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.error(f"Error executing event handler: {e}")
    
    async def _log_security_event(self, event: SecurityEvent):
        """Log security event for audit and analysis."""
        log_entry = {
            'timestamp': event.timestamp.isoformat(),
            'event_id': event.event_id,
            'event_type': event.event_type.value,
            'threat_level': event.threat_level.value,
            'source_ip': event.source_ip,
            'user_id': event.user_id,
            'endpoint': event.endpoint,
            'risk_score': event.risk_score,
            'details': event.details,
            'component': 'security_monitor'
        }
        
        logger.info(f"SECURITY_EVENT: {json.dumps(log_entry)}")
    
    async def _get_geolocation(self, ip: str) -> Optional[Dict[str, str]]:
        """Get geolocation for IP address."""
        # In production, integrate with GeoIP service
        return {
            'country': 'Unknown',
            'city': 'Unknown',
            'asn': 'Unknown'
        }
    
    async def _add_to_blocklist(self, ip: str, reason: str):
        """Add IP to security blocklist."""
        # In production, integrate with firewall/WAF API
        pass
    
    def register_event_handler(self, event_type: SecurityEventType, handler: Callable):
        """Register custom event handler."""
        self.event_handlers[event_type].append(handler)
    
    async def get_security_dashboard(self) -> Dict[str, Any]:
        """Get security dashboard data."""
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        
        # Count recent events by type
        recent_events = [e for e in self.analytics.event_buffer if e.timestamp > last_24h]
        event_counts = defaultdict(int)
        for event in recent_events:
            event_counts[event.event_type.value] += 1
        
        # Active incidents summary
        active_incidents = [
            {
                'incident_id': inc.incident_id,
                'title': inc.title,
                'threat_level': inc.threat_level.value,
                'status': inc.status.value,
                'created_at': inc.created_at.isoformat(),
                'event_count': len(inc.events)
            }
            for inc in self.active_incidents.values()
            if inc.status in [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING]
        ]
        
        # Top source IPs by event count
        ip_counts = defaultdict(int)
        for event in recent_events:
            ip_counts[event.source_ip] += 1
        top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'summary': {
                'total_events_24h': len(recent_events),
                'active_incidents': len(active_incidents),
                'avg_risk_score': statistics.mean([e.risk_score for e in recent_events]) if recent_events else 0,
                'unique_source_ips': len(set(e.source_ip for e in recent_events))
            },
            'events_by_type': dict(event_counts),
            'active_incidents': active_incidents,
            'top_source_ips': [{'ip': ip, 'count': count} for ip, count in top_ips],
            'threat_levels': {
                level.value: len([e for e in recent_events if e.threat_level == level])
                for level in ThreatLevel
            }
        }


# Global security monitor instance
security_monitor = SecurityMonitor()


async def process_security_event(event_data: Dict[str, Any]) -> Optional[SecurityEvent]:
    """Convenience function to process security events."""
    return await security_monitor.process_event(event_data)


def get_security_monitor() -> SecurityMonitor:
    """Dependency function to get security monitor instance."""
    return security_monitor


# Convenience function for logging security events
async def log_security_event(event_type: str, user_id: str, details: dict):
    """Log a security event with basic information."""
    await security_monitor.process_event({
        'event_type': event_type,
        'user_id': user_id,
        'details': details,
        'timestamp': datetime.utcnow().isoformat()
    })