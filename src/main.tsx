import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Simple render with error catching
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  console.log('Rendering WholeScale OS...');
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
} catch (error) {
  // Show error on screen
  document.body.innerHTML = `
    <div style="padding: 40px; background: #1a1a1a; color: #ff4444; font-family: monospace;">
      <h1 style="font-size: 24px;">❌ React Render Error</h1>
      <pre style="margin-top: 20px; padding: 20px; background: #2a2a2a; color: #ffaa00;">${error}</pre>
    </div>
  `;
}