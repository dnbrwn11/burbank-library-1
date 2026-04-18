import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import ScopeGapAnalysis from './components/ScopeGapAnalysis';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import ProjectDashboard from './components/ProjectDashboard';
import OrgSettings from './components/OrgSettings';
import AIGenerator from './components/AIGenerator';
import TeamPanel, { Avatar, initials } from './components/TeamPanel';
import BiddingPanel from './components/BiddingPanel';
import BidSubmitScreen from './components/BidSubmitScreen';
import { supabase } from './supabase/supabaseClient';
import { getProjectMembers, getProjectMemberRole } from './supabase/db';
import { analytics, initCrisp, identifyUser, identifyCrispUser, resetAnalyticsUser } from './analytics';

const ACCENT = '#B89030';
const HEADER = '#222222';

// Decode base64url-encoded invite token payload (browser-side, no HMAC verify — server does that)
function decodeInviteToken(token) {
  try {
    const [b64url] = token.split('.');
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function App() {
  const { user, profile, org, orgRole, loading: authLoading, signIn, signOut, refreshOrg } = useAuth();

  // Init Crisp once on mount (deferred — won't block first paint)
  useEffect(() => { initCrisp(); }, []);

  // Identify user in PostHog + Crisp after auth
  useEffect(() => {
    if (!user) return;
    const name = profile?.full_name || null;
    identifyUser(user.id, { email: user.email, name, company: profile?.company });
    identifyCrispUser(user.email, name);
  }, [user?.id, profile?.full_name]);

  const [showLogin, setShowLogin] = useState(false);
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [orgSettingsTab, setOrgSettingsTab] = useState('settings');

  const handleSignOut = async () => {
    resetAnalyticsUser();
    setShowLogin(false);
    await signOut();
  };
  const [activeProject, setActiveProject] = useState(null);
  const [generatingProject, setGeneratingProject] = useState(null);

  // Bid submission token — checked before invite tokens
  const [bidToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('bid');
    if (token) {
      window.history.replaceState({}, '', window.location.pathname);
      return token;
    }
    return null;
  });

  // Invite state — set from URL on first render
  const [pendingInvite, setPendingInvite] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      sessionStorage.setItem('pendingInvite', token);
      window.history.replaceState({}, '', window.location.pathname);
      return token;
    }
    return sessionStorage.getItem('pendingInvite') || null;
  });
  const [inviteStatus, setInviteStatus] = useState('idle'); // idle | accepting | success | error
  const [inviteError, setInviteError] = useState(null);

  const inviteData = pendingInvite ? decodeInviteToken(pendingInvite) : null;

  // Auto-accept when user becomes available and invite is pending
  useEffect(() => {
    if (!pendingInvite || !user || inviteStatus !== 'idle') return;
    acceptInvite();
  }, [pendingInvite, user, inviteStatus]);

  async function acceptInvite() {
    setInviteStatus('accepting');
    setInviteError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ inviteToken: pendingInvite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept invite');
      sessionStorage.removeItem('pendingInvite');
      if (data.type === 'org') refreshOrg();
      setInviteStatus('success');
    } catch (err) {
      setInviteError(err.message);
      setInviteStatus('error');
    }
  }

  function dismissInvite() {
    sessionStorage.removeItem('pendingInvite');
    setPendingInvite(null);
    setInviteStatus('idle');
    setInviteError(null);
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9F9F8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>
            COSTDECK
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 14 }}>
          Loading…
        </div>
      </div>
    );
  }

  // Bid submission screen — public, no auth required
  if (bidToken) {
    return <BidSubmitScreen token={bidToken} onDismiss={user ? () => window.location.reload() : null} />;
  }

  // Invite accept screen — shown when there's a pending invite token in URL/storage
  if (pendingInvite) {
    return (
      <InviteAcceptScreen
        inviteData={inviteData}
        user={user}
        inviteStatus={inviteStatus}
        inviteError={inviteError}
        onSignIn={signIn}
        onContinue={dismissInvite}
        onDismiss={dismissInvite}
      />
    );
  }

  if (!user) {
    if (!showLogin) return <LandingPage onShowLogin={() => setShowLogin(true)} />;
    return <LoginPage onSignIn={signIn} />;
  }

  if (showOrgSettings) {
    return (
      <OrgSettings
        user={user}
        org={org}
        orgRole={orgRole}
        initialTab={orgSettingsTab}
        onClose={() => setShowOrgSettings(false)}
        onOrgUpdated={() => refreshOrg()}
      />
    );
  }

  if (generatingProject && !activeProject) {
    // Skip AI Generator for sample projects — go directly to cost model
    if (generatingProject.name?.startsWith('Sample:')) {
      setActiveProject(generatingProject);
      setGeneratingProject(null);
      return null;
    }
    return (
      <AIGenerator
        project={generatingProject}
        user={user}
        onSave={() => { setActiveProject(generatingProject); setGeneratingProject(null); }}
        onSkip={() => { setActiveProject(generatingProject); setGeneratingProject(null); }}
        onGoHome={() => setGeneratingProject(null)}
        onSignOut={handleSignOut}
      />
    );
  }

  if (!activeProject) {
    return (
      <ProjectDashboard
        user={user}
        org={org}
        orgRole={orgRole}
        onSignOut={handleSignOut}
        onSelectProject={setActiveProject}
        onProjectCreated={(p) => { setGeneratingProject(p); }}
        onOrgSettings={(tab = 'settings') => { setOrgSettingsTab(tab); setShowOrgSettings(true); }}
      />
    );
  }

  return (
    <CostModelApp
      user={user}
      project={activeProject}
      onBack={() => setActiveProject(null)}
      onSignOut={handleSignOut}
    />
  );
}

