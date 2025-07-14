"""
Tests for Prometheus Queries Utility

Comprehensive test suite for the Prometheus query templates and query builder,
covering template management, query generation, and validation.
"""

import pytest
from unittest.mock import Mock, patch

from app.utils.prometheus_queries import (
    QueryTemplate,
    MetricType,
    AggregationType,
    KubernetesQueryTemplates,
    AdvancedQueryBuilder,
    create_query_builder,
)


class TestQueryTemplate:
    """Test suite for QueryTemplate class."""

    async def test_query_template_creation(self):
        """Test creating a query template."""
        template = QueryTemplate(
            id="test_cpu_usage",
            name="Test CPU Usage",
            description="CPU usage percentage for test nodes",
            category="node",
            metric_type=MetricType.GAUGE,
            aggregation_type=AggregationType.AVERAGE,
            query_template='cpu_usage{cluster="{{cluster_name}}", node="{{node}}"}',
        )

        assert template.id == "test_cpu_usage"
        assert template.name == "Test CPU Usage"
        assert template.category == "node"
        assert template.metric_type == MetricType.GAUGE
        assert template.aggregation_type == AggregationType.AVERAGE
        assert "{{cluster_name}}" in template.query_template

    async def test_query_template_render(self):
        """Test rendering a query template with variables."""
        template = QueryTemplate(
            id="node_cpu",
            name="Node CPU",
            description="Node CPU usage",
            category="node",
            metric_type=MetricType.GAUGE,
            aggregation_type=AggregationType.AVERAGE,
            query_template='cpu_usage{cluster="{{cluster_name}}", instance="{{instance}}"}',
        )

        rendered = await template.render(
            cluster_name="test-cluster", instance="node-1:9100"
        )

        assert "test-cluster" in rendered
        assert "node-1:9100" in rendered
        assert "{{" not in rendered  # No unrendered variables

    async def test_query_template_to_dict(self):
        """Test converting query template to dictionary."""
        template = QueryTemplate(
            id="test_memory",
            name="Test Memory",
            description="Memory usage test",
            category="node",
            metric_type=MetricType.GAUGE,
            aggregation_type=AggregationType.SUM,
            query_template='memory_usage{cluster="{{cluster_name}}"}',
        )

        template_dict = await template.to_dict()

        assert template_dict["id"] == "test_memory"
        assert template_dict["name"] == "Test Memory"
        assert template_dict["category"] == "node"
        assert template_dict["metric_type"] == "gauge"
        assert template_dict["aggregation_type"] == "sum"


