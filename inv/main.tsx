import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Register PWA service worker safely for both local dev and production builds (e.g. GitHub Pages)
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  const swUrl = './sw.js';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn('Service worker registration status:', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
