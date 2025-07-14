"""
AWS Cost Explorer Service for fetching and processing cost data.
Provides integration with AWS Cost Explorer API for cost analysis and monitoring.
"""

import boto3
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple
from botocore.exceptions import ClientError, BotoCoreError
from sqlalchemy.orm import Session
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.models.aws_cost import (
    AwsAccount,
    AwsCostData,
    AwsCostSummary,
    AwsCostAnomaly,
    CostGranularity,
    AnomalyType,
)
from app.schemas.aws_cost import CostDataRequest, CostDataResponse, CostSummaryResponse

logger = logging.getLogger(__name__)


class AwsCostExplorerError(Exception):
    """Custom exception for AWS Cost Explorer operations"""

    pass


class AwsCostExplorerService:
    """
    Service for interacting with AWS Cost Explorer API.

    Handles authentication, data fetching, transformation, and storage
    of AWS cost data for analysis and monitoring.
    """

    def __init__(self, db: Session):
        """
        Initialize the AWS Cost Explorer service.

        Args:
            db: Database session for data operations
        """
        self.db = db
        self._clients: Dict[str, boto3.client] = {}
        self.logger = logging.getLogger(__name__)

    def _get_client(self, aws_account: AwsAccount) -> boto3.client:
        """
        Get or create AWS Cost Explorer client for the account.

        Args:
            aws_account: AWS account configuration

        Returns:
            Configured boto3 Cost Explorer client

        Raises:
            AwsCostExplorerError: If client creation fails
        """
        account_id = aws_account.account_id

        if account_id in self._clients:
            return self._clients[account_id]

        try:
            # For now, use credentials directly (encryption will be added in subtask 16.3)
            access_key = aws_account.access_key_id
            secret_key = aws_account.secret_access_key

            # Create Cost Explorer client
            client = boto3.client(
                "ce",  # Cost Explorer service
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=aws_account.region,
            )

            # Test the connection with a minimal request
            test_end = date.today()
            test_start = test_end - timedelta(days=1)

            client.get_cost_and_usage(
                TimePeriod={
                    "Start": test_start.strftime("%Y-%m-%d"),
                    "End": test_end.strftime("%Y-%m-%d"),
                },
                Granularity="DAILY",
                Metrics=["UnblendedCost"],
            )

            self._clients[account_id] = client
            self.logger.info(
                f"Successfully created Cost Explorer client for account {account_id}"
            )
            return client

        except Exception as e:
            self.logger.error(
                f"Failed to create Cost Explorer client for account {account_id}: {str(e)}"
            )
            raise AwsCostExplorerError(f"Failed to authenticate with AWS: {str(e)}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((ClientError, BotoCoreError)),
    )
    def fetch_cost_data(
        self, aws_account: AwsAccount, request: CostDataRequest
    ) -> CostDataResponse:
        """
        Fetch cost data from AWS Cost Explorer API.

        Args:
            aws_account: AWS account to fetch data for
            request: Cost data request parameters

        Returns:
            Cost data response with processed data

        Raises:
            AwsCostExplorerError: If data fetching fails
        """
        try:
            client = self._get_client(aws_account)

            # Prepare API request parameters
            api_params = self._prepare_api_params(request)

            self.logger.info(
                f"Fetching cost data for account {aws_account.account_id} "
                f"from {request.start_date} to {request.end_date}"
            )

            # Make API call
            response = client.get_cost_and_usage(**api_params)

            # Process and transform the response
            cost_data = self._process_cost_response(response, aws_account, request)

            # Store data in database
            stored_data = self._store_cost_data(cost_data, aws_account)

            # Calculate summary metrics
            summary = self._calculate_summary_metrics(stored_data)

            return CostDataResponse(
                account_id=aws_account.account_id,
                total_cost=summary["total_cost"],
                cost_data=stored_data,
                summary=summary,
                metadata={
                    "request_params": request.dict(),
                    "data_points": len(stored_data),
                    "fetched_at": datetime.utcnow().isoformat(),
                },
            )

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_message = e.response["Error"]["Message"]
            self.logger.error(f"AWS API error {error_code}: {error_message}")
            raise AwsCostExplorerError(f"AWS API error: {error_message}")

        except Exception as e:
            self.logger.error(f"Unexpected error fetching cost data: {str(e)}")
            raise AwsCostExplorerError(f"Failed to fetch cost data: {str(e)}")

    def _prepare_api_params(self, request: CostDataRequest) -> Dict[str, Any]:
        """
        Prepare parameters for AWS Cost Explorer API call.

        Args:
            request: Cost data request

        Returns:
            Dictionary of API parameters
        """
        params = {
            "TimePeriod": {
                "Start": request.start_date.strftime("%Y-%m-%d"),
                "End": request.end_date.strftime("%Y-%m-%d"),
            },
            "Granularity": request.granularity.value,
            "Metrics": request.metrics or ["UnblendedCost"],
        }

        # Add grouping dimensions
        if request.group_by:
            params["GroupBy"] = []
            for dimension in request.group_by:
                if dimension.upper() in [
                    "SERVICE",
                    "REGION",
                    "USAGE_TYPE",
                    "OPERATION",
                ]:
                    params["GroupBy"].append(
                        {"Type": "DIMENSION", "Key": dimension.upper()}
                    )

        # Add filters
        if request.filter_by:
            params["Filter"] = self._build_filter_expression(request.filter_by)

        return params

    def _build_filter_expression(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build AWS Cost Explorer filter expression.

        Args:
            filters: Filter criteria

        Returns:
            AWS filter expression
        """
        filter_expressions = []

        for key, value in filters.items():
            if key == "services" and isinstance(value, list):
                filter_expressions.append(
                    {"Dimensions": {"Key": "SERVICE", "Values": value}}
                )
            elif key == "regions" and isinstance(value, list):
                filter_expressions.append(
                    {"Dimensions": {"Key": "REGION", "Values": value}}
                )

        if len(filter_expressions) == 1:
            return filter_expressions[0]
        elif len(filter_expressions) > 1:
            return {"And": filter_expressions}

        return {}

    def _process_cost_response(
        self,
        response: Dict[str, Any],
        aws_account: AwsAccount,
        request: CostDataRequest,
    ) -> List[Dict[str, Any]]:
        """
        Process AWS Cost Explorer API response.

        Args:
            response: Raw API response
            aws_account: AWS account
            request: Original request

        Returns:
            List of processed cost data records
        """
        processed_data = []

        for result in response.get("ResultsByTime", []):
            time_period = result["TimePeriod"]
            start_date = datetime.strptime(time_period["Start"], "%Y-%m-%d").date()
            end_date = datetime.strptime(time_period["End"], "%Y-%m-%d").date()

            if result.get("Groups"):
                # Grouped data (by service, region, etc.)
                for group in result["Groups"]:
                    cost_record = self._create_cost_record(
                        aws_account,
                        start_date,
                        end_date,
                        request.granularity,
                        group,
                        result,
                        response,
                    )
                    processed_data.append(cost_record)
            else:
                # Total data (no grouping)
                cost_record = self._create_cost_record(
                    aws_account,
                    start_date,
                    end_date,
                    request.granularity,
                    None,
                    result,
                    response,
                )
                processed_data.append(cost_record)

        return processed_data

    def _create_cost_record(
        self,
        aws_account: AwsAccount,
        start_date: date,
        end_date: date,
        granularity: str,
        group: Optional[Dict[str, Any]],
        result: Dict[str, Any],
        raw_response: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create a cost data record from API response.

        Args:
            aws_account: AWS account
            start_date: Period start date
            end_date: Period end date
            granularity: Data granularity
            group: Group data (if grouped)
            result: Result data
            raw_response: Full API response

        Returns:
            Cost data record
        """
        # Extract cost metrics
        total = result.get("Total", {})
        group_total = group.get("Metrics", {}) if group else total

        unblended_cost = Decimal(
            group_total.get("UnblendedCost", {}).get("Amount", "0")
        )
        blended_cost = Decimal(group_total.get("BlendedCost", {}).get("Amount", "0"))

        # Extract dimensions from group
        service_name = None
        region = None
        usage_type = None

        if group and group.get("Keys"):
            keys = group["Keys"]
            # Map keys based on group dimensions
            if len(keys) >= 1:
                service_name = keys[0] if keys[0] != "NoService" else None
            if len(keys) >= 2:
                region = keys[1] if keys[1] != "NoRegion" else None

        return {
            "aws_account_id": aws_account.id,
            "start_date": start_date,
            "end_date": end_date,
            "granularity": granularity,
            "service_name": service_name,
            "region": region,
            "usage_type": usage_type,
            "unblended_cost": unblended_cost,
            "blended_cost": blended_cost,
            "net_unblended_cost": unblended_cost,  # Simplified for now
            "net_blended_cost": blended_cost,
            "amortized_cost": unblended_cost,
            "currency": group_total.get("UnblendedCost", {}).get("Unit", "USD"),
            "raw_data": {
                "group": group,
                "result": result,
                "response_metadata": raw_response.get("ResponseMetadata", {}),
            },
        }

    def _store_cost_data(
        self, cost_data: List[Dict[str, Any]], aws_account: AwsAccount
    ) -> List[AwsCostData]:
        """
        Store cost data in the database.

        Args:
            cost_data: Processed cost data records
            aws_account: AWS account

        Returns:
            List of stored AwsCostData objects
        """
        stored_records = []

        for record in cost_data:
            # Check if record already exists
            existing = (
                self.db.query(AwsCostData)
                .filter(
                    AwsCostData.aws_account_id == record["aws_account_id"],
                    AwsCostData.start_date == record["start_date"],
                    AwsCostData.end_date == record["end_date"],
                    AwsCostData.service_name == record["service_name"],
                    AwsCostData.region == record["region"],
                )
                .first()
            )

            if existing:
                # Update existing record
                for key, value in record.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)
                stored_records.append(existing)
            else:
                # Create new record
                cost_record = AwsCostData(**record)
                self.db.add(cost_record)
                stored_records.append(cost_record)

        self.db.commit()
        return stored_records

    def _calculate_summary_metrics(
        self, cost_data: List[AwsCostData]
    ) -> Dict[str, Any]:
        """
        Calculate summary metrics from cost data.

        Args:
            cost_data: List of cost data records

        Returns:
            Summary metrics dictionary
        """
        if not cost_data:
            return {
                "total_cost": Decimal("0"),
                "average_daily_cost": Decimal("0"),
                "service_breakdown": {},
                "region_breakdown": {},
                "data_points": 0,
            }

        total_cost = sum(record.unblended_cost for record in cost_data)

        # Calculate service breakdown
        service_breakdown = {}
        for record in cost_data:
            service = record.service_name or "Unknown"
            service_breakdown[service] = (
                service_breakdown.get(service, Decimal("0")) + record.unblended_cost
            )

        # Calculate region breakdown
        region_breakdown = {}
        for record in cost_data:
            region = record.region or "Unknown"
            region_breakdown[region] = (
                region_breakdown.get(region, Decimal("0")) + record.unblended_cost
            )

        # Calculate average daily cost
        unique_dates = set((record.start_date, record.end_date) for record in cost_data)
        days = len(unique_dates) or 1
        average_daily_cost = total_cost / days

        return {
            "total_cost": total_cost,
            "average_daily_cost": average_daily_cost,
            "service_breakdown": {k: float(v) for k, v in service_breakdown.items()},
            "region_breakdown": {k: float(v) for k, v in region_breakdown.items()},
            "data_points": len(cost_data),
            "period_days": days,
        }

    def test_connection(self, aws_account: AwsAccount) -> bool:
        """
        Test AWS Cost Explorer connection for an account.

        Args:
            aws_account: AWS account to test

        Returns:
            True if connection successful, False otherwise
        """
        try:
            client = self._get_client(aws_account)
            return True
        except Exception as e:
            self.logger.error(
                f"Connection test failed for account {aws_account.account_id}: {str(e)}"
            )
            return False
