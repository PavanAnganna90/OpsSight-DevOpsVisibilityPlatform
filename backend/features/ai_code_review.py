"""
OpsSight Platform - AI-Powered Code Review Assistant
Advanced AI integration for automated code analysis and review
"""

import asyncio
import json
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
from datetime import datetime, timedelta

class ReviewSeverity(Enum):
    INFO = "info"
    WARNING = "warning" 
    ERROR = "error"
    CRITICAL = "critical"

class IssueCategory(Enum):
    SECURITY = "security"
    PERFORMANCE = "performance"
    MAINTAINABILITY = "maintainability"
    BUGS = "bugs"
    STYLE = "style"
    TESTING = "testing"

@dataclass
class ReviewSuggestion:
    file_path: str
    line_number: int
    column: Optional[int]
    severity: ReviewSeverity
    category: IssueCategory
    title: str
    description: str
    suggestion: str
    code_snippet: Optional[str] = None
    confidence: float = 0.0  # 0.0 to 1.0
    auto_fixable: bool = False
    fix_suggestion: Optional[str] = None

@dataclass
class SecurityIssue:
    file_path: str
    line_number: int
    vulnerability_type: str
    severity: ReviewSeverity
    description: str
    cve_reference: Optional[str] = None
    remediation: str = ""
    
@dataclass
class CodeMetrics:
    cyclomatic_complexity: int
    lines_of_code: int
    technical_debt_ratio: float
    maintainability_index: float
    test_coverage: float
    duplication_percentage: float

