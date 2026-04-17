import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DemoProject from './components/DemoProject';

const root = ReactDOM.createRoot(document.getElementById('root'));

// /demo route — no auth, no Supabase queries
if (window.location.pathname === '/demo') {
  root.render(<DemoProject />);
} else {
  root.render(<App />);
}
