import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Add this at the VERY TOP to catch early errors
console.log('🚀 main.tsx starting...');

// Global error handler for sync errors
window.addEventListener('error', (event) => {
  console.error('🔥 GLOBAL ERROR CAUGHT:', event.error);
  console.error('Error stack:', event.error?.stack);
  
  // Show error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.backgroundColor = '#ef4444';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '999999';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.innerHTML = `
    <h3>❌ Error: ${event.error?.message}</h3>
    <pre style="background: #7f1d1d; padding: 10px; border-radius: 4px; margin-top: 10px;">${event.error?.stack}</pre>
  `;
  document.body.appendChild(errorDiv);
});

// Global error handler for async errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 UNHANDLED PROMISE REJECTION:', event.reason);
});

console.log('📍 Root element:', document.getElementById('root'));

// Simple render with error catching
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  console.log('✅ Root found, creating React root...');
  
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('✅ React root created, rendering App...');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('✅ Render called successfully');
  
} catch (error) {
  console.error('❌ Render error:', error);
  
  // Show error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.backgroundColor = '#ef4444';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '99999';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerHTML = `
    <h3>❌ React Render Error</h3>
    <pre style="background: #7f1d1d; padding: 10px; border-radius: 4px;">${error}</pre>
  `;
  document.body.appendChild(errorDiv);
}