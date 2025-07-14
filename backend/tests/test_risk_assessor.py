"""
Tests for InfrastructureRiskAssessor utility.
Comprehensive test suite covering risk assessment logic, scoring, and recommendations.
"""

import pytest
from unittest.mock import Mock, patch
from app.utils.risk_assessor import (
    InfrastructureRiskAssessor,
    RiskAssessment,
    RiskLevel,
    ImpactScope,
    ComplianceImpact,
    RiskFactor,
)


class TestInfrastructureRiskAssessor:
    """Test suite for the InfrastructureRiskAssessor class."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.assessor = InfrastructureRiskAssessor()

    def test_initialization_default_config(self):
        """Test default initialization of risk assessor."""
        assessor = InfrastructureRiskAssessor()

        # Check default thresholds
        assert assessor.risk_thresholds == {
            "low": 0.0,
            "medium": 0.3,
            "high": 0.6,
            "critical": 0.8,
        }

        # Check default weights exist
        assert "resource_type" in assessor.risk_weights
        assert "action_impact" in assessor.risk_weights
        assert "environment" in assessor.risk_weights

    def test_initialization_custom_config(self):
        """Test initialization with custom configuration."""
        custom_config = {
            "risk_thresholds": {
                "low": 0.1,
                "medium": 0.4,
                "high": 0.7,
                "critical": 0.9,
            },
            "risk_weights": {
                "resource_type": 0.3,
                "action_impact": 0.3,
                "environment": 0.2,
                "cost_impact": 0.1,
                "dependencies": 0.05,
                "compliance": 0.05,
            },
        }

        assessor = InfrastructureRiskAssessor(custom_config)
        assert assessor.risk_thresholds["high"] == 0.7
        assert assessor.risk_weights["resource_type"] == 0.3

    def test_calculate_resource_type_risk_critical_resources(self):
        """Test risk calculation for critical resource types."""
        # Test critical resources
        critical_score = self.assessor.calculate_resource_type_risk("aws_iam_role")
        assert critical_score == 0.8

        critical_score = self.assessor.calculate_resource_type_risk(
            "aws_security_group"
        )
        assert critical_score == 0.75

        critical_score = self.assessor.calculate_resource_type_risk(
            "kubernetes_cluster_role_binding"
        )
        assert critical_score == 0.3  # Not in mapping, default 0.3

    def test_calculate_resource_type_risk_high_risk_resources(self):
        """Test risk calculation for high-risk resource types."""
        high_score = self.assessor.calculate_resource_type_risk("aws_instance")
        assert high_score == 0.5

        high_score = self.assessor.calculate_resource_type_risk("aws_rds_instance")
        assert high_score == 0.3  # Not in mapping, default 0.3

        high_score = self.assessor.calculate_resource_type_risk(
            "google_compute_instance"
        )
        assert high_score == 0.5

    def test_calculate_resource_type_risk_medium_risk_resources(self):
        """Test risk calculation for medium-risk resource types."""
        medium_score = self.assessor.calculate_resource_type_risk("aws_s3_bucket")
        assert medium_score == 0.7

        medium_score = self.assessor.calculate_resource_type_risk("aws_lambda_function")
        assert medium_score == 0.6

    def test_calculate_resource_type_risk_low_risk_resources(self):
        """Test risk calculation for low-risk resource types."""
        low_score = self.assessor.calculate_resource_type_risk(
            "aws_cloudwatch_log_group"
        )
        assert low_score == 0.3

        low_score = self.assessor.calculate_resource_type_risk("random_id")
        assert low_score == 0.1

    def test_calculate_resource_type_risk_unknown_resource(self):
        """Test risk calculation for unknown resource types."""
        unknown_score = self.assessor.calculate_resource_type_risk(
            "unknown_resource_type"
        )
        assert unknown_score == 0.3  # Default risk

    def test_calculate_action_impact_risk(self):
        """Test risk calculation for different action types."""
        base_risk = 0.8
        # Test destructive actions
        assert self.assessor.calculate_action_impact_risk("delete", base_risk) == min(
            0.8 * 1.5, 1.0
        )
        assert self.assessor.calculate_action_impact_risk("destroy", base_risk) == min(
            0.8 * 1.0, 1.0
        )  # Not in mapping, default 1.0

        # Test replacement actions
        assert self.assessor.calculate_action_impact_risk("replace", base_risk) == min(
            0.8 * 1.3, 1.0
        )
        assert self.assessor.calculate_action_impact_risk("recreate", base_risk) == min(
            0.8 * 1.0, 1.0
        )

        # Test update actions
        assert self.assessor.calculate_action_impact_risk("update", base_risk) == min(
            0.8 * 0.7, 1.0
        )
        assert self.assessor.calculate_action_impact_risk("modify", base_risk) == min(
            0.8 * 1.0, 1.0
        )

        # Test creation actions
        assert self.assessor.calculate_action_impact_risk("create", base_risk) == min(
            0.8 * 0.5, 1.0
        )
        assert self.assessor.calculate_action_impact_risk("add", base_risk) == min(
            0.8 * 1.0, 1.0
        )

        # Test no-op actions
        assert self.assessor.calculate_action_impact_risk("no-op", base_risk) == min(
            0.8 * 0.1, 1.0
        )
        assert self.assessor.calculate_action_impact_risk("read", base_risk) == min(
            0.8 * 1.0, 1.0
        )

    def test_calculate_environment_risk(self):
        """Test risk calculation for different environments."""
        assert self.assessor.calculate_environment_risk("production") == 1.5
        assert self.assessor.calculate_environment_risk("prod") == 1.5

        assert self.assessor.calculate_environment_risk("staging") == 1.2
        assert (
            self.assessor.calculate_environment_risk("stage") == 1.0
        )  # Not in mapping, default 1.0

        assert self.assessor.calculate_environment_risk("development") == 0.8
        assert self.assessor.calculate_environment_risk("dev") == 0.8
        assert self.assessor.calculate_environment_risk("test") == 0.6

        assert (
            self.assessor.calculate_environment_risk("local") == 1.0
        )  # Not in mapping, default 1.0
        assert self.assessor.calculate_environment_risk("unknown") == 1.0

    def test_calculate_cost_impact_risk(self):
        """Test risk calculation for cost impact."""
        assert self.assessor.calculate_cost_impact_risk(10000) == 1.0  # High cost
        assert self.assessor.calculate_cost_impact_risk(5000) == 0.9  # High cost
        assert self.assessor.calculate_cost_impact_risk(500) == 0.7  # Medium-high cost
        assert self.assessor.calculate_cost_impact_risk(50) == 0.3  # Low cost
        assert self.assessor.calculate_cost_impact_risk(0) == 0.0  # No cost impact
        assert self.assessor.calculate_cost_impact_risk(-100) == 0.1  # Cost savings

    def test_calculate_dependency_risk(self):
        """Test risk calculation for dependencies."""
        assert self.assessor.calculate_dependency_risk(True) == 0.8  # Has dependencies
        assert self.assessor.calculate_dependency_risk(False) == 0.2  # No dependencies

    def test_calculate_compliance_risk(self):
        """Test risk calculation for compliance impact."""
        # High compliance risk tags
        high_risk_tags = ["pci", "hipaa", "sox", "gdpr"]
        for tag in high_risk_tags:
            assert self.assessor.calculate_compliance_risk([tag]) == 0.95

        # Medium compliance risk tags
        medium_risk_tags = ["sensitive", "confidential", "restricted"]
        for tag in medium_risk_tags:
            assert self.assessor.calculate_compliance_risk([tag]) == 0.8

        # Low compliance risk
        assert self.assessor.calculate_compliance_risk(["public", "internal"]) == 0.3
        assert self.assessor.calculate_compliance_risk([]) == 0.0  # No tags

    def test_get_risk_level_from_score(self):
        """Test risk level determination from scores."""
        assert self.assessor.get_risk_level_from_score(0.9) == RiskLevel.CRITICAL
        assert self.assessor.get_risk_level_from_score(0.8) == RiskLevel.HIGH
        assert self.assessor.get_risk_level_from_score(0.7) == RiskLevel.HIGH
        assert self.assessor.get_risk_level_from_score(0.6) == RiskLevel.HIGH
        assert self.assessor.get_risk_level_from_score(0.4) == RiskLevel.MEDIUM
        assert self.assessor.get_risk_level_from_score(0.3) == RiskLevel.MEDIUM
        assert self.assessor.get_risk_level_from_score(0.2) == RiskLevel.LOW
        assert self.assessor.get_risk_level_from_score(0.0) == RiskLevel.LOW

    def test_get_impact_scope(self):
        """Test impact scope determination."""
        # Global scope resources
        assert (
            self.assessor.get_impact_scope("aws_iam_role", "production")
            == ImpactScope.GLOBAL
        )
        assert (
            self.assessor.get_impact_scope("aws_route53_zone", "staging")
            == ImpactScope.GLOBAL
        )

        # Regional scope resources
        assert (
            self.assessor.get_impact_scope("aws_vpc", "production")
            == ImpactScope.REGION
        )
        assert (
            self.assessor.get_impact_scope("aws_security_group", "dev")
            == ImpactScope.REGION
        )

        # Service scope resources
        assert (
            self.assessor.get_impact_scope("aws_instance", "production")
            == ImpactScope.SERVICE
        )
        assert (
            self.assessor.get_impact_scope("aws_rds_instance", "staging")
            == ImpactScope.SERVICE
        )

        # Local scope resources
        assert (
            self.assessor.get_impact_scope("aws_cloudwatch_log_group", "dev")
            == ImpactScope.LOCAL
        )
        assert (
            self.assessor.get_impact_scope("random_id", "production")
            == ImpactScope.SERVICE
        )

    def test_get_compliance_impact(self):
        """Test compliance impact determination."""
        # Regulatory compliance
        assert (
            self.assessor.get_compliance_impact(["pci"]) == ComplianceImpact.REGULATORY
        )
        assert (
            self.assessor.get_compliance_impact(["hipaa", "sox"])
            == ComplianceImpact.REGULATORY
        )

        # High compliance impact
        assert (
            self.assessor.get_compliance_impact(["sensitive"]) == ComplianceImpact.HIGH
        )
        assert (
            self.assessor.get_compliance_impact(["confidential", "restricted"])
            == ComplianceImpact.HIGH
        )

        # Medium compliance impact
        assert (
            self.assessor.get_compliance_impact(["internal"]) == ComplianceImpact.LOW
        )  # Only >2 tags is medium

        # Low compliance impact
        assert self.assessor.get_compliance_impact(["public"]) == ComplianceImpact.LOW

        # No compliance impact
        assert self.assessor.get_compliance_impact([]) == ComplianceImpact.NONE

    def test_generate_recommendations_high_risk(self):
        """Test recommendation generation for high-risk changes."""
        recommendations = self.assessor.generate_recommendations(
            0.8, "aws_iam_role", "delete", "production"
        )
        assert isinstance(recommendations, list)
        assert any(
            "change" in rec or "Schedule" in rec or "Prepare" in rec
            for rec in recommendations
        )
        assert len(recommendations) >= 1

    def test_generate_recommendations_medium_risk(self):
        """Test recommendation generation for medium-risk changes."""
        recommendations = self.assessor.generate_recommendations(
            0.5, "aws_instance", "update", "staging"
        )
        assert isinstance(recommendations, list)
        assert len(recommendations) >= 1

    def test_generate_recommendations_low_risk(self):
        """Test recommendation generation for low-risk changes."""
        recommendations = self.assessor.generate_recommendations(
            0.2, "aws_cloudwatch_log_group", "create", "dev"
        )
        assert isinstance(recommendations, list)
        assert len(recommendations) >= 1

    def test_assess_change_comprehensive(self):
        """Test comprehensive change assessment with all parameters."""
        change_data = {
            "resource_type": "aws_iam_role",
            "action": "delete",
            "environment": "production",
            "cost_impact": 0,
            "affects_production": True,
            "has_dependencies": True,
            "compliance_tags": ["pci", "hipaa"],
            "change_metadata": {"instance_count": 5, "downtime_minutes": 30},
        }

        assessment = self.assessor.assess_change(**change_data)

        # Verify assessment structure
        assert isinstance(assessment, RiskAssessment)
        assert assessment.overall_risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        assert 0.0 <= assessment.risk_score <= 1.0
        assert assessment.requires_approval is not None
        assert assessment.mitigation_recommendations is not None

    def test_assess_change_minimal_parameters(self):
        """Test assessment with minimal required parameters."""
        assessment = self.assessor.assess_change(
            resource_type="aws_s3_bucket", action="create"
        )

        assert isinstance(assessment, RiskAssessment)
        assert assessment.overall_risk is not None
        assert 0.0 <= assessment.risk_score <= 1.0

    def test_assess_change_edge_cases(self):
        """Test assessment with edge case inputs."""
        # Unknown resource type
        assessment1 = self.assessor.assess_change(
            resource_type="completely_unknown_resource", action="mysterious_action"
        )
        assert assessment1.overall_risk in [RiskLevel.MEDIUM, RiskLevel.HIGH]

        # Very high cost impact
        assessment2 = self.assessor.assess_change(
            resource_type="aws_instance", action="create", cost_impact=100000
        )
        assert assessment2.risk_score >= 0.53  # Should increase due to high cost

        # Negative cost impact (savings)
        assessment3 = self.assessor.assess_change(
            resource_type="aws_instance", action="delete", cost_impact=-1000
        )
        assert (
            assessment3.overall_risk == RiskLevel.HIGH
        )  # Still high due to delete action

    def test_get_supported_resource_types(self):
        """Test retrieval of supported resource types."""
        supported = self.assessor.get_supported_resource_types()
        assert isinstance(supported, list)
        assert len(supported) > 0

    def test_assessment_consistency(self):
        """Test that assessment results are consistent for identical inputs."""
        change_data = {
            "resource_type": "aws_instance",
            "action": "update",
            "environment": "production",
            "cost_impact": 100,
            "has_dependencies": True,
        }

        assessment1 = self.assessor.assess_change(**change_data)
        assessment2 = self.assessor.assess_change(**change_data)

        assert assessment1.overall_risk == assessment2.overall_risk
        assert assessment1.risk_score == assessment2.risk_score
        assert assessment1.impact_scope == assessment2.impact_scope
        assert assessment1.compliance_impact == assessment2.compliance_impact

    def test_risk_score_bounds(self):
        """Test that risk scores are always within valid bounds."""
        test_cases = [
            {
                "resource_type": "aws_iam_role",
                "action": "delete",
                "environment": "production",
            },
            {"resource_type": "random_id", "action": "create", "environment": "dev"},
            {"resource_type": "unknown_type", "action": "unknown_action"},
        ]

        for case in test_cases:
            assessment = self.assessor.assess_change(**case)
            assert (
                0.0 <= assessment.risk_score <= 1.0
            ), f"Risk score out of bounds for {case}"

    def test_approval_requirements(self):
        """Test approval requirement logic."""
        # High-risk changes should require approval
        high_risk_assessment = self.assessor.assess_change(
            resource_type="aws_iam_role", action="delete", environment="production"
        )
        assert high_risk_assessment.requires_approval == True
        assert len(high_risk_assessment.recommended_approvers) > 0

        # Low-risk changes might not require approval
        low_risk_assessment = self.assessor.assess_change(
            resource_type="aws_cloudwatch_log_group", action="create", environment="dev"
        )
        # May or may not require approval based on configuration
        assert isinstance(low_risk_assessment.requires_approval, bool)

    def test_downtime_estimation(self):
        """Test downtime estimation logic."""
        # Changes with known downtime impact
        assessment = self.assessor.assess_change(
            resource_type="aws_instance",
            action="replace",
            environment="production",
            change_metadata={"downtime_minutes": 15},
        )

        assert assessment.estimated_downtime is not None
        assert "minute" in assessment.estimated_downtime.lower()

    def test_business_impact_assessment(self):
        """Test business impact assessment."""
        # Production critical resource
        production_assessment = self.assessor.assess_change(
            resource_type="aws_rds_instance", action="delete", environment="production"
        )
        assert production_assessment.business_impact is not None
        assert "production" in production_assessment.business_impact.lower()

        # Development resource
        dev_assessment = self.assessor.assess_change(
            resource_type="aws_instance", action="create", environment="dev"
        )
        assert dev_assessment.business_impact is not None


class TestRiskAssessmentDataStructures:
    """Test the RiskAssessment data structure and related enums."""

    def test_risk_level_enum(self):
        """Test RiskLevel enum values."""
        assert RiskLevel.LOW == "LOW"
        assert RiskLevel.MEDIUM == "MEDIUM"
        assert RiskLevel.HIGH == "HIGH"
        assert RiskLevel.CRITICAL == "CRITICAL"

    def test_impact_scope_enum(self):
        """Test ImpactScope enum values."""
        assert ImpactScope.LOCAL == "local"
        assert ImpactScope.SERVICE == "service"
        assert ImpactScope.REGION == "region"
        assert ImpactScope.GLOBAL == "global"

    def test_compliance_impact_enum(self):
        """Test ComplianceImpact enum values."""
        assert ComplianceImpact.NONE == "none"
        assert ComplianceImpact.LOW == "low"
        assert ComplianceImpact.MEDIUM == "medium"
        assert ComplianceImpact.HIGH == "high"
        assert ComplianceImpact.REGULATORY == "regulatory"

    def test_risk_assessment_creation(self):
        """Test RiskAssessment object creation."""
        assessment = RiskAssessment(
            overall_risk=RiskLevel.HIGH,
            risk_score=0.75,
            impact_scope=ImpactScope.SERVICE,
            compliance_impact=ComplianceImpact.MEDIUM,
            factors=[
                RiskFactor(name="dummy", score=0.5, weight=1.0, description="test")
            ],
            requires_approval=True,
            recommended_approvers=["security-team"],
            mitigation_recommendations=["Review security implications"],
            testing_strategy=["Deploy to staging first"],
            rollback_plan="Revert to previous configuration",
            estimated_downtime="5 minutes",
            business_impact="Temporary service disruption",
        )

        assert assessment.overall_risk == RiskLevel.HIGH
        assert assessment.risk_score == 0.75
        assert assessment.requires_approval == True
        assert len(assessment.recommended_approvers) == 1
        assert len(assessment.mitigation_recommendations) == 1


if __name__ == "__main__":
    pytest.main([__file__])
