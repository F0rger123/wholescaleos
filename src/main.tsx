import React from 'react';
import ReactDOM from 'react-dom/client';

// Super simple test component - no imports, no dependencies
function TestComponent() {
  return (
    <div style={{
      padding: '40px',
      background: '#0f172a',
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '32px' }}>✅ REACT IS WORKING!</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        If you see this, React is rendering correctly.
      </p>
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#1e293b',
        borderRadius: '8px'
      }}>
        <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
        <p><strong>React version:</strong> {React.version}</p>
      </div>
    </div>
  );
}

// Simple render with error catching
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  console.log('Rendering test component...');
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TestComponent />
    </React.StrictMode>
  );
  
  // Show success message
  const success = document.createElement('div');
  success.style.position = 'fixed';
  success.style.top = '10px';
  success.style.right = '10px';
  success.style.background = '#10b981';
  success.style.color = 'white';
  success.style.padding = '10px 20px';
  success.style.borderRadius = '4px';
  success.style.zIndex = '99999';
  success.innerText = '✅ React rendered!';
  document.body.appendChild(success);
  
} catch (error) {
  // Show error on screen
  document.body.innerHTML = `
    <div style="padding: 40px; background: #1a1a1a; color: #ff4444; font-family: monospace;">
      <h1 style="font-size: 24px;">❌ React Render Error</h1>
      <pre style="margin-top: 20px; padding: 20px; background: #2a2a2a; color: #ffaa00;">${error}</pre>
    </div>
  `;
}