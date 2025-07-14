#!/usr/bin/env python3
"""
Test Runner for Enhanced Kubernetes Monitoring Components

Comprehensive test runner for all enhanced Kubernetes monitoring tests,
including services, utilities, and API endpoints.
"""

import sys
import os
import subprocess
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def run_tests():
    """Run all enhanced Kubernetes monitoring tests."""

    # Test files to run
    test_files = [
        "tests/services/test_enhanced_kubernetes_service.py",
        "tests/utils/test_prometheus_client.py",
        "tests/utils/test_prometheus_queries.py",
        "tests/api/v1/test_enhanced_kubernetes.py",
    ]

    print("🧪 Running Enhanced Kubernetes Monitoring Tests")
    print("=" * 60)

    total_tests = 0
    passed_tests = 0
    failed_tests = 0

    for test_file in test_files:
        test_path = Path(__file__).parent / test_file

        if not test_path.exists():
            print(f"⚠️  Test file not found: {test_file}")
            continue

        print(f"\n📁 Running tests from: {test_file}")
        print("-" * 40)

        try:
            # Run pytest for the specific test file
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pytest",
                    str(test_path),
                    "-v",
                    "--tb=short",
                    "--no-header",
                ],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent,
            )

            if result.returncode == 0:
                print("✅ Tests passed")
                # Parse pytest output to get test count
                output_lines = result.stdout.split("\n")
                for line in output_lines:
                    if "passed" in line and "::" not in line:
                        try:
                            # Extract number of passed tests
                            import re

                            match = re.search(r"(\d+) passed", line)
                            if match:
                                file_passed = int(match.group(1))
                                passed_tests += file_passed
                                total_tests += file_passed
                        except:
                            pass
            else:
                print("❌ Tests failed")
                print("Error output:")
                print(result.stderr)
                if result.stdout:
                    print("Test output:")
                    print(result.stdout)
                failed_tests += 1

        except Exception as e:
            print(f"❌ Error running tests: {e}")
            failed_tests += 1

    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"Total test files: {len(test_files)}")
    print(f"Tests passed: {passed_tests}")
    print(f"Test files failed: {failed_tests}")

    if failed_tests == 0:
        print("🎉 All enhanced Kubernetes monitoring tests passed!")
        return True
    else:
        print("⚠️  Some tests failed. Please review the output above.")
        return False


def run_specific_component_tests():
    """Run tests for specific components individually."""

    components = {
        "Enhanced Service": "tests/services/test_enhanced_kubernetes_service.py",
        "Prometheus Client": "tests/utils/test_prometheus_client.py",
        "Prometheus Queries": "tests/utils/test_prometheus_queries.py",
        "API Endpoints": "tests/api/v1/test_enhanced_kubernetes.py",
    }

    print("🔧 Component-wise Test Execution")
    print("=" * 60)

    for component_name, test_file in components.items():
        print(f"\n🧩 Testing: {component_name}")
        print("-" * 40)

        test_path = Path(__file__).parent / test_file

        if not test_path.exists():
            print(f"⚠️  Test file not found: {test_file}")
            continue

        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", str(test_path), "-v", "--tb=short"],
                cwd=Path(__file__).parent,
            )

            if result.returncode == 0:
                print(f"✅ {component_name} tests passed")
            else:
                print(f"❌ {component_name} tests failed")

        except Exception as e:
            print(f"❌ Error testing {component_name}: {e}")


def check_test_coverage():
    """Check test coverage for enhanced Kubernetes components."""

    print("📈 Checking Test Coverage")
    print("=" * 60)

    # Files that should have tests
    source_files = [
        "app/services/enhanced_kubernetes_service.py",
        "app/utils/prometheus_client.py",
        "app/utils/prometheus_queries.py",
        "app/api/v1/endpoints/enhanced_kubernetes.py",
    ]

    test_files = [
        "tests/services/test_enhanced_kubernetes_service.py",
        "tests/utils/test_prometheus_client.py",
        "tests/utils/test_prometheus_queries.py",
        "tests/api/v1/test_enhanced_kubernetes.py",
    ]

    coverage_report = []

    for i, source_file in enumerate(source_files):
        source_path = Path(__file__).parent / source_file
        test_path = Path(__file__).parent / test_files[i]

        source_exists = source_path.exists()
        test_exists = test_path.exists()

        if source_exists and test_exists:
            status = "✅ Covered"
        elif source_exists and not test_exists:
            status = "❌ Missing Tests"
        elif not source_exists and test_exists:
            status = "⚠️  Orphaned Tests"
        else:
            status = "❓ Not Found"

        coverage_report.append(
            {"source": source_file, "test": test_files[i], "status": status}
        )

    for item in coverage_report:
        print(f"{item['status']} - {item['source']}")

    return coverage_report


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()

        if command == "coverage":
            check_test_coverage()
        elif command == "components":
            run_specific_component_tests()
        elif command == "all":
            success = run_tests()
            sys.exit(0 if success else 1)
        else:
            print("Usage: python test_enhanced_k8s.py [all|coverage|components]")
            print("  all        - Run all tests")
            print("  coverage   - Check test coverage")
            print("  components - Run tests by component")
            sys.exit(1)
    else:
        # Default: run all tests
        success = run_tests()
        sys.exit(0 if success else 1)
