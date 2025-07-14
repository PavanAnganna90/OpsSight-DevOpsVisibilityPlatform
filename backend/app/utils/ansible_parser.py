"""
Ansible Log Parser for extracting automation coverage from Ansible playbook logs.

This module provides parsing capabilities for various Ansible log formats,
extracting task results, host information, and calculating automation coverage metrics.
"""

import json
import yaml
import re
from typing import Dict, List, Optional, Any, Tuple, Union
from enum import Enum
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class AnsibleLogFormat(str, Enum):
    """Supported Ansible log formats."""

    JSON = "json"
    YAML = "yaml"
    PLAIN_TEXT = "plain_text"
    CALLBACK_JSON = "callback_json"
    AUTO_DETECT = "auto"


class TaskStatus(str, Enum):
    """Task execution status."""

    OK = "ok"
    CHANGED = "changed"
    FAILED = "failed"
    SKIPPED = "skipped"
    UNREACHABLE = "unreachable"
    IGNORED = "ignored"


class HostStatus(str, Enum):
    """Host execution status."""

    SUCCESS = "success"
    FAILED = "failed"
    UNREACHABLE = "unreachable"
    PARTIAL = "partial"


class AnsibleLogParser:
    """
    Parser for Ansible playbook execution logs.

    Supports multiple log formats and extracts comprehensive automation
    coverage data including tasks, hosts, timing, and success metrics.
    """

    # Common Ansible task modules that indicate automation coverage
    AUTOMATION_MODULES = {
        "setup",
        "gather_facts",
        "command",
        "shell",
        "script",
        "raw",
        "copy",
        "template",
        "file",
        "lineinfile",
        "blockinfile",
        "replace",
        "package",
        "yum",
        "apt",
        "dnf",
        "pip",
        "npm",
        "service",
        "systemd",
        "cron",
        "at",
        "user",
        "group",
        "authorized_key",
        "mount",
        "filesystem",
        "lvg",
        "lvol",
        "firewalld",
        "iptables",
        "ufw",
        "git",
        "subversion",
        "unarchive",
        "get_url",
        "docker_container",
        "docker_image",
        "docker_compose",
        "mysql_user",
        "mysql_db",
        "postgresql_user",
        "postgresql_db",
    }

    # Critical modules that require special attention
    CRITICAL_MODULES = {
        "command",
        "shell",
        "script",
        "raw",  # Direct system commands
        "file",
        "copy",
        "template",  # File operations
        "user",
        "group",  # User management
        "service",
        "systemd",  # Service management
        "firewalld",
        "iptables",
        "ufw",  # Security
        "mount",
        "filesystem",  # Storage operations
    }

    def __init__(self):
        """Initialize the Ansible log parser."""
        self.parsed_data = {}
        self.errors = []
        self.warnings = []

    def parse_log(
        self,
        log_content: str,
        log_format: AnsibleLogFormat = AnsibleLogFormat.AUTO_DETECT,
    ) -> Dict[str, Any]:
        """
        Parse Ansible log content and extract automation coverage data.

        Args:
            log_content (str): Raw Ansible log content
            log_format (AnsibleLogFormat): Expected log format or auto-detect

        Returns:
            Dict[str, Any]: Parsed log data with tasks, hosts, and coverage metrics
        """
        try:
            # Detect format if auto-detect is enabled
            if log_format == AnsibleLogFormat.AUTO_DETECT:
                log_format = self._detect_log_format(log_content)

            if log_format == AnsibleLogFormat.JSON:
                return self._parse_json_log(log_content)
            elif log_format == AnsibleLogFormat.YAML:
                return self._parse_yaml_log(log_content)
            elif log_format == AnsibleLogFormat.CALLBACK_JSON:
                return self._parse_callback_json_log(log_content)
            else:
                return self._parse_plain_text_log(log_content)

        except Exception as e:
            logger.error(f"Error parsing Ansible log: {e}")
            self.errors.append(f"Parsing error: {str(e)}")
            return {"error": str(e), "success": False}

    def _detect_log_format(self, log_content: str) -> AnsibleLogFormat:
        """
        Detect the format of the Ansible log.

        Args:
            log_content (str): Raw log content

        Returns:
            AnsibleLogFormat: Detected format
        """
        # Check for JSON callback format (Ansible callback plugin output)
        if (
            '"event_type"' in log_content
            and '"host"' in log_content
            and '"task"' in log_content
        ):
            return AnsibleLogFormat.CALLBACK_JSON

        # Check for standard JSON format
        try:
            json.loads(log_content)
            return AnsibleLogFormat.JSON
        except json.JSONDecodeError:
            pass

        # Check for YAML format
        try:
            yaml.safe_load(log_content)
            if "---" in log_content or "plays:" in log_content:
                return AnsibleLogFormat.YAML
        except yaml.YAMLError:
            pass

        # Check for typical Ansible playbook output patterns
        if re.search(r"PLAY \[.*\]", log_content):
            return AnsibleLogFormat.PLAIN_TEXT

        if re.search(r"TASK \[.*\]", log_content):
            return AnsibleLogFormat.PLAIN_TEXT

        # Default to plain text
        return AnsibleLogFormat.PLAIN_TEXT

    def _parse_json_log(self, log_content: str) -> Dict[str, Any]:
        """
        Parse JSON format Ansible log.

        Args:
            log_content (str): JSON log content

        Returns:
            Dict[str, Any]: Parsed data
        """
        try:
            log_data = json.loads(log_content)
            return self._process_json_data(log_data)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in Ansible log: {e}")
            self.errors.append(f"Invalid JSON: {str(e)}")
            return {"error": "Invalid JSON format", "success": False}

    def _parse_yaml_log(self, log_content: str) -> Dict[str, Any]:
        """
        Parse YAML format Ansible log.

        Args:
            log_content (str): YAML log content

        Returns:
            Dict[str, Any]: Parsed data
        """
        try:
            log_data = yaml.safe_load(log_content)
            return self._process_yaml_data(log_data)
        except yaml.YAMLError as e:
            logger.error(f"Invalid YAML in Ansible log: {e}")
            self.errors.append(f"Invalid YAML: {str(e)}")
            return {"error": "Invalid YAML format", "success": False}

    def _parse_callback_json_log(self, log_content: str) -> Dict[str, Any]:
        """
        Parse Ansible callback plugin JSON format.

        Args:
            log_content (str): Callback JSON log content

        Returns:
            Dict[str, Any]: Parsed data
        """
        try:
            # Handle multiple JSON objects (one per line)
            events = []
            for line in log_content.strip().split("\n"):
                if line.strip():
                    events.append(json.loads(line))

            return self._process_callback_events(events)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid callback JSON in Ansible log: {e}")
            self.errors.append(f"Invalid callback JSON: {str(e)}")
            return {"error": "Invalid callback JSON format", "success": False}

    def _parse_plain_text_log(self, log_content: str) -> Dict[str, Any]:
        """
        Parse plain text Ansible playbook output.

        Args:
            log_content (str): Plain text log content

        Returns:
            Dict[str, Any]: Parsed data
        """
        result = {
            "success": True,
            "format": "plain_text",
            "plays": [],
            "tasks": [],
            "hosts": {},
            "summary": {
                "total_plays": 0,
                "total_tasks": 0,
                "total_hosts": 0,
                "successful_tasks": 0,
                "failed_tasks": 0,
                "changed_tasks": 0,
                "skipped_tasks": 0,
                "unreachable_hosts": 0,
            },
            "coverage_metrics": {},
            "metadata": {
                "parsed_at": datetime.utcnow().isoformat(),
                "ansible_version": None,
                "playbook_name": None,
                "execution_time": None,
            },
            "errors": self.errors,
            "warnings": self.warnings,
        }

        lines = log_content.split("\n")
        current_play = None
        current_task = None

        for i, line in enumerate(lines):
            line = line.strip()

            # Extract Ansible version
            if "ansible-playbook" in line and not result["metadata"]["ansible_version"]:
                version_match = re.search(r"ansible-playbook\s+(\d+\.\d+\.\d+)", line)
                if version_match:
                    result["metadata"]["ansible_version"] = version_match.group(1)

            # Extract playbook name
            if line.startswith("PLAYBOOK:") and not result["metadata"]["playbook_name"]:
                result["metadata"]["playbook_name"] = line.replace(
                    "PLAYBOOK:", ""
                ).strip()

            # Parse play headers
            play_match = re.match(r"PLAY \[(.*?)\]", line)
            if play_match:
                current_play = {
                    "name": play_match.group(1),
                    "tasks": [],
                    "hosts": set(),
                }
                result["plays"].append(current_play)
                result["summary"]["total_plays"] += 1
                continue

            # Parse task headers
            task_match = re.match(r"TASK \[(.*?)\]", line)
            if task_match:
                current_task = {
                    "name": task_match.group(1),
                    "module": self._extract_module_from_task_name(task_match.group(1)),
                    "results": {},
                    "play": current_play["name"] if current_play else "unknown",
                }
                result["tasks"].append(current_task)
                if current_play:
                    current_play["tasks"].append(current_task)
                result["summary"]["total_tasks"] += 1
                continue

            # Parse task results
            if current_task:
                task_result = self._parse_task_result_line(line)
                if task_result:
                    host = task_result["host"]
                    status = task_result["status"]

                    current_task["results"][host] = task_result

                    # Update host tracking
                    if host not in result["hosts"]:
                        result["hosts"][host] = {
                            "tasks_run": 0,
                            "tasks_successful": 0,
                            "tasks_failed": 0,
                            "tasks_changed": 0,
                            "tasks_skipped": 0,
                            "status": HostStatus.SUCCESS,
                        }

                    result["hosts"][host]["tasks_run"] += 1

                    if current_play:
                        current_play["hosts"].add(host)

                    # Update counters
                    if status == TaskStatus.OK:
                        result["summary"]["successful_tasks"] += 1
                        result["hosts"][host]["tasks_successful"] += 1
                    elif status == TaskStatus.CHANGED:
                        result["summary"]["changed_tasks"] += 1
                        result["hosts"][host]["tasks_changed"] += 1
                    elif status == TaskStatus.FAILED:
                        result["summary"]["failed_tasks"] += 1
                        result["hosts"][host]["tasks_failed"] += 1
                        result["hosts"][host]["status"] = HostStatus.FAILED
                    elif status == TaskStatus.SKIPPED:
                        result["summary"]["skipped_tasks"] += 1
                        result["hosts"][host]["tasks_skipped"] += 1
                    elif status == TaskStatus.UNREACHABLE:
                        result["summary"]["unreachable_hosts"] += 1
                        result["hosts"][host]["status"] = HostStatus.UNREACHABLE

            # Parse execution summary
            if "PLAY RECAP" in line:
                recap_data = self._parse_play_recap(lines[i:])
                result["summary"].update(recap_data)
                break

        # Convert sets to lists for JSON serialization
        for play in result["plays"]:
            play["hosts"] = list(play["hosts"])

        result["summary"]["total_hosts"] = len(result["hosts"])

        # Calculate coverage metrics
        result["coverage_metrics"] = self._calculate_coverage_metrics(result)

        # Extract timing information
        result["metadata"]["execution_time"] = self._extract_execution_time(log_content)

        return result

    def _process_json_data(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process parsed JSON log data.

        Args:
            log_data (Dict[str, Any]): Parsed JSON data

        Returns:
            Dict[str, Any]: Processed data
        """
        result = {
            "success": True,
            "format": "json",
            "plays": log_data.get("plays", []),
            "tasks": [],
            "hosts": {},
            "summary": {
                "total_plays": len(log_data.get("plays", [])),
                "total_tasks": 0,
                "total_hosts": 0,
                "successful_tasks": 0,
                "failed_tasks": 0,
                "changed_tasks": 0,
                "skipped_tasks": 0,
                "unreachable_hosts": 0,
            },
            "coverage_metrics": {},
            "metadata": {
                "parsed_at": datetime.utcnow().isoformat(),
                "ansible_version": log_data.get("ansible_version"),
                "playbook_name": log_data.get("playbook"),
                "execution_time": log_data.get("duration"),
            },
            "errors": self.errors,
            "warnings": self.warnings,
        }

        # Process plays and tasks
        for play in log_data.get("plays", []):
            for task in play.get("tasks", []):
                processed_task = self._process_task_data(
                    task, play.get("name", "unknown")
                )
                result["tasks"].append(processed_task)
                result["summary"]["total_tasks"] += 1

                # Process task results for each host
                for host, task_result in task.get("hosts", {}).items():
                    if host not in result["hosts"]:
                        result["hosts"][host] = {
                            "tasks_run": 0,
                            "tasks_successful": 0,
                            "tasks_failed": 0,
                            "tasks_changed": 0,
                            "tasks_skipped": 0,
                            "status": HostStatus.SUCCESS,
                        }

                    result["hosts"][host]["tasks_run"] += 1

                    # Update counters based on task result
                    if task_result.get("changed", False):
                        result["summary"]["changed_tasks"] += 1
                        result["hosts"][host]["tasks_changed"] += 1
                    elif task_result.get("failed", False):
                        result["summary"]["failed_tasks"] += 1
                        result["hosts"][host]["tasks_failed"] += 1
                        result["hosts"][host]["status"] = HostStatus.FAILED
                    elif task_result.get("skipped", False):
                        result["summary"]["skipped_tasks"] += 1
                        result["hosts"][host]["tasks_skipped"] += 1
                    elif task_result.get("unreachable", False):
                        result["summary"]["unreachable_hosts"] += 1
                        result["hosts"][host]["status"] = HostStatus.UNREACHABLE
                    else:
                        result["summary"]["successful_tasks"] += 1
                        result["hosts"][host]["tasks_successful"] += 1

        result["summary"]["total_hosts"] = len(result["hosts"])

        # Calculate coverage metrics
        result["coverage_metrics"] = self._calculate_coverage_metrics(result)

        return result

    def _process_yaml_data(self, log_data: Any) -> Dict[str, Any]:
        """
        Process parsed YAML log data.

        Args:
            log_data: Parsed YAML data

        Returns:
            Dict[str, Any]: Processed data
        """
        # Convert YAML to JSON-like structure and process
        if isinstance(log_data, dict):
            return self._process_json_data(log_data)
        else:
            self.errors.append("YAML log format not recognized")
            return {"error": "Unrecognized YAML structure", "success": False}

    def _process_callback_events(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process Ansible callback plugin events.

        Args:
            events (List[Dict[str, Any]]): List of callback events

        Returns:
            Dict[str, Any]: Processed data
        """
        result = {
            "success": True,
            "format": "callback_json",
            "plays": [],
            "tasks": [],
            "hosts": {},
            "summary": {
                "total_plays": 0,
                "total_tasks": 0,
                "total_hosts": 0,
                "successful_tasks": 0,
                "failed_tasks": 0,
                "changed_tasks": 0,
                "skipped_tasks": 0,
                "unreachable_hosts": 0,
            },
            "coverage_metrics": {},
            "metadata": {
                "parsed_at": datetime.utcnow().isoformat(),
                "ansible_version": None,
                "playbook_name": None,
                "execution_time": None,
            },
            "errors": self.errors,
            "warnings": self.warnings,
        }

        current_play = None
        start_time = None
        end_time = None

        for event in events:
            event_type = event.get("event_type")
            timestamp = event.get("timestamp")

            if not start_time and timestamp:
                start_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            if timestamp:
                end_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

            if event_type == "playbook_on_start":
                result["metadata"]["playbook_name"] = event.get("playbook", "unknown")

            elif event_type == "playbook_on_play_start":
                current_play = {
                    "name": event.get("play", {}).get("name", "unknown"),
                    "tasks": [],
                    "hosts": set(),
                }
                result["plays"].append(current_play)
                result["summary"]["total_plays"] += 1

            elif event_type == "playbook_on_task_start":
                task = {
                    "name": event.get("task", {}).get("name", "unknown"),
                    "module": event.get("task", {}).get("action", "unknown"),
                    "results": {},
                    "play": current_play["name"] if current_play else "unknown",
                }
                result["tasks"].append(task)
                if current_play:
                    current_play["tasks"].append(task)
                result["summary"]["total_tasks"] += 1

            elif event_type in [
                "runner_on_ok",
                "runner_on_changed",
                "runner_on_failed",
                "runner_on_skipped",
                "runner_on_unreachable",
            ]:
                host = event.get("host", "unknown")
                task_result = event.get("result", {})

                # Find the current task
                if result["tasks"]:
                    current_task = result["tasks"][-1]

                    status = self._map_event_to_status(event_type)
                    current_task["results"][host] = {
                        "host": host,
                        "status": status,
                        "changed": task_result.get("changed", False),
                        "failed": task_result.get("failed", False),
                        "skipped": task_result.get("skipped", False),
                        "unreachable": event_type == "runner_on_unreachable",
                        "message": task_result.get("msg", ""),
                        "duration": task_result.get("delta", 0),
                    }

                    # Update host tracking
                    if host not in result["hosts"]:
                        result["hosts"][host] = {
                            "tasks_run": 0,
                            "tasks_successful": 0,
                            "tasks_failed": 0,
                            "tasks_changed": 0,
                            "tasks_skipped": 0,
                            "status": HostStatus.SUCCESS,
                        }

                    result["hosts"][host]["tasks_run"] += 1

                    if current_play:
                        current_play["hosts"].add(host)

                    # Update counters
                    if status == TaskStatus.OK:
                        result["summary"]["successful_tasks"] += 1
                        result["hosts"][host]["tasks_successful"] += 1
                    elif status == TaskStatus.CHANGED:
                        result["summary"]["changed_tasks"] += 1
                        result["hosts"][host]["tasks_changed"] += 1
                    elif status == TaskStatus.FAILED:
                        result["summary"]["failed_tasks"] += 1
                        result["hosts"][host]["tasks_failed"] += 1
                        result["hosts"][host]["status"] = HostStatus.FAILED
                    elif status == TaskStatus.SKIPPED:
                        result["summary"]["skipped_tasks"] += 1
                        result["hosts"][host]["tasks_skipped"] += 1
                    elif status == TaskStatus.UNREACHABLE:
                        result["summary"]["unreachable_hosts"] += 1
                        result["hosts"][host]["status"] = HostStatus.UNREACHABLE

        # Convert sets to lists for JSON serialization
        for play in result["plays"]:
            play["hosts"] = list(play["hosts"])

        result["summary"]["total_hosts"] = len(result["hosts"])

        # Calculate execution time
        if start_time and end_time:
            duration = (end_time - start_time).total_seconds()
            result["metadata"]["execution_time"] = duration

        # Calculate coverage metrics
        result["coverage_metrics"] = self._calculate_coverage_metrics(result)

        return result

    def _extract_module_from_task_name(self, task_name: str) -> str:
        """
        Extract Ansible module name from task name.

        Args:
            task_name (str): Task name

        Returns:
            str: Module name or 'unknown'
        """
        # Common patterns for module extraction
        for module in self.AUTOMATION_MODULES:
            if module in task_name.lower():
                return module

        # Try to extract from task name patterns
        if ":" in task_name:
            potential_module = task_name.split(":")[0].strip().lower()
            if potential_module in self.AUTOMATION_MODULES:
                return potential_module

        return "unknown"

    def _parse_task_result_line(self, line: str) -> Optional[Dict[str, Any]]:
        """
        Parse a task result line from plain text output.

        Args:
            line (str): Log line

        Returns:
            Optional[Dict[str, Any]]: Parsed task result or None
        """
        # Pattern for task results: "ok: [hostname]", "changed: [hostname]", etc.
        result_pattern = (
            r"^(ok|changed|failed|skipped|unreachable|ignored):\s*\[([^\]]+)\]"
        )
        match = re.match(result_pattern, line)

        if match:
            status_str = match.group(1)
            host = match.group(2)

            # Map status string to enum
            status_map = {
                "ok": TaskStatus.OK,
                "changed": TaskStatus.CHANGED,
                "failed": TaskStatus.FAILED,
                "skipped": TaskStatus.SKIPPED,
                "unreachable": TaskStatus.UNREACHABLE,
                "ignored": TaskStatus.IGNORED,
            }

            return {
                "host": host,
                "status": status_map.get(status_str, TaskStatus.OK),
                "changed": status_str == "changed",
                "failed": status_str == "failed",
                "skipped": status_str == "skipped",
                "unreachable": status_str == "unreachable",
                "message": line,
                "duration": None,
            }

        return None

    def _parse_play_recap(self, lines: List[str]) -> Dict[str, Any]:
        """
        Parse the PLAY RECAP section for summary statistics.

        Args:
            lines (List[str]): Lines starting from PLAY RECAP

        Returns:
            Dict[str, Any]: Summary statistics
        """
        recap_data = {
            "hosts_summary": {},
            "total_ok": 0,
            "total_changed": 0,
            "total_unreachable": 0,
            "total_failed": 0,
            "total_skipped": 0,
            "total_rescued": 0,
            "total_ignored": 0,
        }

        for line in lines[1:]:  # Skip the "PLAY RECAP" line
            if not line.strip():
                break

            # Pattern: "hostname : ok=2 changed=1 unreachable=0 failed=0 skipped=0 rescued=0 ignored=0"
            recap_pattern = r"^([^:]+)\s*:\s*ok=(\d+)\s+changed=(\d+)\s+unreachable=(\d+)\s+failed=(\d+)\s+skipped=(\d+)\s+rescued=(\d+)\s+ignored=(\d+)"
            match = re.match(recap_pattern, line.strip())

            if match:
                host = match.group(1).strip()
                ok = int(match.group(2))
                changed = int(match.group(3))
                unreachable = int(match.group(4))
                failed = int(match.group(5))
                skipped = int(match.group(6))
                rescued = int(match.group(7))
                ignored = int(match.group(8))

                recap_data["hosts_summary"][host] = {
                    "ok": ok,
                    "changed": changed,
                    "unreachable": unreachable,
                    "failed": failed,
                    "skipped": skipped,
                    "rescued": rescued,
                    "ignored": ignored,
                }

                # Add to totals
                recap_data["total_ok"] += ok
                recap_data["total_changed"] += changed
                recap_data["total_unreachable"] += unreachable
                recap_data["total_failed"] += failed
                recap_data["total_skipped"] += skipped
                recap_data["total_rescued"] += rescued
                recap_data["total_ignored"] += ignored

        return recap_data

    def _process_task_data(
        self, task: Dict[str, Any], play_name: str
    ) -> Dict[str, Any]:
        """
        Process task data from JSON/YAML format.

        Args:
            task (Dict[str, Any]): Task data
            play_name (str): Name of the play

        Returns:
            Dict[str, Any]: Processed task data
        """
        return {
            "name": task.get("name", "unknown"),
            "module": task.get("action", "unknown"),
            "results": task.get("hosts", {}),
            "play": play_name,
        }

    def _map_event_to_status(self, event_type: str) -> TaskStatus:
        """
        Map callback event type to task status.

        Args:
            event_type (str): Callback event type

        Returns:
            TaskStatus: Mapped status
        """
        event_map = {
            "runner_on_ok": TaskStatus.OK,
            "runner_on_changed": TaskStatus.CHANGED,
            "runner_on_failed": TaskStatus.FAILED,
            "runner_on_skipped": TaskStatus.SKIPPED,
            "runner_on_unreachable": TaskStatus.UNREACHABLE,
        }
        return event_map.get(event_type, TaskStatus.OK)

    def _extract_execution_time(self, log_content: str) -> Optional[float]:
        """
        Extract execution time from log content.

        Args:
            log_content (str): Log content

        Returns:
            Optional[float]: Execution time in seconds
        """
        # Look for timing patterns in the log
        time_patterns = [
            r"Playbook run took (\d+) days, (\d+) hours, (\d+) minutes, ([\d.]+) seconds",
            r"real\s+(\d+)m([\d.]+)s",
            r"elapsed:\s*([\d.]+)s",
            r"duration:\s*([\d.]+)",
        ]

        for pattern in time_patterns:
            match = re.search(pattern, log_content)
            if match:
                if len(match.groups()) == 4:  # Days, hours, minutes, seconds
                    days = int(match.group(1))
                    hours = int(match.group(2))
                    minutes = int(match.group(3))
                    seconds = float(match.group(4))
                    return days * 86400 + hours * 3600 + minutes * 60 + seconds
                elif len(match.groups()) == 2:  # Minutes and seconds
                    minutes = int(match.group(1))
                    seconds = float(match.group(2))
                    return minutes * 60 + seconds
                else:  # Just seconds
                    return float(match.group(1))

        return None

    def _calculate_coverage_metrics(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate automation coverage metrics.

        Args:
            result (Dict[str, Any]): Parsed result data

        Returns:
            Dict[str, Any]: Coverage metrics
        """
        total_tasks = result["summary"]["total_tasks"]
        total_hosts = result["summary"]["total_hosts"]
        successful_tasks = result["summary"]["successful_tasks"]
        changed_tasks = result["summary"]["changed_tasks"]
        failed_tasks = result["summary"]["failed_tasks"]

        # Calculate success rates
        task_success_rate = 0.0
        if total_tasks > 0:
            task_success_rate = ((successful_tasks + changed_tasks) / total_tasks) * 100

        host_success_rate = 0.0
        successful_hosts = sum(
            1
            for host_data in result["hosts"].values()
            if host_data["status"] in [HostStatus.SUCCESS, HostStatus.PARTIAL]
        )
        if total_hosts > 0:
            host_success_rate = (successful_hosts / total_hosts) * 100

        # Calculate automation coverage
        automation_tasks = 0
        critical_tasks = 0

        for task in result["tasks"]:
            module = task.get("module", "unknown")
            if module in self.AUTOMATION_MODULES:
                automation_tasks += 1
            if module in self.CRITICAL_MODULES:
                critical_tasks += 1

        automation_coverage = 0.0
        if total_tasks > 0:
            automation_coverage = (automation_tasks / total_tasks) * 100

        critical_coverage = 0.0
        if automation_tasks > 0:
            critical_coverage = (critical_tasks / automation_tasks) * 100

        # Calculate overall automation score
        automation_score = (
            task_success_rate * 0.4
            + host_success_rate * 0.3
            + automation_coverage * 0.2
            + critical_coverage * 0.1
        )

        return {
            "task_success_rate": round(task_success_rate, 2),
            "host_success_rate": round(host_success_rate, 2),
            "automation_coverage": round(automation_coverage, 2),
            "critical_coverage": round(critical_coverage, 2),
            "automation_score": round(automation_score, 2),
            "total_automation_tasks": automation_tasks,
            "total_critical_tasks": critical_tasks,
            "coverage_by_module": self._calculate_module_coverage(result),
            "host_coverage": self._calculate_host_coverage(result),
        }

    def _calculate_module_coverage(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate coverage metrics by module.

        Args:
            result (Dict[str, Any]): Parsed result data

        Returns:
            Dict[str, Any]: Module coverage metrics
        """
        module_stats = {}

        for task in result["tasks"]:
            module = task.get("module", "unknown")
            if module not in module_stats:
                module_stats[module] = {
                    "total_tasks": 0,
                    "successful_tasks": 0,
                    "failed_tasks": 0,
                    "changed_tasks": 0,
                    "hosts_affected": set(),
                }

            module_stats[module]["total_tasks"] += 1

            for host, task_result in task.get("results", {}).items():
                module_stats[module]["hosts_affected"].add(host)

                if task_result.get("status") == TaskStatus.OK:
                    module_stats[module]["successful_tasks"] += 1
                elif task_result.get("status") == TaskStatus.CHANGED:
                    module_stats[module]["changed_tasks"] += 1
                elif task_result.get("status") == TaskStatus.FAILED:
                    module_stats[module]["failed_tasks"] += 1

        # Convert sets to counts and calculate success rates
        for module, stats in module_stats.items():
            stats["hosts_affected"] = len(stats["hosts_affected"])
            total = stats["total_tasks"]
            if total > 0:
                stats["success_rate"] = (
                    (stats["successful_tasks"] + stats["changed_tasks"]) / total
                ) * 100
            else:
                stats["success_rate"] = 0.0

        return module_stats

    def _calculate_host_coverage(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate coverage metrics by host.

        Args:
            result (Dict[str, Any]): Parsed result data

        Returns:
            Dict[str, Any]: Host coverage metrics
        """
        host_coverage = {}

        for host, host_data in result["hosts"].items():
            total_tasks = host_data["tasks_run"]
            successful_tasks = (
                host_data["tasks_successful"] + host_data["tasks_changed"]
            )

            success_rate = 0.0
            if total_tasks > 0:
                success_rate = (successful_tasks / total_tasks) * 100

            host_coverage[host] = {
                "total_tasks": total_tasks,
                "success_rate": round(success_rate, 2),
                "status": host_data["status"],
                "automation_score": round(
                    success_rate * 0.8
                    + (20 if host_data["status"] == HostStatus.SUCCESS else 0),
                    2,
                ),
            }

        return host_coverage
