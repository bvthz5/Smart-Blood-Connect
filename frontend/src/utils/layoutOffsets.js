/**
 * Layout offset utility for dynamic header and alert bar heights
 * Optimized to prevent forced reflows and improve performance
 */

import { scheduleTask, scheduleLowPriorityTask } from './taskScheduler';

let lastHeaderHeight = 0;
let lastAlertsHeight = 0;
let isInitialized = false;
let isUpdating = false;

export function syncHeaderAlertHeights() {
  // Prevent concurrent updates
  if (isUpdating) return;
  
  try {
    isUpdating = true;
    
    // Use requestIdleCallback for better performance
    const performSync = () => {
      try {
        const startTime = performance.now();
        
        const header = document.querySelector('.header--fixed, .header');
        const alertsBar = document.querySelector('.alerts-bar');
        
        let headerHeight = 76; // Default fallback
        let alertsHeight = 48; // Default fallback
        
        // Batch all DOM reads to prevent forced reflows - use immediate reads with caching
        if (header) {
          const rect = header.getBoundingClientRect();
          headerHeight = Math.round(rect.height);
        }
        
        if (alertsBar) {
          const rect = alertsBar.getBoundingClientRect();
          alertsHeight = Math.round(rect.height);
        }
        
        // Only update if heights have changed or it's the first run
        if (!isInitialized || headerHeight !== lastHeaderHeight || alertsHeight !== lastAlertsHeight) {
          const root = document.documentElement;
          const combinedHeight = headerHeight + alertsHeight;
          
          // Use CSS custom properties in a single batch to prevent forced reflow
          const newStyles = {
            '--header-height': `${headerHeight}px`,
            '--alerts-height': `${alertsHeight}px`,
            '--combined-offset': `${combinedHeight}px`
          };
          
          // Apply all styles at once
          Object.assign(root.style, newStyles);
          
          lastHeaderHeight = headerHeight;
          lastAlertsHeight = alertsHeight;
          isInitialized = true;
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Log performance if operation took longer than a frame; use info rather than warn
        if (duration > 16) {
          // eslint-disable-next-line no-console
          console.info(`Layout sync took ${duration.toFixed(2)}ms`);
        }

        isUpdating = false;
        
      } catch (error) {
        console.warn('Layout offset sync failed:', error);
        isUpdating = false;
      }
    };
    
    // Use task scheduler for better performance
    scheduleLowPriorityTask(performSync);
    
  } catch (error) {
    console.warn('Layout offset sync failed:', error);
    isUpdating = false;
  }
}

// Debounced resize handler with better performance
let resizeTimeout;
let isResizing = false;

function debouncedSync() {
  // Use RAF-based debounce to avoid heavy work in the resize event handler
  if (isResizing) return;
  isResizing = true;
  clearTimeout(resizeTimeout);

  resizeTimeout = setTimeout(() => {
    // Defer the sync to the scheduler/RAF
    scheduleLowPriorityTask(() => {
      requestAnimationFrame(() => {
        syncHeaderAlertHeights();
        isResizing = false;
      });
    });
  }, 150);
}

// Initialize on DOM ready - defer initial sync via scheduler to avoid blocking
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    scheduleLowPriorityTask(syncHeaderAlertHeights);
  });
} else {
  scheduleLowPriorityTask(syncHeaderAlertHeights);
}

// Re-sync on window resize (debounced)
window.addEventListener('resize', debouncedSync);

// Re-sync on route changes (for SPA)
window.addEventListener('popstate', debouncedSync);
