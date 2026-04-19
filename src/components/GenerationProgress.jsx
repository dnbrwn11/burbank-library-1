const ACCENT = '#B89030';

export default function GenerationProgress({ progress }) {
  const { batch, totalBatches, batchName } = progress;
  const pct = totalBatches > 0 ? Math.min(100, Math.round((batch / totalBatches) * 100)) : 0;

  const BATCH_LABELS = [
    'Substructure & Shell',
    'Interiors & Finishes',
    'Mechanical, Plumbing & Fire',
    'Electrical & Low Voltage',
    'Equipment, Sitework & Soft Costs',
  ];

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes itemPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>
      <div style={{
        background: '#fff',
        border: '1px solid #e6e6e2',
        borderRadius: 16,
        padding: '48px 48px',
        textAlign: 'center',
        maxWidth: 500,
        width: '100%',
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      }}>
        {/* Spinner */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #f0f0ee',
          borderTopColor: ACCENT,
          margin: '0 auto 24px',
          animation: 'spin 0.9s linear infinite',
        }} />

        <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: '#111', marginBottom: 10 }}>
          Generating Estimate
        </h2>
        <p style={{
          fontFamily: "'Figtree', sans-serif", color: '#666', fontSize: 14,
          marginBottom: 28, lineHeight: 1.5, minHeight: 44,
        }}>
          {batch > 0 ? `Generating ${batchName}…` : 'Analyzing project scope…'}
        </p>

        {/* Progress bar */}
        <div style={{
          width: '100%', height: 6, background: '#f0f0ee',
          borderRadius: 3, overflow: 'hidden', marginBottom: 16,
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: ACCENT, borderRadius: 3,
            transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>

        {/* Section pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {BATCH_LABELS.map((label, i) => {
            const done = i < batch;
            const active = i === batch - 1 && batch > 0;
            return (
              <span key={label} style={{
                fontFamily: "'Figtree', sans-serif", fontSize: 10,
                padding: '3px 8px', borderRadius: 12,
                background: done ? ACCENT : '#f0f0ee',
                color: done ? '#fff' : '#aaa',
                border: `1px solid ${active ? ACCENT : 'transparent'}`,
                fontWeight: done ? 600 : 400,
                transition: 'all 0.4s ease',
                whiteSpace: 'nowrap',
              }}>
                {done && !active ? '✓ ' : ''}{label}
              </span>
            );
          })}
        </div>

        {/* Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa' }}>
            {batch > 0 ? `Section ${batch} of ${totalBatches}` : 'Starting…'}
          </span>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#bbb' }}>
            This typically takes 2–3 minutes
          </span>
        </div>
      </div>
    </div>
  );
}
