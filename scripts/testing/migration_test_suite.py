#!/usr/bin/env python3
"""
OpsSight Migration Test Suite

This script provides comprehensive testing for database migrations including:
- Pre-migration validation
- Migration process testing
- Data integrity verification
- Performance impact assessment
- Rollback testing

Usage:
    python scripts/testing/migration_test_suite.py --test-type [all|integrity|performance|rollback]
    python scripts/testing/migration_test_suite.py --environment staging
"""

import argparse
import sys
import logging
import time
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

# Add the backend app to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text, func
from app.core.database import SessionLocal
from app.models import Organization, User, Role, Metric, LogEntry, AuditLog
import subprocess


logger = logging.getLogger(__name__)


class MigrationTestSuite:
    """
    Comprehensive test suite for database migration validation.
    
    Tests:
    - Data integrity
    - Performance impact
    - Rollback procedures
    - Schema validation
    """
    
    def __init__(self, environment: str = "staging"):
        """
        Initialize test suite.
        
        Args:
            environment: Target environment for testing
        """
        self.environment = environment
        self.SessionLocal = SessionLocal
        self.test_results = {}
        self.performance_metrics = {}
        self._setup_logging()
        
    def _setup_logging(self):
        """Configure logging for test suite."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'migration_test_{self.environment}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
    def run_all_tests(self) -> Dict[str, bool]:
        """
        Run complete test suite.
        
        Returns:
            Dict[str, bool]: Test results by test name
        """
        logger.info("Starting comprehensive migration test suite")
        
        test_methods = [
            ("Schema Validation", self.test_schema_validation),
            ("Data Integrity", self.test_data_integrity),
            ("Foreign Key Constraints", self.test_foreign_key_constraints),
            ("Multi-tenancy Isolation", self.test_multi_tenancy_isolation),
            ("RBAC Functionality", self.test_rbac_functionality),
            ("Time-series Operations", self.test_time_series_operations),
            ("Audit Logging", self.test_audit_logging),
            ("Performance Impact", self.test_performance_impact),
            ("Rollback Procedures", self.test_rollback_procedures),
        ]
        
        for test_name, test_method in test_methods:
            logger.info(f"Running test: {test_name}")
            try:
                self.test_results[test_name] = test_method()
                if self.test_results[test_name]:
                    logger.info(f"✅ {test_name}: PASSED")
                else:
                    logger.error(f"❌ {test_name}: FAILED")
            except Exception as e:
                logger.error(f"❌ {test_name}: ERROR - {str(e)}")
                self.test_results[test_name] = False
                
        self._generate_test_report()
        return self.test_results
        
    def test_schema_validation(self) -> bool:
        """Test database schema validation."""
        logger.info("Testing schema validation")
        
        with self.SessionLocal() as session:
            try:
                # Check current schema version
                result = session.execute(text("SELECT version_num FROM alembic_version"))
                current_version = result.scalar()
                
                if current_version != "80bd6a3c3fa1":
                    logger.error(f"Unexpected schema version: {current_version}")
                    return False
                
                # Validate required tables exist
                required_tables = [
                    'organizations', 'users', 'roles', 'permissions',
                    'user_roles', 'clusters', 'projects', 'deployments',
                    'metrics', 'log_entries', 'events', 'audit_logs',
                    'audit_configurations'
                ]
                
                for table in required_tables:
                    result = session.execute(text(f"""
                        SELECT COUNT(*) FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    """))
                    if result.scalar() == 0:
                        logger.error(f"Required table missing: {table}")
                        return False
                
                # Validate indexes exist
                critical_indexes = [
                    ('metrics', 'ix_metrics_timestamp_organization'),
                    ('log_entries', 'ix_log_entries_timestamp_organization'),
                    ('audit_logs', 'ix_audit_logs_timestamp_organization')
                ]
                
                for table, index in critical_indexes:
                    result = session.execute(text(f"""
                        SELECT COUNT(*) FROM pg_indexes 
                        WHERE tablename = '{table}' AND indexname = '{index}'
                    """))
                    if result.scalar() == 0:
                        logger.warning(f"Expected index missing: {index} on {table}")
                
                logger.info("Schema validation completed successfully")
                return True
                
            except Exception as e:
                logger.error(f"Schema validation error: {str(e)}")
                return False
                
    def test_data_integrity(self) -> bool:
        """Test data integrity after migration."""
        logger.info("Testing data integrity")
        
        with self.SessionLocal() as session:
            try:
                # Test organization integrity
                org_count = session.query(Organization).count()
                if org_count == 0:
                    logger.error("No organizations found after migration")
                    return False
                
                # Test user integrity
                user_count = session.query(User).count()
                logger.info(f"Found {user_count} users")
                
                # Check for orphaned users
                orphaned_users = session.execute(text("""
                    SELECT COUNT(*) FROM users u 
                    LEFT JOIN organizations o ON u.organization_id = o.id 
                    WHERE u.organization_id IS NOT NULL AND o.id IS NULL
                """)).scalar()
                
                if orphaned_users > 0:
                    logger.error(f"Found {orphaned_users} orphaned users")
                    return False
                
                # Test role assignments
                users_without_roles = session.execute(text("""
                    SELECT COUNT(*) FROM users u 
                    LEFT JOIN user_roles ur ON u.id = ur.user_id 
                    WHERE ur.user_id IS NULL
                """)).scalar()
                
                if users_without_roles > 0:
                    logger.warning(f"Found {users_without_roles} users without roles")
                
                # Verify data consistency
                role_count = session.query(Role).count()
                if role_count < 4:  # Should have at least 4 default roles
                    logger.error(f"Insufficient roles found: {role_count}")
                    return False
                
                logger.info("Data integrity validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Data integrity test error: {str(e)}")
                return False
                
    def test_foreign_key_constraints(self) -> bool:
        """Test foreign key constraint enforcement."""
        logger.info("Testing foreign key constraints")
        
        with self.SessionLocal() as session:
            try:
                # Test organization constraint
                try:
                    session.execute(text("""
                        INSERT INTO users (email, password_hash, organization_id) 
                        VALUES ('test@example.com', 'hash', 99999)
                    """))
                    session.commit()
                    logger.error("Foreign key constraint not enforced for organization_id")
                    return False
                except Exception:
                    session.rollback()
                    logger.info("✅ Organization foreign key constraint working")
                
                # Test role constraint
                try:
                    session.execute(text("""
                        INSERT INTO user_roles (user_id, role_id) 
                        VALUES (99999, 99999)
                    """))
                    session.commit()
                    logger.error("Foreign key constraint not enforced for user_roles")
                    return False
                except Exception:
                    session.rollback()
                    logger.info("✅ User roles foreign key constraint working")
                
                logger.info("Foreign key constraints validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Foreign key constraint test error: {str(e)}")
                return False
                
    def test_multi_tenancy_isolation(self) -> bool:
        """Test multi-tenancy data isolation."""
        logger.info("Testing multi-tenancy isolation")
        
        with self.SessionLocal() as session:
            try:
                # Get all organizations
                organizations = session.query(Organization).all()
                
                if len(organizations) < 1:
                    logger.error("No organizations found for multi-tenancy test")
                    return False
                
                # Test data isolation
                for org in organizations:
                    # Check users belong to organization
                    user_count = session.query(User).filter_by(organization_id=org.id).count()
                    logger.info(f"Organization {org.name}: {user_count} users")
                    
                    # Check metrics isolation
                    metrics_count = session.query(Metric).filter_by(organization_id=org.id).count()
                    logger.info(f"Organization {org.name}: {metrics_count} metrics")
                
                # Verify no cross-organization data leakage
                cross_org_violations = session.execute(text("""
                    SELECT COUNT(*) FROM metrics m
                    JOIN users u ON m.organization_id != u.organization_id
                    WHERE m.organization_id IS NOT NULL AND u.organization_id IS NOT NULL
                """)).scalar()
                
                if cross_org_violations > 0:
                    logger.error(f"Found {cross_org_violations} cross-organization data violations")
                    return False
                
                logger.info("Multi-tenancy isolation validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Multi-tenancy test error: {str(e)}")
                return False
                
    def test_rbac_functionality(self) -> bool:
        """Test RBAC functionality."""
        logger.info("Testing RBAC functionality")
        
        with self.SessionLocal() as session:
            try:
                # Check default roles exist
                expected_roles = ["Admin", "DevOps Engineer", "Developer", "Viewer"]
                
                for role_name in expected_roles:
                    role = session.query(Role).filter_by(name=role_name).first()
                    if not role:
                        logger.error(f"Required role not found: {role_name}")
                        return False
                    logger.info(f"✅ Role found: {role_name} with {len(role.permissions)} permissions")
                
                # Check user-role assignments
                user_role_count = session.execute(text("SELECT COUNT(*) FROM user_roles")).scalar()
                user_count = session.query(User).count()
                
                if user_role_count == 0:
                    logger.error("No user-role assignments found")
                    return False
                
                logger.info(f"User-role assignments: {user_role_count} for {user_count} users")
                
                # Test permission structure
                admin_role = session.query(Role).filter_by(name="Admin").first()
                if admin_role and "*" not in admin_role.permissions:
                    logger.error("Admin role should have wildcard permissions")
                    return False
                
                logger.info("RBAC functionality validation completed")
                return True
                
            except Exception as e:
                logger.error(f"RBAC test error: {str(e)}")
                return False
                
    def test_time_series_operations(self) -> bool:
        """Test time-series data operations."""
        logger.info("Testing time-series operations")
        
        with self.SessionLocal() as session:
            try:
                # Check if TimescaleDB is available
                try:
                    session.execute(text("SELECT * FROM timescaledb_information.hypertables LIMIT 1"))
                    logger.info("✅ TimescaleDB extension available")
                except Exception:
                    logger.warning("TimescaleDB not available, skipping hypertable tests")
                    return True
                
                # Check hypertables
                expected_hypertables = ['metrics', 'log_entries']
                
                for table in expected_hypertables:
                    result = session.execute(text(f"""
                        SELECT COUNT(*) FROM timescaledb_information.hypertables 
                        WHERE hypertable_name = '{table}'
                    """)).scalar()
                    
                    if result > 0:
                        logger.info(f"✅ {table} is configured as hypertable")
                    else:
                        logger.warning(f"{table} is not a hypertable")
                
                # Test time-series data insertion
                test_org = session.query(Organization).first()
                if test_org:
                    # Test metric insertion
                    test_metric = Metric(
                        name="test_metric",
                        value=100.0,
                        unit="count",
                        source="test",
                        organization_id=test_org.id,
                        timestamp=datetime.utcnow()
                    )
                    session.add(test_metric)
                    session.commit()
                    
                    # Clean up
                    session.delete(test_metric)
                    session.commit()
                    
                    logger.info("✅ Time-series data insertion test passed")
                
                logger.info("Time-series operations validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Time-series test error: {str(e)}")
                return False
                
    def test_audit_logging(self) -> bool:
        """Test audit logging functionality."""
        logger.info("Testing audit logging")
        
        with self.SessionLocal() as session:
            try:
                # Check audit configuration exists
                audit_config_count = session.query(AuditConfiguration).count()
                if audit_config_count == 0:
                    logger.warning("No audit configurations found")
                
                # Test audit log creation
                initial_count = session.query(AuditLog).count()
                
                # Create a test organization to trigger audit
                test_org = Organization(
                    name="Test Audit Organization",
                    description="Test organization for audit logging",
                    settings={"test": True}
                )
                session.add(test_org)
                session.commit()
                
                # Check if audit log was created
                final_count = session.query(AuditLog).count()
                
                # Clean up
                session.delete(test_org)
                session.commit()
                
                if final_count > initial_count:
                    logger.info("✅ Audit logging is working")
                else:
                    logger.warning("Audit logging may not be active")
                
                logger.info("Audit logging validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Audit logging test error: {str(e)}")
                return False
                
    def test_performance_impact(self) -> bool:
        """Test performance impact of migration."""
        logger.info("Testing performance impact")
        
        with self.SessionLocal() as session:
            try:
                # Test query performance
                test_queries = [
                    ("Organization count", "SELECT COUNT(*) FROM organizations"),
                    ("User count", "SELECT COUNT(*) FROM users"),
                    ("User with organization", """
                        SELECT u.email, o.name 
                        FROM users u 
                        JOIN organizations o ON u.organization_id = o.id 
                        LIMIT 10
                    """),
                    ("Recent metrics", """
                        SELECT COUNT(*) FROM metrics 
                        WHERE timestamp > NOW() - INTERVAL '1 hour'
                    """),
                ]
                
                for query_name, query in test_queries:
                    start_time = time.time()
                    result = session.execute(text(query))
                    execution_time = time.time() - start_time
                    
                    self.performance_metrics[query_name] = execution_time
                    logger.info(f"Query '{query_name}': {execution_time:.4f}s")
                    
                    # Flag slow queries (> 1 second)
                    if execution_time > 1.0:
                        logger.warning(f"Slow query detected: {query_name}")
                
                # Test index effectiveness
                explain_queries = [
                    "SELECT * FROM users WHERE organization_id = 1",
                    "SELECT * FROM metrics WHERE timestamp > NOW() - INTERVAL '1 hour'",
                ]
                
                for query in explain_queries:
                    result = session.execute(text(f"EXPLAIN (ANALYZE, BUFFERS) {query}"))
                    explain_output = "\n".join([row[0] for row in result])
                    
                    if "Index Scan" in explain_output:
                        logger.info("✅ Query using indexes effectively")
                    elif "Seq Scan" in explain_output:
                        logger.warning("Query performing sequential scan")
                
                logger.info("Performance impact validation completed")
                return True
                
            except Exception as e:
                logger.error(f"Performance test error: {str(e)}")
                return False
                
    def test_rollback_procedures(self) -> bool:
        """Test rollback procedures."""
        logger.info("Testing rollback procedures")
        
        try:
            # Test rollback script existence
            rollback_script = Path(__file__).parent.parent / "rollback" / "rollback_procedures.py"
            if not rollback_script.exists():
                logger.error("Rollback script not found")
                return False
            
            # Test dry-run rollback
            cmd = ["python", str(rollback_script), "--dry-run", "--type", "schema", "--to-revision", "d8b40ecdc203"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Rollback dry-run failed: {result.stderr}")
                return False
            
            logger.info("✅ Rollback procedures available and functional")
            
            # Test Alembic history availability
            cmd = ["alembic", "history"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error("Alembic history not available")
                return False
            
            logger.info("✅ Alembic rollback functionality available")
            logger.info("Rollback procedures validation completed")
            return True
            
        except Exception as e:
            logger.error(f"Rollback test error: {str(e)}")
            return False
            
    def _generate_test_report(self):
        """Generate comprehensive test report."""
        logger.info("Generating test report")
        
        passed_tests = sum(1 for result in self.test_results.values() if result)
        total_tests = len(self.test_results)
        
        logger.info(f"\n{'='*60}")
        logger.info(f"MIGRATION TEST SUITE REPORT")
        logger.info(f"{'='*60}")
        logger.info(f"Environment: {self.environment}")
        logger.info(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"Tests Passed: {passed_tests}/{total_tests}")
        logger.info(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        logger.info(f"{'='*60}")
        
        logger.info("TEST RESULTS:")
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            logger.info(f"  {test_name:<30} {status}")
        
        if self.performance_metrics:
            logger.info(f"\nPERFORMANCE METRICS:")
            for query_name, time_taken in self.performance_metrics.items():
                logger.info(f"  {query_name:<30} {time_taken:.4f}s")
        
        logger.info(f"{'='*60}")
        
        # Overall status
        if passed_tests == total_tests:
            logger.info("🎉 ALL TESTS PASSED - Migration appears successful")
        else:
            logger.warning(f"⚠️  {total_tests - passed_tests} TEST(S) FAILED - Review before proceeding")


def main():
    """Main test suite entry point."""
    parser = argparse.ArgumentParser(description="OpsSight Migration Test Suite")
    parser.add_argument(
        "--test-type",
        choices=["all", "integrity", "performance", "rollback", "schema"],
        default="all",
        help="Type of tests to run"
    )
    parser.add_argument(
        "--environment",
        choices=["staging", "production"],
        default="staging",
        help="Target environment"
    )
    
    args = parser.parse_args()
    
    # Initialize test suite
    test_suite = MigrationTestSuite(environment=args.environment)
    
    success = False
    
    try:
        if args.test_type == "all":
            results = test_suite.run_all_tests()
            success = all(results.values())
            
        elif args.test_type == "integrity":
            success = test_suite.test_data_integrity()
            
        elif args.test_type == "performance":
            success = test_suite.test_performance_impact()
            
        elif args.test_type == "rollback":
            success = test_suite.test_rollback_procedures()
            
        elif args.test_type == "schema":
            success = test_suite.test_schema_validation()
            
    except Exception as e:
        logger.error(f"Test suite failed: {str(e)}")
        return 1
    
    if success:
        logger.info("Test suite completed successfully")
        return 0
    else:
        logger.error("Test suite failed")
        return 1


if __name__ == "__main__":
    sys.exit(main()) 