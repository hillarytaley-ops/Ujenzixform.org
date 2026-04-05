import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initErrorTracking } from './utils/errorTracking'
import { logger } from './utils/logger'
import { initSentry } from './lib/sentry'
import { initGoogleAnalytics } from './lib/analytics'
import {
  isChunkLoadFailureMessage,
  scheduleChunkReloadRecovery,
} from '@/utils/chunkLoadRecovery'

// Initialize error tracking (legacy)
initErrorTracking();

// Initialize Sentry for production error monitoring
initSentry();

// Initialize Google Analytics
initGoogleAnalytics();

function chunkMessageFromErrorEvent(event: ErrorEvent): string {
  const em = event.error;
  if (em instanceof Error && em.message) return em.message;
  if (typeof em === 'string') return em;
  if (event.message) return event.message;
  return '';
}

// Script / dynamic import failures (message often on event.error, not event.message)
window.addEventListener('error', (event) => {
  const msg = chunkMessageFromErrorEvent(event as ErrorEvent);
  if (msg && isChunkLoadFailureMessage(msg)) {
    event.preventDefault();
    void scheduleChunkReloadRecovery();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : '';
  if (msg && isChunkLoadFailureMessage(msg)) {
    event.preventDefault();
    void scheduleChunkReloadRecovery();
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

// Stale lazy chunks after deploy: scheduleChunkReloadRecovery() + build-cleanup.js on BUILD change.
