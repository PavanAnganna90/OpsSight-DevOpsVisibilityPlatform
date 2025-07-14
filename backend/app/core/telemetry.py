"""
OpenTelemetry Distributed Tracing Configuration

Provides comprehensive distributed tracing setup for FastAPI applications
with automatic instrumentation and custom span management.
"""

import os
import logging
from typing import Dict, Optional, Any
from contextlib import contextmanager

from opentelemetry import trace, metrics, baggage
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.propagators.jaeger import JaegerPropagator
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.semconv.trace import SpanAttributes
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

logger = logging.getLogger(__name__)


class TelemetryConfig:
    """OpenTelemetry configuration management."""
    
    def __init__(self):
        self.service_name = os.getenv("OTEL_SERVICE_NAME", "opssight-backend")
        self.service_version = os.getenv("OTEL_SERVICE_VERSION", "1.0.0")
        self.environment = os.getenv("ENVIRONMENT", "development")
        
        # Tracing configuration
        self.tracing_enabled = os.getenv("OTEL_TRACING_ENABLED", "true").lower() == "true"
        self.jaeger_endpoint = os.getenv("JAEGER_ENDPOINT", "http://localhost:14268/api/traces")
        self.otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        self.sampling_rate = float(os.getenv("OTEL_SAMPLING_RATE", "0.1"))
        
        # Instrumentation configuration
        self.auto_instrument_db = os.getenv("OTEL_INSTRUMENT_DB", "true").lower() == "true"
        self.auto_instrument_http = os.getenv("OTEL_INSTRUMENT_HTTP", "true").lower() == "true"
        self.auto_instrument_redis = os.getenv("OTEL_INSTRUMENT_REDIS", "true").lower() == "true"
        
        # Advanced settings
        self.console_exporter = os.getenv("OTEL_CONSOLE_EXPORTER", "false").lower() == "true"
        self.trace_response_headers = os.getenv("OTEL_TRACE_RESPONSE_HEADERS", "true").lower() == "true"