class AICodeReviewEngine:
    """AI-powered code review engine with multiple analysis strategies"""
    
    def __init__(self):
        self.security_patterns = self._load_security_patterns()
        self.performance_patterns = self._load_performance_patterns()
        self.style_patterns = self._load_style_patterns()
        self.cache = {}
        
    def _load_security_patterns(self) -> Dict[str, List[str]]:
        """Load security vulnerability patterns"""
        return {
            "sql_injection": [
                r"(?i)execute\s*\(\s*[\"'].*\+.*[\"']\s*\)",
                r"(?i)query\s*=.*\+.*",
                r"(?i)cursor\.execute\s*\(\s*[\"'].*%.*[\"']\s*%"
            ],
            "xss": [
                r"innerHTML\s*=.*user",
                r"document\.write\s*\(.*user",
                r"eval\s*\(.*user"
            ],
            "hardcoded_secrets": [
                r"(?i)(password|secret|key|token)\s*=\s*[\"'][^\"']{8,}[\"']",
                r"(?i)api[_-]?key\s*=\s*[\"'][^\"']+[\"']",
                r"(?i)(aws|azure|gcp)[_-]?(secret|key)\s*=\s*[\"'][^\"']+[\"']"
            ],
            "weak_crypto": [
                r"(?i)md5\s*\(",
                r"(?i)sha1\s*\(",
                r"(?i)des\s*\(",
                r"(?i)rc4\s*\("
            ]
        }
    
    def _load_performance_patterns(self) -> Dict[str, List[str]]:
        """Load performance anti-patterns"""
        return {
            "n_plus_one_query": [
                r"for.*in.*:\s*.*\.get\(",
                r"for.*in.*:\s*.*\.filter\(",
                r"while.*:\s*.*\.query\("
            ],
            "inefficient_loops": [
                r"for.*in.*:\s*.*\.append\(.*for.*in",
                r"for.*in.*:\s*.*\+=.*for.*in"
            ],
            "memory_leaks": [
                r"(?i)global\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*\[\]",
                r"(?i)while\s+true:.*append",
                r"(?i)recursive.*without.*base.*case"
            ]
        }
    
    def _load_style_patterns(self) -> Dict[str, List[str]]:
        """Load code style patterns"""
        return {
            "naming_conventions": [
                r"class\s+[a-z][a-zA-Z0-9]*",  # Classes should be PascalCase
                r"def\s+[A-Z][a-zA-Z0-9]*",    # Functions should be snake_case
                r"[A-Z]{2,}_[A-Z]{2,}\s*="     # Constants should be UPPER_CASE
            ],
            "complexity": [
                r"def\s+\w+\([^)]*\):[^}]{500,}",  # Large functions
                r"if.*elif.*elif.*elif.*elif"        # Deep nesting
            ]
        }

    async def analyze_code(self, code: str, file_path: str, language: str = "python") -> List[ReviewSuggestion]:
        """Comprehensive code analysis"""
        suggestions = []
        
        # Check cache first
        code_hash = hashlib.md5(code.encode()).hexdigest()
        cache_key = f"{file_path}:{code_hash}"
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Run analysis
        suggestions.extend(await self._analyze_security(code, file_path))
        suggestions.extend(await self._analyze_performance(code, file_path))
        suggestions.extend(await self._analyze_style(code, file_path))
        suggestions.extend(await self._analyze_maintainability(code, file_path))
        suggestions.extend(await self._analyze_testing(code, file_path))
        
        # Cache results
        self.cache[cache_key] = suggestions
        
        return suggestions
    
    async def _analyze_security(self, code: str, file_path: str) -> List[ReviewSuggestion]:
        """Detect security vulnerabilities"""
        suggestions = []
        lines = code.split('\n')
        
        for category, patterns in self.security_patterns.items():
            for pattern in patterns:
                for i, line in enumerate(lines):
                    matches = re.finditer(pattern, line)
                    for match in matches:
                        suggestions.append(ReviewSuggestion(
                            file_path=file_path,
                            line_number=i + 1,
                            column=match.start(),
                            severity=ReviewSeverity.CRITICAL if category in ['sql_injection', 'xss'] else ReviewSeverity.WARNING,
                            category=IssueCategory.SECURITY,
                            title=f"Potential {category.replace('_', ' ').title()}",
                            description=f"Detected potential {category} vulnerability",
                            suggestion=self._get_security_suggestion(category),
                            code_snippet=line.strip(),
                            confidence=0.8,
                            auto_fixable=category == "hardcoded_secrets"
                        ))
        
        return suggestions
    
    async def _analyze_performance(self, code: str, file_path: str) -> List[ReviewSuggestion]:
        """Detect performance issues"""
        suggestions = []
        lines = code.split('\n')
        
        for category, patterns in self.performance_patterns.items():
            for pattern in patterns:
                for i, line in enumerate(lines):
                    if re.search(pattern, line):
                        suggestions.append(ReviewSuggestion(
                            file_path=file_path,
                            line_number=i + 1,
                            column=0,
                            severity=ReviewSeverity.WARNING,
                            category=IssueCategory.PERFORMANCE,
                            title=f"Performance Issue: {category.replace('_', ' ').title()}",
                            description=f"Potential {category} detected",
                            suggestion=self._get_performance_suggestion(category),
                            code_snippet=line.strip(),
                            confidence=0.7
                        ))
        
        return suggestions
    
    async def _analyze_style(self, code: str, file_path: str) -> List[ReviewSuggestion]:
        """Analyze code style and conventions"""
        suggestions = []
        lines = code.split('\n')
        
        # Check line length
        for i, line in enumerate(lines):
            if len(line) > 120:
                suggestions.append(ReviewSuggestion(
                    file_path=file_path,
                    line_number=i + 1,
                    column=120,
                    severity=ReviewSeverity.INFO,
                    category=IssueCategory.STYLE,
                    title="Line Too Long",
                    description=f"Line exceeds 120 characters ({len(line)} chars)",
                    suggestion="Consider breaking this line into multiple lines",
                    code_snippet=line[:50] + "..." if len(line) > 50 else line,
                    confidence=1.0,
                    auto_fixable=True
                ))
        
        return suggestions
    
    async def _analyze_maintainability(self, code: str, file_path: str) -> List[ReviewSuggestion]:
        """Analyze code maintainability"""
        suggestions = []
        
        # Calculate cyclomatic complexity
        complexity = self._calculate_complexity(code)
        if complexity > 10:
            suggestions.append(ReviewSuggestion(
                file_path=file_path,
                line_number=1,
                column=0,
                severity=ReviewSeverity.WARNING,
                category=IssueCategory.MAINTAINABILITY,
                title="High Cyclomatic Complexity",
                description=f"Function has high complexity ({complexity})",
                suggestion="Consider breaking this function into smaller functions",
                confidence=0.9
            ))
        
        return suggestions
    
    async def _analyze_testing(self, code: str, file_path: str) -> List[ReviewSuggestion]:
        """Analyze test coverage and quality"""
        suggestions = []
        
        # Check if it's a test file
        if "test" not in file_path.lower():
            # Look for functions without tests
            functions = re.findall(r'def\s+(\w+)\s*\(', code)
            if functions and not any(f.startswith('test_') for f in functions):
                suggestions.append(ReviewSuggestion(
                    file_path=file_path,
                    line_number=1,
                    column=0,
                    severity=ReviewSeverity.INFO,
                    category=IssueCategory.TESTING,
                    title="Missing Test Coverage",
                    description="No tests found for this module",
                    suggestion="Consider adding unit tests for better code reliability",
                    confidence=0.6
                ))
        
        return suggestions
    
    def _calculate_complexity(self, code: str) -> int:
        """Calculate cyclomatic complexity"""
        complexity = 1  # Base complexity
        
        # Count decision points
        decision_keywords = ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'and', 'or']
        for keyword in decision_keywords:
            complexity += len(re.findall(rf'\b{keyword}\b', code))
        
        return complexity
    
    def _get_security_suggestion(self, category: str) -> str:
        """Get security remediation suggestions"""
        suggestions = {
            "sql_injection": "Use parameterized queries or ORM methods to prevent SQL injection",
            "xss": "Sanitize user input and use proper encoding when rendering HTML",
            "hardcoded_secrets": "Use environment variables or secure secret management",
            "weak_crypto": "Use strong cryptographic algorithms like SHA-256 or AES"
        }
        return suggestions.get(category, "Review security implications of this code")
    
    def _get_performance_suggestion(self, category: str) -> str:
        """Get performance optimization suggestions"""
        suggestions = {
            "n_plus_one_query": "Use bulk queries or joins to reduce database calls",
            "inefficient_loops": "Consider using list comprehensions or vectorized operations",
            "memory_leaks": "Ensure proper resource cleanup and avoid unbounded growth"
        }
        return suggestions.get(category, "Consider optimizing this code for better performance")

