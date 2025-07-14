"""
Terraform Logs Parser and Analysis Service

This service handles parsing and analyzing Terraform execution logs, plan outputs,
and state changes to provide detailed insights into infrastructure modifications.
"""

import json
import re
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum

from fastapi import HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class TerraformActionType(str, Enum):
    """Terraform action types from logs"""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    REPLACE = "replace"
    NO_OP = "no-op"
    READ = "read"
    IMPORT = "import"


class TerraformLogLevel(str, Enum):
    """Terraform log levels"""

    INFO = "info"
    WARN = "warn"
    ERROR = "error"
    DEBUG = "debug"


class TerraformMessageType(str, Enum):
    """Terraform UI message types"""

    VERSION = "version"
    PLANNED_CHANGE = "planned_change"
    RESOURCE_DRIFT = "resource_drift"
    CHANGE_SUMMARY = "change_summary"
    APPLY_START = "apply_start"
    APPLY_COMPLETE = "apply_complete"
    PROVISION_PROGRESS = "provision_progress"
    OUTPUTS = "outputs"
    DIAGNOSTIC = "diagnostic"


@dataclass
class TerraformResource:
    """Represents a Terraform resource"""

    address: str
    module: str = ""
    resource_type: str = ""
    resource_name: str = ""
    resource_key: Optional[Union[str, int]] = None
    implied_provider: str = ""


@dataclass
class TerraformChange:
    """Represents a change to a Terraform resource"""

    resource: TerraformResource
    action: TerraformActionType
    reason: Optional[str] = None
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None
    after_unknown: Optional[Dict[str, Any]] = None
    before_sensitive: Optional[Dict[str, Any]] = None
    after_sensitive: Optional[Dict[str, Any]] = None
    replace_paths: List[List[str]] = field(default_factory=list)


@dataclass
class TerraformLogEntry:
    """Represents a single Terraform log entry"""

    timestamp: datetime
    level: TerraformLogLevel
    message: str
    module: str = "terraform.ui"
    message_type: Optional[TerraformMessageType] = None
    change: Optional[TerraformChange] = None
    raw_data: Optional[Dict[str, Any]] = None


@dataclass
class TerraformExecutionSummary:
    """Summary of a Terraform execution"""

    operation: str  # plan, apply, destroy
    total_changes: int = 0
    add_count: int = 0
    change_count: int = 0
    remove_count: int = 0
    duration_seconds: Optional[float] = None
    succeeded: bool = True
    error_count: int = 0
    warning_count: int = 0


