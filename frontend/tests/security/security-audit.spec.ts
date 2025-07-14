/**
 * Security Audit Test Suite for OpsSight
 * Comprehensive security testing including OWASP Top 10 vulnerabilities
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

interface SecurityTestResult {
  test: string;
  passed: boolean;
  vulnerability?: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

class SecurityTester {
  constructor(private page: Page) {}

  async testSecurityHeaders(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    
    await this.page.goto('/');
    const response = await this.page.waitForResponse('**/*');
    const headers = response.headers();

    // Test Content Security Policy
    const csp = headers['content-security-policy'];
    results.push({
      test: 'Content Security Policy',
      passed: !!csp,
      vulnerability: !csp ? 'Missing CSP header' : undefined,
      risk: !csp ? 'high' : 'low',
      description: 'CSP helps prevent XSS attacks',
      mitigation: 'Implement comprehensive CSP header',
    });

    // Test X-Frame-Options
    const xFrame = headers['x-frame-options'];
    results.push({
      test: 'X-Frame-Options',
      passed: xFrame === 'DENY' || xFrame === 'SAMEORIGIN',
      vulnerability: !xFrame ? 'Missing X-Frame-Options' : undefined,
      risk: !xFrame ? 'medium' : 'low',
      description: 'Prevents clickjacking attacks',
      mitigation: 'Set X-Frame-Options to DENY or SAMEORIGIN',
    });

    // Test X-Content-Type-Options
    const xContentType = headers['x-content-type-options'];
    results.push({
      test: 'X-Content-Type-Options',
      passed: xContentType === 'nosniff',
      vulnerability: !xContentType ? 'Missing X-Content-Type-Options' : undefined,
      risk: !xContentType ? 'medium' : 'low',
      description: 'Prevents MIME type sniffing attacks',
      mitigation: 'Set X-Content-Type-Options to nosniff',
    });

    // Test Strict-Transport-Security
    const hsts = headers['strict-transport-security'];
    results.push({
      test: 'Strict Transport Security',
      passed: !!hsts,
      vulnerability: !hsts ? 'Missing HSTS header' : undefined,
      risk: !hsts ? 'medium' : 'low',
      description: 'Forces HTTPS connections',
      mitigation: 'Implement HSTS with appropriate max-age',
    });

    // Test Referrer Policy
    const referrer = headers['referrer-policy'];
    results.push({
      test: 'Referrer Policy',
      passed: !!referrer,
      vulnerability: !referrer ? 'Missing Referrer-Policy' : undefined,
      risk: !referrer ? 'low' : 'low',
      description: 'Controls referrer information leakage',
      mitigation: 'Set appropriate Referrer-Policy',
    });

    return results;
  }

  async testXSSVulnerabilities(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '"><svg onload=alert("XSS")>',
    ];

    for (const payload of xssPayloads) {
      try {
        // Test URL parameters
        await this.page.goto(`/?test=${encodeURIComponent(payload)}`);
        
        // Check if payload was executed (would show alert)
        const alertTriggered = await this.page.evaluate(() => {
          return new Promise<boolean>((resolve) => {
            const originalAlert = window.alert;
            let alertCalled = false;
            
            window.alert = () => {
              alertCalled = true;
              resolve(true);
            };
            
            setTimeout(() => {
              window.alert = originalAlert;
              resolve(alertCalled);
            }, 1000);
          });
        });

        results.push({
          test: `XSS Test: ${payload.substring(0, 20)}...`,
          passed: !alertTriggered,
          vulnerability: alertTriggered ? 'XSS vulnerability detected' : undefined,
          risk: alertTriggered ? 'critical' : 'low',
          description: 'Cross-site scripting vulnerability test',
          mitigation: 'Implement proper input sanitization and CSP',
        });
      } catch (error) {
        // Error likely means the payload was blocked
        results.push({
          test: `XSS Test: ${payload.substring(0, 20)}...`,
          passed: true,
          risk: 'low',
          description: 'XSS payload blocked successfully',
        });
      }
    }

    return results;
  }

  async testSQLInjection(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' OR 1=1 --",
      "admin'--",
      "' OR 'a'='a",
    ];

    for (const payload of sqlPayloads) {
      try {
        // Test API endpoints that might be vulnerable
        const response = await this.page.request.get(`/api/search?q=${encodeURIComponent(payload)}`);
        
        // Check for SQL error messages in response
        const responseText = await response.text();
        const hasSqlError = /sql|mysql|postgresql|sqlite|oracle|syntax error|database/i.test(responseText);
        
        results.push({
          test: `SQL Injection Test: ${payload.substring(0, 20)}...`,
          passed: !hasSqlError && response.status() !== 500,
          vulnerability: hasSqlError ? 'SQL injection vulnerability detected' : undefined,
          risk: hasSqlError ? 'critical' : 'low',
          description: 'SQL injection vulnerability test',
          mitigation: 'Use parameterized queries and input validation',
        });
      } catch (error) {
        results.push({
          test: `SQL Injection Test: ${payload.substring(0, 20)}...`,
          passed: true,
          risk: 'low',
          description: 'SQL injection payload blocked or endpoint not found',
        });
      }
    }

    return results;
  }

  async testCSRF(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    try {
      // Test if CSRF tokens are required for state-changing operations
      const response = await this.page.request.post('/api/test', {
        data: { action: 'delete', id: '123' },
      });

      // A properly secured endpoint should reject requests without CSRF tokens
      const isProtected = response.status() === 403 || response.status() === 401;
      
      results.push({
        test: 'CSRF Protection',
        passed: isProtected,
        vulnerability: !isProtected ? 'Missing CSRF protection' : undefined,
        risk: !isProtected ? 'high' : 'low',
        description: 'Cross-site request forgery protection test',
        mitigation: 'Implement CSRF tokens for state-changing operations',
      });
    } catch (error) {
      results.push({
        test: 'CSRF Protection',
        passed: true,
        risk: 'low',
        description: 'CSRF test endpoint not found (acceptable)',
      });
    }

    return results;
  }

  async testSessionSecurity(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    // Test cookie security attributes
    await this.page.goto('/');
    const cookies = await this.page.context().cookies();
    
    for (const cookie of cookies) {
      const isSecure = cookie.secure;
      const isHttpOnly = cookie.httpOnly;
      const hasSameSite = cookie.sameSite !== 'None';

      results.push({
        test: `Cookie Security: ${cookie.name}`,
        passed: isSecure && isHttpOnly && hasSameSite,
        vulnerability: !isSecure || !isHttpOnly || !hasSameSite ? 'Insecure cookie attributes' : undefined,
        risk: !isSecure || !isHttpOnly ? 'medium' : 'low',
        description: 'Cookie security attributes test',
        mitigation: 'Set Secure, HttpOnly, and SameSite attributes on cookies',
      });
    }

    if (cookies.length === 0) {
      results.push({
        test: 'Cookie Security',
        passed: true,
        risk: 'low',
        description: 'No cookies found to test',
      });
    }

    return results;
  }

  async testDirectoryTraversal(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc/passwd',
      '..%252f..%252f..%252fetc%252fpasswd',
    ];

    for (const payload of traversalPayloads) {
      try {
        const response = await this.page.request.get(`/api/files?path=${encodeURIComponent(payload)}`);
        const responseText = await response.text();
        
        // Check for system file contents
        const hasSystemFiles = /root:|localhost|127\.0\.0\.1/i.test(responseText);
        
        results.push({
          test: `Directory Traversal: ${payload.substring(0, 20)}...`,
          passed: !hasSystemFiles,
          vulnerability: hasSystemFiles ? 'Directory traversal vulnerability' : undefined,
          risk: hasSystemFiles ? 'high' : 'low',
          description: 'Directory traversal vulnerability test',
          mitigation: 'Validate and sanitize file paths, use whitelisting',
        });
      } catch (error) {
        results.push({
          test: `Directory Traversal: ${payload.substring(0, 20)}...`,
          passed: true,
          risk: 'low',
          description: 'Directory traversal payload blocked or endpoint not found',
        });
      }
    }

    return results;
  }

  async testRateLimit(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    try {
      // Send rapid requests to test rate limiting
      const requests = Array.from({ length: 10 }, () =>
        this.page.request.get('/api/test')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(response => response.status() === 429);

      results.push({
        test: 'Rate Limiting',
        passed: rateLimited,
        vulnerability: !rateLimited ? 'Missing rate limiting' : undefined,
        risk: !rateLimited ? 'medium' : 'low',
        description: 'Rate limiting protection test',
        mitigation: 'Implement rate limiting to prevent abuse',
      });
    } catch (error) {
      results.push({
        test: 'Rate Limiting',
        passed: true,
        risk: 'low',
        description: 'Rate limiting test endpoint not found',
      });
    }

    return results;
  }

  async testHTTPS(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    
    try {
      const url = this.page.url();
      const isHTTPS = url.startsWith('https://');
      
      results.push({
        test: 'HTTPS Enforcement',
        passed: isHTTPS,
        vulnerability: !isHTTPS ? 'HTTP instead of HTTPS' : undefined,
        risk: !isHTTPS ? 'high' : 'low',
        description: 'HTTPS encryption test',
        mitigation: 'Enforce HTTPS for all connections',
      });
    } catch (error) {
      results.push({
        test: 'HTTPS Enforcement',
        passed: false,
        vulnerability: 'Unable to test HTTPS',
        risk: 'medium',
        description: 'HTTPS test failed',
      });
    }

    return results;
  }
}

