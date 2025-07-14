# Performance Optimization Guide

This guide covers the comprehensive performance optimizations implemented in the OpsSight DevOps platform, leveraging React 19 and Next.js 15 features for optimal user experience.

## Table of Contents

1. [Next.js Configuration Optimizations](#nextjs-configuration-optimizations)
2. [React 19 Performance Features](#react-19-performance-features)
3. [Asset Optimization](#asset-optimization)
4. [React Query Caching](#react-query-caching)
5. [Performance Monitoring](#performance-monitoring)
6. [Error Boundaries](#error-boundaries)
7. [Bundle Optimization](#bundle-optimization)
8. [Core Web Vitals](#core-web-vitals)
9. [Best Practices](#best-practices)

## Next.js Configuration Optimizations

### Enhanced `next.config.ts`

Our optimized Next.js configuration includes:

```typescript
// React 19 Compiler (experimental but stable)
experimental: {
  reactCompiler: true,
  optimizePackageImports: [
    '@heroicons/react',
    '@headlessui/react',
    'react-icons',
    'framer-motion',
    'date-fns',
    'clsx'
  ],
  optimizeServerReact: true,
  serverMinification: true,
  staleTimes: {
    dynamic: 30,
    static: 180,
  },
}
```

**Key Features:**
- **React Compiler**: Automatic memoization and optimization
- **Package Import Optimization**: Tree-shaking for major UI libraries
- **Server Optimizations**: Enhanced SSR performance
- **Advanced Caching**: Configurable stale times

### Webpack Optimizations

```typescript
webpack: (config, { dev, isServer, webpack }) => {
  if (!dev) {
    config.optimization = {
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: { /* Vendor code separation */ },
          react: { /* React-specific chunks */ },
          ui: { /* UI library chunks */ },
        },
      },
    };
  }
}
```

**Benefits:**
- Deterministic chunk IDs for better caching
- Intelligent code splitting
- Optimized vendor bundles

## React 19 Performance Features

### Performance Utilities (`src/utils/performance.ts`)

#### Core Features

1. **startTransition Integration**
   ```typescript
   import { startTransition } from 'react';
   
   const handleNonUrgentUpdate = () => {
     startTransition(() => {
       setLargeDataSet(newData);
     });
   };
   ```

2. **Profiled Hooks**
   ```typescript
   const expensiveValue = useProfiledMemo(
     () => complexCalculation(data),
     [data],
     'Complex Calculation'
   );
   ```

3. **Virtual Scrolling**
   ```typescript
   const { visibleItems, totalHeight, handleScroll } = useVirtualScrolling({
     items: largeDataset,
     itemHeight: 60,
     containerHeight: 400,
     overscan: 5,
   });
   ```

#### Performance Hooks

- `useProfiledMemo`: Enhanced memoization with performance warnings
- `useProfiledCallback`: Callback optimization with execution tracking
- `useDebounced`: Value debouncing for performance
- `useThrottled`: Function throttling
- `useIntersectionObserver`: Lazy loading with intersection observer
- `useVirtualScrolling`: Large list optimization
- `usePerformanceMonitor`: Component render tracking
- `useAnimationFrame`: Smooth animations

## Asset Optimization

### Image Optimization (`src/utils/assetOptimization.ts`)

#### Optimized Image Props
```typescript
const imageProps = getOptimizedImageProps(
  '/images/dashboard-hero.jpg',
  'Dashboard Overview',
  {
    quality: 80,
    format: 'webp',
    priority: true,
    placeholder: 'blur',
    blurDataURL: generateBlurDataURL(10, 6)
  }
);
```

#### Lazy Image Loading
```typescript
const { imageRef, isLoaded, shouldLoad } = useLazyImage(
  '/images/large-chart.png',
  { quality: 75, format: 'webp' }
);
```

#### Font Optimization
```typescript
const fontLinks = generateFontLinks('Inter', {
  display: 'swap',
  preload: true,
  weight: '400,600,700'
});
```

### Asset Optimization Presets

```typescript
import { assetOptimizationPresets } from '@/utils/assetOptimization';

// Critical path assets
const heroImageProps = getOptimizedImageProps(
  src, 
  alt, 
  assetOptimizationPresets.critical.images
);

// Standard assets
const contentImageProps = getOptimizedImageProps(
  src, 
  alt, 
  assetOptimizationPresets.standard.images
);
```

## React Query Caching

### Optimized Query Client

```typescript
import { createOptimizedQueryClient } from '@/utils/reactQueryOptimization';

const queryClient = createOptimizedQueryClient();
```

**Features:**
- Smart retry logic (404s don't retry, 5xx errors retry up to 3 times)
- Exponential backoff with cap
- Optimized stale times (5 minutes default)
- Garbage collection after 10 minutes

### Query Key Factory

```typescript
import { createQueryKeys } from '@/utils/reactQueryOptimization';

// Usage
const dashboardQuery = useOptimizedQuery(
  createQueryKeys.dashboardData({ filters: activeFilters }),
  fetchDashboardData,
  {
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time dashboard
    enableBackgroundRefetch: true,
  }
);
```

### Prefetching Strategies

```typescript
const { prefetchDashboard, prefetchOnHover, prefetchRelated } = usePrefetchStrategies();

// Prefetch critical data on app load
useEffect(() => {
  prefetchDashboard();
}, []);

// Prefetch on navigation hover
<NavItem 
  onMouseEnter={prefetchOnHover(
    createQueryKeys.serverDetails(serverId),
    () => fetchServerDetails(serverId)
  )}
>
```

### Background Sync

```typescript
useBackgroundSync({
  enabled: true,
  interval: 30000, // 30 seconds
  queryKeys: [
    createQueryKeys.dashboardData(),
    createQueryKeys.metricsAggregated('1h'),
  ]
});
```

## Performance Monitoring

### Real-time Performance Monitor

The `PerformanceMonitor` component provides real-time Core Web Vitals tracking:

```typescript
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';

<PerformanceMonitor 
  enabled={process.env.NODE_ENV === 'development'}
  showDevOverlay={true}
  onMetricsUpdate={(metrics) => {
    // Send to analytics
    analytics.track('performance_metrics', metrics);
  }}
/>
```

**Tracked Metrics:**
- **Core Web Vitals**: LCP, FID, CLS, FCP, TTFB
- **React Performance**: Render time, re-render count, component count
- **Memory Usage**: JS heap size, usage patterns
- **Resource Loading**: Asset count, transfer sizes, slow resources

### Performance Thresholds

```typescript
const customThresholds = {
  lcp: { good: 2000, needs_improvement: 3500 }, // Stricter LCP
  fid: { good: 50, needs_improvement: 200 },    // Stricter FID
  cls: { good: 0.05, needs_improvement: 0.15 }, // Stricter CLS
};

<PerformanceMonitor thresholds={customThresholds} />
```

### Development Overlay

The performance monitor includes a development overlay showing:
- Real-time metric values with status indicators (✅ ⚠️ ❌)
- Memory usage breakdown
- Resource loading statistics
- Performance budget warnings

## Error Boundaries

### Comprehensive Error Handling

```typescript
import ErrorBoundary, { withErrorBoundary } from '@/components/performance/ErrorBoundary';

// Page-level error boundary
<ErrorBoundary level="page" onError={handleError}>
  <DashboardPage />
</ErrorBoundary>

// Component-level with HOC
const SafeChart = withErrorBoundary(Chart, {
  level: 'component',
  fallback: <ChartErrorFallback />
});
```

**Error Boundary Features:**
- **Three-level fallbacks**: Page, section, component
- **Performance context**: Error reporting with performance metrics
- **Session storage**: Debug data persistence
- **Retry mechanisms**: Graceful recovery
- **Production error reporting**: Automatic error service integration

### Error Context Collection

Errors are reported with comprehensive context:
- Performance metrics at time of error
- User session information
- Browser and environment details
- Component stack traces
- Memory usage statistics

## Bundle Optimization

### Code Splitting

```typescript
import { lazyImport } from '@/utils/performance';

// Lazy load heavy components
const DashboardCharts = lazyImport(
  () => import('./DashboardCharts'),
  'DashboardCharts'
);

// Use with Suspense
<Suspense fallback={<ChartSkeleton />}>
  <DashboardCharts data={chartData} />
</Suspense>
```

### Dynamic Imports with Error Handling

```typescript
import { optimizedDynamicImport } from '@/utils/assetOptimization';

const loadChartLibrary = async () => {
  return await optimizedDynamicImport(
    () => import('recharts'),
    { priority: 'high', preload: true }
  );
};
```

### Bundle Analysis

Run bundle analysis to identify optimization opportunities:

```bash
npm run analyze
```

This generates an interactive bundle analyzer report showing:
- Bundle sizes by route
- Duplicate dependencies
- Unused code opportunities
- Optimization recommendations

## Core Web Vitals

### Target Metrics

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤ 2.5s | 2.5s - 4.0s | > 4.0s |
| FID | ≤ 100ms | 100ms - 300ms | > 300ms |
| CLS | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP | ≤ 1.8s | 1.8s - 3.0s | > 3.0s |
| TTFB | ≤ 800ms | 800ms - 1.8s | > 1.8s |

### Optimization Strategies

#### Largest Contentful Paint (LCP)
- Image optimization with WebP/AVIF formats
- Critical resource preloading
- Server-side rendering for above-the-fold content
- Font optimization with `font-display: swap`

#### First Input Delay (FID)
- React 19 `startTransition` for non-urgent updates
- Code splitting to reduce main thread blocking
- Service worker for background processing
- Debounced/throttled event handlers

#### Cumulative Layout Shift (CLS)
- Explicit dimensions for images and videos
- Skeleton loading states
- Font fallbacks to prevent font swapping
- Reserved space for dynamic content

### Monitoring Implementation

```typescript
// Automatic Core Web Vitals tracking
useEffect(() => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      switch (entry.entryType) {
        case 'largest-contentful-paint':
          reportLCP(entry.startTime);
          break;
        case 'first-input':
          reportFID(entry.processingStart - entry.startTime);
          break;
        case 'layout-shift':
          if (!entry.hadRecentInput) {
            reportCLS(entry.value);
          }
          break;
      }
    }
  });

  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}, []);
```

## Best Practices

### Component Optimization

1. **Use React.memo for stable components**
   ```typescript
   const StableComponent = React.memo(({ data }) => {
     return <div>{data.title}</div>;
   });
   ```

2. **Implement useCallback for event handlers**
   ```typescript
   const handleClick = useCallback((id: string) => {
     onItemClick(id);
   }, [onItemClick]);
   ```

3. **Optimize context usage**
   ```typescript
   // Split contexts by update frequency
   const StaticDataContext = createContext(staticData);
   const DynamicDataContext = createContext(dynamicData);
   ```

### Image Optimization

1. **Use Next.js Image component**
   ```typescript
   import Image from 'next/image';
   
   <Image
     src="/dashboard-chart.png"
     alt="Performance Chart"
     width={800}
     height={400}
     priority={isAboveFold}
     placeholder="blur"
     blurDataURL={blurDataURL}
   />
   ```

2. **Implement responsive images**
   ```typescript
   const responsiveSizes = generateResponsiveSizes({
     mobile: 320,
     tablet: 768,
     desktop: 1200,
   });
   ```

3. **Lazy load non-critical images**
   ```typescript
   const { imageRef, shouldLoad } = useLazyImage(src);
   
   {shouldLoad && <Image ref={imageRef} src={src} alt={alt} />}
   ```

### Bundle Optimization

1. **Implement code splitting at route level**
   ```typescript
   const DashboardPage = lazy(() => import('./pages/DashboardPage'));
   const MetricsPage = lazy(() => import('./pages/MetricsPage'));
   ```

2. **Use dynamic imports for heavy libraries**
   ```typescript
   const loadDateLibrary = () => import('date-fns');
   const loadChartLibrary = () => import('recharts');
   ```

3. **Optimize dependencies**
   - Remove unused dependencies
   - Use tree-shaking compatible libraries
   - Prefer smaller alternatives (e.g., `date-fns` over `moment.js`)

### Performance Testing

1. **Lighthouse CI Integration**
   ```bash
   npm run lighthouse:audit
   npm run lighthouse:desktop
   ```

2. **Playwright Performance Tests**
   ```bash
   npm run test:e2e:performance
   ```

3. **Bundle Size Monitoring**
   ```bash
   npm run analyze
   ```

### Monitoring and Alerting

1. **Set up performance budgets**
   - Bundle size limits
   - Core Web Vitals thresholds
   - Memory usage limits
   - API response time budgets

2. **Implement real user monitoring (RUM)**
   - Track actual user experiences
   - Monitor performance across different devices/networks
   - Set up alerts for performance regressions

3. **Regular performance audits**
   - Weekly Lighthouse audits
   - Monthly bundle analysis
   - Quarterly performance review

## Performance Checklist

### Before Deployment

- [ ] Run Lighthouse audit (score ≥ 90 for all categories)
- [ ] Verify Core Web Vitals meet "Good" thresholds
- [ ] Check bundle size hasn't increased significantly
- [ ] Test on various devices and network conditions
- [ ] Verify error boundaries are working
- [ ] Confirm performance monitoring is active

### Ongoing Monitoring

- [ ] Monitor Core Web Vitals weekly
- [ ] Review performance alerts
- [ ] Analyze slow query performance
- [ ] Check for memory leaks
- [ ] Update performance budgets as needed

This comprehensive performance optimization guide ensures the OpsSight platform delivers exceptional user experience across all devices and network conditions, leveraging the latest React 19 and Next.js 15 performance features. 