import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './pages/App/App';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';

// Performance monitor is still useful for catching future freezes
let lastRender = Date.now();
setInterval(() => {
  const now = Date.now();
  const gap = now - lastRender;
  if (gap > 5000) {
    console.error(`🔴 FREEZE DETECTED! No render for ${gap}ms`);
  }
  lastRender = now;
}, 2000);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);