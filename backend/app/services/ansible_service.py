"""
Ansible Automation Coverage Service

This service analyzes Ansible playbook execution logs to provide comprehensive
automation coverage tracking, module usage analysis, and infrastructure
automation insights.

Supports multiple log formats:
- JSON output (ansible-playbook with callback plugins)
- Standard text output
- AWX/Tower execution logs

Features:
- Playbook execution analysis
- Module usage and coverage tracking
- Host reliability metrics
- Automation trend analysis
- Performance insights
"""

import json
import re
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import yaml
from pathlib import Path

logger = logging.getLogger(__name__)


class AnsibleLogParser:
    """Parser for various Ansible log formats"""

    # Common Ansible module patterns
    MODULE_PATTERNS = {
        "core": [
            "setup",
            "ping",
            "copy",
            "file",
            "template",
            "command",
            "shell",
            "script",
        ],
        "package": ["yum", "apt", "package", "pip", "npm", "homebrew"],
        "service": ["service", "systemd", "supervisorctl"],
        "network": ["uri", "get_url", "firewalld", "iptables"],
        "cloud": ["ec2", "rds", "elb", "s3", "route53", "cloudformation"],
        "database": ["mysql_user", "mysql_db", "postgresql_user", "postgresql_db"],
        "security": ["user", "group", "authorized_key", "acl", "selinux"],
        "files": ["lineinfile", "blockinfile", "replace", "find", "stat"],
        "git": ["git", "github_release", "gitlab_project"],
        "docker": ["docker_container", "docker_image", "docker_compose"],
        "kubernetes": ["k8s", "kubernetes", "helm"],
    }

    # Status patterns for different log formats
    STATUS_PATTERNS = {
        "success": ["SUCCESS", "ok:", "PLAY RECAP"],
        "changed": ["CHANGED", "changed:", "changed="],
        "failed": ["FAILED", "failed:", "fatal:"],
        "skipped": ["SKIPPED", "skipping:", "skipped="],
        "unreachable": ["UNREACHABLE", "unreachable="],
    }

    def __init__(self):
        self.execution_data = {}
        self.parsed_tasks = []
        self.host_stats = defaultdict(dict)
        self.module_usage = Counter()

    def detect_log_format(self, log_content: str) -> str:
        """
        Detect the format of Ansible log content

        Args:
            log_content: Raw log content

        Returns:
            Detected format: 'json', 'standard', or 'unknown'
        """
        content = log_content.strip()

        # Check for JSON format
        if content.startswith("{") or '"msg"' in content[:200]:
            try:
                # Try to parse first line as JSON
                first_line = content.split("\n")[0]
                json.loads(first_line)
                return "json"
            except (json.JSONDecodeError, IndexError):
                pass

        # Check for standard Ansible output patterns
        if any(
            pattern in content[:500] for pattern in ["PLAY [", "TASK [", "PLAY RECAP"]
        ):
            return "standard"

        # Check for AWX/Tower format
        if "ANSIBLE_LOG_PATH" in content or "awx" in content.lower():
            return "awx"

        return "unknown"

    def parse_json_logs(self, log_content: str) -> Dict[str, Any]:
        """
        Parse JSON format logs (from ansible-playbook with callback plugins)

        Args:
            log_content: JSON format log content

        Returns:
            Parsed execution data
        """
        execution_data = {
            "format": "json",
            "tasks": [],
            "plays": [],
            "hosts": set(),
            "modules_used": Counter(),
            "status_summary": defaultdict(int),
            "execution_time": None,
            "failed_tasks": [],
            "changed_tasks": [],
        }

        try:
            lines = log_content.strip().split("\n")
            current_play = None

            for line_num, line in enumerate(lines, 1):
                if not line.strip():
                    continue

                try:
                    event = json.loads(line)
                    event_type = event.get("event_type", "")

                    if event_type == "playbook_on_start":
                        execution_data["start_time"] = event.get("created")
                        execution_data["playbook"] = event.get("event_data", {}).get(
                            "playbook"
                        )

                    elif event_type == "playbook_on_play_start":
                        play_data = event.get("event_data", {})
                        current_play = {
                            "name": play_data.get("play", {}).get(
                                "name", "Unnamed Play"
                            ),
                            "hosts": play_data.get("play", {}).get("hosts", []),
                            "tasks": [],
                        }
                        execution_data["plays"].append(current_play)

                    elif event_type == "runner_on_ok":
                        self._process_task_result(
                            event, "ok", execution_data, current_play
                        )

                    elif event_type == "runner_on_changed":
                        self._process_task_result(
                            event, "changed", execution_data, current_play
                        )

                    elif event_type == "runner_on_failed":
                        self._process_task_result(
                            event, "failed", execution_data, current_play
                        )

                    elif event_type == "runner_on_skipped":
                        self._process_task_result(
                            event, "skipped", execution_data, current_play
                        )

                    elif event_type == "playbook_on_stats":
                        self._process_final_stats(event, execution_data)

                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON line {line_num}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Failed to parse JSON logs: {e}")
            raise

        return execution_data

    def parse_standard_logs(self, log_content: str) -> Dict[str, Any]:
        """
        Parse standard Ansible playbook output

        Args:
            log_content: Standard format log content

        Returns:
            Parsed execution data
        """
        execution_data = {
            "format": "standard",
            "tasks": [],
            "plays": [],
            "hosts": set(),
            "modules_used": Counter(),
            "status_summary": defaultdict(int),
            "execution_time": None,
            "failed_tasks": [],
            "changed_tasks": [],
        }

        lines = log_content.strip().split("\n")
        current_play = None
        current_task = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Parse play start
            play_match = re.match(r"PLAY \[(.*?)\]", line)
            if play_match:
                current_play = {
                    "name": play_match.group(1),
                    "tasks": [],
                    "hosts": set(),
                }
                execution_data["plays"].append(current_play)
                continue

            # Parse task start
            task_match = re.match(r"TASK \[(.*?)\]", line)
            if task_match:
                current_task = {
                    "name": task_match.group(1),
                    "results": [],
                    "module": self._extract_module_from_task_name(task_match.group(1)),
                }
                if current_play:
                    current_play["tasks"].append(current_task)
                execution_data["tasks"].append(current_task)
                continue

            # Parse task results
            self._parse_task_result_line(line, current_task, execution_data)

            # Parse final recap
            if line.startswith("PLAY RECAP"):
                self._parse_play_recap(lines[lines.index(line) :], execution_data)
                break

        return execution_data

    def _process_task_result(
        self,
        event: Dict,
        status: str,
        execution_data: Dict,
        current_play: Optional[Dict],
    ):
        """Process a task result from JSON logs"""
        event_data = event.get("event_data", {})
        host = event_data.get("host", "unknown")
        task_name = event_data.get("task", "unknown")
        module_name = event_data.get("module_name", "unknown")

        execution_data["hosts"].add(host)
        execution_data["modules_used"][module_name] += 1
        execution_data["status_summary"][status] += 1

        task_result = {
            "host": host,
            "task_name": task_name,
            "module": module_name,
            "status": status,
            "result": event_data.get("res", {}),
        }

        execution_data["tasks"].append(task_result)

        if status == "failed":
            execution_data["failed_tasks"].append(task_result)
        elif status == "changed":
            execution_data["changed_tasks"].append(task_result)

        if current_play:
            current_play["tasks"].append(task_result)
            current_play.setdefault("hosts", set()).add(host)

    def _process_final_stats(self, event: Dict, execution_data: Dict):
        """Process final playbook statistics"""
        stats = event.get("event_data", {})
        execution_data["final_stats"] = stats
        execution_data["end_time"] = event.get("created")

        # Calculate execution time if we have start and end times
        if execution_data.get("start_time") and execution_data.get("end_time"):
            try:
                start = datetime.fromisoformat(
                    execution_data["start_time"].replace("Z", "+00:00")
                )
                end = datetime.fromisoformat(
                    execution_data["end_time"].replace("Z", "+00:00")
                )
                execution_data["execution_time"] = (end - start).total_seconds()
            except Exception as e:
                logger.warning(f"Failed to calculate execution time: {e}")

    def _extract_module_from_task_name(self, task_name: str) -> str:
        """Extract module name from task name using patterns"""
        task_lower = task_name.lower()

        # Check for explicit module mentions
        for category, modules in self.MODULE_PATTERNS.items():
            for module in modules:
                if module in task_lower:
                    return module

        # Default fallback
        return "unknown"

    def _parse_task_result_line(
        self, line: str, current_task: Optional[Dict], execution_data: Dict
    ):
        """Parse individual task result lines from standard output"""
        if not current_task:
            return

        # Pattern: hostname | STATUS => {...}
        result_match = re.match(r"(\S+)\s*\|\s*(\w+)\s*=>", line)
        if result_match:
            host = result_match.group(1)
            status = result_match.group(2).lower()

            execution_data["hosts"].add(host)
            execution_data["status_summary"][status] += 1

            if current_task.get("module"):
                execution_data["modules_used"][current_task["module"]] += 1

            result = {"host": host, "status": status, "task_name": current_task["name"]}

            current_task["results"].append(result)

            if status == "failed":
                execution_data["failed_tasks"].append(result)
            elif status == "changed":
                execution_data["changed_tasks"].append(result)

    def _parse_play_recap(self, recap_lines: List[str], execution_data: Dict):
        """Parse the PLAY RECAP section"""
        recap_data = {}

        for line in recap_lines[1:]:  # Skip "PLAY RECAP" line
            if not line.strip():
                continue

            # Pattern: hostname : ok=X changed=Y unreachable=Z failed=W
            recap_match = re.match(
                r"(\S+)\s*:\s*ok=(\d+)\s+changed=(\d+)\s+unreachable=(\d+)\s+failed=(\d+)",
                line,
            )
            if recap_match:
                host = recap_match.group(1)
                recap_data[host] = {
                    "ok": int(recap_match.group(2)),
                    "changed": int(recap_match.group(3)),
                    "unreachable": int(recap_match.group(4)),
                    "failed": int(recap_match.group(5)),
                }

        execution_data["recap"] = recap_data


