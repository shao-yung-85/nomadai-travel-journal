import React from 'react';
console.log('NomadAI App Starting...');
import ReactDOM from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Safety timeout to remove loader
  setTimeout(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      console.warn("Force removing loader after timeout");
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }, 3000);
} catch (e) {
  console.error("React Render Error:", e);
}