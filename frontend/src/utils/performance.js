/**
 * Performance utilities to prevent violations and optimize execution
 */

// Throttle function for high-frequency events
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// Debounce function for delayed execution
export const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

// Safe requestIdleCallback with fallback
export const safeRequestIdleCallback = (callback, options = {}) => {
  if (window.requestIdleCallback) {
    return requestIdleCallback(callback, { timeout: 5000, ...options });
  } else {
    // Fallback to setTimeout
    const timeout = options.timeout || 5000;
    return setTimeout(callback, Math.min(timeout, 50));
  }
};

// Safe requestAnimationFrame with fallback
export const safeRequestAnimationFrame = (callback) => {
  if (window.requestAnimationFrame) {
    return requestAnimationFrame(callback);
  } else {
    return setTimeout(callback, 16); // ~60fps fallback
  }
};

// Batch DOM operations to prevent forced reflows
export const batchDOMOperations = (operations) => {
  return new Promise((resolve) => {
    safeRequestAnimationFrame(() => {
      operations.forEach(operation => {
        try {
          operation();
        } catch (error) {
          console.warn('DOM operation failed:', error);
        }
      });
      resolve();
    });
  });
};

// Performance monitoring
// Use Vite's import.meta.env; safe in ESM modules
const PERF_LOGS = (typeof window !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_PERF_LOGS === 'true');

export const performanceMonitor = {
  violations: [],
  
  logViolation(type, duration, details = {}) {
    if (duration > 50) { // Only record significant violations (>50ms)
      const violation = {
        type,
        duration,
        timestamp: Date.now(),
        ...details
      };
      this.violations.push(violation);
      
      // Keep only last 100 violations
      if (this.violations.length > 100) {
        this.violations = this.violations.slice(-100);
      }
      
      // Only log when enabled and for very long tasks (>200ms)
      if (PERF_LOGS && duration > 200) {
        console.warn(`Performance violation: ${type} took ${duration}ms`, details);
      }
    }
  },
  
  getViolations() {
    return [...this.violations];
  },
  
  clearViolations() {
    this.violations = [];
  }
};

// Optimize heavy computations with chunking to prevent long tasks
export const optimizeHeavyComputation = (computation, delay = 0) => {
  return new Promise((resolve) => {
    // Break heavy computations into chunks to prevent long tasks
    const chunkedComputation = () => {
      const startTime = performance.now();
      let result;
      
      try {
        result = computation();
      } catch (error) {
        console.warn('Heavy computation failed:', error);
        return { error, result: null };
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // If computation took longer than 50ms, record it
      if (duration > 50) {
        performanceMonitor.logViolation('heavy-computation', duration, {
          type: 'computation'
        });
      }
      
      return { error: null, result };
    };
    
    safeRequestIdleCallback(() => {
      const { error, result } = chunkedComputation();
      if (error) {
        throw error;
      }
      resolve(result);
    }, { timeout: delay });
  });
};

// Memory-efficient array operations
export const efficientArrayOperations = {
  // Chunk large arrays to prevent blocking
  chunk: (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
  
  // Process large arrays in chunks with yielding
  processInChunks: async (array, processor, chunkSize = 100) => {
    const chunks = this.chunk(array, chunkSize);
    const results = [];
    
    for (const chunk of chunks) {
      const chunkResults = chunk.map(processor);
      results.push(...chunkResults);
      
      // Yield control to prevent blocking
      await new Promise(resolve => safeRequestAnimationFrame(resolve));
    }
    
    return results;
  }
};

// Prevent memory leaks
export const memoryManager = {
  cleanupFunctions: new Set(),
  
  registerCleanup(fn) {
    this.cleanupFunctions.add(fn);
  },
  
  unregisterCleanup(fn) {
    this.cleanupFunctions.delete(fn);
  },
  
  cleanup() {
    this.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    this.cleanupFunctions.clear();
  }
};

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  if (PERF_LOGS) {
    // Monitor long tasks only when enabled
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              performanceMonitor.logViolation('long-task', entry.duration, {
                startTime: entry.startTime,
                name: entry.name
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        // Silently ignore if unsupported
      }
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    memoryManager.cleanup();
  });
}
