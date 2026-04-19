import { useWindowSize } from '../hooks/useWindowSize';
import { COLORS, FONTS } from '../data/constants';
import { fmt, fK, psf } from '../utils/format';
import { DESIGN_PHASES, spreadForItem } from '../engine/CostEngine';

const FIELDS = [
  { k: 'escalation',        l: 'Escalation',        d: 'To midpoint (2028)' },
  { k: 'contingency',       l: 'Contingency',        d: 'Design+construction' },
  { k: 'generalConditions', l: 'Gen. Conditions',    d: 'Jobsite mgmt' },
  { k: 'fee',               l: 'GC Fee',             d: 'OH&P' },
  { k: 'tax',               l: 'Sales Tax',          d: 'CA+local' },
  { k: 'insurance',         l: 'Insurance',          d: 'GL, builder\'s risk' },
  { k: 'bond',              l: 'Bond',               d: 'P&P bond' },
  { k: 'laborBurden',       l: 'Labor Burden',       d: 'Prevailing wage' },
  { k: 'regionFactor',      l: 'Region Factor',      d: 'SoCal 1.15' },
  { k: 'buildingSF',        l: 'Building SF',        d: 'Gross area' },
  { k: 'parkingStalls',     l: 'Parking Stalls',     d: 'Structured' },
  { k: 'openSpaceSF',       l: 'Open Space SF',      d: 'Primary area' },
];

const SPREAD_LABELS = { Low: '±8%', Medium: '±15%', High: '±25%', 'Very High': '±35%' };

export function Assumptions({ globals, totals, updateGlobal, bsf, scenarioName, activeItems }) {
  const { mob } = useWindowSize();
  const phase = DESIGN_PHASES.find(p => p.key === globals.designPhase);

  return (
    <div style={{ maxWidth: 960, fontFamily: FONTS.body }}>

      {/* Design Phase */}
      <div style={{ background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 12, padding: mob ? 14 : 22, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gn, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
          Design Phase &amp; Spread Model
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 2fr', gap: mob ? 12 : 20, alignItems: 'start' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, fontFamily: FONTS.heading }}>Design Phase</label>
            <select
              value={globals.designPhase || ''}
              onChange={e => updateGlobal('designPhase', e.target.value || null)}
              style={{ background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 8, color: COLORS.dg, padding: 8, fontSize: 13, fontFamily: FONTS.body, outline: 'none', width: '100%', minHeight: 42 }}
            >
              <option value="">— Not set —</option>
              {DESIGN_PHASES.map(p => (
                <option key={p.key} value={p.key}>{p.label} ({p.aace})</option>
              ))}
            </select>
            <div style={{ fontSize: 10, color: COLORS.mg, marginTop: 3 }}>AACE International estimate class</div>
          </div>

          {phase ? (
            <div style={{ background: '#FFFBF0', border: `1px solid #E8D5A0`, borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: COLORS.gn, marginBottom: 8 }}>
                {phase.label} — {phase.aace} &nbsp;·&nbsp; {phase.multiplier}× multiplier
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {['Low', 'Medium', 'High', 'Very High'].map(s => {
                  const base = { Low: 0.08, Medium: 0.15, High: 0.25, 'Very High': 0.35 }[s];
                  const spread = Math.min(base * phase.multiplier, 0.95);
                  return (
                    <div key={s} style={{ background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{s}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn }}>±{(spread * 100).toFixed(0)}%</div>
                      <div style={{ fontSize: 9, color: COLORS.mg }}>base {SPREAD_LABELS[s]}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, lineHeight: 1.5 }}>
                Spread = base spread × {phase.multiplier}× phase multiplier. Low = Mid × (1 − spread), High = Mid × (1 + spread). Applied to project-level spread model on Dashboard.
              </div>
            </div>
          ) : (
            <div style={{ background: COLORS.bl, border: `1px solid #E5E5E2`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: COLORS.mg, fontFamily: FONTS.body, lineHeight: 1.5 }}>
                Select a design phase to enable the spread model. Base spreads: Low ±8%, Medium ±15%, High ±25%, Very High ±35%, scaled by the AACE phase multiplier.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Assumptions */}
      <div style={{ background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 12, padding: mob ? 14 : 22, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gn, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
          Global Assumptions — {scenarioName}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: mob ? 10 : 14 }}>
          {FIELDS.map(f => {
            const isArea = ['buildingSF', 'parkingStalls', 'openSpaceSF'].includes(f.k);
            const isPct = !isArea && f.k !== 'regionFactor';
            return (
              <div key={f.k}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.l}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    step={f.k === 'regionFactor' ? '0.01' : isArea ? '100' : '0.1'}
                    value={isPct ? (globals[f.k] * 100).toFixed(1) : globals[f.k]}
                    onChange={e => updateGlobal(f.k, isPct ? Number(e.target.value) / 100 : Number(e.target.value))}
                    style={{ background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 8, color: COLORS.dg, padding: 8, fontSize: 14, fontFamily: FONTS.body, outline: 'none', width: '100%', textAlign: 'right', minHeight: 42 }}
                  />
                  <span style={{ fontSize: 11, color: COLORS.mg, width: 16 }}>{isPct ? '%' : f.k === 'regionFactor' ? '×' : ''}</span>
                </div>
                <div style={{ fontSize: 10, color: COLORS.mg, marginTop: 2 }}>{f.d}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Impact cards */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
        {[
          ['Low',  totals.full.l, COLORS.lg, '#E8F5F1'],
          ['Mid',  totals.full.m, COLORS.gn, '#EFF6E8'],
          ['High', totals.full.h, COLORS.or, '#FFF3EC'],
        ].map(([label, d, color, bg]) => (
          <div key={label} style={{ background: bg, border: `1px solid #E5E5E2`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{label}</div>
            {[
              { l: 'Subtotal', v: d.sub },
              { l: 'Contingency', v: d.co },
              { l: 'GC', v: d.gc },
              { l: 'Fee', v: d.fe },
              { l: 'Ins+Bond', v: d.ins },
              { l: 'Tax', v: d.tx },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: `1px solid ${COLORS.bd}33` }}>
                <span style={{ color: COLORS.mg }}>{r.l}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fK(r.v)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, fontFamily: FONTS.heading, paddingTop: 8, color }}>
              <span>TOTAL</span><span>{fmt(d.tot)}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, fontFamily: FONTS.heading, fontWeight: 600, color }}>{psf(d.tot, bsf)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
