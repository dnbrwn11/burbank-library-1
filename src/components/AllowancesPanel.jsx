import { useState, useEffect, useMemo } from 'react';
import { getDrawsForItems, createDraw, deleteDraw } from '../supabase/db';
import { FONTS } from '../data/constants';
import * as CE from '../engine/CostEngine';
import { Skeleton, EmptyState, Button } from './ui';
import { DollarSign } from 'lucide-react';

const ACCENT = '#B89030';
const BORDER = '#E5E5E2';

function fmtMoney(n) {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n || 0).toLocaleString()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function AllowanceStatus({ pct }) {
  if (pct <= 0) return <span style={badge('#eff6ff', '#1e40af', '#bfdbfe')}>Open</span>;
  if (pct >= 1)  return <span style={badge('#fef2f2', '#991b1b', '#fecaca')}>Fully Used</span>;
  return <span style={badge('#fffbeb', '#92400e', '#fde68a')}>Partially Used</span>;
}

function badge(bg, fg, border) {
  return {
    fontSize: 9, fontWeight: 700, letterSpacing: 0.6, padding: '2px 7px',
    borderRadius: 4, background: bg, color: fg, border: `1px solid ${border}`,
    fontFamily: FONTS.heading, whiteSpace: 'nowrap', display: 'inline-block',
  };
}

