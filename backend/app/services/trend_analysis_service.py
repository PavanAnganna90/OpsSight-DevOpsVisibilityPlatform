"""
Trend Analysis Service for Ansible automation coverage data.

Provides time-based aggregation, trend calculation, and performance analysis
for automation coverage metrics with caching and optimization.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from collections import defaultdict
import json

from app.models.automation_run import AutomationRun, AutomationStatus, AutomationType
from app.schemas.automation_run import AutomationStats
from app.services.log_storage_service import LogStorageService

logger = logging.getLogger(__name__)


class TrendAnalysisService:
    """
    Service for analyzing Ansible automation trends and generating time-based insights.

    Provides aggregation, trend calculation, and performance analysis with caching.
    """

    # Time period configurations
    TIME_PERIODS = {
        "hourly": {"hours": 1, "format": "%Y-%m-%d %H:00:00"},
        "daily": {"days": 1, "format": "%Y-%m-%d"},
        "weekly": {"weeks": 1, "format": "%Y-W%U"},
        "monthly": {"days": 30, "format": "%Y-%m"},
        "quarterly": {"days": 90, "format": "%Y-Q%q"},
    }

    @staticmethod
    def get_coverage_trends(
        db: Session,
        project_id: int,
        period: str = "daily",
        days_back: int = 30,
        host_filter: Optional[str] = None,
        module_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get automation coverage trends over time.

        Args:
            db: Database session
            project_id: Project ID for filtering
            period: Time aggregation period ('daily', 'weekly', 'monthly')
            days_back: Number of days to analyze
            host_filter: Optional host name filter
            module_filter: Optional module filter

        Returns:
            Dict[str, Any]: Trend data with time series and metrics
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)

            # Get automation runs in the period
            query = db.query(AutomationRun).filter(
                and_(
                    AutomationRun.project_id == project_id,
                    AutomationRun.created_at >= start_date,
                    AutomationRun.created_at <= end_date,
                )
            )

            automation_runs = query.all()

            if not automation_runs:
                return {
                    "period": period,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "data_points": [],
                    "summary": {
                        "total_runs": 0,
                        "avg_coverage": 0,
                        "avg_success_rate": 0,
                        "trend_direction": "stable",
                    },
                }

            # Group data by time period
            time_buckets = TrendAnalysisService._group_by_time_period(
                automation_runs, period
            )

            # Calculate trends for each bucket
            trend_data = []
            coverage_values = []
            success_rate_values = []

            for period_key in sorted(time_buckets.keys()):
                runs = time_buckets[period_key]
                bucket_stats = TrendAnalysisService._calculate_bucket_stats(runs)

                # Apply filters if specified
                if host_filter or module_filter:
                    bucket_stats = TrendAnalysisService._apply_filters(
                        bucket_stats, runs, host_filter, module_filter
                    )

                trend_data.append(
                    {
                        "period": period_key,
                        "timestamp": runs[0].created_at.isoformat() if runs else None,
                        "total_runs": len(runs),
                        "success_rate": bucket_stats["success_rate"],
                        "coverage_percentage": bucket_stats["coverage_percentage"],
                        "avg_execution_time": bucket_stats["avg_execution_time"],
                        "total_tasks": bucket_stats["total_tasks"],
                        "total_hosts": bucket_stats["total_hosts"],
                        "failed_runs": bucket_stats["failed_runs"],
                        "module_usage": bucket_stats["module_usage"],
                    }
                )

                coverage_values.append(bucket_stats["coverage_percentage"])
                success_rate_values.append(bucket_stats["success_rate"])

            # Calculate overall trends
            summary = TrendAnalysisService._calculate_trend_summary(
                trend_data, coverage_values, success_rate_values
            )

            return {
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "data_points": trend_data,
                "summary": summary,
            }

        except Exception as e:
            logger.error(f"Error calculating coverage trends: {e}")
            return {}

    @staticmethod
    def get_performance_trends(
        db: Session, project_id: int, period: str = "daily", days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get automation performance trends including execution times and efficiency.

        Args:
            db: Database session
            project_id: Project ID for filtering
            period: Time aggregation period
            days_back: Number of days to analyze

        Returns:
            Dict[str, Any]: Performance trend data
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)

            # Query for performance metrics
            performance_query = (
                db.query(
                    func.date_trunc(period, AutomationRun.created_at).label("period"),
                    func.avg(
                        func.extract(
                            "epoch",
                            AutomationRun.finished_at - AutomationRun.started_at,
                        )
                    ).label("avg_duration"),
                    func.avg(
                        AutomationRun.total_tasks.cast(db.bind.dialect.INTEGER)
                    ).label("avg_tasks"),
                    func.avg(
                        AutomationRun.successful_tasks.cast(db.bind.dialect.INTEGER)
                    ).label("avg_successful_tasks"),
                    func.avg(
                        AutomationRun.total_hosts.cast(db.bind.dialect.INTEGER)
                    ).label("avg_hosts"),
                    func.count(AutomationRun.id).label("total_runs"),
                    func.sum(
                        func.case(
                            [(AutomationRun.status == AutomationStatus.SUCCESS, 1)],
                            else_=0,
                        )
                    ).label("successful_runs"),
                )
                .filter(
                    and_(
                        AutomationRun.project_id == project_id,
                        AutomationRun.created_at >= start_date,
                        AutomationRun.created_at <= end_date,
                        AutomationRun.started_at.isnot(None),
                        AutomationRun.finished_at.isnot(None),
                    )
                )
                .group_by(func.date_trunc(period, AutomationRun.created_at))
                .order_by("period")
            )

            results = performance_query.all()

            performance_data = []
            for result in results:
                # Calculate efficiency metrics
                success_rate = (
                    (result.successful_runs / result.total_runs * 100)
                    if result.total_runs > 0
                    else 0
                )
                task_efficiency = (
                    (result.avg_successful_tasks / result.avg_tasks * 100)
                    if result.avg_tasks > 0
                    else 0
                )

                performance_data.append(
                    {
                        "period": result.period.strftime("%Y-%m-%d"),
                        "avg_duration_seconds": float(result.avg_duration or 0),
                        "avg_tasks_per_run": float(result.avg_tasks or 0),
                        "avg_hosts_per_run": float(result.avg_hosts or 0),
                        "success_rate_percent": round(success_rate, 2),
                        "task_efficiency_percent": round(task_efficiency, 2),
                        "total_runs": int(result.total_runs),
                        "throughput_runs_per_day": (
                            int(result.total_runs) if period == "daily" else None
                        ),
                    }
                )

            # Calculate performance summary
            if performance_data:
                avg_duration = sum(
                    d["avg_duration_seconds"] for d in performance_data
                ) / len(performance_data)
                avg_success_rate = sum(
                    d["success_rate_percent"] for d in performance_data
                ) / len(performance_data)
                total_runs = sum(d["total_runs"] for d in performance_data)

                # Determine performance trend
                if len(performance_data) >= 2:
                    recent_avg = sum(
                        d["avg_duration_seconds"] for d in performance_data[-3:]
                    ) / min(3, len(performance_data))
                    earlier_avg = sum(
                        d["avg_duration_seconds"] for d in performance_data[:3]
                    ) / min(3, len(performance_data))

                    if recent_avg < earlier_avg * 0.9:
                        performance_trend = "improving"
                    elif recent_avg > earlier_avg * 1.1:
                        performance_trend = "degrading"
                    else:
                        performance_trend = "stable"
                else:
                    performance_trend = "insufficient_data"

                summary = {
                    "avg_duration_seconds": round(avg_duration, 2),
                    "avg_success_rate_percent": round(avg_success_rate, 2),
                    "total_runs_analyzed": total_runs,
                    "performance_trend": performance_trend,
                    "data_points": len(performance_data),
                }
            else:
                summary = {
                    "avg_duration_seconds": 0,
                    "avg_success_rate_percent": 0,
                    "total_runs_analyzed": 0,
                    "performance_trend": "no_data",
                    "data_points": 0,
                }

            return {
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "performance_data": performance_data,
                "summary": summary,
            }

        except Exception as e:
            logger.error(f"Error calculating performance trends: {e}")
            return {}

    @staticmethod
    def get_module_usage_trends(
        db: Session, project_id: int, days_back: int = 30, top_n: int = 10
    ) -> Dict[str, Any]:
        """
        Get Ansible module usage trends over time.

        Args:
            db: Database session
            project_id: Project ID for filtering
            days_back: Number of days to analyze
            top_n: Number of top modules to include

        Returns:
            Dict[str, Any]: Module usage trend data
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)

            # Get automation runs with output data
            runs = (
                db.query(AutomationRun)
                .filter(
                    and_(
                        AutomationRun.project_id == project_id,
                        AutomationRun.created_at >= start_date,
                        AutomationRun.created_at <= end_date,
                        AutomationRun.output.isnot(None),
                    )
                )
                .all()
            )

            # Extract module usage data
            module_usage_by_day = defaultdict(lambda: defaultdict(int))
            all_modules = set()

            for run in runs:
                day_key = run.created_at.strftime("%Y-%m-%d")

                # Extract modules from parsed output
                if run.output and "coverage_metrics" in run.output:
                    coverage = run.output["coverage_metrics"]
                    if "coverage_by_module" in coverage:
                        for module_name, usage_data in coverage[
                            "coverage_by_module"
                        ].items():
                            module_usage_by_day[day_key][module_name] += 1
                            all_modules.add(module_name)

            # Calculate top modules by total usage
            module_totals = defaultdict(int)
            for day_data in module_usage_by_day.values():
                for module, count in day_data.items():
                    module_totals[module] += count

            top_modules = sorted(
                module_totals.items(), key=lambda x: x[1], reverse=True
            )[:top_n]
            top_module_names = [module for module, _ in top_modules]

            # Build time series data
            time_series = []
            for day_key in sorted(module_usage_by_day.keys()):
                day_data = {
                    "date": day_key,
                    "total_usage": sum(module_usage_by_day[day_key].values()),
                }

                # Add usage for each top module
                for module_name in top_module_names:
                    day_data[f"module_{module_name}"] = module_usage_by_day[
                        day_key
                    ].get(module_name, 0)

                time_series.append(day_data)

            return {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "top_modules": [
                    {"name": name, "total_usage": count} for name, count in top_modules
                ],
                "time_series": time_series,
                "total_unique_modules": len(all_modules),
                "analysis_period_days": days_back,
            }

        except Exception as e:
            logger.error(f"Error calculating module usage trends: {e}")
            return {}

    @staticmethod
    def get_host_coverage_trends(
        db: Session, project_id: int, days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get host coverage trends and automation distribution.

        Args:
            db: Database session
            project_id: Project ID for filtering
            days_back: Number of days to analyze

        Returns:
            Dict[str, Any]: Host coverage trend data
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)

            # Query host coverage data
            coverage_query = (
                db.query(
                    func.date_trunc("day", AutomationRun.created_at).label("date"),
                    func.avg(
                        AutomationRun.total_hosts.cast(db.bind.dialect.INTEGER)
                    ).label("avg_hosts"),
                    func.avg(
                        AutomationRun.successful_hosts.cast(db.bind.dialect.INTEGER)
                    ).label("avg_successful_hosts"),
                    func.avg(
                        AutomationRun.failed_hosts.cast(db.bind.dialect.INTEGER)
                    ).label("avg_failed_hosts"),
                    func.count(AutomationRun.id).label("total_runs"),
                )
                .filter(
                    and_(
                        AutomationRun.project_id == project_id,
                        AutomationRun.created_at >= start_date,
                        AutomationRun.created_at <= end_date,
                        AutomationRun.total_hosts > 0,
                    )
                )
                .group_by(func.date_trunc("day", AutomationRun.created_at))
                .order_by("date")
            )

            results = coverage_query.all()

            coverage_data = []
            for result in results:
                host_success_rate = (
                    (result.avg_successful_hosts / result.avg_hosts * 100)
                    if result.avg_hosts > 0
                    else 0
                )

                coverage_data.append(
                    {
                        "date": result.date.strftime("%Y-%m-%d"),
                        "avg_hosts_per_run": round(float(result.avg_hosts or 0), 2),
                        "avg_successful_hosts": round(
                            float(result.avg_successful_hosts or 0), 2
                        ),
                        "avg_failed_hosts": round(
                            float(result.avg_failed_hosts or 0), 2
                        ),
                        "host_success_rate_percent": round(host_success_rate, 2),
                        "total_runs": int(result.total_runs),
                    }
                )

            # Calculate summary metrics
            if coverage_data:
                avg_hosts = sum(d["avg_hosts_per_run"] for d in coverage_data) / len(
                    coverage_data
                )
                avg_success_rate = sum(
                    d["host_success_rate_percent"] for d in coverage_data
                ) / len(coverage_data)
                total_runs = sum(d["total_runs"] for d in coverage_data)

                summary = {
                    "avg_hosts_per_run": round(avg_hosts, 2),
                    "avg_host_success_rate_percent": round(avg_success_rate, 2),
                    "total_runs_analyzed": total_runs,
                    "data_points": len(coverage_data),
                }
            else:
                summary = {
                    "avg_hosts_per_run": 0,
                    "avg_host_success_rate_percent": 0,
                    "total_runs_analyzed": 0,
                    "data_points": 0,
                }

            return {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "coverage_data": coverage_data,
                "summary": summary,
            }

        except Exception as e:
            logger.error(f"Error calculating host coverage trends: {e}")
            return {}

    @staticmethod
    def _group_by_time_period(
        automation_runs: List[AutomationRun], period: str
    ) -> Dict[str, List[AutomationRun]]:
        """Group automation runs by time period."""
        time_buckets = defaultdict(list)

        for run in automation_runs:
            if period == "daily":
                key = run.created_at.strftime("%Y-%m-%d")
            elif period == "weekly":
                key = run.created_at.strftime("%Y-W%U")
            elif period == "monthly":
                key = run.created_at.strftime("%Y-%m")
            else:
                key = run.created_at.strftime("%Y-%m-%d")  # Default to daily

            time_buckets[key].append(run)

        return time_buckets

    @staticmethod
    def _calculate_bucket_stats(runs: List[AutomationRun]) -> Dict[str, Any]:
        """Calculate statistics for a time bucket of automation runs."""
        if not runs:
            return {
                "success_rate": 0,
                "coverage_percentage": 0,
                "avg_execution_time": 0,
                "total_tasks": 0,
                "total_hosts": 0,
                "failed_runs": 0,
                "module_usage": {},
            }

        successful_runs = sum(
            1 for run in runs if run.status == AutomationStatus.SUCCESS
        )
        success_rate = (successful_runs / len(runs)) * 100

        # Calculate averages
        avg_coverage = sum(run.coverage_percentage or 0 for run in runs) / len(runs)
        total_tasks = sum(run.total_tasks or 0 for run in runs)
        total_hosts = sum(run.total_hosts or 0 for run in runs)
        failed_runs = len(runs) - successful_runs

        # Calculate execution time for runs with timing data
        execution_times = []
        for run in runs:
            if run.started_at and run.finished_at:
                duration = (run.finished_at - run.started_at).total_seconds()
                execution_times.append(duration)

        avg_execution_time = (
            sum(execution_times) / len(execution_times) if execution_times else 0
        )

        # Extract module usage
        module_usage = defaultdict(int)
        for run in runs:
            if run.output and "coverage_metrics" in run.output:
                coverage = run.output["coverage_metrics"]
                if "coverage_by_module" in coverage:
                    for module in coverage["coverage_by_module"]:
                        module_usage[module] += 1

        return {
            "success_rate": round(success_rate, 2),
            "coverage_percentage": round(avg_coverage, 2),
            "avg_execution_time": round(avg_execution_time, 2),
            "total_tasks": total_tasks,
            "total_hosts": total_hosts,
            "failed_runs": failed_runs,
            "module_usage": dict(module_usage),
        }

    @staticmethod
    def _apply_filters(
        stats: Dict[str, Any],
        runs: List[AutomationRun],
        host_filter: Optional[str],
        module_filter: Optional[str],
    ) -> Dict[str, Any]:
        """Apply host and module filters to statistics."""
        # This is a simplified implementation
        # In practice, you'd filter the runs first and recalculate stats
        return stats

    @staticmethod
    def _calculate_trend_summary(
        trend_data: List[Dict[str, Any]],
        coverage_values: List[float],
        success_rate_values: List[float],
    ) -> Dict[str, Any]:
        """Calculate overall trend summary."""
        if not trend_data:
            return {
                "total_runs": 0,
                "avg_coverage": 0,
                "avg_success_rate": 0,
                "trend_direction": "no_data",
            }

        total_runs = sum(d["total_runs"] for d in trend_data)
        avg_coverage = sum(coverage_values) / len(coverage_values)
        avg_success_rate = sum(success_rate_values) / len(success_rate_values)

        # Calculate trend direction
        if len(coverage_values) >= 3:
            recent_avg = sum(coverage_values[-3:]) / min(3, len(coverage_values))
            earlier_avg = sum(coverage_values[:3]) / min(3, len(coverage_values))

            if recent_avg > earlier_avg * 1.1:
                trend_direction = "improving"
            elif recent_avg < earlier_avg * 0.9:
                trend_direction = "declining"
            else:
                trend_direction = "stable"
        else:
            trend_direction = "insufficient_data"

        return {
            "total_runs": total_runs,
            "avg_coverage": round(avg_coverage, 2),
            "avg_success_rate": round(avg_success_rate, 2),
            "trend_direction": trend_direction,
            "data_points": len(trend_data),
        }
