import './sentry'; // must be first — initializes Sentry before any other code runs
import { Component } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import DemoProject from './components/DemoProject';

const GOLD   = '#B89030';
const HEADER = '#222222';

// ── Native error boundary — works even when Sentry is not configured ──────────
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[GlobalErrorBoundary] Caught render error:', error, info?.componentStack);
    try { Sentry.captureException(error, { extra: info }); } catch {}
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || 'An unexpected error occurred.';
    return (
      <div style={{
        minHeight: '100vh', background: '#F9F9F8',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: GOLD, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>
            COSTDECK
          </span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#fff', border: '1px solid #E5E5E2', borderRadius: 12,
            padding: '40px 48px', textAlign: 'center', maxWidth: 440,
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <div style={{
              fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 18,
              color: '#1A1A1A', marginBottom: 10,
            }}>
              Something went wrong
            </div>
            <div style={{
              fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888',
              marginBottom: 28, lineHeight: 1.6,
            }}>
              {msg}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: GOLD, color: '#fff', border: 'none', borderRadius: 8,
                padding: '12px 28px', fontFamily: "'Archivo', sans-serif",
                fontWeight: 700, fontSize: 14, cursor: 'pointer', letterSpacing: 0.5,
              }}
            >
              Reload
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: '#bbb', fontFamily: "'Figtree', sans-serif" }}>
              Our team has been notified. If this keeps happening,{' '}
              <a href="mailto:hello@costdeck.ai" style={{ color: GOLD }}>contact support</a>.
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// ── Root render ───────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));

if (window.location.pathname === '/demo') {
  root.render(
    <GlobalErrorBoundary>
      <DemoProject />
    </GlobalErrorBoundary>
  );
} else {
  root.render(
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  );
}
