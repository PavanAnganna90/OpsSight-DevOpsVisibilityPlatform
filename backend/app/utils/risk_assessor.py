"""
Infrastructure Risk Assessment Utility.

This module provides comprehensive risk assessment capabilities for infrastructure changes,
supporting configurable risk factors, compliance requirements, and mitigation recommendations.
"""

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    """Risk level enumeration for infrastructure changes."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ImpactScope(str, Enum):
    """Impact scope for infrastructure changes."""

    LOCAL = "local"
    SERVICE = "service"
    REGION = "region"
    GLOBAL = "global"


class ComplianceImpact(str, Enum):
    """Compliance impact levels."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    REGULATORY = "regulatory"


@dataclass
class RiskFactor:
    """Individual risk factor with weight and score."""

    name: str
    score: float  # 0.0 to 1.0
    weight: float  # Multiplier for this factor
    description: str
    evidence: Optional[str] = None


@dataclass
class RiskAssessment:
    """Complete risk assessment result."""

    overall_risk: RiskLevel
    risk_score: float  # 0.0 to 1.0
    impact_scope: ImpactScope
    compliance_impact: ComplianceImpact
    factors: List[RiskFactor]
    requires_approval: bool
    recommended_approvers: List[str]
    mitigation_recommendations: List[str]
    testing_strategy: List[str]
    rollback_plan: Optional[str]
    estimated_downtime: Optional[str]
    business_impact: Optional[str]


