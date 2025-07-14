"""
Test data for Terraform log parsing and risk assessment testing.
Contains various log formats, scenarios, and edge cases for comprehensive testing.
"""

import json


# JSON Format Test Logs
VALID_JSON_SIMPLE = {
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
                    "values": {"instance_type": "t3.micro", "ami": "ami-12345678"},
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

VALID_JSON_COMPLEX = {
    "format_version": "1.1",
    "terraform_version": "1.5.0",
    "planned_values": {
        "root_module": {
            "resources": [
                {
                    "address": "aws_security_group.web",
                    "mode": "managed",
                    "type": "aws_security_group",
                    "name": "web",
                    "values": {
                        "name": "web-sg",
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
                        ],
                    },
                },
                {
                    "address": "aws_iam_role.app_role",
                    "mode": "managed",
                    "type": "aws_iam_role",
                    "name": "app_role",
                    "values": {
                        "name": "app-execution-role",
                        "assume_role_policy": '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}',
                    },
                },
            ]
        }
    },
    "resource_changes": [
        {
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
        },
        {
            "address": "aws_iam_role.app_role",
            "mode": "managed",
            "type": "aws_iam_role",
            "name": "app_role",
            "change": {
                "actions": ["delete"],
                "before": {
                    "name": "app-execution-role",
                    "assume_role_policy": '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}',
                },
                "after": None,
            },
        },
    ],
}

VALID_JSON_REPLACE_ACTION = {
    "format_version": "1.1",
    "terraform_version": "1.5.0",
    "resource_changes": [
        {
            "address": "aws_instance.database",
            "mode": "managed",
            "type": "aws_instance",
            "name": "database",
            "change": {
                "actions": ["delete", "create"],
                "before": {"instance_type": "t3.small", "ami": "ami-old123"},
                "after": {"instance_type": "t3.medium", "ami": "ami-new456"},
            },
        }
    ],
}

VALID_JSON_SENSITIVE_DATA = {
    "format_version": "1.1",
    "terraform_version": "1.5.0",
    "resource_changes": [
        {
            "address": "aws_db_instance.main",
            "mode": "managed",
            "type": "aws_db_instance",
            "name": "main",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {
                    "db_name": "production_db",
                    "username": "admin",
                    "password": "super_secret_password_123",
                    "engine": "mysql",
                    "engine_version": "8.0",
                    "instance_class": "db.t3.micro",
                },
            },
        },
        {
            "address": "aws_secretsmanager_secret.api_key",
            "mode": "managed",
            "type": "aws_secretsmanager_secret",
            "name": "api_key",
            "change": {
                "actions": ["update"],
                "before": {"secret_string": "old_api_key_value"},
                "after": {"secret_string": "new_api_key_value_xyz789"},
            },
        },
    ],
}

VALID_JSON_EMPTY_CHANGES = {
    "format_version": "1.1",
    "terraform_version": "1.5.0",
    "resource_changes": [],
}

INVALID_JSON_MALFORMED = (
    '{"format_version": "1.1", "terraform_version": "1.5.0", "resource_changes": [{'
)

INVALID_JSON_MISSING_FIELDS = {
    "format_version": "1.1",
    "resource_changes": [
        {
            "address": "aws_instance.incomplete",
            # Missing required fields like "change"
        }
    ],
}


# Human-Readable Format Test Logs
HUMAN_READABLE_SIMPLE = """
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
      + id            = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.
"""

HUMAN_READABLE_COMPLEX = """
Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create
  ~ update in-place
  - destroy

Terraform will perform the following actions:

  # aws_security_group.web will be updated in-place
  ~ resource "aws_security_group" "web" {
        id     = "sg-12345678"
        name   = "web-security-group"
        tags   = {}
        # (4 unchanged attributes hidden)

      ~ ingress {
          ~ cidr_blocks      = [
              - "0.0.0.0/0",
              + "10.0.0.0/8",
            ]
            description      = ""
            from_port        = 80
            ipv6_cidr_blocks = []
            prefix_list_ids  = []
            protocol         = "tcp"
            security_groups  = []
            self             = false
            to_port          = 80
        }
        
      + ingress {
          + cidr_blocks      = [
              + "0.0.0.0/0",
            ]
          + description      = ""
          + from_port        = 443
          + ipv6_cidr_blocks = []
          + prefix_list_ids  = []
          + protocol         = "tcp"
          + security_groups  = []
          + self             = false
          + to_port          = 443
        }
    }

  # aws_iam_role.app_role will be destroyed
  - resource "aws_iam_role" "app_role" {
      - arn                   = "arn:aws:iam::123456789012:role/app-execution-role" -> null
      - assume_role_policy    = jsonencode(
            {
              - Statement = [
                  - {
                      - Action    = "sts:AssumeRole"
                      - Effect    = "Allow"
                      - Principal = {
                          - Service = "ec2.amazonaws.com"
                        }
                    },
                ]
              - Version   = "2012-10-17"
            }
        ) -> null
      - create_date           = "2023-01-01T12:00:00Z" -> null
      - force_detach_policies = false -> null
      - id                    = "app-execution-role" -> null
      - max_session_duration  = 3600 -> null
      - name                  = "app-execution-role" -> null
      - path                  = "/" -> null
      - tags                  = {} -> null
      - unique_id             = "AROAEXAMPLE123456789" -> null
    }

  # aws_instance.database must be replaced
-/+ resource "aws_instance" "database" {
      ~ ami                          = "ami-old123" -> "ami-new456" # forces replacement
      ~ id                           = "i-1234567890abcdef0" -> (known after apply)
      ~ instance_type                = "t3.small" -> "t3.medium"
        # (15 unchanged attributes hidden)
    }

Plan: 1 to add, 1 to change, 1 to destroy.
"""

