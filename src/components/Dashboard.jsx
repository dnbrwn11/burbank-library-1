import { useMemo } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
import { COLORS, FONTS } from '../data/constants';
import { fmt, fK, psf } from '../utils/format';

export function Dashboard({ totals, catGroups, activeItems, bsf, globals }) {
  const { mob, tab } = useWindowSize();
  const mx = Math.max(...catGroups.map(g => g.t.m), 1);

  const topDrivers = useMemo(() =>
    [...activeItems]
      .map(i => ({ ...i, _m: CE.midTotal(i) || 0 }))
      .sort((a, b) => b._m - a._m)
      .slice(0, 10),
    [activeItems]
  );

  const gc = mob ? '1fr' : tab ? '1fr 1fr' : '1fr 1fr 1fr';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: gc, gap: mob ? 10 : 14, fontFamily: FONTS.body }}>
      {/* Estimate KPIs */}
      <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3,1fr)', gap: mob ? 8 : 12 }}>
        {[
          ['Low', totals.full.l.tot, COLORS.lg, '#E8F5F1'],
          ['Mid', totals.full.m.tot, COLORS.gn, '#EFF6E8'],
          ['High', totals.full.h.tot, COLORS.or, '#FFF3EC'],
        ].map(([label, val, color, bg]) => (
          <div key={label} style={{ background: bg, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 14 : '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>{label} Estimate</div>
            <div style={{ fontSize: mob ? 22 : 24, fontWeight: 700, fontFamily: FONTS.heading, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(val)}</div>
            <div style={{ fontSize: 12, color, fontFamily: FONTS.heading, fontWeight: 600, marginTop: 2 }}>{psf(val, bsf)}</div>
          </div>
        ))}
      </div>

      {/* Category bars */}
      <div style={{ gridColumn: '1/-1', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          Cost by Category (Mid) — {bsf.toLocaleString()} SF Building
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: mob ? 6 : 8 }}>
          {catGroups.map(g => (
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
        {[
          ['Escalated Sub', totals.full.m.sub],
          ['Contingency', totals.full.m.co],
          ['GC', totals.full.m.gc],
          ['Fee', totals.full.m.fe],
          ['Ins+Bond', totals.full.m.ins],
          ['Tax', totals.full.m.tx],
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
    </div>
  );
}
