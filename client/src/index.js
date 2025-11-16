import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './pages/App/App';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';

const suppressResizeObserverErrors = () => {
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

  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('ResizeObserver')) {
      e.preventDefault();
      return false;
    }
  });

  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    if (errorMessage.includes('ResizeObserver')) {
      return; 
    }
    originalConsoleError.apply(console, args);
  };

  if (typeof ResizeObserver !== 'undefined') {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        super((entries, observer) => {
          try {
            callback(entries, observer);
          } catch (e) {
            if (e.message?.includes('ResizeObserver')) {
              return;
            }
            throw e;
          }
        });
      }
    };  
  }
}; 

let lastRender = Date.now();
let isTabVisible = !document.hidden;

document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden;
  if (isTabVisible) {
    lastRender = Date.now();
    console.log('Tab is now visible, resetting freeze detector');
  }
});

setInterval(() => {
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