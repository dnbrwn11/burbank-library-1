import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { getBidPackages, getBidInvitations, getBidSubmissions } from '../supabase/db';
import { analytics } from '../analytics';
import { Skeleton, EmptyState, Button } from './ui';
import { Handshake } from 'lucide-react';

const ACCENT = '#B89030';
const HEADER_BG = '#222222';
const BORDER = '#E5E5E2';
const BG = '#F9F9F8';

function fmt(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  // Aligned with BADGE_STYLES tokens — consistent palette across the app
  const colors = {
    active:    { bg: '#EAF3DE', fg: '#27500A' },
    draft:     { bg: '#F3F3F1', fg: '#888888' },
    closed:    { bg: '#FCEBEB', fg: '#791F1F' },
    pending:   { bg: '#FAEEDA', fg: '#633806' },
    submitted: { bg: '#E1EBF5', fg: '#1E3A5F' },
    declined:  { bg: '#FCEBEB', fg: '#791F1F' },
  };
  const c = colors[status] || colors.draft;
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '3px 8px',
      borderRadius: 4, fontFamily: "'Figtree', sans-serif",
      background: c.bg, color: c.fg,
      flexShrink: 0, whiteSpace: 'nowrap', textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

const EMPTY_PKG_FORM = { name: '', description: '', scope: '', due_date: '' };
const EMPTY_INV_FORM = { email: '', name: '', company: '' };

export default function BiddingPanel({ project, user, totals, createItem, canEdit, mob }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [detailTab, setDetailTab] = useState('invitations');
  const [invitations, setInvitations] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showNewPkgForm, setShowNewPkgForm] = useState(false);
  const [pkgForm, setPkgForm] = useState(EMPTY_PKG_FORM);
  const [invForm, setInvForm] = useState(EMPTY_INV_FORM);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { loadPackages(); }, [project.id]);

  async function loadPackages() {
    setLoading(true);
    const { data, error } = await getBidPackages(project.id);
    if (error?.code === '42P01') { setTableError(true); setLoading(false); return; }
    setPackages(data || []);
    setLoading(false);
  }

  async function openPackage(pkg) {
    setSelectedPkg(pkg);
    setDetailTab('invitations');
    setMsg(null);
    setLoadingDetail(true);
    const [invRes, subRes] = await Promise.all([
      getBidInvitations(pkg.id),
      getBidSubmissions(pkg.id),
    ]);
    setInvitations(invRes.data || []);
    setSubmissions(subRes.data || []);
    setLoadingDetail(false);
  }

  async function createPackage(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/bid-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'create_package', projectId: project.id, ...pkgForm }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create package');
      analytics.bidPackageCreated(pkgForm.name);
      setPackages(prev => [body.data, ...prev]);
      setPkgForm(EMPTY_PKG_FORM);
      setShowNewPkgForm(false);
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function sendInvitation(e) {
    e.preventDefault();
    setSendingInvite(true);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/bid-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'create_invitation',
          packageId: selectedPkg.id,
          projectId: project.id,
          origin: window.location.origin,
          ...invForm,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to send invitation');
      setInvitations(prev => [...prev, body.data]);
      setInvForm(EMPTY_INV_FORM);
      setMsg({ ok: true, text: `Invite sent to ${invForm.email}` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSendingInvite(false);
    }
  }

  async function removeInvitation(invId) {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/bid-packages?id=${invId}&type=invitation`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setInvitations(prev => prev.filter(i => i.id !== invId));
  }

  async function deletePackage(pkgId) {
    if (!confirm('Delete this bid package and all its invitations and submissions?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/bid-packages?id=${pkgId}&type=package`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setPackages(prev => prev.filter(p => p.id !== pkgId));
    setSelectedPkg(null);
  }

  async function awardSubmission(sub) {
    const newVal = !sub.is_awarded;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/bid-submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: sub.id, is_awarded: newVal }),
    });
    if (res.ok) {
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, is_awarded: newVal } : s));
    }
  }

  async function applyBidToEstimate(sub) {
    if (!createItem) return;
    const label = [sub.submitter_company, sub.submitter_name].filter(Boolean).join(' · ') || 'Awarded Bid';
    await createItem({
      category: 'Subcontractor Bids',
      subcategory: selectedPkg.name,
      description: `${label} — ${selectedPkg.name}`,
      qtyMin: 1,
      qtyMax: 1,
      unit: 'LS',
      unitCostLow: sub.amount_low || 0,
      unitCostMid: sub.amount_mid || 0,
      unitCostHigh: sub.amount_high || 0,
      basis: `Bid from ${label}`,
      sensitivity: 'Medium',
      notes: sub.notes || null,
      inSummary: true,
    });
    await awardSubmission({ ...sub, is_awarded: false }); // toggle to awarded
    setMsg({ ok: true, text: `Applied ${label}'s bid to the cost estimate.` });
  }

  const INPUT = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    border: `1.5px solid ${BORDER}`, borderRadius: 6,
    fontFamily: "'Figtree', sans-serif", fontSize: 13, outline: 'none', background: '#fff',
  };

  // ── Error: migration not run ───────────────────────────────────────────────
  if (tableError) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🏗</div>
        <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: '#111', marginBottom: 8 }}>
          Database migration required
        </h2>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14, maxWidth: 440, margin: '0 auto 8px' }}>
          The bidding tables haven't been created yet. Run the migration in your Supabase SQL editor:
        </p>
        <code style={{ display: 'block', background: '#f5f5f3', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#444', maxWidth: 440, margin: '16px auto 0', textAlign: 'left' }}>
          supabase/migrations/20260418_bid_tables.sql
        </code>
      </div>
    );
  }

  // ── Package detail view ────────────────────────────────────────────────────
  if (selectedPkg) {
    const estimateMid = totals?.full?.m?.tot;
    const estimateLow = totals?.full?.l?.tot;
    const estimateHigh = totals?.full?.h?.tot;

    return (
      <div>
        {/* Breadcrumb + header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <button
              onClick={() => { setSelectedPkg(null); setMsg(null); }}
              style={{ background: 'none', border: 'none', padding: '0 0 8px', cursor: 'pointer', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← Bid Packages
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22, color: '#111', margin: 0 }}>
                {selectedPkg.name}
              </h2>
              <StatusBadge status={selectedPkg.status} />
            </div>
            {selectedPkg.scope && (
              <p style={{ margin: '6px 0 0', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#777', maxWidth: 600, lineHeight: 1.5 }}>
                {selectedPkg.scope}
              </p>
            )}
            {selectedPkg.due_date && (
              <p style={{ margin: '4px 0 0', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa' }}>
                Due {fmtDate(selectedPkg.due_date)}
              </p>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => deletePackage(selectedPkg.id)}
              style={{ background: 'none', border: `1px solid #fca5a5`, borderRadius: 6, padding: '6px 14px', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#dc2626', cursor: 'pointer' }}
            >
              Delete Package
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
          {['invitations', 'submissions'].map(tab => (
            <button
              key={tab}
              onClick={() => { setDetailTab(tab); setMsg(null); }}
              style={{
                padding: '9px 18px', fontSize: 11, fontFamily: "'Archivo', sans-serif",
                fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                background: 'transparent', border: 'none',
                borderBottom: detailTab === tab ? `3px solid ${ACCENT}` : '3px solid transparent',
                color: detailTab === tab ? '#111' : '#aaa',
                cursor: 'pointer',
              }}
            >
              {tab === 'invitations'
                ? `Invitations (${invitations.length})`
                : `Submissions (${submissions.length})`}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ marginBottom: 16, fontSize: 13, fontFamily: "'Figtree', sans-serif", color: msg.ok ? '#16a34a' : '#dc2626', padding: '8px 12px', borderRadius: 6, background: msg.ok ? '#f0fdf4' : '#fef2f2' }}>
            {msg.text}
          </div>
        )}

        {loadingDetail && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(n => <Skeleton key={n} height={40} />)}
          </div>
        )}

        {/* ── Invitations tab ─────────────────────────────────────────────── */}
        {!loadingDetail && detailTab === 'invitations' && (
          <div>
            {invitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 24px', background: '#fff', border: `1.5px dashed ${BORDER}`, borderRadius: 12, marginBottom: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📬</div>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#444', marginBottom: 6 }}>No invitations sent yet</div>
                <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#aaa' }}>
                  Invite subcontractors to submit pricing using the form below.
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Figtree', sans-serif" }}>
                  <thead>
                    <tr style={{ background: '#F9F9F8', borderBottom: `2px solid ${BORDER}` }}>
                      {['Email', 'Name', 'Company', 'Status', 'Sent', ''].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontFamily: "'Archivo', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#888', textTransform: 'uppercase' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '10px 14px', color: '#333' }}>{inv.email}</td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>{inv.name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>{inv.company || '—'}</td>
                        <td style={{ padding: '10px 14px' }}><StatusBadge status={inv.status} /></td>
                        <td style={{ padding: '10px 14px', color: '#aaa', fontSize: 12 }}>{inv.sent_at ? fmtDate(inv.sent_at) : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {canEdit && inv.status === 'pending' && (
                            <button
                              onClick={() => removeInvitation(inv.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1, padding: 0 }}
                              title="Remove invitation"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Invite form */}
            {canEdit && (
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 1, color: '#555', textTransform: 'uppercase', marginBottom: 14 }}>
                  Invite Subcontractor
                </div>
                <form onSubmit={sendInvitation} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                        Email <span style={{ color: '#CC4444' }}>*</span>
                      </label>
                      <input
                        type="email" required
                        value={invForm.email}
                        onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="sub@example.com"
                        style={INPUT}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={invForm.name}
                        onChange={e => setInvForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Jane Smith"
                        style={INPUT}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                        Company
                      </label>
                      <input
                        type="text"
                        value={invForm.company}
                        onChange={e => setInvForm(f => ({ ...f, company: e.target.value }))}
                        placeholder="ACME Construction"
                        style={INPUT}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={sendingInvite || !invForm.email.trim()}
                      style={{
                        background: sendingInvite || !invForm.email.trim() ? '#ddd' : ACCENT,
                        color: '#fff', border: 'none', borderRadius: 6,
                        padding: '8px 20px', fontFamily: "'Archivo', sans-serif",
                        fontWeight: 700, fontSize: 13,
                        cursor: sendingInvite || !invForm.email.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {sendingInvite ? 'Sending…' : 'Send Invitation'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── Submissions tab ──────────────────────────────────────────────── */}
        {!loadingDetail && detailTab === 'submissions' && (
          <div>
            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 24px', background: '#fff', border: `1.5px dashed ${BORDER}`, borderRadius: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#444', marginBottom: 6 }}>No bids received yet</div>
                <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#aaa' }}>
                  Bids will appear here once subcontractors submit via their invitation link.
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: mob ? 'auto' : 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Figtree', sans-serif", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: '#F9F9F8', borderBottom: `2px solid ${BORDER}` }}>
                      {['Company / Sub', 'Contact', 'Low', 'Base / Mid', 'High', 'Notes', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontFamily: "'Archivo', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#888', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(sub => (
                      <tr
                        key={sub.id}
                        style={{
                          borderBottom: `1px solid ${BORDER}`,
                          background: sub.is_awarded ? '#fffdf0' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#222' }}>
                          {sub.submitter_company || '—'}
                          {sub.is_awarded && <span style={{ marginLeft: 6, fontSize: 10, color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>AWARDED</span>}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>{sub.submitter_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(sub.amount_low)}</td>
                        <td style={{ padding: '10px 14px', color: '#1d4ed8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(sub.amount_mid)}</td>
                        <td style={{ padding: '10px 14px', color: '#d97706', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(sub.amount_high)}</td>
                        <td style={{ padding: '10px 14px', color: '#777', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.notes || ''}>
                          {sub.notes || '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, color: '#aaa' }}>
                            {fmtDate(sub.submitted_at)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {canEdit && (
                            <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => awardSubmission(sub)}
                                title={sub.is_awarded ? 'Remove award' : 'Mark as awarded'}
                                style={{
                                  background: sub.is_awarded ? '#fffdf0' : '#fafafa',
                                  border: `1px solid ${sub.is_awarded ? ACCENT : BORDER}`,
                                  borderRadius: 5, padding: '4px 10px',
                                  fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                                  fontSize: 10, letterSpacing: 0.5,
                                  color: sub.is_awarded ? ACCENT : '#888',
                                  cursor: 'pointer',
                                }}
                              >
                                {sub.is_awarded ? '★ Awarded' : 'Award'}
                              </button>
                              {createItem && (
                                <button
                                  onClick={() => applyBidToEstimate(sub)}
                                  title="Add this bid as a line item in the cost estimate"
                                  style={{
                                    background: '#fafafa', border: `1px solid ${BORDER}`,
                                    borderRadius: 5, padding: '4px 10px',
                                    fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                                    fontSize: 10, letterSpacing: 0.5, color: '#555',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Apply to Estimate
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Estimate comparison row */}
                    {estimateMid != null && (
                      <tr style={{ background: '#F9F9F8', borderTop: `2px solid ${BORDER}` }}>
                        <td colSpan={2} style={{ padding: '10px 14px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          Your Estimate (Scenario Total)
                        </td>
                        <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(estimateLow)}</td>
                        <td style={{ padding: '10px 14px', color: '#1d4ed8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(estimateMid)}</td>
                        <td style={{ padding: '10px 14px', color: '#d97706', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(estimateHigh)}</td>
                        <td colSpan={3} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Package list view ──────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22, color: '#111', margin: '0 0 6px' }}>
            Bid Packages
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888', margin: 0 }}>
            Create bid packages, invite subs, and collect competitive pricing.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowNewPkgForm(v => !v); setMsg(null); }}
            style={{
              background: showNewPkgForm ? '#f0f0ee' : ACCENT,
              color: showNewPkgForm ? '#555' : '#fff',
              border: showNewPkgForm ? `1px solid ${BORDER}` : 'none',
              borderRadius: 8, padding: '9px 18px',
              fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {showNewPkgForm ? 'Cancel' : '+ New Package'}
          </button>
        )}
      </div>

      {/* Create package form */}
      {showNewPkgForm && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#111', margin: '0 0 16px' }}>New Bid Package</h3>
          <form onSubmit={createPackage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '2fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Package Name <span style={{ color: '#CC4444' }}>*</span>
                </label>
                <input
                  type="text" required
                  value={pkgForm.name}
                  onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Mechanical / HVAC Systems"
                  style={INPUT}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Bid Due Date
                </label>
                <input
                  type="date"
                  value={pkgForm.due_date}
                  onChange={e => setPkgForm(f => ({ ...f, due_date: e.target.value }))}
                  style={INPUT}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Scope of Work
              </label>
              <textarea
                value={pkgForm.scope}
                onChange={e => setPkgForm(f => ({ ...f, scope: e.target.value }))}
                placeholder="Describe the scope, inclusions, exclusions, and any special requirements…"
                rows={3}
                style={{ ...INPUT, resize: 'vertical' }}
              />
            </div>
            {msg && (
              <div style={{ fontSize: 13, fontFamily: "'Figtree', sans-serif", color: '#dc2626', padding: '6px 10px', background: '#fef2f2', borderRadius: 5 }}>
                {msg.text}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setShowNewPkgForm(false); setPkgForm(EMPTY_PKG_FORM); setMsg(null); }}
                style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '8px 16px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#555', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !pkgForm.name.trim()}
                style={{
                  background: saving || !pkgForm.name.trim() ? '#d4b86a' : ACCENT,
                  color: '#fff', border: 'none', borderRadius: 7,
                  padding: '8px 20px', fontFamily: "'Archivo', sans-serif",
                  fontWeight: 700, fontSize: 13,
                  cursor: saving || !pkgForm.name.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Creating…' : 'Create Package'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Package list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(n => <Skeleton key={n} height={56} radius={12} />)}
        </div>
      ) : packages.length === 0 && !showNewPkgForm ? (
        <EmptyState
          icon={Handshake}
          title="No bid packages yet"
          body="Group scope items into a bid package, invite trade partners, and collect competitive pricing."
          action={canEdit && (
            <Button variant="primary" onClick={() => setShowNewPkgForm(true)}>+ Create Bid Package</Button>
          )}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {packages.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} onOpen={() => openPackage(pkg)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg, onOpen }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? '#D9D9D5' : BORDER}`,
        borderRadius: 12, padding: '18px 22px',
        textAlign: 'left', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', boxShadow: hovered ? '0 2px 12px rgba(184,144,48,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#111' }}>
            {pkg.name}
          </span>
          <StatusBadge status={pkg.status} />
        </div>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#999', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
          {pkg.due_date && <span>Due {fmtDate(pkg.due_date)}</span>}
          {pkg.scope && <span>· {pkg.scope.slice(0, 80)}{pkg.scope.length > 80 ? '…' : ''}</span>}
        </div>
      </div>
      <span style={{ color: '#888', fontSize: 22, fontWeight: 300, marginLeft: 16, flexShrink: 0 }}>›</span>
    </button>
  );
}
