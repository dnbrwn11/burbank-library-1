import { useState, useRef, useEffect } from 'react';
import {
  Menu, Upload, Download, ShieldCheck, History, ChevronDown, Plus, Check,
} from 'lucide-react';

const ACCENT  = '#B89030';
const BORDER  = '#E5E5E2';
const BG      = '#FFFFFF';
const TX      = '#222222';
const TX_DIM  = '#888888';

const VIEW_LABELS = {
  dashboard:   'Dashboard',
  estimate:    'Cost Model',
  scenarios:   'Scenarios',
  trades:      'Trades',
  ve:          'VE Log',
  scope_notes: 'Scope Notes',
  audit:       'Audit',
  scope_check: 'Scope Check',
  team:        'Team',
  reports:     'Reports',
};

function fK(n) {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v).toLocaleString()}`;
}

export default function TopHeader({
  view, project, onNavigate, onBackToProjects,
  scenarios, activeId, setActiveId, addScenario,
  scenarioNames = [], totalMid = 0,
  onImport, onExport, onAudit, onOpenHistory, auditCount = 0,
  onMobileMenuOpen, isMobile,
  sidebarWidth = 220,
}) {
  const [scenOpen, setScenOpen] = useState(false);
  const [newScenOpen, setNewScenOpen] = useState(false);
  const scenRef = useRef(null);

  useEffect(() => {
    if (!scenOpen && !newScenOpen) return;
    const h = (e) => { if (scenRef.current && !scenRef.current.contains(e.target)) { setScenOpen(false); setNewScenOpen(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [scenOpen, newScenOpen]);

  const active = scenarios?.find(s => s.id === activeId);
  const viewLabel = VIEW_LABELS[view] || 'Project';

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: isMobile ? 0 : sidebarWidth,
        right: 0,
        height: 48,
        background: BG,
        borderBottom: `1px solid ${BORDER}`,
        zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        transition: 'left 0.2s ease',
        fontFamily: "'Figtree', sans-serif",
      }}
    >
      {/* Left: hamburger + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {isMobile && (
          <button
            onClick={onMobileMenuOpen}
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#444', display: 'flex', alignItems: 'center' }}
          >
            <Menu size={20} />
          </button>
        )}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TX_DIM, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <button
            onClick={onBackToProjects}
            style={{ background: 'none', border: 'none', padding: 0, color: TX_DIM, cursor: 'pointer', fontFamily: "'Figtree', sans-serif", fontSize: 12 }}
            onMouseEnter={e => e.currentTarget.style.color = ACCENT}
            onMouseLeave={e => e.currentTarget.style.color = TX_DIM}
          >
            Projects
          </button>
          <span style={{ color: '#ccc' }}>/</span>
          <span style={{ color: TX, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 120 : 280 }}>
            {project?.name || 'Project'}
          </span>
          {!isMobile && (
            <>
              <span style={{ color: '#ccc' }}>/</span>
              <span style={{ color: TX, fontWeight: 600 }}>{viewLabel}</span>
            </>
          )}
        </nav>
      </div>

      {/* Center: scenario switcher (hidden on mobile) */}
      {!isMobile && scenarios?.length > 0 && (
        <div ref={scenRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { setScenOpen(v => !v); setNewScenOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fafaf8', border: `1px solid ${BORDER}`, borderRadius: 7,
              padding: '6px 12px', cursor: 'pointer',
              fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
              color: TX, minWidth: 150, justifyContent: 'space-between',
            }}
          >
            <span style={{ color: TX_DIM, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>Scenario</span>
            <span style={{ color: ACCENT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {active?.name || 'Baseline'}
            </span>
            <ChevronDown size={13} color={TX_DIM} />
          </button>
          {scenOpen && (
            <div style={{
              position: 'absolute', top: 40, left: 0, minWidth: 220,
              background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: 4, zIndex: 100, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            }}>
              {scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setActiveId(s.id); setScenOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'Figtree', sans-serif", fontSize: 13,
                    color: s.id === activeId ? ACCENT : TX,
                    fontWeight: s.id === activeId ? 700 : 500,
                    borderRadius: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {s.id === activeId ? <Check size={12} color={ACCENT} /> : <span style={{ width: 12 }} />}
                  <span style={{ flex: 1 }}>{s.name}</span>
                </button>
              ))}
              {scenarioNames.length > 0 && (
                <>
                  <div style={{ height: 1, background: '#f0f0ee', margin: '4px 0' }} />
                  <button
                    onClick={() => { setNewScenOpen(v => !v); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: "'Archivo', sans-serif", fontSize: 12, fontWeight: 700,
                      color: ACCENT, letterSpacing: 0.3,
                      borderRadius: 4,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffbf0'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Plus size={12} color={ACCENT} />
                    <span>New scenario</span>
                  </button>
                  {newScenOpen && (
                    <div style={{ padding: '4px 4px' }}>
                      {scenarioNames.map(t => (
                        <button
                          key={t}
                          onClick={() => { addScenario(t); setScenOpen(false); setNewScenOpen(false); }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            background: 'none', border: 'none',
                            padding: '6px 12px 6px 28px', fontSize: 12, cursor: 'pointer',
                            color: TX, borderRadius: 4, fontFamily: "'Figtree', sans-serif",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right: total + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
        {!isMobile && totalMid > 0 && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16, fontWeight: 600, color: ACCENT,
            marginRight: 4,
          }}>
            {fK(totalMid)}
          </span>
        )}

        {onImport && !isMobile && (
          <ActionButton icon={Upload} label="Import" onClick={onImport} />
        )}
        {onExport && (
          <ActionButton icon={Download} label="Export" onClick={onExport} />
        )}
        {onAudit && !isMobile && (
          <ActionButton icon={ShieldCheck} label="Audit" onClick={onAudit} primary />
        )}
        {onOpenHistory && !isMobile && (
          <ActionButton icon={History} label="History" onClick={onOpenHistory} badge={auditCount} />
        )}
      </div>
    </header>
  );
}

function ActionButton({ icon: Icon, label, onClick, primary, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: primary ? ACCENT : '#fafaf8',
        color: primary ? '#fff' : TX,
        border: primary ? 'none' : `1px solid ${BORDER}`,
        borderRadius: 6, padding: '5px 10px',
        cursor: 'pointer',
        fontFamily: "'Figtree', sans-serif", fontSize: 12, fontWeight: 600,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => {
        if (!primary) e.currentTarget.style.background = '#f0f0ee';
      }}
      onMouseLeave={e => {
        if (!primary) e.currentTarget.style.background = '#fafaf8';
      }}
    >
      <Icon size={13} />
      <span>{label}</span>
      {badge > 0 && (
        <span style={{
          background: primary ? 'rgba(255,255,255,0.3)' : '#e5e5e0',
          color: primary ? '#fff' : '#666',
          borderRadius: 10, padding: '0 6px',
          fontSize: 10, fontWeight: 700,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
