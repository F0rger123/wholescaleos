import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Create a visible error display
function showError(message: string, error?: any) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '270px';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.backgroundColor = '#ef4444';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '99997';
  errorDiv.style.fontSize = '16px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.style.maxHeight = '300px';
  errorDiv.style.overflow = 'auto';
  errorDiv.style.borderTop = '2px solid white';
  errorDiv.style.borderBottom = '2px solid white';
  
  let errorText = `❌ ${message}`;
  if (error) {
    errorText += `\n\n${error.toString()}`;
    if (error.stack) {
      errorText += `\n\n${error.stack}`;
    }
  }
  
  errorDiv.innerText = errorText;
  document.body.appendChild(errorDiv);
}

// Try to render React with error catching
try {
  console.log('🚀 Attempting to render React...');
  console.log('📦 App component:', App);
  
  const root = document.getElementById('root');
  console.log('📦 root element:', root);
  
  if (!root) {
    showError('root element not found!');
  } else {
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.position = 'fixed';
    loadingDiv.style.top = '320px';
    loadingDiv.style.left = '0';
    loadingDiv.style.right = '0';
    loadingDiv.style.backgroundColor = '#3b82f6';
    loadingDiv.style.color = 'white';
    loadingDiv.style.padding = '20px';
    loadingDiv.style.zIndex = '99996';
    loadingDiv.innerText = '⏳ Attempting to render React...';
    document.body.appendChild(loadingDiv);
    
    // Attempt render
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Success message after a short delay
    setTimeout(() => {
      const successDiv = document.createElement('div');
      successDiv.style.position = 'fixed';
      successDiv.style.top = '370px';
      successDiv.style.left = '0';
      successDiv.style.right = '0';
      successDiv.style.backgroundColor = '#10b981';
      successDiv.style.color = 'white';
      successDiv.style.padding = '20px';
      successDiv.style.zIndex = '99995';
      successDiv.innerText = '✅ React.render() called successfully';
      document.body.appendChild(successDiv);
    }, 100);
  }
} catch (error) {
  showError('React render error', error);
}

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  showError('Uncaught error', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  showError('Unhandled promise rejection', event.reason);
});