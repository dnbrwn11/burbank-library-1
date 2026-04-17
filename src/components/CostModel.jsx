import { useState, useMemo } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
const CSI_ORDER = [
  'Substructure', 'Shell', 'Interiors', 'Services', 'Equipment',
  'Special Construction', 'Sitework', 'General Conditions', 'Overhead & Fee', 'Contingency',
];
import { COLORS, FONTS } from '../data/constants';
import { fmt, fK, psf } from '../utils/format';
import { EditField } from './EditField';
import { Badge } from './Badge';
import { AIPanel } from './AIPanel';

export function CostModel({ items, globals, activeItems, totals, updateItem, bsf, aiAdvice, aiLoading, askAI, applyAI }) {
  const { mob, tab } = useWindowSize();
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('All');
  const [col, setCol] = useState(new Set());
  const [expR, setExpR] = useState(null);
  const [cv, setCv] = useState('mid');

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

  const toggleCol = (c) => setCol(p => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const cvk = CE.cvKey(cv);
  const uI = (id, f) => (v) => updateItem(id, f, v);

  // Expanded detail panel (shared between mobile and desktop)
  const ItemDetail = ({ item }) => {
    const lt = CE.lowTotal(item), mt = CE.midTotal(item), ht = CE.highTotal(item);
    return (
      <div style={{ padding: mob ? '0 14px 14px' : '10px 20px', borderTop: mob ? `1px solid ${COLORS.bl}` : 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(5,1fr)', gap: 8, marginTop: mob ? 10 : 0 }}>
          {[['Qty Min', 'qtyMin'], ['Qty Max', 'qtyMax'], ['$/Low', 'unitCostLow'], ['$/Mid', 'unitCostMid'], ['$/High', 'unitCostHigh']].map(([l, f]) => (
            <div key={f}>
              <div style={{ fontSize: 10, color: COLORS.mg, fontFamily: FONTS.heading, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
              <EditField value={item[f]} onCommit={uI(item.id, f)} mob={mob} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, padding: '6px 10px', background: COLORS.bl, borderRadius: 6, fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body }}>
          L: <b style={{ color: COLORS.lg }}>{fmt(lt)}</b> · M: <b style={{ color: COLORS.gn }}>{fmt(mt)}</b> · H: <b style={{ color: COLORS.or }}>{fmt(ht)}</b>
          {item.basis && <span style={{ marginLeft: 12 }}>| {item.basis}</span>}
        </div>
        {/* AI Cost Advisor */}
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
  };

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

      {/* Mobile: Card layout */}
      {mob ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map(g => {
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
                        <div key={item.id} style={{ background: COLORS.wh, border: `1px solid ${ex ? COLORS.yl : hasAI ? `${COLORS.gn}44` : COLORS.bd}`, borderRadius: 10, overflow: 'hidden' }}>
                          <div onClick={() => setExpR(ex ? null : item.id)} style={{ padding: '12px 14px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                                <div style={{ fontSize: 11, color: COLORS.mg }}>{item.subcategory} · {item.unit}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn }}>{fK(sh)}</div>
                                <Badge sensitivity={item.sensitivity} mob />
                              </div>
                            </div>
                          </div>
                          {ex && <ItemDetail item={item} />}
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
        <div style={{ borderRadius: 10, border: `1px solid ${COLORS.bd}`, overflow: 'clip', background: COLORS.wh }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONTS.body, tableLayout: 'fixed', minWidth: tab ? 700 : 1020 }}>
              <colgroup>
                <col style={{ width: 28 }} />
                <col />
                <col style={{ width: tab ? 100 : 120 }} />
                {!tab && <col style={{ width: 72 }} />}
                <col style={{ width: 72 }} />
                <col style={{ width: 52 }} />
                {!tab && <col style={{ width: 78 }} />}
                <col style={{ width: 78 }} />
                {!tab && <col style={{ width: 78 }} />}
                <col style={{ width: 92 }} />
                <col style={{ width: 62 }} />
                <col style={{ width: 58 }} />
                <col style={{ width: 30 }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#F5F5F0' }}>
                  {['', 'Description', 'Sub', !tab && 'Qty Min', 'Qty Max', 'Unit', !tab && '$/Low', '$/Mid', !tab && '$/High', `${cv.toUpperCase()} Total`, '$/SF', 'Sens', '']
                    .filter(Boolean)
                    .map((h, i) => (
                      <th key={i} style={{
                        position: 'sticky', top: 0, zIndex: 2,
                        background: '#F5F5F0',
                        padding: '9px 8px',
                        textAlign: ['Description', 'Sub'].includes(h) ? 'left' : 'right',
                        fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600,
                        color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1,
                        borderBottom: `2px solid ${COLORS.gn}22`,
                        whiteSpace: 'nowrap', overflow: 'hidden',
                      }}>{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => {
                  const cl = col.has(g.c);
                  return [
                    <tr key={`c_${g.c}`} style={{ background: '#FAFAF6', cursor: 'pointer', borderBottom: `1px solid ${COLORS.bd}` }} onClick={() => toggleCol(g.c)}>
                      <td style={{ padding: '8px 8px' }}><span style={{ color: COLORS.gn, fontSize: 9 }}>{cl ? '▶' : '▼'}</span></td>
                      <td colSpan={tab ? 5 : 7} style={{ padding: '8px 8px', fontWeight: 700, fontSize: 12, fontFamily: FONTS.heading, color: COLORS.gn }}>{g.c.toUpperCase()} <span style={{ color: COLORS.mg, fontWeight: 400, fontSize: 10, fontFamily: FONTS.body }}>({g.items.length})</span></td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn, fontVariantNumeric: 'tabular-nums' }}>{fmt(g.t[cvk])}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg, fontVariantNumeric: 'tabular-nums' }}>{psf(g.t[cvk], bsf)}</td>
                      <td colSpan={2} />
                    </tr>,
                    ...(!cl ? g.items.map(item => {
                      const sh = CE.itemTotal(item, cv);
                      const ex = expR === item.id;
                      const hasAI = aiAdvice?.[item.id];
                      return [
                        <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.bl}`, background: hasAI ? `${COLORS.gn}06` : COLORS.wh }}
                          onMouseEnter={e => e.currentTarget.style.background = hasAI ? `${COLORS.gn}08` : '#FCFCF9'}
                          onMouseLeave={e => e.currentTarget.style.background = hasAI ? `${COLORS.gn}06` : COLORS.wh}>
                          <td style={{ padding: '0 8px', cursor: 'pointer' }} onClick={() => setExpR(ex ? null : item.id)}>
                            <span style={{ color: hasAI ? COLORS.gn : COLORS.mg, fontSize: 8 }}>{ex ? '▼' : '▸'}</span>
                          </td>
                          <td style={{ padding: '4px 8px', overflow: 'hidden' }}><EditField value={item.description} onCommit={uI(item.id, 'description')} type="text" /></td>
                          <td style={{ padding: '4px 8px', fontSize: 10, color: COLORS.mg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subcategory}</td>
                          {!tab && <td style={{ padding: '4px 8px' }}><EditField value={item.qtyMin} onCommit={uI(item.id, 'qtyMin')} /></td>}
                          <td style={{ padding: '4px 8px' }}><EditField value={item[tab ? 'qtyMin' : 'qtyMax']} onCommit={uI(item.id, tab ? 'qtyMin' : 'qtyMax')} /></td>
                          <td style={{ padding: '4px 8px', fontSize: 10, color: COLORS.mg, textAlign: 'center' }}>{item.unit}</td>
                          {!tab && <td style={{ padding: '4px 8px' }}><EditField value={item.unitCostLow} onCommit={uI(item.id, 'unitCostLow')} /></td>}
                          <td style={{ padding: '4px 8px' }}><EditField value={item.unitCostMid} onCommit={uI(item.id, 'unitCostMid')} /></td>
                          {!tab && <td style={{ padding: '4px 8px' }}><EditField value={item.unitCostHigh} onCommit={uI(item.id, 'unitCostHigh')} /></td>}
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: COLORS.gn, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(sh)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: COLORS.mg, fontVariantNumeric: 'tabular-nums' }}>{psf(sh, bsf)}</td>
                          <td style={{ padding: '4px 8px' }}><Badge sensitivity={item.sensitivity} /></td>
                          <td style={{ padding: '4px 4px' }}><button onClick={() => updateItem(item.id, 'isArchived', true)} style={{ background: 'transparent', border: 'none', color: COLORS.ltg, cursor: 'pointer', fontSize: 10 }}>✕</button></td>
                        </tr>,
                        ex && (
                          <tr key={`${item.id}_x`} style={{ background: '#F8F8F3', borderBottom: `1px solid ${COLORS.bd}` }}>
                            <td colSpan={tab ? 9 : 13}><ItemDetail item={item} /></td>
                          </tr>
                        ),
                      ];
                    }).flat() : []),
                  ];
                }).flat()}
              </tbody>
            </table>
          </div>
        </div>
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
    </div>
  );
}
