import { useState, useEffect, useRef } from 'react';

const G      = '#222222';
const GOLD   = '#B89030';
const GOLD_S = '#FBF5E8';
const BG     = '#F9F9F8';
const WH     = '#FFFFFF';

// ── Global styles ─────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800;900&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
html { scroll-behavior: smooth; }
.lp-fade { opacity: 0; transform: translateY(22px); transition: opacity 0.6s ease, transform 0.6s ease; }
.lp-fade.lp-vis { opacity: 1; transform: translateY(0); }
.lp-link { cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; transition: color 0.15s; }
.lp-link:hover { color: ${GOLD} !important; }
.lp-feat-card { transition: transform 0.2s, box-shadow 0.2s; }
.lp-feat-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 52px rgba(0,0,0,0.12) !important; }
.lp-step-num { transition: background 0.2s, color 0.2s; }
.lp-step-num:hover { background: ${GOLD} !important; color: #fff !important; }
.lp-btn-gold  { transition: background 0.15s, transform 0.1s; cursor: pointer; }
.lp-btn-gold:hover  { background: #9a7020 !important; }
.lp-btn-gold:active { transform: scale(0.97); }
.lp-btn-outline { transition: border-color 0.15s, color 0.15s; cursor: pointer; }
.lp-btn-outline:hover { border-color: ${GOLD} !important; color: ${GOLD} !important; }
.lp-price-card { transition: transform 0.2s, box-shadow 0.2s; }
.lp-price-card:hover { transform: translateY(-5px); }
.lp-inp:focus { outline: none; border-color: ${GOLD} !important; box-shadow: 0 0 0 3px rgba(184,144,48,0.18) !important; }
@media (max-width: 1100px) { .lp-4col { grid-template-columns: 1fr 1fr !important; } }
@media (max-width: 768px) {
  .lp-nav-mid { display: none !important; }
  .lp-nav-si  { display: none !important; }
  .lp-4col, .lp-3col { grid-template-columns: 1fr !important; }
  .lp-hl   { font-size: 34px !important; line-height: 1.2 !important; }
  .lp-ctas { flex-direction: column !important; }
  .lp-ctas > * { width: 100% !important; text-align: center !important; box-sizing: border-box; }
  .lp-mock { display: none !important; }
  .lp-mob-hide { display: none !important; }
  .lp-pad { padding-left: 24px !important; padding-right: 24px !important; }
}
@media (max-width: 480px) {
  .lp-hl  { font-size: 26px !important; }
  .lp-pad { padding-left: 16px !important; padding-right: 16px !important; }
}
`;

// ── Utilities ─────────────────────────────────────────────────────────────────

function FadeIn({ delay = 0, children, style, className }) {
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
    <div
      ref={ref}
      className={['lp-fade', className].filter(Boolean).join(' ')}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}
    >
      {children}
    </div>
  );
}

const W = { maxWidth: 1140, margin: '0 auto' };

// ── Small components ──────────────────────────────────────────────────────────

function CrosshairMark({ size = 36 }) {
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

function GoldCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="10" cy="10" r="10" fill={GOLD_S} />
      <path d="M6 10l3 3 5-6" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GreenCheck() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="10" cy="10" r="10" fill="#dcfce7" />
      <path d="M6 10l3 3 5-6" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Mock dashboard ─────────────────────────────────────────────────────────────

function MockDashboard() {
  const cats = [
    { name: 'Shell',        w: 100, amt: '$28.4M', pct: 29 },
    { name: 'Interiors',    w: 68,  amt: '$19.3M', pct: 20 },
    { name: 'Services',     w: 57,  amt: '$16.4M', pct: 17 },
    { name: 'Substructure', w: 34,  amt: '$9.7M',  pct: 10 },
    { name: 'Sitework',     w: 25,  amt: '$7.2M',  pct: 7  },
  ];
  const drivers = [
    { n: 'Structural Steel',       amt: '$12.4M', pct: 13 },
    { n: 'Mechanical / HVAC',      amt: '$10.8M', pct: 11 },
    { n: 'Exterior Glazing',       amt: '$9.2M',  pct: 10 },
    { n: 'Concrete & Foundations', amt: '$8.1M',  pct: 8  },
    { n: 'Electrical Rough-In',    amt: '$6.9M',  pct: 7  },
  ];
  return (
    <div className="lp-mock" style={{
      maxWidth: 860, margin: '0 auto',
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
      userSelect: 'none', pointerEvents: 'none',
    }}>
      {/* Browser chrome */}
      <div style={{ background: '#141414', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e1e', borderRadius: 5, height: 23, width: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: '#555', fontFamily: "'Figtree', sans-serif" }}>costdeck.ai/projects/civic-center-library</span>
          </div>
        </div>
      </div>

      {/* App header */}
      <div style={{ background: G, padding: '0 16px', height: 43, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: GOLD, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: 2 }}>COSTDECK</span>
          <span style={{ fontSize: 10, color: '#555', borderLeft: '1px solid #2e2e2e', paddingLeft: 10, fontFamily: "'Figtree', sans-serif" }}>Civic Center Library Renovation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#2d2d2d', border: '1px solid #3a3a3a', borderRadius: 5, padding: '3px 8px', fontSize: 9, color: GOLD, fontFamily: "'Archivo', sans-serif", fontWeight: 600 }}>Baseline ▾</div>
          <span style={{ color: GOLD, fontSize: 12, fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>$96.5M</span>
          <div style={{ background: '#2d2d2d', border: '1px solid #3a3a3a', borderRadius: 5, padding: '3px 8px', fontSize: 9, color: '#777', fontFamily: "'Figtree', sans-serif" }}>Team</div>
          <div style={{ background: '#2d2d2d', border: '1px solid #3a3a3a', borderRadius: 5, padding: '3px 8px', fontSize: 9, color: '#777', fontFamily: "'Figtree', sans-serif" }}>Account ▾</div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ background: WH, borderBottom: '1px solid #eee', display: 'flex', padding: '0 16px' }}>
        {['DASHBOARD','COST MODEL','COMPARE','ASSUMPTIONS','AUDIT'].map((t, i) => (
          <div key={t} style={{ padding: '8px 12px', fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 600, letterSpacing: 1, color: i === 0 ? G : '#ccc', borderBottom: i === 0 ? `2px solid ${GOLD}` : '2px solid transparent' }}>{t}</div>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: BG, padding: '14px 16px 16px' }}>
        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'LOW ESTIMATE',  val: '$66.6M',  sf: '$682 / SF',   c: '#4E5BA8' },
            { label: 'MID ESTIMATE',  val: '$96.5M',  sf: '$989 / SF',   c: GOLD, border: `1.5px solid ${GOLD}66` },
            { label: 'HIGH ESTIMATE', val: '$138.5M', sf: '$1,420 / SF', c: '#D83C31' },
          ].map(card => (
            <div key={card.label} style={{ background: WH, border: card.border || '1px solid #eeeeea', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#bbb', letterSpacing: 0.8, marginBottom: 5, textTransform: 'uppercase' }}>{card.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 19, color: card.c, lineHeight: 1 }}>{card.val}</div>
              <div style={{ fontSize: 9, color: '#bbb', fontFamily: "'Figtree', sans-serif", marginTop: 4 }}>{card.sf}</div>
            </div>
          ))}
        </div>

        {/* Chart + drivers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 10 }}>
          <div style={{ background: WH, border: '1px solid #eeeeea', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#333', letterSpacing: 0.7, marginBottom: 10, textTransform: 'uppercase' }}>Cost by Category</div>
            {cats.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 68, fontSize: 9, color: '#666', fontFamily: "'Figtree', sans-serif", flexShrink: 0 }}>{c.name}</div>
                <div style={{ flex: 1, height: 7, background: '#f0eeea', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.w}%`, background: GOLD, borderRadius: 3, opacity: 0.8 }} />
                </div>
                <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: '#555', width: 38, textAlign: 'right', flexShrink: 0 }}>{c.amt}</div>
                <div style={{ fontSize: 8, color: '#bbb', width: 22, textAlign: 'right', flexShrink: 0 }}>{c.pct}%</div>
              </div>
            ))}
          </div>
          <div style={{ background: WH, border: '1px solid #eeeeea', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#333', letterSpacing: 0.7, marginBottom: 8, textTransform: 'uppercase' }}>Top Cost Drivers</div>
            {drivers.map((d, i) => (
              <div key={d.n} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: i < drivers.length - 1 ? '1px solid #f5f5f3' : 'none' }}>
                <span style={{ fontSize: 8, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: '#ddd', width: 12, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 9, color: '#333', fontFamily: "'Figtree', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.n}</span>
                <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: '#666', fontWeight: 500, flexShrink: 0 }}>{d.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────────

function Nav({ onShowLogin, scrollTo }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      height: 64,
      background: 'rgba(34,34,34,0.93)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center',
      padding: '0 32px',
    }}>
      {/* Logo */}
      <button
        className="lp-link"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ display: 'flex', alignItems: 'center', gap: 10, color: WH }}
      >
        <CrosshairMark size={34} />
        <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 2, color: WH }}>
          COST<span style={{ color: GOLD }}>DECK</span>
        </span>
      </button>

      {/* Center links — absolutely centered */}
      <div className="lp-nav-mid" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 32 }}>
        {[['Features', 'features'], ['How It Works', 'how-it-works'], ['Pricing', 'pricing']].map(([label, id]) => (
          <button key={id} className="lp-link"
            onClick={() => scrollTo(id)}
            style={{ color: 'rgba(255,255,255,0.68)', fontFamily: "'Figtree', sans-serif", fontSize: 14, fontWeight: 500 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="lp-link lp-nav-si"
          onClick={() => { window.location.href = '/demo'; }}
          style={{ color: GOLD, fontFamily: "'Figtree', sans-serif", fontSize: 14, fontWeight: 600 }}
        >
          Try Live Demo
        </button>
        <button className="lp-link lp-nav-si" onClick={onShowLogin}
          style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Figtree', sans-serif", fontSize: 14, fontWeight: 500 }}
        >
          Sign In
        </button>
        <button className="lp-btn-gold"
          onClick={() => scrollTo('founders-circle')}
          style={{ background: GOLD, color: WH, border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 0.3, whiteSpace: 'nowrap' }}
        >
          Join Founder's Circle
        </button>
      </div>
    </nav>
  );
}

// ── Feature icons ──────────────────────────────────────────────────────────────

function IconAI() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  );
}
function IconBench() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      <path d="M2 20h20"/>
    </svg>
  );
}
function IconTrade() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconReport() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function LandingPage({ onShowLogin }) {
  const [fcEmail, setFcEmail] = useState('');
  const [fcSubmitting, setFcSubmitting] = useState(false);
  const [fcSuccess, setFcSuccess] = useState(false);
  const [fcError, setFcError] = useState(null);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitFC = async (e) => {
    e.preventDefault();
    setFcSubmitting(true);
    setFcError(null);
    try {
      const res = await fetch('/api/join-founders-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fcEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      setFcSuccess(true);
    } catch (err) {
      setFcError(err.message);
    } finally {
      setFcSubmitting(false);
    }
  };

  const features = [
    {
      icon: <IconAI />,
      title: 'AI project generation',
      desc: 'Describe your project in plain English. Get a full CSI-formatted estimate with 100–200 line items, 3-point pricing, and calibrated quantities in under 60 seconds.',
    },
    {
      icon: <IconBench />,
      title: 'Market benchmarking',
      desc: 'Every line item audited against current market data. Outlier dashboard flags items that are too high or too low, with an overall confidence score.',
    },
    {
      icon: <IconTrade />,
      title: 'Trade partner bidding',
      desc: 'Create bid packages, invite subs, collect L/M/H pricing and qualifications. Compare bids side-by-side and apply sub pricing with one click.',
    },
    {
      icon: <IconReport />,
      title: 'Reports & export',
      desc: 'One-click branded PDF reports. Excel import and export. Scenario comparison. Snapshot versioning to track your estimate over time.',
    },
  ];

  const steps = [
    { n: '01', title: 'Describe', desc: 'Enter your project details — building type, size, location, systems. Or just describe it in plain English.' },
    { n: '02', title: 'Generate', desc: 'AI creates 100–200 calibrated line items across all CSI divisions with 3-point cost estimates in under 60 seconds.' },
    { n: '03', title: 'Refine',   desc: 'Edit quantities, adjust pricing, run scenarios, invite your team, collect sub bids, and export polished reports.' },
  ];

  const freeTier = ['1 project', '1 user', '5 AI generations / mo', 'Basic dashboard'];
  const proTier  = ['Unlimited projects', '5 users', 'Unlimited AI generations', 'PDF & Excel export', 'Trade partner bidding', 'All integrations'];
  const teamTier = ['Everything in Pro', 'Unlimited users', 'White-label reports', 'Portfolio dashboard', 'Historical benchmarks', 'API access'];

  const fcBenefits = [
    '60 days of Pro free',
    'Locked-in founder pricing — 50% off forever',
    'Direct access to the founder for feature requests',
    'Your company logo on the CostDeck "Built With" page',
    'Priority access to new features and integrations',
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ fontFamily: "'Figtree', sans-serif", background: BG, overflowX: 'hidden' }}>
        <Nav onShowLogin={onShowLogin} scrollTo={scrollTo} />

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section style={{
          background: G,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          paddingTop: 144, paddingBottom: 80,
        }}>
          <div className="lp-pad" style={{ ...W, textAlign: 'center' }}>
            {/* Pill badge */}
            <FadeIn>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${GOLD}1A`, border: `1px solid ${GOLD}44`, borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontFamily: "'Archivo', sans-serif", fontWeight: 600, color: GOLD, letterSpacing: 0.5 }}>
                  Built by a preconstruction professional
                </span>
              </div>
            </FadeIn>

            {/* Headline */}
            <FadeIn delay={80}>
              <h1 className="lp-hl" style={{
                fontFamily: "'Archivo', sans-serif", fontWeight: 900,
                fontSize: 60, lineHeight: 1.1, color: WH,
                margin: '0 auto 22px', maxWidth: 760,
              }}>
                AI-powered{' '}
                <span style={{ color: GOLD }}>preconstruction</span>
                {' '}estimating
              </h1>
            </FadeIn>

            {/* Subtext */}
            <FadeIn delay={160}>
              <p style={{
                fontFamily: "'Figtree', sans-serif", fontSize: 19, lineHeight: 1.7,
                color: 'rgba(255,255,255,0.6)', maxWidth: 620, margin: '0 auto 36px',
              }}>
                Generate a 200-line-item cost model from a project description in 60 seconds.
                Audit every line against market benchmarks. Collaborate with your entire team.
              </p>
            </FadeIn>

            {/* CTAs */}
            <FadeIn delay={240}>
              <div className="lp-ctas" style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 64 }}>
                <button
                  className="lp-btn-gold"
                  onClick={() => scrollTo('founders-circle')}
                  style={{ background: GOLD, color: WH, border: 'none', borderRadius: 10, padding: '14px 28px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15 }}
                >
                  Join Founder's Circle
                </button>
                <button
                  className="lp-btn-outline"
                  onClick={() => { window.location.href = '/demo'; }}
                  style={{ background: 'transparent', color: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '14px 28px', fontFamily: "'Archivo', sans-serif", fontWeight: 600, fontSize: 15 }}
                >
                  Try Live Demo
                </button>
              </div>
            </FadeIn>

            {/* Mock dashboard */}
            <FadeIn delay={320}>
              <MockDashboard />
            </FadeIn>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────────── */}
        <section id="features" style={{ background: BG, padding: '100px 0' }}>
          <div className="lp-pad" style={W}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: 56 }}>
                <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 38, color: G, marginBottom: 14 }}>
                  Everything preconstruction needs
                </h2>
                <p style={{ fontSize: 17, color: '#666', maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
                  From first look to GMP, CostDeck handles the full estimating lifecycle.
                </p>
              </div>
            </FadeIn>

            <div className="lp-4col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20 }}>
              {features.map((f, i) => (
                <FadeIn key={f.title} delay={i * 80}>
                  <div className="lp-feat-card" style={{ background: WH, border: '1px solid #e8e8e4', borderRadius: 14, padding: '28px 24px', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: GOLD_S, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                      {f.icon}
                    </div>
                    <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: G, marginBottom: 10, lineHeight: 1.3 }}>{f.title}</h3>
                    <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────────────────────────── */}
        <section id="how-it-works" style={{ background: WH, padding: '100px 0' }}>
          <div className="lp-pad" style={W}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 38, color: G, marginBottom: 14 }}>
                  Three steps to a complete estimate
                </h2>
              </div>
            </FadeIn>

            <div className="lp-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40 }}>
              {steps.map((s, i) => (
                <FadeIn key={s.n} delay={i * 100}>
                  <div style={{ textAlign: 'center', padding: '0 12px' }}>
                    <div className="lp-step-num" style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: GOLD_S, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', margin: '0 auto 22px',
                    }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 22, color: GOLD }}>
                        {s.n}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 20, color: G, marginBottom: 12 }}>
                      {s.title}
                    </h3>
                    <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────────────── */}
        <section id="pricing" style={{ background: BG, padding: '100px 0' }}>
          <div className="lp-pad" style={W}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: 56 }}>
                <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 38, color: G, marginBottom: 14 }}>
                  Simple, transparent pricing
                </h2>
                <p style={{ fontSize: 17, color: '#666', margin: 0 }}>Start free. Upgrade when you're ready.</p>
              </div>
            </FadeIn>

            <div className="lp-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.08fr 1fr', gap: 20, alignItems: 'start' }}>
              {/* Free */}
              <FadeIn delay={0}>
                <div className="lp-price-card" style={{ background: WH, border: '1px solid #e8e8e4', borderRadius: 16, padding: '32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: G, marginBottom: 6 }}>Free</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 40, color: G }}>$0</span>
                    <span style={{ fontSize: 14, color: '#aaa' }}>/ forever</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                    {freeTier.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <GreenCheck />
                        <span style={{ fontSize: 14, color: '#444' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="lp-btn-outline"
                    onClick={onShowLogin}
                    style={{ width: '100%', background: 'transparent', color: G, border: '1.5px solid #ddd', borderRadius: 9, padding: '12px 0', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14 }}
                  >
                    Get Started
                  </button>
                </div>
              </FadeIn>

              {/* Pro — featured */}
              <FadeIn delay={100}>
                <div className="lp-price-card" style={{ background: WH, border: `2px solid ${GOLD}`, borderRadius: 16, padding: '32px 28px', boxShadow: `0 8px 40px rgba(184,144,48,0.15)`, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: GOLD, color: WH, fontSize: 10, fontWeight: 700, fontFamily: "'Archivo', sans-serif", letterSpacing: 0.8, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: G, marginBottom: 6 }}>Pro</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, color: '#bbb', textDecoration: 'line-through', fontFamily: "'JetBrains Mono', monospace" }}>$99</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 40, color: G }}>$49</span>
                    <span style={{ fontSize: 14, color: '#aaa' }}>/ mo</span>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ background: GOLD, color: WH, fontSize: 9, fontWeight: 700, fontFamily: "'Archivo', sans-serif", letterSpacing: 0.5, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>Founder's price</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                    {proTier.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <GreenCheck />
                        <span style={{ fontSize: 14, color: '#444' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="lp-btn-gold"
                    onClick={() => scrollTo('founders-circle')}
                    style={{ width: '100%', background: GOLD, color: WH, border: 'none', borderRadius: 9, padding: '13px 0', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14 }}
                  >
                    Join Founder's Circle
                  </button>
                </div>
              </FadeIn>

              {/* Team */}
              <FadeIn delay={200}>
                <div className="lp-price-card" style={{ background: WH, border: '1px solid #e8e8e4', borderRadius: 16, padding: '32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: G, marginBottom: 6 }}>Team</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, color: '#bbb', textDecoration: 'line-through', fontFamily: "'JetBrains Mono', monospace" }}>$299</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 40, color: G }}>$149</span>
                    <span style={{ fontSize: 14, color: '#aaa' }}>/ mo</span>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ background: GOLD, color: WH, fontSize: 9, fontWeight: 700, fontFamily: "'Archivo', sans-serif", letterSpacing: 0.5, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>Founder's price</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                    {teamTier.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <GreenCheck />
                        <span style={{ fontSize: 14, color: '#444' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="lp-btn-gold"
                    onClick={() => scrollTo('founders-circle')}
                    style={{ width: '100%', background: GOLD, color: WH, border: 'none', borderRadius: 9, padding: '12px 0', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14 }}
                  >
                    Join Founder's Circle
                  </button>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── Founder's Circle ───────────────────────────────────────────────── */}
        <section id="founders-circle" style={{ background: G, borderTop: `3px solid ${GOLD}`, padding: '100px 0' }}>
          <div className="lp-pad" style={{ ...W, maxWidth: 680 }}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 38, color: WH, marginBottom: 14 }}>
                  Join the Founder's Circle
                </h2>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
                  The first 50 users get exclusive founding member benefits — locked in for life.
                </p>
              </div>
            </FadeIn>

            {/* Benefits */}
            <FadeIn delay={80}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
                {fcBenefits.map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <GoldCheck />
                    <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Progress indicator */}
            <FadeIn delay={160}>
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontFamily: "'Figtree', sans-serif", color: 'rgba(255,255,255,0.5)' }}>12 of 50 spots claimed</span>
                  <span style={{ fontSize: 13, fontFamily: "'Archivo', sans-serif", fontWeight: 700, color: GOLD }}>24%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '24%', background: GOLD, borderRadius: 3 }} />
                </div>
              </div>
            </FadeIn>

            {/* Form */}
            <FadeIn delay={220}>
              {fcSuccess ? (
                <div style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
                  <p style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 17, color: '#4ade80', marginBottom: 8 }}>
                    You're in the Founder's Circle!
                  </p>
                  <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                    We'll email you when CostDeck is ready.
                  </p>
                </div>
              ) : (
                <form onSubmit={submitFC}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="email"
                      className="lp-inp"
                      value={fcEmail}
                      onChange={e => setFcEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)',
                        borderRadius: 10, padding: '14px 16px',
                        fontFamily: "'Figtree', sans-serif", fontSize: 15, color: WH,
                      }}
                    />
                    <button
                      type="submit"
                      className="lp-btn-gold"
                      disabled={fcSubmitting || !fcEmail.trim()}
                      style={{
                        background: fcSubmitting || !fcEmail.trim() ? '#7a6024' : GOLD,
                        color: WH, border: 'none', borderRadius: 10,
                        padding: '14px 24px', fontFamily: "'Archivo', sans-serif",
                        fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
                        cursor: fcSubmitting || !fcEmail.trim() ? 'default' : 'pointer',
                      }}
                    >
                      {fcSubmitting ? 'Joining…' : 'Claim Your Spot'}
                    </button>
                  </div>
                  {fcError && (
                    <p style={{ marginTop: 10, fontSize: 13, color: '#f87171', fontFamily: "'Figtree', sans-serif" }}>{fcError}</p>
                  )}
                  <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Figtree', sans-serif" }}>
                    No credit card required. Cancel anytime.
                  </p>
                </form>
              )}
            </FadeIn>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer style={{ background: '#111111', padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            <CrosshairMark size={30} />
            <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: 2, color: GOLD }}>
              COSTDECK
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: "'Figtree', sans-serif", marginBottom: 8 }}>
            Built by a preconstruction professional, for preconstruction professionals.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: "'Figtree', sans-serif", margin: 0 }}>
            © 2026 CostDeck. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
