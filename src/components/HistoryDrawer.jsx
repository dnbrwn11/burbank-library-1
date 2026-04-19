import { useEffect } from 'react';
import { AuditLog } from './AuditLog';
import { COLORS, FONTS } from '../data/constants';

// Slide-out right drawer that wraps the audit log.
// Escape key or backdrop click closes.
export default function HistoryDrawer({ audit, items, updateItem, updateGlobal, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 950,
        display: 'flex', justifyContent: 'flex-end',
        animation: 'cd-fade-in 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          background: COLORS.bg, height: '100%',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          animation: 'cd-slide-left 0.22s ease-out',
        }}
      >
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid #E5E5E2`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff',
        }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, color: COLORS.dg }}>
              Change History
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.mg, marginTop: 2 }}>
              {audit?.length || 0} change{audit?.length === 1 ? '' : 's'} recorded
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: COLORS.mg, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <AuditLog audit={audit} items={items} updateItem={updateItem} updateGlobal={updateGlobal} />
        </div>
      </div>

      <style>{`
        @keyframes cd-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
