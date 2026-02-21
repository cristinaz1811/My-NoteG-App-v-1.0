import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress Monaco editor errors (harmless browser autofill/clipboard interaction)
const suppressedErrors = ['Canceled', 'NotAllowedError', 'The request is not allowed', 'clipboard'];

// Hide React error overlay for suppressed errors
const hideErrorOverlay = () => {
  const overlay = document.getElementById('webpack-dev-server-client-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  // Also try the older overlay ID
  const oldOverlay = document.getElementById('react-error-overlay');
  if (oldOverlay) {
    oldOverlay.style.display = 'none';
  }
};

window.addEventListener('error', (event) => {
  const message = event.message || (event.error && event.error.message) || '';
  if (suppressedErrors.some(err => message.toLowerCase().includes(err.toLowerCase()))) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setTimeout(hideErrorOverlay, 0);
    return false;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const message = (event.reason && (event.reason.message || event.reason.name || String(event.reason))) || '';
  if (suppressedErrors.some(err => message.toLowerCase().includes(err.toLowerCase()))) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setTimeout(hideErrorOverlay, 0);
    return false;
  }
}, true);

// Override console.error to suppress Monaco clipboard errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.map(a => String(a)).join(' ').toLowerCase();
  if (suppressedErrors.some(err => message.includes(err.toLowerCase()))) {
    setTimeout(hideErrorOverlay, 0);
    return;
  }
  originalConsoleError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
