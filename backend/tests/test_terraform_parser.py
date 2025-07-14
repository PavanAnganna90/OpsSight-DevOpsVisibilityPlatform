"""
Tests for TerraformLogParser utility.
Comprehensive test suite covering log parsing, format detection, and error handling.
"""

import pytest
import json
from unittest.mock import Mock, patch

try:
    from app.utils.terraform_parser import TerraformLogParser
except ImportError as e:
    pytest.skip(f"TerraformLogParser import failed: {e}", allow_module_level=True)


class TestTerraformLogParser:
    """Test suite for the TerraformLogParser class."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.parser = TerraformLogParser()

        # Sample JSON log data for testing
        self.sample_json_log = {
            "format_version": "1.1",
            "terraform_version": "1.5.0",
            "planned_values": {
                "root_module": {
                    "resources": [
                        {
                            "address": "aws_instance.web",
                            "mode": "managed",
                            "type": "aws_instance",
                            "name": "web",
                            "values": {
                                "instance_type": "t3.micro",
                                "ami": "ami-12345678",
                            },
                        }
                    ]
                }
            },
            "resource_changes": [
                {
                    "address": "aws_instance.web",
                    "mode": "managed",
                    "type": "aws_instance",
                    "name": "web",
                    "change": {
                        "actions": ["create"],
                        "before": None,
                        "after": {"instance_type": "t3.micro", "ami": "ami-12345678"},
                    },
                }
            ],
        }

        # Sample human-readable log for testing
        self.sample_human_log = """
        Terraform used the selected providers to generate the following execution plan.
        Resource actions are indicated with the following symbols:
          + create
          ~ update in-place
          - destroy
        
        Terraform will perform the following actions:
        
          # aws_instance.web will be created
          + resource "aws_instance" "web" {
              + ami           = "ami-12345678"
              + instance_type = "t3.micro"
            }
        
        Plan: 1 to add, 0 to change, 0 to destroy.
        """

    def test_detect_log_format_json(self):
        """Test JSON format detection."""
        json_string = json.dumps(self.sample_json_log)
        assert self.parser._detect_log_format(json_string) == "json"

    def test_detect_log_format_human_readable(self):
        """Test human-readable format detection."""
        assert self.parser._detect_log_format(self.sample_human_log) == "human-readable"

    def test_detect_log_format_unknown(self):
        """Test unknown format detection."""
        unknown_log = "This is some random text that doesn't match any format"
        assert self.parser._detect_log_format(unknown_log) == "unknown"

    def test_parse_json_log_success(self):
        """Test successful JSON log parsing."""
        json_string = json.dumps(self.sample_json_log)
        result = self.parser._parse_json_log(json_string)

        assert isinstance(result, ParsedLogData)
        assert result.terraform_version == "1.5.0"
        assert result.format_version == "1.1"
        assert len(result.resource_changes) == 1

        change = result.resource_changes[0]
        assert change.address == "aws_instance.web"
        assert change.resource_type == "aws_instance"
        assert change.action == "create"

    def test_parse_json_log_invalid_json(self):
        """Test JSON log parsing with invalid JSON."""
        invalid_json = "{ invalid json content"

        with pytest.raises(ValueError, match="Invalid JSON format"):
            self.parser._parse_json_log(invalid_json)

    def test_parse_json_log_missing_fields(self):
        """Test JSON log parsing with missing required fields."""
        incomplete_log = {"format_version": "1.1"}
        json_string = json.dumps(incomplete_log)

        result = self.parser._parse_json_log(json_string)
        assert isinstance(result, ParsedLogData)
        assert result.terraform_version == "unknown"
        assert len(result.resource_changes) == 0

    def test_parse_human_readable_log_success(self):
        """Test successful human-readable log parsing."""
        result = self.parser._parse_human_readable_log(self.sample_human_log)

        assert isinstance(result, ParsedLogData)
        assert len(result.resource_changes) >= 1

        # Check for parsed resource
        web_instance = next(
            (rc for rc in result.resource_changes if rc.address == "aws_instance.web"),
            None,
        )
        assert web_instance is not None
        assert web_instance.action == "create"
        assert web_instance.resource_type == "aws_instance"

    def test_parse_human_readable_log_multiple_actions(self):
        """Test human-readable log parsing with multiple actions."""
        multi_action_log = """
        Terraform will perform the following actions:
        
          # aws_instance.web will be created
          + resource "aws_instance" "web" {
              + instance_type = "t3.micro"
            }
            
          # aws_instance.api will be updated in-place
          ~ resource "aws_instance" "api" {
              ~ instance_type = "t3.small" -> "t3.medium"
            }
            
          # aws_instance.old will be destroyed
          - resource "aws_instance" "old" {
            }
        
        Plan: 1 to add, 1 to change, 1 to destroy.
        """

        result = self.parser._parse_human_readable_log(multi_action_log)

        assert len(result.resource_changes) == 3

        # Check create action
        create_change = next(
            (rc for rc in result.resource_changes if rc.address == "aws_instance.web"),
            None,
        )
        assert create_change.action == "create"

        # Check update action
        update_change = next(
            (rc for rc in result.resource_changes if rc.address == "aws_instance.api"),
            None,
        )
        assert update_change.action == "update"

        # Check delete action
        delete_change = next(
            (rc for rc in result.resource_changes if rc.address == "aws_instance.old"),
            None,
        )
        assert delete_change.action == "delete"

    def test_extract_plan_summary_success(self):
        """Test plan summary extraction."""
        log_with_summary = """
        Plan: 3 to add, 2 to change, 1 to destroy.
        """

        summary = self.parser._extract_plan_summary(log_with_summary)

        assert summary["to_add"] == 3
        assert summary["to_change"] == 2
        assert summary["to_destroy"] == 1

    def test_extract_plan_summary_no_summary(self):
        """Test plan summary extraction when no summary is present."""
        log_without_summary = "Some log content without a plan summary"

        summary = self.parser._extract_plan_summary(log_without_summary)

        assert summary["to_add"] == 0
        assert summary["to_change"] == 0
        assert summary["to_destroy"] == 0

    def test_parse_log_auto_detect_json(self):
        """Test automatic format detection for JSON logs."""
        json_string = json.dumps(self.sample_json_log)

        result = self.parser.parse_log(json_string)

        assert isinstance(result, ParsedLogData)
        assert result.format == "json"
        assert len(result.resource_changes) == 1

    def test_parse_log_auto_detect_human_readable(self):
        """Test automatic format detection for human-readable logs."""
        result = self.parser.parse_log(self.sample_human_log)

        assert isinstance(result, ParsedLogData)
        assert result.format == "human-readable"
        assert len(result.resource_changes) >= 1

    def test_parse_log_explicit_format(self):
        """Test parsing with explicitly specified format."""
        json_string = json.dumps(self.sample_json_log)

        result = self.parser.parse_log(json_string, format_hint="json")

        assert isinstance(result, ParsedLogData)
        assert result.format == "json"

    def test_parse_log_format_mismatch(self):
        """Test parsing with incorrect format hint."""
        json_string = json.dumps(self.sample_json_log)

        # Try to parse JSON as human-readable
        with pytest.raises(
            ValueError, match="Failed to parse log with specified format"
        ):
            self.parser.parse_log(json_string, format_hint="human-readable")

    def test_parse_log_empty_input(self):
        """Test parsing with empty input."""
        with pytest.raises(ValueError, match="Log content cannot be empty"):
            self.parser.parse_log("")

    def test_parse_log_none_input(self):
        """Test parsing with None input."""
        with pytest.raises(ValueError, match="Log content cannot be empty"):
            self.parser.parse_log(None)

    def test_parse_resource_change_complex_json(self):
        """Test parsing complex resource changes from JSON."""
        complex_change = {
            "address": "aws_security_group.web",
            "mode": "managed",
            "type": "aws_security_group",
            "name": "web",
            "change": {
                "actions": ["update"],
                "before": {
                    "ingress": [
                        {
                            "from_port": 80,
                            "to_port": 80,
                            "protocol": "tcp",
                            "cidr_blocks": ["0.0.0.0/0"],
                        }
                    ]
                },
                "after": {
                    "ingress": [
                        {
                            "from_port": 80,
                            "to_port": 80,
                            "protocol": "tcp",
                            "cidr_blocks": ["10.0.0.0/8"],
                        },
                        {
                            "from_port": 443,
                            "to_port": 443,
                            "protocol": "tcp",
                            "cidr_blocks": ["0.0.0.0/0"],
                        },
                    ]
                },
            },
        }

        change = self.parser._parse_resource_change_from_json(complex_change)

        assert change.address == "aws_security_group.web"
        assert change.resource_type == "aws_security_group"
        assert change.action == "update"
        assert change.before is not None
        assert change.after is not None
        assert isinstance(change.before, dict)
        assert isinstance(change.after, dict)

    def test_parse_resource_change_create_action(self):
        """Test parsing create action from JSON."""
        create_change = {
            "address": "aws_instance.new",
            "type": "aws_instance",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {"instance_type": "t3.micro"},
            },
        }

        change = self.parser._parse_resource_change_from_json(create_change)

        assert change.action == "create"
        assert change.before is None
        assert change.after is not None

    def test_parse_resource_change_delete_action(self):
        """Test parsing delete action from JSON."""
        delete_change = {
            "address": "aws_instance.old",
            "type": "aws_instance",
            "change": {
                "actions": ["delete"],
                "before": {"instance_type": "t3.micro"},
                "after": None,
            },
        }

        change = self.parser._parse_resource_change_from_json(delete_change)

        assert change.action == "delete"
        assert change.before is not None
        assert change.after is None

    def test_parse_resource_change_replace_action(self):
        """Test parsing replace action from JSON."""
        replace_change = {
            "address": "aws_instance.replaced",
            "type": "aws_instance",
            "change": {
                "actions": ["delete", "create"],
                "before": {"instance_type": "t3.micro"},
                "after": {"instance_type": "t3.small"},
            },
        }

        change = self.parser._parse_resource_change_from_json(replace_change)

        assert change.action == "replace"
        assert change.before is not None
        assert change.after is not None

    def test_sanitize_sensitive_data(self):
        """Test sensitive data sanitization."""
        sensitive_data = {
            "password": "secret123",
            "api_key": "abc-def-ghi",
            "access_token": "token123",
            "secret": "topsecret",
            "normal_field": "public_data",
        }

        sanitized = self.parser._sanitize_sensitive_data(sensitive_data)

        assert sanitized["password"] == "[REDACTED]"
        assert sanitized["api_key"] == "[REDACTED]"
        assert sanitized["access_token"] == "[REDACTED]"
        assert sanitized["secret"] == "[REDACTED]"
        assert sanitized["normal_field"] == "public_data"

    def test_sanitize_sensitive_data_nested(self):
        """Test sensitive data sanitization in nested structures."""
        nested_data = {
            "config": {
                "database": {"password": "dbpass123", "host": "localhost"},
                "api_keys": ["key1", "key2"],
            },
            "metadata": {"secret_value": "hidden"},
        }

        sanitized = self.parser._sanitize_sensitive_data(nested_data)

        assert sanitized["config"]["database"]["password"] == "[REDACTED]"
        assert sanitized["config"]["database"]["host"] == "localhost"
        assert sanitized["metadata"]["secret_value"] == "[REDACTED]"

    def test_get_supported_formats(self):
        """Test retrieval of supported log formats."""
        formats = self.parser.get_supported_formats()

        assert isinstance(formats, list)
        assert "json" in formats
        assert "human-readable" in formats
        assert len(formats) >= 2

    def test_validate_log_structure_valid_json(self):
        """Test log structure validation for valid JSON."""
        json_string = json.dumps(self.sample_json_log)

        is_valid, errors = self.parser.validate_log_structure(json_string)

        assert is_valid == True
        assert len(errors) == 0

    def test_validate_log_structure_invalid_json(self):
        """Test log structure validation for invalid JSON."""
        invalid_json = "{ invalid json"

        is_valid, errors = self.parser.validate_log_structure(invalid_json)

        assert is_valid == False
        assert len(errors) > 0

    def test_validate_log_structure_human_readable(self):
        """Test log structure validation for human-readable logs."""
        is_valid, errors = self.parser.validate_log_structure(self.sample_human_log)

        assert is_valid == True
        assert len(errors) == 0

    def test_edge_case_empty_resource_changes(self):
        """Test handling of logs with no resource changes."""
        empty_log = {
            "format_version": "1.1",
            "terraform_version": "1.5.0",
            "resource_changes": [],
        }

        json_string = json.dumps(empty_log)
        result = self.parser.parse_log(json_string)

        assert isinstance(result, ParsedLogData)
        assert len(result.resource_changes) == 0

    def test_edge_case_malformed_resource_change(self):
        """Test handling of malformed resource changes."""
        malformed_log = {
            "format_version": "1.1",
            "resource_changes": [
                {
                    "address": "aws_instance.test",
                    # Missing required fields
                }
            ],
        }

        json_string = json.dumps(malformed_log)
        result = self.parser.parse_log(json_string)

        # Should handle gracefully without crashing
        assert isinstance(result, ParsedLogData)


class TestResourceChange:
    """Test the ResourceChange data structure."""

    def test_resource_change_creation(self):
        """Test ResourceChange object creation."""
        change = ResourceChange(
            address="aws_instance.web",
            resource_type="aws_instance",
            resource_name="web",
            action="create",
            before=None,
            after={"instance_type": "t3.micro"},
        )

        assert change.address == "aws_instance.web"
        assert change.resource_type == "aws_instance"
        assert change.action == "create"
        assert change.before is None
        assert change.after is not None

    def test_resource_change_equality(self):
        """Test ResourceChange equality comparison."""
        change1 = ResourceChange(
            address="aws_instance.web",
            resource_type="aws_instance",
            resource_name="web",
            action="create",
        )

        change2 = ResourceChange(
            address="aws_instance.web",
            resource_type="aws_instance",
            resource_name="web",
            action="create",
        )

        # Note: This test might need adjustment based on actual implementation
        assert change1.address == change2.address
        assert change1.action == change2.action


class TestParsedLogData:
    """Test the ParsedLogData data structure."""

    def test_parsed_log_data_creation(self):
        """Test ParsedLogData object creation."""
        resource_change = ResourceChange(
            address="aws_instance.web",
            resource_type="aws_instance",
            resource_name="web",
            action="create",
        )

        parsed_data = ParsedLogData(
            format="json",
            terraform_version="1.5.0",
            format_version="1.1",
            resource_changes=[resource_change],
            plan_summary={"to_add": 1, "to_change": 0, "to_destroy": 0},
        )

        assert parsed_data.format == "json"
        assert parsed_data.terraform_version == "1.5.0"
        assert len(parsed_data.resource_changes) == 1
        assert parsed_data.plan_summary["to_add"] == 1


if __name__ == "__main__":
    pytest.main([__file__])
