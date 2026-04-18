import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
import { AuditReportCard } from './AuditReportCard';
import { supabase } from '../supabase/supabaseClient';
const CSI_ORDER = [
  'Substructure', 'Shell', 'Interiors', 'Services', 'Equipment',
  'Special Construction', 'Sitework', 'General Conditions', 'Overhead & Fee', 'Contingency',
];
import { COLORS, FONTS, SENSITIVITIES } from '../data/constants';
import { fmt, fK, psf } from '../utils/format';
import { EditField } from './EditField';
import { Badge } from './Badge';
import { AIPanel } from './AIPanel';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { analytics } from '../analytics';

const GOLD = '#B89030';
const TABLE_COLS = ['description', 'subcategory', 'qtyMin', 'qtyMax', 'unit', 'unitCostLow', 'unitCostMid', 'unitCostHigh'];
const NUM_COLS = new Set(['qtyMin', 'qtyMax', 'unitCostLow', 'unitCostMid', 'unitCostHigh']);

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  for (const line of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += line[i];
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function csvEsc(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

function downloadText(content, filename, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Module-level sub-components ───────────────────────────────────────────────

function ItemDetailPanel({ item, updateItem, aiAdvice, aiLoading, askAI, applyAI, mob }) {
  const lt = CE.lowTotal(item), mt = CE.midTotal(item), ht = CE.highTotal(item);
  const uI = (f) => (v) => updateItem(item.id, f, v);
  return (
    <div style={{ padding: mob ? '0 14px 14px' : '10px 20px', borderTop: mob ? `1px solid ${COLORS.bl}` : 'none' }}>
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(5,1fr)', gap: 8, marginTop: mob ? 10 : 0 }}>
        {[['Qty Min', 'qtyMin'], ['Qty Max', 'qtyMax'], ['$/Low', 'unitCostLow'], ['$/Mid', 'unitCostMid'], ['$/High', 'unitCostHigh']].map(([l, f]) => (
          <div key={f}>
            <div style={{ fontSize: 10, color: COLORS.mg, fontFamily: FONTS.heading, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
            <EditField value={item[f]} onCommit={uI(f)} mob={mob} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, padding: '6px 10px', background: COLORS.bl, borderRadius: 6, fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body }}>
        L: <b style={{ color: COLORS.lg }}>{fmt(lt)}</b> · M: <b style={{ color: COLORS.gn }}>{fmt(mt)}</b> · H: <b style={{ color: COLORS.or }}>{fmt(ht)}</b>
        {item.basis && <span style={{ marginLeft: 12 }}>| {item.basis}</span>}
      </div>
      <AIPanel item={item} advice={aiAdvice?.[item.id]} loading={aiLoading?.has(item.id)} onAsk={() => askAI(item)} onApply={(adv) => applyAI(item.id, adv)} mob={mob} />
    </div>
  );
}

function DragOverlayCard({ item, cv, bsf }) {
  const sh = CE.itemTotal(item, cv);
  return (
    <div style={{ background: COLORS.wh, border: `1.5px solid ${COLORS.gn}`, borderRadius: 6, padding: '8px 14px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontFamily: FONTS.body, maxWidth: 560, cursor: 'grabbing', opacity: 0.97 }}>
      <span style={{ color: COLORS.mg, flexShrink: 0, fontSize: 13 }}>⠿</span>
      <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
      <span style={{ color: COLORS.gn, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fK(sh)}</span>
    </div>
  );
}

const AUDIT_DOT_COLOR = { ok: '#22C55E', caution: '#F59E0B', flagged: '#EF4444' };

function memberInitials(m) {
  const name = m?.profiles?.full_name || m?.profiles?.email || '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

function AvatarCircle({ member, size = 22 }) {
  const initials = memberInitials(member);
  const colors = ['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444'];
  const bg = colors[(initials.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, fontFamily: FONTS.heading, flexShrink: 0, lineHeight: 1, border: '1.5px solid #fff' }}>
      {initials}
    </div>
  );
}

function SortableItemRow({
  item, cv, bsf, mob,
  hoverRow, setHoverRow, expR, setExpR, flashId,
  updateItem, onDelete, aiAdvice, aiLoading, askAI, applyAI,
  openMoveMenu, overId, isDraggingAny, canEdit,
  tableEdit, activeCell, onActivateCell, onCellChange, onNavCell, cellValues,
  auditStatus, teamMembers, onAssignItem, selected, onToggleSelect, bulkMode,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef(null);

  useEffect(() => {
    if (!assignOpen) return;
    const close = (e) => { if (assignRef.current && !assignRef.current.contains(e.target)) setAssignOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [assignOpen]);

  const sh     = CE.itemTotal(item, cv);
  const ex     = expR === item.id;
  const hasAI  = aiAdvice?.[item.id];
  const isHover  = hoverRow === item.id;
  const isFlash  = flashId === item.id;
  const isOver   = overId === item.id && isDraggingAny && !isDragging;

  // Audit status: live results take priority, then persisted item.aiAdvice
  const effectiveAudit = auditStatus ?? (item.aiAdvice?.status ? item.aiAdvice : null);

  const rowBg = isFlash ? '#FFF3B0'
    : selected ? `${COLORS.gn}0A`
    : isHover ? '#FCFCF9'
    : hasAI ? `${COLORS.gn}06`
    : COLORS.wh;
  const combinedTransition = [transition, 'background 0.15s'].filter(Boolean).join(', ');
  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition: isFlash ? undefined : combinedTransition,
    background: rowBg,
    opacity: isDragging ? 0 : 1,
    borderTop: isOver ? `2px solid ${COLORS.gn}` : undefined,
    borderBottom: `1px solid ${COLORS.bl}`,
    position: 'relative',
    boxShadow: item.isAllowance ? 'inset 4px 0 0 #B89030' : undefined,
  };

  const uI = (f) => (v) => updateItem(item.id, f, v);

  // Table edit: resolve displayed value (may have a pending debounced edit)
  const cv2 = (field) => {
    if (!tableEdit) return item[field];
    const key = `${item.id}_${field}`;
    return key in cellValues ? cellValues[key] : item[field];
  };

  const isActive = (field) => tableEdit && activeCell?.itemId === item.id && activeCell?.field === field;

  const cellInput = (field) => {
    const isNum = NUM_COLS.has(field);
    const active = isActive(field);
    return (
      <input
        key={`${item.id}_${field}`}
        type={isNum ? 'number' : 'text'}
        value={cv2(field) ?? ''}
        onChange={e => {
          const v = isNum ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value;
          onCellChange(item.id, field, v);
        }}
        onFocus={() => onActivateCell(item.id, field)}
        onKeyDown={e => {
          if (e.key === 'Tab') { e.preventDefault(); onNavCell(item.id, field, e.shiftKey ? 'shift-tab' : 'tab'); }
          else if (e.key === 'Enter') { e.preventDefault(); onNavCell(item.id, field, 'enter'); }
          else if (e.key === 'Escape') { e.preventDefault(); onActivateCell(null, null); e.currentTarget.blur(); }
        }}
        style={{
          width: '100%', border: active ? `2px solid ${GOLD}` : '1px solid transparent',
          borderRadius: 4, outline: 'none', padding: '2px 4px',
          fontSize: 12, fontFamily: FONTS.body, background: active ? '#FFFDF5' : 'transparent',
          color: COLORS.dg, textAlign: isNum ? 'right' : 'left',
          boxSizing: 'border-box', minWidth: isNum ? 60 : 80,
        }}
      />
    );
  };

  const assignedMember = item.assignedTo
    ? teamMembers?.find(m => m.user_id === item.assignedTo)
    : null;

  return (
    <tr
      ref={setNodeRef}
      style={rowStyle}
      onContextMenu={(e) => openMoveMenu(e, item.id)}
      onMouseEnter={() => setHoverRow(item.id)}
      onMouseLeave={() => setHoverRow(null)}
      {...attributes}
    >
      <td style={{ padding: '0 2px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {bulkMode
            ? <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect(item.id)} style={{ cursor: 'pointer', margin: 0, width: 13, height: 13 }} onClick={e => e.stopPropagation()} />
            : <span {...listeners} title="Drag to reorder" style={{ cursor: isDraggingAny ? 'grabbing' : 'grab', color: isHover ? COLORS.mg : COLORS.ltg, fontSize: 13, lineHeight: 1, padding: '3px 2px', userSelect: 'none', touchAction: 'none', display: 'flex' }}>⠿</span>
          }
          {effectiveAudit && (
            <span title={effectiveAudit.message || effectiveAudit.status}
              style={{ width: 7, height: 7, borderRadius: '50%', background: AUDIT_DOT_COLOR[effectiveAudit.status] || COLORS.mg, flexShrink: 0 }} />
          )}
          <span style={{ color: hasAI ? COLORS.gn : COLORS.mg, fontSize: 8, cursor: 'pointer' }} onClick={() => setExpR(ex ? null : item.id)}>{ex ? '▼' : '▸'}</span>
        </div>
      </td>
      <td style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {tableEdit
            ? cellInput('description')
            : <EditField value={item.description} onCommit={uI('description')} type="text" />
          }
          {item.isAllowance && (
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3, flexShrink: 0, lineHeight: 1.6, background: '#FFF8E8', color: '#B89030', border: '1px solid #D4A843' }}>ALLOW</span>
          )}
        </div>
      </td>
      <td style={{ padding: '4px 8px', fontSize: 10, color: COLORS.mg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tableEdit ? cellInput('subcategory') : item.subcategory}
      </td>
      <td style={{ padding: '4px 8px' }}>{tableEdit ? cellInput('qtyMin') : <EditField value={item.qtyMin} onCommit={uI('qtyMin')} />}</td>
      <td style={{ padding: '4px 8px' }}>{tableEdit ? cellInput('qtyMax') : <EditField value={item.qtyMax} onCommit={uI('qtyMax')} />}</td>
      <td style={{ padding: '4px 8px', fontSize: 10, color: COLORS.mg, textAlign: 'center' }}>
        {tableEdit ? cellInput('unit') : item.unit}
      </td>
      <td style={{ padding: '4px 8px' }}>{tableEdit ? cellInput('unitCostLow') : <EditField value={item.unitCostLow} onCommit={uI('unitCostLow')} />}</td>
      <td style={{ padding: '4px 8px' }}>{tableEdit ? cellInput('unitCostMid') : <EditField value={item.unitCostMid} onCommit={uI('unitCostMid')} />}</td>
      <td style={{ padding: '4px 8px' }}>{tableEdit ? cellInput('unitCostHigh') : <EditField value={item.unitCostHigh} onCommit={uI('unitCostHigh')} />}</td>
      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: COLORS.gn, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(sh)}</td>
      <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg, fontVariantNumeric: 'tabular-nums' }}>{psf(sh, bsf)}</td>
      {/* Trade column */}
      <td style={{ padding: '4px 8px', fontSize: 10, color: item.trade ? COLORS.dg : COLORS.ltg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tableEdit ? cellInput('trade') : (item.trade || '')}
      </td>
      <td style={{ padding: '4px 8px' }}><Badge sensitivity={item.sensitivity} /></td>
      {/* Avatar column */}
      <td style={{ padding: '4px 4px' }}>
        <div ref={assignRef} style={{ position: 'relative' }}>
          <div onClick={() => canEdit && setAssignOpen(v => !v)} style={{ cursor: canEdit ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {assignedMember
              ? <AvatarCircle member={assignedMember} size={22} />
              : <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px dashed ${COLORS.ltg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: COLORS.ltg }}>+</div>
            }
          </div>
          {assignOpen && canEdit && (
            <div style={{ position: 'absolute', right: 0, top: 26, background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: 4, zIndex: 500, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
              <div style={{ padding: '4px 10px 3px', fontSize: 9, fontFamily: FONTS.heading, color: COLORS.mg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Assign to</div>
              {(teamMembers || []).map(m => (
                <button key={m.user_id} onClick={() => { onAssignItem(item.id, m.user_id); setAssignOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', background: m.user_id === item.assignedTo ? `${COLORS.gn}10` : 'transparent', border: 'none', padding: '5px 10px', fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer', color: COLORS.dg, borderRadius: 4 }}>
                  <AvatarCircle member={m} size={18} />
                  <span>{m.profiles?.full_name || m.profiles?.email || 'Member'}</span>
                </button>
              ))}
              {item.assignedTo && (
                <button onClick={() => { onAssignItem(item.id, null); setAssignOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '5px 10px', fontSize: 11, fontFamily: FONTS.body, cursor: 'pointer', color: COLORS.mg, borderRadius: 4, borderTop: `1px solid ${COLORS.bl}`, marginTop: 3 }}>
                  Unassign
                </button>
              )}
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: '4px 4px' }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'flex-end' }}>
          {canEdit && (isHover || item.isAllowance) && (
            <button onClick={() => updateItem(item.id, 'isAllowance', !item.isAllowance)} title={item.isAllowance ? 'Remove allowance flag' : 'Mark as allowance'}
              style={{ background: item.isAllowance ? '#FFF8E8' : 'transparent', border: item.isAllowance ? '1px solid #D4A843' : 'none', color: item.isAllowance ? '#B89030' : COLORS.mg, cursor: 'pointer', fontSize: 9, padding: '1px 4px', borderRadius: 3, fontWeight: 700, lineHeight: 1.4, fontFamily: FONTS.heading }}>$</button>
          )}
          <button onClick={() => onDelete(item)} style={{ background: 'transparent', border: 'none', color: COLORS.ltg, cursor: 'pointer', fontSize: 10 }}>✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────────

const IMPORT_FIELDS = [
  { key: 'category',     label: 'Category',    required: true },
  { key: 'description',  label: 'Description', required: true },
  { key: 'subcategory',  label: 'Subcategory', required: false },
  { key: 'qtyMin',       label: 'Qty Min',     required: false },
  { key: 'qtyMax',       label: 'Qty Max',     required: false },
  { key: 'unit',         label: 'Unit',        required: false },
  { key: 'unitCostLow',  label: '$/Low',       required: false },
  { key: 'unitCostMid',  label: '$/Mid',       required: false },
  { key: 'unitCostHigh', label: '$/High',      required: false },
  { key: 'sensitivity',  label: 'Sensitivity', required: false },
  { key: '--ignore--',   label: '— Ignore —',  required: false },
];

function autoDetectMapping(header) {
  const map = {};
  header.forEach((h, i) => {
    const l = String(h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
    if (/^cat|division|trade|csi/.test(l)) map[i] = 'category';
    else if (/desc|item|scope|work|activity/.test(l)) map[i] = 'description';
    else if (/sub|system/.test(l)) map[i] = 'subcategory';
    else if (/qty.*max|max.*qty|qty.*high/.test(l)) map[i] = 'qtyMax';
    else if (/qty.*min|min.*qty|qty.*low|^qty$|^quantity$/.test(l)) map[i] = 'qtyMin';
    else if (/^unit$|^uom$|^measure/.test(l)) map[i] = 'unit';
    else if (/cost.*low|low.*cost|\/low/.test(l)) map[i] = 'unitCostLow';
    else if (/cost.*high|high.*cost|\/high/.test(l)) map[i] = 'unitCostHigh';
    else if (/unit.*cost|unit.*price|\/mid|^cost$|^price$|^amount$/.test(l)) map[i] = 'unitCostMid';
    else if (/sensitiv|risk|conf/.test(l)) map[i] = 'sensitivity';
    else map[i] = '--ignore--';
  });
  return map;
}

function ImportModal({ onClose, createItem }) {
  const [rows, setRows] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function processFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { setError('Please upload an Excel (.xlsx/.xls) or CSV file.'); return; }
    setError(null);
    try {
      let parsed = [];
      if (ext === 'csv') {
        parsed = parseCSV(await file.text());
      } else {
        const XLSX = (await import('xlsx')).default;
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        parsed = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      }
      const nonEmpty = parsed.filter(r => r.some(c => String(c).trim()));
      if (!nonEmpty.length) { setError('No data found in file.'); return; }
      setRows(nonEmpty);
      setMapping(autoDetectMapping(nonEmpty[0]));
    } catch (err) { setError(err.message || 'Failed to parse file.'); }
  }

  function getColIdx(field) {
    return Object.keys(mapping).find(i => mapping[i] === field);
  }

  function getVal(row, field) {
    const idx = getColIdx(field);
    return idx !== undefined ? String(row[idx] ?? '') : '';
  }

  function parseNum(v) {
    const n = parseFloat(String(v).replace(/[$, ]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  async function handleImport() {
    if (!rows) return;
    const catIdx = getColIdx('category');
    const descIdx = getColIdx('description');
    if (!catIdx && catIdx !== 0) { setError('Map a Category column first.'); return; }
    if (!descIdx && descIdx !== 0) { setError('Map a Description column first.'); return; }

    setImporting(true);
    try {
      const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim()));
      for (const row of dataRows) {
        const desc = String(row[descIdx] ?? '').trim();
        const cat  = String(row[catIdx]  ?? '').trim();
        if (!desc || !cat) continue;
        const qMin = parseNum(getVal(row, 'qtyMin')) || 1;
        const qMax = parseNum(getVal(row, 'qtyMax')) || qMin;
        const uMid = parseNum(getVal(row, 'unitCostMid'));
        const rawSens = getVal(row, 'sensitivity').trim();
        const sens = SENSITIVITIES.includes(rawSens) ? rawSens : 'Medium';
        await createItem(cat, {
          description: desc,
          subcategory: getVal(row, 'subcategory'),
          qtyMin: qMin, qtyMax: qMax,
          unit: getVal(row, 'unit') || 'LS',
          unitCostLow:  parseNum(getVal(row, 'unitCostLow'))  || uMid,
          unitCostMid:  uMid,
          unitCostHigh: parseNum(getVal(row, 'unitCostHigh')) || uMid,
          sensitivity: sens,
        });
      }
      onClose();
    } finally { setImporting(false); }
  }

  const header = rows?.[0] ?? [];
  const preview = rows?.slice(1, 4) ?? [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: COLORS.wh, borderRadius: 12, maxWidth: 860, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${COLORS.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 16, color: COLORS.dg }}>Import Line Items</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.mg, marginTop: 2 }}>Upload an Excel or CSV file, then map columns to fields.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: COLORS.mg, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Upload zone */}
          {!rows && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
              onClick={() => inputRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? GOLD : COLORS.bd}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#FFFDF5' : '#fff', transition: 'border-color 0.15s' }}
            >
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} style={{ display: 'none' }} />
              <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 14, color: '#555', fontWeight: 500, marginBottom: 6 }}>Drag &amp; drop or click to upload</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.mg }}>.xlsx, .xls, .csv</div>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontFamily: FONTS.body, fontSize: 13, color: '#dc2626', marginTop: 12 }}>{error}</div>
          )}

          {/* Column mapping */}
          {rows && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: COLORS.dg, marginBottom: 4 }}>Map Columns</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.mg }}>
                  {rows.length - 1} data rows detected. Adjust mappings if needed.
                </div>
              </div>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, fontFamily: FONTS.body, width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#F5F5F0' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, borderBottom: `2px solid ${COLORS.bd}`, whiteSpace: 'nowrap' }}>Column in file</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, borderBottom: `2px solid ${COLORS.bd}`, whiteSpace: 'nowrap' }}>Maps to field</th>
                      {preview.map((_, ri) => (
                        <th key={ri} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, borderBottom: `2px solid ${COLORS.bd}`, whiteSpace: 'nowrap' }}>Row {ri + 1} preview</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {header.map((h, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${COLORS.bl}` }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: COLORS.dg, whiteSpace: 'nowrap' }}>{String(h)}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <select
                            value={mapping[i] || '--ignore--'}
                            onChange={e => setMapping(m => ({ ...m, [i]: e.target.value }))}
                            style={{ border: `1px solid ${COLORS.bd}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontFamily: FONTS.body, background: '#fff', cursor: 'pointer', outline: 'none' }}
                          >
                            {IMPORT_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                          </select>
                        </td>
                        {preview.map((row, ri) => (
                          <td key={ri} style={{ padding: '6px 10px', color: COLORS.mg, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[i] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => { setRows(null); setMapping({}); setError(null); }}
                style={{ background: 'none', border: `1px solid ${COLORS.bd}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontFamily: FONTS.body, color: COLORS.mg, cursor: 'pointer' }}>
                ↩ Upload different file
              </button>
            </>
          )}
        </div>

        {rows && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${COLORS.bd}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ background: 'none', border: `1px solid ${COLORS.bd}`, borderRadius: 7, padding: '9px 20px', fontFamily: FONTS.body, fontSize: 13, color: '#555', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleImport} disabled={importing}
              style={{ background: importing ? '#d4b86a' : GOLD, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 22px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: importing ? 'not-allowed' : 'pointer' }}>
              {importing ? 'Importing…' : `Import ${rows.length - 1} rows →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CostModel({ items, globals, activeItems, totals, updateItem, createItem, reorderItems, bsf, aiAdvice, aiLoading, askAI, applyAI, registerUndo, canEdit, project, scenarioName, teamMembers = [], user }) {
  const { mob } = useWindowSize();
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('All');
  const [col, setCol] = useState(new Set());
  const [expR, setExpR] = useState(null);
  const [cv, setCv] = useState('mid');
  const [addingItemCat, setAddingItemCat] = useState(null);
  const [draft, setDraft] = useState({});
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [hoverRow, setHoverRow] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [catOrder, setCatOrder] = useState(null);
  const [moveMenu, setMoveMenu] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);
  const undoItemRef = useRef(null);

  // Table Edit mode
  const [tableEdit, setTableEdit] = useState(false);
  const [activeCell, setActiveCell] = useState(null); // { itemId, field }
  const [cellValues, setCellValues] = useState({});   // { 'itemId_field': pendingValue }
  const tableEditTimers = useRef({});

  // Export / Import
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Audit
  const [auditResults, setAuditResults] = useState({}); // { itemId: { status, message } }
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditReport, setAuditReport] = useState(null);

  // Bulk selection
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [assignFilter, setAssignFilter] = useState('all'); // 'all' | 'me' | 'unassigned'
  const [bulkAssignMenuOpen, setBulkAssignMenuOpen] = useState(false);
  const bulkAssignRef = useRef(null);

  useEffect(() => {
    if (!bulkAssignMenuOpen) return;
    const close = (e) => { if (bulkAssignRef.current && !bulkAssignRef.current.contains(e.target)) setBulkAssignMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [bulkAssignMenuOpen]);

  // Close context menus on outside click
  useEffect(() => {
    if (!moveMenu) return;
    const close = () => setMoveMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [moveMenu]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const close = (e) => { if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [exportMenuOpen]);

  // ── Undo delete ──────────────────────────────────────────────────────────────
  const handleDeleteItem = useCallback((item) => {
    updateItem(item.id, 'isArchived', true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoItemRef.current = item;
    setUndoToast({ id: item.id, description: item.description });
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null); undoItemRef.current = null; undoTimerRef.current = null;
    }, 5000);
  }, [updateItem]);

  const handleUndo = useCallback(() => {
    if (!undoItemRef.current) return;
    clearTimeout(undoTimerRef.current);
    updateItem(undoItemRef.current.id, 'isArchived', false);
    setUndoToast(null); undoItemRef.current = null; undoTimerRef.current = null;
  }, [updateItem]);

  useEffect(() => { if (registerUndo) registerUndo(handleUndo); }, [registerUndo, handleUndo]);
  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  // ── Table edit handlers ──────────────────────────────────────────────────────
  const handleCellChange = useCallback((itemId, field, value) => {
    const key = `${itemId}_${field}`;
    setCellValues(prev => ({ ...prev, [key]: value }));
    clearTimeout(tableEditTimers.current[key]);
    tableEditTimers.current[key] = setTimeout(() => {
      updateItem(itemId, field, value);
      setCellValues(prev => { const n = { ...prev }; delete n[key]; return n; });
    }, 500);
  }, [updateItem]);

  const onActivateCell = useCallback((itemId, field) => {
    if (!itemId) { setActiveCell(null); return; }
    setActiveCell({ itemId, field });
  }, []);

  const navigateCell = useCallback((itemId, field, direction) => {
    const colIdx = TABLE_COLS.indexOf(field);
    const rowIdx = flatItems.findIndex(i => i.id === itemId);
    if (direction === 'tab') {
      if (colIdx < TABLE_COLS.length - 1) setActiveCell({ itemId, field: TABLE_COLS[colIdx + 1] });
      else if (rowIdx < flatItems.length - 1) setActiveCell({ itemId: flatItems[rowIdx + 1].id, field: TABLE_COLS[0] });
    } else if (direction === 'shift-tab') {
      if (colIdx > 0) setActiveCell({ itemId, field: TABLE_COLS[colIdx - 1] });
      else if (rowIdx > 0) setActiveCell({ itemId: flatItems[rowIdx - 1].id, field: TABLE_COLS[TABLE_COLS.length - 1] });
    } else if (direction === 'enter') {
      if (rowIdx < flatItems.length - 1) setActiveCell({ itemId: flatItems[rowIdx + 1].id, field });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Table edit context menu ──────────────────────────────────────────────────
  const handleInsertItem = async (referenceItemId, position) => {
    const refItem = flatItems.find(i => i.id === referenceItemId);
    if (!refItem) return;
    setMoveMenu(null);
    const { data: newItem } = await createItem(refItem.category, { description: '' });
    if (!newItem) return;
    const refIdx = flatItems.findIndex(i => i.id === referenceItemId);
    const insertIdx = position === 'above' ? refIdx : refIdx + 1;
    const newOrder = [...flatItems.slice(0, insertIdx), newItem, ...flatItems.slice(insertIdx)];
    const updates = newOrder.map((it, idx) => ({ id: it.id, sortOrder: idx }));
    reorderItems(updates);
    flash(newItem.id);
  };

  const handleDuplicateItem = async (itemId) => {
    const item = flatItems.find(i => i.id === itemId);
    if (!item) return;
    setMoveMenu(null);
    const { data: newItem } = await createItem(item.category, {
      description: item.description + ' (Copy)',
      subcategory: item.subcategory, qtyMin: item.qtyMin, qtyMax: item.qtyMax,
      unit: item.unit, unitCostLow: item.unitCostLow, unitCostMid: item.unitCostMid,
      unitCostHigh: item.unitCostHigh, sensitivity: item.sensitivity,
    });
    if (!newItem) return;
    const refIdx = flatItems.findIndex(i => i.id === itemId);
    const newOrder = [...flatItems.slice(0, refIdx + 1), newItem, ...flatItems.slice(refIdx + 1)];
    reorderItems(newOrder.map((it, idx) => ({ id: it.id, sortOrder: idx })));
    flash(newItem.id);
  };

  // ── Export handlers ──────────────────────────────────────────────────────────
  async function handleExportExcel() {
    setExportMenuOpen(false);
    try {
      const body = {
        items: activeItems.map(i => ({
          category: i.category, subcategory: i.subcategory, description: i.description,
          qtyMin: i.qtyMin, qtyMax: i.qtyMax, unit: i.unit,
          unitCostLow: i.unitCostLow, unitCostMid: i.unitCostMid, unitCostHigh: i.unitCostHigh,
          sensitivity: i.sensitivity, isAllowance: i.isAllowance,
          isArchived: i.isArchived, inSummary: i.inSummary,
        })),
        globals,
        projectName: project?.name || 'Estimate',
        scenarioName: scenarioName || 'Baseline',
      };
      const res = await fetch('/api/export-excel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${(project?.name || 'Estimate').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      analytics.excelExported(project?.id);
    } catch (err) { console.error('[exportExcel]', err); }
  }

  function handleExportCSV() {
    setExportMenuOpen(false);
    const header = ['Category', 'Subcategory', 'Description', 'Qty Min', 'Qty Max', 'Unit', '$/Low', '$/Mid', '$/High', 'Total Low', 'Total Mid', 'Total High', 'Sensitivity'];
    const rows = [header, ...activeItems.map(i => {
      const qAvg = ((i.qtyMin || 0) + (i.qtyMax || 0)) / 2;
      return [
        i.category, i.subcategory, i.description, i.qtyMin, i.qtyMax, i.unit,
        i.unitCostLow, i.unitCostMid, i.unitCostHigh,
        Math.round((i.qtyMin || 0) * (i.unitCostLow || 0)),
        Math.round(qAvg * (i.unitCostMid || 0)),
        Math.round((i.qtyMax || 0) * (i.unitCostHigh || 0)),
        i.sensitivity,
      ];
    })];
    downloadText(rows.map(r => r.map(csvEsc).join(',')).join('\n'), `${(project?.name || 'Estimate').replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    analytics.excelExported(project?.id);
  }

  function handleExportProcore() {
    setExportMenuOpen(false);
    const header = ['cost_code', 'description', 'budgeted_amount', 'unit_of_measure', 'unit_quantity', 'unit_cost'];
    const rows = [header, ...activeItems.map(i => {
      const qAvg = ((i.qtyMin || 0) + (i.qtyMax || 0)) / 2;
      return [i.category, i.description, Math.round(qAvg * (i.unitCostMid || 0)), i.unit || 'LS', qAvg, i.unitCostMid || 0];
    })];
    downloadText(rows.map(r => r.map(csvEsc).join(',')).join('\n'), `${(project?.name || 'Estimate').replace(/[^a-zA-Z0-9]/g, '_')}_Procore.csv`);
  }

  // ── AI Audit ─────────────────────────────────────────────────────────────────
  async function handleRunAudit() {
    setAuditLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/ai-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: activeItems.map(i => ({
            id: i.id, category: i.category, subcategory: i.subcategory,
            description: i.description, qtyMin: i.qtyMin, qtyMax: i.qtyMax,
            unit: i.unit, unitCostLow: i.unitCostLow, unitCostMid: i.unitCostMid,
            unitCostHigh: i.unitCostHigh, isArchived: i.isArchived, inSummary: i.inSummary,
          })),
          globals,
          bsf,
          projectName: project?.name || 'Estimate',
          scenarioName: scenarioName || 'Baseline',
        }),
      });
      const data = await res.json();
      if (!res.ok) { console.error('[audit]', data.error); return; }
      // Build auditResults map
      const resultMap = {};
      (data.itemAudits || []).forEach(a => { resultMap[a.id] = { status: a.status, message: a.message || '' }; });
      setAuditResults(resultMap);
      setAuditReport(data);
      setAuditModalOpen(true);
      // Persist to DB (fire-and-forget)
      Object.entries(resultMap).forEach(([id, result]) => updateItem(id, 'aiAdvice', result));
    } catch (err) {
      console.error('[audit] Error:', err);
    } finally {
      setAuditLoading(false);
    }
  }

  // ── Assignment ───────────────────────────────────────────────────────────────
  function handleAssignItem(itemId, userId) {
    updateItem(itemId, 'assignedTo', userId);
  }

  function handleBulkAssign(userId) {
    selectedItems.forEach(id => updateItem(id, 'assignedTo', userId));
    setSelectedItems(new Set());
    setBulkMode(false);
    setBulkAssignMenuOpen(false);
  }

  function toggleSelectItem(itemId) {
    setSelectedItems(prev => {
      const n = new Set(prev);
      n.has(itemId) ? n.delete(itemId) : n.add(itemId);
      return n;
    });
  }

  // ── dnd-kit sensors ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const inpStyle = { width: '100%', border: 'none', borderBottom: `1px solid ${COLORS.bd}`, outline: 'none', background: 'transparent', fontSize: 12, fontFamily: FONTS.body, color: COLORS.dg, padding: '1px 0' };

  const openAddItem = (cat) => { setAddingItemCat(cat); setDraft({ unit: 'LS', sensitivity: 'Medium' }); };
  const cancelAddItem = () => { setAddingItemCat(null); setDraft({}); };

  const handleSaveNewItem = async () => {
    if (!draft.description?.trim() || addSaving) return;
    setAddSaving(true);
    const { error } = await createItem(addingItemCat, {
      description: draft.description.trim(),
      subcategory: draft.subcategory || '',
      qtyMin: Number(draft.qtyMin) || 1, qtyMax: Number(draft.qtyMax) || 1,
      unit: draft.unit || 'LS',
      unitCostLow: Number(draft.unitCostLow) || 0, unitCostMid: Number(draft.unitCostMid) || 0,
      unitCostHigh: Number(draft.unitCostHigh) || 0,
      sensitivity: draft.sensitivity || 'Medium',
    });
    setAddSaving(false);
    if (!error) cancelAddItem();
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    setNewCatName(''); setAddingCat(false); openAddItem(name);
  };

  const flash = (id) => { setFlashId(id); setTimeout(() => setFlashId(null), 700); };

  const moveCatUp = (cat) => {
    const order = catOrder ?? groups.map(g => g.c);
    const idx = order.indexOf(cat);
    if (idx <= 0) return;
    const n = [...order]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; setCatOrder(n);
  };
  const moveCatDown = (cat) => {
    const order = catOrder ?? groups.map(g => g.c);
    const idx = order.indexOf(cat);
    if (idx < 0 || idx >= order.length - 1) return;
    const n = [...order]; [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; setCatOrder(n);
  };

  const moveItemToCategory = (itemId, newCat) => { updateItem(itemId, 'category', newCat); flash(itemId); setMoveMenu(null); };

  const openMoveMenu = (e, itemId) => {
    e.preventDefault(); e.stopPropagation();
    setMoveMenu({ itemId, x: e.clientX, y: e.clientY });
  };

  const filtered = useMemo(() => activeItems.filter(i => {
    if (assignFilter === 'me' && i.assignedTo !== user?.id) return false;
    if (assignFilter === 'unassigned' && i.assignedTo) return false;
    if (fCat !== 'All' && i.category !== fCat) return false;
    if (search) return `${i.description} ${i.category} ${i.subcategory}`.toLowerCase().includes(search.toLowerCase());
    return true;
  }), [activeItems, fCat, search, assignFilter, user]);

  const groups = useMemo(() => {
    const g = {};
    filtered.forEach(i => { if (!g[i.category]) g[i.category] = []; g[i.category].push(i); });
    const allCats = Object.keys(g);
    const ordered = [...CSI_ORDER.filter(c => g[c]), ...allCats.filter(c => !CSI_ORDER.includes(c))];
    return ordered.map(c => ({ c, items: g[c], t: CE.categoryTotals(items, globals, c) }));
  }, [filtered, items, globals]);

  const orderedGroups = useMemo(() => {
    const order = catOrder ?? groups.map(g => g.c);
    const gMap = Object.fromEntries(groups.map(g => [g.c, g]));
    return [...order.filter(c => gMap[c]).map(c => gMap[c]), ...groups.filter(g => !order.includes(g.c))];
  }, [groups, catOrder]);

  const flatItems = useMemo(
    () => orderedGroups.flatMap(g => col.has(g.c) ? [] : g.items),
    [orderedGroups, col],
  );

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }) => { setDragId(active.id); setExpR(null); }, []);
  const handleDragOver  = useCallback(({ over }) => { setOverId(over?.id ?? null); }, []);
  const handleDragEnd = useCallback(({ active, over }) => {
    setDragId(null); setOverId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = flatItems.findIndex(i => i.id === active.id);
    const newIdx = flatItems.findIndex(i => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const movedItem = flatItems[oldIdx];
    const newCategory = flatItems[newIdx].category;
    const categoryChanged = movedItem.category !== newCategory;
    const reordered = arrayMove(flatItems, oldIdx, newIdx);
    const updates = reordered.reduce((acc, item, idx) => {
      const orig = flatItems.find(i => i.id === item.id);
      const isMovedItem = item.id === active.id;
      if (orig.sortOrder !== idx || (isMovedItem && categoryChanged)) {
        acc.push({ id: item.id, sortOrder: idx, ...(isMovedItem && categoryChanged ? { category: newCategory } : {}) });
      }
      return acc;
    }, []);
    if (updates.length) reorderItems(updates);
  }, [flatItems, reorderItems]);

  const toggleCol = (c) => setCol(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const cvk = CE.cvKey(cv);
  const arrowBtn = (onClick, disabled, label) => (
    <button onClick={onClick} disabled={disabled} style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', color: disabled ? '#ddd' : COLORS.mg, fontSize: 8, padding: 0, lineHeight: 1.3, display: 'block' }}>{label}</button>
  );
  const dragItem = dragId ? flatItems.find(i => i.id === dragId) : null;
  const isDraggingAny = dragId !== null;

  const tbBtn = (onClick, label, active) => (
    <button onClick={onClick} style={{
      background: active ? COLORS.gn : COLORS.wh, color: active ? COLORS.wh : COLORS.dg,
      border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: '10px 14px',
      fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer',
      textTransform: 'uppercase', letterSpacing: 0.5, minHeight: 42, whiteSpace: 'nowrap',
    }}>{label}</button>
  );

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, color: COLORS.dg, padding: '10px 12px', fontSize: 14, fontFamily: FONTS.body, outline: 'none', flex: mob ? '1 1 100%' : '0 0 200px', minHeight: 42 }} />
        <select value={fCat} onChange={e => setFCat(e.target.value)}
          style={{ background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, color: COLORS.dg, padding: '10px', fontSize: 12, fontFamily: FONTS.body, flex: mob ? '1 1 48%' : '0 0 auto', minHeight: 42 }}>
          <option value="All">All Categories</option>
          {CSI_ORDER.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', border: `1px solid ${COLORS.bd}`, borderRadius: 8, overflow: 'hidden', flex: mob ? '1 1 48%' : '0 0 auto' }}>
          {['low', 'mid', 'high'].map(v => (
            <button key={v} onClick={() => setCv(v)} style={{ background: cv === v ? COLORS.gn : COLORS.wh, color: cv === v ? COLORS.wh : COLORS.dg, border: 'none', padding: '10px 14px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', flex: 1 }}>{v}</button>
          ))}
        </div>

        {!mob && (
          <>
            {/* Table Edit toggle */}
            {tbBtn(() => { setTableEdit(t => !t); setActiveCell(null); setCellValues({}); }, tableEdit ? '⊠ Table Edit' : '⊞ Table Edit', tableEdit)}

            {/* Export dropdown */}
            <div ref={exportMenuRef} style={{ position: 'relative' }}>
              <button onClick={() => setExportMenuOpen(v => !v)}
                style={{ background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer', minHeight: 42, display: 'flex', alignItems: 'center', gap: 4 }}>
                Export <span style={{ fontSize: 8 }}>▾</span>
              </button>
              {exportMenuOpen && (
                <div style={{ position: 'absolute', top: 46, left: 0, background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: 4, zIndex: 200, minWidth: 200, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
                  {[
                    ['📊 Excel (.xlsx)', handleExportExcel],
                    ['📄 CSV', handleExportCSV],
                    ['🏗 Procore CSV', handleExportProcore],
                  ].map(([label, fn]) => (
                    <button key={label} onClick={fn}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 14px', fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer', color: COLORS.dg, borderRadius: 4 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Import button */}
            <button onClick={() => setImportOpen(true)}
              style={{ background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer', minHeight: 42 }}>
              Import
            </button>

            {/* Audit button */}
            <button onClick={handleRunAudit} disabled={auditLoading}
              style={{ background: auditLoading ? COLORS.sf : '#1E3A5F', color: auditLoading ? COLORS.mg : '#fff', border: `1px solid ${auditLoading ? COLORS.bd : '#1E3A5F'}`, borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: auditLoading ? 'wait' : 'pointer', minHeight: 42, whiteSpace: 'nowrap' }}>
              {auditLoading ? '⟳ Auditing…' : '✦ Audit'}
            </button>

            {/* Bulk select toggle */}
            {tbBtn(() => { setBulkMode(t => !t); if (bulkMode) setSelectedItems(new Set()); }, bulkMode ? '⊠ Bulk' : '⊡ Bulk', bulkMode)}
          </>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all', 'All'], ['me', 'Assigned to Me'], ['unassigned', 'Unassigned']].map(([v, label]) => (
          <button key={v} onClick={() => setAssignFilter(v)}
            style={{ background: assignFilter === v ? COLORS.gn : COLORS.wh, color: assignFilter === v ? COLORS.wh : COLORS.mg, border: `1px solid ${assignFilter === v ? COLORS.gn : COLORS.bd}`, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
        {auditReport && (
          <button onClick={() => setAuditModalOpen(true)}
            style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
            View Audit Report
          </button>
        )}
      </div>

      {/* Audit summary bar */}
      {auditReport && (
        <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 8, padding: '7px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, fontFamily: FONTS.body, flexWrap: 'wrap' }}>
          <span style={{ color: COLORS.mg }}>{auditReport.summary.total} items audited:</span>
          <span style={{ color: '#166534', fontWeight: 600 }}>● {auditReport.summary.inRange} in range</span>
          <span style={{ color: '#92400E', fontWeight: 600 }}>● {auditReport.summary.caution} caution</span>
          <span style={{ color: '#991B1B', fontWeight: 600 }}>● {auditReport.summary.flagged} flagged</span>
        </div>
      )}

      {/* Table Edit banner */}
      {tableEdit && (
        <div style={{ background: '#FFFBF0', border: '1px solid #E8D5A0', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontFamily: FONTS.body, fontSize: 12, color: '#8a6a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Table Edit mode · Tab = next cell · Enter = next row · Esc = cancel · Right-click for row actions</span>
          <button onClick={() => { setTableEdit(false); setActiveCell(null); setCellValues({}); }}
            style={{ background: 'none', border: 'none', color: '#8a6a1a', cursor: 'pointer', fontSize: 12, fontFamily: FONTS.heading, fontWeight: 600 }}>Exit</button>
        </div>
      )}

      {/* Empty state */}
      {orderedGroups.length === 0 && !search && fCat === 'All' && (
        <div style={{ background: '#fff', border: '1.5px dashed #d8d8d4', borderRadius: 12, padding: '48px 24px', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 8 }}>No line items yet</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#999', marginBottom: 20 }}>Generate line items with AI or add them manually.</div>
          <button onClick={() => setAddingCat(true)} style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Add First Item</button>
        </div>
      )}

      {/* Mobile: Card layout */}
      {mob ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orderedGroups.map(g => {
            const cl = col.has(g.c);
            return (
              <div key={g.c}>
                <div onClick={() => toggleCol(g.c)} style={{ background: '#FAFAF6', border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, fontFamily: FONTS.heading, color: COLORS.gn }}>{g.c.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: COLORS.mg }}>{g.items.length} items</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn, fontSize: 14 }}>{fK(g.t[cvk])}</div>
                    <div style={{ fontSize: 10, color: COLORS.mg }}>{psf(g.t[cvk], bsf)} · {cl ? '▶' : '▼'}</div>
                  </div>
                </div>
                {!cl && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {g.items.map(item => {
                      const sh = CE.itemTotal(item, cv);
                      const ex = expR === item.id;
                      const hasAI = aiAdvice?.[item.id] || aiLoading?.has(item.id);
                      return (
                        <div key={item.id} style={{ background: COLORS.wh, border: `1px solid ${ex ? COLORS.yl : hasAI ? `${COLORS.gn}44` : COLORS.bd}`, borderRadius: 10, overflow: 'hidden', borderLeft: item.isAllowance ? '4px dashed #B89030' : undefined }}>
                          <div onClick={() => setExpR(ex ? null : item.id)} style={{ padding: '12px 14px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                                  {item.isAllowance && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.8, padding: '1px 5px', borderRadius: 3, background: '#FFF8E8', color: '#B89030', border: '1px solid #D4A843', flexShrink: 0 }}>ALLOW</span>}
                                </div>
                                <div style={{ fontSize: 11, color: COLORS.mg }}>{item.subcategory} · {item.unit}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn }}>{fK(sh)}</div>
                                <Badge sensitivity={item.sensitivity} mob />
                              </div>
                            </div>
                          </div>
                          {ex && <ItemDetailPanel item={item} updateItem={updateItem} aiAdvice={aiAdvice} aiLoading={aiLoading} askAI={askAI} applyAI={applyAI} mob={mob} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop/Tablet: Table layout */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div style={{ borderRadius: 10, border: `1px solid ${COLORS.bd}`, overflow: 'clip', background: COLORS.wh }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONTS.body, minWidth: 1160 }}>
                <thead>
                  <tr style={{ background: '#F5F5F0' }}>
                    {[['', '3%'], ['Description', '21%'], ['Sub', '9%'], ['Qty Min', '6%', true], ['Qty Max', '6%', true], ['Unit', '4%', true], ['$/Low', '6%', true], ['$/Mid', '6%', true], ['$/High', '6%', true], [cv.toUpperCase() + ' Total', '8%', true], ['$/SF', '5%', true], ['Trade', '6%'], ['Sens', '4%'], ['Asn', '3%', true], ['', '2%']].map(([l, w, r], i) => (
                      <th key={i} style={{ width: w, padding: '9px 8px', textAlign: r ? 'right' : 'left', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={flatItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {orderedGroups.map((g, gIdx) => {
                      const cl = col.has(g.c);
                      const isFirst = gIdx === 0;
                      const isLast  = gIdx === orderedGroups.length - 1;
                      return [
                        <tr key={`c_${g.c}`} style={{ background: '#FAFAF6', cursor: 'pointer', borderBottom: `1px solid ${COLORS.bd}` }} onClick={() => toggleCol(g.c)}>
                          <td style={{ padding: '8px 4px' }}><span style={{ color: COLORS.gn, fontSize: 9 }}>{cl ? '▶' : '▼'}</span></td>
                          <td colSpan={8} style={{ padding: '8px 8px', fontWeight: 700, fontSize: 12, fontFamily: FONTS.heading, color: COLORS.gn }}>{g.c.toUpperCase()} <span style={{ color: COLORS.mg, fontWeight: 400, fontSize: 10, fontFamily: FONTS.body }}>({g.items.length})</span></td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn, fontVariantNumeric: 'tabular-nums' }}>{fmt(g.t[cvk])}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg, fontVariantNumeric: 'tabular-nums' }}>{psf(g.t[cvk], bsf)}</td>
                          <td colSpan={4} style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            {arrowBtn((e) => { e.stopPropagation(); moveCatUp(g.c); }, isFirst, '▲')}
                            {arrowBtn((e) => { e.stopPropagation(); moveCatDown(g.c); }, isLast, '▼')}
                          </td>
                        </tr>,
                        ...(!cl ? g.items.flatMap(item => [
                          <SortableItemRow
                            key={item.id} item={item} cv={cv} bsf={bsf} mob={mob}
                            hoverRow={hoverRow} setHoverRow={setHoverRow}
                            expR={expR} setExpR={setExpR} flashId={flashId}
                            updateItem={updateItem} onDelete={handleDeleteItem}
                            aiAdvice={aiAdvice} aiLoading={aiLoading} askAI={askAI} applyAI={applyAI}
                            openMoveMenu={openMoveMenu} overId={overId} isDraggingAny={isDraggingAny} canEdit={canEdit}
                            tableEdit={tableEdit} activeCell={activeCell} onActivateCell={onActivateCell}
                            onCellChange={handleCellChange} onNavCell={navigateCell} cellValues={cellValues}
                            auditStatus={auditResults[item.id]}
                            teamMembers={teamMembers} onAssignItem={handleAssignItem}
                            selected={selectedItems.has(item.id)} onToggleSelect={toggleSelectItem} bulkMode={bulkMode}
                          />,
                          expR === item.id && !isDraggingAny && (
                            <tr key={`${item.id}_x`} style={{ background: '#F8F8F3', borderBottom: `1px solid ${COLORS.bd}` }}>
                              <td colSpan={15}><ItemDetailPanel item={item} updateItem={updateItem} aiAdvice={aiAdvice} aiLoading={aiLoading} askAI={askAI} applyAI={applyAI} mob={mob} /></td>
                            </tr>
                          ),
                        ]) : []),
                        addingItemCat === g.c
                          ? <tr key={`${g.c}_newr`} style={{ background: `${COLORS.gn}06`, borderBottom: `1px solid ${COLORS.bd}` }}>
                              <td style={{ padding: '4px 4px' }} />
                              <td style={{ padding: '4px 8px' }}><input autoFocus placeholder="Description…" value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSaveNewItem()} style={inpStyle} /></td>
                              <td style={{ padding: '4px 8px' }}><input placeholder="Subcategory" value={draft.subcategory || ''} onChange={e => setDraft(p => ({ ...p, subcategory: e.target.value }))} style={inpStyle} /></td>
                              <td style={{ padding: '4px 8px' }}><input type="number" placeholder="1" value={draft.qtyMin ?? ''} onChange={e => setDraft(p => ({ ...p, qtyMin: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                              <td style={{ padding: '4px 8px' }}><input type="number" placeholder="1" value={draft.qtyMax ?? ''} onChange={e => setDraft(p => ({ ...p, qtyMax: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                              <td style={{ padding: '4px 8px' }}><input placeholder="LS" value={draft.unit || ''} onChange={e => setDraft(p => ({ ...p, unit: e.target.value }))} style={{ ...inpStyle, textAlign: 'center' }} /></td>
                              <td style={{ padding: '4px 8px' }}><input type="number" placeholder="0" value={draft.unitCostLow ?? ''} onChange={e => setDraft(p => ({ ...p, unitCostLow: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                              <td style={{ padding: '4px 8px' }}><input type="number" placeholder="0" value={draft.unitCostMid ?? ''} onChange={e => setDraft(p => ({ ...p, unitCostMid: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                              <td style={{ padding: '4px 8px' }}><input type="number" placeholder="0" value={draft.unitCostHigh ?? ''} onChange={e => setDraft(p => ({ ...p, unitCostHigh: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg }}>—</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg }}>—</td>
                              <td style={{ padding: '4px 8px' }} />{/* Trade */}
                              <td style={{ padding: '4px 8px' }}>
                                <select value={draft.sensitivity || 'Medium'} onChange={e => setDraft(p => ({ ...p, sensitivity: e.target.value }))} style={{ ...inpStyle, fontSize: 10 }}>
                                  {SENSITIVITIES.map(s => <option key={s}>{s}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '4px 4px' }} />{/* Avatar */}
                              <td style={{ padding: '4px 4px', whiteSpace: 'nowrap' }}>
                                <button onClick={handleSaveNewItem} disabled={!draft.description?.trim() || addSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.gn, fontWeight: 700, fontSize: 13, padding: '0 2px' }}>{addSaving ? '…' : '✓'}</button>
                                <button onClick={cancelAddItem} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.mg, fontSize: 13, padding: '0 2px' }}>✕</button>
                              </td>
                            </tr>
                          : <tr key={`${g.c}_addtrig`} onClick={() => openAddItem(g.c)} style={{ cursor: 'pointer', borderBottom: `1px solid ${COLORS.bl}` }}>
                              <td colSpan={15} style={{ padding: '5px 8px 5px 28px', fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, userSelect: 'none' }}>+ Add item</td>
                            </tr>,
                      ];
                    }).flat()}
                  </SortableContext>

                  {addingItemCat && !groups.some(g => g.c === addingItemCat) && [
                    <tr key="newcat_hdr" style={{ background: '#FAFAF6', borderBottom: `1px solid ${COLORS.bd}` }}>
                      <td style={{ padding: '8px 4px' }}><span style={{ color: COLORS.gn, fontSize: 9 }}>▼</span></td>
                      <td colSpan={14} style={{ padding: '8px 8px', fontWeight: 700, fontSize: 12, fontFamily: FONTS.heading, color: COLORS.gn }}>{addingItemCat.toUpperCase()} <span style={{ color: COLORS.mg, fontWeight: 400, fontSize: 10, fontFamily: FONTS.body }}>(new)</span></td>
                    </tr>,
                    <tr key="newcat_newr" style={{ background: `${COLORS.gn}06`, borderBottom: `1px solid ${COLORS.bd}` }}>
                      <td style={{ padding: '4px 4px' }} />
                      <td style={{ padding: '4px 8px' }}><input autoFocus placeholder="Description…" value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSaveNewItem()} style={inpStyle} /></td>
                      <td style={{ padding: '4px 8px' }}><input placeholder="Subcategory" value={draft.subcategory || ''} onChange={e => setDraft(p => ({ ...p, subcategory: e.target.value }))} style={inpStyle} /></td>
                      <td style={{ padding: '4px 8px' }}><input type="number" placeholder="1" value={draft.qtyMin ?? ''} onChange={e => setDraft(p => ({ ...p, qtyMin: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                      <td style={{ padding: '4px 8px' }}><input type="number" placeholder="1" value={draft.qtyMax ?? ''} onChange={e => setDraft(p => ({ ...p, qtyMax: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                      <td style={{ padding: '4px 8px' }}><input placeholder="LS" value={draft.unit || ''} onChange={e => setDraft(p => ({ ...p, unit: e.target.value }))} style={{ ...inpStyle, textAlign: 'center' }} /></td>
                      <td style={{ padding: '4px 8px' }}><input type="number" placeholder="0" value={draft.unitCostLow ?? ''} onChange={e => setDraft(p => ({ ...p, unitCostLow: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                      <td style={{ padding: '4px 8px' }}><input type="number" placeholder="0" value={draft.unitCostMid ?? ''} onChange={e => setDraft(p => ({ ...p, unitCostMid: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                      <td style={{ padding: '4px 8px' }}><input type="number" placeholder="0" value={draft.unitCostHigh ?? ''} onChange={e => setDraft(p => ({ ...p, unitCostHigh: e.target.value }))} style={{ ...inpStyle, textAlign: 'right' }} /></td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg }}>—</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg }}>—</td>
                      <td style={{ padding: '4px 8px' }} />{/* Trade */}
                      <td style={{ padding: '4px 8px' }}>
                        <select value={draft.sensitivity || 'Medium'} onChange={e => setDraft(p => ({ ...p, sensitivity: e.target.value }))} style={{ ...inpStyle, fontSize: 10 }}>
                          {SENSITIVITIES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 4px' }} />{/* Avatar */}
                      <td style={{ padding: '4px 4px', whiteSpace: 'nowrap' }}>
                        <button onClick={handleSaveNewItem} disabled={!draft.description?.trim() || addSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.gn, fontWeight: 700, fontSize: 13, padding: '0 2px' }}>{addSaving ? '…' : '✓'}</button>
                        <button onClick={cancelAddItem} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.mg, fontSize: 13, padding: '0 2px' }}>✕</button>
                      </td>
                    </tr>,
                  ]}

                  <tr>
                    <td colSpan={15} style={{ padding: '10px 16px', borderTop: `1px solid ${COLORS.bd}` }}>
                      {addingCat
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input autoFocus placeholder="Category name…" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); } }} style={{ border: `1px solid ${COLORS.bd}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: FONTS.body, outline: 'none', color: COLORS.dg, width: 220 }} />
                            <button onClick={handleAddCategory} style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                            <button onClick={() => { setAddingCat(false); setNewCatName(''); }} style={{ background: 'none', border: 'none', color: COLORS.mg, cursor: 'pointer', fontSize: 13 }}>✕</button>
                          </span>
                        : <button onClick={() => setAddingCat(true)} style={{ background: 'none', border: 'none', color: COLORS.mg, cursor: 'pointer', fontSize: 11, fontFamily: FONTS.body, padding: 0 }}>+ Add Category</button>
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {dragItem && <DragOverlayCard item={dragItem} cv={cv} bsf={bsf} />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Sticky totals */}
      <div style={{ marginTop: 12, background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? '10px 14px' : '10px 18px', position: 'sticky', bottom: 0, zIndex: 10, boxShadow: '0 -2px 12px rgba(0,0,0,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: COLORS.mg }}>{filtered.length} items · {bsf.toLocaleString()} SF</span>
        <div style={{ display: 'flex', gap: mob ? 12 : 20, alignItems: 'center' }}>
          {!mob && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 8, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, letterSpacing: 1.5 }}>MID RAW</div><div style={{ fontSize: 13, fontWeight: 600, color: COLORS.gn, fontVariantNumeric: 'tabular-nums' }}>{fK(totals.raw.m)}</div></div>}
          <div style={{ borderLeft: mob ? 'none' : `2px solid ${COLORS.yl}`, paddingLeft: mob ? 0 : 18, textAlign: 'right' }}>
            <div style={{ fontSize: 8, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, letterSpacing: 1.5 }}>MID TOTAL</div>
            <div style={{ fontSize: mob ? 16 : 17, fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn }}>{fmt(totals.full.m.tot)}</div>
            <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.gn }}>{psf(totals.full.m.tot, bsf)}</div>
          </div>
        </div>
      </div>

      {/* Undo toast */}
      {undoToast && (
        <div style={{ position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)', background: '#222', color: '#fff', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 2000, fontFamily: FONTS.body, fontSize: 13, whiteSpace: 'nowrap' }}>
          <span>Line item deleted</span>
          <button onClick={handleUndo} style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Undo</button>
        </div>
      )}

      {/* Bulk action floating bar */}
      {selectedItems.size > 0 && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', color: '#fff', borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 2100, fontFamily: FONTS.body, fontSize: 13, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#aaa' }}>{selectedItems.size} selected</span>
          <div ref={bulkAssignRef} style={{ position: 'relative' }}>
            <button onClick={() => setBulkAssignMenuOpen(v => !v)}
              style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: FONTS.heading, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Assign to <span style={{ fontSize: 9 }}>▾</span>
            </button>
            {bulkAssignMenuOpen && (
              <div style={{ position: 'absolute', bottom: 40, left: 0, background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: 4, zIndex: 300, minWidth: 170, boxShadow: '0 4px 16px rgba(0,0,0,.15)' }}>
                {(teamMembers || []).map(m => (
                  <button key={m.user_id} onClick={() => handleBulkAssign(m.user_id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 10px', fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer', color: COLORS.dg, borderRadius: 4 }}>
                    <AvatarCircle member={m} size={20} />
                    <span>{m.profiles?.full_name || m.profiles?.email || 'Member'}</span>
                  </button>
                ))}
                <button onClick={() => handleBulkAssign(null)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 10px', fontSize: 11, fontFamily: FONTS.body, cursor: 'pointer', color: COLORS.mg, borderRadius: 4, borderTop: `1px solid ${COLORS.bl}`, marginTop: 3 }}>
                  Unassign
                </button>
              </div>
            )}
          </div>
          <button onClick={() => { setSelectedItems(new Set()); setBulkMode(false); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aaa', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: FONTS.body }}>
            Clear
          </button>
        </div>
      )}

      {/* Context menu */}
      {moveMenu && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'fixed',
          left: Math.min(moveMenu.x, window.innerWidth - 210),
          top: Math.min(moveMenu.y, window.innerHeight - 40 - (tableEdit ? 4 : groups.length) * 34),
          background: '#fff', border: `1px solid ${COLORS.bd}`, borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 1000, minWidth: 190, padding: 4,
        }}>
          {tableEdit ? (
            <>
              <MenuItemRow onClick={() => handleInsertItem(moveMenu.itemId, 'above')}>↑ Insert Above</MenuItemRow>
              <MenuItemRow onClick={() => handleInsertItem(moveMenu.itemId, 'below')}>↓ Insert Below</MenuItemRow>
              <div style={{ borderTop: `1px solid ${COLORS.bl}`, margin: '4px 0' }} />
              <MenuItemRow onClick={() => handleDuplicateItem(moveMenu.itemId)}>⧉ Duplicate</MenuItemRow>
              <div style={{ borderTop: `1px solid ${COLORS.bl}`, margin: '4px 0' }} />
              <MenuItemRow onClick={() => { handleDeleteItem(flatItems.find(i => i.id === moveMenu.itemId)); setMoveMenu(null); }} danger>🗑 Delete</MenuItemRow>
            </>
          ) : (
            <>
              <div style={{ padding: '6px 12px 4px', fontSize: 10, fontFamily: FONTS.heading, color: COLORS.mg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Move to Category</div>
              {groups.map(g => (
                <MenuItemRow key={g.c} onClick={() => moveItemToCategory(moveMenu.itemId, g.c)}>{g.c}</MenuItemRow>
              ))}
            </>
          )}
        </div>
      )}

      {/* Import modal */}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} createItem={createItem} />}

      {/* Audit report card */}
      {auditModalOpen && auditReport && (
        <AuditReportCard report={auditReport} onClose={() => setAuditModalOpen(false)} bsf={bsf} />
      )}
    </div>
  );
}

function MenuItemRow({ onClick, children, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: hov ? (danger ? '#fef2f2' : '#F5F5F0') : 'transparent', border: 'none', padding: '7px 12px', fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer', color: danger ? '#dc2626' : COLORS.dg, borderRadius: 4 }}>
      {children}
    </button>
  );
}