class AnsibleCoverageAnalyzer:
    """Analyzer for automation coverage metrics and insights"""

    def __init__(self):
        self.parser = AnsibleLogParser()

    def analyze_playbook_execution(
        self, log_content: str, log_format: str = "auto"
    ) -> Dict[str, Any]:
        """
        Comprehensive analysis of Ansible playbook execution

        Args:
            log_content: Raw log content
            log_format: Expected format or "auto" for detection

        Returns:
            Comprehensive analysis results
        """
        if not log_content.strip():
            raise ValueError("Log content cannot be empty")

        # Detect format if auto
        if log_format == "auto":
            log_format = self.parser.detect_log_format(log_content)

        logger.info(f"Analyzing Ansible logs with format: {log_format}")

        # Parse logs based on format
        if log_format == "json":
            execution_data = self.parser.parse_json_logs(log_content)
        elif log_format == "standard":
            execution_data = self.parser.parse_standard_logs(log_content)
        else:
            # Fallback to standard parsing
            execution_data = self.parser.parse_standard_logs(log_content)

        # Generate comprehensive analysis
        analysis = self._generate_comprehensive_analysis(execution_data)

        return analysis

    def _generate_comprehensive_analysis(
        self, execution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive analysis from parsed execution data"""

        analysis = {
            "execution_summary": self._generate_execution_summary(execution_data),
            "automation_coverage": self._calculate_automation_coverage(execution_data),
            "module_analysis": self._analyze_module_usage(execution_data),
            "host_reliability": self._calculate_host_reliability(execution_data),
            "performance_metrics": self._calculate_performance_metrics(execution_data),
            "recommendations": self._generate_recommendations(execution_data),
            "trends": self._analyze_execution_trends(execution_data),
            "metadata": {
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "log_format": execution_data.get("format", "unknown"),
                "total_lines_processed": len(str(execution_data).split("\n")),
            },
        }

        return analysis

    def _generate_execution_summary(
        self, execution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate high-level execution summary"""
        status_summary = execution_data.get("status_summary", {})
        total_tasks = sum(status_summary.values())

        summary = {
            "total_tasks": total_tasks,
            "total_hosts": len(execution_data.get("hosts", [])),
            "total_plays": len(execution_data.get("plays", [])),
            "success_rate": (
                status_summary.get("ok", 0) + status_summary.get("changed", 0)
            )
            / max(total_tasks, 1)
            * 100,
            "failure_rate": status_summary.get("failed", 0) / max(total_tasks, 1) * 100,
            "change_rate": status_summary.get("changed", 0) / max(total_tasks, 1) * 100,
            "execution_time_seconds": execution_data.get("execution_time"),
            "status_breakdown": dict(status_summary),
        }

        return summary

    def _calculate_automation_coverage(
        self, execution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate automation coverage metrics"""
        modules_used = execution_data.get("modules_used", Counter())
        total_modules = sum(modules_used.values())

        # Categorize modules
        categorized_modules = defaultdict(list)
        for module, count in modules_used.items():
            category = self._categorize_module(module)
            categorized_modules[category].append(
                {
                    "module": module,
                    "usage_count": count,
                    "percentage": (count / max(total_modules, 1)) * 100,
                }
            )

        # Calculate coverage scores
        coverage_score = self._calculate_coverage_score(modules_used)

        coverage = {
            "overall_score": coverage_score,
            "total_unique_modules": len(modules_used),
            "total_module_executions": total_modules,
            "module_categories": dict(categorized_modules),
            "top_modules": [
                {
                    "module": module,
                    "count": count,
                    "percentage": (count / max(total_modules, 1)) * 100,
                }
                for module, count in modules_used.most_common(10)
            ],
            "automation_breadth": len(
                categorized_modules
            ),  # Number of different categories used
            "automation_depth": total_modules
            / max(len(modules_used), 1),  # Average usage per module
        }

        return coverage

    def _analyze_module_usage(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Detailed module usage analysis"""
        modules_used = execution_data.get("modules_used", Counter())

        # Module efficiency analysis
        failed_tasks = execution_data.get("failed_tasks", [])
        failed_modules = Counter(
            [task.get("module", "unknown") for task in failed_tasks]
        )

        module_analysis = {
            "usage_distribution": dict(modules_used),
            "failure_rates": {},
            "efficiency_scores": {},
            "recommendations": [],
        }

        # Calculate failure rates per module
        for module, total_count in modules_used.items():
            failed_count = failed_modules.get(module, 0)
            failure_rate = (failed_count / max(total_count, 1)) * 100
            efficiency_score = 100 - failure_rate

            module_analysis["failure_rates"][module] = failure_rate
            module_analysis["efficiency_scores"][module] = efficiency_score

            # Generate recommendations for high-failure modules
            if failure_rate > 20:  # More than 20% failure rate
                module_analysis["recommendations"].append(
                    {
                        "type": "high_failure_rate",
                        "module": module,
                        "message": f"Module '{module}' has a {failure_rate:.1f}% failure rate. Consider reviewing task implementation.",
                    }
                )

        return module_analysis

    def _calculate_host_reliability(
        self, execution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate host reliability metrics"""
        recap_data = execution_data.get("recap", {})
        hosts = execution_data.get("hosts", set())

        reliability_metrics = {
            "host_count": len(hosts),
            "host_performance": {},
            "overall_reliability": 0.0,
            "problematic_hosts": [],
        }

        total_reliability = 0

        for host in hosts:
            host_recap = recap_data.get(host, {})

            total_tasks = sum(host_recap.values()) if host_recap else 0
            successful_tasks = host_recap.get("ok", 0) + host_recap.get("changed", 0)
            failed_tasks = host_recap.get("failed", 0)

            reliability_score = (successful_tasks / max(total_tasks, 1)) * 100
            total_reliability += reliability_score

            host_metrics = {
                "reliability_score": reliability_score,
                "total_tasks": total_tasks,
                "successful_tasks": successful_tasks,
                "failed_tasks": failed_tasks,
                "unreachable_count": host_recap.get("unreachable", 0),
            }

            reliability_metrics["host_performance"][host] = host_metrics

            # Identify problematic hosts
            if reliability_score < 80 or host_recap.get("unreachable", 0) > 0:
                reliability_metrics["problematic_hosts"].append(
                    {
                        "host": host,
                        "issues": self._identify_host_issues(
                            host_recap, reliability_score
                        ),
                    }
                )

        # Calculate overall reliability
        if hosts:
            reliability_metrics["overall_reliability"] = total_reliability / len(hosts)

        return reliability_metrics

    def _calculate_performance_metrics(
        self, execution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate performance and efficiency metrics"""
        metrics = {
            "execution_time": execution_data.get("execution_time"),
            "task_efficiency": 0.0,
            "parallel_efficiency": 0.0,
            "resource_utilization": {},
        }

        # Calculate task efficiency (tasks per second)
        total_tasks = sum(execution_data.get("status_summary", {}).values())
        execution_time = execution_data.get("execution_time", 0)

        if execution_time > 0:
            metrics["task_efficiency"] = total_tasks / execution_time

        # Estimate parallel efficiency based on host count
        host_count = len(execution_data.get("hosts", []))
        if host_count > 1 and execution_time > 0:
            # Theoretical minimum time if fully parallel
            theoretical_min_time = execution_time / host_count
            metrics["parallel_efficiency"] = (
                theoretical_min_time / execution_time
            ) * 100

        return metrics

    def _generate_recommendations(
        self, execution_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []

        # Performance recommendations
        execution_time = execution_data.get("execution_time", 0)
        if execution_time > 300:  # More than 5 minutes
            recommendations.append(
                {
                    "category": "performance",
                    "priority": "medium",
                    "title": "Long execution time detected",
                    "description": f"Execution took {execution_time:.1f} seconds. Consider optimizing tasks or using parallelization.",
                    "action": "Review task efficiency and consider using async actions where appropriate.",
                }
            )

        # Failure rate recommendations
        status_summary = execution_data.get("status_summary", {})
        total_tasks = sum(status_summary.values())
        failure_rate = (status_summary.get("failed", 0) / max(total_tasks, 1)) * 100

        if failure_rate > 5:  # More than 5% failure rate
            recommendations.append(
                {
                    "category": "reliability",
                    "priority": "high",
                    "title": "High failure rate detected",
                    "description": f"Task failure rate is {failure_rate:.1f}%. Review failing tasks for improvements.",
                    "action": "Implement better error handling and idempotency checks.",
                }
            )

        # Module diversity recommendations
        modules_used = execution_data.get("modules_used", Counter())
        if len(modules_used) < 5:
            recommendations.append(
                {
                    "category": "automation_breadth",
                    "priority": "low",
                    "title": "Limited module diversity",
                    "description": f"Only {len(modules_used)} different modules used. Consider expanding automation coverage.",
                    "action": "Explore additional Ansible modules to increase automation capabilities.",
                }
            )

        return recommendations

    def _analyze_execution_trends(
        self, execution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze trends in execution data"""
        # This is a simplified version - in a real implementation,
        # this would compare against historical data
        trends = {
            "current_metrics": {
                "success_rate": (
                    execution_data.get("status_summary", {}).get("ok", 0)
                    + execution_data.get("status_summary", {}).get("changed", 0)
                )
                / max(sum(execution_data.get("status_summary", {}).values()), 1)
                * 100,
                "execution_time": execution_data.get("execution_time"),
                "module_count": len(execution_data.get("modules_used", {})),
            },
            "trend_indicators": {"improving": [], "declining": [], "stable": []},
        }

        return trends

    def _categorize_module(self, module_name: str) -> str:
        """Categorize a module based on its name"""
        module_lower = module_name.lower()

        for category, modules in self.parser.MODULE_PATTERNS.items():
            if any(mod in module_lower for mod in modules):
                return category

        return "other"

    def _calculate_coverage_score(self, modules_used: Counter) -> float:
        """Calculate an overall automation coverage score"""
        if not modules_used:
            return 0.0

        # Base score on module diversity and usage distribution
        unique_modules = len(modules_used)
        total_executions = sum(modules_used.values())

        # Diversity factor (more unique modules = better)
        diversity_factor = min(
            unique_modules / 20, 1.0
        )  # Cap at 20 modules for full score

        # Distribution factor (more even distribution = better)
        module_counts = list(modules_used.values())
        if len(module_counts) > 1:
            avg_usage = total_executions / len(module_counts)
            variance = sum((count - avg_usage) ** 2 for count in module_counts) / len(
                module_counts
            )
            distribution_factor = 1.0 / (1.0 + variance / (avg_usage**2))
        else:
            distribution_factor = 0.5

        # Combined score (0-100)
        coverage_score = (diversity_factor * 0.7 + distribution_factor * 0.3) * 100

        return round(coverage_score, 2)

    def _identify_host_issues(
        self, host_recap: Dict[str, int], reliability_score: float
    ) -> List[str]:
        """Identify specific issues with a host"""
        issues = []

        if reliability_score < 80:
            issues.append("Low reliability score")

        if host_recap.get("failed", 0) > 0:
            issues.append(f"{host_recap['failed']} failed tasks")

        if host_recap.get("unreachable", 0) > 0:
            issues.append("Host unreachable")

        return issues

    def calculate_automation_trends(
        self, executions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate automation trends across multiple executions

        Args:
            executions: List of execution analysis results

        Returns:
            Trend analysis with patterns and recommendations
        """
        if not executions:
            return {"error": "No execution data provided"}

        # Extract metrics from each execution
        metrics_over_time = []
        all_modules = set()

        for execution in executions:
            summary = execution.get("execution_summary", {})
            coverage = execution.get("automation_coverage", {})

            metrics = {
                "timestamp": execution.get("metadata", {}).get("analysis_timestamp"),
                "success_rate": summary.get("success_rate", 0),
                "failure_rate": summary.get("failure_rate", 0),
                "execution_time": summary.get("execution_time_seconds", 0),
                "module_count": coverage.get("total_unique_modules", 0),
                "coverage_score": coverage.get("overall_score", 0),
            }

            metrics_over_time.append(metrics)

            # Collect all modules used
            for category_modules in coverage.get("module_categories", {}).values():
                for module_info in category_modules:
                    all_modules.add(module_info["module"])

        # Calculate trends
        trends = {
            "metrics_timeline": metrics_over_time,
            "trend_analysis": self._calculate_metric_trends(metrics_over_time),
            "module_adoption": {
                "total_unique_modules": len(all_modules),
                "modules_list": sorted(list(all_modules)),
            },
            "performance_patterns": self._identify_performance_patterns(
                metrics_over_time
            ),
            "recommendations": self._generate_trend_recommendations(metrics_over_time),
        }

        return trends

    def _calculate_metric_trends(
        self, metrics_over_time: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate trends for key metrics"""
        if len(metrics_over_time) < 2:
            return {"insufficient_data": True}

        trends = {}

        # Calculate trends for each metric
        for metric in [
            "success_rate",
            "failure_rate",
            "execution_time",
            "module_count",
            "coverage_score",
        ]:
            values = [
                m.get(metric, 0) for m in metrics_over_time if m.get(metric) is not None
            ]

            if len(values) >= 2:
                # Simple trend calculation (percentage change from first to last)
                first_value = values[0]
                last_value = values[-1]

                if first_value != 0:
                    change_percent = ((last_value - first_value) / first_value) * 100
                else:
                    change_percent = 0

                trends[metric] = {
                    "first_value": first_value,
                    "last_value": last_value,
                    "change_percent": round(change_percent, 2),
                    "trend_direction": (
                        "improving"
                        if change_percent > 0
                        else "declining" if change_percent < 0 else "stable"
                    ),
                }

        return trends

    def _identify_performance_patterns(
        self, metrics_over_time: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Identify patterns in performance metrics"""
        patterns = {"consistency": {}, "outliers": [], "correlations": {}}

        # Calculate consistency (coefficient of variation)
        for metric in ["success_rate", "execution_time"]:
            values = [
                m.get(metric, 0) for m in metrics_over_time if m.get(metric) is not None
            ]

            if len(values) >= 3:
                mean_value = sum(values) / len(values)
                variance = sum((v - mean_value) ** 2 for v in values) / len(values)
                std_dev = variance**0.5

                if mean_value > 0:
                    cv = (std_dev / mean_value) * 100
                    patterns["consistency"][metric] = {
                        "coefficient_of_variation": round(cv, 2),
                        "assessment": (
                            "consistent"
                            if cv < 10
                            else "variable" if cv < 25 else "highly_variable"
                        ),
                    }

        return patterns

    def _generate_trend_recommendations(
        self, metrics_over_time: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on trends"""
        recommendations = []

        if len(metrics_over_time) < 2:
            return recommendations

        # Analyze execution time trend
        exec_times = [m.get("execution_time", 0) for m in metrics_over_time]
        if len(exec_times) >= 2:
            recent_avg = sum(exec_times[-3:]) / len(exec_times[-3:])
            early_avg = (
                sum(exec_times[:3]) / len(exec_times[:3])
                if len(exec_times) >= 3
                else exec_times[0]
            )

            if recent_avg > early_avg * 1.2:  # 20% increase
                recommendations.append(
                    {
                        "category": "performance",
                        "priority": "medium",
                        "title": "Execution time increasing",
                        "description": "Recent playbook executions are taking longer than earlier ones.",
                        "action": "Review recent changes and optimize slow tasks.",
                    }
                )

        # Analyze success rate trend
        success_rates = [m.get("success_rate", 0) for m in metrics_over_time]
        if len(success_rates) >= 2:
            recent_avg = sum(success_rates[-3:]) / len(success_rates[-3:])

            if recent_avg < 95:  # Less than 95% success rate
                recommendations.append(
                    {
                        "category": "reliability",
                        "priority": "high",
                        "title": "Success rate declining",
                        "description": f"Recent success rate is {recent_avg:.1f}%, below recommended threshold.",
                        "action": "Investigate and fix failing tasks to improve reliability.",
                    }
                )

        return recommendations


# Service instance
ansible_service = AnsibleCoverageAnalyzer()
