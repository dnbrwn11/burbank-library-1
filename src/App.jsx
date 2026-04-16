import { useState, useMemo } from 'react';
import { useWindowSize } from './hooks/useWindowSize';
import { useScenarios } from './hooks/useScenarios';
import * as CE from './engine/CostEngine';
import { CATEGORIES } from './data/seedData';
import { COLORS, FONTS, SCENARIO_TYPES } from './data/constants';
import { fK } from './utils/format';
import { Dashboard } from './components/Dashboard';
import { CostModel } from './components/CostModel';
import { Compare } from './components/Compare';
import { Assumptions } from './components/Assumptions';
import { AuditLog } from './components/AuditLog';

export default function App() {
  const { mob } = useWindowSize();
  const {
    scenarios, active, activeId, setActiveId,
    audit, updateItem, updateGlobal, addScenario, deleteScenario,
  } = useScenarios();

  const [view, setView] = useState('dashboard');
  const [showNewScen, setShowNewScen] = useState(false);

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
    return CATEGORIES.filter(c => g[c]).map(c => ({
      c, items: g[c], t: CE.categoryTotals(items, globals, c),
    }));
  }, [activeItems, items, globals]);

  // Shared props for all view components
  const viewProps = {
    items, globals, activeItems, totals, catGroups, bsf,
    updateItem, updateGlobal, scenarios, active,
  };

  const tabs = [
    ['dashboard', 'DASHBOARD'],
    ['estimate', 'COST MODEL'],
    ['compare', 'COMPARE'],
    ['assumptions', 'ASSUMPTIONS'],
    ['audit', 'AUDIT'],
  ];

  return (
    <div style={{ fontFamily: FONTS.body, background: COLORS.bg, color: COLORS.dg, minHeight: '100vh' }}>
      {/* ─── Header ─── */}
      <div style={{
        background: COLORS.gn, padding: mob ? '8px 12px' : '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: mob ? 48 : 52, flexWrap: 'wrap', gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 8 : 12 }}>
          <svg width={16} height={16} viewBox="0 0 40 40" fill="none">
            <path d="M0 20L20 0L40 20L20 40Z" fill={COLORS.yl} />
          </svg>
          <span style={{ fontSize: mob ? 12 : 14, fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.wh, letterSpacing: 2 }}>PCL</span>
          {!mob && (
            <span style={{ fontSize: 10, color: `${COLORS.wh}55`, borderLeft: `1px solid ${COLORS.wh}33`, paddingLeft: 12 }}>
              Burbank Library & Civic Center
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 6 : 10 }}>
          <select
            value={activeId}
            onChange={e => setActiveId(e.target.value)}
            style={{
              background: `${COLORS.wh}22`, border: `1px solid ${COLORS.wh}44`,
              borderRadius: 6, color: COLORS.yl, padding: '6px 10px',
              fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600,
            }}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id} style={{ color: COLORS.dg }}>{s.name}</option>
            ))}
          </select>
          {scenarios.length < 5 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNewScen(!showNewScen)}
                style={{
                  background: COLORS.yl, color: COLORS.dg, border: 'none',
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
                  {SCENARIO_TYPES
                    .filter(t => !scenarios.find(s => s.name === t))
                    .map(t => (
                      <button
                        key={t}
                        onClick={() => { addScenario(t); setShowNewScen(false); }}
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
              color: COLORS.yl, fontSize: 13, fontFamily: FONTS.heading,
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            }}>
              {fK(totals.full.m.tot)}
            </span>
          )}
        </div>
      </div>

      {/* ─── Nav ─── */}
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
              background: 'transparent', color: view === id ? COLORS.gn : COLORS.mg,
              border: 'none',
              borderBottom: view === id ? `3px solid ${COLORS.yl}` : '3px solid transparent',
              cursor: 'pointer', letterSpacing: 1.5, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {label}
            {id === 'compare' && scenarios.length > 1 ? ` (${scenarios.length})` : ''}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
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
