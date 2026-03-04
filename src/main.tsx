import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Add a test div to prove React is working
const testDiv = document.createElement('div');
testDiv.id = 'test-div';
testDiv.style.position = 'fixed';
testDiv.style.top = '0';
testDiv.style.left = '0';
testDiv.style.right = '0';
testDiv.style.backgroundColor = 'green';
testDiv.style.color = 'white';
testDiv.style.padding = '20px';
testDiv.style.zIndex = '99999';
testDiv.innerText = '✅ main.tsx loaded - ' + new Date().toLocaleTimeString();
document.body.appendChild(testDiv);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);