import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';

const ACCENT = '#B89030';
const GRAPHITE = '#1C1C1C';
const BG = '#F9F9F8';

const CSS = `
  @keyframes cdFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cd-page { opacity: 0; transition: opacity 0.35s ease; }
  .cd-page.visible { opacity: 1; }
  .cd-split { display: flex; flex-direction: row; min-height: 100vh; }
  .cd-left  { flex: 0 0 55%; background: ${GRAPHITE}; padding: 60px 64px;
               display: flex; flex-direction: column; justify-content: space-between;
               background-image:
                 linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
               background-size: 48px 48px; }
  .cd-right { flex: 0 0 45%; background: ${BG}; display: flex;
               flex-direction: column; align-items: center;
               justify-content: center; padding: 60px 48px; }
  .cd-features { display: flex; flex-direction: column; gap: 22px; margin-bottom: 48px; }
  .cd-social   { display: flex; align-items: center; gap: 12px; padding: 14px 20px;
                  background: rgba(255,255,255,0.05); border-radius: 10;
                  border: 1px solid rgba(255,255,255,0.08); max-width: 380px; }
  .cd-btn-gold { transition: background 0.15s, transform 0.1s; }
  .cd-btn-gold:hover:not(:disabled) { background: #9a7020 !important; }
  .cd-btn-gold:active:not(:disabled) { transform: scale(0.98); }
  .cd-tab  { transition: color 0.15s; cursor: pointer; }
  .cd-tab:hover { color: ${ACCENT} !important; }
  .cd-inp  { transition: border-color 0.15s; }
  .cd-inp:focus { border-color: ${ACCENT} !important; outline: none; box-shadow: 0 0 0 3px ${ACCENT}18; }
  .cd-mode-link { color: ${ACCENT}; font-weight: 600; cursor: pointer; background: none; border: none;
                   font-size: 13px; font-family: 'Figtree', sans-serif; padding: 0; }
  .cd-mode-link:hover { text-decoration: underline; }
  @media (max-width: 860px) {
    .cd-split    { flex-direction: column; }
    .cd-left     { flex: none; padding: 36px 28px 32px; }
    .cd-right    { flex: none; padding: 32px 20px 40px; }
    .cd-features { display: none; }
    .cd-social   { display: none; }
  }
  @media (max-width: 480px) {
    .cd-left  { padding: 28px 20px 24px; }
    .cd-right { padding: 24px 16px 36px; }
    .cd-form-grid { grid-template-columns: 1fr !important; }
  }
`;

function CrosshairMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block', flexShrink: 0 }}>
      <rect width="40" height="40" rx="7" fill="#2C2C2C" />
      <circle cx="20" cy="20" r="9" fill="none" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="2.5" fill={ACCENT} />
      <line x1="20" y1="7"  x2="20" y2="12" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="28" x2="20" y2="33" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7"  y1="20" x2="12" y2="20" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="20" x2="33" y2="20" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  { icon: '⟶', text: 'Describe your project → get 200 calibrated line items instantly' },
  { icon: '◎', text: 'AI audits every line against current market benchmarks' },
  { icon: '⇌', text: 'Trade partner bidding and comparison in one platform' },
];

const AVATARS = [
  { initials: 'DB', hue: 200 },
  { initials: 'MR', hue: 140 },
  { initials: 'JL', hue: 30  },
  { initials: 'AK', hue: 270 },
];

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Inp({ type = 'text', value, onChange, placeholder, required, autoFocus }) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      required={required} autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      className="cd-inp"
      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0dc', borderRadius: 8, fontFamily: "'Figtree', sans-serif", fontSize: 14, boxSizing: 'border-box', background: '#fff', color: '#111' }}
    />
  );
}

function GoldBtn({ children, disabled, loading }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="cd-btn-gold"
      style={{ width: '100%', padding: '12px 0', marginTop: 6, background: disabled || loading ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 0.3, cursor: disabled || loading ? 'not-allowed' : 'pointer' }}
    >
      {children}
    </button>
  );
}

