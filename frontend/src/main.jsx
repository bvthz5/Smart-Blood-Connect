import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Provider } from 'react-redux';
import { store } from './store';
import "./index.css"; // Keep the original index.css import
// global styles (was tailwind previously)
import './styles/global.css';
// performance optimizations
import './styles/performance.css';

// Disable GSAP completely to eliminate performance violations
// gsap.registerPlugin(ScrollTrigger);

// Configure GSAP for better performance - DISABLED
// gsap.config({
//   force3D: true,
//   nullTargetWarn: false,
//   trialWarn: false
// });

// Optimize ScrollTrigger settings - DISABLED
// ScrollTrigger.config({
//   ignoreMobileResize: true,
//   autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
//   syncInterval: 16 // Limit to 60fps
// });

// Remove intrusive development-time overrides to avoid message channel issues

// Optimized rendering to reduce message handler overhead
const renderApp = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }
  
  const root = createRoot(rootElement);
  
  // Use React 18's concurrent features for better performance
  const appTree = (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );

  // In development, avoid StrictMode double-invocation to reduce extra work and message handler time
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    root.render(appTree);
  } else {
    root.render(
      <React.StrictMode>
        {appTree}
      </React.StrictMode>
    );
  }
};

// Optimized rendering strategy with performance monitoring
const initializeApp = () => {
  // Use requestIdleCallback with shorter timeout to reduce message handler time
  if (window.requestIdleCallback) {
    requestIdleCallback(() => {
      // Use requestAnimationFrame to ensure rendering happens at optimal time
      requestAnimationFrame(renderApp);
    }, { timeout: 500 });
  } else {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(renderApp);
  }
};

// Global error handler for extension conflicts and performance monitoring
// DISABLE all error handling to eliminate performance overhead
// window.addEventListener('error', (event) => {
//   // Suppress async listener errors from browser extensions
//   if (event.error && event.error.message && 
//       event.error.message.includes('message channel closed before a response was received')) {
//     console.warn('Suppressed extension async listener error:', event.error.message);
//     event.preventDefault();
//     return false;
//   }
  
//   // Log performance violations for debugging
//   if (event.error && event.error.message && 
//       event.error.message.includes('Violation')) {
//     console.warn('Performance violation detected:', event.error.message);
//   }
// });

// window.addEventListener('unhandledrejection', (event) => {
//   // Suppress promise rejections from extension conflicts
//   if (event.reason && event.reason.message && 
//       event.reason.message.includes('message channel closed before a response was received')) {
//     console.warn('Suppressed extension promise rejection:', event.reason.message);
//     event.preventDefault();
//   }
  
//   // Log performance-related promise rejections
//   if (event.reason && event.reason.message && 
//       event.reason.message.includes('Violation')) {
//     console.warn('Performance violation in promise:', event.reason.message);
//   }
// });

// Keep browser APIs and console intact to avoid breaking extension messaging and devtools

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
