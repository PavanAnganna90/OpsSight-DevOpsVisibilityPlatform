# OpsSight Security Guide

## Overview

This document outlines the comprehensive security measures implemented in the OpsSight DevOps platform, including security architecture, threat mitigation strategies, and security testing procedures.

## Security Architecture

### 1. Defense in Depth

OpsSight implements a multi-layered security approach:

- **Network Layer**: HTTPS enforcement, rate limiting, IP blocking
- **Application Layer**: Input validation, authentication, authorization
- **Data Layer**: Encryption at rest and in transit, secure session management
- **Infrastructure Layer**: Security headers, CSP, secure configurations

### 2. Security Components

#### Middleware Security (`src/middleware.ts`)
- **Rate Limiting**: 100 requests/minute (general), 50 requests/minute (API)
- **IP Geolocation Blocking**: Configurable country-based blocking
- **Threat Detection**: SQL injection, XSS, path traversal pattern detection
- **Security Headers**: Comprehensive security header implementation

#### Authentication System (`src/lib/auth-middleware.ts`)
- **JWT-based Authentication**: Secure token generation and validation
- **Role-based Access Control**: Four user roles (Admin, Manager, Developer, Viewer)
- **Session Management**: Secure session storage and cleanup
- **Permission System**: Granular permission management

#### Global Error Handling (`src/lib/error-handler.ts`)
- **Structured Error Handling**: Categorized error types and severity levels
- **Security Event Logging**: Comprehensive logging with security context
- **Error Monitoring**: Integration with external monitoring services
- **User-friendly Error Messages**: Secure error responses that don't leak sensitive information

## Security Headers

### Content Security Policy (CSP)

**Production CSP:**
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' blob: data: https://*.vercel.app https://vercel.com;
font-src 'self' https://fonts.gstatic.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
connect-src 'self' https://vercel.live https://api.vercel.com wss://ws-us3.pusher.com https://sockjs-us3.pusher.com;
media-src 'self' blob:;
worker-src 'self' blob:;
manifest-src 'self';
```

**Development CSP:** More permissive to allow hot reloading and development tools.

### Additional Security Headers

- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME sniffing
- **X-DNS-Prefetch-Control**: `false` - Disables DNS prefetching
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains; preload` - Forces HTTPS
- **Permissions-Policy**: Restricts browser features
- **X-XSS-Protection**: `1; mode=block` - Legacy XSS protection

## Authentication & Authorization

### User Roles and Permissions

#### Admin
- Full system access
- User management
- System configuration
- All project and monitoring permissions

#### Manager
- User read/write permissions
- Project management
- Monitoring access
- Team oversight

#### Developer
- Project read/write permissions
- Monitoring read access
- Code deployment capabilities

#### Viewer
- Read-only access to projects
- Monitoring dashboard access
- Limited system interaction

### Session Security

- **JWT Tokens**: Secure token generation with HMAC-SHA256
- **Session Duration**: 24 hours with 2-hour refresh threshold
- **Secure Cookies**: HttpOnly, Secure, SameSite attributes
- **Session Cleanup**: Automatic cleanup of expired sessions

## Threat Mitigation

### 1. Cross-Site Scripting (XSS)

**Mitigation Strategies:**
- Comprehensive Content Security Policy
- Input sanitization and validation
- Output encoding
- React's built-in XSS protection

**Testing:** Automated XSS payload testing in security test suite

### 2. SQL Injection

**Mitigation Strategies:**
- Parameterized queries (when using databases)
- Input validation and sanitization
- Error message sanitization
- Principle of least privilege for database access

**Testing:** SQL injection payload testing with error detection

### 3. Cross-Site Request Forgery (CSRF)

**Mitigation Strategies:**
- CSRF token validation for state-changing operations
- SameSite cookie attributes
- Strict origin checking
- Double-submit cookie pattern

### 4. Clickjacking

**Mitigation Strategies:**
- X-Frame-Options: DENY header
- CSP frame-ancestors directive
- Client-side frame busting (defense in depth)

### 5. Man-in-the-Middle (MITM)

**Mitigation Strategies:**
- HTTPS enforcement
- HTTP Strict Transport Security (HSTS)
- Certificate pinning (for mobile apps)
- Secure cookie flags