HUMAN_READABLE_MULTIPLE_RESOURCES = """
Terraform will perform the following actions:

  # aws_s3_bucket.data will be created
  + resource "aws_s3_bucket" "data" {
      + bucket        = "my-data-bucket-prod"
      + force_destroy = false
      + id            = (known after apply)
    }

  # aws_lambda_function.processor will be created
  + resource "aws_lambda_function" "processor" {
      + function_name = "data-processor"
      + handler       = "index.handler"
      + runtime       = "python3.9"
      + timeout       = 30
    }

  # aws_cloudwatch_log_group.app_logs will be created
  + resource "aws_cloudwatch_log_group" "app_logs" {
      + name              = "/aws/lambda/data-processor"
      + retention_in_days = 14
    }

  # random_id.bucket_suffix will be created
  + resource "random_id" "bucket_suffix" {
      + b64_std     = (known after apply)
      + b64_url     = (known after apply)
      + byte_length = 8
      + dec         = (known after apply)
      + hex         = (known after apply)
      + id          = (known after apply)
    }

Plan: 4 to add, 0 to change, 0 to destroy.
"""

HUMAN_READABLE_NO_CHANGES = """
Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:

Terraform will perform the following actions:

Plan: 0 to add, 0 to change, 0 to destroy.

Note: You didn't use the -out option to save this plan, so Terraform can't
guarantee to take exactly these actions if you run "terraform apply" now.
"""

HUMAN_READABLE_MALFORMED = """
This is not a valid terraform plan output.
It's missing the proper structure and symbols.
There are no resource actions or plan summary.
"""


# Risk Assessment Test Data
HIGH_RISK_SCENARIOS = [
    {
        "resource_type": "aws_iam_role",
        "action": "delete",
        "environment": "production",
        "affects_production": True,
        "has_dependencies": True,
        "compliance_tags": ["pci", "hipaa"],
        "expected_risk": "CRITICAL",
    },
    {
        "resource_type": "aws_security_group",
        "action": "update",
        "environment": "production",
        "affects_production": True,
        "compliance_tags": ["sensitive"],
        "expected_risk": "HIGH",
    },
    {
        "resource_type": "aws_rds_instance",
        "action": "replace",
        "environment": "production",
        "cost_impact": 5000,
        "has_dependencies": True,
        "expected_risk": "HIGH",
    },
]

MEDIUM_RISK_SCENARIOS = [
    {
        "resource_type": "aws_instance",
        "action": "update",
        "environment": "staging",
        "cost_impact": 500,
        "expected_risk": "MEDIUM",
    },
    {
        "resource_type": "aws_s3_bucket",
        "action": "create",
        "environment": "production",
        "compliance_tags": ["internal"],
        "expected_risk": "MEDIUM",
    },
    {
        "resource_type": "aws_lambda_function",
        "action": "update",
        "environment": "production",
        "expected_risk": "MEDIUM",
    },
]

LOW_RISK_SCENARIOS = [
    {
        "resource_type": "aws_cloudwatch_log_group",
        "action": "create",
        "environment": "dev",
        "expected_risk": "LOW",
    },
    {
        "resource_type": "random_id",
        "action": "create",
        "environment": "staging",
        "expected_risk": "LOW",
    },
    {
        "resource_type": "aws_s3_bucket",
        "action": "create",
        "environment": "dev",
        "expected_risk": "LOW",
    },
]

