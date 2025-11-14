import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './pages/App/App';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';

// Comprehensive ResizeObserver error suppression
const suppressResizeObserverErrors = () => {
  // Suppress in error event
  window.addEventListener('error', (e) => {
    if (
      e.message?.includes('ResizeObserver') ||
      e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
      e.message === 'ResizeObserver loop limit exceeded'
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  });

  // Suppress in unhandled rejection
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('ResizeObserver')) {
      e.preventDefault();
      return false;
    }
  });

  // Override console.error to filter ResizeObserver errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    if (errorMessage.includes('ResizeObserver')) {
      return; // Don't log ResizeObserver errors
    }
    originalConsoleError.apply(console, args);
  };

  // Patch ResizeObserver constructor to catch errors internally
  if (typeof ResizeObserver !== 'undefined') {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        super((entries, observer) => {
          try {
            callback(entries, observer);
          } catch (e) {
            if (e.message?.includes('ResizeObserver')) {
              // Silently ignore ResizeObserver errors
              return;
            }
            throw e;
          }
        });
      }
    };  
  }
}; 

// Performance monitor - only check when tab is visible to avoid false positives
let lastRender = Date.now();
let isTabVisible = !document.hidden;

document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden;
  if (isTabVisible) {
    // Reset timer when tab becomes visible again
    lastRender = Date.now();
    console.log('Tab is now visible, resetting freeze detector');
  }
});

setInterval(() => {
  // Only check for freezes when tab is visible
  if (isTabVisible) {
    const now = Date.now();
    const gap = now - lastRender;
    if (gap > 5000) {
      console.error(`🔴 FREEZE DETECTED! No render for ${gap}ms`);
    }
    lastRender = now;
  }
}, 2000);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);