function ProgressBar({ pct }) {
  const clamped = Math.min(Math.max(pct || 0, 0), 1);
  const barColor = clamped >= 0.8 ? '#ef4444' : clamped >= 0.5 ? '#f59e0b' : '#22c55e';
  const pct100 = (clamped * 100).toFixed(1);
  return (
    <div style={{ position: 'relative', height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct100}%`, background: barColor, borderRadius: 5, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function DrawRow({ draw, canEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 0', borderBottom: `1px solid #f5f5f3`,
      fontSize: 12, fontFamily: FONTS.body,
    }}>
      <span style={{ color: '#999', minWidth: 80, flexShrink: 0 }}>{draw.drawn_date}</span>
      <span style={{ flex: 1, color: '#444' }}>{draw.description}</span>
      <span style={{ fontWeight: 600, color: '#222', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {fmtMoney(draw.amount)}
      </span>
      {canEdit && (
        <button
          onClick={() => { if (confirming) { onDelete(draw.id); } else { setConfirming(true); } }}
          onBlur={() => setConfirming(false)}
          style={{
            background: 'none', border: 'none', color: confirming ? '#dc2626' : '#ccc',
            cursor: 'pointer', fontSize: 11, padding: '0 2px', flexShrink: 0,
          }}
          title={confirming ? 'Click again to confirm' : 'Delete draw'}
        >
          {confirming ? '✕ Confirm' : '×'}
        </button>
      )}
    </div>
  );
}

function AddDrawForm({ lineItemId, user, onSave, onClose }) {
  const [form, setForm] = useState({ amount: '', description: '', drawn_date: today() });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setErr('Enter a positive amount.'); return; }
    if (!form.description.trim()) { setErr('Description is required.'); return; }
    setSaving(true);
    setErr(null);
    const { error } = await createDraw({
      line_item_id: lineItemId,
      amount,
      description: form.description.trim(),
      drawn_date: form.drawn_date || today(),
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { setErr(error.message || 'Save failed.'); return; }
    onSave();
    onClose();
  };

  const inp = {
    border: '1.5px solid #e0e0dc', borderRadius: 6, fontFamily: FONTS.body,
    fontSize: 13, outline: 'none', padding: '7px 10px', boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fafaf8', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px', marginTop: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 110px', gap: 8, alignItems: 'end', marginBottom: err ? 6 : 0 }}>
        <div>
          <div style={{ fontSize: 10, color: '#888', fontFamily: FONTS.body, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount ($)</div>
          <input
            type="number" min="0.01" step="0.01" required autoFocus
            value={form.amount} onChange={e => set('amount')(e.target.value)}
            style={{ ...inp, width: '100%' }} placeholder="0"
          />
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#888', fontFamily: FONTS.body, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</div>
          <input
            type="text" required
            value={form.description} onChange={e => set('description')(e.target.value)}
            style={{ ...inp, width: '100%' }} placeholder="Draw description…"
          />
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#888', fontFamily: FONTS.body, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</div>
          <input
            type="date"
            value={form.drawn_date} onChange={e => set('drawn_date')(e.target.value)}
            style={{ ...inp, width: '100%' }}
          />
        </div>
      </div>
      {err && <div style={{ fontSize: 12, color: '#dc2626', fontFamily: FONTS.body, marginBottom: 6 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 14px', fontFamily: FONTS.body, fontSize: 12, color: '#555', cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={saving} style={{ background: saving ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : 'Add Draw'}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AllowancesPanel({ allowanceItems, user, canEdit }) {
  const [drawsMap, setDrawsMap]   = useState({}); // { [itemId]: draw[] }
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});
  const [addingDraw, setAddingDraw] = useState({});

  const reload = async () => {
    if (!allowanceItems.length) { setLoading(false); return; }
    setLoading(true);
    const ids = allowanceItems.map(i => i.id);
    const { data } = await getDrawsForItems(ids);
    const map = {};
    ids.forEach(id => { map[id] = []; });
    (data || []).forEach(d => {
      if (map[d.line_item_id]) map[d.line_item_id].push(d);
    });
    setDrawsMap(map);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [allowanceItems.map(i => i.id).join(',')]);

  const enriched = useMemo(() => allowanceItems.map(item => {
    const original = CE.midTotal(item) || 0;
    const draws = drawsMap[item.id] || [];
    const drawn = draws.reduce((s, d) => s + Number(d.amount || 0), 0);
    const remaining = original - drawn;
    const pct = original > 0 ? drawn / original : 0;
    return { item, original, draws, drawn, remaining, pct };
  }), [allowanceItems, drawsMap]);

  const summary = useMemo(() => ({
    totalOriginal: enriched.reduce((s, e) => s + e.original, 0),
    totalDrawn:    enriched.reduce((s, e) => s + e.drawn, 0),
    totalRemaining:enriched.reduce((s, e) => s + e.remaining, 0),
  }), [enriched]);

  const alerts = enriched.filter(e => e.original > 0 && e.pct >= 0.8);
  const fullyUsed = alerts.filter(e => e.pct >= 1);
  const nearlyFull = alerts.filter(e => e.pct >= 0.8 && e.pct < 1);

  const handleDeleteDraw = async (drawId, itemId) => {
    await deleteDraw(drawId);
    setDrawsMap(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter(d => d.id !== drawId),
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(n => <Skeleton key={n} height={56} radius={8} />)}
      </div>
    );
  }

  // Empty state — no items marked as allowance
  if (!allowanceItems.length) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No allowances marked"
        body="Toggle the $ icon on any line item in the Cost Model to track it as an allowance with drawable budget."
      />
    );
  }

  return (
    <div>
      {/* Alert banners */}
      {fullyUsed.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            ⚠ Allowance Fully Consumed
          </div>
          {fullyUsed.map(e => (
            <div key={e.item.id} style={{ fontFamily: FONTS.body, fontSize: 12, color: '#7f1d1d', padding: '1px 0' }}>
              • {e.item.description} — {fmtMoney(e.drawn)} drawn of {fmtMoney(e.original)} ({(e.pct * 100).toFixed(0)}%)
            </div>
          ))}
        </div>
      )}
      {nearlyFull.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            ⚡ Allowances Exceeding 80%
          </div>
          {nearlyFull.map(e => (
            <div key={e.item.id} style={{ fontFamily: FONTS.body, fontSize: 12, color: '#78350f', padding: '1px 0' }}>
              • {e.item.description} — {fmtMoney(e.drawn)} drawn of {fmtMoney(e.original)} ({(e.pct * 100).toFixed(0)}%)
            </div>
          ))}
        </div>
      )}

      {/* Summary card */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12,
      }}>
        {[
          ['Total Allowances', summary.totalOriginal, '#1e40af', '#eff6ff', '#bfdbfe'],
          ['Total Drawn',      summary.totalDrawn,    '#92400e', '#fffbeb', '#fde68a'],
          ['Total Remaining',  summary.totalRemaining,
            summary.totalRemaining < 0 ? '#991b1b' : '#166534',
            summary.totalRemaining < 0 ? '#fef2f2' : '#f0fdf4',
            summary.totalRemaining < 0 ? '#fecaca' : '#bbf7d0',
          ],
        ].map(([label, val, color, bg, border]) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONTS.heading, color, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(val)}</div>
          </div>
        ))}
      </div>

      {/* Per-allowance rows */}
      {enriched.map(({ item, original, draws, drawn, remaining, pct }) => {
        const isExpanded = !!expanded[item.id];
        const isAddingDraw = !!addingDraw[item.id];
        const pct100 = (Math.min(pct, 1) * 100).toFixed(0);

        return (
          <div key={item.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            {/* Row header */}
            <div
              onClick={() => setExpanded(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', cursor: 'pointer',
                background: isExpanded ? '#fafaf8' : '#fff',
                borderBottom: isExpanded ? `1px solid ${BORDER}` : 'none',
              }}
            >
              {/* Description + badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: '#111' }}>
                    {item.description || item.subcategory || '—'}
                  </span>
                  <AllowanceStatus pct={pct} />
                </div>
                {item.category && (
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: '#aaa', marginTop: 1 }}>
                    {item.category}
                  </div>
                )}
              </div>

              {/* Progress bar + amounts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ProgressBar pct={pct} />
                  <span style={{ fontSize: 10, color: '#888', fontFamily: FONTS.body, minWidth: 30, textAlign: 'right' }}>{pct100}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', fontFamily: FONTS.body }}>
                  <span>Drawn: <b style={{ color: '#222' }}>{fmtMoney(drawn)}</b></span>
                  <span>/ {fmtMoney(original)}</span>
                </div>
              </div>

              {/* Remaining */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: '#aaa', fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: 0.5 }}>Remaining</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONTS.heading, color: remaining < 0 ? '#dc2626' : remaining === 0 ? '#888' : '#166534', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(remaining)}
                </div>
              </div>

              {/* Chevron */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5"
                style={{ flexShrink: 0, transform: isExpanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Expanded draw history */}
            {isExpanded && (
              <div style={{ padding: '10px 14px' }}>
                {draws.length === 0 ? (
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: '#aaa', fontStyle: 'italic', paddingBottom: 4 }}>
                    No draws yet.
                  </div>
                ) : (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 8, padding: '0 0 4px', fontSize: 10, color: '#aaa', fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <span style={{ minWidth: 80 }}>Date</span>
                      <span style={{ flex: 1 }}>Description</span>
                      <span>Amount</span>
                      <span style={{ width: 60 }} />
                    </div>
                    {draws.map(d => (
                      <DrawRow
                        key={d.id}
                        draw={d}
                        canEdit={canEdit}
                        onDelete={(drawId) => handleDeleteDraw(drawId, item.id)}
                      />
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: '6px 0 0', fontSize: 12, fontFamily: FONTS.heading, fontWeight: 600 }}>
                      <span style={{ color: '#666' }}>Total drawn: <span style={{ color: '#222', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(drawn)}</span></span>
                    </div>
                  </div>
                )}

                {/* Add draw form or button */}
                {canEdit && (
                  isAddingDraw ? (
                    <AddDrawForm
                      lineItemId={item.id}
                      user={user}
                      onSave={reload}
                      onClose={() => setAddingDraw(prev => ({ ...prev, [item.id]: false }))}
                    />
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddingDraw(prev => ({ ...prev, [item.id]: true })); }}
                      style={{
                        background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 6,
                        padding: '6px 0', width: '100%', fontFamily: FONTS.body, fontSize: 12,
                        color: '#999', cursor: 'pointer', marginTop: 4,
                      }}
                    >
                      + Add Draw
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
