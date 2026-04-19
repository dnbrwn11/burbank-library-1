import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { COLORS, FONTS } from '../data/constants';
import { Skeleton } from './ui';

const ACCENT = '#B89030';
const BORDER = '#E5E5E2';

const TYPE_LABELS  = { add: 'Add Alternate', deduct: 'Deduct Alternate' };
// Aligned with BADGE_STYLES tokens — single source of truth for all badge colors
const TYPE_COLORS  = {
  add:    { bg: '#EAF3DE', fg: '#27500A' },
  deduct: { bg: '#FCEBEB', fg: '#791F1F' },
};
const STATUS_LABELS = { priced: 'Priced', accepted: 'Accepted', rejected: 'Rejected' };
const STATUS_COLORS = {
  priced:   { bg: '#E1EBF5', fg: '#1E3A5F' },
  accepted: { bg: '#EAF3DE', fg: '#27500A' },
  rejected: { bg: '#FCEBEB', fg: '#791F1F' },
};

const ADJ_TYPE_LABELS = { add: '+ Add', deduct: '− Deduct', replace: '↔ Replace' };

function fmt(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtSigned(n, type) {
  const sign = type === 'deduct' ? '-' : '+';
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function Badge({ label, colors }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '3px 8px',
      borderRadius: 4, fontFamily: FONTS.body,
      background: colors.bg, color: colors.fg,
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Alternate item row ────────────────────────────────────────────────────────

function AlternateItemRow({ item, items, canEdit, onDelete }) {
  const linkedItem = items.find(i => i.id === item.line_item_id);
  const total = (item.quantity || 0) * (item.unit_cost_adjustment || 0);
  const sign = item.adjustment_type === 'deduct' ? -1 : 1;
  const netTotal = total * sign;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 80px 100px 100px 80px 32px',
      gap: 8, padding: '8px 12px',
      borderBottom: `1px solid #f0f0ee`,
      alignItems: 'center',
      fontSize: 12, fontFamily: FONTS.body,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: COLORS.dg, fontWeight: 600 }}>
          {item.description || (linkedItem ? linkedItem.description : '—')}
        </div>
        {linkedItem && item.description && (
          <div style={{ color: '#aaa', fontSize: 11, marginTop: 1 }}>
            Linked: {linkedItem.description}
          </div>
        )}
      </div>
      <div style={{ color: '#666', textAlign: 'right' }}>
        {item.quantity?.toLocaleString() || '—'}
      </div>
      <div style={{ color: '#666', textAlign: 'right' }}>
        ${(item.unit_cost_adjustment || 0).toLocaleString()}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
          background: item.adjustment_type === 'deduct' ? '#fef2f2' : '#f0fdf4',
          color: item.adjustment_type === 'deduct' ? '#991b1b' : '#166534',
        }}>
          {ADJ_TYPE_LABELS[item.adjustment_type] || '+'}
        </span>
      </div>
      <div style={{ fontWeight: 700, textAlign: 'right', color: netTotal < 0 ? '#991b1b' : '#166534' }}>
        {fmtSigned(total, item.adjustment_type)}
      </div>
      {canEdit && (
        <button
          onClick={() => onDelete(item.id)}
          style={{ background: 'none', border: 'none', color: '#d44', cursor: 'pointer', fontSize: 14, padding: 4 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Add item form ─────────────────────────────────────────────────────────────

function AddItemForm({ items, onAdd, onClose }) {
  const [form, setForm] = useState({
    line_item_id: '',
    description: '',
    quantity: '',
    unit_cost_adjustment: '',
    adjustment_type: 'add',
  });
  const [saving, setSaving] = useState(false);

  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_cost_adjustment) || 0);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    await onAdd({
      line_item_id:         form.line_item_id || null,
      description:          form.description.trim(),
      quantity:             parseFloat(form.quantity) || 0,
      unit_cost_adjustment: parseFloat(form.unit_cost_adjustment) || 0,
      total_adjustment:     total,
      adjustment_type:      form.adjustment_type,
    });
    setSaving(false);
    onClose();
  };

  const inputStyle = {
    width: '100%', padding: '7px 10px',
    border: '1.5px solid #e0e0dc', borderRadius: 6,
    fontFamily: FONTS.body, fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontFamily: FONTS.body, fontSize: 11,
    fontWeight: 600, color: '#666', marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.4,
  };

  return (
    <form onSubmit={handleAdd} style={{
      background: '#fafaf8', border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: 14, marginTop: 8,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Description</label>
          <input
            type="text"
            value={form.description}
            onChange={e => set('description')(e.target.value)}
            placeholder="e.g. Upgraded flooring — Level 3 → Level 4"
            style={inputStyle}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Link to Line Item (optional)</label>
          <select
            value={form.line_item_id}
            onChange={e => set('line_item_id')(e.target.value)}
            style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
          >
            <option value="">— None —</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>
                {i.category} › {i.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Quantity</label>
          <input
            type="number"
            value={form.quantity}
            onChange={e => set('quantity')(e.target.value)}
            placeholder="0"
            min="0"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Unit Cost Adjustment ($)</label>
          <input
            type="number"
            value={form.unit_cost_adjustment}
            onChange={e => set('unit_cost_adjustment')(e.target.value)}
            placeholder="0"
            min="0"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Adjustment Type</label>
          <select
            value={form.adjustment_type}
            onChange={e => set('adjustment_type')(e.target.value)}
            style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
          >
            <option value="add">+ Add</option>
            <option value="deduct">− Deduct</option>
            <option value="replace">↔ Replace</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, color: COLORS.dg }}>
            Total: {fmtSigned(total, form.adjustment_type)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '7px 16px', fontFamily: FONTS.body, fontSize: 13, color: '#555', cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{ background: saving ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Adding…' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}

// ── Alternate detail panel ────────────────────────────────────────────────────

function AlternateDetail({ alt, items, canEdit, onUpdate, onClose }) {
  const [altItems, setAltItems]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('alternate_items')
        .select('*')
        .eq('alternate_id', alt.id)
        .order('created_at');
      setAltItems(data || []);
      setLoading(false);
    };
    load();
  }, [alt.id]);

  const netTotal = altItems.reduce((sum, item) => {
    const t = (item.quantity || 0) * (item.unit_cost_adjustment || 0);
    return sum + (item.adjustment_type === 'deduct' ? -t : t);
  }, 0);

  const addAltItem = async (itemData) => {
    const { data, error } = await supabase
      .from('alternate_items')
      .insert({ alternate_id: alt.id, ...itemData })
      .select()
      .single();
    if (!error && data) setAltItems(prev => [...prev, data]);
  };

  const deleteAltItem = async (id) => {
    setAltItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('alternate_items').delete().eq('id', id);
  };

  const handleStatusChange = async (status) => {
    await onUpdate(alt.id, { status });
    setEditingStatus(false);
  };

  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Detail header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: '#fafaf8',
        borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 15, color: '#111' }}>
              Alt #{alt.number} — {alt.title}
            </span>
            <Badge label={TYPE_LABELS[alt.type] || alt.type} colors={TYPE_COLORS[alt.type] || TYPE_COLORS.add} />
          </div>
          {alt.description && (
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#666' }}>
              {alt.description}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#aaa', fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: 0.5 }}>Net Adjustment</div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 16, color: netTotal >= 0 ? '#166534' : '#991b1b' }}>
              {netTotal >= 0 ? '+' : ''}{fmt(netTotal)}
            </div>
          </div>
          {canEdit && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setEditingStatus(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#fff', border: `1px solid ${BORDER}`,
                  borderRadius: 7, padding: '5px 10px',
                  fontFamily: FONTS.body, fontSize: 12, color: '#555', cursor: 'pointer',
                }}
              >
                <Badge label={STATUS_LABELS[alt.status] || alt.status} colors={STATUS_COLORS[alt.status] || STATUS_COLORS.priced} />
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {editingStatus && (
                <div style={{
                  position: 'absolute', right: 0, top: 34, background: '#fff',
                  border: `1px solid ${BORDER}`, borderRadius: 8, padding: 4,
                  zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,.12)',
                }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => handleStatusChange(k)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        background: 'none', border: 'none', padding: '7px 14px',
                        fontFamily: FONTS.body, fontSize: 13, color: '#333', cursor: 'pointer',
                        borderRadius: 4,
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 18, padding: 4 }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Items table */}
      <div>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 100px 100px 80px 32px',
          gap: 8, padding: '8px 12px',
          background: '#222', borderBottom: `1px solid ${BORDER}`,
          fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600,
          color: '#fff', textTransform: 'uppercase', letterSpacing: 1,
        }}>
          <div>Description</div>
          <div style={{ textAlign: 'right' }}>Qty</div>
          <div style={{ textAlign: 'right' }}>Unit Cost Adj.</div>
          <div style={{ textAlign: 'right' }}>Type</div>
          <div style={{ textAlign: 'right' }}>Total</div>
          <div />
        </div>

        {loading ? (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(n => <Skeleton key={n} height={36} />)}
          </div>
        ) : altItems.length === 0 ? (
          <div style={{ padding: '20px 12px', fontFamily: FONTS.body, fontSize: 13, color: '#aaa', textAlign: 'center', fontStyle: 'italic' }}>
            No items yet.
          </div>
        ) : (
          altItems.map(item => (
            <AlternateItemRow
              key={item.id}
              item={item}
              items={items}
              canEdit={canEdit}
              onDelete={deleteAltItem}
            />
          ))
        )}

        {/* Footer */}
        {altItems.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#FFF8E8', borderTop: `1px solid #E8D5A0`,
          }}>
            <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, color: '#777' }}>
              NET ADJUSTMENT
            </span>
            <span style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, color: netTotal >= 0 ? '#166534' : '#991b1b' }}>
              {netTotal >= 0 ? '+' : ''}{fmt(netTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Add item */}
      {canEdit && (
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}` }}>
          {showAddItem ? (
            <AddItemForm items={items} onAdd={addAltItem} onClose={() => setShowAddItem(false)} />
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              style={{
                background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 6,
                padding: '7px 0', fontFamily: FONTS.body, fontSize: 13,
                color: '#999', cursor: 'pointer', width: '100%',
              }}
            >
              + Add Line Item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create alternate form ─────────────────────────────────────────────────────

function CreateAlternateForm({ nextNumber, onSave, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', type: 'add', status: 'priced' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    await onSave({ ...form, title: form.title.trim(), number: nextNumber });
    setSaving(false);
    onClose();
  };

  const inputStyle = {
    width: '100%', padding: '8px 11px',
    border: '1.5px solid #e0e0dc', borderRadius: 7,
    fontFamily: FONTS.body, fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>
        New Alternate — #{nextNumber}
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title')(e.target.value)}
              placeholder="e.g. Upgraded flooring package"
              required
              autoFocus
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description')(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Type</label>
            <select value={form.type} onChange={e => set('type')(e.target.value)} style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}>
              <option value="add">Add Alternate</option>
              <option value="deduct">Deduct Alternate</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Status</label>
            <select value={form.status} onChange={e => set('status')(e.target.value)} style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}>
              <option value="priced">Priced</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 7, padding: '8px 18px', fontFamily: FONTS.body, fontSize: 13, color: '#555', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={saving || !form.title.trim()} style={{ background: saving ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 20px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Alternate'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main AlternatesPanel component ────────────────────────────────────────────

export default function AlternatesPanel({ project, active, items = [], canEdit }) {
  const [alternates, setAlternates]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tableError, setTableError]     = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAlt, setSelectedAlt]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadAlternates = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const { data, error } = await supabase
        .from('alternates')
        .select('*')
        .eq('project_id', project.id)
        .eq('scenario_id', active.id)
        .order('number', { ascending: true });
      if (error) {
        if (error.code === '42P01') setTableError(true);
        else console.error('[AlternatesPanel] load error:', error);
        setAlternates([]);
      } else {
        setAlternates(data || []);
      }
    } catch (err) {
      console.error('[AlternatesPanel] load error:', err);
      setAlternates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project?.id && active?.id) loadAlternates();
  }, [project?.id, active?.id]);

  const createAlternate = async (formData) => {
    const { data, error } = await supabase
      .from('alternates')
      .insert({ project_id: project.id, scenario_id: active.id, ...formData })
      .select()
      .single();
    if (!error && data) {
      setAlternates(prev => [...prev, data]);
      setSelectedAlt(data);
    }
  };

  const updateAlternate = async (id, changes) => {
    const { data } = await supabase
      .from('alternates')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data) {
      setAlternates(prev => prev.map(a => a.id === id ? data : a));
      if (selectedAlt?.id === id) setSelectedAlt(data);
    }
  };

  const deleteAlternate = async (id) => {
    await supabase.from('alternates').delete().eq('id', id);
    setAlternates(prev => prev.filter(a => a.id !== id));
    if (selectedAlt?.id === id) setSelectedAlt(null);
    setConfirmDelete(null);
  };

  const nextNumber = alternates.length > 0
    ? Math.max(...alternates.map(a => a.number)) + 1
    : 1;

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: FONTS.body, color: '#aaa', fontSize: 14 }}>
        Loading alternates…
      </div>
    );
  }

  if (tableError) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginBottom: 8 }}>
          The alternates table doesn't exist yet.
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#aaa' }}>
          Run the migration: <code>supabase/migrations/20260419_alternates.sql</code>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 18, color: '#111' }}>
            Alternates
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginTop: 3 }}>
            {alternates.length} alternate{alternates.length !== 1 ? 's' : ''} · {active.name}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowCreateForm(true); setSelectedAlt(null); }}
            style={{
              background: ACCENT, color: '#fff', border: 'none',
              borderRadius: 8, padding: '9px 18px',
              fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            + New Alternate
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <CreateAlternateForm
          nextNumber={nextNumber}
          onSave={createAlternate}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* List */}
      {alternates.length === 0 && !showCreateForm ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: '#fff', border: `1.5px dashed ${BORDER}`, borderRadius: 12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 8 }}>
            No alternates yet
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginBottom: 20 }}>
            Add alternates to track optional scope additions or deductions.
          </div>
          {canEdit && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              + New Alternate
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Summary row header */}
          {alternates.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr 130px 110px 110px 80px',
              gap: 8, padding: '6px 16px',
              fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600,
              color: '#aaa', textTransform: 'uppercase', letterSpacing: 1,
            }}>
              <div>#</div>
              <div>Title</div>
              <div>Type</div>
              <div>Status</div>
              <div style={{ textAlign: 'right' }}>Net Adj.</div>
              <div />
            </div>
          )}

          {alternates.map(alt => (
            <div key={alt.id}>
              <div
                onClick={() => setSelectedAlt(prev => prev?.id === alt.id ? null : alt)}
                style={{
                  background: '#fff',
                  border: `1px solid ${selectedAlt?.id === alt.id ? ACCENT : BORDER}`,
                  borderRadius: 8, padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '52px 1fr 130px 110px 110px 80px',
                  gap: 8, alignItems: 'center',
                  transition: 'border-color 0.1s',
                }}
              >
                <span style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 13, color: ACCENT }}>
                  #{alt.number}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 2 }}>
                    {alt.title}
                  </div>
                  {alt.description && (
                    <div style={{ fontFamily: FONTS.body, fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alt.description}
                    </div>
                  )}
                </div>
                <div>
                  <Badge label={TYPE_LABELS[alt.type] || alt.type} colors={TYPE_COLORS[alt.type] || TYPE_COLORS.add} />
                </div>
                <div>
                  <Badge label={STATUS_LABELS[alt.status] || alt.status} colors={STATUS_COLORS[alt.status] || STATUS_COLORS.priced} />
                </div>
                <div style={{ textAlign: 'right', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: COLORS.dg }}>
                  —
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(alt.id); }}
                      style={{ background: 'none', border: 'none', color: confirmDelete === alt.id ? '#dc2626' : '#d44', cursor: 'pointer', fontSize: 13, padding: 4 }}
                      title="Delete"
                    >
                      {confirmDelete === alt.id ? '✕ Confirm' : '×'}
                    </button>
                  )}
                </div>
              </div>

              {/* Detail panel */}
              {selectedAlt?.id === alt.id && (
                <div style={{ marginTop: 6 }}>
                  <AlternateDetail
                    alt={alt}
                    items={items}
                    canEdit={canEdit}
                    onUpdate={updateAlternate}
                    onClose={() => setSelectedAlt(null)}
                  />
                </div>
              )}

              {/* Delete confirm */}
              {confirmDelete === alt.id && (
                <div style={{
                  marginTop: 4, padding: '8px 14px',
                  background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 13, color: '#991b1b' }}>
                    Delete Alternate #{alt.number}? This cannot be undone.
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '5px 14px', fontFamily: FONTS.body, fontSize: 12, color: '#555', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => deleteAlternate(alt.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
