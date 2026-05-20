import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Mute benign internal HMR WebSocket errors/rejections within the AI Studio sandbox
if (typeof window !== 'undefined') {
  const ignorePatterns = ['WebSocket', 'websocket', 'vite', 'HMR'];
  
  window.addEventListener('unhandledrejection', (event) => {
    const reasonString = String(event.reason || '');
    const reasonMsg = event.reason?.message || '';
    
    const shouldIgnore = ignorePatterns.some(
      (pat) => 
        reasonString.toLowerCase().includes(pat.toLowerCase()) || 
        reasonMsg.toLowerCase().includes(pat.toLowerCase())
    );
    
    if (shouldIgnore) {
      event.preventDefault(); // Prevents the error from crashing or triggering browser/Vite overlays
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const shouldIgnore = ignorePatterns.some((pat) => msg.toLowerCase().includes(pat.toLowerCase()));
    
    if (shouldIgnore) {
      event.preventDefault(); // Prevents intrusive Vite crash overlays
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

