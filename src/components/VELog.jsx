import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { FONTS, COLORS } from '../data/constants';
import { Skeleton, EmptyState, Button } from './ui';
import { TrendingDown } from 'lucide-react';

const ACCENT = '#B89030';
const BORDER = '#E5E5E2';
const BG     = '#F9F9F8';

const VE_CATEGORIES = [
  'Material Substitution', 'System Redesign', 'Scope Reduction',
  'Constructability', 'Schedule Optimization', 'Design Simplification',
];

// Aligned with BADGE_STYLES tokens — neutral/info/success/warning/danger palette
const STATUS_META = {
  proposed:     { label: 'Proposed',     bg: '#F3F3F1', color: '#888888' },
  under_review: { label: 'Under Review', bg: '#E1EBF5', color: '#1E3A5F' },
  approved:     { label: 'Approved',     bg: '#EAF3DE', color: '#27500A' },
  rejected:     { label: 'Rejected',     bg: '#FCEBEB', color: '#791F1F' },
  deferred:     { label: 'Deferred',     bg: '#FAEEDA', color: '#633806' },
  implemented:  { label: 'Implemented',  bg: '#FBF5E8', color: '#8A6820' },
};

const RISK_META = {
  low:    { label: 'Low',    bg: '#EAF3DE', color: '#27500A' },
  medium: { label: 'Medium', bg: '#FAEEDA', color: '#633806' },
  high:   { label: 'High',   bg: '#FCEBEB', color: '#791F1F' },
};

const BUDGET_EVENT_TYPES = [
  { value: 've_adjustment',       label: 'VE Adjustment' },
  { value: 'budget_amendment',    label: 'Budget Amendment' },
  { value: 'change_order',        label: 'Change Order' },
  { value: 'contingency_draw',    label: 'Contingency Draw' },
  { value: 'scope_change',        label: 'Scope Change' },
  { value: 'escalation_adjustment', label: 'Escalation Adjustment' },
];

