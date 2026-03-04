import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

console.log('🚀 main.tsx starting...');
console.log('📦 React version:', React.version);
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