import { COLORS, FONTS } from '../data/constants';

export function AuditLog({ audit, items, updateItem, updateGlobal }) {
  if (audit.length === 0) {
    return (
      <div style={{
        background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 12,
        padding: 40, textAlign: 'center', color: COLORS.mg, fontFamily: FONTS.body,
      }}>
        Edit quantities or costs to build the audit trail.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONTS.body, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: COLORS.mg, marginBottom: 4 }}>{audit.length} changes recorded</div>
      {audit.slice(0, 50).map(e => {
        const item = items.find(i => i.id === e.iid);
        return (
          <div key={e.id} style={{
            background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 8,
            padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.iid === 'G' ? 'Global Assumptions' : (item?.description || 'Unknown')}
                <span style={{ fontSize: 10, color: COLORS.mg, marginLeft: 6 }}>({e.sc})</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.mg }}>
                {e.f}: <span style={{ color: COLORS.or }}>{String(e.o ?? '—')}</span>
                {' → '}
                <span style={{ color: COLORS.lg }}>{String(e.n ?? '—')}</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (e.iid === 'G') updateGlobal(e.f, e.o);
                else updateItem(e.iid, e.f, e.o);
              }}
              style={{
                background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 6,
                color: COLORS.gn, padding: '6px 12px', fontSize: 11,
                fontFamily: FONTS.heading, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              ↩ UNDO
            </button>
          </div>
        );
      })}
    </div>
  );
}
