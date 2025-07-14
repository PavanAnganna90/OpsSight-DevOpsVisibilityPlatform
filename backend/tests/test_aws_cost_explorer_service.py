"""
Unit tests for AWS Cost Explorer Service.
Tests the AWS Cost Explorer integration functionality.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import date, datetime, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError

from app.services.aws_cost_explorer_service import (
    AwsCostExplorerService,
    AwsCostExplorerError,
)
from app.models.aws_cost import AwsAccount, AwsCostData
from app.schemas.aws_cost import CostDataRequest, CostGranularityEnum


class TestAwsCostExplorerService:
    """Test cases for AWS Cost Explorer Service"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def service(self, mock_db):
        """AWS Cost Explorer service instance"""
        return AwsCostExplorerService(mock_db)

    @pytest.fixture
    def mock_aws_account(self):
        """Mock AWS account"""
        account = Mock(spec=AwsAccount)
        account.id = 1
        account.account_id = "123456789012"
        account.account_name = "Test Account"
        account.access_key_id = "AKIAIOSFODNN7EXAMPLE"
        account.secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        account.region = "us-east-1"
        account.is_active = True
        return account

    @pytest.fixture
    def mock_cost_request(self):
        """Mock cost data request"""
        return CostDataRequest(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            granularity=CostGranularityEnum.DAILY,
            group_by=["SERVICE"],
            metrics=["UnblendedCost"],
        )

    def test_init(self, mock_db):
        """Test service initialization"""
        service = AwsCostExplorerService(mock_db)
        assert service.db == mock_db
        assert service._clients == {}
        assert service.logger is not None

    @patch("app.services.aws_cost_explorer_service.boto3.client")
    def test_get_client_success(self, mock_boto_client, service, mock_aws_account):
        """Test successful client creation"""
        mock_client = Mock()
        mock_boto_client.return_value = mock_client
        mock_client.get_cost_and_usage.return_value = {"ResultsByTime": []}

        client = service._get_client(mock_aws_account)

        assert client == mock_client
        assert service._clients[mock_aws_account.account_id] == mock_client
        mock_boto_client.assert_called_once_with(
            "ce",
            aws_access_key_id=mock_aws_account.access_key_id,
            aws_secret_access_key=mock_aws_account.secret_access_key,
            region_name=mock_aws_account.region,
        )

    def test_prepare_api_params_basic(self, service, mock_cost_request):
        """Test basic API parameter preparation"""
        params = service._prepare_api_params(mock_cost_request)

        expected = {
            "TimePeriod": {"Start": "2024-01-01", "End": "2024-01-31"},
            "Granularity": "DAILY",
            "Metrics": ["UnblendedCost"],
            "GroupBy": [{"Type": "DIMENSION", "Key": "SERVICE"}],
        }
        assert params == expected

    @patch.object(AwsCostExplorerService, "_get_client")
    def test_test_connection_success(self, mock_get_client, service, mock_aws_account):
        """Test successful connection test"""
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        result = service.test_connection(mock_aws_account)

        assert result is True
        mock_get_client.assert_called_once_with(mock_aws_account)
