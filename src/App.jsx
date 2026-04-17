import { useState, useMemo, useCallback } from 'react';
import { useAuth } from './supabase/useAuth';
import { useWindowSize } from './hooks/useWindowSize';
import { useProjectData } from './hooks/useProjectData';
import * as CE from './engine/CostEngine';
import { fetchAIAdvice } from './engine/AIAdvisor';
const CSI_ORDER = [
  'Substructure', 'Shell', 'Interiors', 'Services', 'Equipment',
  'Special Construction', 'Sitework', 'General Conditions', 'Overhead & Fee', 'Contingency',
];
import { COLORS, FONTS, SCENARIO_TYPES } from './data/constants';
import { fK } from './utils/format';
import { Dashboard } from './components/Dashboard';
import { CostModel } from './components/CostModel';
import { Compare } from './components/Compare';
import { Assumptions } from './components/Assumptions';
import { AuditLog } from './components/AuditLog';
import LoginPage from './components/LoginPage';
import ProjectDashboard from './components/ProjectDashboard';
import AIGenerator from './components/AIGenerator';

const ACCENT = '#B89030';
const HEADER = '#222222';

export default function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [activeProject, setActiveProject] = useState(null);
  const [generatingProject, setGeneratingProject] = useState(null);

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F9F9F8',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: HEADER, height: 56, padding: '0 28px',
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{
            color: ACCENT, fontFamily: "'Archivo', sans-serif",
            fontWeight: 800, fontSize: 18, letterSpacing: 2,
          }}>
            COSTDECK
          </span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 14,
        }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} />;
  }

  if (generatingProject && !activeProject) {
    return (
      <AIGenerator
        project={generatingProject}
        onSave={() => { setActiveProject(generatingProject); setGeneratingProject(null); }}
        onSkip={() => { setActiveProject(generatingProject); setGeneratingProject(null); }}
        onSignOut={signOut}
      />
    );
  }

  if (!activeProject) {
    return (
      <ProjectDashboard
        user={user}
        onSignOut={signOut}
        onSelectProject={setActiveProject}
        onProjectCreated={(p) => { setGeneratingProject(p); }}
      />
    );
  }

  return (
    <CostModelApp
      user={user}
      project={activeProject}
      onBack={() => setActiveProject(null)}
      onSignOut={signOut}
    />
  );
}

