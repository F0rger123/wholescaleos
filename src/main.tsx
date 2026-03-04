import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Create a massive visible error display
const errorContainer = document.createElement('div');
errorContainer.id = 'error-container';
errorContainer.style.position = 'fixed';
errorContainer.style.top = '0';
errorContainer.style.left = '0';
errorContainer.style.right = '0';
errorContainer.style.bottom = '0';
errorContainer.style.backgroundColor = '#1a1a1a';
errorContainer.style.color = '#ff4444';
errorContainer.style.padding = '40px';
errorContainer.style.zIndex = '999999';
errorContainer.style.overflow = 'auto';
errorContainer.style.fontFamily = 'monospace';
errorContainer.style.fontSize = '14px';
errorContainer.style.whiteSpace = 'pre-wrap';
errorContainer.style.display = 'none';
document.body.appendChild(errorContainer);

function showError(error: any) {
  console.error('Render error:', error);
  
  const errorContainer = document.getElementById('error-container');
  if (!errorContainer) return;
  
  errorContainer.style.display = 'block';
  errorContainer.innerHTML = `
    <h1 style="color: #ff4444; font-size: 24px; margin-bottom: 20px;">❌ React Render Error</h1>
    <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <strong style="color: #ff8888;">Error:</strong>
      <pre style="color: #ffaa00; margin-top: 10px;">${error?.toString() || 'Unknown error'}</pre>
    </div>
    ${error?.stack ? `
      <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
        <strong style="color: #ff8888;">Stack Trace:</strong>
        <pre style="color: #88ff88; margin-top: 10px;">${error.stack}</pre>
      </div>
    ` : ''}
    <button onclick="location.reload()" style="
      margin-top: 20px;
      padding: 10px 20px;
      background: #444;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    ">Reload Page</button>
  `;
}

// Try to render with error catching
try {
  const root = document.getElementById('root');
  
  if (!root) {
    throw new Error('Root element not found!');
  }
  
  console.log('Attempting to render React...');
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('React render called successfully');
  
} catch (error) {
  showError(error);
}

// Catch any errors that happen after render
window.addEventListener('error', (event) => {
  showError(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showError(event.reason);
});