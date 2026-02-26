// src/main.jsx
// Application entry point – mounts the React tree to #root
import React from 'react';
import ReactDOM from 'react-dom/client';

// Bootstrap 5 (CSS + JS bundle for dropdowns, tabs, tooltips)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// Bootstrap Icons
import 'bootstrap-icons/font/bootstrap-icons.css';

import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
