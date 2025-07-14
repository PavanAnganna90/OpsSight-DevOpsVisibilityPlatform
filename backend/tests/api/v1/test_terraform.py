"""
Integration tests for Terraform API endpoints.
Testing all endpoints with various scenarios including success, error, and edge cases.
"""

import pytest
import json
import io
from httpx import AsyncClient, ASGITransport
from unittest.mock import Mock, patch
from app.main import app
from app.utils.terraform_parser import TerraformLogParser
from app.utils.risk_assessor import (
    RiskAssessment,
    RiskLevel,
    ImpactScope,
    ComplianceImpact,
)

try:
    from app.utils.terraform_parser import TerraformLogParser
except ImportError as e:
    pytest.skip(f"TerraformLogParser import failed: {e}", allow_module_level=True)


@pytest.mark.asyncio
async def test_example():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/api/v1/terraform/some-endpoint")


class TestTerraformParseLogEndpoint:
    """Test the /terraform/parse-log endpoint."""

    @pytest.mark.asyncio
    async def test_parse_log_json_success(self):
        """Test successful JSON log parsing."""
        sample_log = {
            "format_version": "1.1",
            "terraform_version": "1.5.0",
            "resource_changes": [
                {
                    "address": "aws_instance.web",
                    "type": "aws_instance",
                    "change": {
                        "actions": ["create"],
                        "before": None,
                        "after": {"instance_type": "t3.micro"},
                    },
                }
            ],
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log",
                json={"log_content": json.dumps(sample_log)},
            )

        assert response.status_code == 200
        data = response.json()

        if "parsed_data" not in data or "risk_assessment" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["parsed_data"]["format"] == "json"
        assert len(data["parsed_data"]["resource_changes"]) == 1
        assert data["risk_assessment"]["overall_risk"] in [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL",
        ]

    @pytest.mark.asyncio
    async def test_parse_log_human_readable_success(self):
        """Test successful human-readable log parsing."""
        human_log = """
        Terraform will perform the following actions:
        
          # aws_instance.web will be created
          + resource "aws_instance" "web" {
              + instance_type = "t3.micro"
            }
        
        Plan: 1 to add, 0 to change, 0 to destroy.
        """

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log", json={"log_content": human_log}
            )

        assert response.status_code == 200
        data = response.json()

        if "parsed_data" not in data or "risk_assessment" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["parsed_data"]["format"] == "human-readable"

    @pytest.mark.asyncio
    async def test_parse_log_with_format_hint(self):
        """Test log parsing with explicit format hint."""
        sample_log = {"format_version": "1.1", "resource_changes": []}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log",
                json={"log_content": json.dumps(sample_log), "format_hint": "json"},
            )

        assert response.status_code == 200
        data = response.json()
        if "parsed_data" not in data or "risk_assessment" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["parsed_data"]["format"] == "json"

    @pytest.mark.asyncio
    async def test_parse_log_with_environment(self):
        """Test log parsing with environment parameter."""
        sample_log = {
            "format_version": "1.1",
            "resource_changes": [
                {
                    "address": "aws_instance.web",
                    "type": "aws_instance",
                    "change": {
                        "actions": ["delete"],
                        "before": {"instance_type": "t3.micro"},
                        "after": None,
                    },
                }
            ],
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log",
                json={
                    "log_content": json.dumps(sample_log),
                    "environment": "production",
                },
            )

        assert response.status_code == 200
        data = response.json()

        if "parsed_data" not in data or "risk_assessment" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        # Production + delete action should increase risk
        risk_score = data["risk_assessment"]["risk_score"]
        assert risk_score >= 0.5  # Should be higher risk

    @pytest.mark.asyncio
    async def test_parse_log_empty_content(self):
        """Test parsing with empty log content."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log", json={"log_content": ""}
            )

        assert response.status_code == 400
        if "error" not in response.json() or "detail" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error or detail in response: {response.json()}"
        assert "Log content cannot be empty" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_parse_log_invalid_json(self):
        """Test parsing with invalid JSON content."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log",
                json={"log_content": "{ invalid json content"},
            )

        assert response.status_code == 400
        if "error" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error in response: {response.json()}"

    @pytest.mark.asyncio
    async def test_parse_log_missing_content(self):
        """Test parsing without log_content parameter."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/parse-log", json={})

        assert response.status_code == 422  # Validation error
        if "error" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error in response: {response.json()}"


class TestTerraformParseLogFileEndpoint:
    """Test the /terraform/parse-log-file endpoint."""

    @pytest.mark.asyncio
    async def test_parse_log_file_json_success(self):
        """Test successful JSON file upload and parsing."""
        sample_log = {
            "format_version": "1.1",
            "terraform_version": "1.5.0",
            "resource_changes": [
                {
                    "address": "aws_s3_bucket.data",
                    "type": "aws_s3_bucket",
                    "change": {
                        "actions": ["create"],
                        "before": None,
                        "after": {"bucket": "my-data-bucket"},
                    },
                }
            ],
        }

        json_content = json.dumps(sample_log)

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log-file",
                files={
                    "file": (
                        "terraform.json",
                        io.BytesIO(json_content.encode()),
                        "application/json",
                    )
                },
                data={"environment": "staging"},
            )

        assert response.status_code == 200
        data = response.json()

        if "parsed_data" not in data or "risk_assessment" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["parsed_data"]["format"] == "json"
        assert len(data["parsed_data"]["resource_changes"]) == 1

    @pytest.mark.asyncio
    async def test_parse_log_file_text_success(self):
        """Test successful text file upload and parsing."""
        human_log = """
        Terraform will perform the following actions:
        
          # aws_security_group.web will be updated in-place
          ~ resource "aws_security_group" "web" {
              ~ ingress = [
                  - {
                      cidr_blocks = ["0.0.0.0/0"]
                      from_port   = 80
                      protocol    = "tcp"
                      to_port     = 80
                    },
                  + {
                      cidr_blocks = ["10.0.0.0/8"]
                      from_port   = 80
                      protocol    = "tcp"
                      to_port     = 80
                    },
                ]
            }
        
        Plan: 0 to add, 1 to change, 0 to destroy.
        """

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log-file",
                files={
                    "file": (
                        "terraform.txt",
                        io.BytesIO(human_log.encode()),
                        "text/plain",
                    )
                },
                data={"environment": "production"},
            )

        assert response.status_code == 200
        data = response.json()

        if "parsed_data" not in data or "risk_assessment" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["parsed_data"]["format"] == "human-readable"
        assert len(data["parsed_data"]["resource_changes"]) >= 1

    @pytest.mark.asyncio
    async def test_parse_log_file_no_file(self):
        """Test endpoint without file upload."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/parse-log-file")

        assert response.status_code == 422  # Validation error
        if "error" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error in response: {response.json()}"

    @pytest.mark.asyncio
    async def test_parse_log_file_empty_file(self):
        """Test endpoint with empty file."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log-file",
                files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
            )

        assert response.status_code == 400
        if "error" not in response.json() or "detail" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error or detail in response: {response.json()}"
        assert "Log content cannot be empty" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_parse_log_file_large_file(self):
        """Test endpoint with large file."""
        # Create a large log content (simulate large file)
        large_content = "# Large terraform log\n" * 1000

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/parse-log-file",
                files={
                    "file": (
                        "large.txt",
                        io.BytesIO(large_content.encode()),
                        "text/plain",
                    )
                },
            )

        # Should handle large files gracefully
        assert response.status_code in [
            200,
            400,
            413,
        ]  # Success, bad request, or payload too large
        if response.status_code != 200:
            print("Response:", response.json())
            assert response.status_code == 200


class TestTerraformAssessRiskEndpoint:
    """Test the /terraform/assess-risk endpoint."""

    @pytest.mark.asyncio
    async def test_assess_risk_success(self):
        """Test successful risk assessment."""
        risk_data = {
            "resource_type": "aws_iam_role",
            "action": "delete",
            "environment": "production",
            "cost_impact": 0,
            "affects_production": True,
            "has_dependencies": True,
            "compliance_tags": ["pci"],
            "change_metadata": {"downtime_minutes": 15},
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/assess-risk", json=risk_data)

        assert response.status_code == 200
        data = response.json()

        if (
            "overall_risk" not in data
            or "risk_score" not in data
            or "requires_approval" not in data
            or "mitigation_recommendations" not in data
        ):
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["overall_risk"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert 0.0 <= data["risk_score"] <= 1.0

    @pytest.mark.asyncio
    async def test_assess_risk_minimal_data(self):
        """Test risk assessment with minimal required data."""
        risk_data = {"resource_type": "aws_s3_bucket", "action": "create"}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/assess-risk", json=risk_data)

        assert response.status_code == 200
        data = response.json()

        if "overall_risk" not in data or "risk_score" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["overall_risk"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert 0.0 <= data["risk_score"] <= 1.0

    @pytest.mark.asyncio
    async def test_assess_risk_unknown_resource(self):
        """Test risk assessment with unknown resource type."""
        risk_data = {
            "resource_type": "unknown_resource_type",
            "action": "mysterious_action",
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/assess-risk", json=risk_data)

        assert response.status_code == 200
        data = response.json()

        if "overall_risk" not in data:
            print("Response:", data)
            assert False, f"Missing expected key in response: {data}"
        # Should handle unknown resources gracefully
        assert data["overall_risk"] in [
            "MEDIUM",
            "HIGH",
        ]  # Default to higher risk for unknown

    @pytest.mark.asyncio
    async def test_assess_risk_missing_required_fields(self):
        """Test risk assessment with missing required fields."""
        risk_data = {
            "resource_type": "aws_instance"
            # Missing action
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/assess-risk", json=risk_data)

        assert response.status_code == 422  # Validation error
        if "error" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error in response: {response.json()}"

    @pytest.mark.asyncio
    async def test_assess_risk_high_cost_impact(self):
        """Test risk assessment with high cost impact."""
        risk_data = {
            "resource_type": "aws_instance",
            "action": "create",
            "cost_impact": 10000,  # High cost
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/assess-risk", json=risk_data)

        assert response.status_code == 200
        data = response.json()

        if "risk_score" not in data:
            print("Response:", data)
            assert False, f"Missing expected key in response: {data}"
        # High cost should increase risk score
        assert data["risk_score"] >= 0.5


class TestTerraformRiskLevelsEndpoint:
    """Test the /terraform/risk-levels endpoint."""

    @pytest.mark.asyncio
    async def test_get_risk_levels_success(self):
        """Test successful retrieval of risk levels."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/terraform/risk-levels")

        assert response.status_code == 200
        data = response.json()

        if "risk_levels" not in data:
            print("Response:", data)
            assert False, f"Missing expected key in response: {data}"
        risk_levels = data["risk_levels"]

        # Check that all expected risk levels are present
        expected_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        for level in expected_levels:
            if level not in risk_levels:
                print("Response:", data)
                assert False, f"Missing expected risk level in response: {level}"
            if (
                "description" not in risk_levels[level]
                or "threshold_min" not in risk_levels[level]
                or "threshold_max" not in risk_levels[level]
            ):
                print("Response:", data)
                assert (
                    False
                ), f"Missing expected keys in risk level {level}: {risk_levels[level]}"


