"""
Kafka Consumer for Real-time Data Ingestion

Consumes streaming data from various DevOps tools and systems.
"""

import json
import logging
import time
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime
from dataclasses import dataclass
from kafka import KafkaConsumer, TopicPartition
from kafka.errors import KafkaError
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import threading

from ..config import get_kafka_config, get_database_config
from ..utils.database import DatabaseManager
from ..utils.monitoring import MetricsCollector


@dataclass
class DataRecord:
    """Standardized data record structure."""
    timestamp: datetime
    source: str
    event_type: str
    data: Dict[str, Any]
    metadata: Dict[str, Any]


class KafkaDataConsumer:
    """
    High-performance Kafka consumer for DevOps monitoring data.
    
    Supports multiple topics, parallel processing, and automatic batching.
    """
    
    def __init__(
        self, 
        topics: List[str],
        consumer_group: str = "opssight-ml",
        max_workers: int = 4
    ):
        self.topics = topics
        self.consumer_group = consumer_group
        self.max_workers = max_workers
        self.kafka_config = get_kafka_config()
        self.db_config = get_database_config()
        
        self.logger = logging.getLogger(__name__)
        self.metrics = MetricsCollector("kafka_consumer")
        self.db_manager = DatabaseManager(self.db_config)
        
        self.consumer = None
        self.is_running = False
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.message_handlers: Dict[str, Callable] = {}
        
        self._setup_consumer()
        self._setup_message_handlers()
    
    def _setup_consumer(self):
        """Initialize Kafka consumer with optimal configuration."""
        consumer_config = {
            'bootstrap_servers': self.kafka_config['bootstrap_servers'],
            'group_id': self.consumer_group,
            'auto_offset_reset': 'latest',
            'enable_auto_commit': False,
            'max_poll_records': 1000,
            'max_poll_interval_ms': 300000,
            'session_timeout_ms': 30000,
            'heartbeat_interval_ms': 10000,
            'value_deserializer': lambda x: json.loads(x.decode('utf-8')),
            'key_deserializer': lambda x: x.decode('utf-8') if x else None,
        }
        
        if self.kafka_config.get('security_protocol'):
            consumer_config.update({
                'security_protocol': self.kafka_config['security_protocol'],
                'sasl_mechanism': self.kafka_config.get('sasl_mechanism'),
                'sasl_plain_username': self.kafka_config.get('username'),
                'sasl_plain_password': self.kafka_config.get('password'),
            })
        
        self.consumer = KafkaConsumer(**consumer_config)
        self.consumer.subscribe(self.topics)
        
        self.logger.info(f"Kafka consumer initialized for topics: {self.topics}")
    
    def _setup_message_handlers(self):
        """Setup handlers for different message types."""
        self.message_handlers = {
            'infrastructure_metrics': self._handle_infrastructure_metrics,
            'application_logs': self._handle_application_logs,
            'deployment_events': self._handle_deployment_events,
            'alert_events': self._handle_alert_events,
            'performance_metrics': self._handle_performance_metrics,
            'security_events': self._handle_security_events,
            'cost_metrics': self._handle_cost_metrics,
        }
    
    def start(self):
        """Start consuming messages from Kafka."""
        self.is_running = True
        self.logger.info("Starting Kafka consumer...")
        
        try:
            batch = []
            batch_size = 100
            last_commit = time.time()
            commit_interval = 30  # seconds
            
            while self.is_running:
                try:
                    message_batch = self.consumer.poll(timeout_ms=1000)
                    
                    if not message_batch:
                        # No messages, commit if needed
                        if time.time() - last_commit > commit_interval and batch:
                            self._process_batch(batch)
                            self.consumer.commit()
                            batch.clear()
                            last_commit = time.time()
                        continue
                    
                    # Process messages
                    for topic_partition, messages in message_batch.items():
                        for message in messages:
                            try:
                                record = self._parse_message(message)
                                if record:
                                    batch.append(record)
                                    self.metrics.increment('messages_received')
                                
                                # Process batch when full
                                if len(batch) >= batch_size:
                                    self._process_batch(batch)
                                    self.consumer.commit()
                                    batch.clear()
                                    last_commit = time.time()
                                    
                            except Exception as e:
                                self.logger.error(f"Error processing message: {e}")
                                self.metrics.increment('processing_errors')
                
                except KafkaError as e:
                    self.logger.error(f"Kafka error: {e}")
                    self.metrics.increment('kafka_errors')
                    time.sleep(5)  # Back off on errors
                
                except Exception as e:
                    self.logger.error(f"Unexpected error: {e}")
                    self.metrics.increment('unexpected_errors')
                    
        except KeyboardInterrupt:
            self.logger.info("Received shutdown signal")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the consumer gracefully."""
        self.is_running = False
        if self.consumer:
            self.consumer.close()
        self.executor.shutdown(wait=True)
        self.logger.info("Kafka consumer stopped")
    
    def _parse_message(self, message) -> Optional[DataRecord]:
        """Parse Kafka message into standardized record."""
        try:
            value = message.value
            key = message.key
            topic = message.topic
            
            # Extract metadata
            metadata = {
                'topic': topic,
                'partition': message.partition,
                'offset': message.offset,
                'key': key,
                'timestamp_type': message.timestamp_type,
                'kafka_timestamp': message.timestamp,
            }
            
            # Determine event type from topic or message content
            event_type = value.get('event_type', topic.split('.')[-1])
            source = value.get('source', topic.split('.')[0])
            
            # Parse timestamp
            timestamp_str = value.get('timestamp')
            if timestamp_str:
                timestamp = pd.to_datetime(timestamp_str)
            else:
                timestamp = pd.to_datetime(message.timestamp, unit='ms')
            
            return DataRecord(
                timestamp=timestamp,
                source=source,
                event_type=event_type,
                data=value.get('data', value),
                metadata=metadata
            )
            
        except Exception as e:
            self.logger.error(f"Error parsing message: {e}")
            return None
    
    def _process_batch(self, batch: List[DataRecord]):
        """Process a batch of records in parallel."""
        if not batch:
            return
        
        # Group by event type for efficient processing
        grouped_records = {}
        for record in batch:
            event_type = record.event_type
            if event_type not in grouped_records:
                grouped_records[event_type] = []
            grouped_records[event_type].append(record)
        
        # Submit processing tasks
        futures = []
        for event_type, records in grouped_records.items():
            handler = self.message_handlers.get(event_type, self._handle_generic)
            future = self.executor.submit(handler, records)
            futures.append(future)
        
        # Wait for all tasks to complete
        for future in futures:
            try:
                future.result(timeout=30)
            except Exception as e:
                self.logger.error(f"Error in batch processing: {e}")
        
        self.logger.info(f"Processed batch of {len(batch)} records")
        self.metrics.increment('batches_processed')
    
    def _handle_infrastructure_metrics(self, records: List[DataRecord]):
        """Handle infrastructure monitoring metrics."""
        df_data = []
        for record in records:
            data = record.data
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'host': data.get('host'),
                'service': data.get('service'),
                'metric_name': data.get('metric_name'),
                'metric_value': data.get('value'),
                'unit': data.get('unit'),
                'labels': json.dumps(data.get('labels', {})),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('infrastructure_metrics', df)
            self.logger.debug(f"Stored {len(df_data)} infrastructure metrics")
    
    def _handle_application_logs(self, records: List[DataRecord]):
        """Handle application log events."""
        df_data = []
        for record in records:
            data = record.data
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'level': data.get('level'),
                'message': data.get('message'),
                'logger': data.get('logger'),
                'module': data.get('module'),
                'service': data.get('service'),
                'trace_id': data.get('trace_id'),
                'span_id': data.get('span_id'),
                'labels': json.dumps(data.get('labels', {})),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('application_logs', df)
            self.logger.debug(f"Stored {len(df_data)} application logs")
    
    def _handle_deployment_events(self, records: List[DataRecord]):
        """Handle deployment and release events."""
        df_data = []
        for record in records:
            data = record.data
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'deployment_id': data.get('deployment_id'),
                'service': data.get('service'),
                'version': data.get('version'),
                'environment': data.get('environment'),
                'status': data.get('status'),
                'duration': data.get('duration'),
                'commit_hash': data.get('commit_hash'),
                'user': data.get('user'),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('deployment_events', df)
            self.logger.debug(f"Stored {len(df_data)} deployment events")
    
    def _handle_alert_events(self, records: List[DataRecord]):
        """Handle alert and incident events."""
        df_data = []
        for record in records:
            data = record.data
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'alert_id': data.get('alert_id'),
                'alert_name': data.get('alert_name'),
                'severity': data.get('severity'),
                'status': data.get('status'),
                'service': data.get('service'),
                'description': data.get('description'),
                'labels': json.dumps(data.get('labels', {})),
                'annotations': json.dumps(data.get('annotations', {})),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('alert_events', df)
            self.logger.debug(f"Stored {len(df_data)} alert events")
    
    def _handle_performance_metrics(self, records: List[DataRecord]):
        """Handle application performance metrics."""
        df_data = []
        for record in records:
            data = record.data
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'service': data.get('service'),
                'endpoint': data.get('endpoint'),
                'method': data.get('method'),
                'response_time': data.get('response_time'),
                'status_code': data.get('status_code'),
                'error_rate': data.get('error_rate'),
                'throughput': data.get('throughput'),
                'cpu_usage': data.get('cpu_usage'),
                'memory_usage': data.get('memory_usage'),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('performance_metrics', df)
            self.logger.debug(f"Stored {len(df_data)} performance metrics")
    
    def _handle_security_events(self, records: List[DataRecord]):
        """Handle security and compliance events."""
        df_data = []
        for record in records:
            data = record.data
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'event_type': data.get('event_type'),
                'user': data.get('user'),
                'action': data.get('action'),
                'resource': data.get('resource'),
                'ip_address': data.get('ip_address'),
                'user_agent': data.get('user_agent'),
                'status': data.get('status'),
                'risk_score': data.get('risk_score'),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('security_events', df)
            self.logger.debug(f"Stored {len(df_data)} security events")
    
    def _handle_cost_metrics(self, records: List[DataRecord]):
        """Handle cost and resource usage metrics."""
        df_data = []
        for record in records:
            data = record.data
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'resource_type': data.get('resource_type'),
                'resource_id': data.get('resource_id'),
                'service': data.get('service'),
                'cost': data.get('cost'),
                'currency': data.get('currency'),
                'usage_quantity': data.get('usage_quantity'),
                'usage_unit': data.get('usage_unit'),
                'tags': json.dumps(data.get('tags', {})),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('cost_metrics', df)
            self.logger.debug(f"Stored {len(df_data)} cost metrics")
    
    def _handle_generic(self, records: List[DataRecord]):
        """Handle unknown or generic event types."""
        df_data = []
        for record in records:
            df_data.append({
                'timestamp': record.timestamp,
                'source': record.source,
                'event_type': record.event_type,
                'data': json.dumps(record.data),
                'metadata': json.dumps(record.metadata)
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            self.db_manager.insert_dataframe('generic_events', df)
            self.logger.debug(f"Stored {len(df_data)} generic events")
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get consumer health status and metrics."""
        return {
            'is_running': self.is_running,
            'topics': self.topics,
            'consumer_group': self.consumer_group,
            'assignment': [str(tp) for tp in self.consumer.assignment()] if self.consumer else [],
            'metrics': self.metrics.get_all_metrics(),
            'timestamp': datetime.utcnow().isoformat()
        }