function ErrMsg({ msg }) {
  if (!msg) return null;
  return <p style={{ color: '#c0392b', fontFamily: "'Figtree', sans-serif", fontSize: 13, margin: '0 0 10px' }}>{msg}</p>;
}

function SuccessCard({ icon, title, body, linkLabel, onLink }) {
  return (
    <div style={{ background: '#f4fbf4', border: '1px solid #c3e6c3', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 34, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#2a6a2a', marginBottom: 6 }}>{title}</p>
      <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 18 }}>{body}</p>
      <button onClick={onLink} style={{ background: 'none', border: 'none', color: ACCENT, fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>{linkLabel}</button>
    </div>
  );
}

export default function LoginPage({ onSignIn }) {
  const [authTab, setAuthTab] = useState('magic'); // 'magic' | 'password'
  const [mode, setMode] = useState('signin');       // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t); }, []);

  const reset = () => { setError(null); setSent(false); setVerified(false); };
  const switchTab  = (t) => { setAuthTab(t); reset(); };
  const switchMode = (m) => { setMode(m); reset(); setPassword(''); setConfirm(''); };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await onSignIn(email);
    if (err) setError(err.message); else setSent(true);
    setLoading(false);
  };

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm)  { setError('Passwords do not match'); return; }
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, company }, emailRedirectTo: window.location.origin },
    });
    if (err) setError(err.message); else setVerified(true);
    setLoading(false);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className={`cd-page${visible ? ' visible' : ''}`}>
        <div className="cd-split">

          {/* ── LEFT: Marketing ─────────────────────────────── */}
          <div className="cd-left">
            <div>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 60 }}>
                <CrosshairMark size={44} />
                <span style={{ color: '#fff', fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 2 }}>
                  COST<span style={{ color: ACCENT }}>DECK</span>
                </span>
              </div>

              {/* Headline */}
              <h1 style={{ color: '#fff', fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1.15, marginBottom: 20, maxWidth: 460 }}>
                AI-Powered Preconstruction Estimating
              </h1>

              {/* Subheadline */}
              <p style={{ color: 'rgba(255,255,255,0.58)', fontFamily: "'Figtree', sans-serif", fontSize: 17, lineHeight: 1.75, marginBottom: 48, maxWidth: 420 }}>
                Generate full cost models in 60 seconds. Audit every line item against market data. Built by preconstruction professionals, for preconstruction professionals.
              </p>

              {/* Feature bullets */}
              <div className="cd-features">
                {FEATURES.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: `${ACCENT}1A`, border: `1px solid ${ACCENT}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontSize: 13, marginTop: 1 }}>
                      {f.icon}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.78)', fontFamily: "'Figtree', sans-serif", fontSize: 15, lineHeight: 1.65 }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social proof */}
            <div className="cd-social">
              <div style={{ display: 'flex' }}>
                {AVATARS.map((a, n) => (
                  <div key={n} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.12)', background: `hsl(${a.hue},40%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#fff', marginLeft: n > 0 ? -8 : 0, position: 'relative', zIndex: AVATARS.length - n }}>
                    {a.initials}
                  </div>
                ))}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'Figtree', sans-serif", fontSize: 13, lineHeight: 1.5 }}>
                Trusted by preconstruction teams across California
              </span>
            </div>
          </div>

          {/* ── RIGHT: Auth ──────────────────────────────────── */}
          <div className="cd-right">
            <div style={{ width: '100%', maxWidth: 400 }}>

              {/* Card */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e6e6e2', boxShadow: '0 2px 28px rgba(0,0,0,0.07)', overflow: 'hidden' }}>

                {/* Tabs (sign-in only) */}
                {mode === 'signin' && (
                  <div style={{ display: 'flex', background: '#FAFAF8', borderBottom: '1px solid #ebebea' }}>
                    {[['magic', 'Magic Link'], ['password', 'Password']].map(([t, label]) => (
                      <button
                        key={t}
                        onClick={() => switchTab(t)}
                        className="cd-tab"
                        style={{ flex: 1, padding: '14px 0', background: 'transparent', border: 'none', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: authTab === t ? ACCENT : '#aaa', borderBottom: authTab === t ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -1 }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Form body */}
                <div style={{ padding: '28px 28px 24px' }}>
                  {mode === 'signup' && !verified && (
                    <div style={{ marginBottom: 22 }}>
                      <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 21, color: '#111', marginBottom: 5 }}>Create your account</h2>
                      <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14 }}>Join CostDeck and start estimating in minutes.</p>
                    </div>
                  )}

                  {/* ── Success states ── */}
                  {sent && (
                    <SuccessCard icon="✉" title="Check your inbox" body={`We sent a magic link to ${email}. Click it to sign in — no password needed.`} linkLabel="Use a different email" onLink={() => { setSent(false); setEmail(''); }} />
                  )}

                  {verified && (
                    <SuccessCard icon="✉" title="Almost there!" body={`We sent a verification link to ${email}. Click it to activate your account.`} linkLabel="Use a different email" onLink={() => { setVerified(false); setEmail(''); }} />
                  )}

                  {/* ── Magic link form ── */}
                  {!sent && !verified && mode === 'signin' && authTab === 'magic' && (
                    <form onSubmit={handleMagicLink}>
                      <Field label="Work email">
                        <Inp type="email" value={email} onChange={setEmail} placeholder="you@company.com" required autoFocus />
                      </Field>
                      <ErrMsg msg={error} />
                      <GoldBtn disabled={!email} loading={loading}>
                        {loading ? 'Sending…' : 'Send Magic Link'}
                      </GoldBtn>
                    </form>
                  )}

                  {/* ── Password sign-in form ── */}
                  {!sent && !verified && mode === 'signin' && authTab === 'password' && (
                    <form onSubmit={handlePasswordSignIn}>
                      <Field label="Work email">
                        <Inp type="email" value={email} onChange={setEmail} placeholder="you@company.com" required autoFocus />
                      </Field>
                      <Field label="Password">
                        <Inp type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
                      </Field>
                      <ErrMsg msg={error} />
                      <GoldBtn disabled={!email || !password} loading={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                      </GoldBtn>
                    </form>
                  )}

                  {/* ── Sign up form ── */}
                  {!verified && mode === 'signup' && (
                    <form onSubmit={handleSignUp}>
                      <div className="cd-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <Field label="Full name">
                            <Inp value={fullName} onChange={setFullName} placeholder="Jane Smith" required autoFocus />
                          </Field>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <Field label="Company">
                            <Inp value={company} onChange={setCompany} placeholder="Acme Builders" />
                          </Field>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <Field label="Work email">
                            <Inp type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
                          </Field>
                        </div>
                        <Field label="Password">
                          <Inp type="password" value={password} onChange={setPassword} placeholder="Min. 6 chars" required />
                        </Field>
                        <Field label="Confirm password">
                          <Inp type="password" value={confirm} onChange={setConfirm} placeholder="Repeat" required />
                        </Field>
                      </div>
                      <ErrMsg msg={error} />
                      <GoldBtn disabled={!fullName || !email || !password || !confirm} loading={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                      </GoldBtn>
                    </form>
                  )}

                  {/* ── Mode toggle ── */}
                  {!sent && !verified && (
                    <p style={{ marginTop: 20, textAlign: 'center', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#999' }}>
                      {mode === 'signin'
                        ? <> New to CostDeck?{' '}<button className="cd-mode-link" onClick={() => switchMode('signup')}>Create an account</button> </>
                        : <> Already have an account?{' '}<button className="cd-mode-link" onClick={() => switchMode('signin')}>Sign in</button> </>
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <p style={{ textAlign: 'center', marginTop: 28, fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#c0c0be' }}>
                © 2026 CostDeck · costdeck.ai
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
