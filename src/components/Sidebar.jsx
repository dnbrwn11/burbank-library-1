import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Table, Layers, ShieldCheck, Search, Users,
  TrendingDown, ListChecks, UserPlus, ClipboardCheck, FileText,
  Settings, CircleHelp as HelpCircle, ChevronsLeft, ChevronsRight, ChevronDown,
  LogOut, CreditCard, User as UserIcon, X,
} from 'lucide-react';

const G_DARK    = '#1A1A1A';
const G_HOVER   = '#2A2A2A';
const G_ACTIVE  = '#252525';
const G_DIVIDER = '#2A2A2A';
const ACCENT    = '#B89030';
const TX_DIM    = '#777777';
const TX_MUTED  = '#999999';
const TX_FAINT  = '#555555';

// Default section + item config. `available: false` → "Coming soon" state.
const SECTIONS = [
  {
    key: 'overview', label: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, available: true },
      { id: 'estimate',  label: 'Cost Model', icon: Table,          available: true },
      { id: 'scenarios', label: 'Scenarios',  icon: Layers,         available: true },
    ],
  },
  {
    key: 'ai', label: 'AI TOOLS',
    items: [
      { id: 'audit',       label: 'Audit',       icon: ShieldCheck, available: true },
      { id: 'scope_check', label: 'Scope Check', icon: Search,      available: true },
    ],
  },
  {
    key: 'workflows', label: 'WORKFLOWS',
    items: [
      { id: 'trades',      label: 'Trades',      icon: Users,         available: true },
      { id: 've',          label: 'VE Log',      icon: TrendingDown,  available: true },
      { id: 'scope_notes', label: 'Scope Notes', icon: ListChecks,    available: true },
    ],
  },
  {
    key: 'collaborate', label: 'COLLABORATE',
    items: [
      { id: 'team',        label: 'Team',        icon: UserPlus,        available: true },
      { id: 'assignments', label: 'Assignments', icon: ClipboardCheck,  available: false },
    ],
  },
  {
    key: 'output', label: 'OUTPUT',
    items: [
      { id: 'reports', label: 'Reports', icon: FileText, available: true },
    ],
  },
];

function initials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

