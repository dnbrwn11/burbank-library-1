import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
import { CATEGORIES } from '../data/seedData';
import { COLORS, FONTS, SCENARIO_TYPES } from '../data/constants';
import { fmt, fK, psf } from '../utils/format';

export function Compare({ scenarios, addScenario }) {
  const { mob } = useWindowSize();

  if (scenarios.length < 2) {
    return (
      <div style={{ background: COLORS.wh, border: '1.5px dashed #d8d8d4', borderRadius: 12, padding: mob ? 28 : 56, textAlign: 'center', fontFamily: FONTS.body }}>
        <div style={{ fontSize: 32, marginBottom: 14 }}>⚖</div>
        <div style={{ fontSize: 18, fontFamily: FONTS.heading, fontWeight: 800, color: COLORS.dg, marginBottom: 10 }}>Create a scenario to compare alternatives</div>
        <div style={{ fontSize: 13, color: COLORS.mg, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
          Scenarios are independent copies of your estimate. Adjust quantities, costs, or assumptions to model different options side by side.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {SCENARIO_TYPES.filter(t => !scenarios.find(s => s.name === t)).slice(0, 3).map(t => (
            <button key={t} onClick={() => addScenario(t)} style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 12, fontFamily: FONTS.heading, fontWeight: 700, cursor: 'pointer' }}>+ {t}</button>
          ))}
        </div>
      </div>
    );
  }

  const allCalcs = scenarios.map(s => ({ s, c: CE.projectTotals(s.items, s.globals) }));
  const base = allCalcs[0].c;

  const rows = [
    { l: 'Direct (Escalated)', k: 'sub' },
    { l: 'Contingency', k: 'co' },
    { l: 'Gen Conditions', k: 'gc' },
    { l: 'Fee/OH&P', k: 'fe' },
    { l: 'Ins+Bond', k: 'ins' },
    { l: 'Tax', k: 'tx' },
    { l: 'PROJECT TOTAL', k: 'tot' },
  ];

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Summary comparison */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${COLORS.bd}`, background: COLORS.wh }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: mob ? 11 : 12, minWidth: mob ? 500 : 0 }}>
          <thead>
            <tr style={{ background: '#F5F5F0' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1 }}>Line</th>
              {allCalcs.map(({ s }) => (
                <th key={s.id} style={{ padding: '10px 8px', textAlign: 'right', fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, minWidth: mob ? 100 : 130 }}>{s.name}</th>
              ))}
              {allCalcs.slice(1).map(({ s }) => (
                <th key={`d${s.id}`} style={{ padding: '10px 8px', textAlign: 'right', fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, minWidth: mob ? 90 : 120 }}>Δ {s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isT = r.k === 'tot';
              return (
                <tr key={r.k} style={{ borderBottom: `1px solid ${COLORS.bd}`, background: isT ? '#FAFAF6' : 'transparent' }}>
                  <td style={{ padding: 8, fontWeight: isT ? 700 : 400, fontFamily: isT ? FONTS.heading : FONTS.body, color: isT ? COLORS.gn : COLORS.dg }}>{r.l}</td>
                  {allCalcs.map(({ s, c }) => (
                    <td key={s.id} style={{ padding: 8, textAlign: 'right', fontWeight: isT ? 700 : 400, fontFamily: isT ? FONTS.heading : FONTS.body, color: isT ? COLORS.gn : COLORS.dg, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(c.full.m[r.k])}
                      {isT && <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.gn }}>{psf(c.full.m[r.k], s.globals.buildingSF || 97500)}</div>}
                    </td>
                  ))}
                  {allCalcs.slice(1).map(({ s, c }) => {
                    const d = c.full.m[r.k] - base.full.m[r.k];
                    const p = base.full.m[r.k] ? ((d / base.full.m[r.k]) * 100) : 0;
                    const clr = d > 0 ? COLORS.or : d < 0 ? COLORS.lg : COLORS.mg;
                    return (
                      <td key={`d${s.id}`} style={{ padding: 8, textAlign: 'right', fontWeight: isT ? 700 : 400, color: clr, fontVariantNumeric: 'tabular-nums' }}>
                        {d > 0 ? '+' : ''}{fK(d)} <span style={{ fontSize: 10 }}>({p > 0 ? '+' : ''}{p.toFixed(1)}%)</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Category comparison */}
      <div style={{ marginTop: 16, background: COLORS.wh, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Category Comparison (Mid)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: mob ? 400 : 0 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.bd}` }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontFamily: FONTS.heading, color: COLORS.mg, textTransform: 'uppercase' }}>Category</th>
                {scenarios.map(s => (
                  <th key={s.id} style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, fontFamily: FONTS.heading, color: COLORS.mg, textTransform: 'uppercase' }}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat => {
                const vals = scenarios.map(s => CE.categoryTotals(s.items, s.globals, cat).m);
                if (vals.every(v => v === 0)) return null;
                return (
                  <tr key={cat} style={{ borderBottom: `1px solid ${COLORS.bl}` }}>
                    <td style={{ padding: '5px 8px', fontSize: 11 }}>{cat}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: i > 0 && v !== vals[0] ? (v > vals[0] ? COLORS.or : COLORS.lg) : COLORS.dg }}>{fK(v)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