class TestKubernetesQueryTemplates:
    """Test suite for KubernetesQueryTemplates class."""

    @pytest.fixture
    async def query_templates(self):
        """Create KubernetesQueryTemplates instance for testing."""
        return await KubernetesQueryTemplates()

    async def test_node_cpu_usage_template(self, query_templates):
        """Test node CPU usage template."""
        template = await query_templates.get_template("node_cpu_usage")

        assert template is not None
        assert template.id == "node_cpu_usage"
        assert template.category == "node"
        assert template.metric_type == MetricType.GAUGE
        assert "{{cluster_name}}" in template.query_template

    async def test_node_memory_usage_template(self, query_templates):
        """Test node memory usage template."""
        template = await query_templates.get_template("node_memory_usage")

        assert template is not None
        assert template.id == "node_memory_usage"
        assert template.category == "node"
        assert "memory" in template.query_template.lower()

    async def test_node_disk_usage_template(self, query_templates):
        """Test node disk usage template."""
        template = await query_templates.get_template("node_disk_usage")

        assert template is not None
        assert template.id == "node_disk_usage"
        assert template.category == "node"
        assert (
            "disk" in template.query_template.lower()
            or "filesystem" in template.query_template.lower()
        )

    async def test_pod_cpu_usage_template(self, query_templates):
        """Test pod CPU usage template."""
        template = await query_templates.get_template("pod_cpu_usage")

        assert template is not None
        assert template.id == "pod_cpu_usage"
        assert template.category == "pod"
        assert "pod" in template.query_template.lower()

    async def test_pod_memory_usage_template(self, query_templates):
        """Test pod memory usage template."""
        template = await query_templates.get_template("pod_memory_usage")

        assert template is not None
        assert template.id == "pod_memory_usage"
        assert template.category == "pod"
        assert (
            "pod" in template.query_template.lower()
            and "memory" in template.query_template.lower()
        )

    async def test_cluster_total_cpu_capacity_template(self, query_templates):
        """Test cluster total CPU capacity template."""
        template = await query_templates.get_template("cluster_total_cpu_capacity")

        assert template is not None
        assert template.id == "cluster_total_cpu_capacity"
        assert template.category == "cluster"
        assert template.aggregation_type == AggregationType.SUM

    async def test_cluster_total_memory_capacity_template(self, query_templates):
        """Test cluster total memory capacity template."""
        template = await query_templates.get_template("cluster_total_memory_capacity")

        assert template is not None
        assert template.id == "cluster_total_memory_capacity"
        assert template.category == "cluster"
        assert template.aggregation_type == AggregationType.SUM

    async def test_get_all_templates(self, query_templates):
        """Test getting all templates."""
        all_templates = await query_templates.get_all_templates()

        assert len(all_templates) > 0
        assert all(isinstance(t, QueryTemplate) for t in all_templates)

        # Check that we have templates from different categories
        categories = {t.category for t in all_templates}
        assert "node" in categories
        assert "pod" in categories
        assert "cluster" in categories

    async def test_get_templates_by_category(self, query_templates):
        """Test getting templates by category."""
        node_templates = await query_templates.get_templates_by_category("node")
        pod_templates = await query_templates.get_templates_by_category("pod")
        cluster_templates = await query_templates.get_templates_by_category("cluster")

        assert len(node_templates) > 0
        assert len(pod_templates) > 0
        assert len(cluster_templates) > 0

        assert all(t.category == "node" for t in node_templates)
        assert all(t.category == "pod" for t in pod_templates)
        assert all(t.category == "cluster" for t in cluster_templates)

    async def test_get_nonexistent_template(self, query_templates):
        """Test getting a non-existent template."""
        template = await query_templates.get_template("nonexistent_template")

        assert template is None

    async def test_get_templates_by_invalid_category(self, query_templates):
        """Test getting templates by invalid category."""
        templates = await query_templates.get_templates_by_category("invalid_category")

        assert templates == []