class InfrastructureRiskAssessor:
    """
    Comprehensive risk assessment for infrastructure changes.

    Evaluates changes based on multiple factors including resource types,
    environment impact, compliance requirements, and historical patterns.
    """

    # High-risk resource types with their base risk scores
    RESOURCE_RISK_MAPPING = {
        # Critical Infrastructure (0.9-1.0)
        "aws_iam_policy_attachment": 0.95,
        "aws_iam_role_policy_attachment": 0.95,
        "aws_route": 0.9,
        "aws_nat_gateway": 0.9,
        "azurerm_role_assignment": 0.95,
        "google_project_iam_binding": 0.95,
        # High Risk Resources (0.7-0.9)
        "aws_iam_role": 0.8,
        "aws_iam_policy": 0.8,
        "aws_security_group": 0.75,
        "aws_vpc": 0.8,
        "aws_subnet": 0.7,
        "aws_db_instance": 0.8,
        "aws_rds_cluster": 0.85,
        "aws_s3_bucket": 0.7,
        "aws_kms_key": 0.8,
        "azurerm_virtual_network": 0.8,
        "azurerm_sql_database": 0.8,
        "google_compute_firewall": 0.75,
        "google_sql_database_instance": 0.8,
        # Medium Risk Resources (0.4-0.7)
        "aws_instance": 0.5,
        "aws_lambda_function": 0.6,
        "aws_load_balancer": 0.6,
        "aws_elasticache_cluster": 0.65,
        "google_compute_instance": 0.5,
        "azurerm_virtual_machine": 0.5,
        # Low Risk Resources (0.1-0.4)
        "aws_s3_bucket_object": 0.2,
        "aws_cloudwatch_log_group": 0.3,
        "local_file": 0.1,
        "random_id": 0.1,
    }

    # Action risk multipliers
    ACTION_MULTIPLIERS = {
        "create": 0.5,
        "update": 0.7,
        "delete": 1.5,
        "replace": 1.3,
        "no-op": 0.1,
    }

    # Environment risk multipliers
    ENVIRONMENT_MULTIPLIERS = {
        "prod": 1.5,
        "production": 1.5,
        "staging": 1.2,
        "dev": 0.8,
        "development": 0.8,
        "test": 0.6,
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize risk assessor with optional configuration.

        Args:
            config: Configuration dictionary for custom thresholds and weights
        """
        self.config = config or {}
        self.risk_thresholds = self.config.get(
            "risk_thresholds", {"low": 0.0, "medium": 0.3, "high": 0.6, "critical": 0.8}
        )
        self.risk_weights = self.config.get(
            "risk_weights",
            {
                "resource_type": 0.2,
                "action_impact": 0.2,
                "environment": 0.2,
                "cost_impact": 0.4,
                "dependencies": 0.1,
                "compliance": 0.1,
            },
        )

    def assess_change(
        self,
        resource_type: str,
        action: str,
        environment: Optional[str] = None,
        cost_impact: Optional[float] = None,
        affects_production: Optional[bool] = None,
        has_dependencies: Optional[bool] = None,
        compliance_tags: Optional[List[str]] = None,
        change_metadata: Optional[Dict[str, Any]] = None,
    ) -> RiskAssessment:
        """
        Perform comprehensive risk assessment for an infrastructure change.

        Args:
            resource_type: Type of resource being changed
            action: Action being performed (create, update, delete, etc.)
            environment: Target environment
            cost_impact: Estimated monthly cost impact in USD
            affects_production: Whether change affects production systems
            has_dependencies: Whether resource has dependencies
            compliance_tags: List of compliance-related tags
            change_metadata: Additional metadata about the change

        Returns:
            RiskAssessment: Complete risk assessment
        """
        factors = []
        metadata = change_metadata or {}

        # 1. Resource Type Risk Factor
        base_risk = self.RESOURCE_RISK_MAPPING.get(resource_type, 0.3)
        factors.append(
            RiskFactor(
                name="resource_type",
                score=base_risk,
                weight=2.0,
                description=f"Base risk for resource type: {resource_type}",
                evidence=f"Resource type {resource_type} has base risk score {base_risk}",
            )
        )

        # 2. Action Risk Factor
        action_multiplier = self.ACTION_MULTIPLIERS.get(action, 1.0)
        action_score = min(base_risk * action_multiplier, 1.0)
        factors.append(
            RiskFactor(
                name="action_impact",
                score=action_score,
                weight=1.5,
                description=f"Risk impact of {action} action",
                evidence=f"Action {action} has multiplier {action_multiplier}",
            )
        )

        # 3. Environment Risk Factor
        env_multiplier = 1.0
        if environment:
            env_multiplier = self.ENVIRONMENT_MULTIPLIERS.get(environment.lower(), 1.0)
        if affects_production:
            env_multiplier = max(env_multiplier, 1.5)

        env_score = min(base_risk * env_multiplier, 1.0)
        factors.append(
            RiskFactor(
                name="environment_impact",
                score=env_score,
                weight=1.8,
                description=f"Environment risk for {environment or 'unknown'}",
                evidence=f"Environment multiplier: {env_multiplier}, affects production: {affects_production}",
            )
        )

        # 4. Cost Impact Risk Factor
        cost_score = self._calculate_cost_risk(cost_impact)
        if cost_score > 0:
            factors.append(
                RiskFactor(
                    name="cost_impact",
                    score=cost_score,
                    weight=1.2,
                    description="Financial impact assessment",
                    evidence=f"Estimated cost impact: ${cost_impact or 0}/month",
                )
            )

        # 5. Dependency Risk Factor
        if has_dependencies:
            dep_score = min(base_risk * 1.3, 1.0)
            factors.append(
                RiskFactor(
                    name="dependency_risk",
                    score=dep_score,
                    weight=1.1,
                    description="Risk from resource dependencies",
                    evidence="Resource has downstream dependencies",
                )
            )

        # 6. Compliance Risk Factor
        compliance_impact = self._assess_compliance_impact(compliance_tags or [])
        if compliance_impact != ComplianceImpact.NONE:
            comp_score = self._compliance_to_score(compliance_impact)
            factors.append(
                RiskFactor(
                    name="compliance_impact",
                    score=comp_score,
                    weight=2.0,
                    description=f"Compliance impact: {compliance_impact}",
                    evidence=f"Compliance tags: {compliance_tags}",
                )
            )

        # Calculate overall risk score
        total_weighted_score = sum(factor.score * factor.weight for factor in factors)
        total_weight = sum(factor.weight for factor in factors)
        overall_score = total_weighted_score / total_weight if total_weight > 0 else 0

        # Determine risk level
        risk_level = self._score_to_risk_level(overall_score)

        # Ensure destructive actions are always at least HIGH risk
        destructive_actions = {"delete", "destroy"}
        if (
            action
            and action.lower() in destructive_actions
            and risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM]
        ):
            risk_level = RiskLevel.HIGH
            overall_score = max(overall_score, self.risk_thresholds.get("high", 0.6))

        # Determine impact scope
        impact_scope = self._determine_impact_scope(
            resource_type, environment, has_dependencies
        )

        # Generate recommendations
        requires_approval = overall_score >= self.risk_thresholds["medium"]
        recommended_approvers = self._get_recommended_approvers(
            risk_level, resource_type, compliance_impact
        )
        mitigation_recommendations = self._generate_mitigation_recommendations(
            factors, risk_level
        )
        testing_strategy = self._generate_testing_strategy(
            resource_type, action, risk_level
        )
        rollback_plan = self._generate_rollback_plan(resource_type, action, risk_level)

        return RiskAssessment(
            overall_risk=risk_level,
            risk_score=overall_score,
            impact_scope=impact_scope,
            compliance_impact=compliance_impact,
            factors=factors,
            requires_approval=requires_approval,
            recommended_approvers=recommended_approvers,
            mitigation_recommendations=mitigation_recommendations,
            testing_strategy=testing_strategy,
            rollback_plan=rollback_plan,
            estimated_downtime=self._estimate_downtime(resource_type, action),
            business_impact=self._assess_business_impact(
                resource_type, environment, cost_impact
            ),
        )

    def _calculate_cost_risk(self, cost_impact: Optional[float]) -> float:
        """Calculate risk score based on cost impact."""
        if not cost_impact:
            return 0.0
        if cost_impact >= 10000:
            return 1.0
        # Cost thresholds in USD/month
        if cost_impact >= 1000:
            return 0.9
        elif cost_impact >= 500:
            return 0.7
        elif cost_impact >= 100:
            return 0.5
        elif cost_impact >= 50:
            return 0.3
        else:
            return 0.1

    def _assess_compliance_impact(self, compliance_tags: List[str]) -> ComplianceImpact:
        """Assess compliance impact based on tags."""
        if not compliance_tags:
            return ComplianceImpact.NONE

        regulatory_tags = {"sox", "pci", "hipaa", "gdpr", "iso27001", "fedramp"}
        high_compliance_tags = {
            "security",
            "audit",
            "compliance",
            "critical",
            "sensitive",
            "confidential",
            "restricted",
        }

        tags_lower = [tag.lower() for tag in compliance_tags]

        if any(tag in regulatory_tags for tag in tags_lower):
            return ComplianceImpact.REGULATORY
        elif any(tag in high_compliance_tags for tag in tags_lower):
            return ComplianceImpact.HIGH
        elif len(compliance_tags) > 2:
            return ComplianceImpact.MEDIUM
        else:
            return ComplianceImpact.LOW

    def _compliance_to_score(self, compliance_impact: ComplianceImpact) -> float:
        """Convert compliance impact to risk score."""
        mapping = {
            ComplianceImpact.NONE: 0.0,
            ComplianceImpact.LOW: 0.3,
            ComplianceImpact.MEDIUM: 0.6,
            ComplianceImpact.HIGH: 0.8,
            ComplianceImpact.REGULATORY: 0.95,
        }
        return mapping.get(compliance_impact, 0.0)

    def _score_to_risk_level(self, score: float) -> RiskLevel:
        """Convert numerical risk score to risk level."""
        if score >= self.risk_thresholds["high"]:
            return RiskLevel.CRITICAL if score >= 0.9 else RiskLevel.HIGH
        elif score >= self.risk_thresholds["medium"]:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _determine_impact_scope(
        self, resource_type: str, environment: Optional[str], has_dependencies: bool
    ) -> ImpactScope:
        """Determine the scope of impact for the change."""
        # Global impact resources
        if any(
            global_type in resource_type
            for global_type in ["iam_", "route", "dns", "cloudfront"]
        ):
            return ImpactScope.GLOBAL

        # Regional impact resources
        if any(
            regional_type in resource_type
            for regional_type in [
                "vpc",
                "subnet",
                "nat_gateway",
                "load_balancer",
                "security_group",
            ]
        ):
            return ImpactScope.REGION

        # Service impact (especially with dependencies or DB resources)
        if (
            has_dependencies
            or (
                environment is not None
                and environment.lower() in ["prod", "production"]
            )
            or ("rds" in resource_type or "database" in resource_type)
        ):
            return ImpactScope.SERVICE

        # Default to local impact
        return ImpactScope.LOCAL

    def _get_recommended_approvers(
        self,
        risk_level: RiskLevel,
        resource_type: str,
        compliance_impact: ComplianceImpact,
    ) -> List[str]:
        """Get recommended approvers based on risk factors."""
        approvers = []

        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            approvers.append("infrastructure_lead")

        if compliance_impact in [ComplianceImpact.HIGH, ComplianceImpact.REGULATORY]:
            approvers.append("compliance_officer")

        if "iam_" in resource_type or "security_group" in resource_type:
            approvers.append("security_team")

        if risk_level == RiskLevel.CRITICAL:
            approvers.extend(["cto", "engineering_director"])

        return list(set(approvers))  # Remove duplicates

    def _generate_mitigation_recommendations(
        self, factors: List[RiskFactor], risk_level: RiskLevel
    ) -> List[str]:
        """Generate mitigation recommendations based on risk factors."""
        recommendations = []

        # High-risk factor mitigations
        for factor in factors:
            if factor.score >= 0.7:
                if factor.name == "resource_type":
                    recommendations.append(
                        "Consider using a less privileged resource type if possible"
                    )
                elif factor.name == "action_impact":
                    recommendations.append(
                        "Implement canary deployment for destructive changes"
                    )
                elif factor.name == "environment_impact":
                    recommendations.append("Test change in staging environment first")
                elif factor.name == "cost_impact":
                    recommendations.append("Review cost optimization opportunities")
                elif factor.name == "compliance_impact":
                    recommendations.append("Ensure compliance documentation is updated")

        # General high-risk mitigations
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recommendations.extend(
                [
                    "Schedule change during maintenance window",
                    "Ensure monitoring and alerting are in place",
                    "Prepare communication plan for stakeholders",
                ]
            )
        # Default recommendation for medium/low risk if none generated
        if not recommendations:
            recommendations.append("Review change for potential improvements or risks")
        return recommendations

    def _generate_testing_strategy(
        self, resource_type: str, action: str, risk_level: RiskLevel
    ) -> List[str]:
        """Generate testing strategy recommendations."""
        strategy = []

        # Base testing requirements
        strategy.append("Validate Terraform plan output")

        if risk_level != RiskLevel.LOW:
            strategy.append("Test in staging environment")

        if action in ["delete", "replace"]:
            strategy.extend(
                ["Verify backup and restore procedures", "Test rollback scenario"]
            )

        if "database" in resource_type or "storage" in resource_type:
            strategy.extend(
                ["Verify data backup integrity", "Test data migration if applicable"]
            )

        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            strategy.extend(
                [
                    "Conduct load testing",
                    "Perform security scanning",
                    "Execute disaster recovery test",
                ]
            )

        return strategy

    def _generate_rollback_plan(
        self, resource_type: str, action: str, risk_level: RiskLevel
    ) -> Optional[str]:
        """Generate rollback plan description."""
        if action == "create":
            return "Use terraform destroy to remove created resources"
        elif action == "delete":
            return "Re-apply previous Terraform configuration to restore resources"
        elif action in ["update", "replace"]:
            return "Apply previous Terraform state to revert changes"
        else:
            return "No rollback required for read-only operations"

    def _estimate_downtime(self, resource_type: str, action: str) -> Optional[str]:
        """Estimate potential downtime for the change."""
        if action == "create":
            return "No downtime expected"

        # Database changes typically require downtime
        if "database" in resource_type or "rds" in resource_type:
            if action in ["delete", "replace"]:
                return "5-15 minutes"
            else:
                return "1-5 minutes"

        # Network changes may cause brief connectivity issues
        if any(
            net_type in resource_type
            for net_type in ["vpc", "subnet", "security_group"]
        ):
            return "30 seconds - 2 minutes"

        # Compute instance changes
        if "instance" in resource_type:
            if action in ["delete", "replace"]:
                return "2-5 minutes"
            else:
                return "30 seconds - 1 minute"

        return "Minimal downtime expected"

    def _assess_business_impact(
        self,
        resource_type: str,
        environment: Optional[str],
        cost_impact: Optional[float],
    ) -> Optional[str]:
        """Assess business impact of the change."""
        impact_factors = []

        if environment in ["prod", "production"]:
            impact_factors.append("Production environment affected")

        if cost_impact and cost_impact > 500:
            impact_factors.append(f"Significant cost impact: ${cost_impact}/month")

        if any(
            critical_type in resource_type
            for critical_type in ["database", "storage", "iam"]
        ):
            impact_factors.append("Critical infrastructure component")

        if impact_factors:
            return "; ".join(impact_factors)

        return "Limited business impact expected"

    # Expose calculation methods as public
    def calculate_resource_type_risk(self, resource_type: str) -> float:
        return self.RESOURCE_RISK_MAPPING.get(resource_type, 0.3)

    def calculate_action_impact_risk(self, action: str, base_risk: float) -> float:
        return min(base_risk * self.ACTION_MULTIPLIERS.get(action, 1.0), 1.0)

    def calculate_environment_risk(self, environment: Optional[str]) -> float:
        if not environment:
            return 0.5
        return min(self.ENVIRONMENT_MULTIPLIERS.get(environment.lower(), 1.0), 1.5)

    def calculate_cost_impact_risk(self, cost_impact: Optional[float]) -> float:
        return self._calculate_cost_risk(cost_impact)

    def calculate_dependency_risk(self, has_dependencies: bool) -> float:
        return 0.8 if has_dependencies else 0.2

    def calculate_compliance_risk(self, compliance_tags: List[str]) -> float:
        return self._compliance_to_score(
            self._assess_compliance_impact(compliance_tags)
        )

    def get_risk_level_from_score(self, score: float) -> RiskLevel:
        return self._score_to_risk_level(score)

    def get_impact_scope(
        self, resource_type: str, environment: Optional[str]
    ) -> ImpactScope:
        return self._determine_impact_scope(resource_type, environment, False)

    def get_compliance_impact(self, compliance_tags: List[str]) -> ComplianceImpact:
        return self._assess_compliance_impact(compliance_tags)

    def generate_recommendations(
        self,
        risk_score: float,
        resource_type: str,
        action: str,
        environment: Optional[str],
    ) -> List[str]:
        # Dummy factors for recommendation generation
        factors = [
            RiskFactor(
                name="resource_type", score=risk_score, weight=1.0, description=""
            )
        ]
        risk_level = self.get_risk_level_from_score(risk_score)
        return self._generate_mitigation_recommendations(factors, risk_level)

    def get_supported_resource_types(self) -> List[str]:
        return list(self.RESOURCE_RISK_MAPPING.keys())
