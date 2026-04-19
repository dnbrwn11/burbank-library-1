import { useState, useEffect, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../supabase/supabaseClient';
import { COLORS, FONTS } from '../data/constants';

const ACCENT = '#B89030';
const BORDER = '#E5E5E0';
const BG = '#F9F9F8';

const SECTIONS = [
  { type: 'exclusion',     label: 'Exclusions',     placeholder: 'e.g. Owner-furnished equipment is excluded from this estimate.' },
  { type: 'qualification', label: 'Qualifications',  placeholder: 'e.g. Estimate assumes prevailing wage labor rates.' },
  { type: 'clarification', label: 'Clarifications',  placeholder: 'e.g. Building permit fees included as an allowance.' },
];

// ── Sortable note row ─────────────────────────────────────────────────────────

function SortableNoteRow({ note, index, canEdit, onUpdate, onDelete, editingId, setEditingId, editText, setEditText }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);
  const isEditing = editingId === note.id;

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commitEdit = () => {
    onUpdate(note.id, editText);
    setEditingId(null);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '6px 0',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* Drag handle */}
        {canEdit && (
          <span
            {...attributes}
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              color: hovered ? '#aaa' : 'transparent',
              fontSize: 14, lineHeight: '24px', flexShrink: 0,
              paddingTop: 2, userSelect: 'none', touchAction: 'none',
              transition: 'color 0.1s',
            }}
          >
            ⠿
          </span>
        )}

        {/* Number */}
        <span style={{
          fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12,
          color: ACCENT, lineHeight: '24px', minWidth: 22, flexShrink: 0, paddingTop: 2,
        }}>
          {index + 1}.
        </span>

        {/* Text / edit */}
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { setEditingId(null); }
            }}
            rows={2}
            style={{
              flex: 1, padding: '4px 8px', border: `1.5px solid ${ACCENT}`,
              borderRadius: 6, fontFamily: FONTS.body, fontSize: 13,
              resize: 'vertical', outline: 'none', lineHeight: 1.5,
            }}
          />
        ) : (
          <span
            onClick={() => { if (canEdit) { setEditingId(note.id); setEditText(note.text); } }}
            style={{
              flex: 1, fontFamily: FONTS.body, fontSize: 13, color: note.text ? COLORS.dg : '#aaa',
              lineHeight: 1.6, paddingTop: 2,
              cursor: canEdit ? 'text' : 'default',
              fontStyle: note.text ? 'normal' : 'italic',
            }}
          >
            {note.text || 'Click to add text…'}
          </span>
        )}

        {/* Delete button */}
        {canEdit && (hovered || isEditing) && (
          <button
            onClick={() => onDelete(note.id)}
            style={{
              background: 'none', border: 'none', color: '#d44',
              cursor: 'pointer', fontSize: 14, padding: '2px 4px',
              lineHeight: 1, flexShrink: 0, paddingTop: 4,
            }}
            title="Delete"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function NoteSection({ section, notes, canEdit, onAdd, onUpdate, onDelete, onReorder }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = notes.findIndex(n => n.id === active.id);
    const newIdx = notes.findIndex(n => n.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(section.type, arrayMove(notes, oldIdx, newIdx));
  };

  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`,
      borderRadius: 10, marginBottom: 14, overflow: 'hidden',
    }}>
      {/* Section header */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', cursor: 'pointer',
          background: collapsed ? '#fafaf8' : '#fff',
          borderBottom: collapsed ? 'none' : `1px solid ${BORDER}`,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12,
            color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 1.2,
          }}>
            {section.label}
          </span>
          <span style={{
            fontSize: 11, fontFamily: FONTS.body, color: '#888',
            background: '#f0f0ee', borderRadius: 10, padding: '1px 8px',
          }}>
            {notes.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {canEdit && !collapsed && (
            <button
              onClick={e => { e.stopPropagation(); onAdd(section.type); }}
              style={{
                background: ACCENT, color: '#fff', border: 'none', borderRadius: 6,
                padding: '4px 12px', fontFamily: FONTS.heading, fontWeight: 700,
                fontSize: 11, cursor: 'pointer',
              }}
            >
              + Add
            </button>
          )}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#999" strokeWidth="2"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Items */}
      {!collapsed && (
        <div style={{ padding: '8px 16px 4px' }}>
          {notes.length === 0 ? (
            <div style={{
              padding: '16px 0', fontFamily: FONTS.body, fontSize: 13,
              color: '#aaa', fontStyle: 'italic', textAlign: 'center',
            }}>
              No {section.label.toLowerCase()} yet.
              {canEdit && (
                <button
                  onClick={() => onAdd(section.type)}
                  style={{
                    marginLeft: 10, background: 'none', border: 'none',
                    color: ACCENT, fontFamily: FONTS.body, fontSize: 13,
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Add one
                </button>
              )}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                {notes.map((note, idx) => (
                  <SortableNoteRow
                    key={note.id}
                    note={note}
                    index={idx}
                    canEdit={canEdit}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    editText={editText}
                    setEditText={setEditText}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          {canEdit && notes.length > 0 && (
            <div style={{ padding: '8px 0 4px' }}>
              <button
                onClick={() => onAdd(section.type)}
                style={{
                  background: 'none', border: `1px dashed ${BORDER}`,
                  borderRadius: 6, padding: '5px 14px',
                  fontFamily: FONTS.body, fontSize: 12, color: '#999',
                  cursor: 'pointer', width: '100%',
                }}
              >
                + Add {section.label.slice(0, -1)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Preview Modal ──────────────────────────────────────────────────────────

function AIPreviewModal({ preview, onAccept, onClose }) {
  const [selected, setSelected] = useState({
    exclusions:     preview.exclusions.map(() => true),
    qualifications: preview.qualifications.map(() => true),
    clarifications: preview.clarifications.map(() => true),
  });

  const toggleItem = (key, idx) => {
    setSelected(prev => ({
      ...prev,
      [key]: prev[key].map((v, i) => i === idx ? !v : v),
    }));
  };

  const handleAccept = () => {
    onAccept({
      exclusions:     preview.exclusions.filter((_, i) => selected.exclusions[i]),
      qualifications: preview.qualifications.filter((_, i) => selected.qualifications[i]),
      clarifications: preview.clarifications.filter((_, i) => selected.clarifications[i]),
    });
  };

  const totalSelected = Object.values(selected).flat().filter(Boolean).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: '28px 28px 24px',
          maxWidth: 680, width: '100%', maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 17, color: '#111' }}>
              AI-Generated Scope Notes
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginTop: 3 }}>
              Review and select items to add. Uncheck any you don't need.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, color: '#aaa', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {[
          { key: 'exclusions',     label: 'Exclusions' },
          { key: 'qualifications', label: 'Qualifications' },
          { key: 'clarifications', label: 'Clarifications' },
        ].map(({ key, label }) => (
          preview[key]?.length > 0 && (
            <div key={key} style={{ marginTop: 20 }}>
              <div style={{
                fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11,
                color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 1.2,
                marginBottom: 8,
              }}>
                {label} ({preview[key].length})
              </div>
              {preview[key].map((text, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 0', borderBottom: `1px solid #f0f0ee`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected[key][idx]}
                    onChange={() => toggleItem(key, idx)}
                    style={{ marginTop: 3, accentColor: ACCENT, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: FONTS.body, fontSize: 13, color: '#333', lineHeight: 1.5 }}>
                    {text}
                  </span>
                </label>
              ))}
            </div>
          )
        ))}

        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #ddd', borderRadius: 8,
              padding: '9px 20px', fontFamily: FONTS.body, fontSize: 13,
              color: '#555', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={totalSelected === 0}
            style={{
              background: totalSelected === 0 ? '#d4b86a' : ACCENT,
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 22px', fontFamily: FONTS.heading, fontWeight: 700,
              fontSize: 13, cursor: totalSelected === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Add {totalSelected} Item{totalSelected !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ScopeNotes component ─────────────────────────────────────────────────

export default function ScopeNotes({ project, active, canEdit }) {
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tableError, setTableError] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiError, setAiError]   = useState(null);

  const loadNotes = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const { data, error } = await supabase
        .from('estimate_notes')
        .select('*')
        .eq('project_id', project.id)
        .eq('scenario_id', active.id)
        .order('type')
        .order('sort_order', { ascending: true });
      if (error) {
        if (error.code === '42P01') { setTableError(true); }
        else { console.error('[ScopeNotes] load error:', error); }
        setNotes([]);
      } else {
        setNotes(data || []);
      }
    } catch (err) {
      console.error('[ScopeNotes] load error:', err);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project?.id && active?.id) loadNotes();
  }, [project?.id, active?.id]);

  const notesOfType = (type) =>
    notes.filter(n => n.type === type).sort((a, b) => a.sort_order - b.sort_order);

  const addNote = async (type) => {
    const typeNotes = notesOfType(type);
    const sort_order = typeNotes.length;
    try {
      const { data, error } = await supabase
        .from('estimate_notes')
        .insert({ project_id: project.id, scenario_id: active.id, type, text: '', sort_order })
        .select()
        .single();
      if (error) { console.error('[ScopeNotes] insert error:', error); return; }
      setNotes(prev => [...prev, data]);
    } catch (err) {
      console.error('[ScopeNotes] addNote error:', err);
    }
  };

  const updateNote = async (id, text) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    try {
      await supabase
        .from('estimate_notes')
        .update({ text, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('[ScopeNotes] update error:', err);
    }
  };

  const deleteNote = async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await supabase.from('estimate_notes').delete().eq('id', id);
    } catch (err) {
      console.error('[ScopeNotes] delete error:', err);
    }
  };

  const handleReorder = async (type, reorderedItems) => {
    const withOrder = reorderedItems.map((n, i) => ({ ...n, sort_order: i }));
    setNotes(prev => {
      const others = prev.filter(n => n.type !== type);
      return [...others, ...withOrder];
    });
    try {
      for (const n of withOrder) {
        await supabase.from('estimate_notes').update({ sort_order: n.sort_order }).eq('id', n.id);
      }
    } catch (err) {
      console.error('[ScopeNotes] reorder error:', err);
    }
  };

  const generateWithAI = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/generate-scope-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectName:    project.name,
          buildingType:   project.building_type,
          city:           project.city,
          state:          project.state,
          deliveryMethod: project.delivery_method,
          grossSf:        project.gross_sf,
          targetBudget:   project.target_budget,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI generation failed');
      setAiPreview(data);
    } catch (err) {
      console.error('[ScopeNotes] AI error:', err);
      setAiError(err.message || 'AI generation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAISuggestions = async (accepted) => {
    setAiPreview(null);
    const rows = [
      ...accepted.exclusions.map((text, i) => ({
        project_id: project.id, scenario_id: active.id,
        type: 'exclusion', text, sort_order: notesOfType('exclusion').length + i,
      })),
      ...accepted.qualifications.map((text, i) => ({
        project_id: project.id, scenario_id: active.id,
        type: 'qualification', text, sort_order: notesOfType('qualification').length + i,
      })),
      ...accepted.clarifications.map((text, i) => ({
        project_id: project.id, scenario_id: active.id,
        type: 'clarification', text, sort_order: notesOfType('clarification').length + i,
      })),
    ];
    if (!rows.length) return;
    try {
      const { data } = await supabase.from('estimate_notes').insert(rows).select();
      if (data) setNotes(prev => [...prev, ...data]);
    } catch (err) {
      console.error('[ScopeNotes] acceptAI error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: FONTS.body, color: '#aaa', fontSize: 14 }}>
        Loading scope notes…
      </div>
    );
  }

  if (tableError) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginBottom: 8 }}>
          The estimate_notes table doesn't exist yet.
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#aaa' }}>
          Run the migration: <code>supabase/migrations/20260419_estimate_notes.sql</code>
        </div>
      </div>
    );
  }

  const totalNotes = notes.length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '4px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 18, color: '#111' }}>
            Exclusions, Qualifications & Clarifications
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#888', marginTop: 3 }}>
            {totalNotes} item{totalNotes !== 1 ? 's' : ''} · {active.name}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={generateWithAI}
            disabled={aiLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: aiLoading ? '#f5f0e0' : '#fffbf0',
              border: `1px solid ${aiLoading ? '#d4b86a' : ACCENT}`,
              borderRadius: 8, padding: '9px 16px',
              fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12,
              color: aiLoading ? '#b8903088' : ACCENT,
              cursor: aiLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {aiLoading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Generating…
              </>
            ) : (
              <>✦ Generate with AI</>
            )}
          </button>
        )}
      </div>

      {aiError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '10px 14px', marginBottom: 14,
          fontFamily: FONTS.body, fontSize: 13, color: '#991b1b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠ {aiError}</span>
          <button onClick={() => setAiError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map(section => (
        <NoteSection
          key={section.type}
          section={section}
          notes={notesOfType(section.type)}
          canEdit={canEdit}
          onAdd={addNote}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onReorder={handleReorder}
        />
      ))}

      {/* AI Preview Modal */}
      {aiPreview && (
        <AIPreviewModal
          preview={aiPreview}
          onAccept={acceptAISuggestions}
          onClose={() => setAiPreview(null)}
        />
      )}
    </div>
  );
}
