#!/usr/bin/env python3
"""
Comprehensive test runner for Terraform infrastructure testing.
Executes all Terraform-related tests and provides detailed reporting.
"""

import subprocess
import sys
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple
import argparse


class TerraformTestRunner:
    """Test runner specifically for Terraform infrastructure components."""

    def __init__(self, verbose: bool = False, coverage: bool = False):
        self.verbose = verbose
        self.coverage = coverage
        self.test_results = {}
        self.start_time = None

    def run_command(
        self, command: List[str], description: str
    ) -> Tuple[bool, str, str]:
        """Execute a command and return success status with output."""
        if self.verbose:
            print(f"Running: {description}")
            print(f"Command: {' '.join(command)}")

        try:
            result = subprocess.run(
                command, capture_output=True, text=True, timeout=300  # 5 minute timeout
            )

            success = result.returncode == 0
            return success, result.stdout, result.stderr

        except subprocess.TimeoutExpired:
            return False, "", "Test execution timed out after 5 minutes"
        except Exception as e:
            return False, "", f"Failed to execute command: {str(e)}"

    def run_unit_tests(self) -> bool:
        """Run unit tests for Terraform utilities."""
        print("\n" + "=" * 60)
        print("RUNNING UNIT TESTS")
        print("=" * 60)

        test_files = [
            ("tests/test_risk_assessor.py", "Risk Assessor Unit Tests"),
            ("tests/test_terraform_parser.py", "Terraform Parser Unit Tests"),
        ]

        all_passed = True

        for test_file, description in test_files:
            print(f"\n📋 {description}")
            print("-" * 40)

            command = ["python", "-m", "pytest", test_file, "-v"]
            if self.coverage:
                command.extend(["--cov=app.utils", "--cov-report=term-missing"])

            success, stdout, stderr = self.run_command(command, description)

            self.test_results[description] = {
                "success": success,
                "stdout": stdout,
                "stderr": stderr,
            }

            if success:
                print("✅ PASSED")
                if self.verbose:
                    print(stdout)
            else:
                print("❌ FAILED")
                print(f"Error: {stderr}")
                if stdout and self.verbose:
                    print(f"Output: {stdout}")
                all_passed = False

        return all_passed

    def run_integration_tests(self) -> bool:
        """Run integration tests for Terraform API endpoints."""
        print("\n" + "=" * 60)
        print("RUNNING INTEGRATION TESTS")
        print("=" * 60)

        test_files = [
            ("tests/api/v1/test_terraform.py", "Terraform API Integration Tests")
        ]

        all_passed = True

        for test_file, description in test_files:
            print(f"\n🔗 {description}")
            print("-" * 40)

            command = ["python", "-m", "pytest", test_file, "-v"]
            if self.coverage:
                command.extend(
                    ["--cov=app.api.v1.terraform", "--cov-report=term-missing"]
                )

            success, stdout, stderr = self.run_command(command, description)

            self.test_results[description] = {
                "success": success,
                "stdout": stdout,
                "stderr": stderr,
            }

            if success:
                print("✅ PASSED")
                if self.verbose:
                    print(stdout)
            else:
                print("❌ FAILED")
                print(f"Error: {stderr}")
                if stdout and self.verbose:
                    print(f"Output: {stdout}")
                all_passed = False

        return all_passed

    def run_end_to_end_tests(self) -> bool:
        """Run end-to-end tests for complete workflows."""
        print("\n" + "=" * 60)
        print("RUNNING END-TO-END TESTS")
        print("=" * 60)

        print("🌐 End-to-End Terraform Workflow Tests")
        print("-" * 40)

        # Test complete workflow: parse -> assess -> store
        command = [
            "python",
            "-m",
            "pytest",
            "tests/api/v1/test_terraform.py::TestTerraformParseLogEndpoint::test_parse_log_json_success",
            "tests/api/v1/test_terraform.py::TestTerraformAssessRiskEndpoint::test_assess_risk_success",
            "-v",
        ]

        success, stdout, stderr = self.run_command(command, "End-to-End Workflow")

        self.test_results["End-to-End Workflow"] = {
            "success": success,
            "stdout": stdout,
            "stderr": stderr,
        }

        if success:
            print("✅ PASSED")
            if self.verbose:
                print(stdout)
        else:
            print("❌ FAILED")
            print(f"Error: {stderr}")
            if stdout and self.verbose:
                print(f"Output: {stdout}")

        return success

    def run_performance_tests(self) -> bool:
        """Run performance tests for large log files."""
        print("\n" + "=" * 60)
        print("RUNNING PERFORMANCE TESTS")
        print("=" * 60)

        print("⚡ Performance Tests")
        print("-" * 40)

        # Test with large file upload
        command = [
            "python",
            "-m",
            "pytest",
            "tests/api/v1/test_terraform.py::TestTerraformParseLogFileEndpoint::test_parse_log_file_large_file",
            "-v",
            "-s",  # -s to show print statements
        ]

        success, stdout, stderr = self.run_command(command, "Large File Performance")

        self.test_results["Performance Tests"] = {
            "success": success,
            "stdout": stdout,
            "stderr": stderr,
        }

        if success:
            print("✅ PASSED")
            if self.verbose:
                print(stdout)
        else:
            print("❌ FAILED (or skipped due to size limitations)")
            if self.verbose:
                print(f"Output: {stdout}")
                print(f"Error: {stderr}")

        return True  # Performance tests are optional

    def run_security_tests(self) -> bool:
        """Run security-focused tests."""
        print("\n" + "=" * 60)
        print("RUNNING SECURITY TESTS")
        print("=" * 60)

        print("🔒 Security Tests")
        print("-" * 40)

        # Test sensitive data handling
        test_methods = [
            "tests/test_terraform_parser.py::TestTerraformLogParser::test_sanitize_sensitive_data",
            "tests/test_terraform_parser.py::TestTerraformLogParser::test_sanitize_sensitive_data_nested",
        ]

        command = ["python", "-m", "pytest"] + test_methods + ["-v"]

        success, stdout, stderr = self.run_command(command, "Sensitive Data Security")

        self.test_results["Security Tests"] = {
            "success": success,
            "stdout": stdout,
            "stderr": stderr,
        }

        if success:
            print("✅ PASSED")
            if self.verbose:
                print(stdout)
        else:
            print("❌ FAILED")
            print(f"Error: {stderr}")
            if stdout and self.verbose:
                print(f"Output: {stdout}")

        return success

    def run_edge_case_tests(self) -> bool:
        """Run edge case and error handling tests."""
        print("\n" + "=" * 60)
        print("RUNNING EDGE CASE TESTS")
        print("=" * 60)

        print("🎯 Edge Case Tests")
        print("-" * 40)

        # Test edge cases and error conditions
        test_methods = [
            "tests/test_risk_assessor.py::TestInfrastructureRiskAssessor::test_assess_change_edge_cases",
            "tests/test_terraform_parser.py::TestTerraformLogParser::test_parse_log_empty_input",
            "tests/test_terraform_parser.py::TestTerraformLogParser::test_parse_log_format_mismatch",
            "tests/api/v1/test_terraform.py::TestTerraformErrorHandling",
        ]

        command = ["python", "-m", "pytest"] + test_methods + ["-v"]

        success, stdout, stderr = self.run_command(
            command, "Edge Cases and Error Handling"
        )

        self.test_results["Edge Case Tests"] = {
            "success": success,
            "stdout": stdout,
            "stderr": stderr,
        }

        if success:
            print("✅ PASSED")
            if self.verbose:
                print(stdout)
        else:
            print("❌ FAILED")
            print(f"Error: {stderr}")
            if stdout and self.verbose:
                print(f"Output: {stdout}")

        return success

    def generate_coverage_report(self) -> bool:
        """Generate comprehensive coverage report."""
        if not self.coverage:
            return True

        print("\n" + "=" * 60)
        print("GENERATING COVERAGE REPORT")
        print("=" * 60)

        # Run all Terraform tests with coverage
        command = [
            "python",
            "-m",
            "pytest",
            "tests/test_risk_assessor.py",
            "tests/test_terraform_parser.py",
            "tests/api/v1/test_terraform.py",
            "--cov=app.utils.risk_assessor",
            "--cov=app.utils.terraform_parser",
            "--cov=app.api.v1.terraform",
            "--cov-report=html:htmlcov/terraform",
            "--cov-report=term-missing",
            "--cov-report=json:coverage.json",
        ]

        success, stdout, stderr = self.run_command(
            command, "Coverage Report Generation"
        )

        if success:
            print("✅ Coverage report generated")
            print("📊 HTML report: htmlcov/terraform/index.html")
            print("📋 JSON report: coverage.json")
            if self.verbose:
                print(stdout)
        else:
            print("❌ Failed to generate coverage report")
            print(f"Error: {stderr}")

        return success

    def print_summary(self):
        """Print test execution summary."""
        print("\n" + "=" * 60)
        print("TEST EXECUTION SUMMARY")
        print("=" * 60)

        total_tests = len(self.test_results)
        passed_tests = sum(
            1 for result in self.test_results.values() if result["success"]
        )
        failed_tests = total_tests - passed_tests

        print(f"\n📊 Overall Results:")
        print(f"   Total Test Suites: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {failed_tests}")
        print(
            f"   📈 Success Rate: {(passed_tests/total_tests)*100:.1f}%"
            if total_tests > 0
            else "N/A"
        )

        if self.start_time:
            duration = time.time() - self.start_time
            print(f"   ⏱️  Total Time: {duration:.2f} seconds")

        print(f"\n📋 Detailed Results:")
        for test_name, result in self.test_results.items():
            status = "✅ PASSED" if result["success"] else "❌ FAILED"
            print(f"   {status} {test_name}")

        if failed_tests > 0:
            print(
                f"\n❗ {failed_tests} test suite(s) failed. Check output above for details."
            )
            return False
        else:
            print(f"\n🎉 All {passed_tests} test suites passed successfully!")
            return True

    def run_all_tests(self) -> bool:
        """Run the complete test suite."""
        self.start_time = time.time()

        print("🚀 Starting Terraform Infrastructure Test Suite")
        print("=" * 60)

        # Run all test categories
        results = []

        results.append(self.run_unit_tests())
        results.append(self.run_integration_tests())
        results.append(self.run_end_to_end_tests())
        results.append(self.run_performance_tests())
        results.append(self.run_security_tests())
        results.append(self.run_edge_case_tests())

        if self.coverage:
            results.append(self.generate_coverage_report())

        # Print summary
        overall_success = self.print_summary()

        return overall_success and all(results)


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(description="Run Terraform infrastructure tests")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument(
        "-c", "--coverage", action="store_true", help="Generate coverage reports"
    )
    parser.add_argument("--unit-only", action="store_true", help="Run only unit tests")
    parser.add_argument(
        "--integration-only", action="store_true", help="Run only integration tests"
    )
    parser.add_argument(
        "--e2e-only", action="store_true", help="Run only end-to-end tests"
    )

    args = parser.parse_args()

    runner = TerraformTestRunner(verbose=args.verbose, coverage=args.coverage)

    try:
        if args.unit_only:
            success = runner.run_unit_tests()
        elif args.integration_only:
            success = runner.run_integration_tests()
        elif args.e2e_only:
            success = runner.run_end_to_end_tests()
        else:
            success = runner.run_all_tests()

        if success:
            print("\n🎯 All tests completed successfully!")
            sys.exit(0)
        else:
            print("\n💥 Some tests failed!")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n\n⏹️  Test execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Unexpected error during test execution: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