export default function Sidebar({
  view, onNavigate,
  project, onBackToProjects,
  user, profile, plan = 'Beta',
  collapsed, onToggleCollapsed,
  mobileOpen, onMobileClose,
  isMobile,
  onSignOut,
  onExportPDF,
}) {
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cd_sidebar_sections') || 'null');
      if (saved && typeof saved === 'object') return saved;
    } catch {}
    return SECTIONS.reduce((acc, s) => { acc[s.key] = true; return acc; }, {});
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('cd_sidebar_sections', JSON.stringify(openSections)); } catch {}
  }, [openSections]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const h = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [userMenuOpen]);

  const toggleSection = (key) => {
    if (collapsed) return;
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleItemClick = (item) => {
    if (!item.available) return;
    onNavigate(item.id);
    if (isMobile) onMobileClose?.();
  };

  const openHelp = () => {
    if (typeof window !== 'undefined' && window.$crisp) {
      try { window.$crisp.push(['do', 'chat:open']); return; } catch {}
    }
    window.location.href = 'mailto:hello@costdeck.ai?subject=CostDeck%20help';
  };

  const width = collapsed ? 56 : 220;

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Account';
  const emailDomain = user?.email || '';

  // ── Base shell (fixed positioning + mobile overlay) ────────────────────────
  const shell = (
    <aside
      style={{
        background: G_DARK,
        color: '#fff',
        height: '100vh',
        width,
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 120,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #000',
        transition: isMobile ? 'transform 0.22s ease' : 'width 0.2s ease',
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        fontFamily: "'Figtree', sans-serif",
      }}
      aria-label="Primary navigation"
    >
      {/* Logo + Project header */}
      <div style={{ padding: collapsed ? '14px 8px' : '14px 16px', borderBottom: `1px solid ${G_DIVIDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: collapsed ? 0 : 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <CrosshairMark size={24} />
          {!collapsed && (
            <>
              <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: 1.8, color: ACCENT }}>
                COSTDECK
              </span>
              <span style={{ fontSize: 8, fontWeight: 700, color: ACCENT, border: `1px solid ${ACCENT}`, padding: '1px 5px', borderRadius: 3, letterSpacing: 0.8, fontFamily: "'Archivo', sans-serif" }}>
                BETA
              </span>
            </>
          )}
          {isMobile && !collapsed && (
            <button
              onClick={onMobileClose}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: TX_MUTED, cursor: 'pointer', padding: 4 }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {!collapsed && project && (
          <button
            onClick={onBackToProjects}
            title="Back to all projects"
            style={{
              width: '100%', textAlign: 'left',
              background: 'none', border: 'none', padding: '8px 10px', borderRadius: 6,
              cursor: 'pointer', transition: 'background 0.12s',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
            onMouseEnter={e => e.currentTarget.style.background = G_HOVER}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ color: '#fff', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {project.name}
            </span>
            <span style={{ color: TX_MUTED, fontSize: 11 }}>
              {[project.city, project.state].filter(Boolean).join(', ') || 'No location'}
            </span>
          </button>
        )}
      </div>

      {/* Nav groups — scrollable */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 4px' : '12px 8px' }}>
        {SECTIONS.map((section, sectionIdx) => {
          const isOpen = collapsed ? true : openSections[section.key] !== false;
          return (
            <div key={section.key} style={{ marginTop: sectionIdx === 0 ? 0 : 20, marginBottom: 4 }}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none',
                    padding: '0 12px 8px', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    fontFamily: "'Figtree', sans-serif",
                    fontSize: 10, fontWeight: 600, color: '#555',
                    letterSpacing: 1.2, textTransform: 'uppercase',
                  }}>
                    {section.label}
                  </span>
                  <ChevronDown
                    size={11} color="#555"
                    style={{ transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 150ms ease' }}
                  />
                </button>
              )}
              {isOpen && section.items.map(item => {
                const Icon = item.icon;
                const active = view === item.id && item.available;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    title={collapsed ? (item.available ? item.label : `${item.label} — Coming soon`) : (!item.available ? 'Coming soon' : '')}
                    disabled={!item.available}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: active ? G_ACTIVE : 'transparent',
                      border: 'none',
                      borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                      padding: collapsed ? '10px 0' : `8px 12px 8px ${active ? 9 : 12}px`,
                      margin: '1px 0',
                      borderRadius: collapsed ? 6 : 0,
                      cursor: item.available ? 'pointer' : 'not-allowed',
                      color: item.available ? (active ? '#FFFFFF' : '#CCCCCC') : TX_FAINT,
                      fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: active ? 500 : 400,
                      textAlign: 'left',
                      transition: 'background 150ms ease, color 150ms ease',
                    }}
                    onMouseEnter={e => {
                      if (!active && item.available) e.currentTarget.style.background = G_HOVER;
                    }}
                    onMouseLeave={e => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icon
                      size={18}
                      color={active ? ACCENT : (item.available ? '#FFFFFF' : TX_FAINT)}
                      strokeWidth={1.75}
                      style={{ opacity: active ? 1 : 0.6 }}
                    />
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Fixed bottom: Settings / Help / User */}
      <div style={{ borderTop: `1px solid ${G_DIVIDER}`, padding: collapsed ? '8px 4px' : '8px 8px' }}>
        <button
          disabled
          title={collapsed ? 'Settings — Coming soon' : 'Coming soon'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'none', border: 'none',
            padding: collapsed ? '10px 0' : '8px 12px',
            borderRadius: collapsed ? 6 : 0,
            cursor: 'not-allowed',
            color: TX_FAINT,
            fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: 400,
            textAlign: 'left',
          }}
        >
          <Settings size={18} color={TX_FAINT} strokeWidth={1.75} style={{ opacity: 0.6 }} />
          {!collapsed && <span style={{ flex: 1 }}>Settings</span>}
        </button>
        <button
          onClick={openHelp}
          title={collapsed ? 'Help & support' : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'none', border: 'none',
            padding: collapsed ? '10px 0' : '8px 12px',
            borderRadius: collapsed ? 6 : 0,
            cursor: 'pointer', color: '#CCCCCC',
            fontFamily: "'Figtree', sans-serif", fontSize: 13, fontWeight: 400,
            textAlign: 'left',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = G_HOVER}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <HelpCircle size={18} color="#FFFFFF" strokeWidth={1.75} style={{ opacity: 0.6 }} />
          {!collapsed && <span style={{ flex: 1 }}>Help</span>}
        </button>

        {/* User row */}
        <div ref={userMenuRef} style={{ position: 'relative', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${G_DIVIDER}` }}>
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'none', border: 'none',
              padding: collapsed ? '8px 0' : '8px 12px',
              borderRadius: collapsed ? 6 : 0,
              cursor: 'pointer',
              fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#fff',
              textAlign: 'left',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = G_HOVER}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              background: ACCENT, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, fontFamily: "'Archivo', sans-serif",
              flexShrink: 0,
            }}>
              {initials(displayName)}
            </span>
            {!collapsed && (
              <>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </span>
                <span style={{ fontSize: 9, fontWeight: 600, color: ACCENT, border: `1px solid ${ACCENT}`, padding: '2px 6px', borderRadius: 3, letterSpacing: 0.5, fontFamily: "'Archivo', sans-serif", flexShrink: 0 }}>
                  {plan.toUpperCase()}
                </span>
              </>
            )}
          </button>
          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              left: collapsed ? 56 : 8, right: collapsed ? 'auto' : 8,
              bottom: collapsed ? 0 : 'calc(100% + 4px)',
              minWidth: collapsed ? 200 : 'auto',
              background: '#fff',
              border: '1px solid #e5e5e0', borderRadius: 8,
              padding: 4, zIndex: 200,
              boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
            }}>
              <div style={{ padding: '7px 12px 4px', fontSize: 11, color: '#999', borderBottom: '1px solid #eee', marginBottom: 2, fontFamily: "'Figtree', sans-serif" }}>
                {emailDomain}
              </div>
              <MenuItem disabled icon={UserIcon} label="Account" hint="Coming soon" />
              <MenuItem disabled icon={CreditCard} label="Billing" hint="Coming soon" />
              <MenuItem icon={LogOut} label="Sign out" onClick={() => { setUserMenuOpen(false); onSignOut?.(); }} danger />
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        {!isMobile && (
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginTop: 6,
              background: 'none', border: 'none',
              padding: '8px 0', cursor: 'pointer',
              color: TX_DIM,
              fontFamily: "'Figtree', sans-serif", fontSize: 11,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = TX_DIM}
          >
            {collapsed
              ? <ChevronsRight size={14} />
              : <><ChevronsLeft size={14} /> <span>Collapse</span></>
            }
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {shell}
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 115 }}
        />
      )}
    </>
  );
}

// Small menu item for user dropdown
function MenuItem({ icon: Icon, label, onClick, disabled, danger, hint }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint || ''}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 12px', background: 'none', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#bbb' : danger ? '#dc2626' : '#333',
        fontFamily: "'Figtree', sans-serif", fontSize: 13, textAlign: 'left', borderRadius: 4,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#fafaf8'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={14} />
      <span style={{ flex: 1 }}>{label}</span>
      {hint && <span style={{ fontSize: 10, color: '#bbb' }}>{hint}</span>}
    </button>
  );
}

// Crosshair mark — inline to keep Sidebar self-contained
function CrosshairMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block', flexShrink: 0 }}>
      <rect width="40" height="40" rx="7" fill="#2a2a2a" />
      <circle cx="20" cy="20" r="9" fill="none" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="2.5" fill={ACCENT} />
      <line x1="20" y1="7"  x2="20" y2="12" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="28" x2="20" y2="33" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7"  y1="20" x2="12" y2="20" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="20" x2="33" y2="20" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
