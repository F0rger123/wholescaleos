import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Add a test div to prove React is working
const testDiv = document.createElement('div');
testDiv.id = 'test-div';
testDiv.style.position = 'fixed';
testDiv.style.top = '60px'; // Move it below the purple bar
testDiv.style.left = '0';
testDiv.style.right = '0';
testDiv.style.backgroundColor = 'green';
testDiv.style.color = 'white';
testDiv.style.padding = '20px';
testDiv.style.zIndex = '99998';
testDiv.innerText = '✅ main.tsx loaded - React is about to render';
document.body.appendChild(testDiv);

// Try-catch to see if React throws an error
try {
  const root = document.getElementById('root');
  console.log('Root element:', root);
  
  ReactDOM.createRoot(root!).render(
    <React.StrictMode>
      <div style={{ padding: '20px', background: 'blue', color: 'white' }}>
        🟦 React rendered! If you see this, React is working.
      </div>
      <App />
    </React.StrictMode>
  );
  
  // Add success div
  const successDiv = document.createElement('div');
  successDiv.style.position = 'fixed';
  successDiv.style.top = '120px';
  successDiv.style.left = '0';
  successDiv.style.right = '0';
  successDiv.style.backgroundColor = 'blue';
  successDiv.style.color = 'white';
  successDiv.style.padding = '20px';
  successDiv.style.zIndex = '99997';
  successDiv.innerText = '🟦 React.render() called successfully';
  document.body.appendChild(successDiv);
  
} catch (error) {
  // Show error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '120px';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '99997';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.innerText = `❌ React error: ${error instanceof Error ? error.message : String(error)}`;
  document.body.appendChild(errorDiv);
  console.error('React mount error:', error);
}