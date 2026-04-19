import { FONTS } from '../data/constants';

const ACCENT = '#B89030';

export default function GenerationBanner({ status, progress, itemCount, failedChunks = [], errorMsg, sanityWarning, onRetry }) {
  if (status === 'idle') return null;

  const pct = (progress.totalBatches > 0)
    ? Math.round((progress.batch / progress.totalBatches) * 100)
    : 0;

  const CHUNK_NAMES = ['Structure & Site', 'Interiors & Soft Costs', 'All Services'];

  // ── colours & copy per status ───────────────────────────────────────────────
  const config = {
    generating: {
      bar: ACCENT,
      bg: '#fffbf0',
      border: '#fde68a',
      text: '#92400e',
      label: progress.batchName
        ? progress.batchName
        : pct === 0
          ? 'Planning estimate…'
          : `Generating… ${itemCount} items so far`,
    },
    partial: {
      bar: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      label: `Generated ${itemCount} items. ${failedChunks.length} section${failedChunks.length !== 1 ? 's' : ''} failed.`,
    },
    complete: {
      bar: '#22c55e',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
      label: `Estimate complete — ${itemCount} items generated ✓`,
    },
    error: {
      bar: '#ef4444',
      bg: '#fef2f2',
      border: '#fca5a5',
      text: '#991b1b',
      label: errorMsg || 'Generation failed.',
    },
  }[status] || {};

  const barPct = status === 'complete' ? 100
               : status === 'partial'  ? 100
               : status === 'error'    ? 100
               : pct;

  return (
    <div style={{
      background: config.bg,
      borderBottom: `1px solid ${config.border}`,
      padding: '0 20px',
    }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${barPct}%`,
          background: config.bar,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Status row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 0', flexWrap: 'wrap',
      }}>
        {/* Spinner or checkmark */}
        {status === 'generating' && (
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            border: `2px solid ${ACCENT}`,
            borderTopColor: 'transparent',
            animation: 'cd-spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
        )}

        <span style={{
          fontFamily: FONTS.body, fontSize: 12, color: config.text, flex: 1,
        }}>
          {config.label}
        </span>

        {/* Retry buttons for failed chunks */}
        {status === 'partial' && onRetry && failedChunks.map(idx => (
          <button
            key={idx}
            onClick={() => onRetry(idx)}
            style={{
              background: '#f59e0b', color: '#fff', border: 'none',
              borderRadius: 5, padding: '3px 10px',
              fontFamily: FONTS.body, fontWeight: 600, fontSize: 11,
              cursor: 'pointer',
            }}
          >
            ↺ Retry {CHUNK_NAMES[idx] || `Section ${idx + 1}`}
          </button>
        ))}

        {status === 'generating' && (
          <span style={{ fontFamily: FONTS.body, fontSize: 11, color: config.text, opacity: 0.7 }}>
            Sections generate in parallel — items appear as each finishes
          </span>
        )}
      </div>

      {/* Sanity warning — shown when estimate significantly exceeds budget */}
      {sanityWarning && sanityWarning.type === 'over_budget' && (
        <div style={{
          background: '#FEF2F2', borderTop: '1px solid #FECACA',
          padding: '8px 20px',
          display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#CC4444', fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠</span>
          <span style={{ fontFamily: FONTS.body, fontSize: 12, color: '#7F1D1D', lineHeight: 1.5 }}>
            {sanityWarning.message}
          </span>
        </div>
      )}
    </div>
  );
}