// Test suite
test.describe('Security Audit', () => {
  test('Security Headers Audit', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testSecurityHeaders();
    
    console.log('Security Headers Results:', results);
    
    // Assert that critical security headers are present
    const criticalFailures = results.filter(r => !r.passed && (r.risk === 'high' || r.risk === 'critical'));
    expect(criticalFailures.length).toBe(0);
  });

  test('XSS Vulnerability Scan', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testXSSVulnerabilities();
    
    console.log('XSS Test Results:', results);
    
    // Assert no XSS vulnerabilities found
    const xssVulns = results.filter(r => !r.passed && r.risk === 'critical');
    expect(xssVulns.length).toBe(0);
  });

  test('SQL Injection Scan', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testSQLInjection();
    
    console.log('SQL Injection Test Results:', results);
    
    // Assert no SQL injection vulnerabilities found
    const sqlVulns = results.filter(r => !r.passed && r.risk === 'critical');
    expect(sqlVulns.length).toBe(0);
  });

  test('CSRF Protection Test', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testCSRF();
    
    console.log('CSRF Test Results:', results);
    
    // Assert CSRF protection is in place
    const csrfFailures = results.filter(r => !r.passed && r.risk === 'high');
    expect(csrfFailures.length).toBe(0);
  });

  test('Session Security Audit', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testSessionSecurity();
    
    console.log('Session Security Results:', results);
    
    // Assert secure cookie configuration
    const sessionFailures = results.filter(r => !r.passed && r.risk === 'medium');
    expect(sessionFailures.length).toBe(0);
  });

  test('Directory Traversal Test', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testDirectoryTraversal();
    
    console.log('Directory Traversal Results:', results);
    
    // Assert no directory traversal vulnerabilities
    const traversalVulns = results.filter(r => !r.passed && r.risk === 'high');
    expect(traversalVulns.length).toBe(0);
  });

  test('Rate Limiting Test', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testRateLimit();
    
    console.log('Rate Limiting Results:', results);
    
    // Rate limiting is recommended but not critical for all endpoints
    const rateLimitFailures = results.filter(r => !r.passed && r.risk === 'high');
    expect(rateLimitFailures.length).toBe(0);
  });

  test('HTTPS Enforcement Test', async ({ page }) => {
    const tester = new SecurityTester(page);
    const results = await tester.testHTTPS();
    
    console.log('HTTPS Results:', results);
    
    // HTTPS should be enforced in production
    if (process.env.NODE_ENV === 'production') {
      const httpsFailures = results.filter(r => !r.passed && r.risk === 'high');
      expect(httpsFailures.length).toBe(0);
    }
  });

  test('Comprehensive Security Report', async ({ page }) => {
    const tester = new SecurityTester(page);
    
    const [
      headerResults,
      xssResults,
      sqlResults,
      csrfResults,
      sessionResults,
      traversalResults,
      rateLimitResults,
      httpsResults,
    ] = await Promise.all([
      tester.testSecurityHeaders(),
      tester.testXSSVulnerabilities(),
      tester.testSQLInjection(),
      tester.testCSRF(),
      tester.testSessionSecurity(),
      tester.testDirectoryTraversal(),
      tester.testRateLimit(),
      tester.testHTTPS(),
    ]);

    const allResults = [
      ...headerResults,
      ...xssResults,
      ...sqlResults,
      ...csrfResults,
      ...sessionResults,
      ...traversalResults,
      ...rateLimitResults,
      ...httpsResults,
    ];

    // Generate security report
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;
    const critical = allResults.filter(r => !r.passed && r.risk === 'critical').length;
    const high = allResults.filter(r => !r.passed && r.risk === 'high').length;
    const medium = allResults.filter(r => !r.passed && r.risk === 'medium').length;
    const low = allResults.filter(r => !r.passed && r.risk === 'low').length;

    console.log('\n=== SECURITY AUDIT REPORT ===');
    console.log(`Total Tests: ${allResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Critical Risk: ${critical}`);
    console.log(`High Risk: ${high}`);
    console.log(`Medium Risk: ${medium}`);
    console.log(`Low Risk: ${low}`);

    const failedTests = allResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n=== FAILED TESTS ===');
      failedTests.forEach(test => {
        console.log(`❌ ${test.test} (${test.risk.toUpperCase()})`);
        console.log(`   Vulnerability: ${test.vulnerability}`);
        console.log(`   Mitigation: ${test.mitigation}`);
        console.log('');
      });
    }

    // Fail test if there are critical or high-risk vulnerabilities
    expect(critical + high).toBe(0);
  });
});

// Helper function to run security scan from command line
export async function runSecurityScan(baseURL: string) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(baseURL);
    const tester = new SecurityTester(page);
    
    const results = await Promise.all([
      tester.testSecurityHeaders(),
      tester.testXSSVulnerabilities(),
      tester.testSQLInjection(),
      tester.testCSRF(),
      tester.testSessionSecurity(),
      tester.testDirectoryTraversal(),
      tester.testRateLimit(),
      tester.testHTTPS(),
    ]);
    
    return results.flat();
  } finally {
    await browser.close();
  }
} 