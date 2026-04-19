import { useState, useEffect, useRef, useCallback } from 'react';
import { updateProject, updateScenario } from '../supabase/db';
import { FONTS, COLORS } from '../data/constants';
import { useWindowSize } from '../hooks/useWindowSize';

const ACCENT = '#B89030';
const BORDER = '#E5E5E2';

const DELIVERY_METHODS = [
  '', 'CM at Risk (GMP)', 'Design-Bid-Build', 'Design-Build',
  'CM Multi-Prime', 'IPD', 'Construction Management Agency',
];
const LABOR_TYPES = ['', 'Prevailing Wage', 'Union', 'Open Shop'];
const PROJECT_STATUSES = ['active', 'on_hold', 'won', 'lost'];
const STATUS_LABELS = { active: 'Active', on_hold: 'On Hold', won: 'Won', lost: 'Lost' };
const STATUS_COLORS = {
  active:  { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  on_hold: { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  won:     { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  lost:    { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};
const SCOPE_LABELS = { new_construction: 'New Construction', renovation: 'Renovation & TI' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(n) {
  if (!n) return '';
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(ts);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ children }) {
  return (
    <div style={{
      fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10,
      color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1.4,
      marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${BORDER}`,
    }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontFamily: FONTS.body, fontSize: 10, color: COLORS.mg,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1,
    }}>
      {children}
    </div>
  );
}

function SavedFlash({ field, savedField }) {
  if (savedField !== field) return null;
  return (
    <span style={{
      fontFamily: FONTS.body, fontSize: 10, color: '#16a34a',
      marginLeft: 8, fontWeight: 600,
    }}>
      ✓ Saved
    </span>
  );
}

// Inline editable single-line text
function InlineText({ value, placeholder, canEdit, onSave, style = {}, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value || '')) onSave(draft);
  };

  if (!canEdit) {
    return (
      <span style={{ fontFamily: FONTS.body, fontSize: 13, color: value ? COLORS.dg : COLORS.mg, ...style }}>
        {value || placeholder || '—'}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
        style={{
          border: `1.5px solid ${ACCENT}`, borderRadius: 5, padding: '3px 7px',
          fontFamily: FONTS.body, fontSize: 13, outline: 'none',
          width: '100%', boxSizing: 'border-box', ...style,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        fontFamily: FONTS.body, fontSize: 13,
        color: value ? COLORS.dg : COLORS.mg,
        cursor: 'text',
        borderBottom: `1px dashed transparent`,
        display: 'inline-block',
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = '#ccc'}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
    >
      {value || <em style={{ color: COLORS.mg, fontStyle: 'normal' }}>{placeholder || 'Click to edit'}</em>}
    </span>
  );
}

// Inline select
function InlineSelect({ value, options, canEdit, onSave, emptyLabel = '—' }) {
  if (!canEdit) {
    return (
      <span style={{ fontFamily: FONTS.body, fontSize: 13, color: value ? COLORS.dg : COLORS.mg }}>
        {value || emptyLabel}
      </span>
    );
  }
  return (
    <select
      value={value || ''}
      onChange={e => onSave(e.target.value || null)}
      style={{
        border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 6px',
        fontFamily: FONTS.body, fontSize: 13, background: '#fff',
        cursor: 'pointer', outline: 'none',
      }}
    >
      {options.map(o => (
        typeof o === 'string'
          ? <option key={o} value={o}>{o || emptyLabel}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Inline date picker
function InlineDatePicker({ value, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);

  if (!canEdit && !value) return <span style={{ color: COLORS.mg, fontSize: 12 }}>—</span>;
  if (!canEdit) return <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dg }}>{fmtDate(value)}</span>;

  return (
    <input
      type="date"
      value={value || ''}
      onChange={e => onSave(e.target.value || null)}
      style={{
        border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 6px',
        fontFamily: FONTS.body, fontSize: 12, background: '#fff',
        outline: 'none', cursor: 'pointer',
      }}
    />
  );
}

// Milestone row with countdown
function MilestoneRow({ label, dateStr, canEdit, onSave }) {
  const days = daysUntil(dateStr);
  const badgeStyle = days === null ? null
    : days < 0 ? { color: '#991b1b', bg: '#fef2f2' }
    : days <= 7  ? { color: '#92400e', bg: '#fffbeb' }
    : { color: '#166534', bg: '#f0fdf4' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ minWidth: 110 }}>
        <FieldLabel>{label}</FieldLabel>
        <InlineDatePicker value={dateStr} canEdit={canEdit} onSave={onSave} />
      </div>
      {badgeStyle && days !== null && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
          background: badgeStyle.bg, color: badgeStyle.color,
          fontFamily: FONTS.heading, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `In ${days}d`}
        </span>
      )}
    </div>
  );
}

// URL link field — shows as link when set, input when editing
function LinkField({ label, icon, value, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value || '')) onSave(draft || null);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <input
          ref={inputRef}
          type="url"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
          placeholder="https://…"
          style={{
            flex: 1, border: `1.5px solid ${ACCENT}`, borderRadius: 5, padding: '3px 7px',
            fontFamily: FONTS.body, fontSize: 12, outline: 'none',
          }}
        />
      </div>
    );
  }

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <a href={value} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: FONTS.body, fontSize: 12, color: '#1d4ed8', textDecoration: 'none', flex: 1 }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
        >
          {label}↗
        </a>
        {canEdit && (
          <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 10, padding: 0 }}>
            edit
          </button>
        )}
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 14, color: '#aaa' }}>{icon}</span>
      <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.mg, textDecoration: 'underline' }}>
        Add {label}
      </span>
    </button>
  );
}

// Avatar row for team members
function TeamAvatarRow({ teamMembers, onManageTeam, canEdit }) {
  const visible = teamMembers.slice(0, 5);
  const extra = teamMembers.length - 5;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {visible.map((m, i) => {
          const name = m.profiles?.full_name || m.profiles?.email || '?';
          const initials = name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
          return (
            <div
              key={m.user_id || i}
              title={name}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: ACCENT, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, fontFamily: FONTS.heading,
                border: '2px solid #fff',
                marginLeft: i === 0 ? 0 : -8, position: 'relative', zIndex: visible.length - i,
              }}
            >
              {initials}
            </div>
          );
        })}
        {extra > 0 && (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#E5E5E2', color: '#555',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, fontFamily: FONTS.heading,
            border: '2px solid #fff', marginLeft: -8,
          }}>
            +{extra}
          </div>
        )}
      </div>
      {visible.length === 0 && (
        <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.mg }}>No members</span>
      )}
      <button
        onClick={onManageTeam}
        style={{
          background: 'none', border: 'none', color: ACCENT, cursor: 'pointer',
          fontFamily: FONTS.body, fontSize: 11, textDecoration: 'underline', padding: 0,
        }}
      >
        Manage
      </button>
    </div>
  );
}

// AI Assumptions section
function AssumptionsSection({ assumptions, active, canEdit }) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState(assumptions || []);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [newText, setNewText] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setItems(assumptions || []); }, [assumptions]);

  const save = async (newList) => {
    setItems(newList);
    setSaving(true);
    try {
      await updateScenario(active.id, { ai_assumptions: newList });
    } catch (e) {
      console.error('[AssumptionsSection] save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (idx) => save(items.filter((_, i) => i !== idx));

  const commitEdit = (idx) => {
    if (!editDraft.trim()) { setEditingIdx(null); return; }
    const updated = items.map((it, i) => i === idx ? editDraft.trim() : it);
    save(updated);
    setEditingIdx(null);
  };

  const addItem = () => {
    if (!newText.trim()) { setAddingNew(false); return; }
    save([...items, newText.trim()]);
    setNewText('');
    setAddingNew(false);
  };

  if (!items.length && !canEdit) return null;

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '10px 14px', background: '#fafaf8', border: 'none', cursor: 'pointer',
          fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: COLORS.dg,
          textTransform: 'uppercase', letterSpacing: 1,
        }}
      >
        <span>Assumptions made during generation{saving ? ' …' : ''}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: '10px 14px' }}>
          {items.length === 0 && !addingNew ? (
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.mg, fontStyle: 'italic', marginBottom: 6 }}>
              No assumptions recorded yet.
            </div>
          ) : (
            <ol style={{ paddingLeft: 22, margin: 0, marginBottom: 8 }}>
              {items.map((text, idx) => (
                <li key={idx} style={{ fontFamily: FONTS.body, fontSize: 12, color: '#555', marginBottom: 4, lineHeight: 1.5 }}>
                  {editingIdx === idx ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={e => setEditDraft(e.target.value)}
                        onBlur={() => commitEdit(idx)}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(idx); if (e.key === 'Escape') setEditingIdx(null); }}
                        style={{ flex: 1, border: `1.5px solid ${ACCENT}`, borderRadius: 4, padding: '2px 6px', fontFamily: FONTS.body, fontSize: 12, outline: 'none' }}
                      />
                    </div>
                  ) : (
                    <span
                      onClick={() => { if (canEdit) { setEditingIdx(idx); setEditDraft(text); } }}
                      style={{ cursor: canEdit ? 'text' : 'default' }}
                    >
                      {text}
                    </span>
                  )}
                  {canEdit && editingIdx !== idx && (
                    <button onClick={() => deleteItem(idx)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 12, padding: '0 0 0 6px' }}>×</button>
                  )}
                </li>
              ))}
            </ol>
          )}

          {canEdit && (
            addingNew ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <input
                  autoFocus
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onBlur={addItem}
                  onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAddingNew(false); }}
                  placeholder="Add assumption…"
                  style={{ flex: 1, border: `1.5px solid ${ACCENT}`, borderRadius: 4, padding: '4px 8px', fontFamily: FONTS.body, fontSize: 12, outline: 'none' }}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingNew(true)}
                style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontFamily: FONTS.body, fontSize: 11, padding: 0, textDecoration: 'underline', marginTop: 4 }}
              >
                + Add assumption
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectSummaryCard({
  project, active, globals, updateGlobal, teamMembers = [],
  canEdit, onUpdate, onManageTeam,
}) {
  const { mob, tab } = useWindowSize();
  const [local, setLocal] = useState({ ...project });
  const [savedField, setSavedField] = useState(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(!!(project.notes));
  const [contextExpanded, setContextExpanded] = useState(!!(project.project_context));
  const savedTimer = useRef(null);

  useEffect(() => { setLocal({ ...project }); }, [project.id]);

  const flash = useCallback((field) => {
    setSavedField(field);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedField(null), 2000);
  }, []);

  const save = useCallback(async (field, value) => {
    setLocal(prev => ({ ...prev, [field]: value }));
    const { data } = await updateProject(project.id, { [field]: value });
    if (data) onUpdate?.(data);
    else onUpdate?.({ [field]: value }); // optimistic fallback
    flash(field);
    // Keep scenario globals in sync for gross_sf
    if (field === 'gross_sf') updateGlobal?.('buildingSF', Number(value) || 0);
  }, [project.id, onUpdate, flash, updateGlobal]);

  const assumptions = Array.isArray(active?.ai_assumptions) ? active.ai_assumptions : [];
  const status = local.status || 'active';
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.active;
  const cols = mob ? '1fr' : tab ? '1fr 1fr' : '1fr 1fr 1fr';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Three-column grid */}
      <div style={{
        background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
        padding: mob ? '16px 14px' : '18px 20px', marginBottom: 12,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: mob ? 20 : '0', columnGap: 28 }}>

          {/* ── Left: Project details ──────────────────────────────────────── */}
          <div style={{ borderRight: (!mob && !tab) ? `1px solid ${BORDER}` : 'none', paddingRight: (!mob && !tab) ? 24 : 0 }}>
            <SectionHead>Project Details</SectionHead>

            {/* Project Name */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <InlineText
                  value={local.name}
                  placeholder="Project name"
                  canEdit={canEdit}
                  onSave={v => save('name', v)}
                  style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 16, color: COLORS.dg }}
                />
                <SavedFlash field="name" savedField={savedField} />
              </div>
            </div>

            {/* Client */}
            {(local.client_name || canEdit) && (
              <div style={{ marginBottom: 8 }}>
                <FieldLabel>Client / Owner</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <InlineText value={local.client_name} placeholder="Client name" canEdit={canEdit} onSave={v => save('client_name', v)} />
                  {local.client_type && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#f5f5f4', color: '#555', border: `1px solid ${BORDER}` }}>
                      {local.client_type}
                    </span>
                  )}
                  <SavedFlash field="client_name" savedField={savedField} />
                </div>
              </div>
            )}

            {/* Location */}
            <div style={{ marginBottom: 8 }}>
              <FieldLabel>Location</FieldLabel>
              <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dg }}>
                {[local.city, local.state].filter(Boolean).join(', ') || '—'}
              </span>
            </div>

            {/* Building type + scope */}
            <div style={{ marginBottom: 8 }}>
              <FieldLabel>Building Type</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dg }}>{local.building_type || '—'}</span>
                {local.scope_type && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: local.scope_type === 'renovation' ? '#fef2f2' : '#f0fdf4', color: local.scope_type === 'renovation' ? '#991b1b' : '#166534', border: `1px solid ${local.scope_type === 'renovation' ? '#fecaca' : '#bbf7d0'}` }}>
                    {SCOPE_LABELS[local.scope_type] || local.scope_type}
                  </span>
                )}
              </div>
            </div>

            {/* Gross SF + Stories */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              <div>
                <FieldLabel>Gross SF <SavedFlash field="gross_sf" savedField={savedField} /></FieldLabel>
                <InlineText
                  value={local.gross_sf ? Number(local.gross_sf).toLocaleString() : ''}
                  placeholder="SF"
                  canEdit={canEdit}
                  onSave={v => save('gross_sf', parseFloat(v.replace(/,/g, '')) || null)}
                />
              </div>
              <div>
                <FieldLabel>Stories <SavedFlash field="stories" savedField={savedField} /></FieldLabel>
                <InlineText
                  value={local.stories ? String(local.stories) : ''}
                  placeholder="Stories"
                  canEdit={canEdit}
                  type="number"
                  onSave={v => save('stories', parseInt(v) || null)}
                />
              </div>
            </div>

            {/* Target budget */}
            <div style={{ marginBottom: 8 }}>
              <FieldLabel>Target Budget <SavedFlash field="target_budget" savedField={savedField} /></FieldLabel>
              {canEdit ? (
                <InlineText
                  value={local.target_budget ? fmtMoney(local.target_budget) : ''}
                  placeholder="$45M"
                  canEdit
                  onSave={v => {
                    const cleaned = v.replace(/[$,MKmk]/g, '').trim();
                    let num = parseFloat(cleaned);
                    if (v.toLowerCase().endsWith('m')) num *= 1_000_000;
                    else if (v.toLowerCase().endsWith('k')) num *= 1_000;
                    save('target_budget', isNaN(num) ? null : num);
                  }}
                />
              ) : (
                <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dg }}>
                  {local.target_budget ? fmtMoney(local.target_budget) : '—'}
                </span>
              )}
            </div>

            {/* Delivery method */}
            <div style={{ marginBottom: 8 }}>
              <FieldLabel>Delivery Method <SavedFlash field="delivery_method" savedField={savedField} /></FieldLabel>
              <InlineSelect
                value={local.delivery_method}
                options={DELIVERY_METHODS}
                canEdit={canEdit}
                onSave={v => save('delivery_method', v)}
                emptyLabel="Not set"
              />
            </div>

            {/* Labor type */}
            <div style={{ marginBottom: 8 }}>
              <FieldLabel>Labor Type <SavedFlash field="labor_type" savedField={savedField} /></FieldLabel>
              <InlineSelect
                value={local.labor_type}
                options={LABOR_TYPES}
                canEdit={canEdit}
                onSave={v => save('labor_type', v)}
                emptyLabel="Not set"
              />
            </div>
          </div>

          {/* ── Middle: Team & milestones ──────────────────────────────────── */}
          <div style={{
            borderRight: (!mob && !tab) ? `1px solid ${BORDER}` : 'none',
            paddingRight: (!mob && !tab) ? 24 : 0,
            paddingLeft: (!mob && !tab) ? 24 : 0,
            borderTop: (mob || tab) ? `1px solid ${BORDER}` : 'none',
            paddingTop: (mob || tab) ? 16 : 0,
          }}>
            <SectionHead>Team & Milestones</SectionHead>

            {/* Pursuit lead */}
            <div style={{ marginBottom: 8 }}>
              <FieldLabel>Pursuit Lead <SavedFlash field="pursuit_lead" savedField={savedField} /></FieldLabel>
              <InlineText value={local.pursuit_lead} placeholder="Not set" canEdit={canEdit} onSave={v => save('pursuit_lead', v || null)} />
            </div>

            {/* Architect */}
            <div style={{ marginBottom: 10 }}>
              <FieldLabel>Architect / Design Firm <SavedFlash field="architect" savedField={savedField} /></FieldLabel>
              <InlineText value={local.architect} placeholder="Not set" canEdit={canEdit} onSave={v => save('architect', v || null)} />
            </div>

            {/* Team */}
            <div style={{ marginBottom: 10 }}>
              <FieldLabel>Team</FieldLabel>
              <TeamAvatarRow teamMembers={teamMembers} onManageTeam={onManageTeam} canEdit={canEdit} />
            </div>

            {/* Status */}
            <div style={{ marginBottom: 14, position: 'relative' }}>
              <FieldLabel>Project Status</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                  background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`,
                  fontFamily: FONTS.heading, letterSpacing: 0.5,
                }}>
                  {STATUS_LABELS[status] || status}
                </span>
                {canEdit && (
                  <button
                    onClick={() => setStatusMenuOpen(v => !v)}
                    style={{ background: 'none', border: 'none', color: COLORS.mg, cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: FONTS.body, textDecoration: 'underline' }}
                  >
                    Change
                  </button>
                )}
                {statusMenuOpen && (
                  <div style={{ position: 'absolute', top: 40, left: 0, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 4, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
                    {PROJECT_STATUSES.filter(s => s !== status).map(s => (
                      <button key={s} onClick={() => { save('status', s); setStatusMenuOpen(false); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '7px 14px', fontFamily: FONTS.body, fontSize: 13, color: '#333', cursor: 'pointer', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <FieldLabel>Milestones</FieldLabel>
              <div style={{ marginTop: 4 }}>
                {[
                  { key: 'dd_due_date',         label: 'DD Estimate Due' },
                  { key: 'gmp_due_date',         label: 'GMP Due' },
                  { key: 'bid_date',             label: 'Bid Day' },
                  { key: 'construction_start',   label: 'Construction Start' },
                ].map(({ key, label }) => (
                  (local[key] || canEdit) && (
                    <MilestoneRow
                      key={key}
                      label={label}
                      dateStr={local[key]}
                      canEdit={canEdit}
                      onSave={v => save(key, v)}
                    />
                  )
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Contacts & links ────────────────────────────────────── */}
          <div style={{
            paddingLeft: (!mob && !tab) ? 24 : 0,
            borderTop: (mob || tab) ? `1px solid ${BORDER}` : 'none',
            paddingTop: (mob || tab) ? 16 : 0,
          }}>
            <SectionHead>Contacts & Links</SectionHead>

            {/* Client contact */}
            <div style={{ marginBottom: 10 }}>
              <FieldLabel>Client Contact</FieldLabel>
              <div style={{ marginTop: 2 }}>
                <InlineText
                  value={local.client_contact_name}
                  placeholder="Contact name"
                  canEdit={canEdit}
                  onSave={v => save('client_contact_name', v || null)}
                  style={{ fontWeight: 600 }}
                />
              </div>
              {(local.client_contact_email || canEdit) && (
                <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: COLORS.mg }}>✉</span>
                  {local.client_contact_email ? (
                    <a href={`mailto:${local.client_contact_email}`} style={{ fontFamily: FONTS.body, fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>
                      {local.client_contact_email}
                    </a>
                  ) : canEdit ? (
                    <InlineText value="" placeholder="Email" canEdit onSave={v => save('client_contact_email', v || null)} style={{ fontSize: 12 }} />
                  ) : null}
                </div>
              )}
              {(local.client_contact_phone || canEdit) && (
                <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: COLORS.mg }}>✆</span>
                  {local.client_contact_phone ? (
                    <a href={`tel:${local.client_contact_phone}`} style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.dg, textDecoration: 'none' }}>
                      {local.client_contact_phone}
                    </a>
                  ) : canEdit ? (
                    <InlineText value="" placeholder="Phone" canEdit onSave={v => save('client_contact_phone', v || null)} style={{ fontSize: 12 }} />
                  ) : null}
                </div>
              )}
            </div>

            {/* Document links */}
            <div style={{ marginBottom: 10 }}>
              <FieldLabel>Project Links</FieldLabel>
              <div style={{ marginTop: 4 }}>
                <LinkField label="Drawings" icon="📐" value={local.drawings_url} canEdit={canEdit} onSave={v => save('drawings_url', v)} />
                <LinkField label="Specs" icon="📋" value={local.specs_url} canEdit={canEdit} onSave={v => save('specs_url', v)} />
                <LinkField label="RFP" icon="📄" value={local.rfp_url} canEdit={canEdit} onSave={v => save('rfp_url', v)} />
              </div>
            </div>

            {/* Timestamps */}
            <div style={{ marginBottom: 10 }}>
              <FieldLabel>Project Timeline</FieldLabel>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.mg, marginTop: 2 }}>
                Created {fmtDate(local.created_at)} · Updated {relativeTime(local.updated_at)}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <FieldLabel>Notes</FieldLabel>
                {!notesExpanded && canEdit && (
                  <button onClick={() => setNotesExpanded(true)} style={{ background: 'none', border: 'none', color: COLORS.mg, cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
                    Add notes
                  </button>
                )}
              </div>
              {notesExpanded && (
                <NotesField
                  value={local.notes || ''}
                  placeholder="Project notes…"
                  onSave={v => save('notes', v || null)}
                  canEdit={canEdit}
                />
              )}
              {!notesExpanded && local.notes && (
                <div
                  onClick={() => setNotesExpanded(true)}
                  style={{ fontFamily: FONTS.body, fontSize: 12, color: '#555', cursor: 'pointer', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}
                >
                  {local.notes}
                </div>
              )}
            </div>

            {/* Project context */}
            {(local.project_context || canEdit) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FieldLabel>Project Context</FieldLabel>
                  {!contextExpanded && canEdit && (
                    <button onClick={() => setContextExpanded(true)} style={{ background: 'none', border: 'none', color: COLORS.mg, cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
                      {local.project_context ? 'Edit' : 'Add context'}
                    </button>
                  )}
                </div>
                {contextExpanded && (
                  <NotesField
                    value={local.project_context || ''}
                    placeholder="Original project description from estimate creation…"
                    onSave={v => save('project_context', v || null)}
                    canEdit={canEdit}
                    rows={3}
                  />
                )}
                {!contextExpanded && local.project_context && (
                  <div
                    onClick={() => setContextExpanded(true)}
                    style={{ fontFamily: FONTS.body, fontSize: 12, color: '#555', cursor: 'pointer', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}
                  >
                    {local.project_context}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assumptions section */}
      {(assumptions.length > 0 || canEdit) && (
        <AssumptionsSection assumptions={assumptions} active={active} canEdit={canEdit} />
      )}
    </div>
  );
}

// ── Notes/textarea field with auto-save on blur ───────────────────────────────

function NotesField({ value, placeholder, onSave, canEdit, rows = 4 }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => { if (draft !== value) onSave(draft); };

  if (!canEdit) {
    return (
      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#555', lineHeight: 1.5 }}>{value || '—'}</div>
    );
  }
  return (
    <textarea
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      rows={rows}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '7px 10px', border: `1.5px solid ${BORDER}`, borderRadius: 7,
        fontFamily: FONTS.body, fontSize: 12, outline: 'none', resize: 'vertical',
        boxSizing: 'border-box', lineHeight: 1.5,
      }}
      onFocus={e => { e.target.style.borderColor = ACCENT; }}
      onBlurCapture={e => { e.target.style.borderColor = BORDER; }}
    />
  );
}