class CodeReviewOrchestrator:
    """Orchestrates the entire code review process"""
    
    def __init__(self):
        self.ai_engine = AICodeReviewEngine()
        self.review_history = []
    
    async def review_pull_request(self, pr_data: Dict[str, Any]) -> Dict[str, Any]:
        """Review an entire pull request"""
        results = {
            "pr_id": pr_data.get("id"),
            "status": "in_progress", 
            "started_at": datetime.utcnow().isoformat(),
            "files_reviewed": 0,
            "total_suggestions": 0,
            "critical_issues": 0,
            "suggestions_by_file": {},
            "summary": {}
        }
        
        try:
            # Get changed files
            changed_files = pr_data.get("changed_files", [])
            
            for file_data in changed_files:
                file_path = file_data.get("filename")
                file_content = file_data.get("content", "")
                
                if not file_content or self._should_skip_file(file_path):
                    continue
                
                # Analyze the file
                suggestions = await self.ai_engine.analyze_code(
                    file_content, file_path, self._detect_language(file_path)
                )
                
                results["files_reviewed"] += 1
                results["total_suggestions"] += len(suggestions)
                results["critical_issues"] += sum(
                    1 for s in suggestions if s.severity == ReviewSeverity.CRITICAL
                )
                
                # Store suggestions for this file
                results["suggestions_by_file"][file_path] = [
                    asdict(suggestion) for suggestion in suggestions
                ]
            
            # Generate summary
            results["summary"] = self._generate_review_summary(results)
            results["status"] = "completed"
            results["completed_at"] = datetime.utcnow().isoformat()
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            results["completed_at"] = datetime.utcnow().isoformat()
        
        # Store in history
        self.review_history.append(results)
        
        return results
    
    def _should_skip_file(self, file_path: str) -> bool:
        """Determine if file should be skipped"""
        skip_extensions = {'.md', '.txt', '.json', '.yml', '.yaml', '.xml'}
        skip_dirs = {'node_modules', '.git', '__pycache__', '.venv', 'venv'}
        
        # Check extension
        if any(file_path.endswith(ext) for ext in skip_extensions):
            return True
        
        # Check directories
        if any(skip_dir in file_path for skip_dir in skip_dirs):
            return True
            
        return False
    
    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension"""
        extension_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.go': 'go',
            '.cpp': 'cpp',
            '.c': 'c',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin'
        }
        
        for ext, lang in extension_map.items():
            if file_path.endswith(ext):
                return lang
                
        return 'unknown'
    
    def _generate_review_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a summary of the review results"""
        total_suggestions = results["total_suggestions"]
        critical_issues = results["critical_issues"]
        files_reviewed = results["files_reviewed"]
        
        # Calculate severity distribution
        severity_counts = {"critical": 0, "error": 0, "warning": 0, "info": 0}
        category_counts = {}
        
        for file_suggestions in results["suggestions_by_file"].values():
            for suggestion in file_suggestions:
                severity_counts[suggestion["severity"]] += 1
                category = suggestion["category"]
                category_counts[category] = category_counts.get(category, 0) + 1
        
        # Generate recommendation
        if critical_issues > 0:
            recommendation = "REJECT - Critical security or stability issues found"
        elif severity_counts["error"] > 5:
            recommendation = "REQUEST_CHANGES - Multiple errors need to be addressed"
        elif severity_counts["warning"] > 10:
            recommendation = "REQUEST_CHANGES - Several improvements recommended"
        else:
            recommendation = "APPROVE - Code quality looks good"
        
        return {
            "recommendation": recommendation,
            "files_reviewed": files_reviewed,
            "total_issues": total_suggestions,
            "severity_distribution": severity_counts,
            "category_distribution": category_counts,
            "estimated_fix_time": self._estimate_fix_time(severity_counts),
            "quality_score": self._calculate_quality_score(severity_counts, files_reviewed)
        }
    
    def _estimate_fix_time(self, severity_counts: Dict[str, int]) -> str:
        """Estimate time needed to fix issues"""
        # Rough estimates in minutes
        time_estimates = {
            "critical": 60,  # 1 hour each
            "error": 30,     # 30 minutes each
            "warning": 15,   # 15 minutes each
            "info": 5        # 5 minutes each
        }
        
        total_minutes = sum(
            count * time_estimates[severity] 
            for severity, count in severity_counts.items()
        )
        
        if total_minutes < 60:
            return f"{total_minutes} minutes"
        elif total_minutes < 480:  # 8 hours
            return f"{total_minutes // 60:.1f} hours"
        else:
            return f"{total_minutes // 480:.1f} days"
    
    def _calculate_quality_score(self, severity_counts: Dict[str, int], files_reviewed: int) -> float:
        """Calculate a quality score from 0-100"""
        if files_reviewed == 0:
            return 100.0
        
        # Penalty weights
        penalties = {
            "critical": 20,
            "error": 10,
            "warning": 5,
            "info": 1
        }
        
        total_penalty = sum(
            count * penalties[severity] 
            for severity, count in severity_counts.items()
        )
        
        # Normalize by number of files
        penalty_per_file = total_penalty / files_reviewed
        
        # Convert to score (100 - penalty, minimum 0)
        score = max(0, 100 - penalty_per_file)
        
        return round(score, 1)

# Usage example and API integration
async def setup_ai_code_review():
    """Initialize AI code review system"""
    orchestrator = CodeReviewOrchestrator()
    
    # Example PR data structure
    example_pr = {
        "id": "123",
        "title": "Add user authentication",
        "changed_files": [
            {
                "filename": "app/auth.py",
                "content": """
def authenticate_user(username, password):
    query = "SELECT * FROM users WHERE username='" + username + "'"
    cursor.execute(query)
    user = cursor.fetchone()
    if user and user['password'] == password:
        return user
    return None
"""
            }
        ]
    }
    
    # Run review
    results = await orchestrator.review_pull_request(example_pr)
    return results

# Export main classes
__all__ = [
    'AICodeReviewEngine',
    'CodeReviewOrchestrator', 
    'ReviewSuggestion',
    'SecurityIssue',
    'ReviewSeverity',
    'IssueCategory'
]