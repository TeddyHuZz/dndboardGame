import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './pages/App/App';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';

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