function fmt(n) {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${Math.round(Math.abs(n)).toLocaleString()}`;
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}
function fmtSigned(n) {
  if (n === 0 || !n) return '$0';
  return (n < 0 ? '-' : '+') + fmt(n);
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Badge({ label, meta = {} }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 500,
      padding: '3px 8px', borderRadius: 4, fontFamily: FONTS.body,
      background: meta.bg || '#F3F3F1', color: meta.color || '#888',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── New VE Item Form ──────────────────────────────────────────────────────────

function NewVEItemForm({ nextNumber, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'Scope Reduction',
    risk_level: 'low', cost_impact: '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    await onSave({
      ...form,
      title: form.title.trim(),
      ve_number: nextNumber,
      cost_impact: parseFloat(form.cost_impact) || 0,
    });
    setSaving(false);
  };

  const inp = {
    width: '100%', border: `1.5px solid ${BORDER}`, borderRadius: 7,
    padding: '8px 11px', fontFamily: FONTS.body, fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>
        New VE Item — #{nextNumber}
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Title *</label>
            <input type="text" required autoFocus value={form.title} onChange={e => set('title')(e.target.value)} placeholder="e.g. Substitute curtain wall with storefront system" style={inp} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description')(e.target.value)} placeholder="Describe the VE strategy and rationale…" style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Category</label>
            <select value={form.category} onChange={e => set('category')(e.target.value)} style={{ ...inp, background: '#fff', cursor: 'pointer' }}>
              {VE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Risk Level</label>
            <select value={form.risk_level} onChange={e => set('risk_level')(e.target.value)} style={{ ...inp, background: '#fff', cursor: 'pointer' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Estimated Cost Impact ($, negative = savings)</label>
            <input type="number" value={form.cost_impact} onChange={e => set('cost_impact')(e.target.value)} placeholder="-125000" style={inp} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 7, padding: '8px 18px', fontFamily: FONTS.body, fontSize: 13, color: '#555', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={saving || !form.title.trim()} style={{ background: saving ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 20px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create VE Item'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── VE Item Detail ────────────────────────────────────────────────────────────

function VEItemDetail({ item, allItems, user, canEdit, onStatusChange, onClose, onRefresh }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState(item.notes || '');
  const [showAddLine, setShowAddLine] = useState(false);
  const [addLineForm, setAddLineForm] = useState({ line_item_id: '', proposed_cost: '' });
  const [aiImpact, setAiImpact] = useState(item.ai_impact || null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => { loadLines(); }, [item.id]);

  const loadLines = async () => {
    setLoading(true);
    const { data } = await supabase.from('ve_item_lines').select('*').eq('ve_item_id', item.id);
    setLines(data || []);
    setLoading(false);
  };

  const addLine = async () => {
    if (!addLineForm.proposed_cost) return;
    const origItem = allItems.find(i => i.id === addLineForm.line_item_id);
    const current_cost = origItem
      ? ((origItem.qtyMin + origItem.qtyMax) / 2) * (origItem.unitCostMid || 0)
      : 0;
    await supabase.from('ve_item_lines').insert({
      ve_item_id: item.id,
      line_item_id: addLineForm.line_item_id || null,
      description: origItem?.description || 'Manual entry',
      current_cost,
      proposed_cost: parseFloat(addLineForm.proposed_cost) || 0,
    });
    setAddLineForm({ line_item_id: '', proposed_cost: '' });
    setShowAddLine(false);
    loadLines();
  };

  const deleteLine = async (lineId) => {
    await supabase.from('ve_item_lines').delete().eq('id', lineId);
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await supabase.from('ve_items').update({ notes, updated_at: new Date().toISOString() }).eq('id', item.id);
    setSavingNotes(false);
  };

  const analyzeImpact = async () => {
    setLoadingImpact(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/ve-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ veItem: item, affectedLines: lines, allItems, project: {} }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiImpact(data);
      await supabase.from('ve_items').update({ ai_impact: data, updated_at: new Date().toISOString() }).eq('id', item.id);
    } catch (err) {
      console.error('[VELog] analyzeImpact error:', err);
    } finally {
      setLoadingImpact(false);
    }
  };

  const netDelta = lines.reduce((s, l) => s + (l.delta || 0), 0);

  const statusWorkflow = {
    proposed:     [{ to: 'under_review', label: 'Submit for Review', color: '#1e40af' }],
    under_review: [
      { to: 'approved',  label: 'Approve',  color: '#166534' },
      { to: 'rejected',  label: 'Reject',   color: '#991b1b' },
      { to: 'deferred',  label: 'Defer',    color: '#92400e' },
    ],
    approved:  [{ to: 'implemented', label: 'Mark Implemented', color: '#6b21a8' }],
    deferred:  [{ to: 'under_review', label: 'Re-submit', color: '#1e40af' }],
    rejected:  [{ to: 'proposed',    label: 'Reset to Proposed', color: '#44403c' }],
    implemented: [],
  };

  const sm = STATUS_META[item.status] || STATUS_META.proposed;

  return (
    <div style={{ background: '#fafaf8', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px', marginTop: 4 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 15, color: '#111' }}>
            VE #{item.ve_number} — {item.title}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Badge label={item.category} meta={{ bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' }} />
            <Badge label={sm.label} meta={sm} />
            <Badge label={RISK_META[item.risk_level]?.label || item.risk_level} meta={RISK_META[item.risk_level] || {}} />
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>

      {/* Description */}
      {item.description && (
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
          {item.description}
        </div>
      )}

      {/* Affected Line Items */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Affected Line Items
          {netDelta !== 0 && (
            <span style={{ marginLeft: 10, fontFamily: FONTS.body, fontWeight: 700, fontSize: 12, color: netDelta < 0 ? '#166534' : '#991b1b', textTransform: 'none' }}>
              Net: {fmtSigned(netDelta)}
            </span>
          )}
        </div>
        {loading ? (
          <div style={{ padding: 8 }}>
            <Skeleton height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={14} />
          </div>
        ) : lines.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 12, fontStyle: 'italic' }}>No line items linked yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONTS.body }}>
            <thead>
              <tr style={{ background: '#222', color: '#fff' }}>
                {['Description', 'Current Cost', 'Proposed Cost', 'Delta', ''].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Delta' || h === 'Current Cost' || h === 'Proposed Cost' ? 'right' : 'left', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, letterSpacing: 0.8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f8' }}>
                  <td style={{ padding: '6px 8px' }}>{line.description || '—'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(line.current_cost)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(line.proposed_cost)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: (line.delta || 0) <= 0 ? '#166534' : '#991b1b' }}>
                    {fmtSigned(line.delta || 0)}
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    {canEdit && <button onClick={() => deleteLine(line.id)} style={{ background: 'none', border: 'none', color: '#d44', cursor: 'pointer', fontSize: 12 }}>×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canEdit && (
          showAddLine ? (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <select
                value={addLineForm.line_item_id}
                onChange={e => setAddLineForm(f => ({ ...f, line_item_id: e.target.value }))}
                style={{ flex: '2 1 200px', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px', fontFamily: FONTS.body, fontSize: 12, outline: 'none' }}
              >
                <option value="">— No linked item (manual) —</option>
                {allItems.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.category} › {i.description} (${Math.round(((i.qtyMin + i.qtyMax) / 2) * (i.unitCostMid || 0)).toLocaleString()})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Proposed cost"
                value={addLineForm.proposed_cost}
                onChange={e => setAddLineForm(f => ({ ...f, proposed_cost: e.target.value }))}
                style={{ flex: '1 1 120px', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px', fontFamily: FONTS.body, fontSize: 12, outline: 'none' }}
              />
              <button onClick={addLine} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowAddLine(false)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', fontFamily: FONTS.body, fontSize: 12, color: '#555', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAddLine(true)} style={{ marginTop: 6, background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 6, padding: '5px 0', width: '100%', fontFamily: FONTS.body, fontSize: 12, color: '#999', cursor: 'pointer' }}>
              + Link Line Item
            </button>
          )
        )}
      </div>

      {/* AI Cross-Trade Impact */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 1 }}>
            Cross-Trade Impact Analysis
          </div>
          <button
            onClick={analyzeImpact}
            disabled={loadingImpact}
            style={{
              background: loadingImpact ? '#f5f0e8' : '#fffbf0',
              border: `1px solid ${loadingImpact ? '#d4b86a' : ACCENT}`,
              color: loadingImpact ? '#b89030aa' : ACCENT,
              borderRadius: 6, padding: '3px 12px',
              fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10, cursor: loadingImpact ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingImpact ? '⟳ Analyzing…' : '✦ Analyze Impact'}
          </button>
        </div>
        {aiImpact ? (
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px' }}>
            {aiImpact.summary && (
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#444', marginBottom: 8, lineHeight: 1.5 }}>
                {aiImpact.summary}
              </div>
            )}
            {aiImpact.cross_trade_impacts?.map((impact, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '4px 0', borderBottom: i < aiImpact.cross_trade_impacts.length - 1 ? `1px solid ${BORDER}` : 'none', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 11, color: '#555' }}>{impact.trade}: {impact.description}</span>
                  <span style={{ marginLeft: 6, fontSize: 9, color: '#aaa' }}>({impact.confidence} confidence)</span>
                </div>
                <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, color: (impact.estimated_delta || 0) <= 0 ? '#166534' : '#991b1b', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {fmtSigned(impact.estimated_delta || 0)}
                </span>
              </div>
            ))}
            {aiImpact.net_adjusted_savings !== undefined && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, color: (aiImpact.net_adjusted_savings || 0) <= 0 ? '#166534' : '#991b1b' }}>
                <span>Net Adjusted Savings</span>
                <span>{fmtSigned(aiImpact.net_adjusted_savings)}</span>
              </div>
            )}
            {aiImpact.risks?.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: FONTS.body, fontSize: 11, color: '#92400e', background: '#fffbeb', borderRadius: 6, padding: '6px 10px' }}>
                ⚠ {aiImpact.risks.join(' · ')}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
            Click "Analyze Impact" to identify cross-trade effects with AI.
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          disabled={!canEdit}
          rows={3}
          placeholder="Discussion notes, conditions, questions…"
          style={{ width: '100%', border: `1.5px solid ${BORDER}`, borderRadius: 7, padding: '7px 10px', fontFamily: FONTS.body, fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
        />
        {savingNotes && <span style={{ fontSize: 10, color: '#16a34a', fontFamily: FONTS.body }}>✓ Saved</span>}
      </div>

      {/* Status workflow */}
      {canEdit && (statusWorkflow[item.status] || []).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(statusWorkflow[item.status] || []).map(action => (
            <button
              key={action.to}
              onClick={() => onStatusChange(item.id, action.to)}
              style={{
                background: action.color, color: '#fff', border: 'none',
                borderRadius: 7, padding: '8px 18px',
                fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI Suggestions Modal ──────────────────────────────────────────────────────

function SuggestionsModal({ suggestions, onAddItem, onClose, loadingItems }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: '24px 24px 20px', maxWidth: 740, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 12px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 17, color: '#111' }}>AI VE Suggestions</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginTop: 2 }}>Ranked by estimated savings. Click "Add" to create a VE item.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {suggestions.map((s, i) => (
          <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: '#111' }}>
                    {i + 1}. {s.title}
                  </span>
                  <Badge label={s.category} meta={{ bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' }} />
                  <Badge label={RISK_META[s.risk_level]?.label || s.risk_level} meta={RISK_META[s.risk_level] || {}} />
                </div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: s.affected_items?.length ? 6 : 0 }}>{s.description}</div>
                {s.affected_items?.length > 0 && (
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: '#888' }}>
                    Affects: {s.affected_items.slice(0, 3).join(', ')}{s.affected_items.length > 3 ? ` +${s.affected_items.length - 3} more` : ''}
                  </div>
                )}
                {s.notes && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: '#92400e', marginTop: 4 }}>⚠ {s.notes}</div>}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 16, color: '#166534', marginBottom: 6 }}>
                  -{fmt(s.estimated_savings)}
                </div>
                <button
                  onClick={() => onAddItem(s)}
                  disabled={loadingItems[i]}
                  style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                >
                  {loadingItems[i] ? 'Adding…' : '+ Add'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main VELog Component ──────────────────────────────────────────────────────

export default function VELog({ project, active, items = [], canEdit, user, scenarios = [], addScenario, updateItem }) {
  const [veItems, setVeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestLoadingItems, setSuggestLoadingItems] = useState({});
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState(null);

  const loadVeItems = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const { data, error } = await supabase
        .from('ve_items')
        .select('*')
        .eq('project_id', project.id)
        .order('ve_number', { ascending: true });
      if (error) {
        if (error.code === '42P01') setTableError(true);
        else console.error('[VELog] load error:', error);
        setVeItems([]);
      } else {
        setVeItems(data || []);
      }
    } catch (err) {
      console.error('[VELog] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (project?.id) loadVeItems(); }, [project?.id]);

  const stats = useMemo(() => {
    const byStatus = {};
    let totalPotential = 0, totalApproved = 0;
    for (const v of veItems) {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
      if (['proposed', 'under_review'].includes(v.status)) totalPotential += Math.abs(Math.min(0, v.cost_impact || 0));
      if (v.status === 'approved') totalApproved += Math.abs(Math.min(0, v.cost_impact || 0));
    }
    return { byStatus, totalPotential, totalApproved };
  }, [veItems]);

  const nextVeNumber = veItems.length > 0 ? Math.max(...veItems.map(v => v.ve_number)) + 1 : 1;
  const selectedItem = veItems.find(v => v.id === selectedId) || null;

  const createVeItem = async (formData) => {
    const { data, error } = await supabase
      .from('ve_items')
      .insert({
        project_id: project.id,
        scenario_id: active?.id || null,
        proposed_by: user?.id || null,
        ...formData,
      })
      .select()
      .single();
    if (!error && data) {
      setVeItems(prev => [...prev, data]);
      setShowNewForm(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (['approved', 'rejected'].includes(newStatus)) updates.reviewed_by = user?.id;
    const { data } = await supabase.from('ve_items').update(updates).eq('id', id).select().single();
    if (data) {
      setVeItems(prev => prev.map(v => v.id === id ? data : v));
      // On approval, (a) auto-log budget event, (b) offer to apply pricing to linked line items
      if (newStatus === 'approved') {
        const veItem = veItems.find(v => v.id === id);
        if (veItem && veItem.cost_impact) {
          const lastEvent = await getLastBudgetTotal();
          await supabase.from('budget_events').insert({
            project_id: project.id,
            type: 've_adjustment',
            description: `VE #${veItem.ve_number}: ${veItem.title}`,
            amount: veItem.cost_impact,
            running_total: lastEvent + veItem.cost_impact,
            created_by: user?.id,
            event_date: new Date().toISOString().slice(0, 10),
          });
        }
        // Fetch linked line items for this VE; if any have proposed costs, confirm + apply
        const { data: lines } = await supabase
          .from('ve_item_lines')
          .select('*')
          .eq('ve_item_id', id);
        const applicable = (lines || []).filter(l => l.line_item_id && l.proposed_cost);
        if (applicable.length && updateItem) {
          const ok = window.confirm(`Apply approved VE pricing to ${applicable.length} line item${applicable.length === 1 ? '' : 's'}?`);
          if (ok) {
            for (const line of applicable) {
              const it = items.find(i => i.id === line.line_item_id);
              if (!it) continue;
              const qtyMid = ((it.qtyMin || 0) + (it.qtyMax || 0)) / 2 || 1;
              const newUnitMid = Number(line.proposed_cost) / qtyMid;
              if (isFinite(newUnitMid)) {
                await updateItem(line.line_item_id, 'unitCostMid', newUnitMid);
              }
            }
          }
        }
      }
    }
  };

  const getLastBudgetTotal = async () => {
    const { data } = await supabase
      .from('budget_events')
      .select('running_total')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data?.running_total ?? (project.target_budget || 0);
  };

  const findSavings = async () => {
    setLoadingSuggestions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/ve-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items, project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('[VELog] findSavings error:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addSuggestionAsItem = async (suggestion, idx) => {
    setSuggestLoadingItems(prev => ({ ...prev, [idx]: true }));
    await createVeItem({
      title: suggestion.title,
      description: `${suggestion.description}${suggestion.notes ? '\n\nNote: ' + suggestion.notes : ''}`,
      category: suggestion.category,
      risk_level: suggestion.risk_level,
      cost_impact: -(suggestion.estimated_savings || 0),
      ve_number: nextVeNumber + idx,
    });
    setSuggestLoadingItems(prev => ({ ...prev, [idx]: false }));
  };

  const applyApprovedVE = async () => {
    const approvedItems = veItems.filter(v => v.status === 'approved');
    if (!approvedItems.length) { setApplyMsg('No approved VE items to apply.'); return; }
    setApplying(true);
    setApplyMsg(null);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const newScenarioId = await addScenario(`VE Option — ${dateStr}`);
      if (!newScenarioId) throw new Error('Could not create VE scenario');

      // Load new scenario line items
      const { data: newLineItems } = await supabase
        .from('line_items')
        .select('id, sort_order')
        .eq('scenario_id', newScenarioId)
        .order('sort_order');

      // Load baseline line items for mapping
      const baseline = scenarios.find(s => s.is_baseline) || scenarios[0];
      const { data: baseItems } = await supabase
        .from('line_items')
        .select('id, sort_order, qty_min, qty_max, unit_cost_mid')
        .eq('scenario_id', baseline?.id)
        .order('sort_order');

      // Build sort_order map: original_sort_order → new item
      const sortMap = {};
      (baseItems || []).forEach(bi => { sortMap[bi.sort_order] = bi; });
      const newSortMap = {};
      (newLineItems || []).forEach(ni => { newSortMap[ni.sort_order] = ni; });

      // Apply approved VE changes
      for (const veItem of approvedItems) {
        const { data: veLines } = await supabase.from('ve_item_lines').select('*').eq('ve_item_id', veItem.id);
        for (const line of veLines || []) {
          const origBase = (baseItems || []).find(bi => bi.id === line.line_item_id);
          if (!origBase) continue;
          const newItem = newSortMap[origBase.sort_order];
          if (!newItem) continue;
          const qtyMid = (origBase.qty_min + origBase.qty_max) / 2 || 1;
          const newUnitCostMid = line.proposed_cost / qtyMid;
          await supabase.from('line_items').update({ unit_cost_mid: newUnitCostMid }).eq('id', newItem.id);
        }
      }

      setApplyMsg(`✓ Created scenario "VE Option — ${dateStr}". Switch to Compare tab to view it.`);
    } catch (err) {
      console.error('[VELog] applyApprovedVE error:', err);
      setApplyMsg(`Error: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  if (tableError) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: FONTS.body, fontSize: 13, color: '#888' }}>
        Run the migration: <code>supabase/migrations/20260419_ve_budget_tables.sql</code>
      </div>
    );
  }

  const approvedCount = stats.byStatus.approved || 0;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4px 0', fontFamily: FONTS.body }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 20, color: '#111' }}>Value Engineering Log</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginTop: 2 }}>{veItems.length} item{veItems.length !== 1 ? 's' : ''} · {active?.name}</div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={findSavings}
              disabled={loadingSuggestions}
              style={{ background: '#fffbf0', border: `1px solid ${ACCENT}`, color: ACCENT, borderRadius: 8, padding: '8px 16px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: loadingSuggestions ? 'not-allowed' : 'pointer' }}
            >
              {loadingSuggestions ? '⟳ Finding…' : '✦ Find Savings'}
            </button>
            <button
              onClick={() => { setShowNewForm(true); setSelectedId(null); }}
              style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              + New VE Item
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {Object.entries(STATUS_META).map(([status, meta]) => (
          (stats.byStatus[status] || 0) > 0 && (
            <div key={status} style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 20, color: meta.color }}>{stats.byStatus[status]}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 10, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>{meta.label}</div>
            </div>
          )
        ))}
        {stats.totalApproved > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 16, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>-{fmt(stats.totalApproved)}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>Approved Savings</div>
          </div>
        )}
        {stats.totalPotential > 0 && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 16, color: '#1e40af', fontVariantNumeric: 'tabular-nums' }}>-{fmt(stats.totalPotential)}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>Potential Savings</div>
          </div>
        )}
      </div>

      {/* Apply approved VE */}
      {approvedCount > 0 && canEdit && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#166534' }}>
            {approvedCount} approved VE item{approvedCount !== 1 ? 's' : ''} ready to apply.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {applyMsg && <span style={{ fontFamily: FONTS.body, fontSize: 12, color: applyMsg.startsWith('Error') ? '#991b1b' : '#166534' }}>{applyMsg}</span>}
            <button
              onClick={applyApprovedVE}
              disabled={applying}
              style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: applying ? 'not-allowed' : 'pointer' }}
            >
              {applying ? 'Applying…' : 'Apply Approved VE →'}
            </button>
          </div>
        </div>
      )}

      {/* New item form */}
      {showNewForm && (
        <NewVEItemForm nextNumber={nextVeNumber} onSave={createVeItem} onClose={() => setShowNewForm(false)} />
      )}

      {/* Items list */}
      {loading ? (
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(n => <Skeleton key={n} height={44} radius={8} />)}
        </div>
      ) : veItems.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="No value engineering items yet"
          body="Start tracking VE opportunities or let AI find savings across your estimate."
          action={canEdit && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => setShowNewForm(true)}>+ New VE Item</Button>
              <Button variant="secondary" onClick={findSavings} disabled={loadingSuggestions}>✦ Find Savings with AI</Button>
            </div>
          )}
        />
      ) : (
        <>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 130px 110px 100px 120px', gap: 8, padding: '6px 14px', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>
            <div>#</div><div>Title</div><div>Category</div><div>Status</div><div>Risk</div><div style={{ textAlign: 'right' }}>Cost Impact</div>
          </div>

          {veItems.map(v => {
            const sm = STATUS_META[v.status] || STATUS_META.proposed;
            const rm = RISK_META[v.risk_level] || RISK_META.low;
            const isSelected = selectedId === v.id;
            return (
              <div key={v.id} style={{ marginBottom: 6 }}>
                <div
                  onClick={() => setSelectedId(isSelected ? null : v.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '48px 1fr 130px 110px 100px 120px',
                    gap: 8, padding: '12px 14px', background: '#fff',
                    border: `1px solid ${isSelected ? ACCENT : BORDER}`,
                    borderRadius: 8, cursor: 'pointer', alignItems: 'center',
                    transition: 'border-color 0.1s',
                  }}
                >
                  <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: ACCENT }}>#{v.ve_number}</span>
                  <div>
                    <div style={{ fontFamily: FONTS.heading, fontWeight: 600, fontSize: 13, color: '#111' }}>{v.title}</div>
                    {v.description && (
                      <div style={{ fontFamily: FONTS.body, fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description}</div>
                    )}
                  </div>
                  <Badge label={v.category.split(' ')[0]} meta={{ bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' }} />
                  <Badge label={sm.label} meta={sm} />
                  <Badge label={rm.label} meta={rm} />
                  <div style={{ textAlign: 'right', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: (v.cost_impact || 0) <= 0 ? '#166534' : '#991b1b', fontVariantNumeric: 'tabular-nums' }}>
                    {(v.cost_impact || 0) === 0 ? '—' : fmtSigned(v.cost_impact)}
                  </div>
                </div>

                {isSelected && selectedItem && (
                  <VEItemDetail
                    item={selectedItem}
                    allItems={items}
                    user={user}
                    canEdit={canEdit}
                    onStatusChange={(id, status) => updateStatus(id, status)}
                    onClose={() => setSelectedId(null)}
                    onRefresh={loadVeItems}
                  />
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Suggestions modal */}
      {showSuggestions && (
        <SuggestionsModal
          suggestions={suggestions}
          onAddItem={(s, idx) => addSuggestionAsItem(s, idx)}
          onClose={() => setShowSuggestions(false)}
          loadingItems={suggestLoadingItems}
        />
      )}
    </div>
  );
}
