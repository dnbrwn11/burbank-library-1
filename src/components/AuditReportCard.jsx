import { COLORS, FONTS } from '../data/constants';

const GRADE_COLOR = { A: '#166534', B: '#3D6B23', C: '#9A3412', D: '#991B1B', F: '#6B21A8' };
const GRADE_BG    = { A: '#F0FDF4', B: '#F7FEE7', C: '#FFF7ED', D: '#FEF2F2', F: '#FAF5FF' };

function AuditDot({ color }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

export function AuditReportCard({ report, onClose }) {
  const {
    grade, gradeReason, psf: psfVal, psfRange,
    categoryProportions, concerns, strengths, recommendation, summary,
  } = report;

  const gradeColor = GRADE_COLOR[grade] || COLORS.mg;
  const gradeBg    = GRADE_BG[grade]    || COLORS.sf;

  const gaugeMin = psfRange?.low  ?? 200;
  const gaugeMax = psfRange?.high ?? 900;
  const midMark  = psfRange?.mid  ?? 500;
  const gaugePos = Math.max(0, Math.min(1, (psfVal - gaugeMin) / Math.max(gaugeMax - gaugeMin, 1)));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: COLORS.wh, borderRadius: 14, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${COLORS.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: 10, background: gradeBg, border: `2px solid ${gradeColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 32, fontWeight: 800, fontFamily: FONTS.heading, color: gradeColor, lineHeight: 1 }}>{grade}</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.dg }}>AI Estimate Audit</div>
              <div style={{ fontSize: 13, color: COLORS.mg, marginTop: 2, fontFamily: FONTS.body }}>{gradeReason}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: COLORS.mg, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px 24px' }}>

          {/* $/SF Gauge */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1 }}>
                Cost per SF
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.dg }}>
                ${psfVal.toFixed(0)}/SF
                <span style={{ fontWeight: 400, color: COLORS.mg, fontSize: 11 }}> (typical ${gaugeMin}–${gaugeMax}/SF)</span>
              </div>
            </div>
            <div style={{ position: 'relative', height: 18, background: 'linear-gradient(90deg,#4CAF50 0%,#8BC34A 25%,#FFC107 55%,#FF5722 80%,#B71C1C 100%)', borderRadius: 9, overflow: 'visible' }}>
              {/* Typical-mid marker */}
              <div style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${((midMark - gaugeMin) / Math.max(gaugeMax - gaugeMin, 1)) * 100}% - 1px)`, width: 2, background: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
              {/* Your position needle */}
              <div style={{ position: 'absolute', top: -4, bottom: -4, left: `calc(${gaugePos * 100}% - 3px)`, width: 6, background: '#1a1a1a', borderRadius: 3, boxShadow: '0 0 0 2px #fff' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: COLORS.mg, marginTop: 3, fontFamily: FONTS.heading }}>
              <span>${gaugeMin}/SF</span>
              <span>Typical mid ${midMark}/SF</span>
              <span>${gaugeMax}/SF</span>
            </div>
          </div>

          {/* Category Proportions */}
          {categoryProportions?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Category Proportions</div>
              <div style={{ border: `1px solid ${COLORS.bd}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 80px 80px 1fr', padding: '6px 12px', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, background: COLORS.sf, borderBottom: `1px solid ${COLORS.bd}` }}>
                  <span>Category</span><span style={{ textAlign: 'right' }}>Yours</span><span style={{ textAlign: 'right' }}>Typical</span><span style={{ paddingLeft: 8 }}>Note</span>
                </div>
                {categoryProportions.slice(0, 14).map((row, i) => {
                  const diff = row.typical > 0 ? Math.abs(row.yours - row.typical) / row.typical : 0;
                  const bg = diff > 0.3 ? '#FFF7ED' : diff > 0.15 ? '#FEFCE8' : 'transparent';
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 80px 80px 1fr', padding: '5px 12px', fontSize: 11, borderBottom: `1px solid ${COLORS.bl}`, background: bg, fontFamily: FONTS.body }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.category}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600 }}>{(row.yours ?? 0).toFixed(1)}%</span>
                      <span style={{ textAlign: 'right', color: COLORS.mg }}>{row.typical > 0 ? `${(row.typical).toFixed(1)}%` : '—'}</span>
                      <span style={{ fontSize: 10, color: COLORS.mg, paddingLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.note || ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Concerns + Strengths */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Top Concerns</div>
              {(concerns || []).length === 0 && <div style={{ fontSize: 12, color: COLORS.mg }}>None identified</div>}
              {(concerns || []).map((c, i) => <div key={i} style={{ fontSize: 12, color: '#7F1D1D', padding: '2px 0', lineHeight: 1.5, fontFamily: FONTS.body }}>• {c}</div>)}
            </div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Strengths</div>
              {(strengths || []).length === 0 && <div style={{ fontSize: 12, color: COLORS.mg }}>None identified</div>}
              {(strengths || []).map((s, i) => <div key={i} style={{ fontSize: 12, color: '#14532D', padding: '2px 0', lineHeight: 1.5, fontFamily: FONTS.body }}>✓ {s}</div>)}
            </div>
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>AI Recommendation</div>
              <div style={{ fontSize: 13, color: '#1E3A5F', lineHeight: 1.65, fontFamily: FONTS.body }}>{recommendation}</div>
            </div>
          )}

          {/* Summary bar */}
          <div style={{ background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontFamily: FONTS.body, color: COLORS.mg, fontWeight: 500 }}>{summary.total} items audited</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <AuditDot color="#22C55E" />
              <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, fontFamily: FONTS.heading }}>{summary.inRange} in range</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <AuditDot color="#F59E0B" />
              <span style={{ fontSize: 12, color: '#92400E', fontWeight: 600, fontFamily: FONTS.heading }}>{summary.caution} caution</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <AuditDot color="#EF4444" />
              <span style={{ fontSize: 12, color: '#991B1B', fontWeight: 600, fontFamily: FONTS.heading }}>{summary.flagged} flagged</span>
            </span>
            <span style={{ fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, marginLeft: 'auto' }}>Colored dots appear on each row in the Cost Model</span>
          </div>

        </div>
      </div>
    </div>
  );
}
