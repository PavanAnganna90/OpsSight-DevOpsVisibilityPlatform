"""
Unit tests for AWS Cost Data Transformer Service.
Tests the cost data transformation and analysis functionality.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.services.aws_cost_data_transformer import (
    AwsCostDataTransformer,
    AggregationType,
    TrendDirection,
    CostTrend,
    CostForecast,
    CostAnomaly,
)
from app.models.aws_cost import AwsCostData
from app.schemas.aws_cost import CostGranularityEnum


class TestAwsCostDataTransformer:
    """Test cases for AWS Cost Data Transformer"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def transformer(self, mock_db):
        """Cost data transformer instance"""
        return AwsCostDataTransformer(mock_db)

    def test_init(self, mock_db):
        """Test transformer initialization"""
        transformer = AwsCostDataTransformer(mock_db)
        assert transformer.db == mock_db
        assert transformer.logger is not None

    def test_aggregate_costs_by_service_sum(self, transformer):
        """Test service cost aggregation with SUM"""
        sample_data = [
            Mock(service_name="Amazon EC2-Instance", unblended_cost=Decimal("100.00")),
            Mock(service_name="Amazon S3", unblended_cost=Decimal("25.00")),
            Mock(service_name="Amazon EC2-Instance", unblended_cost=Decimal("75.00")),
        ]
        transformer.db.query.return_value.filter.return_value.all.return_value = (
            sample_data
        )

        result = transformer.aggregate_costs_by_service(
            aws_account_id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 3),
            aggregation_type=AggregationType.SUM,
        )

        expected = {
            "Amazon EC2-Instance": Decimal("175.00"),
            "Amazon S3": Decimal("25.00"),
        }
        assert result == expected