// ─── Project loading skeleton ────────────────────────────────────────────────

// Inject shimmer keyframes once so SkeletonBar can animate without a CSS file
if (typeof document !== 'undefined' && !document.getElementById('cd-shimmer')) {
  const s = document.createElement('style');
  s.id = 'cd-shimmer';
  s.textContent = '@keyframes cd-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}';
  document.head.appendChild(s);
}

function SkeletonBar({ width = '100%', height = 12, mb = 0, radius = 4 }) {
  return (
    <div style={{
      width, height, borderRadius: radius, marginBottom: mb, flexShrink: 0,
      background: 'linear-gradient(90deg,#ebebea 25%,#e1e1de 50%,#ebebea 75%)',
      backgroundSize: '200% 100%',
      animation: 'cd-shimmer 1.5s ease-in-out infinite',
    }} />
  );
}

function ProjectLoadingSkeleton({ project, mob }) {
  const cols = mob ? 2 : 4;
  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: HEADER, height: 52, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 2 }}>COSTDECK</span>
        {!mob && <SkeletonBar width={180} height={9} />}
        <div style={{ flex: 1 }} />
        <SkeletonBar width={90} height={26} radius={6} />
        <SkeletonBar width={60} height={26} radius={6} />
        <SkeletonBar width={72} height={26} radius={6} />
      </div>
      {/* Tab nav */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${COLORS.bd}`, display: 'flex', padding: '0 20px', gap: 2 }}>
        {[88, 96, 80, 110, 64].map((w, i) => (
          <div key={i} style={{ padding: '12px 18px' }}>
            <SkeletonBar width={w} height={8} />
          </div>
        ))}
      </div>
      {/* Body */}
      <div style={{ flex: 1, padding: mob ? 12 : 18 }}>
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12, marginBottom: 20 }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: '16px 18px' }}>
              <SkeletonBar width={56} height={8} mb={10} />
              <SkeletonBar width={mob ? 80 : 110} height={22} mb={6} />
              <SkeletonBar width={70} height={8} />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        {!mob && (
          <div style={{ background: '#fff', border: `1px solid ${COLORS.bd}`, borderRadius: 10, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ background: '#F5F5F0', padding: '10px 18px', display: 'flex', gap: 12, borderBottom: `2px solid #e8e8e4` }}>
              {[24, 200, 110, 60, 60, 40, 70, 70, 70, 90, 50, 50].map((w, i) => (
                <SkeletonBar key={i} width={w} height={8} />
              ))}
            </div>
            {/* Category + rows */}
            {[
              { catW: 160, rows: 3 },
              { catW: 120, rows: 4 },
              { catW: 180, rows: 2 },
            ].map((g, gi) => (
              <div key={gi}>
                <div style={{ background: '#FAFAF6', padding: '10px 18px', borderBottom: `1px solid ${COLORS.bd}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <SkeletonBar width={g.catW} height={10} />
                  <div style={{ flex: 1 }} />
                  <SkeletonBar width={80} height={10} />
                </div>
                {Array.from({ length: g.rows }).map((_, ri) => (
                  <div key={ri} style={{ padding: '11px 18px', borderBottom: `1px solid ${COLORS.bl}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <SkeletonBar width={24} height={8} />
                    <SkeletonBar width={`${28 + ((gi + ri) % 3) * 9}%`} height={9} />
                    <SkeletonBar width={`${8 + (ri % 2) * 4}%`} height={9} />
                    <div style={{ flex: 1 }} />
                    <SkeletonBar width={64} height={9} />
                    <SkeletonBar width={40} height={9} />
                    <SkeletonBar width={48} height={20} radius={3} />
                    <SkeletonBar width={16} height={16} radius={3} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {/* Mobile card skeleton */}
        {mob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[3, 4, 2].map((count, gi) => (
              <div key={gi}>
                <div style={{ background: '#fff', border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: '12px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <SkeletonBar width={120} height={11} />
                  <SkeletonBar width={60} height={11} />
                </div>
                {Array.from({ length: count }).map((_, ri) => (
                  <div key={ri} style={{ background: '#fff', border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: '12px 14px', marginBottom: 6 }}>
                    <SkeletonBar width={`${60 + ri * 10}%`} height={12} mb={8} />
                    <SkeletonBar width={90} height={8} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Save indicator ──────────────────────────────────────────────────────────

function SaveIndicator({ savePending, lastSaved }) {
  const [visible, setVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fadeTimer = useRef(null);
  const prevLastSaved = useRef(null);

  useEffect(() => {
    if (savePending > 0) {
      setVisible(true);
      setIsSaved(false);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    } else if (lastSaved && lastSaved !== prevLastSaved.current) {
      prevLastSaved.current = lastSaved;
      setIsSaved(true);
      setVisible(true);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setVisible(false), 3000);
    }
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); };
  }, [savePending, lastSaved]);

  if (!visible) return null;

  return (
    <span style={{
      fontSize: 10, fontFamily: "'Figtree', sans-serif",
      color: isSaved ? '#4ade80' : '#888',
      marginLeft: 10, whiteSpace: 'nowrap',
      transition: 'opacity 0.3s',
    }}>
      {isSaved ? 'Saved \u2713' : 'Saving\u2026'}
    </span>
  );
}

// ─── Invite accept screen ────────────────────────────────────────────────────

function InviteAcceptScreen({ inviteData, user, inviteStatus, inviteError, onSignIn, onContinue, onDismiss }) {
  const [signInEmail, setSignInEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();
    setSigningIn(true);
    const { error } = await onSignIn(signInEmail.trim());
    setSigningIn(false);
    if (!error) setMagicSent(true);
  }

  const { type, projectName, orgName, role } = inviteData || {};
  const isOrgInvite = type === 'org';
  const displayName = isOrgInvite ? orgName : projectName;

  if (!inviteData) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9F9F8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>COSTDECK</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', padding: 40, maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 18, color: '#333', marginBottom: 8 }}>Invalid invite link</div>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888', marginBottom: 20 }}>This invite link appears to be malformed or incomplete.</div>
            <button onClick={onDismiss} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Go to CostDeck
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F9F8', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center' }}>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>
          COSTDECK
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #eee',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
          padding: 40, maxWidth: 420, width: '100%',
        }}>
          <div style={{ fontSize: 28, marginBottom: 16, textAlign: 'center' }}>
            {inviteStatus === 'success' ? '✓' : '✉'}
          </div>

          {inviteStatus === 'accepting' && (
            <>
              <h2 style={{ margin: '0 0 8px', fontFamily: "'Archivo', sans-serif", fontSize: 20, color: '#222' }}>
                {isOrgInvite ? 'Joining organization…' : 'Joining project…'}
              </h2>
              <p style={{ margin: 0, fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888' }}>
                Adding you to <strong>{displayName}</strong>
              </p>
            </>
          )}

          {inviteStatus === 'success' && (
            <>
              <h2 style={{ margin: '0 0 8px', fontFamily: "'Archivo', sans-serif", fontSize: 20, color: '#222', textAlign: 'center' }}>
                You're in!
              </h2>
              <p style={{ margin: '0 0 24px', fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#666', textAlign: 'center' }}>
                You've joined <strong>{displayName}</strong> as a <strong>{role}</strong>.
              </p>
              <button
                onClick={onContinue}
                style={{
                  width: '100%', background: ACCENT, color: '#fff',
                  border: 'none', borderRadius: 8, padding: '12px 24px',
                  fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                Open CostDeck →
              </button>
            </>
          )}

          {inviteStatus === 'error' && (
            <>
              <h2 style={{ margin: '0 0 8px', fontFamily: "'Archivo', sans-serif", fontSize: 20, color: '#222' }}>
                Invite issue
              </h2>
              <p style={{ margin: '0 0 20px', fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#dc2626' }}>
                {inviteError}
              </p>
              <button
                onClick={onDismiss}
                style={{
                  background: 'none', border: '1px solid #ddd', borderRadius: 8,
                  padding: '10px 20px', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, cursor: 'pointer', color: '#555',
                }}
              >
                Go to CostDeck
              </button>
            </>
          )}

          {inviteStatus === 'idle' && !user && (
            <>
              <h2 style={{ margin: '0 0 8px', fontFamily: "'Archivo', sans-serif", fontSize: 20, color: '#222' }}>
                You've been invited
              </h2>
              <p style={{ margin: '0 0 20px', fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#666' }}>
                Join <strong>{displayName}</strong> as a <strong>{role}</strong>.
                Sign in to accept.
              </p>

              {magicSent ? (
                <div style={{
                  padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 8, fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#166534',
                }}>
                  Check your email — we sent a sign-in link to <strong>{signInEmail}</strong>.
                </div>
              ) : (
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={e => setSignInEmail(e.target.value)}
                    placeholder="Your email address"
                    required
                    autoFocus
                    style={{
                      border: '1px solid #ddd', borderRadius: 8,
                      padding: '11px 14px', fontSize: 14,
                      fontFamily: "'Figtree', sans-serif", outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={signingIn || !signInEmail.trim()}
                    style={{
                      background: ACCENT, color: '#fff', border: 'none',
                      borderRadius: 8, padding: '12px 24px',
                      fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                      fontSize: 14, cursor: signingIn ? 'default' : 'pointer',
                    }}
                  >
                    {signingIn ? 'Sending link…' : 'Sign in to accept'}
                  </button>
                </form>
              )}

              <button
                onClick={onDismiss}
                style={{
                  marginTop: 12, background: 'none', border: 'none',
                  fontFamily: "'Figtree', sans-serif", fontSize: 12,
                  color: '#aaa', cursor: 'pointer', padding: 0,
                  display: 'block', width: '100%', textAlign: 'center',
                }}
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cost model app ──────────────────────────────────────────────────────────

function CostModelApp({ user, project, onBack, onSignOut }) {
  const { mob } = useWindowSize();
  const {
    scenarios, active, activeId, setActiveId,
    audit, loading, error, retry,
    saveError, setSaveError,
    savePending, lastSaved,
    updateItem, createItem, reorderItems, updateGlobal, addScenario, deleteScenario,
  } = useProjectData(project.id);

  // Undo ref — CostModel registers its undo handler here
  const undoFnRef = useRef(null);

  // Global Ctrl+Z / Cmd+Z → delegate to registered undo handler
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (undoFnRef.current) {
          e.preventDefault();
          undoFnRef.current();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [view, setView] = useState('dashboard');
  const [showNewScen, setShowNewScen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Role: owner always canEdit; others look up project_members
  const [userRole, setUserRole] = useState(
    project.owner_id === user.id ? 'owner' : 'loading'
  );
  useEffect(() => {
    if (project.owner_id === user.id) return;
    getProjectMemberRole(project.id, user.id).then(({ data }) => {
      setUserRole((data?.role || 'viewer').toLowerCase());
    });
  }, [project.id, user.id]);
  const canEdit = userRole === 'owner' || userRole === 'editor';

  // Team members for header avatars
  const [teamMembers, setTeamMembers] = useState([]);
  useEffect(() => {
    getProjectMembers(project.id).then(({ data }) => setTeamMembers(data || []));
  }, [project.id]);

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
    const ordered = [
      ...CSI_ORDER.filter(c => g[c]),
      ...allCats.filter(c => !CSI_ORDER.includes(c)),
    ];
    return ordered.map(c => ({
      c, items: g[c], t: CE.categoryTotals(items, globals, c),
    }));
  }, [activeItems, items, globals]);

  const [aiAdvice, setAiAdvice] = useState({});
  const [aiLoading, setAiLoading] = useState(new Set());

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

  async function exportPdf() {
    setExportingPdf(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ projectId: project.id, scenarioId: activeId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(e.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Estimate_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      analytics.pdfExported(project.id);
    } catch (err) {
      setSaveError(`PDF export failed: ${err.message}`);
    } finally {
      setExportingPdf(false);
    }
  }

  const viewProps = {
    items, globals, activeItems, totals, catGroups, bsf,
    updateItem, createItem, reorderItems, updateGlobal, scenarios, active,
    aiAdvice, aiLoading, askAI, applyAI, canEdit,
  };

  const tabs = [
    ['dashboard', 'DASHBOARD'],
    ['estimate', 'COST MODEL'],
    ['compare', 'COMPARE'],
    ['assumptions', 'ASSUMPTIONS'],
    ['audit', 'AUDIT'],
    ['bidding', 'BIDDING'],
  ];

  if (loading) {
    return <ProjectLoadingSkeleton project={project} mob={mob} />;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: HEADER, height: 52, padding: '0 20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 2 }}>COSTDECK</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #fdd', borderRadius: 12, padding: 32, maxWidth: 440, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 8 }}>Failed to load project</div>
            <div style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>{error}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={retry}
                style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '10px 22px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#555', cursor: 'pointer' }}
              >
                ← Back to Projects
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Overlap-stack avatars: owner + up to 3 members
  const avatarMembers = teamMembers.slice(0, 3);
  const hasTeam = teamMembers.length > 0;

  return (
    <div style={{ fontFamily: FONTS.body, background: COLORS.bg, color: COLORS.dg, minHeight: '100vh' }}>
      {saveError && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fca5a5', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#991b1b' }}>⚠ {saveError}</span>
          <button onClick={() => setSaveError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}

      {userRole === 'viewer' && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '6px 20px', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#92400e' }}>
          You have view-only access to this project.
        </div>
      )}

      {project.name?.startsWith('Sample:') && (
        <div style={{ background: '#f0f9ff', borderBottom: '1px solid #bae6fd', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#0369a1' }}>
            This is a sample project — explore freely, then create your own estimate.
          </span>
          <button
            onClick={onBack}
            style={{ background: '#0369a1', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Create My Project →
          </button>
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18, padding: '0 4px 0 0', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            ‹
          </button>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: mob ? 12 : 14, letterSpacing: 2 }}
          >
            COSTDECK
          </button>
          {!mob && (
            <span style={{ fontSize: 11, color: '#666', borderLeft: '1px solid #333', paddingLeft: 12 }}>
              {project.name}
            </span>
          )}
          {!mob && <SaveIndicator savePending={savePending} lastSaved={lastSaved} />}
        </div>

        {/* Right: scenario picker + total + team + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 6 : 10 }}>
          <select
            value={activeId}
            onChange={e => setActiveId(e.target.value)}
            style={{ background: '#333', border: '1px solid #444', borderRadius: 6, color: ACCENT, padding: '6px 10px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600 }}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id} style={{ color: COLORS.dg, background: '#fff' }}>{s.name}</option>
            ))}
          </select>

          {scenarios.length < 5 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNewScen(!showNewScen)}
                style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, cursor: 'pointer' }}
              >
                + Scenario
              </button>
              {showNewScen && (
                <div style={{ position: 'absolute', right: 0, top: 34, background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: 4, zIndex: 100, minWidth: 140, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
                  {SCENARIO_TYPES.filter(t => !scenarios.find(s => s.name === t)).map(t => (
                    <button key={t} onClick={() => { addScenario(t); setShowNewScen(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 12px', fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer', color: COLORS.dg, borderRadius: 4 }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!mob && (
            <span style={{ color: ACCENT, fontSize: 13, fontFamily: FONTS.heading, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {fK(totals.full.m.tot)}
            </span>
          )}

          {!mob && (
            <button
              onClick={exportPdf}
              disabled={exportingPdf}
              title="Export PDF report"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: exportingPdf ? '#2a2a2a' : '#2a2a2a',
                border: '1px solid #444', borderRadius: 6,
                padding: '5px 10px', cursor: exportingPdf ? 'default' : 'pointer',
                color: exportingPdf ? '#666' : '#aaa',
                fontFamily: "'Figtree', sans-serif", fontSize: 11,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {exportingPdf ? 'Exporting…' : 'PDF'}
            </button>
          )}

          {/* Team avatar stack + team button */}
          <button
            onClick={() => setShowTeamPanel(true)}
            title="Team members"
            style={{
              display: 'flex', alignItems: 'center', gap: 0,
              background: 'none', border: '1px solid #444',
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
            }}
          >
            {/* Owner avatar (always shown) */}
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: "'Archivo', sans-serif", border: '2px solid #222', flexShrink: 0 }}>
              {initials(user.email?.split('@')[0] || 'U')}
            </div>
            {/* Additional members, overlapping */}
            {avatarMembers.map((m, i) => (
              <div key={m.user_id} style={{ width: 26, height: 26, borderRadius: '50%', background: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#ccc', fontFamily: "'Archivo', sans-serif", border: '2px solid #222', marginLeft: -6, flexShrink: 0 }}>
                {initials(m.profiles?.full_name || m.profiles?.email || '?')}
              </div>
            ))}
            {!mob && (
              <span style={{ marginLeft: hasTeam ? 4 : 6, fontSize: 10, color: '#888', fontFamily: "'Figtree', sans-serif", whiteSpace: 'nowrap' }}>
                Team
              </span>
            )}
          </button>

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              style={{ background: '#333', border: '1px solid #444', borderRadius: 6, padding: '5px 10px', fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#aaa', cursor: 'pointer' }}
            >
              {user.email?.split('@')[0] || 'Account'}
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 34, background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: 4, zIndex: 100, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
                <div style={{ padding: '8px 12px 6px', fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#999', borderBottom: '1px solid #eee', marginBottom: 2 }}>
                  {user.email}
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); onBack(); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '7px 12px', fontSize: 12, fontFamily: "'Figtree', sans-serif", cursor: 'pointer', color: COLORS.dg, borderRadius: 4 }}
                >
                  ← All Projects
                </button>
                <button
                  onClick={onSignOut}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '7px 12px', fontSize: 12, fontFamily: "'Figtree', sans-serif", cursor: 'pointer', color: '#c0392b', borderRadius: 4 }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: COLORS.wh, borderBottom: `1px solid ${COLORS.bd}`, display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingLeft: mob ? 8 : 20 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{ padding: mob ? '10px 12px' : '10px 18px', fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, background: 'transparent', color: view === id ? COLORS.dg : COLORS.mg, border: 'none', borderBottom: view === id ? `3px solid ${ACCENT}` : '3px solid transparent', cursor: 'pointer', letterSpacing: 1.5, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {label}
            {id === 'compare' && scenarios.length > 1 ? ` (${scenarios.length})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: mob ? 12 : 18 }}>
        {view === 'dashboard' && <Dashboard {...viewProps} />}
        {view === 'estimate' && <CostModel {...viewProps} registerUndo={(fn) => { undoFnRef.current = fn; }} />}
        {view === 'compare' && <Compare {...viewProps} addScenario={addScenario} />}
        {view === 'assumptions' && <Assumptions {...viewProps} scenarioName={active.name} />}
        {view === 'audit' && (
          <>
            <AuditLog audit={audit} items={items} updateItem={updateItem} updateGlobal={updateGlobal} />
            <ScopeGapAnalysis items={items} project={project} scenario={active} />
          </>
        )}
        {view === 'bidding' && <BiddingPanel {...viewProps} project={project} user={user} mob={mob} />}
      </div>

      {showTeamPanel && (
        <TeamPanel
          project={project}
          user={user}
          onClose={() => {
            setShowTeamPanel(false);
            // Refresh avatars after team changes
            getProjectMembers(project.id).then(({ data }) => setTeamMembers(data || []));
          }}
        />
      )}
    </div>
  );
}