function CostModelApp({ user, project, onBack, onSignOut }) {
  const { mob } = useWindowSize();
  const {
    scenarios, active, activeId, setActiveId,
    audit, loading, error, saveError, setSaveError,
    updateItem, updateGlobal, addScenario, deleteScenario,
  } = useProjectData(project.id);

  const [view, setView] = useState('dashboard');
  const [showNewScen, setShowNewScen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [aiAdvice, setAiAdvice] = useState({});
  const [aiLoading, setAiLoading] = useState(new Set());

  const { items, globals } = active;
  const totals = useMemo(() => CE.projectTotals(items, globals), [items, globals]);
  const activeItems = useMemo(() => items.filter(i => !i.isArchived), [items]);
  const bsf = globals.buildingSF || 97500;

  const catGroups = useMemo(() => {
    const g = {};
    activeItems.forEach(i => {
      if (!g[i.category]) g[i.category] = [];
      g[i.category].push(i);
    });
    const allCats = Object.keys(g);
    console.log('[App] Loaded categories:', allCats);
    const ordered = [
      ...CSI_ORDER.filter(c => g[c]),
      ...allCats.filter(c => !CSI_ORDER.includes(c)),
    ];
    return ordered.map(c => ({
      c, items: g[c], t: CE.categoryTotals(items, globals, c),
    }));
  }, [activeItems, items, globals]);

  const askAI = useCallback(async (item) => {
    setAiLoading(prev => new Set([...prev, item.id]));
    try {
      const result = await fetchAIAdvice(item);
      setAiAdvice(prev => ({ ...prev, [item.id]: result }));
    } catch (err) {
      setAiAdvice(prev => ({ ...prev, [item.id]: { error: String(err.message || err) } }));
    } finally {
      setAiLoading(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }, []);

  const applyAI = useCallback((itemId, advice) => {
    updateItem(itemId, 'unitCostLow', advice.low);
    updateItem(itemId, 'unitCostMid', advice.mid);
    updateItem(itemId, 'unitCostHigh', advice.high);
  }, [updateItem]);

  const viewProps = {
    items, globals, activeItems, totals, catGroups, bsf,
    updateItem, updateGlobal, scenarios, active,
    aiAdvice, aiLoading, askAI, applyAI,
  };

  const tabs = [
    ['dashboard', 'DASHBOARD'],
    ['estimate', 'COST MODEL'],
    ['compare', 'COMPARE'],
    ['assumptions', 'ASSUMPTIONS'],
    ['audit', 'AUDIT'],
  ];

  // Loading screen while scenarios + line items fetch
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: HEADER, height: 52, padding: '0 20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 2 }}>COSTDECK</span>
          <span style={{ color: '#555', fontSize: 11, marginLeft: 12 }}>{project.name}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 14 }}>Loading project data…</div>
          <div style={{ width: 200, height: 3, background: '#eee', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '60%', background: ACCENT, borderRadius: 2, animation: 'pulse 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  // Hard error (e.g. network failure on load)
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: HEADER, height: 52, padding: '0 20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 2 }}>COSTDECK</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #fdd', borderRadius: 12, padding: 32, maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 8 }}>Failed to load project</div>
            <div style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14, marginBottom: 20 }}>{error}</div>
            <button onClick={onBack} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Back to Projects</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONTS.body, background: COLORS.bg, color: COLORS.dg, minHeight: '100vh' }}>
      {/* Save error banner */}
      {saveError && (
        <div style={{
          background: '#fef2f2', borderBottom: '1px solid #fca5a5',
          padding: '8px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#991b1b' }}>
            ⚠ {saveError}
          </span>
          <button onClick={() => setSaveError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}
      {/* Header */}
      <div style={{
        background: HEADER, padding: mob ? '8px 12px' : '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: mob ? 48 : 52, flexWrap: 'wrap', gap: 4,
      }}>
        {/* Left: back + project name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 8 : 12 }}>
          <button
            onClick={onBack}
            title="Back to Projects"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', fontSize: 18, padding: '0 4px 0 0',
              lineHeight: 1, display: 'flex', alignItems: 'center',
            }}
          >
            ‹
          </button>
          <span style={{
            color: ACCENT, fontFamily: "'Archivo', sans-serif",
            fontWeight: 800, fontSize: mob ? 12 : 14, letterSpacing: 2,
          }}>
            COSTDECK
          </span>
          {!mob && (
            <span style={{
              fontSize: 11, color: '#666',
              borderLeft: '1px solid #333', paddingLeft: 12,
            }}>
              {project.name}
            </span>
          )}
        </div>

        {/* Right: scenario picker + total + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 6 : 10 }}>
          <select
            value={activeId}
            onChange={e => setActiveId(e.target.value)}
            style={{
              background: '#333', border: '1px solid #444',
              borderRadius: 6, color: ACCENT, padding: '6px 10px',
              fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600,
            }}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id} style={{ color: COLORS.dg, background: '#fff' }}>
                {s.name}
              </option>
            ))}
          </select>

          {scenarios.length < 5 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNewScen(!showNewScen)}
                style={{
                  background: ACCENT, color: '#fff', border: 'none',
                  borderRadius: 6, padding: '6px 10px', fontSize: 11,
                  fontFamily: FONTS.heading, fontWeight: 700, cursor: 'pointer',
                }}
              >
                + Scenario
              </button>
              {showNewScen && (
                <div style={{
                  position: 'absolute', right: 0, top: 34, background: COLORS.wh,
                  border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: 4,
                  zIndex: 100, minWidth: 140, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                }}>
                  {SCENARIO_TYPES.filter(t => !scenarios.find(s => s.name === t)).map(t => (
                    <button key={t} onClick={() => { addScenario(t); setShowNewScen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        background: 'transparent', border: 'none', padding: '8px 12px',
                        fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer',
                        color: COLORS.dg, borderRadius: 4,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!mob && (
            <span style={{
              color: ACCENT, fontSize: 13, fontFamily: FONTS.heading,
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            }}>
              {fK(totals.full.m.tot)}
            </span>
          )}

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              style={{
                background: '#333', border: '1px solid #444',
                borderRadius: 6, padding: '5px 10px',
                fontFamily: "'Figtree', sans-serif", fontSize: 11,
                color: '#aaa', cursor: 'pointer',
              }}
            >
              {user.email?.split('@')[0] || 'Account'}
            </button>
            {showUserMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 34, background: COLORS.wh,
                border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: 4,
                zIndex: 100, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
              }}>
                <div style={{
                  padding: '8px 12px 6px',
                  fontFamily: "'Figtree', sans-serif", fontSize: 11,
                  color: '#999', borderBottom: '1px solid #eee', marginBottom: 2,
                }}>
                  {user.email}
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); onBack(); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'transparent', border: 'none', padding: '7px 12px',
                    fontSize: 12, fontFamily: "'Figtree', sans-serif",
                    cursor: 'pointer', color: COLORS.dg, borderRadius: 4,
                  }}
                >
                  ← All Projects
                </button>
                <button
                  onClick={onSignOut}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'transparent', border: 'none', padding: '7px 12px',
                    fontSize: 12, fontFamily: "'Figtree', sans-serif",
                    cursor: 'pointer', color: '#c0392b', borderRadius: 4,
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{
        background: COLORS.wh, borderBottom: `1px solid ${COLORS.bd}`,
        display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        paddingLeft: mob ? 8 : 20,
      }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{
              padding: mob ? '10px 12px' : '10px 18px',
              fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600,
              background: 'transparent', color: view === id ? COLORS.dg : COLORS.mg,
              border: 'none',
              borderBottom: view === id ? `3px solid ${ACCENT}` : '3px solid transparent',
              cursor: 'pointer', letterSpacing: 1.5, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {label}
            {id === 'compare' && scenarios.length > 1 ? ` (${scenarios.length})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: mob ? 12 : 18 }}>
        {view === 'dashboard' && <Dashboard {...viewProps} />}
        {view === 'estimate' && <CostModel {...viewProps} />}
        {view === 'compare' && <Compare {...viewProps} addScenario={addScenario} />}
        {view === 'assumptions' && <Assumptions {...viewProps} scenarioName={active.name} />}
        {view === 'audit' && <AuditLog audit={audit} items={items} updateItem={updateItem} updateGlobal={updateGlobal} />}
      </div>
    </div>
  );
}