class TestTerraformSupportedResourcesEndpoint:
    """Test the /terraform/supported-resources endpoint."""

    @pytest.mark.asyncio
    async def test_get_supported_resources_success(self):
        """Test successful retrieval of supported resources."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/terraform/supported-resources")

        assert response.status_code == 200
        data = response.json()

        if "supported_resources" not in data:
            print("Response:", data)
            assert False, f"Missing expected key in response: {data}"
        resources = data["supported_resources"]

        # Check that major cloud providers are present
        assert isinstance(resources, dict)
        assert len(resources) > 0

        # Should contain AWS resources at minimum
        found_aws_resources = False
        for provider_resources in resources.values():
            if isinstance(provider_resources, dict):
                for risk_level, resource_list in provider_resources.items():
                    if any("aws_" in resource for resource in resource_list):
                        found_aws_resources = True
                        break

        if not found_aws_resources:
            print("Response:", data)
            assert False, "Should contain AWS resources"


class TestTerraformInfrastructureChangesEndpoints:
    """Test the infrastructure changes CRUD endpoints."""

    @pytest.mark.asyncio
    async def test_create_infrastructure_change_success(self):
        """Test successful creation of infrastructure change."""
        change_data = {
            "change_id": "test-change-001",
            "resource_address": "aws_instance.web",
            "resource_type": "aws_instance",
            "action": "create",
            "status": "planned",
            "risk_score": 0.4,
            "risk_level": "MEDIUM",
            "environment": "staging",
            "created_by": "test-user",
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/terraform/infrastructure-changes", json=change_data
            )

        assert response.status_code == 201
        data = response.json()

        if "change_id" not in data or "status" not in data or "created_at" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["change_id"] == "test-change-001"
        assert data["status"] == "planned"

    @pytest.mark.asyncio
    async def test_get_infrastructure_changes_success(self):
        """Test successful retrieval of infrastructure changes."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/terraform/infrastructure-changes")

        assert response.status_code == 200
        data = response.json()

        if (
            "changes" not in data
            or "total" not in data
            or "page" not in data
            or "per_page" not in data
        ):
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert isinstance(data["changes"], list)

    @pytest.mark.asyncio
    async def test_get_infrastructure_changes_with_filters(self):
        """Test retrieval with query filters."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get(
                "/api/v1/terraform/infrastructure-changes",
                params={
                    "environment": "production",
                    "status": "approved",
                    "risk_level": "HIGH",
                },
            )

        assert response.status_code == 200
        data = response.json()

        # Verify filtering is applied (structure should be valid)
        if "changes" not in data:
            print("Response:", data)
            assert False, f"Missing expected key in response: {data}"

    @pytest.mark.asyncio
    async def test_get_infrastructure_change_by_id_success(self):
        """Test successful retrieval of specific infrastructure change."""
        # First create a change
        change_data = {
            "change_id": "test-change-002",
            "resource_address": "aws_s3_bucket.data",
            "resource_type": "aws_s3_bucket",
            "action": "create",
            "status": "planned",
            "risk_score": 0.3,
            "risk_level": "LOW",
            "environment": "dev",
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            create_response = await ac.post(
                "/api/v1/terraform/infrastructure-changes", json=change_data
            )
        assert create_response.status_code == 201

        # Then retrieve it
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get(
                "/api/v1/terraform/infrastructure-changes/test-change-002"
            )

        assert response.status_code == 200
        data = response.json()

        if "change_id" not in data or "resource_type" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["change_id"] == "test-change-002"
        assert data["resource_type"] == "aws_s3_bucket"

    @pytest.mark.asyncio
    async def test_get_infrastructure_change_not_found(self):
        """Test retrieval of non-existent infrastructure change."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get(
                "/api/v1/terraform/infrastructure-changes/non-existent-id"
            )

        assert response.status_code == 404
        if "error" not in response.json() or "detail" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error or detail in response: {response.json()}"
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_infrastructure_change_status_success(self):
        """Test successful status update of infrastructure change."""
        # First create a change
        change_data = {
            "change_id": "test-change-003",
            "resource_address": "aws_instance.api",
            "resource_type": "aws_instance",
            "action": "update",
            "status": "planned",
            "risk_score": 0.6,
            "risk_level": "HIGH",
            "environment": "production",
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            create_response = await ac.post(
                "/api/v1/terraform/infrastructure-changes", json=change_data
            )
        assert create_response.status_code == 201

        # Then update its status
        update_data = {"status": "approved", "approved_by": "security-team"}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.put(
                "/api/v1/terraform/infrastructure-changes/test-change-003/status",
                json=update_data,
            )

        assert response.status_code == 200
        data = response.json()

        if "status" not in data or "approved_by" not in data:
            print("Response:", data)
            assert False, f"Missing expected keys in response: {data}"
        assert data["status"] == "approved"
        assert data["approved_by"] == "security-team"

    @pytest.mark.asyncio
    async def test_delete_infrastructure_change_success(self):
        """Test successful deletion of infrastructure change."""
        # First create a change
        change_data = {
            "change_id": "test-change-004",
            "resource_address": "aws_lambda_function.processor",
            "resource_type": "aws_lambda_function",
            "action": "delete",
            "status": "planned",
            "risk_score": 0.7,
            "risk_level": "HIGH",
            "environment": "staging",
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            create_response = await ac.post(
                "/api/v1/terraform/infrastructure-changes", json=change_data
            )
        assert create_response.status_code == 201

        # Then delete it
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.delete(
                "/api/v1/terraform/infrastructure-changes/test-change-004"
            )

        assert response.status_code == 204

        # Verify it's deleted
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            get_response = await ac.get(
                "/api/v1/terraform/infrastructure-changes/test-change-004"
            )
        assert get_response.status_code == 404


class TestTerraformErrorHandling:
    """Test error handling across Terraform endpoints."""

    @pytest.mark.asyncio
    async def test_internal_server_error_handling(self):
        """Test handling of internal server errors."""
        # This would require mocking internal functions to raise exceptions
        # For now, test with malformed data that might cause processing errors

        malformed_data = {
            "log_content": "This is completely invalid terraform log content that should cause processing issues"
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/parse-log", json=malformed_data)

        # Should handle gracefully with appropriate error message
        if response.status_code not in [400, 422, 500]:
            print("Response:", response.json())
            assert (
                False
            ), f"Expected status code in [400, 422, 500], got: {response.status_code}"

    @pytest.mark.asyncio
    async def test_request_validation_errors(self):
        """Test request validation error handling."""
        # Send request with wrong field types
        invalid_data = {
            "log_content": 12345,  # Should be string
            "environment": ["production"],  # Should be string
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/terraform/parse-log", json=invalid_data)

        assert response.status_code == 422
        if "error" not in response.json():
            print("Response:", response.json())
            assert False, f"Expected error in response: {response.json()}"

    @pytest.mark.asyncio
    async def test_method_not_allowed(self):
        """Test method not allowed error handling."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.patch("/api/v1/terraform/parse-log")

        assert response.status_code == 405


if __name__ == "__main__":
    pytest.main([__file__])
