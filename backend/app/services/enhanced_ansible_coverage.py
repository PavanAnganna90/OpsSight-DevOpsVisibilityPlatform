"""
Enhanced Ansible Coverage Analysis Service

This service extends the base Ansible coverage analysis with advanced features:
- Security and compliance coverage analysis
- Infrastructure coverage mapping
- Real-time coverage monitoring
- Predictive coverage analytics
- Coverage gap detection and remediation recommendations
"""

import json
import logging
from typing import Dict, List, Any, Optional, Set, Tuple, Union
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio

from app.services.ansible_service import AnsibleCoverageAnalyzer
from app.core.cache import CacheService
from app.core.config import settings

logger = logging.getLogger(__name__)


class CoverageLevel(Enum):
    """Coverage level classifications"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    BASIC = "basic"


class ComplianceFramework(Enum):
    """Supported compliance frameworks"""
    CIS = "cis"
    NIST = "nist"
    SOC2 = "soc2"
    PCI_DSS = "pci_dss"
    HIPAA = "hipaa"
    ISO27001 = "iso27001"


@dataclass
class CoverageGap:
    """Represents an identified coverage gap"""
    id: str
    category: str
    severity: str
    title: str
    description: str
    affected_hosts: List[str]
    missing_modules: List[str]
    remediation_priority: int
    estimated_effort: str
    compliance_impact: List[str]
    recommendations: List[str]
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data


@dataclass
class SecurityCoverageMetrics:
    """Security-specific coverage metrics"""
    security_module_coverage: float
    authentication_coverage: float
    authorization_coverage: float
    encryption_coverage: float
    audit_coverage: float
    vulnerability_coverage: float
    compliance_coverage: Dict[str, float]
    security_best_practices_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return asdict(self)


@dataclass
class InfrastructureCoverageMap:
    """Infrastructure coverage mapping"""
    compute_coverage: Dict[str, float]
    network_coverage: Dict[str, float]
    storage_coverage: Dict[str, float]
    security_coverage: Dict[str, float]
    monitoring_coverage: Dict[str, float]
    backup_coverage: Dict[str, float]
    overall_infrastructure_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return asdict(self)


class EnhancedAnsibleCoverageAnalyzer(AnsibleCoverageAnalyzer):
    """Enhanced Ansible coverage analyzer with advanced features"""
    
    # Security-focused module categories
    SECURITY_MODULES = {
        "authentication": [
            "user", "group", "authorized_key", "pam_limits", "login_defs",
            "ssh_config", "sshd_config", "ldap_entry", "sssd"
        ],
        "authorization": [
            "acl", "sefcontext", "selinux", "seport", "sebool", "sudo",
            "sudoers", "iptables", "firewalld", "ufw"
        ],
        "encryption": [
            "crypto_key", "openssl_certificate", "openssl_privatekey",
            "openssl_csr", "luks_device", "crypttab"
        ],
        "audit": [
            "auditd", "audit_rule", "rsyslog", "journald", "logrotate",
            "fail2ban", "aide", "tripwire"
        ],
        "vulnerability": [
            "package", "yum", "apt", "pip", "npm", "gem", "composer",
            "security_updates", "cve_check", "vulnerability_scan"
        ]
    }
    
    # Compliance framework mappings
    COMPLIANCE_MAPPINGS = {
        ComplianceFramework.CIS: {
            "required_modules": ["user", "group", "sshd_config", "iptables", "audit_rule"],
            "critical_controls": ["authentication", "authorization", "audit", "encryption"],
            "scoring_weights": {"authentication": 0.3, "authorization": 0.3, "audit": 0.2, "encryption": 0.2}
        },
        ComplianceFramework.NIST: {
            "required_modules": ["user", "group", "firewalld", "audit_rule", "crypto_key"],
            "critical_controls": ["access_control", "audit", "encryption", "incident_response"],
            "scoring_weights": {"access_control": 0.25, "audit": 0.25, "encryption": 0.25, "incident_response": 0.25}
        },
        ComplianceFramework.SOC2: {
            "required_modules": ["user", "authorized_key", "audit_rule", "logrotate", "backup"],
            "critical_controls": ["logical_access", "monitoring", "backup", "encryption"],
            "scoring_weights": {"logical_access": 0.3, "monitoring": 0.3, "backup": 0.2, "encryption": 0.2}
        }
    }
    
    # Infrastructure tier mappings
    INFRASTRUCTURE_TIERS = {
        "compute": ["service", "systemd", "cron", "mount", "filesystem", "kernel_module"],
        "network": ["iptables", "firewalld", "route", "interface", "dns", "ntp"],
        "storage": ["mount", "filesystem", "lvm", "disk", "backup", "restore"],
        "security": ["user", "group", "firewalld", "selinux", "audit_rule", "crypto_key"],
        "monitoring": ["rsyslog", "logrotate", "monitoring_agent", "metrics", "alerting"],
        "backup": ["backup", "restore", "snapshot", "archive", "recovery"]
    }
    
    def __init__(self, cache_service: Optional[CacheService] = None):
        super().__init__()
        self.cache = cache_service or CacheService()
        self._coverage_gaps_cache = {}
        self._security_baselines = {}
        
    async def analyze_comprehensive_coverage(
        self, 
        execution_data: Dict[str, Any],
        include_security: bool = True,
        include_compliance: bool = True,
        include_infrastructure: bool = True,
        compliance_frameworks: Optional[List[ComplianceFramework]] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive coverage analysis with all enhanced features
        
        Args:
            execution_data: Parsed Ansible execution data
            include_security: Include security coverage analysis
            include_compliance: Include compliance framework analysis
            include_infrastructure: Include infrastructure mapping
            compliance_frameworks: Specific frameworks to analyze
            
        Returns:
            Comprehensive coverage analysis results
        """
        logger.info("Starting comprehensive Ansible coverage analysis")
        
        # Base coverage analysis
        base_coverage = super().analyze_coverage(execution_data)
        
        # Enhanced analysis components
        enhanced_analysis = {
            "base_coverage": base_coverage,
            "enhancement_timestamp": datetime.utcnow().isoformat(),
            "analysis_scope": {
                "security_enabled": include_security,
                "compliance_enabled": include_compliance,
                "infrastructure_enabled": include_infrastructure,
                "frameworks": [f.value for f in (compliance_frameworks or [])]
            }
        }
        
        # Security coverage analysis
        if include_security:
            enhanced_analysis["security_coverage"] = await self._analyze_security_coverage(execution_data)
        
        # Compliance coverage analysis
        if include_compliance:
            frameworks = compliance_frameworks or [ComplianceFramework.CIS, ComplianceFramework.NIST]
            enhanced_analysis["compliance_coverage"] = await self._analyze_compliance_coverage(
                execution_data, frameworks
            )
        
        # Infrastructure coverage mapping
        if include_infrastructure:
            enhanced_analysis["infrastructure_coverage"] = await self._analyze_infrastructure_coverage(execution_data)
        
        # Coverage gap analysis
        enhanced_analysis["coverage_gaps"] = await self._identify_coverage_gaps(
            execution_data, enhanced_analysis
        )
        
        # Predictive analytics
        enhanced_analysis["predictive_insights"] = await self._generate_predictive_insights(execution_data)
        
        # Enhanced recommendations
        enhanced_analysis["enhanced_recommendations"] = await self._generate_enhanced_recommendations(
            execution_data, enhanced_analysis
        )
        
        # Cache results for trend analysis
        await self._cache_coverage_results(enhanced_analysis)
        
        logger.info("Comprehensive coverage analysis completed")
        return enhanced_analysis
    
    async def _analyze_security_coverage(self, execution_data: Dict[str, Any]) -> SecurityCoverageMetrics:
        """Analyze security-specific automation coverage"""
        modules_used = execution_data.get("modules_used", Counter())
        total_modules = sum(modules_used.values())
        
        # Calculate security module coverage by category
        security_scores = {}
        for category, security_modules in self.SECURITY_MODULES.items():
            used_modules = sum(modules_used.get(module, 0) for module in security_modules)
            total_possible = len(security_modules)
            coverage_score = (len([m for m in security_modules if m in modules_used]) / total_possible) * 100
            security_scores[category] = coverage_score
        
        # Calculate overall security metrics
        security_module_coverage = (
            len([m for m in modules_used if self._is_security_module(m)]) / 
            max(len(self._get_all_security_modules()), 1)
        ) * 100
        
        # Security best practices score
        best_practices_score = await self._calculate_security_best_practices_score(execution_data)
        
        # Compliance framework coverage
        compliance_coverage = {}
        for framework in ComplianceFramework:
            compliance_coverage[framework.value] = await self._calculate_framework_coverage(
                execution_data, framework
            )
        
        return SecurityCoverageMetrics(
            security_module_coverage=security_module_coverage,
            authentication_coverage=security_scores.get("authentication", 0),
            authorization_coverage=security_scores.get("authorization", 0),
            encryption_coverage=security_scores.get("encryption", 0),
            audit_coverage=security_scores.get("audit", 0),
            vulnerability_coverage=security_scores.get("vulnerability", 0),
            compliance_coverage=compliance_coverage,
            security_best_practices_score=best_practices_score
        )
    
    async def _analyze_compliance_coverage(
        self, 
        execution_data: Dict[str, Any], 
        frameworks: List[ComplianceFramework]
    ) -> Dict[str, Any]:
        """Analyze coverage against specific compliance frameworks"""
        compliance_analysis = {}
        
        for framework in frameworks:
            framework_mapping = self.COMPLIANCE_MAPPINGS.get(framework, {})
            required_modules = framework_mapping.get("required_modules", [])
            critical_controls = framework_mapping.get("critical_controls", [])
            scoring_weights = framework_mapping.get("scoring_weights", {})
            
            modules_used = execution_data.get("modules_used", Counter())
            
            # Calculate module coverage for this framework
            covered_modules = [m for m in required_modules if m in modules_used]
            module_coverage = (len(covered_modules) / max(len(required_modules), 1)) * 100
            
            # Calculate control coverage
            control_coverage = {}
            for control in critical_controls:
                control_modules = self._get_modules_for_control(control)
                control_covered = [m for m in control_modules if m in modules_used]
                control_coverage[control] = (
                    len(control_covered) / max(len(control_modules), 1)
                ) * 100
            
            # Calculate weighted compliance score
            weighted_score = 0
            for control, weight in scoring_weights.items():
                weighted_score += control_coverage.get(control, 0) * weight
            
            compliance_analysis[framework.value] = {
                "module_coverage": module_coverage,
                "control_coverage": control_coverage,
                "weighted_score": weighted_score,
                "covered_modules": covered_modules,
                "missing_modules": [m for m in required_modules if m not in modules_used],
                "compliance_level": self._determine_compliance_level(weighted_score),
                "recommendations": self._generate_compliance_recommendations(
                    framework, control_coverage, weighted_score
                )
            }
        
        return compliance_analysis
    
    async def _analyze_infrastructure_coverage(
        self, 
        execution_data: Dict[str, Any]
    ) -> InfrastructureCoverageMap:
        """Analyze automation coverage across infrastructure tiers"""
        modules_used = execution_data.get("modules_used", Counter())
        
        # Calculate coverage for each infrastructure tier
        tier_coverage = {}
        for tier, tier_modules in self.INFRASTRUCTURE_TIERS.items():
            covered_modules = [m for m in tier_modules if m in modules_used]
            tier_coverage[tier] = (len(covered_modules) / max(len(tier_modules), 1)) * 100
        
        # Calculate overall infrastructure score
        overall_score = sum(tier_coverage.values()) / len(tier_coverage)
        
        return InfrastructureCoverageMap(
            compute_coverage={"coverage": tier_coverage.get("compute", 0)},
            network_coverage={"coverage": tier_coverage.get("network", 0)},
            storage_coverage={"coverage": tier_coverage.get("storage", 0)},
            security_coverage={"coverage": tier_coverage.get("security", 0)},
            monitoring_coverage={"coverage": tier_coverage.get("monitoring", 0)},
            backup_coverage={"coverage": tier_coverage.get("backup", 0)},
            overall_infrastructure_score=overall_score
        )
    
    async def _identify_coverage_gaps(
        self, 
        execution_data: Dict[str, Any], 
        analysis_results: Dict[str, Any]
    ) -> List[CoverageGap]:
        """Identify and categorize coverage gaps with remediation recommendations"""
        coverage_gaps = []
        
        # Security coverage gaps
        security_coverage = analysis_results.get("security_coverage")
        if security_coverage:
            gaps = await self._identify_security_gaps(execution_data, security_coverage)
            coverage_gaps.extend(gaps)
        
        # Compliance coverage gaps
        compliance_coverage = analysis_results.get("compliance_coverage", {})
        for framework, framework_data in compliance_coverage.items():
            gaps = await self._identify_compliance_gaps(framework, framework_data)
            coverage_gaps.extend(gaps)
        
        # Infrastructure coverage gaps
        infrastructure_coverage = analysis_results.get("infrastructure_coverage")
        if infrastructure_coverage:
            gaps = await self._identify_infrastructure_gaps(execution_data, infrastructure_coverage)
            coverage_gaps.extend(gaps)
        
        # Sort gaps by priority and severity
        coverage_gaps.sort(key=lambda x: (x.remediation_priority, x.severity), reverse=True)
        
        return coverage_gaps
    
    async def _identify_security_gaps(
        self, 
        execution_data: Dict[str, Any], 
        security_coverage: SecurityCoverageMetrics
    ) -> List[CoverageGap]:
        """Identify security-specific coverage gaps"""
        gaps = []
        hosts = execution_data.get("hosts", [])
        
        # Authentication gaps
        if security_coverage.authentication_coverage < 70:
            gaps.append(CoverageGap(
                id=f"sec_auth_{datetime.utcnow().timestamp()}",
                category="security",
                severity="high",
                title="Insufficient Authentication Coverage",
                description=f"Authentication automation coverage is only {security_coverage.authentication_coverage:.1f}%",
                affected_hosts=hosts,
                missing_modules=["user", "group", "authorized_key", "sshd_config"],
                remediation_priority=90,
                estimated_effort="2-3 days",
                compliance_impact=["CIS", "NIST", "SOC2"],
                recommendations=[
                    "Implement automated user management",
                    "Configure SSH key management",
                    "Automate SSH daemon configuration",
                    "Set up centralized authentication"
                ],
                created_at=datetime.utcnow()
            ))
        
        # Encryption gaps
        if security_coverage.encryption_coverage < 50:
            gaps.append(CoverageGap(
                id=f"sec_enc_{datetime.utcnow().timestamp()}",
                category="security",
                severity="high",
                title="Insufficient Encryption Coverage",
                description=f"Encryption automation coverage is only {security_coverage.encryption_coverage:.1f}%",
                affected_hosts=hosts,
                missing_modules=["openssl_certificate", "crypto_key", "luks_device"],
                remediation_priority=85,
                estimated_effort="3-4 days",
                compliance_impact=["PCI_DSS", "HIPAA", "SOC2"],
                recommendations=[
                    "Automate SSL/TLS certificate management",
                    "Implement disk encryption automation",
                    "Set up key rotation procedures",
                    "Configure secure communication channels"
                ],
                created_at=datetime.utcnow()
            ))
        
        return gaps
    
    async def _generate_predictive_insights(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate predictive analytics and forecasting"""
        # This would integrate with ML models in a production system
        # For now, provide trend-based predictions
        
        current_metrics = {
            "success_rate": self._calculate_success_rate(execution_data),
            "module_diversity": len(execution_data.get("modules_used", {})),
            "execution_efficiency": self._calculate_efficiency(execution_data)
        }
        
        # Simple trend prediction (would be ML-powered in production)
        predictions = {
            "30_day_forecast": {
                "expected_success_rate": min(current_metrics["success_rate"] + 2, 100),
                "predicted_module_growth": current_metrics["module_diversity"] * 1.1,
                "efficiency_trend": "improving" if current_metrics["execution_efficiency"] > 0.8 else "stable"
            },
            "risk_indicators": self._identify_risk_indicators(execution_data),
            "optimization_opportunities": self._identify_optimization_opportunities(execution_data),
            "recommended_actions": self._generate_predictive_recommendations(current_metrics)
        }
        
        return predictions
    
    async def _generate_enhanced_recommendations(
        self, 
        execution_data: Dict[str, Any], 
        analysis_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate enhanced, actionable recommendations"""
        recommendations = []
        
        # Security recommendations
        security_coverage = analysis_results.get("security_coverage")
        if security_coverage and security_coverage.security_module_coverage < 60:
            recommendations.append({
                "category": "security",
                "priority": "high",
                "title": "Enhance Security Automation Coverage",
                "description": "Current security automation coverage is below recommended levels",
                "action_items": [
                    "Implement user and group management automation",
                    "Set up firewall configuration management",
                    "Automate audit log configuration",
                    "Deploy encryption key management"
                ],
                "estimated_impact": "Improve security posture by 40%",
                "timeline": "2-3 weeks",
                "resources_needed": ["Security team", "Ansible expertise"]
            })
        
        # Compliance recommendations
        compliance_coverage = analysis_results.get("compliance_coverage", {})
        for framework, framework_data in compliance_coverage.items():
            if framework_data.get("weighted_score", 0) < 70:
                recommendations.append({
                    "category": "compliance",
                    "priority": "high",
                    "title": f"Improve {framework.upper()} Compliance Coverage",
                    "description": f"Current {framework} compliance score is {framework_data.get('weighted_score', 0):.1f}%",
                    "action_items": [
                        f"Implement missing modules: {', '.join(framework_data.get('missing_modules', [])[:3])}",
                        "Review and update control implementations",
                        "Establish compliance monitoring"
                    ],
                    "estimated_impact": f"Achieve {framework} compliance readiness",
                    "timeline": "4-6 weeks",
                    "resources_needed": ["Compliance team", "DevOps team"]
                })
        
        # Infrastructure recommendations
        infrastructure_coverage = analysis_results.get("infrastructure_coverage")
        if infrastructure_coverage and infrastructure_coverage.overall_infrastructure_score < 65:
            recommendations.append({
                "category": "infrastructure",
                "priority": "medium",
                "title": "Expand Infrastructure Automation Coverage",
                "description": "Infrastructure automation coverage needs improvement across multiple tiers",
                "action_items": [
                    "Implement network configuration automation",
                    "Set up monitoring and alerting automation",
                    "Automate backup and recovery procedures",
                    "Deploy configuration management for storage systems"
                ],
                "estimated_impact": "Reduce manual operations by 50%",
                "timeline": "6-8 weeks",
                "resources_needed": ["Infrastructure team", "Automation engineers"]
            })
        
        return recommendations
    
    # Helper methods
    
    def _is_security_module(self, module: str) -> bool:
        """Check if a module is security-related"""
        for category_modules in self.SECURITY_MODULES.values():
            if module in category_modules:
                return True
        return False
    
    def _get_all_security_modules(self) -> List[str]:
        """Get all security modules across categories"""
        all_modules = []
        for category_modules in self.SECURITY_MODULES.values():
            all_modules.extend(category_modules)
        return list(set(all_modules))
    
    def _get_modules_for_control(self, control: str) -> List[str]:
        """Get modules associated with a compliance control"""
        # This would be expanded with a comprehensive mapping
        control_mappings = {
            "authentication": self.SECURITY_MODULES["authentication"],
            "authorization": self.SECURITY_MODULES["authorization"],
            "audit": self.SECURITY_MODULES["audit"],
            "encryption": self.SECURITY_MODULES["encryption"],
            "access_control": self.SECURITY_MODULES["authentication"] + self.SECURITY_MODULES["authorization"],
            "logical_access": self.SECURITY_MODULES["authentication"],
            "monitoring": self.SECURITY_MODULES["audit"],
            "backup": ["backup", "restore", "snapshot"],
            "incident_response": self.SECURITY_MODULES["audit"]
        }
        return control_mappings.get(control, [])
    
    def _determine_compliance_level(self, score: float) -> str:
        """Determine compliance level based on score"""
        if score >= 90:
            return "excellent"
        elif score >= 80:
            return "good"
        elif score >= 70:
            return "acceptable"
        elif score >= 60:
            return "needs_improvement"
        else:
            return "inadequate"
    
    def _generate_compliance_recommendations(
        self, 
        framework: ComplianceFramework, 
        control_coverage: Dict[str, float], 
        weighted_score: float
    ) -> List[str]:
        """Generate framework-specific recommendations"""
        recommendations = []
        
        if weighted_score < 70:
            recommendations.append(f"Immediate action required to meet {framework.value.upper()} compliance standards")
        
        for control, coverage in control_coverage.items():
            if coverage < 60:
                recommendations.append(f"Improve {control} automation coverage (currently {coverage:.1f}%)")
        
        return recommendations
    
    async def _calculate_security_best_practices_score(self, execution_data: Dict[str, Any]) -> float:
        """Calculate security best practices adherence score"""
        # This would implement a comprehensive scoring algorithm
        # For now, return a simplified score
        modules_used = execution_data.get("modules_used", Counter())
        security_modules_used = sum(1 for module in modules_used if self._is_security_module(module))
        total_security_modules = len(self._get_all_security_modules())
        
        return (security_modules_used / max(total_security_modules, 1)) * 100
    
    async def _calculate_framework_coverage(
        self, 
        execution_data: Dict[str, Any], 
        framework: ComplianceFramework
    ) -> float:
        """Calculate coverage for a specific compliance framework"""
        framework_mapping = self.COMPLIANCE_MAPPINGS.get(framework, {})
        required_modules = framework_mapping.get("required_modules", [])
        modules_used = execution_data.get("modules_used", Counter())
        
        covered_modules = [m for m in required_modules if m in modules_used]
        return (len(covered_modules) / max(len(required_modules), 1)) * 100
    
    async def _identify_compliance_gaps(
        self, 
        framework: str, 
        framework_data: Dict[str, Any]
    ) -> List[CoverageGap]:
        """Identify compliance-specific gaps"""
        gaps = []
        
        if framework_data.get("weighted_score", 0) < 70:
            gaps.append(CoverageGap(
                id=f"comp_{framework}_{datetime.utcnow().timestamp()}",
                category="compliance",
                severity="high",
                title=f"{framework.upper()} Compliance Gap",
                description=f"Compliance score is {framework_data.get('weighted_score', 0):.1f}%",
                affected_hosts=[],
                missing_modules=framework_data.get("missing_modules", []),
                remediation_priority=95,
                estimated_effort="3-4 weeks",
                compliance_impact=[framework],
                recommendations=framework_data.get("recommendations", []),
                created_at=datetime.utcnow()
            ))
        
        return gaps
    
    async def _identify_infrastructure_gaps(
        self, 
        execution_data: Dict[str, Any], 
        infrastructure_coverage: InfrastructureCoverageMap
    ) -> List[CoverageGap]:
        """Identify infrastructure-specific gaps"""
        gaps = []
        
        if infrastructure_coverage.overall_infrastructure_score < 60:
            gaps.append(CoverageGap(
                id=f"infra_overall_{datetime.utcnow().timestamp()}",
                category="infrastructure",
                severity="medium",
                title="Overall Infrastructure Coverage Gap",
                description=f"Infrastructure automation coverage is {infrastructure_coverage.overall_infrastructure_score:.1f}%",
                affected_hosts=execution_data.get("hosts", []),
                missing_modules=[],
                remediation_priority=70,
                estimated_effort="4-6 weeks",
                compliance_impact=[],
                recommendations=[
                    "Expand network automation coverage",
                    "Implement monitoring automation",
                    "Set up backup automation",
                    "Automate storage management"
                ],
                created_at=datetime.utcnow()
            ))
        
        return gaps
    
    def _calculate_success_rate(self, execution_data: Dict[str, Any]) -> float:
        """Calculate overall success rate"""
        status_summary = execution_data.get("status_summary", {})
        total_tasks = sum(status_summary.values())
        successful_tasks = status_summary.get("ok", 0) + status_summary.get("changed", 0)
        return (successful_tasks / max(total_tasks, 1)) * 100
    
    def _calculate_efficiency(self, execution_data: Dict[str, Any]) -> float:
        """Calculate execution efficiency"""
        execution_time = execution_data.get("execution_time", 0)
        status_summary = execution_data.get("status_summary", {})
        total_tasks = sum(status_summary.values())
        
        if execution_time > 0 and total_tasks > 0:
            return min(total_tasks / execution_time, 1.0)
        return 0.0
    
    def _identify_risk_indicators(self, execution_data: Dict[str, Any]) -> List[str]:
        """Identify potential risk indicators"""
        risks = []
        
        status_summary = execution_data.get("status_summary", {})
        failure_rate = (status_summary.get("failed", 0) / max(sum(status_summary.values()), 1)) * 100
        
        if failure_rate > 10:
            risks.append("High failure rate detected")
        
        if execution_data.get("execution_time", 0) > 600:  # 10 minutes
            risks.append("Long execution time indicates potential performance issues")
        
        modules_used = execution_data.get("modules_used", Counter())
        if len(modules_used) < 5:
            risks.append("Limited module diversity may indicate automation gaps")
        
        return risks
    
    def _identify_optimization_opportunities(self, execution_data: Dict[str, Any]) -> List[str]:
        """Identify optimization opportunities"""
        opportunities = []
        
        if execution_data.get("execution_time", 0) > 300:  # 5 minutes
            opportunities.append("Consider parallelization to improve execution time")
        
        modules_used = execution_data.get("modules_used", Counter())
        if "command" in modules_used or "shell" in modules_used:
            opportunities.append("Replace command/shell modules with idempotent alternatives")
        
        if len(execution_data.get("hosts", [])) > 10:
            opportunities.append("Consider using rolling updates for large host groups")
        
        return opportunities
    
    def _generate_predictive_recommendations(self, current_metrics: Dict[str, Any]) -> List[str]:
        """Generate predictive recommendations based on current metrics"""
        recommendations = []
        
        if current_metrics["success_rate"] < 95:
            recommendations.append("Focus on improving task reliability to achieve >95% success rate")
        
        if current_metrics["module_diversity"] < 10:
            recommendations.append("Expand automation coverage by introducing new modules")
        
        if current_metrics["execution_efficiency"] < 0.8:
            recommendations.append("Optimize playbook performance and resource utilization")
        
        return recommendations
    
    async def _cache_coverage_results(self, analysis_results: Dict[str, Any]) -> None:
        """Cache coverage results for trend analysis"""
        cache_key = f"ansible_coverage_{datetime.utcnow().strftime('%Y%m%d_%H')}"
        
        # Store simplified results for trending
        trend_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "base_coverage": analysis_results.get("base_coverage", {}),
            "security_score": analysis_results.get("security_coverage", {}).get("security_module_coverage", 0),
            "infrastructure_score": analysis_results.get("infrastructure_coverage", {}).get("overall_infrastructure_score", 0),
            "gap_count": len(analysis_results.get("coverage_gaps", []))
        }
        
        await self.cache.set(cache_key, trend_data, ttl=86400)  # 24 hours


# Global enhanced analyzer instance
enhanced_ansible_analyzer = EnhancedAnsibleCoverageAnalyzer()