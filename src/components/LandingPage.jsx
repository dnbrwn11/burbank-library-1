import { useState, useEffect, useRef } from 'react';

// ── Brand constants ──────────────────────────────────────────────────────────
const G          = '#222222';
const G_DARK     = '#1A1A1A';
const G_BANNER   = '#2A2A2A';
const GOLD       = '#B89030';
const GOLD_S     = '#FBF5E8';
const BG         = '#F9F9F8';
const BG_GRAY    = '#F3F3F1';
const WH         = '#FFFFFF';
const TX_MUTED   = '#999999';
const GREEN      = '#16A34A';
const BORDER     = '#E5E5E0';

// ── Global styles ────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Figtree:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

html { scroll-behavior: smooth; }
body { overflow-x: hidden; }

/* Fade-up on scroll */
.lp-fade { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
.lp-fade.lp-vis { opacity: 1; transform: translateY(0); }

/* Floating hero mockup */
@keyframes lp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.lp-float { animation: lp-float 6s ease-in-out infinite; }

/* Spin (loading) */
@keyframes lp-spin { to { transform: rotate(360deg); } }

/* Nav links */
.lp-nav-link { color: rgba(255,255,255,0.75); font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 500; text-decoration: none; transition: color 0.15s; cursor: pointer; background: none; border: none; padding: 0; }
.lp-nav-link:hover { color: ${GOLD}; }

/* Buttons */
.lp-btn-gold { background: ${GOLD}; color: #fff; border: none; transition: background 0.15s, transform 0.1s; cursor: pointer; }
.lp-btn-gold:hover { background: #a07b1f; }
.lp-btn-gold:active { transform: scale(0.97); }
.lp-btn-outline-w { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.35); transition: border-color 0.15s, background 0.15s; cursor: pointer; }
.lp-btn-outline-w:hover { border-color: ${GOLD}; background: rgba(184,144,48,0.1); }
.lp-btn-outline-d { background: transparent; color: ${G}; border: 1.5px solid ${BORDER}; transition: border-color 0.15s, color 0.15s; cursor: pointer; }
.lp-btn-outline-d:hover { border-color: ${GOLD}; color: ${GOLD}; }

/* Feature cards */
.lp-feat-card { position: relative; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; overflow: hidden; }
.lp-feat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: ${GOLD}; transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease; }
.lp-feat-card:hover { transform: translateY(-4px); box-shadow: 0 18px 42px rgba(0,0,0,0.08); border-color: #d9d5ca; }
.lp-feat-card:hover::before { transform: scaleX(1); }

/* Pricing */
.lp-price-card { transition: transform 0.2s, box-shadow 0.2s; }
.lp-price-card:hover { transform: translateY(-4px); }

/* Logos */
.lp-logo-item { opacity: 0.5; transition: opacity 0.2s; filter: grayscale(1); }
.lp-logo-item:hover { opacity: 0.9; }

/* FAQ */
.lp-faq-item { border-bottom: 1px solid ${BORDER}; }
.lp-faq-q { display: flex; justify-content: space-between; align-items: center; width: 100%; background: none; border: none; padding: 20px 0; cursor: pointer; text-align: left; font-family: 'Archivo', sans-serif; font-weight: 600; font-size: 15px; color: ${G}; transition: color 0.15s; }
.lp-faq-q:hover { color: ${GOLD}; }
.lp-faq-caret { transition: transform 0.25s; color: ${TX_MUTED}; flex-shrink: 0; }
.lp-faq-a { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; font-family: 'Figtree', sans-serif; font-size: 14px; line-height: 1.65; color: #555; }
.lp-faq-open .lp-faq-a { max-height: 520px; padding: 0 0 22px; }
.lp-faq-open .lp-faq-caret { transform: rotate(180deg); color: ${GOLD}; }

/* Form focus */
.lp-inp:focus { outline: none; border-color: ${GOLD} !important; box-shadow: 0 0 0 3px rgba(184,144,48,0.18) !important; }

/* Comparison rows */
.lp-cmp-row:hover { background: rgba(184,144,48,0.04); }

/* Role card */
.lp-role-card { transition: transform 0.2s, box-shadow 0.2s; }
.lp-role-card:hover { transform: translateY(-6px); box-shadow: 0 24px 56px rgba(0,0,0,0.1); }

/* Mobile menu */
.lp-mob-menu { transform: translateY(-100%); opacity: 0; transition: transform 0.3s ease, opacity 0.2s ease; pointer-events: none; }
.lp-mob-menu.lp-open { transform: translateY(0); opacity: 1; pointer-events: auto; }

/* Progress shimmer */
@keyframes lp-progress-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
.lp-progress-glow { animation: lp-progress-glow 2s ease-in-out infinite; }

/* Breakpoints */
@media (max-width: 1100px) {
  .lp-4col { grid-template-columns: 1fr 1fr !important; }
  .lp-cmp-table { font-size: 13px !important; }
}
@media (max-width: 860px) {
  .lp-nav-mid { display: none !important; }
  .lp-nav-ctas { display: none !important; }
  .lp-hamburger { display: flex !important; }
  .lp-3col { grid-template-columns: 1fr !important; }
  .lp-4col { grid-template-columns: 1fr 1fr !important; }
  .lp-hero-hl { font-size: 44px !important; line-height: 1.1 !important; }
  .lp-ctas { flex-direction: column !important; align-items: stretch !important; }
  .lp-ctas > * { width: 100% !important; text-align: center !important; box-sizing: border-box; }
  .lp-section { padding-left: 24px !important; padding-right: 24px !important; padding-top: 80px !important; padding-bottom: 80px !important; }
  .lp-hero-pad { padding-left: 24px !important; padding-right: 24px !important; }
  .lp-mock-dashboard { transform: scale(0.85); transform-origin: top center; }
  .lp-mob-hide { display: none !important; }
  .lp-mob-scroll { overflow-x: auto !important; }
  .lp-pricing-grid { grid-template-columns: 1fr !important; }
  .lp-testi-grid { grid-template-columns: 1fr !important; }
  .lp-footer-grid { grid-template-columns: 1fr 1fr !important; }
  .lp-pad-mob-crisp { padding-bottom: 80px !important; }
}
@media (max-width: 520px) {
  .lp-4col { grid-template-columns: 1fr !important; }
  .lp-hero-hl { font-size: 34px !important; }
  .lp-section-hl { font-size: 26px !important; }
  .lp-footer-grid { grid-template-columns: 1fr !important; }
}
`;

// ── Utilities ────────────────────────────────────────────────────────────────

function FadeIn({ delay = 0, children, style, className, as: Tag = 'div' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('lp-vis'); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={['lp-fade', className].filter(Boolean).join(' ')}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}>
      {children}
    </Tag>
  );
}

function CrosshairMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block', flexShrink: 0 }}>
      <rect width="40" height="40" rx="7" fill="#2a2a2a" />
      <circle cx="20" cy="20" r="9" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="2.5" fill={GOLD} />
      <line x1="20" y1="7"  x2="20" y2="12" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="28" x2="20" y2="33" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7"  y1="20" x2="12" y2="20" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="20" x2="33" y2="20" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Feature icons (all 20px, stroke-based) ───────────────────────────────────
const svg = (p) => <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24" fill="none" stroke={p.color || GOLD} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{p.children}</svg>;
const IconSparkles    = (p) => svg({ ...p, children: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></> });
const IconShieldCheck = (p) => svg({ ...p, children: <><path d="M12 3l8 3v6c0 4.5-3.5 8.5-8 9-4.5-.5-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></> });
const IconSearch      = (p) => svg({ ...p, children: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></> });
const IconBolt        = (p) => svg({ ...p, children: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/> });
const IconHandshake   = (p) => svg({ ...p, children: <><path d="M11 17l-3 3-4-4 4-4"/><path d="M13 7l3-3 4 4-4 4"/><path d="M7 13l4 4 4-4 4 4"/></> });
const IconGitBranch   = (p) => svg({ ...p, children: <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M8 12h8"/></> });
const IconUsers       = (p) => svg({ ...p, children: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></> });
const IconDocument    = (p) => svg({ ...p, children: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/></> });
const IconBriefcase   = (p) => svg({ ...p, children: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></> });
const IconBuilding    = (p) => svg({ ...p, children: <><rect x="4" y="3" width="16" height="18"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></> });
const IconWrench      = (p) => svg({ ...p, children: <><path d="M14.7 6.3a5 5 0 0 0 6.3 6.3L13 20.6a2.83 2.83 0 0 1-4-4L14.7 6.3z"/><path d="M20.3 4.3a1 1 0 1 0-1.6-1.6L15 6.4"/></> });

function CheckIcon({ color = GREEN, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}
function XIcon({ color = TX_MUTED, size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
function ChevronDown({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function PartnerLogo({ name }) {
  return (
    <span className="lp-logo-item" style={{
      fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 1.2,
      color: '#555', whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  );
}

// ── Beta Banner ──────────────────────────────────────────────────────────────
function BetaBanner({ onDismiss }) {
  return (
    <div style={{
      background: G_BANNER, color: 'rgba(255,255,255,0.82)',
      padding: '9px 36px 9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: "'Figtree', sans-serif", fontSize: 12,
      position: 'relative', zIndex: 101, textAlign: 'center', flexWrap: 'wrap',
      minHeight: 36, boxSizing: 'border-box',
    }}>
      <span>
        CostDeck is in beta. We're building in public and shipping fast.{' '}
        <button
          onClick={() => document.getElementById('founders-circle')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ color: GOLD, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
        >
          Join the Founder's Circle
        </button>
        {' '}to shape what we build next.
      </span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1,
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
        }}
      >×</button>
    </div>
  );
}

// ── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onShowLogin, onScrollTo, bannerVisible }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => { setMobileOpen(false); onScrollTo(id); };

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: bannerVisible ? 36 : 0,
        left: 0, right: 0,
        height: 60,
        background: scrolled ? 'rgba(26,26,26,0.88)' : 'rgba(26,26,26,0.35)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        zIndex: 100,
        transition: 'background 0.25s, border-color 0.25s, top 0.25s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
      }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CrosshairMark size={28} />
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: 2, color: GOLD }}>COSTDECK</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: GOLD, border: `1px solid ${GOLD}`, padding: '1px 6px', borderRadius: 3, letterSpacing: 1, fontFamily: "'Archivo', sans-serif" }}>BETA</span>
        </button>

        <div className="lp-nav-mid" style={{ display: 'flex', gap: 28 }}>
          <button className="lp-nav-link" onClick={() => go('platform')}>Platform</button>
          <button className="lp-nav-link" onClick={() => go('pricing')}>Pricing</button>
          <button className="lp-nav-link" onClick={() => go('compare')}>Compare</button>
          <button className="lp-nav-link" onClick={onShowLogin}>Sign In</button>
        </div>

        <div className="lp-nav-ctas" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="lp-btn-gold"
            onClick={() => go('founders-circle')}
            style={{ padding: '9px 18px', borderRadius: 7, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}
          >
            Join Founder's Circle
          </button>
        </div>

        <button
          className="lp-hamburger"
          onClick={() => setMobileOpen(v => !v)}
          style={{ display: 'none', background: 'none', border: 'none', flexDirection: 'column', gap: 4, cursor: 'pointer', padding: 8 }}
          aria-label="Menu"
        >
          <span style={{ width: 20, height: 2, background: '#fff', borderRadius: 1 }} />
          <span style={{ width: 20, height: 2, background: '#fff', borderRadius: 1 }} />
          <span style={{ width: 20, height: 2, background: '#fff', borderRadius: 1 }} />
        </button>
      </nav>

      <div className={`lp-mob-menu ${mobileOpen ? 'lp-open' : ''}`}
        style={{
          position: 'fixed',
          top: (bannerVisible ? 36 : 0) + 60,
          left: 0, right: 0,
          background: 'rgba(26,26,26,0.98)',
          backdropFilter: 'blur(12px)',
          zIndex: 99,
          padding: '20px 28px 28px',
          display: 'flex', flexDirection: 'column', gap: 16,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button className="lp-nav-link" onClick={() => go('platform')} style={{ textAlign: 'left', fontSize: 15 }}>Platform</button>
        <button className="lp-nav-link" onClick={() => go('pricing')} style={{ textAlign: 'left', fontSize: 15 }}>Pricing</button>
        <button className="lp-nav-link" onClick={() => go('compare')} style={{ textAlign: 'left', fontSize: 15 }}>Compare</button>
        <button className="lp-nav-link" onClick={() => { setMobileOpen(false); onShowLogin(); }} style={{ textAlign: 'left', fontSize: 15 }}>Sign In</button>
        <button
          className="lp-btn-gold"
          onClick={() => go('founders-circle')}
          style={{ padding: '12px 18px', borderRadius: 7, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 0.5, marginTop: 6 }}
        >
          Join Founder's Circle
        </button>
      </div>
    </>
  );
}

// ── Mock hero dashboard ──────────────────────────────────────────────────────
function MockHeroDashboard() {
  const kpis = [
    { label: 'LOW ESTIMATE',  val: '$66.6M',  sf: '$682 / SF',   c: '#4E5BA8', bg: '#EEF1F8' },
    { label: 'MID ESTIMATE',  val: '$96.5M',  sf: '$989 / SF',   c: GOLD,      bg: '#FBF5E8', border: `1.5px solid ${GOLD}` },
    { label: 'HIGH ESTIMATE', val: '$138.5M', sf: '$1,420 / SF', c: '#D83C31', bg: '#FCEEEA' },
  ];
  const catBars = [
    { cat: 'Shell',     pct: 82, val: '$19.2M' },
    { cat: 'Interiors', pct: 62, val: '$14.1M' },
    { cat: 'Services',  pct: 96, val: '$22.4M' },
    { cat: 'Sitework',  pct: 28, val: '$6.6M' },
    { cat: 'GC & Fees', pct: 48, val: '$11.3M' },
  ];
  const drivers = [
    { i: 1, desc: 'HVAC & mechanical systems', v: '$3.5M' },
    { i: 2, desc: 'Building envelope',         v: '$2.8M' },
    { i: 3, desc: 'Concrete structure',        v: '$4.7M' },
    { i: 4, desc: 'Electrical & lighting',     v: '$2.1M' },
  ];

  return (
    <div className="lp-mock-dashboard" style={{
      background: WH, borderRadius: 14,
      boxShadow: '0 28px 80px rgba(0,0,0,0.45), 0 4px 20px rgba(0,0,0,0.2)',
      border: '1px solid #eeeeea',
      width: '100%', maxWidth: 900, margin: '0 auto',
      overflow: 'hidden',
    }}>
      <div style={{ height: 34, background: '#F5F5F3', borderBottom: '1px solid #eaeae5', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FC605C' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FDBC40' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34C749' }} />
        </div>
        <div style={{ flex: 1, margin: '0 8px', background: WH, borderRadius: 5, fontSize: 10, color: '#aaa', padding: '3px 10px', fontFamily: "'Figtree', sans-serif", textAlign: 'center', border: '1px solid #eee' }}>
          costdeck.ai/projects/civic-library
        </div>
      </div>

      <div style={{ height: 32, background: G, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
        <span style={{ color: GOLD, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: 1.5 }}>COSTDECK</span>
        <span style={{ marginLeft: 14, fontSize: 10, color: '#777' }}>Civic Library — Baseline</span>
      </div>

      <div style={{ background: WH, borderBottom: '1px solid #eaeae5', padding: '0 14px', display: 'flex', gap: 16, fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 600, color: '#aaa', letterSpacing: 1 }}>
        <span style={{ padding: '8px 0', color: G, borderBottom: `2px solid ${GOLD}` }}>DASHBOARD</span>
        <span style={{ padding: '8px 0' }}>COST MODEL</span>
        <span style={{ padding: '8px 0' }}>COMPARE</span>
        <span style={{ padding: '8px 0' }}>AUDIT</span>
        <span style={{ padding: '8px 0' }}>TRADES</span>
        <span style={{ padding: '8px 0' }}>VE LOG</span>
      </div>

      <div style={{ padding: 16, background: BG }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: k.bg, border: k.border || '1px solid #eeeeea', borderRadius: 7, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#888', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 18, color: k.c, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 9, color: k.c, fontFamily: "'JetBrains Mono', monospace", marginTop: 4, opacity: 0.75 }}>{k.sf}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10 }}>
          <div style={{ background: WH, border: '1px solid #eeeeea', borderRadius: 7, padding: '11px 13px' }}>
            <div style={{ fontSize: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#888', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>COST BY CATEGORY</div>
            {catBars.map(b => (
              <div key={b.cat} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span style={{ width: 62, fontSize: 9, color: '#555', fontFamily: "'Figtree', sans-serif" }}>{b.cat}</span>
                <div style={{ flex: 1, background: '#f1f0eb', borderRadius: 2, height: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${b.pct}%`, height: '100%', background: `linear-gradient(90deg, ${GOLD}88, ${GOLD})`, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 9, color: '#555', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, minWidth: 42, textAlign: 'right' }}>{b.val}</span>
              </div>
            ))}
          </div>

          <div style={{ background: WH, border: '1px solid #eeeeea', borderRadius: 7, padding: '11px 13px' }}>
            <div style={{ fontSize: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#888', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>TOP COST DRIVERS</div>
            {drivers.map(d => (
              <div key={d.i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid #f3f2ed' }}>
                <span style={{ color: GOLD, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 9, width: 12 }}>{d.i}</span>
                <span style={{ flex: 1, fontSize: 9, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Figtree', sans-serif" }}>{d.desc}</span>
                <span style={{ fontSize: 9, color: GOLD, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{d.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onScrollTo }) {
  return (
    <section style={{
      background: G_DARK, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '130px 40px 80px', position: 'relative', overflow: 'hidden',
    }} className="lp-hero-pad">
      <div style={{ position: 'absolute', top: -200, left: '30%', width: 640, height: 640, background: `radial-gradient(circle, ${GOLD}15 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '10%', right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${GOLD}0d 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative' }}>
        <FadeIn>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              border: `1px solid ${GOLD}55`, padding: '5px 14px', borderRadius: 100,
              fontFamily: "'Figtree', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.8)',
              background: 'rgba(184,144,48,0.08)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
              Built by a preconstruction professional
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h1 className="lp-hero-hl" style={{
            fontFamily: "'Archivo', sans-serif", fontWeight: 800,
            fontSize: 62, lineHeight: 1.05, letterSpacing: -1.5,
            color: WH, textAlign: 'center', margin: '0 auto 22px',
            maxWidth: 900,
          }}>
            The AI platform <span style={{ color: GOLD, fontStyle: 'italic', fontWeight: 700 }}>for</span> preconstruction
          </h1>
        </FadeIn>

        <FadeIn delay={180}>
          <p style={{
            fontFamily: "'Figtree', sans-serif", fontSize: 16, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.72)', maxWidth: 600, margin: '0 auto 14px',
            textAlign: 'center',
          }}>
            From first look to GMP in one platform. Generate complete estimates in 60 seconds, audit every line against market data, track value engineering, project cash flow, write subcontract scopes, manage trade bids, and collaborate with your entire team.
          </p>
        </FadeIn>

        <FadeIn delay={240}>
          <p style={{
            fontFamily: "'Figtree', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.48)',
            textAlign: 'center', marginBottom: 36,
          }}>
            Currently in beta — join the Founder's Circle for early access and <span style={{ color: GOLD }}>50% off forever</span>.
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="lp-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
            <button
              className="lp-btn-gold"
              onClick={() => onScrollTo('founders-circle')}
              style={{ padding: '15px 30px', borderRadius: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}
            >
              Join Founder's Circle
            </button>
            <a
              href="/demo"
              className="lp-btn-outline-w"
              style={{ padding: '15px 30px', borderRadius: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 0.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Try Live Demo
            </a>
          </div>
          <p style={{ textAlign: 'center', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 52 }}>
            No credit card required
          </p>
        </FadeIn>

        <FadeIn delay={380}>
          <div className="lp-mock" style={{ position: 'relative', maxWidth: 920, margin: '0 auto' }}>
            <div style={{
              position: 'absolute', inset: '-40px -20px',
              background: `radial-gradient(ellipse at center, ${GOLD}35 0%, transparent 60%)`,
              filter: 'blur(50px)', pointerEvents: 'none',
            }} />
            <div className="lp-float" style={{ position: 'relative' }}>
              <MockHeroDashboard />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Logo bar ─────────────────────────────────────────────────────────────────
function LogoBar() {
  return (
    <section style={{ background: BG_GRAY, padding: '32px 40px', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} className="lp-section">
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, marginRight: 8 }}>Powered by</span>
        <PartnerLogo name="ANTHROPIC" />
        <span style={{ width: 1, height: 16, background: '#ddd' }} />
        <PartnerLogo name="SUPABASE" />
        <span style={{ width: 1, height: 16, background: '#ddd' }} />
        <PartnerLogo name="VERCEL" />
        <span style={{ width: 1, height: 16, background: '#ddd' }} />
        <PartnerLogo name="CLOUDFLARE" />
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
function FeaturesGrid() {
  const feats = [
    { icon: IconSparkles,    title: 'AI estimate generation', body: 'Describe your project in plain English and get 200 calibrated line items in 60 seconds.' },
    { icon: IconShieldCheck, title: 'Cost auditing',          body: 'Every line item benchmarked against market data with an overall confidence grade.' },
    { icon: IconSearch,      title: 'Scope gap detection',    body: "Upload any budget and instantly see what's missing, underscoped, or duplicated." },
    { icon: IconBolt,        title: 'Value engineering',      body: 'Track VE items with AI cross-trade impact analysis and savings tracking.' },
    { icon: IconHandshake,   title: 'Trade management',       body: 'Assign trades, generate AI subcontract scopes, invite subs, compare bids.' },
    { icon: IconGitBranch,   title: 'Scenarios & alternates', body: 'Compare multiple estimate scenarios side-by-side with base bid alternates.' },
    { icon: IconUsers,       title: 'Team collaboration',     body: 'Assign items to estimators, track progress, manage roles and permissions.' },
    { icon: IconDocument,    title: 'Reports & export',       body: 'Branded PDF reports, Excel export, Procore format, scope documents.' },
  ];
  return (
    <section id="platform" style={{ background: WH, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 14px', textAlign: 'center' }}>
            One platform. Every preconstruction workflow.
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 16, color: '#666', textAlign: 'center', maxWidth: 640, margin: '0 auto 64px', lineHeight: 1.6 }}>
            Stop switching between spreadsheets, PDFs, and disconnected tools. CostDeck replaces your entire precon tech stack.
          </p>
        </FadeIn>

        <div className="lp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {feats.map((f, i) => {
            const Icon = f.icon;
            return (
              <FadeIn key={f.title} delay={(i % 4) * 60}>
                <div className="lp-feat-card" style={{
                  background: WH, border: `1px solid ${BORDER}`, borderRadius: 12,
                  padding: '28px 22px', height: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: GOLD_S, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 18,
                  }}>
                    <Icon size={20} color={GOLD} />
                  </div>
                  <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: G, margin: '0 0 8px', lineHeight: 1.25 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#666', lineHeight: 1.55, margin: 0 }}>
                    {f.body}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── How it works — step mockups ──────────────────────────────────────────────
function MockStep1() {
  return (
    <div style={{ background: WH, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 10 }}>NEW PROJECT</div>
      {['Project name', 'Client', 'Building type', 'City, State'].map((l, i) => (
        <div key={l} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: '#888', marginBottom: 3, fontFamily: "'Figtree', sans-serif" }}>{l}</div>
          <div style={{ height: 26, background: '#fafaf8', border: '1px solid #eee', borderRadius: 5, padding: '6px 9px', fontSize: 10, color: '#555', fontFamily: "'Figtree', sans-serif" }}>
            {['Civic Center Library', 'City of Los Angeles', 'Civic / Library', 'Los Angeles, CA'][i]}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <div style={{ flex: 1, padding: '8px', borderRadius: 6, border: `1.5px solid ${GOLD}`, background: '#fffbf0', fontSize: 10, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: GOLD, textAlign: 'center' }}>New Construction</div>
        <div style={{ flex: 1, padding: '8px', borderRadius: 6, border: `1.5px solid #eee`, fontSize: 10, fontFamily: "'Archivo', sans-serif", fontWeight: 600, color: '#999', textAlign: 'center' }}>Renovation</div>
      </div>
    </div>
  );
}

function MockStep2() {
  const rows = [
    { c: 'Shell',     d: 'Concrete structure',     q: '85,000',  u: '$55' },
    { c: 'Shell',     d: 'Curtain wall glazing',   q: '6,200',   u: '$128' },
    { c: 'Interiors', d: 'Partitions & framing',   q: '110,000', u: '$17' },
    { c: 'Services',  d: 'HVAC & mechanical',      q: '85,000',  u: '$43' },
  ];
  return (
    <div style={{ background: WH, border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#fff', letterSpacing: 1, padding: '8px 14px', background: G }}>COST MODEL — 4 of 182 items</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 60px 40px', gap: 6, padding: '7px 12px', borderBottom: '1px solid #f3f2ed', fontSize: 10, fontFamily: "'Figtree', sans-serif", alignItems: 'center' }}>
          <span style={{ color: GOLD, fontSize: 9, fontWeight: 700 }}>{r.c}</span>
          <span style={{ color: '#333' }}>{r.d}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#666', textAlign: 'right' }}>{r.q}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: GOLD, fontWeight: 600, textAlign: 'right' }}>{r.u}</span>
        </div>
      ))}
      <div style={{ padding: '8px 14px', fontSize: 9, color: GOLD, fontFamily: "'Figtree', sans-serif", fontStyle: 'italic', background: '#fffbf0' }}>
        + 178 more items generating…
      </div>
    </div>
  );
}

function MockStep3() {
  return (
    <div style={{ background: WH, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 10 }}>DASHBOARD</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        <div style={{ padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 5 }}>
          <div style={{ fontSize: 8, color: '#166534', fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: 0.8 }}>VE SAVINGS</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#166534', fontWeight: 600, marginTop: 3 }}>-$2.3M</div>
        </div>
        <div style={{ padding: '8px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5 }}>
          <div style={{ fontSize: 8, color: '#1e40af', fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: 0.8 }}>BUDGET</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#1e40af', fontWeight: 600, marginTop: 3 }}>$45.0M</div>
        </div>
      </div>
      <div style={{ fontSize: 8, color: '#aaa', fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>BUDGET WATERFALL</div>
      {[
        { l: 'Original',     c: '#1e40af', w: 70 },
        { l: 'VE Adj.',      c: '#166534', w: 12 },
        { l: 'Change Order', c: '#991b1b', w: 18 },
        { l: 'Current',      c: '#1e40af', w: 64 },
      ].map(b => (
        <div key={b.l} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <span style={{ width: 50, fontSize: 8, color: '#777', fontFamily: "'Figtree', sans-serif" }}>{b.l}</span>
          <div style={{ flex: 1, height: 8, background: '#f1f0eb', borderRadius: 2 }}>
            <div style={{ width: `${b.w}%`, height: '100%', background: b.c, opacity: 0.8, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, t: 'Describe', b: 'Enter your project basics — name, client, building type, location. Choose a template or describe it in your own words. New construction or renovation.', mock: <MockStep1 /> },
    { n: 2, t: 'Generate', b: 'AI creates a complete CSI-formatted estimate with 200+ line items, three-point pricing, and automatic market benchmarking. Watch it build in real time.', mock: <MockStep2 /> },
    { n: 3, t: 'Manage',   b: 'Track VE, project cash flow, trade bids, and team assignments. Export reports. Sync with your ERP. All in one platform.', mock: <MockStep3 /> },
  ];
  return (
    <section style={{ background: BG_GRAY, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 14px', textAlign: 'center' }}>
            Three steps to a complete estimate
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 16, color: '#666', textAlign: 'center', maxWidth: 560, margin: '0 auto 64px', lineHeight: 1.6 }}>
            From project description to CSI-formatted estimate in minutes. No templates to configure, no library to maintain.
          </p>
        </FadeIn>

        <div className="lp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 100}>
              <div>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: GOLD, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 19,
                  marginBottom: 18,
                }}>
                  {s.n}
                </div>
                <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22, color: G, margin: '0 0 10px' }}>
                  {s.t}
                </h3>
                <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#555', lineHeight: 1.65, margin: '0 0 22px' }}>
                  {s.b}
                </p>
                <div>{s.mock}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Built for every role ─────────────────────────────────────────────────────
function ForEveryRole() {
  const roles = [
    {
      Icon: IconBuilding, title: 'For general contractors', badge: null,
      body: 'Generate estimates, audit costs, manage VE, track budgets, write sub scopes, and export branded reports. Give your precon team a 10x capacity multiplier.',
      bullets: ['AI estimate generation', 'Scope gap detection', 'Trade partner bidding', 'Team collaboration'],
    },
    {
      Icon: IconBriefcase, title: 'For owners & developers', badge: null,
      body: 'Budget your projects before hiring a GC. Compare scenarios, track value engineering, and hold your team accountable with data — not guesswork.',
      bullets: ['Instant project budgeting', 'Scenario comparison', 'Budget tracking with alerts', 'Professional PDF reports'],
    },
    {
      Icon: IconWrench, title: 'For trade partners', badge: 'Coming soon',
      body: 'AI takeoff for your trade, bid management, proposal generation, labor rate calculator, and win/loss analytics. Stop bidding blind.',
      bullets: ['AI trade-specific takeoff', 'Bid pipeline management', 'Proposal generation', 'Win/loss analytics'],
    },
  ];
  return (
    <section style={{ background: WH, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 14px', textAlign: 'center' }}>
            Built for every role in preconstruction
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 16, color: '#666', textAlign: 'center', maxWidth: 580, margin: '0 auto 64px', lineHeight: 1.6 }}>
            One platform tailored to each side of the table — from first concept to final GMP.
          </p>
        </FadeIn>

        <div className="lp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {roles.map((r, i) => (
            <FadeIn key={r.title} delay={i * 90}>
              <div className="lp-role-card" style={{
                background: WH, border: `1px solid ${BORDER}`, borderRadius: 14,
                padding: '32px 28px', height: '100%', boxSizing: 'border-box',
                position: 'relative',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: `linear-gradient(135deg, ${GOLD_S}, #f3e8c6)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 22,
                }}>
                  <r.Icon size={24} color={GOLD} />
                </div>
                {r.badge && (
                  <span style={{
                    position: 'absolute', top: 22, right: 22,
                    fontSize: 9, fontWeight: 700, color: GOLD,
                    border: `1px solid ${GOLD}55`, padding: '2px 8px', borderRadius: 100,
                    letterSpacing: 0.5, fontFamily: "'Archivo', sans-serif", textTransform: 'uppercase',
                  }}>
                    {r.badge}
                  </span>
                )}
                <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 19, color: G, margin: '0 0 12px', lineHeight: 1.2 }}>
                  {r.title}
                </h3>
                <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#555', lineHeight: 1.65, margin: '0 0 22px' }}>
                  {r.body}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {r.bullets.map(b => (
                    <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#333' }}>
                      <CheckIcon color={GOLD} size={13} />
                      {b}
                    </li>
                  ))}
                </ul>
                {r.badge && (
                  <button
                    onClick={() => document.getElementById('founders-circle')?.scrollIntoView({ behavior: 'smooth' })}
                    style={{
                      marginTop: 20, background: 'none', border: 'none',
                      color: GOLD, fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                      fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3,
                    }}
                  >
                    Join the waitlist →
                  </button>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── See it in action ─────────────────────────────────────────────────────────
function MockCostModelTable() {
  const rows = [
    { cat: 'Shell',     desc: 'Concrete structure & foundations', qty: '85,000',  unit: 'SF', unitCost: '$55',   total: '$4.68M', audit: '✓', assign: 'MR', sens: 'High' },
    { cat: 'Shell',     desc: 'Building envelope & curtain wall', qty: '16,000',  unit: 'SF', unitCost: '$120',  total: '$1.92M', audit: '✓', assign: 'MR', sens: 'High' },
    { cat: 'Shell',     desc: 'TPO membrane roofing system',      qty: '21,000',  unit: 'SF', unitCost: '$27',   total: '$567K',  audit: '!', assign: 'SK', sens: 'Med'  },
    { cat: 'Interiors', desc: 'Interior partitions & framing',    qty: '110,000', unit: 'SF', unitCost: '$17',   total: '$1.87M', audit: '✓', assign: 'JL', sens: 'Med'  },
    { cat: 'Interiors', desc: 'Acoustic ceiling tile',            qty: '72,000',  unit: 'SF', unitCost: '$12',   total: '$864K',  audit: '✓', assign: 'JL', sens: 'Low'  },
    { cat: 'Services',  desc: 'HVAC & mechanical systems',        qty: '85,000',  unit: 'SF', unitCost: '$43',   total: '$3.66M', audit: '✓', assign: 'MR', sens: 'High' },
    { cat: 'Services',  desc: 'Electrical & lighting',            qty: '85,000',  unit: 'SF', unitCost: '$30',   total: '$2.55M', audit: '✓', assign: 'SK', sens: 'Med'  },
    { cat: 'Sitework',  desc: 'Site preparation & utilities',     qty: '1',       unit: 'LS', unitCost: '$280K', total: '$280K',  audit: '!', assign: 'JL', sens: 'High' },
  ];
  const auditColor = { '✓': '#16a34a', '!': '#f59e0b', '×': '#ef4444' };
  const sensColor  = { High: '#b91c1c', Med: '#6b8cae', Low: '#16a34a' };

  return (
    <div style={{
      background: WH, borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 30px 90px rgba(0,0,0,0.5), 0 4px 12px rgba(184,144,48,0.15)',
      border: '1px solid #3a3a3a',
    }}>
      <div style={{ background: G, padding: '12px 20px', borderBottom: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: GOLD, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: 1.5 }}>COSTDECK</span>
          <span style={{ width: 1, height: 14, background: '#444' }} />
          <span style={{ color: '#ccc', fontSize: 11, fontFamily: "'Figtree', sans-serif" }}>Civic Center Library · Baseline · 97,500 SF</span>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 600, color: '#666', letterSpacing: 1 }}>
          <span style={{ color: GOLD, borderBottom: `2px solid ${GOLD}`, paddingBottom: 4 }}>COST MODEL</span>
          <span>DASHBOARD</span>
          <span>AUDIT</span>
          <span>VE LOG</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr 80px 50px 75px 85px 32px 36px 50px', gap: 8, padding: '10px 20px', background: '#2a2a2a', color: '#999', fontFamily: "'Archivo', sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: 1 }}>
        <span>CATEGORY</span><span>DESCRIPTION</span><span style={{ textAlign: 'right' }}>QTY</span><span>UNIT</span><span style={{ textAlign: 'right' }}>UNIT COST</span><span style={{ textAlign: 'right' }}>TOTAL</span><span style={{ textAlign: 'center' }}>AUDIT</span><span style={{ textAlign: 'center' }}>ASSIGN</span><span>SENS</span>
      </div>

      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '95px 1fr 80px 50px 75px 85px 32px 36px 50px',
          gap: 8, padding: '10px 20px', background: i % 2 === 0 ? '#fcfcfa' : WH,
          borderBottom: '1px solid #eeeeea', fontFamily: "'Figtree', sans-serif", fontSize: 12, alignItems: 'center',
        }}>
          <span style={{ color: GOLD, fontWeight: 600, fontSize: 11 }}>{r.cat}</span>
          <span style={{ color: '#333' }}>{r.desc}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#555', textAlign: 'right' }}>{r.qty}</span>
          <span style={{ color: '#777', fontSize: 11 }}>{r.unit}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#444', textAlign: 'right' }}>{r.unitCost}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: G, fontWeight: 600, textAlign: 'right' }}>{r.total}</span>
          <span style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: auditColor[r.audit] }} />
          </span>
          <span style={{ textAlign: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%', background: GOLD, color: '#fff',
              fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 9,
            }}>{r.assign}</span>
          </span>
          <span>
            <span style={{ fontSize: 9, color: sensColor[r.sens], fontFamily: "'Archivo', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{r.sens}</span>
          </span>
        </div>
      ))}

      <div style={{ background: '#fafaf8', padding: '12px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#888', fontFamily: "'Figtree', sans-serif" }}>Showing 8 of 180 line items</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, color: GOLD }}>
          Mid Total: $96,540,000
        </span>
      </div>
    </div>
  );
}

function SeeItInAction() {
  return (
    <section style={{ background: G_DARK, padding: '120px 40px', position: 'relative', overflow: 'hidden' }} className="lp-section">
      <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 500, height: 500, background: `radial-gradient(circle, ${GOLD}15 0%, transparent 60%)`, pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: WH, margin: '0 0 18px', textAlign: 'center' }}>
            See what an AI-generated estimate looks like
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', maxWidth: 620, margin: '0 auto 60px', lineHeight: 1.6 }}>
            A full CSI-formatted cost model with three-point pricing, audit status, assignments, and sensitivity — generated from a single project description.
          </p>
        </FadeIn>

        <FadeIn delay={120}>
          <div className="lp-mob-scroll" style={{ minWidth: 720 }}>
            <MockCostModelTable />
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
              Generated for a <span style={{ color: WH }}>97,500 SF civic library in Los Angeles</span> in <span style={{ color: GOLD, fontWeight: 600 }}>47 seconds</span>. 180 line items. Audited against 2026 market data.
            </p>
            <a
              href="/demo"
              className="lp-btn-gold"
              style={{ padding: '14px 30px', borderRadius: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 0.5, textDecoration: 'none', display: 'inline-block' }}
            >
              Try it yourself — free
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Why switch from Excel ────────────────────────────────────────────────────
function WhyExcel() {
  const rows = [
    ['Time to estimate',   '2-3 weeks',                                    '60 seconds'],
    ['Accuracy check',     'Manual review, hope for the best',             'AI audits every line against market data'],
    ['Missing scope',      'Discovered during construction',                'Detected before you submit'],
    ['Value engineering',  'Separate spreadsheet nobody updates',           'AI cross-trade impact analysis in real time'],
    ['Team collaboration', 'Email the spreadsheet, pray nobody overwrites', 'Real-time, role-based, assignment tracking'],
    ['Sub bidding',        'Phone calls, emails, manual leveling',          'Invite, collect, compare, award — one platform'],
    ['Trade scopes',       "Copy last project's scope, find-and-replace",  'AI writes custom scopes from your line items'],
    ['Cost',               '$50K-200K for enterprise tools',                'Starting at $99/month'],
  ];
  return (
    <section style={{ background: WH, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 14px', textAlign: 'center' }}>
            Excel was built for accountants, not estimators
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 16, color: '#666', textAlign: 'center', maxWidth: 580, margin: '0 auto 64px', lineHeight: 1.6 }}>
            The way preconstruction has always worked isn't how it has to work.
          </p>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{ background: WH, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }} className="lp-mob-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1.8fr', background: '#fafaf8', borderBottom: `1px solid ${BORDER}`, minWidth: 640 }}>
              <div />
              <div style={{ padding: '18px 20px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, color: '#888', letterSpacing: 0.5, borderRight: `1px solid ${BORDER}` }}>
                Traditional estimating
              </div>
              <div style={{ padding: '18px 20px', fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 12, color: GOLD, letterSpacing: 0.5, background: '#fffbf0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CrosshairMark size={18} />
                <span style={{ color: GOLD }}>CostDeck</span>
              </div>
            </div>
            {rows.map(([label, trad, cd], i) => (
              <div key={i} className="lp-cmp-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1.8fr', borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}` : 'none', minWidth: 640 }}>
                <div style={{ padding: '18px 20px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, color: G, background: '#fcfcfa' }}>
                  {label}
                </div>
                <div style={{ padding: '18px 20px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#888', borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#b91c1c', opacity: 0.5, fontSize: 14 }}>✗</span> {trad}
                </div>
                <div style={{ padding: '18px 20px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: G, background: '#fefcf5', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500 }}>
                  <CheckIcon color={GREEN} size={14} />
                  {cd}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── How we compare ───────────────────────────────────────────────────────────
function HowWeCompare() {
  const features = [
    { label: 'AI estimate generation from description',       v: ['✓', '✗', '✗', '✗', '✗'] },
    { label: 'Cost auditing with confidence score',            v: ['✓', '✗', '✗', '✗', '✗'] },
    { label: 'Scope gap detection',                             v: ['✓', '✗', '✗', '✗', '✗'] },
    { label: 'AI subcontract scopes',                           v: ['✓', '✗', '✗', '✗', '✗'] },
    { label: 'Value engineering with AI cross-trade analysis', v: ['✓', '✗', 'Partial', '✗', '✗'] },
    { label: 'Trade partner bidding',                           v: ['✓', '✓', '✗', '✗', '✗'] },
    { label: 'Scenario comparison',                             v: ['✓', '✓', '✓', '✓', 'Manual'] },
    { label: 'Team collaboration',                              v: ['✓', '✓', '✓', '✓', '✗'] },
    { label: 'Excel import/export',                             v: ['✓', '✓', '✓', '✓', 'N/A'] },
    { label: 'Starting price',                                  v: ['$99/mo', '~$79/user/mo', 'Custom', 'Custom', '$0'] },
  ];
  const cols = ['CostDeck', 'Buildr', 'ConCntric', 'ProEst', 'Excel'];

  const cell = (val) => {
    if (val === '✓') return <CheckIcon color={GREEN} size={15} />;
    if (val === '✗') return <XIcon color="#cbcbcb" size={12} />;
    return <span style={{ fontSize: 11, color: '#666', fontFamily: "'Figtree', sans-serif", fontWeight: 500 }}>{val}</span>;
  };

  return (
    <section id="compare" style={{ background: BG_GRAY, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 14px', textAlign: 'center' }}>
            How CostDeck compares
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 16, color: '#666', textAlign: 'center', maxWidth: 600, margin: '0 auto 64px', lineHeight: 1.6 }}>
            Feature-by-feature against the tools you're probably using.
          </p>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="lp-mob-scroll" style={{ background: WH, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <table className="lp-cmp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
              <thead>
                <tr style={{ background: '#fafaf8' }}>
                  <th style={{ padding: '18px 20px', textAlign: 'left', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, color: '#888', letterSpacing: 1.2, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>
                    Feature
                  </th>
                  {cols.map((c, i) => (
                    <th key={c} style={{
                      padding: '18px 14px', textAlign: 'center',
                      fontFamily: "'Archivo', sans-serif", fontWeight: i === 0 ? 800 : 700,
                      fontSize: 12,
                      color: i === 0 ? GOLD : '#777',
                      background: i === 0 ? '#fffbf0' : 'transparent',
                      borderBottom: i === 0 ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                      borderLeft: i === 0 ? `2px solid ${GOLD}` : 'none',
                      borderRight: i === 0 ? `2px solid ${GOLD}` : 'none',
                    }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={f.label} className="lp-cmp-row" style={{ borderBottom: i < features.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '14px 20px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: G, fontWeight: 500 }}>
                      {f.label}
                    </td>
                    {f.v.map((v, j) => (
                      <td key={j} style={{
                        padding: '14px 14px', textAlign: 'center',
                        background: j === 0 ? '#fffbf0' : 'transparent',
                        borderLeft: j === 0 ? `2px solid ${GOLD}` : 'none',
                        borderRight: j === 0 ? `2px solid ${GOLD}` : 'none',
                      }}>
                        {cell(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>

        <FadeIn delay={160}>
          <p style={{ marginTop: 32, textAlign: 'center', fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#555', lineHeight: 1.65, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
            CostDeck is the only platform that generates estimates from a description, audits every line, detects scope gaps, writes sub scopes, and manages trade bidding — in one tool.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Social proof ─────────────────────────────────────────────────────────────
function SocialProof() {
  const testimonials = [
    { q: "This is the tool I've been waiting 20 years for. I generated a complete hotel estimate in under a minute and the audit caught two items I would have missed.", n: 'Mike R.', r: 'Chief Estimator', c: 'Regional GC' },
    { q: 'We used to spend 3 weeks on conceptual estimates. Now we generate them in a meeting and the client sees numbers before lunch.', n: 'Sarah K.', r: 'VP Preconstruction', c: 'ENR Top 50' },
    { q: "The scope gap analysis alone paid for the subscription. We uploaded a sub's budget and found $2M in missing scope in 30 seconds.", n: 'James L.', r: 'Senior Estimator', c: 'Design-Builder' },
  ];
  return (
    <section style={{ background: WH, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 64px', textAlign: 'center' }}>
            Trusted by preconstruction professionals
          </h2>
        </FadeIn>

        <div className="lp-testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {testimonials.map((t, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div style={{ background: WH, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '32px 28px', height: '100%', boxSizing: 'border-box', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 14, left: 22, fontSize: 48, color: GOLD_S, fontFamily: "'Archivo', sans-serif", fontWeight: 900, lineHeight: 1 }}>"</span>
                <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#333', lineHeight: 1.65, margin: '22px 0 24px', position: 'relative' }}>
                  {t.q}
                </p>
                <div style={{ paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, color: G }}>{t.n}</div>
                  <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#888', marginTop: 2 }}>{t.r} · {t.c}</div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={300}>
          <p style={{ textAlign: 'center', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#aaa', marginTop: 48 }}>
            Join <span style={{ color: GOLD, fontWeight: 600 }}>50+ preconstruction teams</span> already using CostDeck
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const tiers = [
    {
      name: 'Free', price: '$0', was: null, badge: null, highlight: false,
      cta: 'Get started', ctaType: 'outline',
      features: ['1 project', '1 user', '5 AI generations / month', 'Basic PDF export'],
    },
    {
      name: 'Pro', price: '$49', was: '$99', badge: "Founder's price", highlight: true,
      cta: "Join Founder's Circle", ctaType: 'gold', subtitle: 'Most popular',
      features: ['Unlimited projects', 'Unlimited AI generations', 'Team collaboration (5 users)', 'AI audit + scope gap analysis', 'VE tracking + budget tracker', 'Excel import / export', 'Trade management + bid portal', 'All report types'],
    },
    {
      name: 'Team', price: '$149', was: '$299', badge: "Founder's price", highlight: false,
      cta: "Join Founder's Circle", ctaType: 'gold',
      features: ['Everything in Pro', 'Unlimited users', 'White-label PDF reports', 'Portfolio dashboard', 'Historical benchmarks', 'API access', 'Priority support'],
    },
  ];
  return (
    <section id="pricing" style={{ background: WH, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 14px', textAlign: 'center' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 16, color: '#666', textAlign: 'center', maxWidth: 560, margin: '0 auto 64px', lineHeight: 1.6 }}>
            Start free. Upgrade when you're ready. No contracts.
          </p>
        </FadeIn>

        <div className="lp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
          {tiers.map((t, i) => (
            <FadeIn key={t.name} delay={i * 80}>
              <div className="lp-price-card" style={{
                background: WH,
                border: t.highlight ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                borderRadius: 14, padding: '32px 26px',
                position: 'relative',
                height: '100%', boxSizing: 'border-box',
                boxShadow: t.highlight ? '0 12px 40px rgba(184,144,48,0.18)' : '0 1px 6px rgba(0,0,0,0.03)',
              }}>
                {t.subtitle && (
                  <span style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: GOLD, color: '#fff', fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                    fontSize: 10, padding: '4px 14px', borderRadius: 100, letterSpacing: 1, textTransform: 'uppercase',
                  }}>
                    {t.subtitle}
                  </span>
                )}
                <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: G, margin: '0 0 18px' }}>
                  {t.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 44, color: G, letterSpacing: -1 }}>
                    {t.price}
                  </span>
                  {t.was && (
                    <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 18, color: '#aaa', textDecoration: 'line-through' }}>
                      {t.was}
                    </span>
                  )}
                  <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#888' }}>
                    {t.price !== '$0' && '/mo'}
                  </span>
                </div>
                {t.badge ? (
                  <div style={{
                    display: 'inline-block', background: GOLD_S, color: GOLD,
                    fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 10,
                    padding: '3px 10px', borderRadius: 100, marginBottom: 18, letterSpacing: 0.5,
                  }}>
                    {t.badge}
                  </div>
                ) : (
                  <div style={{ height: 28, marginBottom: 18 }} />
                )}

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 26px' }}>
                  {t.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#444' }}>
                      <span style={{ marginTop: 4 }}><CheckIcon color={GOLD} size={13} /></span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={t.ctaType === 'gold' ? 'lp-btn-gold' : 'lp-btn-outline-d'}
                  onClick={() => {
                    if (t.ctaType === 'gold') {
                      document.getElementById('founders-circle')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  style={{ width: '100%', padding: '12px 20px', borderRadius: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}
                >
                  {t.cta}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={300}>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa', marginBottom: 8 }}>
              Beta pricing — rates will increase at general availability
            </p>
            <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa', marginBottom: 8 }}>
              Trade partner plans coming soon — join the waitlist
            </p>
            <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#888' }}>
              Enterprise plans available — custom pricing for teams of 20+. <a href="mailto:hello@costdeck.ai" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Contact us</a>
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
function Faq() {
  const [openIdx, setOpenIdx] = useState(0);

  const qa = [
    ['How accurate are AI-generated estimates?',
      'Uses current market data calibrated to location, building type, and labor conditions. Three-point estimates show the range. The AI audit benchmarks every line item and gives an overall confidence score. We recommend using AI as a starting point, then refining with your expertise.'],
    ['How is this different from Excel?',
      'Excel requires manual line-by-line entry with no benchmarking. CostDeck generates a complete estimate in 60 seconds, audits every line, detects scope gaps, tracks VE with cross-trade analysis, manages trade bids, and lets your team collaborate in real time.'],
    ['How does this compare to Buildr or ProEst?',
      'Buildr focuses on CRM and bid leveling. ProEst is traditional estimating. CostDeck is the only platform that generates estimates from a project description, audits against market data, writes subcontract scopes with AI, and manages the entire precon workflow in one tool.'],
    ['Can I import existing estimates?',
      'Yes. Upload Excel or CSV with automatic column mapping. Export in Procore budget format and standard Excel.'],
    ['Is my data secure?',
      'Encrypted in transit and at rest, row-level security, hosted on AWS infrastructure. SOC 2 certification planned. Enterprise BYOK and private deployment available.'],
    ['Does this work for renovations?',
      'Yes. Toggle between new construction and renovation/TI when creating a project. The AI adjusts scope, quantities, and pricing — adding demolition, removing foundations, adjusting for occupied conditions.'],
    ['Can my team collaborate?',
      'Yes. Invite team members as Editors or Viewers. Assign line items to specific estimators and track their progress. Organization-wide project management.'],
    ['What building types do you support?',
      'All commercial: civic, education, healthcare, office, residential, hotel, mixed-use, industrial, data center, arena, warehouse, and more. The AI adapts to your specific building type and location.'],
    ['Do you integrate with Procore?',
      'Export in Procore budget format today. Full API integration and Procore Marketplace listing coming soon. Also export for JDE, Sage, and other ERPs.'],
    ["What does the Founder's Circle include?",
      'First 50 members: 60 days Pro free, 50% off forever, direct founder access, priority features, shape what we build next.'],
  ];

  return (
    <section style={{ background: WH, padding: '120px 40px' }} className="lp-section">
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: G, margin: '0 0 48px', textAlign: 'center' }}>
            Frequently asked questions
          </h2>
        </FadeIn>

        <FadeIn delay={80}>
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            {qa.map(([q, a], i) => {
              const isOpen = openIdx === i;
              return (
                <div key={i} className={`lp-faq-item ${isOpen ? 'lp-faq-open' : ''}`}>
                  <button className="lp-faq-q" onClick={() => setOpenIdx(isOpen ? -1 : i)}>
                    <span>{q}</span>
                    <span className="lp-faq-caret"><ChevronDown size={18} /></span>
                  </button>
                  <div className="lp-faq-a">{a}</div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Founder's Circle ─────────────────────────────────────────────────────────
function FoundersCircle() {
  const [email, setEmail]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [err, setErr]               = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch('/api/join-founders-circle', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      setSuccess(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    '60 days of Pro free — no credit card required',
    'Locked-in founder pricing — 50% off forever, even when prices increase',
    'Direct access to the founder for feature requests and support',
    'Priority access to new features before public release',
    'Shape the platform — your feedback directly influences what we build',
    'Your company logo on the CostDeck website',
  ];

  const claimed = 12, total = 50;
  const pct = (claimed / total) * 100;

  return (
    <section id="founders-circle" style={{ background: G_DARK, padding: '120px 40px', borderTop: `3px solid ${GOLD}`, position: 'relative', overflow: 'hidden' }} className="lp-section">
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: `radial-gradient(circle, ${GOLD}18 0%, transparent 60%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
        <FadeIn>
          <h2 className="lp-section-hl" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.15, letterSpacing: -0.8, color: WH, margin: '0 0 18px', textAlign: 'center' }}>
            Join the Founder's Circle
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 620, margin: '0 auto 44px', lineHeight: 1.65 }}>
            The first 50 teams get exclusive founding member benefits — locked in for life. Get in now during beta. Founder pricing locks in before we go to market.
          </p>
        </FadeIn>

        <FadeIn delay={80}>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto 40px', maxWidth: 620 }}>
            {benefits.map(b => (
              <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 0', fontFamily: "'Figtree', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>
                <span style={{ marginTop: 4 }}><CheckIcon color={GOLD} size={15} /></span>
                {b}
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={160}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              <span>{claimed} of {total} spots claimed</span>
              <span style={{ color: GOLD }}>{total - claimed} remaining</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', height: 10, borderRadius: 5, overflow: 'hidden' }}>
              <div className="lp-progress-glow" style={{
                width: `${pct}%`, height: '100%',
                background: `linear-gradient(90deg, ${GOLD}, #d4a843)`,
                borderRadius: 5,
                boxShadow: `0 0 14px ${GOLD}80`,
              }} />
            </div>
          </div>
        </FadeIn>

        {success ? (
          <FadeIn>
            <div style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.35)', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: GOLD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <CheckIcon color="#fff" size={22} />
              </div>
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 18, color: WH, marginBottom: 6 }}>
                You're in!
              </div>
              <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                We'll email you when CostDeck is ready.
              </div>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={220}>
            <form onSubmit={onSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 540, margin: '0 auto' }}>
              <input
                className="lp-inp"
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{
                  flex: '1 1 240px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, padding: '13px 16px',
                  fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#fff',
                  outline: 'none',
                }}
              />
              <button
                type="submit" disabled={submitting}
                className="lp-btn-gold"
                style={{
                  padding: '13px 24px', borderRadius: 8,
                  fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 0.5,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Claiming…' : 'Claim Your Spot'}
              </button>
            </form>
            {err && (
              <p style={{ color: '#fca5a5', fontFamily: "'Figtree', sans-serif", fontSize: 13, textAlign: 'center', marginTop: 14 }}>
                {err}
              </p>
            )}
            <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 18 }}>
              No credit card required. Cancel anytime.
            </p>
          </FadeIn>
        )}
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onScrollTo }) {
  const cols = [
    { title: 'Product',   links: [
      ['Features', () => onScrollTo('platform')],
      ['Pricing',  () => onScrollTo('pricing')],
      ['Compare',  () => onScrollTo('compare')],
      ['Demo',     '/demo'],
      ['Templates', null],
    ]},
    { title: 'Resources', links: [
      ['Blog', null],
      ['Changelog', null],
      ['API Docs (coming soon)', null],
      ['Help Center', null],
    ]},
    { title: 'Company',   links: [
      ['About', null],
      ['Careers (coming soon)', null],
      ['Contact', 'mailto:hello@costdeck.ai'],
    ]},
    { title: 'Legal',     links: [
      ['Privacy Policy', null],
      ['Terms of Service', null],
    ]},
  ];
  return (
    <footer style={{ background: '#111111', padding: '64px 40px 40px', color: 'rgba(255,255,255,0.55)' }} className="lp-section">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="lp-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CrosshairMark size={28} />
              <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: 2, color: GOLD }}>COSTDECK</span>
            </div>
            <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 20, maxWidth: 280 }}>
              The AI platform for preconstruction.
            </p>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 16 }}>
                {col.title}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.links.map(([label, action]) => {
                  const isString = typeof action === 'string';
                  const isFn = typeof action === 'function';
                  const base = { fontFamily: "'Figtree', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', background: 'none', border: 'none', padding: '5px 0', cursor: (isString || isFn) ? 'pointer' : 'default', display: 'block', textAlign: 'left' };
                  return (
                    <li key={label}>
                      {isString ? (
                        <a href={action} style={base} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>{label}</a>
                      ) : isFn ? (
                        <button onClick={action} style={base} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>{label}</button>
                      ) : (
                        <span style={{ ...base, color: 'rgba(255,255,255,0.28)' }}>{label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Built by a preconstruction professional, for preconstruction professionals.
          </p>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            © 2026 CostDeck. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function LandingPage({ onShowLogin }) {
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem('costdeck_beta_dismissed') === '1'; } catch { return false; }
  });

  const dismissBanner = () => {
    try { localStorage.setItem('costdeck_beta_dismissed', '1'); } catch {}
    setBannerDismissed(true);
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="lp-pad-mob-crisp" style={{ background: BG, color: G, fontFamily: "'Figtree', sans-serif" }}>
        {!bannerDismissed && <BetaBanner onDismiss={dismissBanner} />}
        <Nav onShowLogin={onShowLogin} onScrollTo={scrollTo} bannerVisible={!bannerDismissed} />

        <Hero onScrollTo={scrollTo} />
        <LogoBar />
        <FeaturesGrid />
        <HowItWorks />
        <ForEveryRole />
        <SeeItInAction />
        <WhyExcel />
        <HowWeCompare />
        <SocialProof />
        <Pricing />
        <Faq />
        <FoundersCircle />
        <Footer onScrollTo={scrollTo} />
      </div>
    </>
  );
}