class TestAdvancedQueryBuilder:
    """Test suite for AdvancedQueryBuilder class."""

    @pytest.fixture
    async def query_builder(self):
        """Create AdvancedQueryBuilder instance for testing."""
        return await AdvancedQueryBuilder("test-cluster")

    async def test_query_builder_initialization(self, query_builder):
        """Test query builder initialization."""
        assert query_builder.cluster_name == "test-cluster"
        assert hasattr(query_builder, "templates")
        assert hasattr(query_builder, "dashboard_queries")

    async def test_node_cpu_usage_query(self, query_builder):
        """Test generating node CPU usage query."""
        query = await query_builder.node_cpu_usage()

        assert isinstance(query, str)
        assert "test-cluster" in query
        assert "cpu" in query.lower()

    async def test_node_memory_usage_query(self, query_builder):
        """Test generating node memory usage query."""
        query = await query_builder.node_memory_usage()

        assert isinstance(query, str)
        assert "test-cluster" in query
        assert "memory" in query.lower()

    async def test_node_disk_usage_query(self, query_builder):
        """Test generating node disk usage query."""
        query = await query_builder.node_disk_usage()

        assert isinstance(query, str)
        assert "test-cluster" in query

    async def test_pod_cpu_usage_query(self, query_builder):
        """Test generating pod CPU usage query."""
        query = await query_builder.pod_cpu_usage()

        assert isinstance(query, str)
        assert "test-cluster" in query
        assert "pod" in query.lower()

    async def test_pod_memory_usage_query(self, query_builder):
        """Test generating pod memory usage query."""
        query = await query_builder.pod_memory_usage()

        assert isinstance(query, str)
        assert "test-cluster" in query
        assert "pod" in query.lower()
        assert "memory" in query.lower()

    async def test_cluster_total_cpu_capacity_query(self, query_builder):
        """Test generating cluster total CPU capacity query."""
        query = await query_builder.cluster_total_cpu_capacity()

        assert isinstance(query, str)
        assert "test-cluster" in query

    async def test_cluster_total_memory_capacity_query(self, query_builder):
        """Test generating cluster total memory capacity query."""
        query = await query_builder.cluster_total_memory_capacity()

        assert isinstance(query, str)
        assert "test-cluster" in query

    async def test_custom_query_with_template(self, query_builder):
        """Test generating custom query using template."""
        custom_params = {"instance": "node-1:9100", "job": "kubernetes-nodes"}

        query = await query_builder.custom_query("node_cpu_usage", **custom_params)

        assert isinstance(query, str)
        assert "test-cluster" in query
        assert "node-1:9100" in query
        assert "kubernetes-nodes" in query

    async def test_custom_query_with_nonexistent_template(self, query_builder):
        """Test generating custom query with non-existent template."""
        with pytest.raises(ValueError):
            await query_builder.custom_query("nonexistent_template")

    async def test_get_dashboard_queries(self, query_builder):
        """Test getting dashboard queries collection."""
        dashboard_queries = await query_builder.get_dashboard_queries()

        assert isinstance(dashboard_queries, dict)
        assert "cluster_overview" in dashboard_queries
        assert "node_metrics" in dashboard_queries
        assert "pod_metrics" in dashboard_queries

        # Verify each collection contains queries
        for collection_name, queries in dashboard_queries.items():
            assert isinstance(queries, dict)
            assert len(queries) > 0

    async def test_get_cluster_overview_queries(self, query_builder):
        """Test getting cluster overview queries."""
        overview_queries = await query_builder.get_cluster_overview_queries()

        assert isinstance(overview_queries, dict)
        assert "total_cpu_capacity" in overview_queries
        assert "total_memory_capacity" in overview_queries

        # Verify queries are strings and contain cluster name
        for query_name, query in overview_queries.items():
            assert isinstance(query, str)
            assert "test-cluster" in query

    async def test_get_node_metrics_queries(self, query_builder):
        """Test getting node metrics queries."""
        node_queries = await query_builder.get_node_metrics_queries()

        assert isinstance(node_queries, dict)
        assert "cpu_usage" in node_queries
        assert "memory_usage" in node_queries
        assert "disk_usage" in node_queries

        # Verify queries contain cluster name
        for query_name, query in node_queries.items():
            assert isinstance(query, str)
            assert "test-cluster" in query

    async def test_get_pod_metrics_queries(self, query_builder):
        """Test getting pod metrics queries."""
        pod_queries = await query_builder.get_pod_metrics_queries()

        assert isinstance(pod_queries, dict)
        assert "cpu_usage" in pod_queries
        assert "memory_usage" in pod_queries

        # Verify queries contain cluster name
        for query_name, query in pod_queries.items():
            assert isinstance(query, str)
            assert "test-cluster" in query

    async def test_query_builder_with_different_cluster(self, query_builder):
        """Test query builder with different cluster name."""
        builder = await AdvancedQueryBuilder("production-cluster")

        query = await builder.node_cpu_usage()

        assert "production-cluster" in query
        assert "test-cluster" not in query

    async def test_available_templates(self, query_builder):
        """Test getting available templates."""
        templates = await query_builder.get_available_templates()

        assert isinstance(templates, list)
        assert len(templates) > 0
        assert all(isinstance(t, dict) for t in templates)

        # Check that template dictionaries have required fields
        for template in templates:
            assert "id" in template
            assert "name" in template
            assert "category" in template

    async def test_available_templates_by_category(self, query_builder):
        """Test getting available templates by category."""
        node_templates = await query_builder.get_available_templates(category="node")
        pod_templates = await query_builder.get_available_templates(category="pod")

        assert isinstance(node_templates, list)
        assert isinstance(pod_templates, list)
        assert len(node_templates) > 0
        assert len(pod_templates) > 0

        assert all(t["category"] == "node" for t in node_templates)
        assert all(t["category"] == "pod" for t in pod_templates)


