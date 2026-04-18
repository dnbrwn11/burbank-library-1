import './sentry'; // must be first — initializes Sentry before any other code runs
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import DemoProject from './components/DemoProject';

const GOLD = '#B89030';

function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9F9F8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Figtree', sans-serif",
      padding: 24,
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: '40px 48px',
        textAlign: 'center',
        maxWidth: 420,
      }}>
        <div style={{
          fontFamily: "'Archivo', sans-serif",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: 2,
          color: GOLD,
          marginBottom: 20,
        }}>
          COSTDECK
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#222', marginBottom: 10 }}>
          Something went wrong.
        </div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 1.6 }}>
          Our team has been notified.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: GOLD,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 28px',
            fontFamily: "'Archivo', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));

if (window.location.pathname === '/demo') {
  root.render(
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <DemoProject />
    </Sentry.ErrorBoundary>
  );
} else {
  root.render(
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  );
}
