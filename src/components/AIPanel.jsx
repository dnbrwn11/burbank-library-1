import { COLORS, FONTS } from '../data/constants';

/**
 * AI Cost Advisor panel — shown in expanded line item detail.
 * Displays loading state, error state, or the full advice card
 * with suggested costs, reasoning, and apply/re-analyze buttons.
 */
export function AIPanel({ item, advice, loading, onAsk, onApply, mob }) {
  if (loading) {
    return (
      <div style={{
        marginTop: 10, padding: '14px 16px',
        background: `${COLORS.yl}15`, border: `1px solid ${COLORS.yl}44`,
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 18, height: 18, border: `2px solid ${COLORS.yl}`,
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'aispin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 13, color: COLORS.dg, fontFamily: FONTS.body }}>
          Analyzing costs for this line item...
        </span>
        <style>{`@keyframes aispin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (advice?.error) {
    return (
      <div style={{
        marginTop: 10, padding: '12px 16px',
        background: `${COLORS.or}10`, border: `1px solid ${COLORS.or}33`,
        borderRadius: 8, fontSize: 12, color: COLORS.or, fontFamily: FONTS.body,
      }}>
        Could not get AI advice: {advice.error}
        <button onClick={onAsk} style={{
          marginLeft: 12, background: COLORS.wh, border: `1px solid #E5E5E2`,
          borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
          color: COLORS.gn, fontFamily: FONTS.heading, fontWeight: 600,
        }}>Try Again</button>
      </div>
    );
  }

  if (!advice) {
    return (
      <button onClick={onAsk} style={{
        marginTop: 10,
        background: `linear-gradient(135deg, ${COLORS.gn}, ${COLORS.lg})`,
        color: COLORS.wh, border: 'none', borderRadius: 8,
        padding: mob ? '12px 20px' : '10px 18px',
        fontSize: 13, fontFamily: FONTS.heading, fontWeight: 700,
        cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 8,
        width: mob ? '100%' : 'auto', justifyContent: 'center',
      }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        ASK AI COST ADVISOR
      </button>
    );
  }

  const confColor = advice.confidence === 'high' ? COLORS.lg
    : advice.confidence === 'medium' ? COLORS.ind : COLORS.or;

  return (
    <div style={{
      marginTop: 10, background: `${COLORS.gn}08`,
      border: `1px solid ${COLORS.gn}25`, borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: `${COLORS.gn}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={COLORS.gn} strokeWidth="2">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span style={{
            fontSize: 12, fontFamily: FONTS.heading, fontWeight: 700,
            color: COLORS.gn, textTransform: 'uppercase', letterSpacing: 1,
          }}>AI Cost Advisor</span>
        </div>
        <span style={{
          fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600,
          padding: '2px 8px', borderRadius: 4,
          background: `${confColor}18`, color: confColor, textTransform: 'uppercase',
        }}>{advice.confidence} confidence</span>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Suggested range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            ['Low', advice.low, COLORS.lg],
            ['Mid', advice.mid, COLORS.gn],
            ['High', advice.high, COLORS.or],
          ].map(([label, val, color]) => (
            <div key={label} style={{
              background: COLORS.wh, borderRadius: 6, padding: '8px 10px',
              textAlign: 'center', border: `1px solid #E5E5E2`,
            }}>
              <div style={{
                fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600,
                color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
              }}>AI {label}</div>
              <div style={{
                fontSize: 16, fontWeight: 700, fontFamily: FONTS.heading,
                color, fontVariantNumeric: 'tabular-nums',
              }}>${Number(val).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: COLORS.mg }}>per {item.unit}</div>
            </div>
          ))}
        </div>

        {/* Reasoning */}
        <div style={{
          fontSize: 13, color: COLORS.dg, lineHeight: 1.5,
          marginBottom: 10, fontFamily: FONTS.body,
        }}>{advice.reasoning}</div>

        {/* Risk factors */}
        <div style={{
          display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr',
          gap: 8, marginBottom: 10,
        }}>
          <div style={{
            background: `${COLORS.or}08`, border: `1px solid ${COLORS.or}20`,
            borderRadius: 6, padding: '8px 12px',
          }}>
            <div style={{
              fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600,
              color: COLORS.or, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3,
            }}>Risk — Could go higher</div>
            <div style={{ fontSize: 11, color: COLORS.dg }}>{advice.risk_up}</div>
          </div>
          <div style={{
            background: `${COLORS.lg}08`, border: `1px solid ${COLORS.lg}20`,
            borderRadius: 6, padding: '8px 12px',
          }}>
            <div style={{
              fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600,
              color: COLORS.lg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3,
            }}>Opportunity — Could go lower</div>
            <div style={{ fontSize: 11, color: COLORS.dg }}>{advice.risk_down}</div>
          </div>
        </div>

        {/* Market note */}
        {advice.market_note && (
          <div style={{
            fontSize: 11, color: COLORS.mg, fontStyle: 'italic',
            marginBottom: 12, fontFamily: FONTS.body,
          }}>Market: {advice.market_note}</div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => onApply(advice)} style={{
            background: COLORS.yl, color: COLORS.dg, border: 'none',
            borderRadius: 6, padding: '8px 16px', fontSize: 12,
            fontFamily: FONTS.heading, fontWeight: 700, cursor: 'pointer',
          }}>APPLY AI SUGGESTION</button>
          <button onClick={onAsk} style={{
            background: COLORS.wh, color: COLORS.gn,
            border: `1px solid #E5E5E2`, borderRadius: 6,
            padding: '8px 16px', fontSize: 12,
            fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer',
          }}>RE-ANALYZE</button>
        </div>
      </div>
    </div>
  );
}
