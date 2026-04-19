import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { FONTS, COLORS } from '../data/constants';
import { Skeleton } from './ui';

const ACCENT = '#B89030';
const BORDER = '#E5E5E2';

const EVENT_TYPE_META = {
  original_budget:       { label: 'Original Budget',       bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  budget_amendment:      { label: 'Budget Amendment',       bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  ve_adjustment:         { label: 'VE Adjustment',          bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  change_order:          { label: 'Change Order',           bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  contingency_draw:      { label: 'Contingency Draw',       bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  scope_change:          { label: 'Scope Change',           bg: '#faf5ff', color: '#6b21a8', border: '#d8b4fe' },
  escalation_adjustment: { label: 'Escalation Adjustment',  bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
};

const LOG_TYPES = [
  { value: 'budget_amendment',    label: 'Budget Amendment' },
  { value: 've_adjustment',       label: 'VE Adjustment' },
  { value: 'change_order',        label: 'Change Order' },
  { value: 'contingency_draw',    label: 'Contingency Draw' },
  { value: 'scope_change',        label: 'Scope Change' },
  { value: 'escalation_adjustment', label: 'Escalation Adjustment' },
];

function fmt(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${Math.round(abs).toLocaleString()}`;
  return `$${Math.round(abs).toLocaleString()}`;
}
function fmtSigned(n) {
  if (!n && n !== 0) return '—';
  return (n >= 0 ? '+' : '-') + fmt(n);
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Waterfall Chart ───────────────────────────────────────────────────────────

function WaterfallChart({ originalBudget, events, currentBudget }) {
  const allValues = [originalBudget, currentBudget, ...events.map(e => Math.abs(e.amount))].filter(Boolean);
  const maxVal = Math.max(...allValues, 1);

  const bars = [
    { label: 'Original Budget', value: originalBudget, color: '#1e40af', type: 'base' },
    ...events.map(e => ({
      label: (EVENT_TYPE_META[e.type]?.label || e.type).replace('Adjustment', 'Adj.'),
      value: e.amount,
      color: e.amount < 0 ? '#166534' : '#991b1b',
      type: e.amount < 0 ? 'savings' : 'increase',
      description: e.description,
    })),
    { label: 'Current Budget', value: currentBudget, color: '#1e40af', type: 'base' },
  ];

  return (
    <div style={{ marginTop: 8, overflowX: 'auto' }}>
      <div style={{ minWidth: 400 }}>
        {bars.map((bar, i) => {
          const pct = Math.min(Math.abs(bar.value) / maxVal * 100, 100);
          const isBase = bar.type === 'base';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 110, flexShrink: 0, fontFamily: FONTS.body, fontSize: 10, color: '#666', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bar.description || bar.label}>
                {bar.label}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 18, background: '#f0f0ee', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: bar.color,
                  opacity: isBase ? 0.7 : 0.85,
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ width: 80, flexShrink: 0, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: bar.type === 'savings' ? '#166534' : bar.type === 'increase' ? '#991b1b' : '#1e40af', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {isBase ? fmt(bar.value) : fmtSigned(bar.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main BudgetTracker ────────────────────────────────────────────────────────

export default function BudgetTracker({ project, totals, canEdit, user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ type: 'budget_amendment', description: '', amount: '', event_date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const { data, error } = await supabase
        .from('budget_events')
        .select('*')
        .eq('project_id', project.id)
        .order('event_date', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) {
        if (error.code === '42P01') setTableError(true);
        else console.error('[BudgetTracker] load error:', error);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error('[BudgetTracker] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (project?.id) loadEvents(); }, [project?.id]);

  const set = k => v => setLogForm(f => ({ ...f, [k]: v }));

  const summary = useMemo(() => {
    const originalBudget = project.target_budget || 0;
    const totalAdjustments = events.reduce((s, e) => s + (e.amount || 0), 0);
    const currentBudget = originalBudget + totalAdjustments;
    const currentEstimate = totals?.full?.m?.tot || 0;
    const variance = currentBudget - currentEstimate;
    return { originalBudget, totalAdjustments, currentBudget, currentEstimate, variance };
  }, [events, project.target_budget, totals]);

  const logEvent = async e => {
    e.preventDefault();
    if (!logForm.description.trim() || !logForm.amount || saving) return;
    setSaving(true);
    const amount = parseFloat(logForm.amount) || 0;
    const running_total = summary.currentBudget + amount;
    const { data, error } = await supabase.from('budget_events').insert({
      project_id: project.id,
      type: logForm.type,
      description: logForm.description.trim(),
      amount,
      running_total,
      event_date: logForm.event_date,
      created_by: user?.id || null,
    }).select().single();
    if (!error && data) {
      setEvents(prev => [...prev, data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
      setLogForm({ type: 'budget_amendment', description: '', amount: '', event_date: new Date().toISOString().slice(0, 10) });
      setShowLogForm(false);
    }
    setSaving(false);
  };

  const deleteEvent = async id => {
    await supabase.from('budget_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  if (tableError) return null; // silently hide if table doesn't exist yet

  const { originalBudget, totalAdjustments, currentBudget, currentEstimate, variance } = summary;
  const budgetPct = currentBudget > 0 ? (currentEstimate / currentBudget) * 100 : 0;
  const isOverBudget = variance < 0;
  const isNearBudget = !isOverBudget && budgetPct >= 90;

  const summaryCards = [
    { label: 'Original Budget', value: originalBudget, color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Total Adjustments', value: totalAdjustments, signed: true, color: totalAdjustments >= 0 ? '#991b1b' : '#166534', bg: totalAdjustments >= 0 ? '#fef2f2' : '#f0fdf4', border: totalAdjustments >= 0 ? '#fecaca' : '#bbf7d0' },
    { label: 'Current Budget', value: currentBudget, color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Current Estimate', value: currentEstimate, color: COLORS.gn, bg: '#fffbf0', border: '#E5E5E2' },
    {
      label: isOverBudget ? 'Over Budget' : 'Under Budget',
      value: Math.abs(variance),
      color: isOverBudget ? '#991b1b' : '#166534',
      bg: isOverBudget ? '#fef2f2' : '#f0fdf4',
      border: isOverBudget ? '#fecaca' : '#bbf7d0',
    },
  ];

  return (
    <div style={{ gridColumn: '1/-1', background: COLORS.sf, border: `1px solid #E5E5E2`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2 }}>
          Budget Tracker
        </div>
        {canEdit && (
          <button
            onClick={() => setShowLogForm(v => !v)}
            style={{ background: showLogForm ? '#f0f0ee' : ACCENT, color: showLogForm ? '#555' : '#fff', border: showLogForm ? '1px solid #ddd' : 'none', borderRadius: 6, padding: '5px 14px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
          >
            {showLogForm ? 'Cancel' : '+ Log Event'}
          </button>
        )}
      </div>

      {/* Alert banners */}
      {isOverBudget && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, padding: '8px 12px', marginBottom: 10, fontFamily: FONTS.body, fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
          ⚠ Estimate exceeds budget by {fmt(Math.abs(variance))} ({budgetPct.toFixed(0)}% of budget)
        </div>
      )}
      {isNearBudget && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '8px 12px', marginBottom: 10, fontFamily: FONTS.body, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
          ⚡ Estimate is at {budgetPct.toFixed(0)}% of budget — approaching limit
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 8, marginBottom: 14 }}>
        {summaryCards.map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: card.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
              {card.label}
            </div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 15, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
              {card.signed ? fmtSigned(card.value) : fmt(card.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Budget progress bar */}
      {originalBudget > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: FONTS.body, fontSize: 10, color: '#888' }}>Estimate vs Budget</span>
            <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10, color: isOverBudget ? '#991b1b' : '#166534' }}>{budgetPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`, background: isOverBudget ? '#ef4444' : budgetPct >= 90 ? '#f59e0b' : '#22c55e', borderRadius: 5, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Log event form */}
      {showLogForm && (
        <form onSubmit={logEvent} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</label>
              <select value={logForm.type} onChange={e => set('type')(e.target.value)} style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px', fontFamily: FONTS.body, fontSize: 12, background: '#fff', outline: 'none' }}>
                {LOG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description *</label>
              <input required value={logForm.description} onChange={e => set('description')(e.target.value)} placeholder="What changed and why?" style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px', fontFamily: FONTS.body, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount (+ increase / - decrease)</label>
              <input required type="number" value={logForm.amount} onChange={e => set('amount')(e.target.value)} placeholder="-125000" style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px', fontFamily: FONTS.body, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</label>
              <input type="date" value={logForm.event_date} onChange={e => set('event_date')(e.target.value)} style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px', fontFamily: FONTS.body, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => setShowLogForm(false)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 14px', fontFamily: FONTS.body, fontSize: 12, color: '#555', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ background: saving ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Logging…' : 'Log Event'}
            </button>
          </div>
        </form>
      )}

      {/* Waterfall chart */}
      {(events.length > 0 || originalBudget > 0) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Budget Waterfall</div>
          <WaterfallChart originalBudget={originalBudget} events={events} currentBudget={currentBudget} />
        </div>
      )}

      {/* Events timeline */}
      {loading ? (
        <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1,2,3].map(n => <Skeleton key={n} height={24} />)}
        </div>
      ) : events.length === 0 ? (
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#aaa', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
          No budget events logged.{canEdit && ' Click "+ Log Event" to track changes.'}
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Event Timeline</div>
          {events.map(ev => {
            const meta = EVENT_TYPE_META[ev.type] || EVENT_TYPE_META.budget_amendment;
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: FONTS.body, fontSize: 11, color: '#888', flexShrink: 0, minWidth: 80 }}>{fmtDate(ev.event_date)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: FONTS.heading, flexShrink: 0 }}>
                  {meta.label}
                </span>
                <span style={{ flex: 1, fontFamily: FONTS.body, fontSize: 12, color: '#444', minWidth: 0 }}>{ev.description}</span>
                <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, color: (ev.amount || 0) < 0 ? '#166534' : '#991b1b', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {fmtSigned(ev.amount)}
                </span>
                <span style={{ fontFamily: FONTS.body, fontSize: 11, color: '#888', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(ev.running_total)}</span>
                {canEdit && (
                  <button onClick={() => deleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 12, padding: 0, flexShrink: 0 }}>×</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
