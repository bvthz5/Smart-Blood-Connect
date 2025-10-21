/**
 * Task scheduler to prevent long tasks and maintain 60fps performance
 */

class TaskScheduler {
  constructor() {
    this.taskQueue = [];
    this.isProcessing = false;
    // Allow a reasonable per-frame budget and multiple tasks per frame so we
    // don't force long message handlers; keep these conservative to avoid UI jank.
  this.frameBudget = 6; // ms budget per frame (reduced)
  this.maxTasksPerFrame = 4; // process up to 4 tasks per frame
    this.violationCount = 0;
    this.maxViolations = 3; // Stop processing after 3 violations
  }

  // Add a task to the queue
  schedule(task, priority = 'normal') {
    const taskItem = {
      task,
      priority,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: performance.now()
    };

    if (priority === 'high') {
      this.taskQueue.unshift(taskItem);
    } else {
      this.taskQueue.push(taskItem);
    }

    if (!this.isProcessing) {
      this.processQueue();
    }

    return taskItem.id;
  }

  // Process the task queue - EXTREME optimization
  async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0 || this.violationCount >= this.maxViolations) {
      return;
    }
    // Non-blocking processing loop: process up to maxTasksPerFrame tasks per animation frame
    this.isProcessing = true;

    const processFrame = () => {
      const frameStart = performance.now();
      let processed = 0;

      while (this.taskQueue.length > 0 && processed < this.maxTasksPerFrame) {
        const taskItem = this.taskQueue.shift();
        try {
          // Call the task. If it returns a Promise, don't await it here to avoid blocking.
          const result = typeof taskItem.task === 'function' ? taskItem.task() : null;
          if (result && typeof result.then === 'function') {
            // Attach a catch to prevent unhandled rejections and track slow promises
            result.catch(() => { this.violationCount++; });
          }
        } catch (err) {
          // Non-fatal: increment violation counter but continue
          this.violationCount++;
        }

        processed++;

        // If we've exceeded our frame budget, break and continue next frame
        if ((performance.now() - frameStart) >= this.frameBudget) {
          this.violationCount++;
          break;
        }
      }

      if (this.taskQueue.length > 0 && this.violationCount < this.maxViolations) {
        requestAnimationFrame(processFrame);
      } else {
        // Done for now
        this.isProcessing = false;
        if (this.violationCount >= this.maxViolations) {
          // Clear remaining tasks to avoid endless growth
          this.taskQueue = [];
        }
      }
    };

    requestAnimationFrame(processFrame);
  }

  // Cancel a scheduled task
  cancel(taskId) {
    const index = this.taskQueue.findIndex(item => item.id === taskId);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  // Clear all tasks
  clear() {
    this.taskQueue = [];
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.taskQueue.length,
      isProcessing: this.isProcessing,
      estimatedWaitTime: this.taskQueue.length * (this.frameBudget / this.maxTasksPerFrame)
    };
  }
}

// Create global task scheduler instance
export const taskScheduler = new TaskScheduler();

// Utility functions for common task types
export const scheduleTask = (task, priority = 'normal') => {
  return taskScheduler.schedule(task, priority);
};

export const scheduleHighPriorityTask = (task) => {
  return taskScheduler.schedule(task, 'high');
};

export const scheduleLowPriorityTask = (task) => {
  return taskScheduler.schedule(task, 'low');
};

// Batch DOM operations to prevent forced reflows
export const batchDOMOperations = (operations) => {
  return new Promise((resolve) => {
    scheduleTask(() => {
      const fragment = document.createDocumentFragment();
      const startTime = performance.now();

      operations.forEach(operation => {
        try {
          operation(fragment);
        } catch (error) {
          console.warn('DOM operation failed:', error);
        }
      });

      // Apply all changes at once
      if (fragment.children.length > 0) {
        document.body.appendChild(fragment);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > 16) {
        console.warn(`DOM batch operation took ${duration.toFixed(2)}ms`);
      }

      resolve();
    }, 'high');
  });
};

// Schedule heavy computations in chunks
export const scheduleHeavyComputation = (computation, chunkSize = 1000) => {
  return new Promise((resolve) => {
    let result = null;
    let index = 0;

    const processChunk = () => {
      const startTime = performance.now();
      
      while (index < chunkSize && (performance.now() - startTime) < 5) {
        try {
          const chunkResult = computation(index);
          if (chunkResult !== undefined) {
            result = chunkResult;
          }
          index++;
        } catch (error) {
          console.warn('Computation chunk failed:', error);
          break;
        }
      }

      if (index >= chunkSize) {
        resolve(result);
      } else {
        scheduleTask(processChunk, 'low');
      }
    };

    scheduleTask(processChunk, 'low');
  });
};

// Optimize array processing
export const scheduleArrayProcessing = (array, processor, chunkSize = 100) => {
  return new Promise((resolve) => {
    const results = [];
    let index = 0;

    const processChunk = () => {
      const startTime = performance.now();
      const endIndex = Math.min(index + chunkSize, array.length);

      while (index < endIndex && (performance.now() - startTime) < 5) {
        try {
          const result = processor(array[index], index);
          results.push(result);
          index++;
        } catch (error) {
          console.warn('Array processing failed:', error);
          index++;
        }
      }

      if (index >= array.length) {
        resolve(results);
      } else {
        scheduleTask(processChunk, 'low');
      }
    };

    scheduleTask(processChunk, 'low');
  });
};

// Schedule image loading
export const scheduleImageLoad = (src) => {
  return new Promise((resolve, reject) => {
    scheduleTask(() => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }, 'low');
  });
};

// Schedule data fetching
export const scheduleDataFetch = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    scheduleTask(async () => {
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    }, 'normal');
  });
};

// Performance monitoring for task scheduler
export const getSchedulerMetrics = () => {
  return {
    ...taskScheduler.getStatus(),
    performanceMetrics: {
      averageTaskTime: performance.now(), // Placeholder for actual metrics
      tasksPerSecond: 0, // Placeholder for actual metrics
      droppedTasks: 0 // Placeholder for actual metrics
    }
  };
};

// Initialize task scheduler monitoring - optimized to prevent performance issues
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    // Use requestIdleCallback to prevent blocking the main thread
    if (window.requestIdleCallback) {
      requestIdleCallback(() => {
        const status = taskScheduler.getStatus();
        if (status.queueLength > 50) {
          console.warn(`Task scheduler queue is getting long: ${status.queueLength} tasks`);
        }
      }, { timeout: 1000 });
    } else {
      setTimeout(() => {
        const status = taskScheduler.getStatus();
        if (status.queueLength > 50) {
          console.warn(`Task scheduler queue is getting long: ${status.queueLength} tasks`);
        }
      }, 0);
    }
  }, 5000);
}