class TelemetryManager:
    """Manages OpenTelemetry setup and instrumentation."""
    
    def __init__(self, config: Optional[TelemetryConfig] = None):
        self.config = config or TelemetryConfig()
        self.tracer_provider = None
        self.meter_provider = None
        self.tracer = None
        self.meter = None
        self._initialized = False
    
    def initialize(self) -> bool:
        """Initialize OpenTelemetry tracing and metrics."""
        if self._initialized:
            logger.warning("Telemetry already initialized")
            return True
        
        try:
            if not self.config.tracing_enabled:
                logger.info("OpenTelemetry tracing disabled")
                return False
            
            # Setup resource identification
            resource = Resource.create({
                SERVICE_NAME: self.config.service_name,
                SERVICE_VERSION: self.config.service_version,
                "deployment.environment": self.config.environment,
                "service.instance.id": os.getenv("HOSTNAME", "unknown"),
            })
            
            # Initialize tracing
            self._setup_tracing(resource)
            
            # Initialize metrics
            self._setup_metrics(resource)
            
            # Setup propagators
            self._setup_propagators()
            
            # Setup automatic instrumentation
            self._setup_auto_instrumentation()
            
            self._initialized = True
            logger.info(f"OpenTelemetry initialized for service: {self.config.service_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenTelemetry: {e}")
            return False
    
    def _setup_tracing(self, resource: Resource):
        """Setup tracing with exporters."""
        # Create tracer provider
        self.tracer_provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(self.tracer_provider)
        
        # Setup exporters
        if self.config.jaeger_endpoint:
            jaeger_exporter = JaegerExporter(
                endpoint=self.config.jaeger_endpoint,
                # collector_endpoint=self.config.jaeger_endpoint,
                # agent_host_name="localhost",
                # agent_port=6831,
            )
            self.tracer_provider.add_span_processor(
                BatchSpanProcessor(jaeger_exporter)
            )
            logger.info(f"Jaeger exporter configured: {self.config.jaeger_endpoint}")
        
        if self.config.otlp_endpoint:
            otlp_exporter = OTLPSpanExporter(
                endpoint=self.config.otlp_endpoint,
                headers={"Authorization": f"Bearer {os.getenv('OTEL_AUTH_TOKEN', '')}"}
            )
            self.tracer_provider.add_span_processor(
                BatchSpanProcessor(otlp_exporter)
            )
            logger.info(f"OTLP exporter configured: {self.config.otlp_endpoint}")
        
        if self.config.console_exporter:
            console_exporter = ConsoleSpanExporter()
            self.tracer_provider.add_span_processor(
                BatchSpanProcessor(console_exporter)
            )
            logger.info("Console exporter enabled")
        
        # Get tracer instance
        self.tracer = trace.get_tracer(
            __name__,
            version=self.config.service_version,
        )
    
    def _setup_metrics(self, resource: Resource):
        """Setup metrics collection."""
        # Create meter provider with Prometheus reader
        prometheus_reader = PrometheusMetricReader(prefix="opssight")
        self.meter_provider = MeterProvider(
            resource=resource,
            metric_readers=[prometheus_reader]
        )
        metrics.set_meter_provider(self.meter_provider)
        
        # Get meter instance
        self.meter = metrics.get_meter(
            __name__,
            version=self.config.service_version,
        )
        
        logger.info("OpenTelemetry metrics initialized with Prometheus")
    
    def _setup_propagators(self):
        """Setup trace context propagation."""
        propagators = [
            TraceContextTextMapPropagator(),
            B3MultiFormat(),
            JaegerPropagator(),
        ]
        
        set_global_textmap(CompositePropagator(propagators))
        logger.info("Trace propagators configured")
    
    def _setup_auto_instrumentation(self):
        """Setup automatic instrumentation for common libraries."""
        try:
            # HTTP client instrumentation
            if self.config.auto_instrument_http:
                HTTPXClientInstrumentor().instrument()
                RequestsInstrumentor().instrument()
                logger.info("HTTP client instrumentation enabled")
            
            # Database instrumentation
            if self.config.auto_instrument_db:
                SQLAlchemyInstrumentor().instrument()
                logger.info("SQLAlchemy instrumentation enabled")
            
            # Redis instrumentation
            if self.config.auto_instrument_redis:
                RedisInstrumentor().instrument()
                logger.info("Redis instrumentation enabled")
                
        except Exception as e:
            logger.warning(f"Some auto-instrumentation failed: {e}")
    
    def instrument_fastapi(self, app):
        """Instrument FastAPI application."""
        if not self._initialized:
            logger.warning("Telemetry not initialized, skipping FastAPI instrumentation")
            return
        
        try:
            FastAPIInstrumentor.instrument_app(
                app,
                tracer_provider=self.tracer_provider,
                excluded_urls="health,metrics,docs,openapi.json",
                server_request_hook=self._server_request_hook,
                client_request_hook=self._client_request_hook,
                client_response_hook=self._client_response_hook,
            )
            logger.info("FastAPI instrumentation enabled")
            
        except Exception as e:
            logger.error(f"Failed to instrument FastAPI: {e}")
    
    def _server_request_hook(self, span, scope):
        """Hook for server request instrumentation."""
        if span and span.is_recording():
            # Add custom attributes
            if "client" in scope:
                client_info = scope["client"]
                span.set_attribute("client.address", client_info[0] if client_info else "unknown")
            
            # Add user context if available
            if "user" in scope:
                span.set_attribute("user.id", scope["user"].get("id", "anonymous"))
    
    def _client_request_hook(self, span, request):
        """Hook for client request instrumentation."""
        if span and span.is_recording():
            # Add request-specific attributes
            span.set_attribute("http.request.body.size", len(request.content) if hasattr(request, 'content') else 0)
    
    def _client_response_hook(self, span, request, response):
        """Hook for client response instrumentation."""
        if span and span.is_recording():
            # Add response-specific attributes
            if hasattr(response, 'headers'):
                content_length = response.headers.get('content-length')
                if content_length:
                    span.set_attribute("http.response.body.size", int(content_length))
    
    @contextmanager
    def trace_operation(self, operation_name: str, attributes: Optional[Dict[str, Any]] = None):
        """Context manager for tracing custom operations."""
        if not self.tracer:
            yield None
            return
        
        with self.tracer.start_as_current_span(operation_name) as span:
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))
            
            try:
                yield span
            except Exception as e:
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                raise
    
    def add_baggage(self, key: str, value: str):
        """Add baggage to current trace context."""
        baggage.set_baggage(key, value)
    
    def get_current_trace_id(self) -> Optional[str]:
        """Get current trace ID as string."""
        span = trace.get_current_span()
        if span and span.is_recording():
            trace_id = span.get_span_context().trace_id
            return f"{trace_id:032x}"
        return None
    
    def get_current_span_id(self) -> Optional[str]:
        """Get current span ID as string."""
        span = trace.get_current_span()
        if span and span.is_recording():
            span_id = span.get_span_context().span_id
            return f"{span_id:016x}"
        return None
    
    def create_custom_meter(self, name: str):
        """Create a custom meter for application-specific metrics."""
        if self.meter_provider:
            return self.meter_provider.get_meter(name)
        return None
    
    def shutdown(self):
        """Shutdown telemetry providers."""
        try:
            if self.tracer_provider:
                self.tracer_provider.shutdown()
            if self.meter_provider:
                self.meter_provider.shutdown()
            logger.info("OpenTelemetry shutdown completed")
        except Exception as e:
            logger.error(f"Error during telemetry shutdown: {e}")


# Global telemetry manager instance
telemetry_manager = TelemetryManager()


def get_telemetry_manager() -> TelemetryManager:
    """Get the global telemetry manager instance."""
    return telemetry_manager


def init_telemetry(config: Optional[TelemetryConfig] = None) -> bool:
    """Initialize OpenTelemetry with configuration."""
    global telemetry_manager
    
    if config:
        telemetry_manager = TelemetryManager(config)
    
    return telemetry_manager.initialize()


def trace_operation(operation_name: str, attributes: Optional[Dict[str, Any]] = None):
    """Decorator for tracing function operations."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            with telemetry_manager.trace_operation(operation_name, attributes) as span:
                if span:
                    # Add function-specific attributes
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                
                result = func(*args, **kwargs)
                
                if span:
                    # Add result information if applicable
                    if hasattr(result, '__len__'):
                        span.set_attribute("result.count", len(result))
                
                return result
        return wrapper
    return decorator


async def trace_async_operation(operation_name: str, attributes: Optional[Dict[str, Any]] = None):
    """Async decorator for tracing async function operations."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            with telemetry_manager.trace_operation(operation_name, attributes) as span:
                if span:
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                    span.set_attribute("function.type", "async")
                
                result = await func(*args, **kwargs)
                
                if span and hasattr(result, '__len__'):
                    span.set_attribute("result.count", len(result))
                
                return result
        return wrapper
    return decorator


def get_trace_context() -> Dict[str, str]:
    """Get current trace context for manual propagation."""
    context = {}
    trace_id = telemetry_manager.get_current_trace_id()
    span_id = telemetry_manager.get_current_span_id()
    
    if trace_id:
        context["trace_id"] = trace_id
    if span_id:
        context["span_id"] = span_id
    
    return context