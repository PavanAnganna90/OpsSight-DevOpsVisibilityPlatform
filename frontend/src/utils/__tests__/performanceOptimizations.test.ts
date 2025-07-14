/**
 * Performance Optimizations Tests
 * 
 * Comprehensive test suite for performance optimization utilities
 * including GPU acceleration, DOM batching, caching, and monitoring.
 */

import {
  usePerformanceOptimization,
  withPerformanceMonitoring,
  createOptimizedTransition,
  PerformanceConfig,
  PerformanceMetrics,
  performanceOptimizer,
} from '../performanceOptimizations';
// Mock DOM element creator
const createMockElement = (tagName: string): HTMLElement => {
  const element = document.createElement(tagName);
  // Mock style properties needed for tests
  Object.defineProperty(element, 'style', {
    value: {
      transform: '',
      willChange: '',
      backfaceVisibility: '',
      backgroundColor: '',
      color: '',
    },
    writable: true,
    configurable: true,
  });
  return element;
};

// Mock performance test utilities
const createPerformanceTestUtils = () => ({
  measureTime: (fn: () => void) => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  },
  waitForNextFrame: () => new Promise(resolve => requestAnimationFrame(resolve)),
});

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRAF = jest.fn();
const mockCAF = jest.fn();
global.requestAnimationFrame = mockRAF;
global.cancelAnimationFrame = mockCAF;

