"""
Terraform Log Parser for extracting infrastructure changes from Terraform logs.

This module provides parsing capabilities for both human-readable and JSON Terraform logs,
extracting resource changes, organizing by modules, and calculating risk levels.
"""

import json
import re
from typing import Dict, List, Optional, Any, Tuple, Union
from enum import Enum
from datetime import datetime
import logging

from .risk_assessor import InfrastructureRiskAssessor, RiskAssessment

logger = logging.getLogger(__name__)


class LogFormat(str, Enum):
    """Supported Terraform log formats."""

    HUMAN_READABLE = "human"
    JSON = "json"
    AUTO_DETECT = "auto"


class RiskLevel(str, Enum):
    """Risk level enumeration for infrastructure changes."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TerraformLogParser:
    """
    Parser for Terraform plan and apply logs.

    Supports both human-readable and JSON formats, extracts resource changes,
    organizes by modules, and calculates risk levels.
    """

    # High-risk resource types that require careful handling
    HIGH_RISK_RESOURCES = {
        "aws_iam_role",
        "aws_iam_policy",
        "aws_iam_user",
        "aws_iam_group",
        "aws_security_group",
        "aws_vpc",
        "aws_subnet",
        "aws_route_table",
        "aws_db_instance",
        "aws_rds_cluster",
        "aws_elasticache_cluster",
        "aws_s3_bucket",
        "aws_kms_key",
        "aws_lambda_function",
        "azurerm_resource_group",
        "azurerm_virtual_network",
        "azurerm_sql_database",
        "google_compute_instance",
        "google_sql_database_instance",
        "google_storage_bucket",
    }

    # Critical resource types that should always require approval
    CRITICAL_RESOURCES = {
        "aws_iam_policy_attachment",
        "aws_iam_role_policy_attachment",
        "aws_vpc_dhcp_options_association",
        "aws_route",
        "aws_nat_gateway",
        "azurerm_role_assignment",
        "azurerm_network_security_rule",
        "google_project_iam_binding",
        "google_compute_firewall",
    }

    def __init__(self, risk_config: Optional[Dict[str, Any]] = None):
        """
        Initialize the Terraform log parser.

        Args:
            risk_config: Optional configuration for risk assessment
        """
        self.parsed_data = {}
        self.errors = []
        self.risk_assessor = InfrastructureRiskAssessor(risk_config)

    def parse_log(
        self, log_content: str, log_format: LogFormat = LogFormat.AUTO_DETECT
    ) -> Dict[str, Any]:
        """
        Parse Terraform log content and extract infrastructure changes.

        Args:
            log_content (str): Raw Terraform log content
            log_format (LogFormat): Expected log format or auto-detect

        Returns:
            Dict[str, Any]: Parsed log data with resources, modules, and metadata
        """
        try:
            # Detect format if auto-detect is enabled
            if log_format == LogFormat.AUTO_DETECT:
                log_format = self._detect_log_format(log_content)

            if log_format == LogFormat.JSON:
                return self._parse_json_log(log_content)
            else:
                return self._parse_human_readable_log(log_content)

        except Exception as e:
            logger.error(f"Error parsing Terraform log: {e}")
            self.errors.append(f"Parsing error: {str(e)}")
            result = {
                "success": False,
                "format": "unknown",
                "terraform_version": None,
                "resource_changes": [],
                "modules": {},
                "summary": {},
                "risk_assessment": {},
                "metadata": {},
                "error": str(e),
            }
            for key, value in result.items():
                if hasattr(value, "name") and hasattr(value, "value"):
                    result[key] = value.value  # Convert Enum to string
                elif isinstance(value, dict):
                    for k, v in value.items():
                        if hasattr(v, "name") and hasattr(v, "value"):
                            value[k] = v.value
            return result

    def _detect_log_format(self, log_content: str) -> LogFormat:
        """
        Detect the format of the Terraform log.

        Args:
            log_content (str): Raw log content

        Returns:
            LogFormat: Detected format
        """
        # Check if it's JSON by looking for JSON plan structure
        if '"terraform_version"' in log_content and '"resource_changes"' in log_content:
            return LogFormat.JSON

        # Check for typical Terraform plan output patterns
        if "Terraform will perform the following actions:" in log_content:
            return LogFormat.HUMAN_READABLE

        if re.search(r'^\s*[~+-]\s+resource\s+"', log_content, re.MULTILINE):
            return LogFormat.HUMAN_READABLE

        # Default to human-readable if unclear
        return LogFormat.HUMAN_READABLE

    def _parse_json_log(self, log_content: str) -> Dict[str, Any]:
        """
        Parse JSON format Terraform plan.

        Args:
            log_content (str): JSON log content

        Returns:
            Dict[str, Any]: Parsed data
        """
        try:
            plan_data = json.loads(log_content)
            return self._process_json_plan(plan_data)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in Terraform log: {e}")
            self.errors.append(f"Invalid JSON: {str(e)}")
            result = {
                "success": False,
                "format": "unknown",
                "terraform_version": None,
                "resource_changes": [],
                "modules": {},
                "summary": {},
                "risk_assessment": {},
                "metadata": {},
                "error": "Invalid JSON format",
            }
            for key, value in result.items():
                if hasattr(value, "name") and hasattr(value, "value"):
                    result[key] = value.value  # Convert Enum to string
                elif isinstance(value, dict):
                    for k, v in value.items():
                        if hasattr(v, "name") and hasattr(v, "value"):
                            value[k] = v.value
            return result

    def _process_json_plan(self, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process parsed JSON plan data.

        Args:
            plan_data (Dict[str, Any]): Parsed JSON plan

        Returns:
            Dict[str, Any]: Processed plan data
        """
        result = {
            "success": True,
            "format": "json",
            "terraform_version": plan_data.get("terraform_version"),
            "planned_values": plan_data.get("planned_values", {}),
            "resource_changes": [],
            "modules": {},
            "summary": {
                "total_changes": 0,
                "resources_to_add": 0,
                "resources_to_change": 0,
                "resources_to_destroy": 0,
            },
            "risk_assessment": {"overall_risk": RiskLevel.LOW, "high_risk_changes": []},
            "metadata": {
                "parsed_at": datetime.utcnow().isoformat(),
                "total_resources": 0,
            },
        }

        # Process resource changes
        resource_changes = plan_data.get("resource_changes", [])
        for change in resource_changes:
            processed_change = self._process_resource_change(change)
            result["resource_changes"].append(processed_change)

            # Update summary counters
            actions = change.get("change", {}).get("actions", [])
            if "create" in actions:
                result["summary"]["resources_to_add"] += 1
            if "update" in actions:
                result["summary"]["resources_to_change"] += 1
            if "delete" in actions:
                result["summary"]["resources_to_destroy"] += 1

            result["summary"]["total_changes"] += 1

            # Organize by modules
            module_address = processed_change["module"]
            if module_address not in result["modules"]:
                result["modules"][module_address] = {
                    "resources": [],
                    "risk_level": RiskLevel.LOW,
                    "change_count": 0,
                }

            result["modules"][module_address]["resources"].append(processed_change)
            result["modules"][module_address]["change_count"] += 1

        # Calculate risk assessment
        result["risk_assessment"] = self._calculate_risk_assessment(
            result["resource_changes"]
        )

        # Update module risk levels
        for module_address, module_data in result["modules"].items():
            module_data["risk_level"] = self._calculate_module_risk(
                module_data["resources"]
            )

        result["metadata"]["total_resources"] = len(resource_changes)

        for key, value in result.items():
            if hasattr(value, "name") and hasattr(value, "value"):
                result[key] = value.value  # Convert Enum to string
            elif isinstance(value, dict):
                for k, v in value.items():
                    if hasattr(v, "name") and hasattr(v, "value"):
                        value[k] = v.value
        return result

    def _parse_human_readable_log(self, log_content: str) -> Dict[str, Any]:
        """
        Parse human-readable Terraform plan output.

        Args:
            log_content (str): Human-readable log content

        Returns:
            Dict[str, Any]: Parsed data
        """
        result = {
            "success": True,
            "format": "human_readable",
            "terraform_version": self._extract_terraform_version(log_content),
            "resource_changes": [],
            "modules": {},
            "summary": {
                "total_changes": 0,
                "resources_to_add": 0,
                "resources_to_change": 0,
                "resources_to_destroy": 0,
            },
            "risk_assessment": {"overall_risk": RiskLevel.LOW, "high_risk_changes": []},
            "metadata": {
                "parsed_at": datetime.utcnow().isoformat(),
                "total_resources": 0,
            },
        }

        # Extract resource changes using regex patterns
        resource_changes = self._extract_resource_changes_from_text(log_content)

        for change in resource_changes:
            result["resource_changes"].append(change)

            # Update summary
            action = change["action"]
            if action == "create":
                result["summary"]["resources_to_add"] += 1
            elif action == "update":
                result["summary"]["resources_to_change"] += 1
            elif action == "delete":
                result["summary"]["resources_to_destroy"] += 1

            result["summary"]["total_changes"] += 1

            # Organize by modules
            module_address = change["module"]
            if module_address not in result["modules"]:
                result["modules"][module_address] = {
                    "resources": [],
                    "risk_level": RiskLevel.LOW,
                    "change_count": 0,
                }

            result["modules"][module_address]["resources"].append(change)
            result["modules"][module_address]["change_count"] += 1

        # Calculate risk assessment
        result["risk_assessment"] = self._calculate_risk_assessment(
            result["resource_changes"]
        )

        # Update module risk levels
        for module_address, module_data in result["modules"].items():
            module_data["risk_level"] = self._calculate_module_risk(
                module_data["resources"]
            )

        result["metadata"]["total_resources"] = len(resource_changes)

        for key, value in result.items():
            if hasattr(value, "name") and hasattr(value, "value"):
                result[key] = value.value  # Convert Enum to string
            elif isinstance(value, dict):
                for k, v in value.items():
                    if hasattr(v, "name") and hasattr(v, "value"):
                        value[k] = v.value
        return result

    def _process_resource_change(self, change: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single resource change from JSON format.

        Args:
            change (Dict[str, Any]): Resource change data

        Returns:
            Dict[str, Any]: Processed change data
        """
        address = change.get("address", "")
        resource_type = change.get("type", "")
        name = change.get("name", "")
        actions = change.get("change", {}).get("actions", [])

        # Determine primary action
        if "create" in actions:
            primary_action = "create"
        elif "delete" in actions:
            primary_action = "delete"
        elif "update" in actions:
            primary_action = "update"
        elif "replace" in actions:
            primary_action = "replace"
        else:
            primary_action = "no-op"

        # Extract module information
        module_address = self._extract_module_from_address(address)

        # Calculate risk for this change
        risk_level = self._calculate_resource_risk(
            resource_type, primary_action, change
        )

        return {
            "address": address,
            "type": resource_type,
            "name": name,
            "module": module_address,
            "action": primary_action,
            "actions": actions,
            "risk_level": risk_level,
            "before": change.get("change", {}).get("before"),
            "after": change.get("change", {}).get("after"),
            "provider_name": change.get("provider_name", ""),
            "change_summary": self._generate_change_summary(change),
        }

    def _extract_resource_changes_from_text(
        self, log_content: str
    ) -> List[Dict[str, Any]]:
        """
        Extract resource changes from human-readable Terraform output.

        Args:
            log_content (str): Log content

        Returns:
            List[Dict[str, Any]]: List of resource changes
        """
        changes = []

        # Pattern to match resource changes
        # Matches lines like: + resource "aws_instance" "example" {
        resource_pattern = r'^\s*([~+-])\s+resource\s+"([^"]+)"\s+"([^"]+)"\s*{?'

        lines = log_content.split("\n")
        current_resource = None

        for i, line in enumerate(lines):
            match = re.match(resource_pattern, line)
            if match:
                action_symbol, resource_type, resource_name = match.groups()

                # Map symbols to actions
                action_map = {"+": "create", "-": "delete", "~": "update"}
                action = action_map.get(action_symbol, "unknown")

                # Build resource address
                address = f"{resource_type}.{resource_name}"
                module_address = self._extract_module_from_context(lines, i)

                risk_level = self._calculate_resource_risk(resource_type, action, {})

                change = {
                    "address": address,
                    "type": resource_type,
                    "name": resource_name,
                    "module": module_address,
                    "action": action,
                    "actions": [action],
                    "risk_level": risk_level,
                    "before": None,
                    "after": None,
                    "provider_name": self._guess_provider_from_type(resource_type),
                    "change_summary": f"{action.title()} {resource_type} {resource_name}",
                }

                changes.append(change)

        return changes

    def _extract_module_from_address(self, address: str) -> str:
        """
        Extract module address from resource address.

        Args:
            address (str): Full resource address

        Returns:
            str: Module address
        """
        if address.startswith("module."):
            # Split by dots and take everything except the last two parts (type.name)
            parts = address.split(".")
            if len(parts) > 2:
                return ".".join(parts[:-2])
        return "root"

    def _extract_module_from_context(self, lines: List[str], line_index: int) -> str:
        """
        Extract module context from surrounding lines in human-readable format.

        Args:
            lines (List[str]): All log lines
            line_index (int): Current line index

        Returns:
            str: Module address
        """
        # Look backwards for module context
        for i in range(max(0, line_index - 20), line_index):
            if "module." in lines[i] and "will be" in lines[i]:
                module_match = re.search(r"module\.([^.\s]+)", lines[i])
                if module_match:
                    return f"module.{module_match.group(1)}"
        return "root"

    def _extract_terraform_version(self, log_content: str) -> Optional[str]:
        """
        Extract Terraform version from log content.

        Args:
            log_content (str): Log content

        Returns:
            Optional[str]: Terraform version if found
        """
        version_patterns = [
            r"Terraform v(\d+\.\d+\.\d+)",
            r'terraform_version.*?["\'](\d+\.\d+\.\d+)["\']',
        ]

        for pattern in version_patterns:
            match = re.search(pattern, log_content, re.IGNORECASE)
            if match:
                return match.group(1)

        return None

    def _calculate_resource_risk(
        self, resource_type: str, action: str, change_data: Dict[str, Any]
    ) -> RiskLevel:
        """
        Calculate risk level for a resource change using comprehensive risk assessment.

        Args:
            resource_type (str): Type of resource
            action (str): Action being performed
            change_data (Dict[str, Any]): Change details

        Returns:
            RiskLevel: Calculated risk level
        """
        try:
            # Extract additional context from change data
            environment = self._extract_environment_from_change(change_data)
            affects_production = self._is_production_environment(environment)
            has_dependencies = self._has_dependencies(change_data)
            compliance_tags = self._extract_compliance_tags(change_data)
            cost_impact = self._estimate_cost_impact(resource_type, action)

            # Use comprehensive risk assessor
            risk_assessment = self.risk_assessor.assess_change(
                resource_type=resource_type,
                action=action,
                environment=environment,
                cost_impact=cost_impact,
                affects_production=affects_production,
                has_dependencies=has_dependencies,
                compliance_tags=compliance_tags,
                change_metadata=change_data,
            )

            return risk_assessment.overall_risk

        except Exception as e:
            logger.warning(
                f"Error in comprehensive risk assessment: {e}, falling back to simple assessment"
            )
            # Fallback to original simple risk assessment
            return self._calculate_simple_resource_risk(resource_type, action)

    def _calculate_simple_resource_risk(
        self, resource_type: str, action: str
    ) -> RiskLevel:
        """
        Fallback simple risk calculation method.

        Args:
            resource_type (str): Type of resource
            action (str): Action being performed

        Returns:
            RiskLevel: Calculated risk level
        """
        # Critical resources always high risk
        if resource_type in self.CRITICAL_RESOURCES:
            return RiskLevel.CRITICAL

        # Deletion is always high risk
        if action in ["delete", "replace"]:
            return RiskLevel.HIGH

        # High-risk resources
        if resource_type in self.HIGH_RISK_RESOURCES:
            return RiskLevel.HIGH if action != "create" else RiskLevel.MEDIUM

        # Database and storage resources
        if any(
            db_type in resource_type
            for db_type in ["db_", "sql_", "storage", "bucket", "dynamodb"]
        ):
            return RiskLevel.MEDIUM if action == "create" else RiskLevel.HIGH

        # Network resources
        if any(
            net_type in resource_type
            for net_type in ["vpc", "subnet", "security_group", "firewall"]
        ):
            return RiskLevel.MEDIUM

        # Default to low risk for other resources
        return RiskLevel.LOW

    def _calculate_module_risk(self, resources: List[Dict[str, Any]]) -> RiskLevel:
        """
        Calculate overall risk level for a module based on its resources.

        Args:
            resources (List[Dict[str, Any]]): List of resource changes in module

        Returns:
            RiskLevel: Module risk level
        """
        if not resources:
            return RiskLevel.LOW

        risk_levels = [resource["risk_level"] for resource in resources]

        if RiskLevel.CRITICAL in risk_levels:
            return RiskLevel.CRITICAL
        elif RiskLevel.HIGH in risk_levels:
            return RiskLevel.HIGH
        elif RiskLevel.MEDIUM in risk_levels:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _calculate_risk_assessment(
        self, resource_changes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate overall risk assessment for all changes.

        Args:
            resource_changes (List[Dict[str, Any]]): All resource changes

        Returns:
            Dict[str, Any]: Risk assessment data with enhanced recommendations
        """
        if not resource_changes:
            return {
                "overall_risk": RiskLevel.LOW,
                "high_risk_changes": [],
                "requires_approval": False,
                "recommended_approvers": [],
                "mitigation_recommendations": [],
                "testing_strategy": [],
            }

        risk_counts = {level: 0 for level in RiskLevel}
        high_risk_changes = []
        all_assessments = []

        for change in resource_changes:
            risk_level = change["risk_level"]
            risk_counts[risk_level] += 1

            if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                high_risk_changes.append(
                    {
                        "address": change["address"],
                        "action": change["action"],
                        "risk_level": risk_level,
                        "reason": self._get_risk_reason(change),
                    }
                )

            # Try to get full risk assessment for high-priority changes
            if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                try:
                    environment = self._extract_environment_from_change(change)
                    assessment = self.risk_assessor.assess_change(
                        resource_type=change.get("type", ""),
                        action=change.get("action", ""),
                        environment=environment,
                        affects_production=self._is_production_environment(environment),
                        has_dependencies=self._has_dependencies(change),
                        compliance_tags=self._extract_compliance_tags(change),
                        change_metadata=change,
                    )
                    all_assessments.append(assessment)
                except Exception as e:
                    logger.warning(
                        f"Error getting detailed assessment for {change.get('address')}: {e}"
                    )

        # Determine overall risk
        if risk_counts[RiskLevel.CRITICAL] > 0:
            overall_risk = RiskLevel.CRITICAL
        elif risk_counts[RiskLevel.HIGH] > 0:
            overall_risk = RiskLevel.HIGH
        elif risk_counts[RiskLevel.MEDIUM] > 2:  # Multiple medium risk changes
            overall_risk = RiskLevel.HIGH
        elif risk_counts[RiskLevel.MEDIUM] > 0:
            overall_risk = RiskLevel.MEDIUM
        else:
            overall_risk = RiskLevel.LOW

        # Aggregate recommendations from all assessments
        requires_approval = overall_risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        recommended_approvers = set()
        mitigation_recommendations = set()
        testing_strategies = set()

        for assessment in all_assessments:
            if assessment.requires_approval:
                requires_approval = True
            recommended_approvers.update(assessment.recommended_approvers)
            mitigation_recommendations.update(assessment.mitigation_recommendations)
            testing_strategies.update(assessment.testing_strategy)

        # Add general recommendations based on overall risk
        if overall_risk == RiskLevel.CRITICAL:
            mitigation_recommendations.add("Manual review required before apply")
            mitigation_recommendations.add("Consider phased rollout")
            recommended_approvers.add("Senior Infrastructure Engineer")
            recommended_approvers.add("Security Team")
        elif overall_risk == RiskLevel.HIGH:
            mitigation_recommendations.add("Thorough testing in staging environment")
            recommended_approvers.add("Infrastructure Team Lead")

        result = {
            "overall_risk": overall_risk,
            "risk_counts": risk_counts,
            "high_risk_changes": high_risk_changes,
            "total_changes": len(resource_changes),
            "requires_approval": requires_approval,
            "recommended_approvers": list(recommended_approvers),
            "mitigation_recommendations": list(mitigation_recommendations),
            "testing_strategy": list(testing_strategies),
            "detailed_assessments": len(all_assessments),
        }

        for key, value in result.items():
            if hasattr(value, "name") and hasattr(value, "value"):
                result[key] = value.value  # Convert Enum to string
            elif isinstance(value, dict):
                for k, v in value.items():
                    if hasattr(v, "name") and hasattr(v, "value"):
                        value[k] = v.value
        return result

    def _get_risk_reason(self, change: Dict[str, Any]) -> str:
        """
        Get human-readable reason for risk level.

        Args:
            change (Dict[str, Any]): Resource change

        Returns:
            str: Risk reason
        """
        resource_type = change["type"]
        action = change["action"]

        if resource_type in self.CRITICAL_RESOURCES:
            return f"Critical resource type: {resource_type}"

        if action in ["delete", "replace"]:
            return f"Destructive action: {action}"

        if resource_type in self.HIGH_RISK_RESOURCES:
            return f"High-risk resource type: {resource_type}"

        return f"Standard risk for {action} action on {resource_type}"

    def _guess_provider_from_type(self, resource_type: str) -> str:
        """
        Guess provider from resource type.

        Args:
            resource_type (str): Resource type

        Returns:
            str: Guessed provider name
        """
        if resource_type.startswith("aws_"):
            return "aws"
        elif resource_type.startswith("azurerm_"):
            return "azurerm"
        elif resource_type.startswith("google_"):
            return "google"
        elif resource_type.startswith("kubernetes_"):
            return "kubernetes"
        else:
            return "unknown"

    def _generate_change_summary(self, change: Dict[str, Any]) -> str:
        """
        Generate a human-readable summary of the change.

        Args:
            change (Dict[str, Any]): Change data

        Returns:
            str: Change summary
        """
        actions = change.get("change", {}).get("actions", [])
        resource_type = change.get("type", "")
        name = change.get("name", "")

        action_text = " and ".join(actions)
        return f"{action_text.title()} {resource_type} '{name}'"

    def _extract_environment_from_change(
        self, change_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        Extract environment information from change data.

        Args:
            change_data (Dict[str, Any]): Change data

        Returns:
            Optional[str]: Environment name if found
        """
        # Try to extract from resource address or module path
        address = change_data.get("address", "")

        # Common environment patterns in resource addresses
        env_patterns = [
            r"env[._-](\w+)",
            r"(\w+)[._-]env",
            r"(prod|production|staging|stage|dev|development|test)",
            r"module\.(\w+)\..*",  # Module name might indicate environment
        ]

        for pattern in env_patterns:
            match = re.search(pattern, address, re.IGNORECASE)
            if match:
                env = match.group(1).lower()
                if env in [
                    "prod",
                    "production",
                    "staging",
                    "stage",
                    "dev",
                    "development",
                    "test",
                ]:
                    return env

        # Try to extract from tags or configuration
        after_data = change_data.get("change", {}).get("after", {})
        if isinstance(after_data, dict):
            tags = after_data.get("tags", {})
            if isinstance(tags, dict):
                for key in ["Environment", "Env", "environment", "env"]:
                    if key in tags:
                        return tags[key].lower()

        return None

    def _is_production_environment(self, environment: Optional[str]) -> bool:
        """
        Check if environment is production.

        Args:
            environment (Optional[str]): Environment name

        Returns:
            bool: True if production environment
        """
        if not environment:
            return False

        prod_indicators = ["prod", "production", "live", "main"]
        return environment.lower() in prod_indicators

    def _has_dependencies(self, change_data: Dict[str, Any]) -> bool:
        """
        Check if resource has dependencies.

        Args:
            change_data (Dict[str, Any]): Change data

        Returns:
            bool: True if has dependencies
        """
        # Check for explicit dependencies
        change_info = change_data.get("change", {})

        # Check for depends_on in configuration
        after_data = change_info.get("after", {})
        if isinstance(after_data, dict):
            if "depends_on" in after_data:
                return True

        # Check for references to other resources
        if isinstance(after_data, dict):
            after_str = str(after_data)
            if re.search(r"\$\{.*?\}", after_str) or re.search(r"var\.", after_str):
                return True

        return False

    def _extract_compliance_tags(self, change_data: Dict[str, Any]) -> List[str]:
        """
        Extract compliance-related tags from change data.

        Args:
            change_data (Dict[str, Any]): Change data

        Returns:
            List[str]: List of compliance tags
        """
        compliance_tags = []

        # Check tags in after configuration
        after_data = change_data.get("change", {}).get("after", {})
        if isinstance(after_data, dict):
            tags = after_data.get("tags", {})
            if isinstance(tags, dict):
                # Look for compliance-related tag keys
                compliance_keys = [
                    "compliance",
                    "regulatory",
                    "gdpr",
                    "hipaa",
                    "pci",
                    "sox",
                    "classification",
                    "security",
                    "criticality",
                ]

                for key, value in tags.items():
                    if any(comp_key in key.lower() for comp_key in compliance_keys):
                        compliance_tags.append(f"{key}:{value}")

        return compliance_tags

    def _estimate_cost_impact(self, resource_type: str, action: str) -> Optional[float]:
        """
        Estimate monthly cost impact of resource change.

        Args:
            resource_type (str): Type of resource
            action (str): Action being performed

        Returns:
            Optional[float]: Estimated monthly cost impact in USD
        """
        # Basic cost estimates for common resource types
        cost_estimates = {
            # Compute resources
            "aws_instance": 50.0,
            "aws_lambda_function": 10.0,
            "google_compute_instance": 45.0,
            "azurerm_virtual_machine": 55.0,
            # Database resources
            "aws_db_instance": 200.0,
            "aws_rds_cluster": 400.0,
            "google_sql_database_instance": 180.0,
            "azurerm_sql_database": 220.0,
            # Storage resources
            "aws_s3_bucket": 25.0,
            "google_storage_bucket": 20.0,
            "azurerm_storage_account": 30.0,
            # Load balancers
            "aws_load_balancer": 25.0,
            "aws_alb": 25.0,
            "aws_nlb": 25.0,
            "google_compute_url_map": 20.0,
            # Cache/Memory stores
            "aws_elasticache_cluster": 150.0,
            "azurerm_redis_cache": 140.0,
        }

        base_cost = cost_estimates.get(resource_type, 15.0)  # Default cost

        # Adjust based on action
        if action == "create":
            return base_cost
        elif action == "delete":
            return -base_cost  # Negative cost (savings)
        elif action in ["update", "replace"]:
            return base_cost * 0.1  # Small cost increase for changes

        return None
