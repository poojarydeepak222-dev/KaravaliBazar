import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ForumVisibilityController from './components/ForumVisibilityController'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <ForumVisibilityController />
  </>
);

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('SW registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}
