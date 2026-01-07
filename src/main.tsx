import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initErrorTracking } from './utils/errorTracking'
import { logger } from './utils/logger'

// Initialize error tracking
initErrorTracking();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline caching and faster loads
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info('Service Worker registered successfully', { scope: registration.scope });
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        logger.error('Service Worker registration failed', error);
      });
  });
}
