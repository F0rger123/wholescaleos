import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple test component
function TestApp() {
  return (
    <div style={{
      padding: '40px',
      background: '#0f172a',
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ color: '#3b82f6' }}>✅ Test App Loaded!</h1>
      <p>If you see this, React is working.</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}

// Try to render
try {
  const root = document.getElementById('root');
  console.log('Root element:', root);
  
  if (!root) {
    throw new Error('Root element not found!');
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
  
  // Add success message
  const success = document.createElement('div');
  success.style.position = 'fixed';
  success.style.top = '0';
  success.style.left = '0';
  success.style.right = '0';
  success.style.background = 'green';
  success.style.color = 'white';
  success.style.padding = '10px';
  success.style.zIndex = '99999';
  success.innerText = '✅ React rendered successfully!';
  document.body.appendChild(success);
  
} catch (error) {
  // Show error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.background = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '99999';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerText = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
  document.body.appendChild(errorDiv);
  
  console.error('Render error:', error);
}