### 6. Directory Traversal

**Mitigation Strategies:**
- Path validation and sanitization
- Whitelist-based file access
- Chroot jails for file operations
- Input validation for file paths

### 7. Rate Limiting & DDoS

**Mitigation Strategies:**
- Request rate limiting (per IP)
- API endpoint specific limits
- Progressive delays for repeated violations
- IP-based blocking for severe abuse

## Security Configuration

### Environment Variables

Security-related environment variables should be configured:

```bash
# JWT Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Monitoring & Alerting
ERROR_MONITORING_WEBHOOK=https://your-monitoring-service/webhook
CRITICAL_ALERT_WEBHOOK=https://your-alerting-service/webhook
SECURITY_WEBHOOK_URL=https://your-security-monitoring/webhook

# Optional: Sentry Integration
SENTRY_DSN=https://your-sentry-dsn

# Development Only
NODE_ENV=production
```

### Production Checklist

- [ ] Change default JWT secret
- [ ] Configure monitoring webhooks
- [ ] Enable HTTPS with valid certificates
- [ ] Set up security monitoring
- [ ] Configure rate limiting thresholds
- [ ] Review and customize CSP headers
- [ ] Set up log aggregation
- [ ] Configure backup and recovery
- [ ] Enable security alerting
- [ ] Conduct security audit

## Security Testing

### Automated Security Tests

The security test suite (`tests/security/security-audit.spec.ts`) includes:

1. **Security Headers Validation**
   - CSP header presence and configuration
   - Security header completeness
   - Header value validation

2. **XSS Vulnerability Testing**
   - Multiple XSS payload types
   - URL parameter injection
   - DOM-based XSS detection

3. **SQL Injection Testing**
   - Various SQL injection patterns
   - Error message analysis
   - Database error detection

4. **CSRF Protection Testing**
   - State-changing operation protection
   - Token validation testing

5. **Session Security Testing**
   - Cookie security attributes
   - Session management validation

6. **Directory Traversal Testing**
   - Path traversal payload testing
   - System file access detection

7. **Rate Limiting Testing**
   - Request rate validation
   - Abuse prevention testing

8. **HTTPS Enforcement Testing**
   - SSL/TLS configuration validation

### Running Security Tests

```bash
# Run full security audit
npm run test:security

# Run specific security tests
npx playwright test tests/security/security-audit.spec.ts

# Run security tests with reporting
npx playwright test tests/security/ --reporter=html
```

### Manual Security Testing

#### OWASP ZAP Integration

1. Install OWASP ZAP
2. Configure proxy settings
3. Run automated scan against development environment
4. Review and address findings

#### Penetration Testing Checklist

- [ ] Authentication bypass attempts
- [ ] Authorization escalation testing
- [ ] Input validation testing
- [ ] Session management testing
- [ ] Error handling analysis
- [ ] Information disclosure testing
- [ ] Business logic testing

## Security Monitoring

### Logging and Monitoring

The security system logs the following events:

- **Authentication Events**: Login attempts, token validation, session creation
- **Authorization Events**: Access denials, permission checks
- **Security Violations**: Suspicious patterns, blocked requests
- **Rate Limiting**: Rate limit violations, IP blocking
- **Error Events**: Application errors with security context

