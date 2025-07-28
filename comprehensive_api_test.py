#!/usr/bin/env python3
"""
Comprehensive API Testing Suite for OpsSight Platform
Tests all endpoints with extensive scenarios including edge cases, error conditions, 
race conditions, and security vulnerabilities.
"""

import requests
import json
import time
import asyncio
import aiohttp
import threading
import concurrent.futures
from datetime import datetime, timedelta
import sys
import warnings
import urllib3

# Suppress SSL warnings for localhost testing
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

class APITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'OpsSight-API-Tester/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': [],
            'performance': {},
            'security_issues': [],
            'race_conditions': []
        }
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] {level}: {message}")
        
    def test_endpoint(self, method, endpoint, data=None, headers=None, expected_status=200, timeout=10):
        """Test a single endpoint with comprehensive validation"""
        url = f"{self.base_url}{endpoint}"
        test_headers = self.session.headers.copy()
        if headers:
            test_headers.update(headers)
            
        try:
            start_time = time.time()
            
            if method.upper() == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=timeout, verify=False)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=timeout, verify=False)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=timeout, verify=False)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=timeout, verify=False)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = (time.time() - start_time) * 1000  # ms
            
            # Store performance data
            if endpoint not in self.results['performance']:
                self.results['performance'][endpoint] = []
            self.results['performance'][endpoint].append(response_time)
            
            # Validate response
            if response.status_code == expected_status:
                self.results['passed'] += 1
                self.log(f"✓ {method} {endpoint} - {response.status_code} ({response_time:.2f}ms)")
                
                # Check for security headers
                self.check_security_headers(response, endpoint)
                
                return {
                    'success': True,
                    'status_code': response.status_code,
                    'response_time': response_time,
                    'data': response.text,
                    'headers': dict(response.headers)
                }
            else:
                self.results['failed'] += 1
                error_msg = f"✗ {method} {endpoint} - Expected {expected_status}, got {response.status_code}"
                self.log(error_msg, "ERROR")
                self.results['errors'].append(error_msg)
                
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'response_time': response_time,
                    'data': response.text,
                    'headers': dict(response.headers)
                }
                
        except requests.exceptions.Timeout:
            self.results['failed'] += 1
            error_msg = f"✗ {method} {endpoint} - Timeout after {timeout}s"
            self.log(error_msg, "ERROR")
            self.results['errors'].append(error_msg)
            return {'success': False, 'error': 'timeout'}
            
        except Exception as e:
            self.results['failed'] += 1
            error_msg = f"✗ {method} {endpoint} - Exception: {str(e)}"
            self.log(error_msg, "ERROR")
            self.results['errors'].append(error_msg)
            return {'success': False, 'error': str(e)}
    
    def check_security_headers(self, response, endpoint):
        """Check for important security headers"""
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': None,  # Check if present
            'Content-Security-Policy': None     # Check if present
        }
        
        missing_headers = []
        for header, expected in security_headers.items():
            if header not in response.headers:
                missing_headers.append(header)
            elif expected and isinstance(expected, list):
                if response.headers[header] not in expected:
                    missing_headers.append(f"{header} (invalid value)")
            elif expected and response.headers[header] != expected:
                missing_headers.append(f"{header} (invalid value)")
                
        if missing_headers:
            security_issue = f"Missing/invalid security headers on {endpoint}: {', '.join(missing_headers)}"
            self.results['security_issues'].append(security_issue)
            self.log(security_issue, "WARN")
    
    def test_concurrent_requests(self, endpoint, num_requests=10, method='GET'):
        """Test endpoint with concurrent requests to check for race conditions"""
        self.log(f"Testing concurrent requests: {num_requests} {method} requests to {endpoint}")
        
        def make_request():
            return self.test_endpoint(method, endpoint)
        
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(num_requests)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        total_time = time.time() - start_time
        
        # Analyze results for race conditions
        status_codes = [r.get('status_code') for r in results if 'status_code' in r]
        response_times = [r.get('response_time') for r in results if 'response_time' in r]
        
        if len(set(status_codes)) > 1:
            race_condition = f"Race condition detected on {endpoint}: inconsistent status codes {set(status_codes)}"
            self.results['race_conditions'].append(race_condition)
            self.log(race_condition, "WARN")
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        self.log(f"Concurrent test completed: {num_requests} requests in {total_time:.2f}s, avg response time: {avg_response_time:.2f}ms")
        
        return results
    
    def test_malformed_requests(self, endpoint):
        """Test endpoint with various malformed requests"""
        self.log(f"Testing malformed requests on {endpoint}")
        
        malformed_tests = [
            # Invalid JSON
            {'method': 'POST', 'data': '{"invalid": json}', 'raw': True},
            # Missing Content-Type
            {'method': 'POST', 'data': {'test': 'data'}, 'headers': {'Content-Type': ''}},
            # Oversized payload
            {'method': 'POST', 'data': {'large_field': 'x' * 10000}},
            # SQL injection attempts
            {'method': 'GET', 'params': {'id': "1; DROP TABLE users;--"}},
            # XSS attempts
            {'method': 'POST', 'data': {'input': '<script>alert("xss")</script>'}},
            # Null bytes
            {'method': 'POST', 'data': {'field': 'test\x00null'}},
        ]
        
        for test in malformed_tests:
            try:
                url = f"{self.base_url}{endpoint}"
                if test.get('raw'):
                    response = requests.post(url, data=test['data'], timeout=5, verify=False)
                else:
                    params = test.get('params', {})
                    headers = test.get('headers', {})
                    if test['method'] == 'GET':
                        response = requests.get(url, params=params, headers=headers, timeout=5, verify=False)
                    else:
                        response = requests.post(url, json=test['data'], headers=headers, timeout=5, verify=False)
                
                # Log unexpected successes
                if response.status_code == 200:
                    security_issue = f"Malformed request accepted on {endpoint}: {test}"
                    self.results['security_issues'].append(security_issue)
                    self.log(security_issue, "WARN")
                    
            except Exception as e:
                # Expected for malformed requests
                pass
    
    def test_rate_limiting(self, endpoint, requests_per_second=100, duration=5):
        """Test rate limiting by sending rapid requests"""
        self.log(f"Testing rate limiting: {requests_per_second} req/s for {duration}s on {endpoint}")
        
        def rapid_request():
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=1, verify=False)
                return response.status_code
            except:
                return None
        
        start_time = time.time()
        request_count = 0
        rate_limited = False
        
        while time.time() - start_time < duration:
            status_code = rapid_request()
            request_count += 1
            
            if status_code == 429:  # Too Many Requests
                rate_limited = True
                self.log(f"Rate limiting detected at request {request_count}")
                break
            elif status_code is None:
                break
                
            # Control rate
            time.sleep(1.0 / requests_per_second)
        
        if not rate_limited:
            security_issue = f"No rate limiting detected on {endpoint} ({request_count} requests)"
            self.results['security_issues'].append(security_issue)
            self.log(security_issue, "WARN")
    
    def test_cors(self, endpoint):
        """Test CORS configuration"""
        self.log(f"Testing CORS on {endpoint}")
        
        # Test preflight request
        headers = {
            'Origin': 'http://malicious-site.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        
        try:
            response = requests.options(f"{self.base_url}{endpoint}", headers=headers, timeout=5, verify=False)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            
            # Check for overly permissive CORS
            if cors_headers['Access-Control-Allow-Origin'] == '*':
                security_issue = f"Overly permissive CORS on {endpoint}: allows all origins"
                self.results['security_issues'].append(security_issue)
                self.log(security_issue, "WARN")
                
        except Exception as e:
            self.log(f"CORS test failed on {endpoint}: {e}", "ERROR")
    
    def memory_leak_test(self, endpoint, iterations=50):
        """Test for memory leaks with repeated requests"""
        self.log(f"Testing for memory leaks: {iterations} iterations on {endpoint}")
        
        response_times = []
        for i in range(iterations):
            result = self.test_endpoint('GET', endpoint)
            if result.get('response_time'):
                response_times.append(result['response_time'])
                
            # Brief pause to allow garbage collection
            if i % 10 == 0:
                time.sleep(0.1)
        
        # Check for increasing response times (potential memory leak indicator)
        if len(response_times) >= 10:
            first_quarter = response_times[:len(response_times)//4]
            last_quarter = response_times[-len(response_times)//4:]
            
            avg_first = sum(first_quarter) / len(first_quarter)
            avg_last = sum(last_quarter) / len(last_quarter)
            
            if avg_last > avg_first * 1.5:  # 50% increase
                memory_issue = f"Potential memory leak on {endpoint}: response time increased {((avg_last/avg_first-1)*100):.1f}%"
                self.results['security_issues'].append(memory_issue)
                self.log(memory_issue, "WARN")
    
    def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        self.log("Starting comprehensive API testing suite")
        
        # Known endpoints from the problem description
        endpoints = [
            '/api/v1/health',
            '/api/v1/dashboard/overview',
            '/cache/metrics',
            '/api/performance',
            '/api/v1/metrics',
            '/api/v1/projects'
        ]
        
        # Additional common endpoints to test
        additional_endpoints = [
            '/api/v1/auth/login',
            '/api/v1/auth/logout',
            '/api/v1/users',
            '/api/v1/status',
            '/docs',
            '/openapi.json',
            '/',
            '/api',
            '/api/v1'
        ]
        
        all_endpoints = endpoints + additional_endpoints
        
        self.log(f"Testing {len(all_endpoints)} endpoints")
        
        for endpoint in all_endpoints:
            self.log(f"\n=== Testing {endpoint} ===")
            
            # Basic functionality test
            self.test_endpoint('GET', endpoint)
            
            # Test different HTTP methods
            for method in ['POST', 'PUT', 'DELETE']:
                self.test_endpoint(method, endpoint, expected_status=None)  # Don't enforce status
            
            # Security tests
            self.test_malformed_requests(endpoint)
            self.test_cors(endpoint)
            
            # Performance tests
            if endpoint in endpoints:  # Only for known working endpoints
                self.test_concurrent_requests(endpoint, num_requests=5)
                self.memory_leak_test(endpoint, iterations=20)
                
        # Rate limiting test on health endpoint (most likely to work)
        self.test_rate_limiting('/api/v1/health', requests_per_second=10, duration=2)
        
        # Generate report
        self.generate_report()
    
    def generate_report(self):
        """Generate comprehensive test report"""
        self.log("\n" + "="*80)
        self.log("COMPREHENSIVE API TEST REPORT")
        self.log("="*80)
        
        # Summary
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"""
SUMMARY:
- Total Tests: {total_tests}
- Passed: {self.results['passed']}
- Failed: {self.results['failed']}
- Success Rate: {success_rate:.1f}%

PERFORMANCE ANALYSIS:
""")
        
        for endpoint, times in self.results['performance'].items():
            if times:
                avg_time = sum(times) / len(times)
                min_time = min(times)
                max_time = max(times)
                print(f"  {endpoint}:")
                print(f"    Average: {avg_time:.2f}ms")
                print(f"    Min: {min_time:.2f}ms")
                print(f"    Max: {max_time:.2f}ms")
                print(f"    Requests: {len(times)}")
        
        # Security Issues
        if self.results['security_issues']:
            print(f"\nSECURITY ISSUES ({len(self.results['security_issues'])}):")
            for issue in self.results['security_issues']:
                print(f"  ⚠️  {issue}")
        else:
            print("\n✓ No security issues detected")
        
        # Race Conditions
        if self.results['race_conditions']:
            print(f"\nRACE CONDITIONS ({len(self.results['race_conditions'])}):")
            for condition in self.results['race_conditions']:
                print(f"  ⚠️  {condition}")
        else:
            print("\n✓ No race conditions detected")
        
        # Failed Tests
        if self.results['errors']:
            print(f"\nFAILED TESTS ({len(self.results['errors'])}):")
            for error in self.results['errors']:
                print(f"  ❌ {error}")

if __name__ == "__main__":
    # Test both HTTP and HTTPS if available
    for base_url in ["http://localhost:8000", "https://localhost:8000"]:
        try:
            tester = APITester(base_url)
            print(f"\n{'='*60}")
            print(f"Testing {base_url}")
            print(f"{'='*60}")
            tester.run_comprehensive_tests()
            break  # Use the first working URL
        except Exception as e:
            print(f"Failed to test {base_url}: {e}")
            continue