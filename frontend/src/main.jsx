import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Provider } from 'react-redux';
import { store } from './store';
import "./index.css";
import './styles/global.css';
import './styles/performance.css';

// CRITICAL: Suppress extension errors BEFORE anything else loads
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && 
      event.error.message.includes('message channel closed before a response was received')) {
    event.preventDefault();
    return false;
  }
}, true); // Use capture phase to catch errors early

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && 
      event.reason.message.includes('message channel closed before a response was received')) {
    event.preventDefault();
  }
}, true); // Use capture phase

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

// Additional error handlers for debugging (errors already suppressed above)
window.addEventListener('error', (event) => {
  // Log performance violations for debugging
  if (event.error && event.error.message && 
      event.error.message.includes('Violation')) {
    console.warn('Performance violation detected:', event.error.message);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Log performance-related promise rejections
  if (event.reason && event.reason.message && 
      event.reason.message.includes('Violation')) {
    console.warn('Performance violation in promise:', event.reason.message);
  }
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
