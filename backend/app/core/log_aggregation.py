"""
Centralized Log Aggregation and Processing System

Provides log forwarding, buffering, filtering, and enrichment capabilities
for the OpsSight platform with integration to external log aggregation systems.
"""

import asyncio
import json
import gzip
import time
import aiofiles
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
from collections import deque, defaultdict
import threading
import logging
import hashlib
import socket
import requests
import aiohttp

from app.core.enhanced_logging import LogLevel, LogCategory, LogContext, get_logger


class LogDestination(Enum):
    """Supported log destinations."""
    LOKI = "loki"
    ELASTICSEARCH = "elasticsearch"
    FLUENTD = "fluentd"
    DATADOG = "datadog"
    CLOUDWATCH = "cloudwatch"
    FILE = "file"
    SYSLOG = "syslog"


@dataclass
class LogEntry:
    """Structured log entry for aggregation."""
    timestamp: datetime
    level: str
    message: str
    category: str
    component: str
    context: Dict[str, Any]
    labels: Dict[str, str]
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level,
            "message": self.message,
            "category": self.category,
            "component": self.component,
            "context": self.context,
            "labels": self.labels,
            "metadata": self.metadata
        }
    
    def to_loki_entry(self) -> Dict[str, Any]:
        """Convert to Loki push format."""
        # Combine labels and flatten
        all_labels = {
            "level": self.level,
            "category": self.category,
            "component": self.component,
            "service": "opssight-backend",
            **self.labels
        }
        
        # Create log line with structured data
        log_line = {
            "message": self.message,
            "context": self.context,
            "metadata": self.metadata
        }
        
        return {
            "stream": all_labels,
            "values": [[
                str(int(self.timestamp.timestamp() * 1000000000)),  # nanosecond timestamp
                json.dumps(log_line)
            ]]
        }
    
    def to_elasticsearch_entry(self) -> Dict[str, Any]:
        """Convert to Elasticsearch document format."""
        return {
            "@timestamp": self.timestamp.isoformat(),
            "level": self.level,
            "message": self.message,
            "category": self.category,
            "component": self.component,
            "service": "opssight-backend",
            "labels": self.labels,
            "context": self.context,
            "metadata": self.metadata,
            "host": socket.gethostname()
        }


@dataclass
class LogDestinationConfig:
    """Configuration for log destination."""
    destination_type: LogDestination
    endpoint: str
    enabled: bool = True
    batch_size: int = 100
    flush_interval: int = 10  # seconds
    retry_attempts: int = 3
    retry_backoff: float = 1.0
    timeout: int = 30
    auth_config: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    tls_verify: bool = True
    filters: Optional[List[Dict[str, Any]]] = None


class LogAggregationManager:
    """Central log aggregation and forwarding manager."""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.destinations: Dict[str, Any] = {}
        self.filters: List[Any] = []
        self.stats = {
            "total_processed": 0,
            "total_forwarded": 0,
            "total_filtered": 0,
            "total_errors": 0,
            "start_time": datetime.utcnow(),
            "last_flush": None
        }
    
    def process_log_entry(self, 
                         level: str,
                         message: str,
                         category: str = "general",
                         component: str = "backend",
                         context: Optional[Dict[str, Any]] = None,
                         labels: Optional[Dict[str, str]] = None,
                         metadata: Optional[Dict[str, Any]] = None):
        """Process and buffer a log entry."""
        log_entry = LogEntry(
            timestamp=datetime.utcnow(),
            level=level,
            message=message,
            category=category,
            component=component,
            context=context or {},
            labels=labels or {},
            metadata=metadata or {}
        )
        
        self.stats["total_processed"] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get aggregation statistics."""
        uptime = datetime.utcnow() - self.stats["start_time"]
        
        return {
            **self.stats,
            "uptime_seconds": uptime.total_seconds(),
            "destinations": len(self.destinations),
            "filters": len(self.filters)
        }


# Global log aggregation manager
log_aggregation_manager = LogAggregationManager()


def get_log_aggregation_manager() -> LogAggregationManager:
    """Get the global log aggregation manager."""
    return log_aggregation_manager