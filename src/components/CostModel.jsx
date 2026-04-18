import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
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

// ── Module-level sub-components ───────────────────────────────────────────────
// These must live outside CostModel so React doesn't treat them as new types
// on every render, which would destroy and recreate DOM nodes.

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
      <AIPanel
        item={item}
        advice={aiAdvice?.[item.id]}
        loading={aiLoading?.has(item.id)}
        onAsk={() => askAI(item)}
        onApply={(adv) => applyAI(item.id, adv)}
        mob={mob}
      />
    </div>
  );
}

function DragOverlayCard({ item, cv, bsf }) {
  const sh = CE.itemTotal(item, cv);
  return (
    <div style={{
      background: COLORS.wh,
      border: `1.5px solid ${COLORS.gn}`,
      borderRadius: 6,
      padding: '8px 14px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 12,
      fontFamily: FONTS.body,
      maxWidth: 560,
      cursor: 'grabbing',
      opacity: 0.97,
    }}>
      <span style={{ color: COLORS.mg, flexShrink: 0, fontSize: 13 }}>⠿</span>
      <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.description}
      </span>
      <span style={{ color: COLORS.gn, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {fK(sh)}
      </span>
    </div>
  );
}

function SortableItemRow({
  item, cv, bsf, mob,
  hoverRow, setHoverRow, expR, setExpR, flashId,
  updateItem, onDelete, aiAdvice, aiLoading, askAI, applyAI,
  openMoveMenu, overId, isDraggingAny, canEdit,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const sh   = CE.itemTotal(item, cv);
  const ex   = expR === item.id;
  const hasAI  = aiAdvice?.[item.id];
  const isHover = hoverRow === item.id;
  const isFlash = flashId === item.id;
  const isOver  = overId === item.id && isDraggingAny && !isDragging;

  const rowBg = isFlash ? '#FFF3B0' : isHover ? '#FCFCF9' : hasAI ? `${COLORS.gn}06` : COLORS.wh;

  const combinedTransition = [transition, 'background 0.15s'].filter(Boolean).join(', ');
  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition: isFlash ? undefined : combinedTransition,
    background: rowBg,
    opacity: isDragging ? 0 : 1,
    borderTop: isOver ? `2px solid ${COLORS.gn}` : undefined,
    borderBottom: `1px solid ${COLORS.bl}`,
    position: 'relative',
    // Gold inset left border for allowance items
    boxShadow: item.isAllowance ? 'inset 4px 0 0 #B89030' : undefined,
  };

  const uI = (f) => (v) => updateItem(item.id, f, v);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          {/* Drag handle — listeners attached here only, not the whole row */}
          <span
            {...listeners}
            title="Drag to reorder"
            style={{
              cursor: isDraggingAny ? 'grabbing' : 'grab',
              color: isHover ? COLORS.mg : COLORS.ltg,
              fontSize: 13,
              lineHeight: 1,
              padding: '3px 2px',
              userSelect: 'none',
              touchAction: 'none',
              display: 'flex',
            }}
          >⠿</span>
          <span
            style={{ color: hasAI ? COLORS.gn : COLORS.mg, fontSize: 8, cursor: 'pointer' }}
            onClick={() => setExpR(ex ? null : item.id)}
          >{ex ? '▼' : '▸'}</span>
        </div>
      </td>
      <td style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <EditField value={item.description} onCommit={uI('description')} type="text" />
          {item.isAllowance && (
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
              padding: '1px 5px', borderRadius: 3, flexShrink: 0, lineHeight: 1.6,
              background: '#FFF8E8', color: '#B89030', border: '1px solid #D4A843',
            }}>ALLOW</span>
          )}
        </div>
      </td>
      <td style={{ padding: '4px 8px', fontSize: 10, color: COLORS.mg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subcategory}</td>
      <td style={{ padding: '4px 8px' }}><EditField value={item.qtyMin} onCommit={uI('qtyMin')} /></td>
      <td style={{ padding: '4px 8px' }}><EditField value={item.qtyMax} onCommit={uI('qtyMax')} /></td>
      <td style={{ padding: '4px 8px', fontSize: 10, color: COLORS.mg, textAlign: 'center' }}>{item.unit}</td>
      <td style={{ padding: '4px 8px' }}><EditField value={item.unitCostLow} onCommit={uI('unitCostLow')} /></td>
      <td style={{ padding: '4px 8px' }}><EditField value={item.unitCostMid} onCommit={uI('unitCostMid')} /></td>
      <td style={{ padding: '4px 8px' }}><EditField value={item.unitCostHigh} onCommit={uI('unitCostHigh')} /></td>
      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: COLORS.gn, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(sh)}</td>
      <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg, fontVariantNumeric: 'tabular-nums' }}>{psf(sh, bsf)}</td>
      <td style={{ padding: '4px 8px' }}><Badge sensitivity={item.sensitivity} /></td>
      <td style={{ padding: '4px 4px' }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'flex-end' }}>
          {canEdit && (isHover || item.isAllowance) && (
            <button
              onClick={() => updateItem(item.id, 'isAllowance', !item.isAllowance)}
              title={item.isAllowance ? 'Remove allowance flag' : 'Mark as allowance'}
              style={{
                background: item.isAllowance ? '#FFF8E8' : 'transparent',
                border: item.isAllowance ? '1px solid #D4A843' : 'none',
                color: item.isAllowance ? '#B89030' : COLORS.mg,
                cursor: 'pointer', fontSize: 9, padding: '1px 4px', borderRadius: 3,
                fontWeight: 700, lineHeight: 1.4, fontFamily: FONTS.heading,
              }}
            >$</button>
          )}
          <button onClick={() => onDelete(item)} style={{ background: 'transparent', border: 'none', color: COLORS.ltg, cursor: 'pointer', fontSize: 10 }}>✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CostModel({ items, globals, activeItems, totals, updateItem, createItem, reorderItems, bsf, aiAdvice, aiLoading, askAI, applyAI, registerUndo, canEdit }) {
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
  const [undoToast, setUndoToast] = useState(null); // { id, description }
  const undoTimerRef = useRef(null);
  const undoItemRef = useRef(null);

  // Close context menu on any outside click
  useEffect(() => {
    if (!moveMenu) return;
    const close = () => setMoveMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [moveMenu]);

  // ── Undo delete ────────────────────────────────────────────────────────────
  const handleDeleteItem = useCallback((item) => {
    // Archive item immediately (optimistic update via updateItem)
    updateItem(item.id, 'isArchived', true);

    // Clear any previous pending undo
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    undoItemRef.current = item;
    setUndoToast({ id: item.id, description: item.description });

    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
      undoItemRef.current = null;
      undoTimerRef.current = null;
    }, 5000);
  }, [updateItem]);

  const handleUndo = useCallback(() => {
    if (!undoItemRef.current) return;
    clearTimeout(undoTimerRef.current);
    updateItem(undoItemRef.current.id, 'isArchived', false);
    setUndoToast(null);
    undoItemRef.current = null;
    undoTimerRef.current = null;
  }, [updateItem]);

  // Register undo with parent (for global Ctrl+Z)
  useEffect(() => {
    if (registerUndo) registerUndo(handleUndo);
  }, [registerUndo, handleUndo]);

  // Cleanup undo timer on unmount
  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  // ── dnd-kit sensors ────────────────────────────────────────────────────────
  // distance:5 prevents accidental drags when clicking EditField cells
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
      qtyMin: Number(draft.qtyMin) || 1,
      qtyMax: Number(draft.qtyMax) || 1,
      unit: draft.unit || 'LS',
      unitCostLow: Number(draft.unitCostLow) || 0,
      unitCostMid: Number(draft.unitCostMid) || 0,
      unitCostHigh: Number(draft.unitCostHigh) || 0,
      sensitivity: draft.sensitivity || 'Medium',
    });
    setAddSaving(false);
    if (!error) cancelAddItem();
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    setNewCatName('');
    setAddingCat(false);
    openAddItem(name);
  };

  const flash = (id) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 700);
  };

  const moveCatUp = (cat) => {
    const order = catOrder ?? groups.map(g => g.c);
    const idx = order.indexOf(cat);
    if (idx <= 0) return;
    const n = [...order];
    [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
    setCatOrder(n);
  };

  const moveCatDown = (cat) => {
    const order = catOrder ?? groups.map(g => g.c);
    const idx = order.indexOf(cat);
    if (idx < 0 || idx >= order.length - 1) return;
    const n = [...order];
    [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]];
    setCatOrder(n);
  };

  const moveItemToCategory = (itemId, newCat) => {
    updateItem(itemId, 'category', newCat);
    flash(itemId);
    setMoveMenu(null);
  };

  const openMoveMenu = (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    setMoveMenu({ itemId, x: e.clientX, y: e.clientY });
  };

  const filtered = useMemo(() => activeItems.filter(i => {
    if (fCat !== 'All' && i.category !== fCat) return false;
    if (search) return `${i.description} ${i.category} ${i.subcategory}`.toLowerCase().includes(search.toLowerCase());
    return true;
  }), [activeItems, fCat, search]);

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
    return [
      ...order.filter(c => gMap[c]).map(c => gMap[c]),
      ...groups.filter(g => !order.includes(g.c)),
    ];
  }, [groups, catOrder]);

  // Flat list of visible (non-collapsed) items for SortableContext
  const flatItems = useMemo(
    () => orderedGroups.flatMap(g => col.has(g.c) ? [] : g.items),
    [orderedGroups, col],
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }) => {
    setDragId(active.id);
    setExpR(null); // collapse any open detail panel
  }, []);

  const handleDragOver = useCallback(({ over }) => {
    setOverId(over?.id ?? null);
  }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    setDragId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;

    const oldIdx = flatItems.findIndex(i => i.id === active.id);
    const newIdx = flatItems.findIndex(i => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const movedItem  = flatItems[oldIdx];
    const newCategory = flatItems[newIdx].category;
    const categoryChanged = movedItem.category !== newCategory;

    const reordered = arrayMove(flatItems, oldIdx, newIdx);

    // Only include rows whose sort_order or category actually changed
    const updates = reordered.reduce((acc, item, idx) => {
      const orig = flatItems.find(i => i.id === item.id);
      const isMovedItem = item.id === active.id;
      if (orig.sortOrder !== idx || (isMovedItem && categoryChanged)) {
        acc.push({
          id: item.id,
          sortOrder: idx,
          ...(isMovedItem && categoryChanged ? { category: newCategory } : {}),
        });
      }
      return acc;
    }, []);

    if (updates.length) reorderItems(updates);
  }, [flatItems, reorderItems]);

  const toggleCol = (c) => setCol(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const cvk = CE.cvKey(cv);

  const arrowBtn = (onClick, disabled, label) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', color: disabled ? '#ddd' : COLORS.mg, fontSize: 8, padding: 0, lineHeight: 1.3, display: 'block' }}
    >{label}</button>
  );

  const dragItem = dragId ? flatItems.find(i => i.id === dragId) : null;
  const isDraggingAny = dragId !== null;

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
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
      </div>

      {/* Empty state — no line items */}
      {orderedGroups.length === 0 && !search && fCat === 'All' && (
        <div style={{ background: '#fff', border: '1.5px dashed #d8d8d4', borderRadius: 12, padding: '48px 24px', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 8 }}>No line items yet</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#999', marginBottom: 20 }}>Generate line items with AI or add them manually.</div>
          <button
            onClick={() => setAddingCat(true)}
            style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            + Add First Item
          </button>
        </div>
      )}

      {/* Mobile: Card layout (no drag on mobile) */}
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
                          {ex && (
                            <ItemDetailPanel item={item} updateItem={updateItem} aiAdvice={aiAdvice} aiLoading={aiLoading} askAI={askAI} applyAI={applyAI} mob={mob} />
                          )}
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
        /* Desktop/Tablet: Table layout with drag-and-drop */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ borderRadius: 10, border: `1px solid ${COLORS.bd}`, overflow: 'clip', background: COLORS.wh }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONTS.body, minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: '#F5F5F0' }}>
                    <th style={{ width: '3%',  padding: '9px 4px', textAlign: 'left',  fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}></th>
                    <th style={{ width: '25%', padding: '9px 8px', textAlign: 'left',  fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>Description</th>
                    <th style={{ width: '12%', padding: '9px 8px', textAlign: 'left',  fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>Sub</th>
                    <th style={{ width: '7%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>Qty Min</th>
                    <th style={{ width: '7%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>Qty Max</th>
                    <th style={{ width: '4%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>Unit</th>
                    <th style={{ width: '7%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>$/Low</th>
                    <th style={{ width: '7%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>$/Mid</th>
                    <th style={{ width: '7%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>$/High</th>
                    <th style={{ width: '9%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>{cv.toUpperCase()} Total</th>
                    <th style={{ width: '5%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>$/SF</th>
                    <th style={{ width: '5%',  padding: '9px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid #22222222` }}>Sens</th>
                    <th style={{ width: '2%',  padding: '9px 4px', borderBottom: `2px solid #22222222` }}></th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={flatItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {orderedGroups.map((g, gIdx) => {
                      const cl = col.has(g.c);
                      const isFirst = gIdx === 0;
                      const isLast  = gIdx === orderedGroups.length - 1;
                      return [
                        /* ── Category header row ── */
                        <tr key={`c_${g.c}`} style={{ background: '#FAFAF6', cursor: 'pointer', borderBottom: `1px solid ${COLORS.bd}` }} onClick={() => toggleCol(g.c)}>
                          <td style={{ padding: '8px 4px' }}><span style={{ color: COLORS.gn, fontSize: 9 }}>{cl ? '▶' : '▼'}</span></td>
                          <td colSpan={8} style={{ padding: '8px 8px', fontWeight: 700, fontSize: 12, fontFamily: FONTS.heading, color: COLORS.gn }}>{g.c.toUpperCase()} <span style={{ color: COLORS.mg, fontWeight: 400, fontSize: 10, fontFamily: FONTS.body }}>({g.items.length})</span></td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn, fontVariantNumeric: 'tabular-nums' }}>{fmt(g.t[cvk])}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg, fontVariantNumeric: 'tabular-nums' }}>{psf(g.t[cvk], bsf)}</td>
                          <td colSpan={2} style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            {arrowBtn((e) => { e.stopPropagation(); moveCatUp(g.c); }, isFirst, '▲')}
                            {arrowBtn((e) => { e.stopPropagation(); moveCatDown(g.c); }, isLast, '▼')}
                          </td>
                        </tr>,

                        /* ── Sortable item rows ── */
                        ...(!cl ? g.items.flatMap(item => [
                          <SortableItemRow
                            key={item.id}
                            item={item}
                            cv={cv}
                            bsf={bsf}
                            mob={mob}
                            hoverRow={hoverRow}
                            setHoverRow={setHoverRow}
                            expR={expR}
                            setExpR={setExpR}
                            flashId={flashId}
                            updateItem={updateItem}
                            onDelete={handleDeleteItem}
                            aiAdvice={aiAdvice}
                            aiLoading={aiLoading}
                            askAI={askAI}
                            applyAI={applyAI}
                            openMoveMenu={openMoveMenu}
                            overId={overId}
                            isDraggingAny={isDraggingAny}
                            canEdit={canEdit}
                          />,
                          // Detail panel: hide while dragging to avoid layout issues
                          expR === item.id && !isDraggingAny && (
                            <tr key={`${item.id}_x`} style={{ background: '#F8F8F3', borderBottom: `1px solid ${COLORS.bd}` }}>
                              <td colSpan={13}>
                                <ItemDetailPanel item={item} updateItem={updateItem} aiAdvice={aiAdvice} aiLoading={aiLoading} askAI={askAI} applyAI={applyAI} mob={mob} />
                              </td>
                            </tr>
                          ),
                        ]) : []),

                        /* ── Add Item trigger / edit row ── */
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
                              <td style={{ padding: '4px 8px' }}>
                                <select value={draft.sensitivity || 'Medium'} onChange={e => setDraft(p => ({ ...p, sensitivity: e.target.value }))} style={{ ...inpStyle, fontSize: 10 }}>
                                  {SENSITIVITIES.map(s => <option key={s}>{s}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '4px 4px', whiteSpace: 'nowrap' }}>
                                <button onClick={handleSaveNewItem} disabled={!draft.description?.trim() || addSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.gn, fontWeight: 700, fontSize: 13, padding: '0 2px' }}>{addSaving ? '…' : '✓'}</button>
                                <button onClick={cancelAddItem} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.mg, fontSize: 13, padding: '0 2px' }}>✕</button>
                              </td>
                            </tr>
                          : <tr key={`${g.c}_addtrig`} onClick={() => openAddItem(g.c)} style={{ cursor: 'pointer', borderBottom: `1px solid ${COLORS.bl}` }}>
                              <td colSpan={13} style={{ padding: '5px 8px 5px 28px', fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, userSelect: 'none' }}>+ Add item</td>
                            </tr>,
                      ];
                    }).flat()}
                  </SortableContext>

                  {/* ── Pending new category (no items yet) ── */}
                  {addingItemCat && !groups.some(g => g.c === addingItemCat) && [
                    <tr key="newcat_hdr" style={{ background: '#FAFAF6', borderBottom: `1px solid ${COLORS.bd}` }}>
                      <td style={{ padding: '8px 4px' }}><span style={{ color: COLORS.gn, fontSize: 9 }}>▼</span></td>
                      <td colSpan={12} style={{ padding: '8px 8px', fontWeight: 700, fontSize: 12, fontFamily: FONTS.heading, color: COLORS.gn }}>{addingItemCat.toUpperCase()} <span style={{ color: COLORS.mg, fontWeight: 400, fontSize: 10, fontFamily: FONTS.body }}>(new)</span></td>
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
                      <td style={{ padding: '4px 8px' }}>
                        <select value={draft.sensitivity || 'Medium'} onChange={e => setDraft(p => ({ ...p, sensitivity: e.target.value }))} style={{ ...inpStyle, fontSize: 10 }}>
                          {SENSITIVITIES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 4px', whiteSpace: 'nowrap' }}>
                        <button onClick={handleSaveNewItem} disabled={!draft.description?.trim() || addSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.gn, fontWeight: 700, fontSize: 13, padding: '0 2px' }}>{addSaving ? '…' : '✓'}</button>
                        <button onClick={cancelAddItem} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.mg, fontSize: 13, padding: '0 2px' }}>✕</button>
                      </td>
                    </tr>,
                  ]}

                  {/* ── Add Category footer row ── */}
                  <tr>
                    <td colSpan={13} style={{ padding: '10px 16px', borderTop: `1px solid ${COLORS.bd}` }}>
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

          {/* Floating drag overlay — renders outside table to avoid layout issues */}
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
        <div style={{
          position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
          background: '#222', color: '#fff', borderRadius: 10,
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 2000,
          fontFamily: FONTS.body, fontSize: 13, whiteSpace: 'nowrap',
        }}>
          <span>Line item deleted</span>
          <button
            onClick={handleUndo}
            style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            Undo
          </button>
        </div>
      )}

      {/* Move-to-category context menu */}
      {moveMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: Math.min(moveMenu.x, window.innerWidth - 210),
            top: Math.min(moveMenu.y, window.innerHeight - 40 - groups.length * 34),
            background: '#fff',
            border: `1px solid ${COLORS.bd}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 190,
            padding: 4,
          }}
        >
          <div style={{ padding: '6px 12px 4px', fontSize: 10, fontFamily: FONTS.heading, color: COLORS.mg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Move to Category
          </div>
          {groups.map(g => (
            <button
              key={g.c}
              onClick={() => moveItemToCategory(moveMenu.itemId, g.c)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '7px 12px', fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer', color: COLORS.dg, borderRadius: 4 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {g.c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
