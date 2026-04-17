import { useState, useMemo, useCallback, useRef } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
import { Dashboard } from './Dashboard';
import { CostModel } from './CostModel';
import { Assumptions } from './Assumptions';
import { COLORS, FONTS } from '../data/constants';
import { fK } from '../utils/format';
import { DEMO_GLOBALS, DEMO_ITEMS, DEMO_SCENARIO, DEMO_PROJECT_META } from '../data/demoData';

const ACCENT = '#B89030';
const HEADER = '#222222';
const GOLD   = '#B89030';

const CSI_ORDER = [
  'Substructure', 'Shell', 'Interiors', 'Services', 'Equipment',
  'Special Construction', 'Sitework', 'General Conditions', 'Overhead & Fee', 'Contingency',
];

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

export default function DemoProject() {
  const { mob } = useWindowSize();
  const [view, setView] = useState('dashboard');
  const [signUpToast, setSignUpToast] = useState(false);
  const toastTimerRef = useRef(null);

  // Demo data — static, no Supabase
  const items = DEMO_ITEMS;
  const globals = DEMO_GLOBALS;
  const activeItems = useMemo(() => items.filter(i => !i.isArchived), []);
  const totals = useMemo(() => CE.projectTotals(items, globals), []);
  const bsf = globals.buildingSF;

  const catGroups = useMemo(() => {
    const g = {};
    activeItems.forEach(i => {
      if (!g[i.category]) g[i.category] = [];
      g[i.category].push(i);
    });
    const allCats = Object.keys(g);
    const ordered = [
      ...CSI_ORDER.filter(c => g[c]),
      ...allCats.filter(c => !CSI_ORDER.includes(c)),
    ];
    return ordered.map(c => ({
      c, items: g[c], t: CE.categoryTotals(items, globals, c),
    }));
  }, [activeItems]);

  // Show "sign up to edit" toast when user tries to mutate anything
  const showSignUpToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSignUpToast(true);
    toastTimerRef.current = setTimeout(() => setSignUpToast(false), 4000);
  }, []);

  const demoNoOp = useCallback(() => { showSignUpToast(); }, [showSignUpToast]);
  const demoNoOpAsync = useCallback(() => { showSignUpToast(); return Promise.resolve({}); }, [showSignUpToast]);

  const viewProps = {
    items, globals, activeItems, totals, catGroups, bsf,
    updateItem: demoNoOp,
    createItem: demoNoOpAsync,
    reorderItems: demoNoOpAsync,
    updateGlobal: demoNoOp,
    scenarios: [DEMO_SCENARIO],
    active: DEMO_SCENARIO,
    aiAdvice: {},
    aiLoading: new Set(),
    askAI: demoNoOp,
    applyAI: demoNoOp,
    canEdit: false,
  };

  const tabs = [
    ['dashboard', 'DASHBOARD'],
    ['estimate', 'COST MODEL'],
    ['assumptions', 'ASSUMPTIONS'],
  ];

  const handleSignUp = () => {
    window.location.href = '/';
  };

  return (
    <div style={{ fontFamily: FONTS.body, background: COLORS.bg, color: COLORS.dg, minHeight: '100vh' }}>

      {/* ── Demo banner ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(90deg, #2a1f00 0%, #3d2c00 50%, #2a1f00 100%)',
        borderBottom: `2px solid ${GOLD}`,
        padding: mob ? '10px 16px' : '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>👁</span>
          <span style={{
            fontFamily: "'Figtree', sans-serif", fontSize: mob ? 12 : 13,
            color: 'rgba(255,255,255,0.85)', lineHeight: 1.4,
          }}>
            <strong style={{ color: '#FFC425' }}>You're viewing a demo project.</strong>
            {!mob && ' Sign up free to create your own estimate in 60 seconds.'}
          </span>
        </div>
        <button
          onClick={handleSignUp}
          style={{
            background: GOLD, color: '#fff', border: 'none', borderRadius: 8,
            padding: mob ? '8px 16px' : '9px 20px',
            fontFamily: "'Archivo', sans-serif", fontWeight: 700,
            fontSize: mob ? 12 : 13, cursor: 'pointer', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Sign Up Free →
        </button>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        background: HEADER,
        padding: mob ? '8px 12px' : '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: mob ? 48 : 52, flexWrap: 'wrap', gap: 4,
      }}>
        {/* Left: logo + project name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 8 : 12 }}>
          <a
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <CrosshairMark size={28} />
            <span style={{
              color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800,
              fontSize: mob ? 12 : 14, letterSpacing: 2,
            }}>
              COSTDECK
            </span>
          </a>
          {!mob && (
            <span style={{ fontSize: 11, color: '#666', borderLeft: '1px solid #333', paddingLeft: 12 }}>
              {DEMO_PROJECT_META.name}
            </span>
          )}
          {/* Read-only badge */}
          <span style={{
            background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 4,
            padding: '2px 7px', fontSize: 9, color: '#888',
            fontFamily: "'Archivo', sans-serif", fontWeight: 600, letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>
            Demo
          </span>
        </div>

        {/* Right: total + sign up CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 8 : 12 }}>
          {!mob && (
            <span style={{
              color: ACCENT, fontSize: 13, fontFamily: FONTS.heading, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fK(totals.full.m.tot)}
            </span>
          )}
          <button
            onClick={handleSignUp}
            style={{
              background: GOLD, color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 14px', fontFamily: "'Archivo', sans-serif", fontWeight: 700,
              fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Sign Up Free
          </button>
        </div>
      </div>

      {/* ── Tab nav ──────────────────────────────────────────────────────── */}
      <div style={{
        background: COLORS.wh, borderBottom: `1px solid ${COLORS.bd}`,
        display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        paddingLeft: mob ? 8 : 20,
      }}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              padding: mob ? '10px 12px' : '10px 18px',
              fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600,
              background: 'transparent',
              color: view === id ? COLORS.dg : COLORS.mg,
              border: 'none',
              borderBottom: view === id ? `3px solid ${ACCENT}` : '3px solid transparent',
              cursor: 'pointer', letterSpacing: 1.5, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
        {/* Compare & Audit shown as locked */}
        {[['compare', 'COMPARE'], ['audit', 'AUDIT']].map(([id, label]) => (
          <button
            key={id}
            onClick={handleSignUp}
            title="Sign up to unlock"
            style={{
              padding: mob ? '10px 12px' : '10px 18px',
              fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600,
              background: 'transparent', color: '#ccc', border: 'none',
              borderBottom: '3px solid transparent',
              cursor: 'pointer', letterSpacing: 1.5, whiteSpace: 'nowrap', flexShrink: 0,
              opacity: 0.5,
            }}
          >
            {label} 🔒
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ padding: mob ? 12 : 18 }}>
        {view === 'dashboard' && <Dashboard {...viewProps} />}
        {view === 'estimate' && (
          <CostModel
            {...viewProps}
            registerUndo={undefined}
          />
        )}
        {view === 'assumptions' && (
          <Assumptions {...viewProps} scenarioName="Baseline" />
        )}
      </div>

      {/* ── Sign-up-to-edit toast ─────────────────────────────────────────── */}
      {signUpToast && (
        <div style={{
          position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', border: `1px solid ${GOLD}`,
          borderRadius: 10, padding: '12px 18px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          fontFamily: "'Figtree', sans-serif",
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            Changes aren't saved in demo mode
          </span>
          <button
            onClick={handleSignUp}
            style={{
              background: GOLD, color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 14px', fontFamily: "'Archivo', sans-serif", fontWeight: 700,
              fontSize: 12, cursor: 'pointer', flexShrink: 0,
            }}
          >
            Sign Up Free
          </button>
          <button
            onClick={() => setSignUpToast(false)}
            style={{
              background: 'none', border: 'none', color: '#666',
              fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