class TerraformLogParser:
    """Parser for Terraform logs and output"""

    def __init__(self):
        self.log_entries: List[TerraformLogEntry] = []
        self.changes: List[TerraformChange] = []
        self.summary: Optional[TerraformExecutionSummary] = None

    def parse_json_logs(self, log_content: str) -> List[TerraformLogEntry]:
        """
        Parse Terraform JSON-formatted logs (from terraform apply -json)

        Args:
            log_content: Raw log content with JSON lines

        Returns:
            List of parsed log entries
        """
        entries = []

        for line_num, line in enumerate(log_content.strip().split("\n"), 1):
            if not line.strip():
                continue

            try:
                log_data = json.loads(line)
                entry = self._parse_json_log_entry(log_data)
                if entry:
                    entries.append(entry)

            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON log line {line_num}: {e}")
                # Try to extract basic info from malformed line
                entry = self._parse_fallback_log_entry(line, line_num)
                if entry:
                    entries.append(entry)

        self.log_entries = entries
        self._extract_summary()
        return entries

    def _parse_json_log_entry(
        self, log_data: Dict[str, Any]
    ) -> Optional[TerraformLogEntry]:
        """Parse a single JSON log entry"""
        try:
            # Extract basic fields
            timestamp_str = log_data.get("@timestamp", "")
            timestamp = self._parse_timestamp(timestamp_str)

            level = TerraformLogLevel(log_data.get("@level", "info"))
            message = log_data.get("@message", "")
            module = log_data.get("@module", "terraform.ui")

            # Determine message type
            message_type = None
            msg_type_str = log_data.get("type")
            if msg_type_str:
                try:
                    message_type = TerraformMessageType(msg_type_str)
                except ValueError:
                    logger.debug(f"Unknown message type: {msg_type_str}")

            # Parse change information if present
            change = None
            if "change" in log_data:
                change = self._parse_change_data(log_data["change"])
            elif "hook" in log_data and "resource" in log_data["hook"]:
                # Apply start/complete events
                change = self._parse_hook_data(log_data["hook"])

            return TerraformLogEntry(
                timestamp=timestamp,
                level=level,
                message=message,
                module=module,
                message_type=message_type,
                change=change,
                raw_data=log_data,
            )

        except Exception as e:
            logger.error(f"Error parsing log entry: {e}")
            return None

    def _parse_change_data(
        self, change_data: Dict[str, Any]
    ) -> Optional[TerraformChange]:
        """Parse change data from log entry"""
        try:
            # Parse resource info
            resource_data = change_data.get("resource", {})
            resource = TerraformResource(
                address=resource_data.get("addr", ""),
                module=resource_data.get("module", ""),
                resource_type=resource_data.get("resource_type", ""),
                resource_name=resource_data.get("resource_name", ""),
                resource_key=resource_data.get("resource_key"),
                implied_provider=resource_data.get("implied_provider", ""),
            )

            # Parse action
            action_str = change_data.get("action", "no-op")
            try:
                action = TerraformActionType(action_str)
            except ValueError:
                # Handle complex actions like ["delete", "create"]
                if isinstance(action_str, list):
                    if "delete" in action_str and "create" in action_str:
                        action = TerraformActionType.REPLACE
                    else:
                        action = TerraformActionType(action_str[0])
                else:
                    action = TerraformActionType.NO_OP

            return TerraformChange(
                resource=resource,
                action=action,
                reason=change_data.get("action_reason"),
                before=change_data.get("before"),
                after=change_data.get("after"),
                after_unknown=change_data.get("after_unknown"),
                before_sensitive=change_data.get("before_sensitive"),
                after_sensitive=change_data.get("after_sensitive"),
                replace_paths=change_data.get("replace_paths", []),
            )

        except Exception as e:
            logger.error(f"Error parsing change data: {e}")
            return None

    def _parse_hook_data(self, hook_data: Dict[str, Any]) -> Optional[TerraformChange]:
        """Parse hook data from apply start/complete events"""
        try:
            resource_data = hook_data.get("resource", {})
            resource = TerraformResource(
                address=resource_data.get("addr", ""),
                module=resource_data.get("module", ""),
                resource_type=resource_data.get("resource_type", ""),
                resource_name=resource_data.get("resource_name", ""),
                resource_key=resource_data.get("resource_key"),
                implied_provider=resource_data.get("implied_provider", ""),
            )

            action_str = hook_data.get("action", "no-op")
            try:
                action = TerraformActionType(action_str)
            except ValueError:
                action = TerraformActionType.NO_OP

            return TerraformChange(resource=resource, action=action)

        except Exception as e:
            logger.error(f"Error parsing hook data: {e}")
            return None

    def _parse_fallback_log_entry(
        self, line: str, line_num: int
    ) -> Optional[TerraformLogEntry]:
        """Parse non-JSON log lines as fallback"""
        # Try to extract timestamp and level
        timestamp_match = re.match(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})", line)
        timestamp = datetime.now()
        if timestamp_match:
            try:
                timestamp = datetime.fromisoformat(timestamp_match.group(1))
            except ValueError:
                pass

        # Determine level from content
        level = TerraformLogLevel.INFO
        if "error" in line.lower():
            level = TerraformLogLevel.ERROR
        elif "warn" in line.lower():
            level = TerraformLogLevel.WARN

        return TerraformLogEntry(
            timestamp=timestamp,
            level=level,
            message=line.strip(),
            module="terraform.fallback",
        )

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string to datetime object"""
        if not timestamp_str:
            return datetime.now()

        try:
            # Handle various timestamp formats
            # 2021-05-25T13:32:41.705503-04:00
            if "T" in timestamp_str:
                # Remove timezone info for simplicity
                clean_timestamp = re.sub(r"([+-]\d{2}:\d{2})$", "", timestamp_str)
                clean_timestamp = re.sub(r"\.\d+", "", clean_timestamp)
                return datetime.fromisoformat(clean_timestamp)
            else:
                return datetime.fromisoformat(timestamp_str)
        except ValueError:
            logger.warning(f"Failed to parse timestamp: {timestamp_str}")
            return datetime.now()

    def _extract_summary(self) -> None:
        """Extract execution summary from parsed logs"""
        operation = "unknown"
        add_count = 0
        change_count = 0
        remove_count = 0
        error_count = 0
        warning_count = 0
        succeeded = True

        start_time = None
        end_time = None

        for entry in self.log_entries:
            # Count errors and warnings
            if entry.level == TerraformLogLevel.ERROR:
                error_count += 1
                succeeded = False
            elif entry.level == TerraformLogLevel.WARN:
                warning_count += 1

            # Extract operation type and counts from change summary
            if entry.message_type == TerraformMessageType.CHANGE_SUMMARY:
                if entry.raw_data and "changes" in entry.raw_data:
                    changes = entry.raw_data["changes"]
                    add_count = changes.get("add", 0)
                    change_count = changes.get("change", 0)
                    remove_count = changes.get("remove", 0)
                    operation = changes.get("operation", "unknown")

            # Track timing
            if not start_time:
                start_time = entry.timestamp
            end_time = entry.timestamp

        # Calculate duration
        duration_seconds = None
        if start_time and end_time:
            duration_seconds = (end_time - start_time).total_seconds()

        self.summary = TerraformExecutionSummary(
            operation=operation,
            total_changes=add_count + change_count + remove_count,
            add_count=add_count,
            change_count=change_count,
            remove_count=remove_count,
            duration_seconds=duration_seconds,
            succeeded=succeeded,
            error_count=error_count,
            warning_count=warning_count,
        )

    def parse_plan_file(self, plan_content: str) -> Dict[str, Any]:
        """
        Parse Terraform plan JSON output

        Args:
            plan_content: JSON content from terraform show -json plan_file

        Returns:
            Parsed plan data
        """
        try:
            plan_data = json.loads(plan_content)

            # Extract resource changes
            resource_changes = plan_data.get("resource_changes", [])
            changes = []

            for change_data in resource_changes:
                resource = TerraformResource(
                    address=change_data.get("address", ""),
                    module=change_data.get("module_address", ""),
                    resource_type=change_data.get("type", ""),
                    resource_name=change_data.get("name", ""),
                )

                change_info = change_data.get("change", {})
                actions = change_info.get("actions", ["no-op"])

                # Determine primary action
                if "create" in actions and "delete" in actions:
                    action = TerraformActionType.REPLACE
                elif "create" in actions:
                    action = TerraformActionType.CREATE
                elif "update" in actions:
                    action = TerraformActionType.UPDATE
                elif "delete" in actions:
                    action = TerraformActionType.DELETE
                else:
                    action = TerraformActionType.NO_OP

                change = TerraformChange(
                    resource=resource,
                    action=action,
                    before=change_info.get("before"),
                    after=change_info.get("after"),
                    after_unknown=change_info.get("after_unknown"),
                    before_sensitive=change_info.get("before_sensitive"),
                    after_sensitive=change_info.get("after_sensitive"),
                    replace_paths=change_info.get("replace_paths", []),
                )

                changes.append(change)

            self.changes = changes
            return plan_data

        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid JSON in plan file: {e}"
            )

    def get_changes_by_module(self) -> Dict[str, List[TerraformChange]]:
        """Group changes by Terraform module"""
        changes_by_module = {}

        for entry in self.log_entries:
            if entry.change:
                module = entry.change.resource.module or "root"
                if module not in changes_by_module:
                    changes_by_module[module] = []
                changes_by_module[module].append(entry.change)

        # Also include changes from plan parsing
        for change in self.changes:
            module = change.resource.module or "root"
            if module not in changes_by_module:
                changes_by_module[module] = []
            if change not in changes_by_module[module]:
                changes_by_module[module].append(change)

        return changes_by_module

    def get_changes_by_resource_type(self) -> Dict[str, List[TerraformChange]]:
        """Group changes by resource type"""
        changes_by_type = {}

        all_changes = []
        all_changes.extend([entry.change for entry in self.log_entries if entry.change])
        all_changes.extend(self.changes)

        for change in all_changes:
            resource_type = change.resource.resource_type
            if resource_type not in changes_by_type:
                changes_by_type[resource_type] = []
            if change not in changes_by_type[resource_type]:
                changes_by_type[resource_type].append(change)

        return changes_by_type

    def get_failed_resources(self) -> List[TerraformLogEntry]:
        """Get log entries for failed resource operations"""
        failed_entries = []

        for entry in self.log_entries:
            if entry.level == TerraformLogLevel.ERROR:
                failed_entries.append(entry)

        return failed_entries


class TerraformService:
    """Service for Terraform log analysis and parsing"""

    def __init__(self):
        self.parser = TerraformLogParser()

    async def parse_terraform_logs(
        self, log_content: str, log_format: str = "json"
    ) -> Dict[str, Any]:
        """
        Parse Terraform logs and return analysis

        Args:
            log_content: Raw log content
            log_format: Format of logs ("json" or "text")

        Returns:
            Parsed log analysis
        """
        try:
            if log_format == "json":
                entries = self.parser.parse_json_logs(log_content)
            else:
                # For text logs, try to parse as JSON first, then fallback
                try:
                    entries = self.parser.parse_json_logs(log_content)
                except:
                    # Parse as plain text
                    entries = []
                    for i, line in enumerate(log_content.split("\n")):
                        if line.strip():
                            entry = self.parser._parse_fallback_log_entry(line, i + 1)
                            if entry:
                                entries.append(entry)
                    self.parser.log_entries = entries
                    self.parser._extract_summary()

            return {
                "summary": (
                    self.parser.summary.__dict__ if self.parser.summary else None
                ),
                "total_entries": len(entries),
                "changes_by_module": self.parser.get_changes_by_module(),
                "changes_by_type": self.parser.get_changes_by_resource_type(),
                "failed_resources": [
                    entry.__dict__ for entry in self.parser.get_failed_resources()
                ],
                "entries": [
                    entry.__dict__ for entry in entries[:100]
                ],  # Limit for performance
            }

        except Exception as e:
            logger.error(f"Error parsing Terraform logs: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to parse Terraform logs: {str(e)}"
            )

    async def parse_terraform_plan(self, plan_content: str) -> Dict[str, Any]:
        """
        Parse Terraform plan file

        Args:
            plan_content: JSON content from terraform show -json

        Returns:
            Parsed plan analysis
        """
        try:
            plan_data = self.parser.parse_plan_file(plan_content)

            return {
                "plan_metadata": {
                    "format_version": plan_data.get("format_version"),
                    "applyable": plan_data.get("applyable", False),
                    "complete": plan_data.get("complete", False),
                    "errored": plan_data.get("errored", False),
                },
                "changes_summary": {
                    "total_changes": len(self.parser.changes),
                    "by_action": self._summarize_changes_by_action(),
                    "by_module": self.parser.get_changes_by_module(),
                    "by_type": self.parser.get_changes_by_resource_type(),
                },
                "resource_changes": [change.__dict__ for change in self.parser.changes],
                "configuration": plan_data.get("configuration", {}),
                "planned_values": plan_data.get("planned_values", {}),
                "variables": plan_data.get("variables", {}),
            }

        except Exception as e:
            logger.error(f"Error parsing Terraform plan: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to parse Terraform plan: {str(e)}"
            )

    def _summarize_changes_by_action(self) -> Dict[str, int]:
        """Summarize changes by action type"""
        summary = {}
        for change in self.parser.changes:
            action = change.action.value
            summary[action] = summary.get(action, 0) + 1
        return summary


# Initialize service instance
terraform_service = TerraformService()
