# Lighthouse CI Performance Monitoring

This document explains how to use Lighthouse CI for automated performance monitoring of the DevOps application frontend.

## Overview

Lighthouse CI is configured to automatically test performance, accessibility, best practices, and SEO for key pages in the application. It runs both mobile and desktop tests with appropriate thresholds.

## Configuration Files

### `lighthouserc.js` (Mobile/Default)
- **Target**: Mobile performance testing
- **Network**: Slow 3G simulation
- **Thresholds**: Mobile-optimized performance targets
- **Pages tested**: Home, Login, Profile, Settings

### `lighthouserc-desktop.js` (Desktop)
- **Target**: Desktop performance testing  
- **Network**: Fast broadband simulation
- **Thresholds**: Higher performance expectations
- **Pages tested**: Same as mobile

## Performance Thresholds

### Mobile Thresholds
| Metric | Target | Description |
|--------|--------|-------------|
| Performance | ≥ 80% | Overall performance score |
| Accessibility | ≥ 90% | Accessibility compliance |
| Best Practices | ≥ 90% | Web development best practices |
| SEO | ≥ 80% | Search engine optimization |
| First Contentful Paint | ≤ 2.0s | Time to first content |
| Largest Contentful Paint | ≤ 2.5s | Time to main content |
| Total Blocking Time | ≤ 300ms | Main thread blocking time |
| Cumulative Layout Shift | ≤ 0.1 | Visual stability |

### Desktop Thresholds
| Metric | Target | Description |
|--------|--------|-------------|
| Performance | ≥ 85% | Higher performance expectation |
| First Contentful Paint | ≤ 1.5s | Faster expected load time |
| Largest Contentful Paint | ≤ 2.0s | Faster main content load |
| Total Blocking Time | ≤ 200ms | Lower blocking tolerance |

## Local Testing

### Prerequisites
```bash
# Lighthouse CI is already installed in devDependencies
npm install
```

### Run Performance Tests
```bash
# Run mobile performance tests
npm run lighthouse:local

# Run desktop performance tests  
npm run lighthouse:desktop

# Run both mobile and desktop tests
npm run performance:test

# Build and run full audit
npm run lighthouse:audit
```

### Manual Lighthouse Testing
```bash
# Test a specific URL
npx lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html

# Test with mobile simulation
npx lighthouse http://localhost:3000 --preset=perf --form-factor=mobile

# Test with desktop simulation
npx lighthouse http://localhost:3000 --preset=perf --form-factor=desktop
```

## CI/CD Integration

### GitHub Actions
The `.github/workflows/lighthouse-ci.yml` workflow automatically runs:

1. **On Push/PR**: Tests performance for frontend changes
2. **Mobile & Desktop**: Separate jobs for different form factors
3. **Artifact Upload**: Stores detailed reports for 30 days
4. **PR Comments**: Adds performance summary to pull requests

### Workflow Triggers
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`
- Only when files in `frontend/` directory change

### Required Secrets (Optional)
For enhanced features, add these GitHub secrets:
- `LHCI_GITHUB_APP_TOKEN`: For GitHub integration
- `LHCI_TOKEN`: For Lighthouse CI server integration

## Understanding Results

### Performance Score Breakdown
- **0-49**: Poor performance (red)
- **50-89**: Needs improvement (orange)  
- **90-100**: Good performance (green)

### Key Metrics to Monitor
1. **Core Web Vitals**: LCP, FID, CLS
2. **Loading Performance**: FCP, Speed Index, TTI
3. **Resource Optimization**: Unused JS/CSS, image optimization
4. **Accessibility**: Color contrast, alt text, labels

### Common Issues and Solutions

#### Low Performance Score
- **Large JavaScript bundles**: Use code splitting (already implemented)
- **Unoptimized images**: Use Next.js Image component (already implemented)
- **Render-blocking resources**: Optimize CSS delivery
- **Third-party scripts**: Lazy load non-critical scripts

#### Accessibility Issues
- **Missing alt text**: Ensure all images have descriptive alt attributes
- **Color contrast**: Use sufficient contrast ratios (4.5:1 minimum)
- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **Screen reader support**: Use semantic HTML and ARIA labels

#### Best Practices Violations
- **Security headers**: Configure CSP, HSTS headers
- **HTTPS usage**: Ensure all resources use HTTPS
- **Vulnerable libraries**: Update dependencies regularly
- **Console errors**: Fix JavaScript errors and warnings

## Monitoring and Alerts

### Local Development
```bash
# Quick performance check during development
npm run lighthouse:local

# Full performance audit before deployment
npm run performance:test
```

### Continuous Monitoring
1. **PR Reviews**: Check Lighthouse CI results before merging
2. **Performance Budgets**: Monitor bundle size changes
3. **Core Web Vitals**: Track real user metrics
4. **Regular Audits**: Run comprehensive tests weekly

## Customization

### Adjusting Thresholds
Edit `lighthouserc.js` or `lighthouserc-desktop.js`:

```javascript
assertions: {
  'categories:performance': ['error', { minScore: 0.85 }], // Increase to 85%
  'first-contentful-paint': ['error', { maxNumericValue: 1500 }], // Stricter FCP
}
```

### Adding New Pages
Add URLs to the configuration:

```javascript
url: [
  'http://localhost:3000',
  'http://localhost:3000/new-page', // Add new page
],
```

### Custom Audits
Skip or add specific audits:

```javascript
settings: {
  skipAudits: ['uses-http2'], // Skip specific audits
  onlyAudits: ['performance'], // Only run performance audits
},
```

## Troubleshooting

### Common Issues

#### Server Start Timeout
```bash
# Increase timeout in configuration
startServerReadyTimeout: 60000, // 60 seconds
```

#### Memory Issues in CI
```bash
# Add Chrome flags
chromeFlags: '--no-sandbox --disable-dev-shm-usage --max_old_space_size=4096'
```

#### Network Throttling Issues
```bash
# Disable throttling for local testing
throttling: {
  rttMs: 0,
  throughputKbps: 0,
  cpuSlowdownMultiplier: 1,
}
```

### Debug Mode
```bash
# Run with debug output
DEBUG=lhci:* npm run lighthouse:local
```

## Performance Optimization Checklist

- [x] **Code Splitting**: Implemented with React.lazy()
- [x] **Image Optimization**: Using Next.js Image component
- [x] **Bundle Analysis**: Configured with @next/bundle-analyzer
- [x] **React Optimization**: Using React.memo and useMemo
- [x] **Lighthouse CI**: Automated performance monitoring
- [ ] **Service Worker**: Consider for caching strategies
- [ ] **CDN**: Consider for static asset delivery
- [ ] **Database Optimization**: Optimize API response times
- [ ] **Monitoring**: Set up real user monitoring (RUM)

## Resources

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring](https://web.dev/performance-scoring/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance) 