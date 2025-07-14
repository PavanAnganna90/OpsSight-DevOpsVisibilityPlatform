"""
AWS Cost Data Transformation Service.
Provides data processing, aggregation, and analysis functions for AWS cost data.
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple, Union
from collections import defaultdict
from dataclasses import dataclass
from enum import Enum
import statistics
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.aws_cost import AwsAccount, AwsCostData, AwsCostSummary, CostGranularity
from app.schemas.aws_cost import CostGranularityEnum

logger = logging.getLogger(__name__)


class AggregationType(str, Enum):
    """Types of cost aggregation"""

    SUM = "sum"
    AVERAGE = "average"
    MAX = "max"
    MIN = "min"


class TrendDirection(str, Enum):
    """Cost trend directions"""

    INCREASING = "increasing"
    DECREASING = "decreasing"
    STABLE = "stable"
    VOLATILE = "volatile"


@dataclass
class CostTrend:
    """Cost trend analysis result"""

    direction: TrendDirection
    change_percentage: float
    change_amount: Decimal
    confidence: float
    period_comparison: Dict[str, Any]


@dataclass
class CostForecast:
    """Cost forecast result"""

    predicted_cost: Decimal
    confidence_interval: Tuple[Decimal, Decimal]
    forecast_date: date
    model_accuracy: float
    trend_factors: Dict[str, Any]


@dataclass
class CostAnomaly:
    """Cost anomaly detection result"""

    date: date
    expected_cost: Decimal
    actual_cost: Decimal
    deviation_percentage: float
    severity: str
    contributing_services: List[str]


class AwsCostDataTransformer:
    """
    Service for transforming and analyzing AWS cost data.

    Provides aggregation, trend analysis, forecasting, and anomaly detection
    capabilities for AWS cost data.
    """

    def __init__(self, db: Session):
        """
        Initialize the cost data transformer.

        Args:
            db: Database session for data operations
        """
        self.db = db
        self.logger = logging.getLogger(__name__)

    def aggregate_costs_by_service(
        self,
        aws_account_id: int,
        start_date: date,
        end_date: date,
        aggregation_type: AggregationType = AggregationType.SUM,
    ) -> Dict[str, Decimal]:
        """
        Aggregate costs by AWS service.

        Args:
            aws_account_id: AWS account ID
            start_date: Period start date
            end_date: Period end date
            aggregation_type: Type of aggregation to perform

        Returns:
            Dictionary mapping service names to aggregated costs
        """
        query = self.db.query(AwsCostData).filter(
            AwsCostData.aws_account_id == aws_account_id,
            AwsCostData.start_date >= start_date,
            AwsCostData.end_date <= end_date,
        )

        cost_data = query.all()
        service_costs = defaultdict(list)

        # Group costs by service
        for record in cost_data:
            service_name = record.service_name or "Unknown"
            service_costs[service_name].append(record.unblended_cost)

        # Apply aggregation
        aggregated_costs = {}
        for service, costs in service_costs.items():
            if aggregation_type == AggregationType.SUM:
                aggregated_costs[service] = sum(costs)
            elif aggregation_type == AggregationType.AVERAGE:
                aggregated_costs[service] = Decimal(str(statistics.mean(costs)))
            elif aggregation_type == AggregationType.MAX:
                aggregated_costs[service] = max(costs)
            elif aggregation_type == AggregationType.MIN:
                aggregated_costs[service] = min(costs)

        return aggregated_costs

    def aggregate_costs_by_time_period(
        self,
        aws_account_id: int,
        start_date: date,
        end_date: date,
        granularity: CostGranularityEnum = CostGranularityEnum.DAILY,
    ) -> Dict[str, Decimal]:
        """
        Aggregate costs by time period.

        Args:
            aws_account_id: AWS account ID
            start_date: Period start date
            end_date: Period end date
            granularity: Time granularity for aggregation

        Returns:
            Dictionary mapping time periods to total costs
        """
        query = self.db.query(AwsCostData).filter(
            AwsCostData.aws_account_id == aws_account_id,
            AwsCostData.start_date >= start_date,
            AwsCostData.end_date <= end_date,
        )

        cost_data = query.all()
        time_costs = defaultdict(Decimal)

        for record in cost_data:
            if granularity == CostGranularityEnum.DAILY:
                time_key = record.start_date.strftime("%Y-%m-%d")
            elif granularity == CostGranularityEnum.MONTHLY:
                time_key = record.start_date.strftime("%Y-%m")
            else:  # HOURLY or default to daily
                time_key = record.start_date.strftime("%Y-%m-%d")

            time_costs[time_key] += record.unblended_cost

        return dict(time_costs)

    def calculate_cost_trends(
        self,
        aws_account_id: int,
        start_date: date,
        end_date: date,
        comparison_periods: int = 2,
    ) -> CostTrend:
        """
        Calculate cost trends and month-over-month changes.

        Args:
            aws_account_id: AWS account ID
            start_date: Analysis period start date
            end_date: Analysis period end date
            comparison_periods: Number of periods to compare

        Returns:
            Cost trend analysis result
        """
        # Calculate period length
        period_length = (end_date - start_date).days

        # Get data for current and previous periods
        periods_data = []
        for i in range(comparison_periods):
            period_start = start_date - timedelta(days=period_length * i)
            period_end = end_date - timedelta(days=period_length * i)

            period_costs = self.aggregate_costs_by_time_period(
                aws_account_id, period_start, period_end, CostGranularityEnum.DAILY
            )

            total_cost = sum(period_costs.values())
            periods_data.append(
                {
                    "start_date": period_start,
                    "end_date": period_end,
                    "total_cost": total_cost,
                    "daily_costs": period_costs,
                }
            )

        if len(periods_data) < 2:
            return CostTrend(
                direction=TrendDirection.STABLE,
                change_percentage=0.0,
                change_amount=Decimal("0"),
                confidence=0.0,
                period_comparison={},
            )

        # Calculate trend
        current_period = periods_data[0]
        previous_period = periods_data[1]

        current_cost = current_period["total_cost"]
        previous_cost = previous_period["total_cost"]

        if previous_cost == 0:
            change_percentage = 0.0
            change_amount = current_cost
        else:
            change_amount = current_cost - previous_cost
            change_percentage = float((change_amount / previous_cost) * 100)

        # Determine trend direction
        if abs(change_percentage) < 5:  # Less than 5% change
            direction = TrendDirection.STABLE
        elif change_percentage > 0:
            direction = TrendDirection.INCREASING
        else:
            direction = TrendDirection.DECREASING

        # Calculate confidence
        daily_costs = list(current_period["daily_costs"].values())
        if len(daily_costs) > 1:
            mean_cost = statistics.mean(daily_costs)
            std_cost = statistics.stdev(daily_costs)
            volatility = (std_cost / mean_cost) if mean_cost > 0 else 0

            if volatility > 0.3:  # High volatility threshold
                direction = TrendDirection.VOLATILE
        else:
            volatility = 0

        confidence = max(0.0, min(1.0, 1.0 - (volatility / 2)))

        return CostTrend(
            direction=direction,
            change_percentage=change_percentage,
            change_amount=change_amount,
            confidence=confidence,
            period_comparison={
                "current_period": {
                    "start": current_period["start_date"].isoformat(),
                    "end": current_period["end_date"].isoformat(),
                    "total_cost": float(current_cost),
                    "daily_average": (
                        float(current_cost / len(daily_costs)) if daily_costs else 0
                    ),
                },
                "previous_period": {
                    "start": previous_period["start_date"].isoformat(),
                    "end": previous_period["end_date"].isoformat(),
                    "total_cost": float(previous_cost),
                    "daily_average": (
                        float(previous_cost / len(previous_period["daily_costs"]))
                        if previous_period["daily_costs"]
                        else 0
                    ),
                },
                "volatility": volatility,
            },
        )