### Log Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "security",
  "type": "blocked",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "url": "/api/endpoint",
  "details": {
    "reason": "suspicious_pattern",
    "pattern": "sql_injection"
  }
}
```

### Alerting

Critical security events trigger immediate alerts:

- **Critical Errors**: System-level security failures
- **Multiple Failed Logins**: Potential brute force attacks
- **SQL Injection Attempts**: Database attack attempts
- **XSS Attempts**: Cross-site scripting attempts
- **Rate Limit Violations**: Potential DDoS attacks

## Incident Response

### Security Incident Process

1. **Detection**: Automated monitoring or manual reporting
2. **Assessment**: Severity and impact evaluation
3. **Containment**: Immediate threat mitigation
4. **Investigation**: Root cause analysis
5. **Recovery**: System restoration and hardening
6. **Post-Incident**: Lessons learned and improvements

### Emergency Response

For critical security incidents:

1. **Immediate Actions**:
   - Block suspicious IPs
   - Disable compromised accounts
   - Enable additional logging
   - Notify security team

2. **Communication**:
   - Internal notification
   - User communication (if necessary)
   - Regulatory reporting (if required)

3. **Documentation**:
   - Incident timeline
   - Actions taken
   - Lessons learned
   - Preventive measures

## Security Best Practices

### Development Guidelines

1. **Input Validation**:
   - Validate all user inputs
   - Use whitelist validation
   - Sanitize data before processing
   - Validate file uploads

2. **Authentication**:
   - Use strong password requirements
   - Implement multi-factor authentication
   - Use secure session management
   - Implement account lockout policies

3. **Authorization**:
   - Implement role-based access control
   - Use principle of least privilege
   - Validate permissions on every request
   - Implement resource-level permissions

4. **Data Protection**:
   - Encrypt sensitive data
   - Use HTTPS for all communications
   - Implement secure key management
   - Regular security updates

### Code Review Guidelines

Security-focused code review checklist:

- [ ] Input validation implemented
- [ ] Authentication checks present
- [ ] Authorization properly enforced
- [ ] Error handling doesn't leak information
- [ ] Logging includes security context
- [ ] Dependencies are up to date
- [ ] Secrets are not hardcoded
- [ ] Security headers are implemented

## Compliance

### OWASP Top 10 Coverage

1. **Injection**: Input validation, parameterized queries
2. **Broken Authentication**: JWT implementation, session management
3. **Sensitive Data Exposure**: Encryption, secure headers
4. **XML External Entities**: Not applicable (no XML processing)
5. **Broken Access Control**: RBAC, permission validation
6. **Security Misconfiguration**: Secure defaults, configuration management
7. **Cross-Site Scripting**: CSP, input sanitization
8. **Insecure Deserialization**: Secure JSON handling
9. **Using Components with Known Vulnerabilities**: Dependency scanning
10. **Insufficient Logging & Monitoring**: Comprehensive logging system

### Security Standards

The OpsSight platform follows these security standards:

- **NIST Cybersecurity Framework**
- **OWASP Security Guidelines**
- **ISO 27001 Principles**
- **GDPR Privacy Requirements**

## Maintenance

### Regular Security Tasks

#### Daily
- Monitor security logs
- Review failed authentication attempts
- Check system health dashboards

#### Weekly
- Review security alerts
- Update security configurations
- Analyze security metrics

#### Monthly
- Security dependency updates
- Review access permissions
- Security training updates

#### Quarterly
- Comprehensive security audit
- Penetration testing
- Security policy review
- Incident response plan testing

### Security Updates

1. **Dependency Updates**:
   ```bash
   npm audit
   npm audit fix
   npm update
   ```

2. **Security Configuration Updates**:
   - Review CSP headers
   - Update rate limiting thresholds
   - Review user permissions
   - Update security policies

3. **Monitoring Updates**:
   - Review log retention policies
   - Update alerting thresholds
   - Review monitoring coverage

## Troubleshooting

### Common Security Issues

1. **CSP Violations**:
   - Review browser console for CSP errors
   - Update CSP headers to allow legitimate resources
   - Use CSP report-only mode for testing

2. **Authentication Failures**:
   - Check JWT token expiration
   - Verify session storage
   - Review authentication logs

3. **Rate Limiting Issues**:
   - Check IP-based limits
   - Review rate limiting logs
   - Adjust thresholds if necessary

4. **Security Header Issues**:
   - Verify middleware configuration
   - Check header presence in responses
   - Review header values

### Performance Impact

Security measures are designed to minimize performance impact:

- **Rate Limiting**: O(1) memory-based implementation
- **Pattern Detection**: Optimized regex patterns
- **Session Management**: Efficient in-memory storage
- **Logging**: Asynchronous processing

## Contact

For security concerns or questions:

- **Security Team**: security@opssight.com
- **Emergency Contact**: +1-555-SECURITY
- **Security Reporting**: https://opssight.com/security-report

---

*This security guide should be reviewed and updated regularly to reflect the current security posture and threat landscape.* 