import { useState, useEffect, useMemo } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
import { COLORS, FONTS } from '../data/constants';
import { fmt, fK, psf } from '../utils/format';
import { getDrawsForItems, createDraw, deleteDraw } from '../supabase/db';

const INDIRECT_CATEGORIES = new Set([
  'General Conditions', 'Overhead & Fee', 'Contingency',
  'Bond', 'Insurance', 'Bond & Insurance', 'Overhead & Profit',
]);

const GOLD = '#B89030';
const GOLD_LIGHT = '#FFF8E8';
const GOLD_BORDER = '#D4A843';

// ── Allowances panel ──────────────────────────────────────────────────────────

function AllowancesPanel({ allowanceItems, user, mob }) {
  const [draws, setDraws] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [addDrawId, setAddDrawId] = useState(null);
  const [form, setForm] = useState({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);
  const [panelError, setPanelError] = useState(null);

  useEffect(() => {
    if (!allowanceItems.length) return;
    const ids = allowanceItems.map(i => i.id);
    getDrawsForItems(ids).then(({ data }) => {
      if (!data) return;
      const map = {};
      ids.forEach(id => { map[id] = []; });
      data.forEach(d => {
        if (!map[d.line_item_id]) map[d.line_item_id] = [];
        map[d.line_item_id].push(d);
      });
      setDraws(map);
    });
  }, [allowanceItems]);

  const itemDrawn = (id) => (draws[id] || []).reduce((s, d) => s + Number(d.amount), 0);
  const totalBudget = allowanceItems.reduce((s, i) => s + (CE.midTotal(i) || 0), 0);
  const totalDrawn = allowanceItems.reduce((s, i) => s + itemDrawn(i.id), 0);

  const overItems = allowanceItems.filter(i => {
    const orig = CE.midTotal(i) || 0;
    return orig > 0 && itemDrawn(i.id) >= orig;
  });
  const warnItems = allowanceItems.filter(i => {
    const orig = CE.midTotal(i) || 0;
    const drawn = itemDrawn(i.id);
    return orig > 0 && drawn / orig >= 0.8 && drawn < orig;
  });

  async function handleAddDraw(itemId) {
    const amount = parseFloat(form.amount);
    if (!amount || !form.description.trim()) return;
    setSubmitting(true);
    setPanelError(null);
    const { data, error } = await createDraw({
      line_item_id: itemId,
      amount,
      description: form.description.trim(),
      drawn_date: form.date || new Date().toISOString().slice(0, 10),
      created_by: user?.id || null,
    });
    setSubmitting(false);
    if (error) { setPanelError(error.message); return; }
    setDraws(prev => ({ ...prev, [itemId]: [data, ...(prev[itemId] || [])] }));
    setAddDrawId(null);
    setForm({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  }

  async function handleDeleteDraw(itemId, drawId) {
    const { error } = await deleteDraw(drawId);
    if (error) { setPanelError(error.message); return; }
    setDraws(prev => ({ ...prev, [itemId]: (prev[itemId] || []).filter(d => d.id !== drawId) }));
  }

  function barColor(pct) {
    if (pct >= 1) return '#ef4444';
    if (pct >= 0.8) return '#f59e0b';
    return '#22c55e';
  }

  return (
    <div style={{ gridColumn: '1/-1', background: GOLD_LIGHT, border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
      <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: GOLD, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
        Allowances
      </div>

      {/* Alert banners */}
      {overItems.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 7, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#991b1b', fontFamily: FONTS.body }}>
          ⚠ {overItems.length} allowance{overItems.length > 1 ? 's' : ''} fully consumed: {overItems.map(i => i.description || i.subcategory).join(', ')}
        </div>
      )}
      {warnItems.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#92400e', fontFamily: FONTS.body }}>
          ⚡ {warnItems.length} allowance{warnItems.length > 1 ? 's' : ''} approaching limit (≥80%): {warnItems.map(i => i.description || i.subcategory).join(', ')}
        </div>
      )}

      {/* Summary card */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          ['Total Budget', totalBudget, GOLD],
          ['Total Drawn',  totalDrawn,  totalDrawn > totalBudget ? '#ef4444' : '#555'],
          ['Remaining',    totalBudget - totalDrawn, totalBudget - totalDrawn < 0 ? '#ef4444' : '#22c55e'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', border: `1px solid ${GOLD_BORDER}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: mob ? 17 : 20, fontWeight: 700, fontFamily: FONTS.heading, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(val)}</div>
          </div>
        ))}
      </div>

      {panelError && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: 12, color: '#991b1b', fontFamily: FONTS.body }}>
          {panelError}
          <button onClick={() => setPanelError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      )}

      {/* Per-item cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allowanceItems.map(item => {
          const original = CE.midTotal(item) || 0;
          const drawn = itemDrawn(item.id);
          const remaining = original - drawn;
          const pct = original > 0 ? Math.min(drawn / original, 1) : 0;
          const isExpanded = expandedId === item.id;
          const isAdding = addDrawId === item.id;
          const itemDraws = draws[item.id] || [];

          let statusLabel, statusBg, statusColor;
          if (pct >= 1) { statusLabel = 'Fully Used'; statusBg = '#fee2e2'; statusColor = '#991b1b'; }
          else if (drawn > 0) { statusLabel = 'Partially Used'; statusBg = '#fffbeb'; statusColor = '#92400e'; }
          else { statusLabel = 'Open'; statusBg = '#f0fdf4'; statusColor = '#166534'; }

          return (
            <div key={item.id} style={{ background: '#fff', border: `1px solid ${GOLD_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
              {/* Item header */}
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || item.subcategory || '—'}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: statusBg, color: statusColor, flexShrink: 0 }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.mg, marginTop: 2 }}>{item.category}{item.subcategory ? ` · ${item.subcategory}` : ''}</div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct * 100}%`, background: barColor(pct), height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 10, color: COLORS.mg, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(drawn)} / {fmt(original)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { setAddDrawId(isAdding ? null : item.id); setExpandedId(item.id); }}
                    style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, padding: '5px 11px', borderRadius: 6, border: `1px solid ${GOLD}`, background: GOLD, color: '#fff', cursor: 'pointer' }}
                  >
                    + Draw
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, padding: '5px 11px', borderRadius: 6, border: `1px solid ${GOLD_BORDER}`, background: 'transparent', color: GOLD, cursor: 'pointer' }}
                  >
                    {isExpanded ? 'Hide' : `History (${itemDraws.length})`}
                  </button>
                </div>
              </div>

              {/* Add Draw form */}
              {isAdding && (
                <div style={{ borderTop: `1px solid ${GOLD_BORDER}`, padding: '10px 14px', background: '#fffdf5' }}>
                  <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Add Draw</div>
                  <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 2fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input
                      type="number"
                      min="0"
                      placeholder="Amount ($)"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      style={{ border: `1px solid ${GOLD_BORDER}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: FONTS.body, outline: 'none' }}
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      style={{ border: `1px solid ${GOLD_BORDER}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: FONTS.body, outline: 'none' }}
                    />
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      style={{ border: `1px solid ${GOLD_BORDER}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: FONTS.body, outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleAddDraw(item.id)}
                      disabled={submitting || !form.amount || !form.description.trim()}
                      style={{ fontSize: 12, fontFamily: FONTS.heading, fontWeight: 600, padding: '6px 16px', borderRadius: 6, border: 'none', background: GOLD, color: '#fff', cursor: submitting ? 'default' : 'pointer', opacity: (!form.amount || !form.description.trim()) ? 0.5 : 1 }}
                    >
                      {submitting ? 'Saving…' : 'Save Draw'}
                    </button>
                    <button
                      onClick={() => setAddDrawId(null)}
                      style={{ fontSize: 12, fontFamily: FONTS.body, padding: '6px 14px', borderRadius: 6, border: `1px solid ${COLORS.bd}`, background: 'transparent', color: COLORS.mg, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Draw history */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${GOLD_BORDER}`, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Draw History</div>
                  {itemDraws.length === 0 ? (
                    <div style={{ fontSize: 12, color: COLORS.mg, fontFamily: FONTS.body, fontStyle: 'italic' }}>No draws recorded yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {itemDraws.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${COLORS.bl}` }}>
                          <span style={{ color: COLORS.mg, flexShrink: 0 }}>{d.drawn_date}</span>
                          <span style={{ flex: 1 }}>{d.description}</span>
                          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(Number(d.amount))}</span>
                          <button
                            onClick={() => handleDeleteDraw(item.id, d.id)}
                            style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                            title="Delete draw"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, paddingTop: 6 }}>
                        <span style={{ color: COLORS.mg }}>Remaining</span>
                        <span style={{ color: remaining < 0 ? '#ef4444' : '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{fmt(remaining)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ totals, catGroups, activeItems, bsf, globals, project, user }) {
  const { mob, tab } = useWindowSize();
  const [costView, setCostView] = useState('total'); // 'total' | 'direct'

  const isDirect = costView === 'direct';

  const chartGroups = isDirect
    ? catGroups.filter(g => !INDIRECT_CATEGORIES.has(g.c))
    : catGroups;

  const mx = Math.max(...chartGroups.map(g => g.t.m), 1);

  const topDrivers = useMemo(() =>
    [...activeItems]
      .map(i => ({ ...i, _m: CE.midTotal(i) || 0 }))
      .sort((a, b) => b._m - a._m)
      .slice(0, 10),
    [activeItems]
  );

  const allowanceItems = useMemo(() => activeItems.filter(i => i.isAllowance), [activeItems]);

  // KPI values switch based on mode
  const kpi = isDirect
    ? [
        ['Low',  totals.raw.l, COLORS.lg, '#E8F5F1'],
        ['Mid',  totals.raw.m, COLORS.gn, '#EFF6E8'],
        ['High', totals.raw.h, COLORS.or, '#FFF3EC'],
      ]
    : [
        ['Low',  totals.full.l.tot, COLORS.lg, '#E8F5F1'],
        ['Mid',  totals.full.m.tot, COLORS.gn, '#EFF6E8'],
        ['High', totals.full.h.tot, COLORS.or, '#FFF3EC'],
      ];

  const gc = mob ? '1fr' : tab ? '1fr 1fr' : '1fr 1fr 1fr';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: gc, gap: mob ? 10 : 14, fontFamily: FONTS.body }}>

      {/* Toggle */}
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', border: `1px solid ${COLORS.bd}`, borderRadius: 8, overflow: 'hidden' }}>
          {[['total', 'Total Cost'], ['direct', 'Direct Cost']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setCostView(v)}
              style={{
                background: costView === v ? COLORS.gn : COLORS.wh,
                color: costView === v ? COLORS.wh : COLORS.dg,
                border: 'none', padding: '8px 18px',
                fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Estimate KPIs */}
      <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3,1fr)', gap: mob ? 8 : 12 }}>
        {kpi.map(([label, val, color, bg]) => (
          <div key={label} style={{ background: bg, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 14 : '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>{label} Estimate</div>
            <div style={{ fontSize: mob ? 22 : 24, fontWeight: 700, fontFamily: FONTS.heading, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(val)}</div>
            <div style={{ fontSize: 12, color, fontFamily: FONTS.heading, fontWeight: 600, marginTop: 2 }}>{psf(val, bsf)}</div>
            {isDirect && (
              <div style={{ fontSize: 10, color: COLORS.mg, fontFamily: FONTS.body, marginTop: 4 }}>direct cost only</div>
            )}
          </div>
        ))}
      </div>

      {/* Category bars */}
      <div style={{ gridColumn: '1/-1', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          Cost by Category (Mid{isDirect ? ', Direct' : ', Loaded'}) — {bsf.toLocaleString()} SF
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: mob ? 6 : 8 }}>
          {chartGroups.map(g => (
            <div key={g.c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: mob ? 10 : 11, fontWeight: 500, width: mob ? 100 : 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.c}</span>
              <div style={{ flex: 1, background: COLORS.bl, borderRadius: 3, height: mob ? 14 : 18, position: 'relative', overflow: 'hidden', minWidth: 50 }}>
                <div style={{ background: `linear-gradient(90deg,${COLORS.yl}88,${COLORS.yl})`, width: `${(g.t.m / mx) * 100}%`, height: '100%', borderRadius: 3 }} />
                <span style={{ position: 'absolute', right: 4, top: mob ? 0 : 1, fontSize: mob ? 9 : 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fK(g.t.m)}</span>
              </div>
              {!mob && <span style={{ fontSize: 9, color: COLORS.mg, width: 55, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{psf(g.t.m, bsf)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Mid Breakdown</div>

        {isDirect ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${COLORS.bl}` }}>
              <span style={{ color: COLORS.mg }}>Raw Installed Cost</span>
              <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(totals.raw.m)} <span style={{ color: COLORS.mg, fontSize: 10 }}>{psf(totals.raw.m, bsf)}</span>
              </span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, padding: '10px 0 4px', fontStyle: 'italic' }}>
              No markups applied (GC, contingency, fee, tax excluded)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, fontFamily: FONTS.heading, paddingTop: 6, color: COLORS.gn }}>
              <span>DIRECT TOTAL</span><span>{fmt(totals.raw.m)}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.gn }}>{psf(totals.raw.m, bsf)}</div>
          </>
        ) : (
          <>
            {[
              ['Escalated Sub',  totals.full.m.sub],
              ['Contingency',    totals.full.m.co],
              ['GC',             totals.full.m.gc],
              ['Fee',            totals.full.m.fe],
              ['Ins+Bond',       totals.full.m.ins],
              ['Tax',            totals.full.m.tx],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${COLORS.bl}` }}>
                <span style={{ color: COLORS.mg }}>{l}</span>
                <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(v)} <span style={{ color: COLORS.mg, fontSize: 10 }}>{psf(v, bsf)}</span>
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, fontFamily: FONTS.heading, paddingTop: 10, color: COLORS.gn }}>
              <span>TOTAL</span><span>{fmt(totals.full.m.tot)}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.gn }}>{psf(totals.full.m.tot, bsf)}</div>
          </>
        )}
      </div>

      {/* Top drivers */}
      <div style={{ gridColumn: mob ? '1/-1' : tab ? '1/-1' : 'span 2', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Top 10 Cost Drivers</div>
        {topDrivers.map((d, i) => (
          <div key={d.id} style={{ display: 'flex', gap: 6, fontSize: mob ? 12 : 11, padding: '5px 0', borderBottom: `1px solid ${COLORS.bl}`, alignItems: 'center' }}>
            <span style={{ color: COLORS.gn, fontWeight: 700, fontFamily: FONTS.heading, width: 18, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</span>
            <span style={{ color: COLORS.gn, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fK(d._m)}</span>
          </div>
        ))}
      </div>

      {/* Allowances panel — only shown when allowance items exist */}
      {allowanceItems.length > 0 && (
        <AllowancesPanel allowanceItems={allowanceItems} user={user} mob={mob} />
      )}
    </div>
  );
}
