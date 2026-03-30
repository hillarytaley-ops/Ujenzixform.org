import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initErrorTracking } from './utils/errorTracking'
import { logger } from './utils/logger'
import { initSentry } from './lib/sentry'
import { initGoogleAnalytics } from './lib/analytics'

// Initialize error tracking (legacy)
initErrorTracking();

// Initialize Sentry for production error monitoring
initSentry();

// Initialize Google Analytics
initGoogleAnalytics();

// Global handler for chunk loading errors (stale deployments)
const CHUNK_ERROR_RELOAD_KEY = 'ujenzixform_chunk_reload_attempt';
const CHUNK_ERROR_TIMESTAMP_KEY = 'ujenzixform_chunk_reload_timestamp';

function isChunkLoadingError(error: Error | string): boolean {
  const message = typeof error === 'string' ? error.toLowerCase() : error.message?.toLowerCase() || '';
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('failed to load module script') ||
    (message.includes('mime type') && message.includes('text/html'))
  );
}

async function handleChunkError(): Promise<void> {
  const attemptCount = parseInt(sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY) || '0', 10);
  const lastAttempt = sessionStorage.getItem(CHUNK_ERROR_TIMESTAMP_KEY);
  
  // Prevent infinite reload loops
  if (attemptCount >= 2) {
    console.log('⚠️ Max chunk error reload attempts reached');
    return;
  }
  
  if (lastAttempt && Date.now() - parseInt(lastAttempt, 10) < 10000) {
    console.log('⚠️ Too soon since last chunk error reload');
    return;
  }
  
  console.log('🔄 Chunk loading error detected - clearing caches and reloading...');
  
  // Mark attempt
  sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, String(attemptCount + 1));
  sessionStorage.setItem(CHUNK_ERROR_TIMESTAMP_KEY, String(Date.now()));
  
  // Clear caches
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch (e) {
      console.warn('Failed to clear caches:', e);
    }
  }
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    } catch (e) {
      console.warn('Failed to unregister service workers:', e);
    }
  }
  
  // Force reload with cache bypass
  setTimeout(() => {
    window.location.href = window.location.href.split('?')[0] + '?_refresh=' + Date.now();
  }, 300);
}

// Listen for unhandled errors (catches dynamic import failures)
window.addEventListener('error', (event) => {
  if (event.message && isChunkLoadingError(event.message)) {
    event.preventDefault();
    handleChunkError();
  }
});

// Listen for unhandled promise rejections (catches async import failures)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason instanceof Error && isChunkLoadingError(reason)) {
    event.preventDefault();
    handleChunkError();
  } else if (typeof reason === 'string' && isChunkLoadingError(reason)) {
    event.preventDefault();
    handleChunkError();
  }
});

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

// Do not clear Cache Storage / unregister SW on every page load — that races with lazy chunks
// and triggers chunk-error reloads (flicker on /admin-login). Cleanup runs only on BUILD change
// in index.html; stale chunks are handled by handleChunkError() above.