class TestCreateQueryBuilder:
    """Test suite for create_query_builder factory function."""

    async def test_create_query_builder(self):
        """Test creating query builder via factory function."""
        builder = await create_query_builder("test-cluster")

        assert isinstance(builder, AdvancedQueryBuilder)
        assert builder.cluster_name == "test-cluster"

    async def test_create_query_builder_functionality(self):
        """Test that factory-created builder is fully functional."""
        builder = await create_query_builder("factory-test-cluster")

        # Test basic query generation
        cpu_query = await builder.node_cpu_usage()
        memory_query = await builder.node_memory_usage()

        assert "factory-test-cluster" in cpu_query
        assert "factory-test-cluster" in memory_query

        # Test dashboard queries
        dashboard_queries = await builder.get_dashboard_queries()
        assert isinstance(dashboard_queries, dict)
        assert len(dashboard_queries) > 0


class TestMetricTypeAndAggregationType:
    """Test suite for MetricType and AggregationType enums."""

    async def test_metric_types(self):
        """Test MetricType enum values."""
        assert MetricType.GAUGE == "gauge"
        assert MetricType.COUNTER == "counter"
        assert MetricType.HISTOGRAM == "histogram"
        assert MetricType.SUMMARY == "summary"

    async def test_aggregation_types(self):
        """Test AggregationType enum values."""
        assert AggregationType.SUM == "sum"
        assert AggregationType.AVERAGE == "average"
        assert AggregationType.MAX == "max"
        assert AggregationType.MIN == "min"
        assert AggregationType.COUNT == "count"

    async def test_enum_values_in_templates(self):
        """Test that enum values are used correctly in templates."""
        templates = await KubernetesQueryTemplates()
        all_templates = await templates.get_all_templates()

        # Verify all templates use valid enum values
        for template in all_templates:
            assert template.metric_type in [e.value for e in MetricType]
            assert template.aggregation_type in [e.value for e in AggregationType]


class TestQueryTemplateValidation:
    """Test suite for query template validation."""

    async def test_template_variable_substitution(self):
        """Test that template variables are properly substituted."""
        template = QueryTemplate(
            id="test_template",
            name="Test Template",
            description="Test description",
            category="test",
            metric_type=MetricType.GAUGE,
            aggregation_type=AggregationType.AVERAGE,
            query_template='test_metric{cluster="{{cluster_name}}", node="{{node}}", job="{{job}}"}',
        )

        rendered = await template.render(
            cluster_name="test-cluster", node="node-1", job="kubernetes-nodes"
        )

        assert "test-cluster" in rendered
        assert "node-1" in rendered
        assert "kubernetes-nodes" in rendered
        assert "{{" not in rendered  # No unrendered variables

    async def test_template_with_missing_variables(self):
        """Test template rendering with missing variables."""
        template = QueryTemplate(
            id="test_template",
            name="Test Template",
            description="Test description",
            category="test",
            metric_type=MetricType.GAUGE,
            aggregation_type=AggregationType.AVERAGE,
            query_template='test_metric{cluster="{{cluster_name}}", node="{{node}}"}',
        )

        # Render with only one variable provided
        rendered = await template.render(cluster_name="test-cluster")

        assert "test-cluster" in rendered
        assert "{{node}}" in rendered  # Unrendered variable remains

    async def test_template_with_extra_variables(self):
        """Test template rendering with extra variables."""
        template = QueryTemplate(
            id="test_template",
            name="Test Template",
            description="Test description",
            category="test",
            metric_type=MetricType.GAUGE,
            aggregation_type=AggregationType.AVERAGE,
            query_template='test_metric{cluster="{{cluster_name}}"}',
        )

        # Render with extra variables that aren't in the template
        rendered = await template.render(
            cluster_name="test-cluster", extra_var="extra_value"
        )

        assert "test-cluster" in rendered
        assert "extra_value" not in rendered  # Extra variable ignored


if __name__ == "__main__":
    pytest.main([__file__])