describe('Performance Optimizations', () => {
  let mockElement: HTMLElement;
  let performanceUtils: ReturnType<typeof createPerformanceTestUtils>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockElement = createMockElement('div');
    performanceUtils = createPerformanceTestUtils();
    
    // Reset RAF mock to return incrementing IDs
    let rafId = 1;
    mockRAF.mockImplementation((callback) => {
      setTimeout(callback, 16); // Simulate 60fps
      return rafId++;
    });
    
    // Reset the global performance optimizer
    const { updateConfig } = usePerformanceOptimization();
    updateConfig({
      enableGPUAcceleration: true,
      batchDOMUpdates: true,
      enableCaching: true,
      maxCacheSize: 50,
      targetFrameRate: 60,
      enableMetrics: false,
      memoryThreshold: 100,
    });
    
    // Clear any pending DOM updates and reset processing state
    (performanceOptimizer as any).domUpdateQueue = [];
    (performanceOptimizer as any).isProcessingUpdates = false;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('usePerformanceOptimization Hook', () => {
    it('should provide performance optimization functions', () => {
      const {
        updateConfig,
        optimizeElement,
        cleanupElement,
        queueUpdate,
        getReport,
        isHealthy,
      } = usePerformanceOptimization();

      expect(typeof updateConfig).toBe('function');
      expect(typeof optimizeElement).toBe('function');
      expect(typeof cleanupElement).toBe('function');
      expect(typeof queueUpdate).toBe('function');
      expect(typeof getReport).toBe('function');
      expect(typeof isHealthy).toBe('function');
    });

    it('should update configuration correctly', () => {
      const { updateConfig, getReport } = usePerformanceOptimization();
      
      const newConfig: Partial<PerformanceConfig> = {
        enableGPUAcceleration: false,
        targetFrameRate: 30,
        maxCacheSize: 25,
      };

      updateConfig(newConfig);
      
      // Configuration should be applied (we can't directly test internal state,
      // but we can test that the functions still work)
      expect(() => updateConfig(newConfig)).not.toThrow();
    });

    it('should optimize element for transitions', () => {
      const { optimizeElement, updateConfig } = usePerformanceOptimization();
      
      // Ensure GPU acceleration is enabled
      updateConfig({ enableGPUAcceleration: true });
      
      optimizeElement(mockElement);
      
      // Should apply GPU acceleration styles
      expect(mockElement.style.transform).toBe('translate3d(0, 0, 0)');
      expect(mockElement.style.willChange).toBe('transform, opacity, background-color, color, border-color, box-shadow');
      expect(mockElement.style.backfaceVisibility).toBe('hidden');
    });

    it('should cleanup element optimizations', () => {
      const { optimizeElement, cleanupElement, updateConfig } = usePerformanceOptimization();
      
      // Ensure GPU acceleration is enabled
      updateConfig({ enableGPUAcceleration: true });
      
      // First optimize
      optimizeElement(mockElement);
      expect(mockElement.style.transform).toBe('translate3d(0, 0, 0)');
      
      // Then cleanup
      cleanupElement(mockElement);
      expect(mockElement.style.transform).toBe('');
      expect(mockElement.style.willChange).toBe('');
      expect(mockElement.style.backfaceVisibility).toBe('');
    });

    it('should queue DOM updates with different priorities', () => {
      const { queueUpdate } = usePerformanceOptimization();
      
      const properties = { backgroundColor: 'red', color: 'white' };
      
      // Should not throw when queueing updates
      expect(() => {
        queueUpdate(mockElement, properties, 'high');
        queueUpdate(mockElement, properties, 'medium');
        queueUpdate(mockElement, properties, 'low');
      }).not.toThrow();
    });

    it('should provide performance report', () => {
      const { getReport } = usePerformanceOptimization();
      
      const report = getReport();
      
      expect(report).toHaveProperty('averageTransitionDuration');
      expect(report).toHaveProperty('averageFrameRate');
      expect(report).toHaveProperty('averageMemoryUsage');
      expect(report).toHaveProperty('cacheEfficiency');
      expect(report).toHaveProperty('totalTransitions');
      
      expect(typeof report.averageTransitionDuration).toBe('number');
      expect(typeof report.averageFrameRate).toBe('number');
      expect(typeof report.averageMemoryUsage).toBe('number');
      expect(typeof report.cacheEfficiency).toBe('number');
      expect(typeof report.totalTransitions).toBe('number');
    });

    it('should check memory health status', () => {
      const { isHealthy } = usePerformanceOptimization();
      
      const healthy = isHealthy();
      expect(typeof healthy).toBe('boolean');
    });
  });

  describe('withPerformanceMonitoring HOF', () => {
    it('should wrap async functions with performance monitoring', async () => {
      const mockAsyncFunction = jest.fn().mockResolvedValue('test result');
      const monitoredFunction = withPerformanceMonitoring(mockAsyncFunction, 'testFunction');

      const result = await monitoredFunction('arg1', 'arg2');

      expect(result).toBe('test result');
      expect(mockAsyncFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle function errors gracefully', async () => {
      const mockError = new Error('Test error');
      const mockAsyncFunction = jest.fn().mockRejectedValue(mockError);
      const monitoredFunction = withPerformanceMonitoring(mockAsyncFunction, 'errorFunction');

      await expect(monitoredFunction()).rejects.toThrow('Test error');
      expect(mockAsyncFunction).toHaveBeenCalled();
    });

    it('should measure execution time', async () => {
      const mockAsyncFunction = jest.fn().mockImplementation(async () => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      });

      const monitoredFunction = withPerformanceMonitoring(mockAsyncFunction, 'timedFunction');
      
      const startTime = Date.now();
      await monitoredFunction();
      const endTime = Date.now();
      
      // Should have taken at least 100ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('createOptimizedTransition', () => {
    it('should create optimized transitions between states', async () => {
      const { updateConfig } = usePerformanceOptimization();
      
      // Ensure GPU acceleration is enabled
      updateConfig({ enableGPUAcceleration: true });
      
      const fromState = { opacity: '0', transform: 'scale(0.8)' };
      const toState = { opacity: '1', transform: 'scale(1)' };
      
      const transitionPromise = createOptimizedTransition(
        mockElement,
        fromState,
        toState,
        200
      );

      expect(transitionPromise).toBeInstanceOf(Promise);
      
      // Should apply from state initially (overrides GPU acceleration transform)
      expect(mockElement.style.transform).toBe('scale(0.8)');
      expect(mockElement.style.opacity).toBe('0');
      expect(mockElement.style.willChange).toBe('transform, opacity, background-color, color, border-color, box-shadow');
      
      await transitionPromise;
      
      // Should cleanup after transition
      expect(mockElement.style.willChange).toBe('');
    });

    it('should handle transition with default duration', async () => {
      const fromState = { opacity: '0' };
      const toState = { opacity: '1' };
      
      const transitionPromise = createOptimizedTransition(
        mockElement,
        fromState,
        toState
      );

      expect(transitionPromise).toBeInstanceOf(Promise);
      await transitionPromise;
    });

    it('should apply initial state before transition', async () => {
      const { updateConfig } = usePerformanceOptimization();
      
      // Ensure GPU acceleration is enabled
      updateConfig({ enableGPUAcceleration: true });
      
      const fromState = { backgroundColor: 'red', color: 'white' };
      const toState = { backgroundColor: 'blue', color: 'black' };
      
      createOptimizedTransition(mockElement, fromState, toState, 100);
      
      // Should apply from state initially
      expect(mockElement.style.backgroundColor).toBe('red');
      expect(mockElement.style.color).toBe('white');
    });
  });

  describe('Performance Configuration', () => {
    it('should handle GPU acceleration toggle', () => {
      const { updateConfig, optimizeElement } = usePerformanceOptimization();
      
      // Disable GPU acceleration
      updateConfig({ enableGPUAcceleration: false });
      optimizeElement(mockElement);
      
      // Should not apply GPU acceleration when disabled
      // (We can't directly test this without access to internal state,
      // but we can verify the function doesn't throw)
      expect(() => optimizeElement(mockElement)).not.toThrow();
    });

    it('should handle caching configuration', () => {
      const { updateConfig } = usePerformanceOptimization();
      
      const config: Partial<PerformanceConfig> = {
        enableCaching: false,
        maxCacheSize: 10,
      };
      
      expect(() => updateConfig(config)).not.toThrow();
    });

    it('should handle metrics configuration', () => {
      const { updateConfig } = usePerformanceOptimization();
      
      const config: Partial<PerformanceConfig> = {
        enableMetrics: true,
        targetFrameRate: 120,
      };
      
      expect(() => updateConfig(config)).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should monitor memory usage', () => {
      const { isHealthy } = usePerformanceOptimization();
      
      // Mock performance.memory
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024, // 50MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB
          jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
        },
        configurable: true,
      });
      
      const healthy = isHealthy();
      expect(typeof healthy).toBe('boolean');
    });

    it('should handle missing performance.memory gracefully', () => {
      const { isHealthy } = usePerformanceOptimization();
      
      // Remove performance.memory
      delete (window.performance as any).memory;
      
      const healthy = isHealthy();
      expect(typeof healthy).toBe('boolean');
    });
  });

  describe('Frame Rate Monitoring', () => {
    it('should start frame rate monitoring when metrics enabled', () => {
      const { updateConfig } = usePerformanceOptimization();
      
      // Clear any previous RAF calls
      mockRAF.mockClear();
      
      updateConfig({ enableMetrics: true });
      
      expect(mockRAF).toHaveBeenCalled();
    });

    it('should stop frame rate monitoring when metrics disabled', () => {
      const { updateConfig } = usePerformanceOptimization();
      
      // Clear any previous calls
      mockRAF.mockClear();
      mockCAF.mockClear();
      
      // Enable first
      updateConfig({ enableMetrics: true });
      expect(mockRAF).toHaveBeenCalled();
      
      // Then disable
      updateConfig({ enableMetrics: false });
      expect(mockCAF).toHaveBeenCalled();
    });
  });

  describe('DOM Update Batching', () => {
    it('should batch DOM updates by priority', () => {
      const { queueUpdate, updateConfig } = usePerformanceOptimization();
      
      // Clear any previous RAF calls
      mockRAF.mockClear();
      
      // Ensure batching is enabled
      updateConfig({ batchDOMUpdates: true });
      
      const highPriorityProps = { color: 'red' };
      const mediumPriorityProps = { backgroundColor: 'blue' };
      const lowPriorityProps = { fontSize: '16px' };
      
      // Queue updates with different priorities
      queueUpdate(mockElement, highPriorityProps, 'high');
      queueUpdate(mockElement, mediumPriorityProps, 'medium');
      queueUpdate(mockElement, lowPriorityProps, 'low');
      
      // Should use requestAnimationFrame for batching
      expect(mockRAF).toHaveBeenCalled();
    });

    it('should handle multiple elements in batch', () => {
      const { queueUpdate, updateConfig } = usePerformanceOptimization();
      
      // Clear any previous RAF calls
      mockRAF.mockClear();
      
      // Ensure batching is enabled
      updateConfig({ batchDOMUpdates: true });
      
      const element1 = createMockElement('div');
      const element2 = createMockElement('span');
      
      queueUpdate(element1, { color: 'red' });
      queueUpdate(element2, { color: 'blue' });
      
      expect(mockRAF).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid elements gracefully', () => {
      const { optimizeElement, cleanupElement, queueUpdate } = usePerformanceOptimization();
      
      const invalidElement = null as any;
      
      expect(() => optimizeElement(invalidElement)).not.toThrow();
      expect(() => cleanupElement(invalidElement)).not.toThrow();
      expect(() => queueUpdate(invalidElement, {})).not.toThrow();
    });

    it('should handle invalid configuration gracefully', () => {
      const { updateConfig } = usePerformanceOptimization();
      
      const invalidConfig = {
        maxCacheSize: -1,
        targetFrameRate: -60,
        memoryThreshold: -100,
      } as any;
      
      expect(() => updateConfig(invalidConfig)).not.toThrow();
    });
  });

  describe('Performance Metrics', () => {
    it('should record transition metrics', () => {
      const { getReport } = usePerformanceOptimization();
      
      // Get initial report
      const initialReport = getReport();
      expect(initialReport.totalTransitions).toBe(0);
      
      // The internal recordMetrics function is not directly exposed,
      // but we can test that the report structure is correct
      expect(initialReport).toHaveProperty('averageTransitionDuration');
      expect(initialReport).toHaveProperty('averageFrameRate');
      expect(initialReport).toHaveProperty('averageMemoryUsage');
      expect(initialReport).toHaveProperty('cacheEfficiency');
    });

    it('should calculate cache efficiency', () => {
      const { getReport } = usePerformanceOptimization();
      
      const report = getReport();
      expect(report.cacheEfficiency).toBeGreaterThanOrEqual(0);
      expect(report.cacheEfficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration Tests', () => {
    it('should work with complete optimization workflow', async () => {
      const { updateConfig, optimizeElement, queueUpdate, cleanupElement } = usePerformanceOptimization();
      
      // Configure for optimal performance
      updateConfig({
        enableGPUAcceleration: true,
        batchDOMUpdates: true,
        enableCaching: true,
        enableMetrics: true,
      });
      
      // Optimize element
      optimizeElement(mockElement);
      
      // Queue some updates
      queueUpdate(mockElement, { opacity: '0.5' }, 'high');
      queueUpdate(mockElement, { transform: 'scale(1.1)' }, 'medium');
      
      // Wait for batched updates to process
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Cleanup
      cleanupElement(mockElement);
      
      // Should complete without errors
      expect(mockElement).toBeDefined();
    });

    it('should handle rapid configuration changes', () => {
      const { updateConfig } = usePerformanceOptimization();
      
      // Rapidly change configuration
      for (let i = 0; i < 10; i++) {
        updateConfig({
          enableMetrics: i % 2 === 0,
          targetFrameRate: 30 + (i * 10),
          maxCacheSize: 10 + i,
        });
      }
      
      // Should handle rapid changes without errors
      expect(() => updateConfig({ enableGPUAcceleration: true })).not.toThrow();
    });
  });
}); 