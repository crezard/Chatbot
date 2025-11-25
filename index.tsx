import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical Error: 'root' element not found in the DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to mount React application:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;"><h1>Application Error</h1><p>Failed to load the application. Please check the console for details.</p></div>`;
  }
}