EDGE_CASE_SCENARIOS = [
    {
        "resource_type": "unknown_resource_type",
        "action": "mysterious_action",
        "environment": "unknown",
        "expected_risk": "MEDIUM",  # Default to medium for unknowns
    },
    {
        "resource_type": "aws_instance",
        "action": "create",
        "cost_impact": -1000,  # Negative cost (savings)
        "environment": "production",
        "expected_risk": "MEDIUM",
    },
    {
        "resource_type": "aws_iam_role",
        "action": "no-op",
        "environment": "production",
        "expected_risk": "LOW",  # No-op should be low risk regardless of resource type
    },
]


# File Upload Test Data
SAMPLE_JSON_FILE_CONTENT = json.dumps(VALID_JSON_COMPLEX, indent=2)

SAMPLE_TEXT_FILE_CONTENT = HUMAN_READABLE_COMPLEX

LARGE_LOG_CONTENT = (
    """
Terraform will perform the following actions:

"""
    + "\n".join(
        [
            f"""
  # aws_instance.web_{i} will be created
  + resource "aws_instance" "web_{i}" {{
      + ami           = "ami-{i:08d}"
      + instance_type = "t3.micro"
      + id            = (known after apply)
    }}
"""
            for i in range(100)
        ]
    )
    + "\nPlan: 100 to add, 0 to change, 0 to destroy."
)

EMPTY_FILE_CONTENT = ""

BINARY_FILE_CONTENT = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"


# Infrastructure Change Test Data
SAMPLE_INFRASTRUCTURE_CHANGES = [
    {
        "change_id": "change-001",
        "resource_address": "aws_instance.web",
        "resource_type": "aws_instance",
        "action": "create",
        "status": "planned",
        "risk_score": 0.4,
        "risk_level": "MEDIUM",
        "environment": "staging",
        "created_by": "developer1",
        "metadata": {"instance_type": "t3.micro", "estimated_cost": 50},
    },
    {
        "change_id": "change-002",
        "resource_address": "aws_iam_role.app_role",
        "resource_type": "aws_iam_role",
        "action": "delete",
        "status": "requires_approval",
        "risk_score": 0.9,
        "risk_level": "CRITICAL",
        "environment": "production",
        "created_by": "developer2",
        "requires_approval": True,
        "metadata": {"compliance_tags": ["pci", "sensitive"]},
    },
    {
        "change_id": "change-003",
        "resource_address": "aws_s3_bucket.data",
        "resource_type": "aws_s3_bucket",
        "action": "update",
        "status": "approved",
        "risk_score": 0.3,
        "risk_level": "LOW",
        "environment": "dev",
        "created_by": "developer1",
        "approved_by": "team-lead",
        "metadata": {"bucket_policy_change": True},
    },
]


# Test Helper Functions
def get_sample_json_log(scenario="simple"):
    """Get sample JSON log by scenario name."""
    scenarios = {
        "simple": VALID_JSON_SIMPLE,
        "complex": VALID_JSON_COMPLEX,
        "replace": VALID_JSON_REPLACE_ACTION,
        "sensitive": VALID_JSON_SENSITIVE_DATA,
        "empty": VALID_JSON_EMPTY_CHANGES,
        "missing_fields": INVALID_JSON_MISSING_FIELDS,
    }
    return scenarios.get(scenario, VALID_JSON_SIMPLE)


def get_sample_human_log(scenario="simple"):
    """Get sample human-readable log by scenario name."""
    scenarios = {
        "simple": HUMAN_READABLE_SIMPLE,
        "complex": HUMAN_READABLE_COMPLEX,
        "multiple": HUMAN_READABLE_MULTIPLE_RESOURCES,
        "no_changes": HUMAN_READABLE_NO_CHANGES,
        "malformed": HUMAN_READABLE_MALFORMED,
    }
    return scenarios.get(scenario, HUMAN_READABLE_SIMPLE)


def get_risk_scenarios(risk_level="all"):
    """Get risk assessment test scenarios by risk level."""
    if risk_level == "high":
        return HIGH_RISK_SCENARIOS
    elif risk_level == "medium":
        return MEDIUM_RISK_SCENARIOS
    elif risk_level == "low":
        return LOW_RISK_SCENARIOS
    elif risk_level == "edge_cases":
        return EDGE_CASE_SCENARIOS
    else:
        return (
            HIGH_RISK_SCENARIOS
            + MEDIUM_RISK_SCENARIOS
            + LOW_RISK_SCENARIOS
            + EDGE_CASE_SCENARIOS
        )


def get_sample_infrastructure_change(index=0):
    """Get sample infrastructure change by index."""
    if 0 <= index < len(SAMPLE_INFRASTRUCTURE_CHANGES):
        return SAMPLE_INFRASTRUCTURE_CHANGES[index]
    return SAMPLE_INFRASTRUCTURE_CHANGES[0]
