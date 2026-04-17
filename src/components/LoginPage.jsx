import { useState } from 'react';

const ACCENT = '#B89030';
const HEADER = '#222222';
const BG = '#F9F9F8';

export default function LoginPage({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await onSignIn(email);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: HEADER, height: 56, padding: '0 32px',
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{
          color: ACCENT, fontFamily: "'Archivo', sans-serif",
          fontWeight: 800, fontSize: 18, letterSpacing: 2,
        }}>
          COSTDECK
        </span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          width: '100%', maxWidth: 420, background: '#fff',
          borderRadius: 14, padding: '40px 40px 36px',
          boxShadow: '0 2px 32px rgba(0,0,0,0.07)',
          border: '1px solid #ebebea',
        }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontFamily: "'Archivo', sans-serif", fontWeight: 800,
              fontSize: 26, color: '#111', marginBottom: 8,
            }}>
              Sign in to CostDeck
            </h1>
            <p style={{ fontFamily: "'Figtree', sans-serif", color: '#777', fontSize: 15, lineHeight: 1.5 }}>
              Enter your work email to receive a secure magic link.
            </p>
          </div>

          {sent ? (
            <div style={{
              background: '#f4faf4', border: '1px solid #c3e6c3',
              borderRadius: 10, padding: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
              <p style={{
                fontFamily: "'Figtree', sans-serif", fontWeight: 700,
                color: '#2a6e2a', marginBottom: 6, fontSize: 16,
              }}>
                Check your inbox
              </p>
              <p style={{ fontFamily: "'Figtree', sans-serif", color: '#555', fontSize: 14, lineHeight: 1.5 }}>
                We sent a magic link to <strong>{email}</strong>.<br />
                Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                style={{
                  marginTop: 16, background: 'none', border: 'none',
                  color: ACCENT, fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={{
                display: 'block', fontFamily: "'Figtree', sans-serif",
                fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6,
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
                style={{
                  width: '100%', padding: '11px 14px',
                  border: error ? '1.5px solid #d43f3f' : '1.5px solid #ddd',
                  borderRadius: 8, fontFamily: "'Figtree', sans-serif",
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  marginBottom: error ? 8 : 16, transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = error ? '#d43f3f' : '#ddd'; }}
              />
              {error && (
                <p style={{
                  color: '#c0392b', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, marginBottom: 14,
                }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: '100%', padding: '12px 0',
                  background: loading || !email ? '#d4b86a' : ACCENT,
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                  fontSize: 15, cursor: loading || !email ? 'not-allowed' : 'pointer',
                  letterSpacing: 0.3, transition: 'background 0.15s',
                }}
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
