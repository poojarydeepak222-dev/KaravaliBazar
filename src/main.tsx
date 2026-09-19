import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker using Vite's configured base path.
// This keeps PWA support working on GitHub Pages subpaths.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const basePath = import.meta.env.BASE_URL || '/';
    const serviceWorkerUrl = `${basePath.replace(/\/$/, '')}/sw.js`;

    navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: basePath })
      .then((reg) => {
        console.log('SW registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}
