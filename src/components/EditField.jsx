import { useState, useEffect, useRef } from 'react';
import { COLORS, FONTS } from '../data/constants';

/**
 * Inline editable cell. Click to edit, blur or Enter to commit.
 * Renders larger touch targets on mobile (mob=true).
 */
export function EditField({ value, onCommit, type = 'number', mob = false }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const ref = useRef(null);

  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); ref.current.select(); }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const parsed = type === 'number'
      ? (v === '' || v == null ? null : Number(v))
      : v;
    if (parsed !== value) onCommit(parsed);
  };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{
          cursor: 'pointer',
          padding: mob ? '8px 10px' : '4px 6px',
          borderRadius: 6,
          fontSize: mob ? 14 : 12,
          fontFamily: FONTS.body,
          textAlign: type === 'number' ? 'right' : 'left',
          color: (value == null || value === '' || value === 0) ? COLORS.mg : COLORS.dg,
          fontVariantNumeric: 'tabular-nums',
          background: mob ? COLORS.bl : 'transparent',
          minHeight: mob ? 38 : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: type === 'number' ? 'flex-end' : 'flex-start',
        }}
      >
        {type === 'number'
          ? (value != null && value !== '' ? Number(value).toLocaleString() : '—')
          : (value || '—')}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      value={v ?? ''}
      onChange={e => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
      type={type === 'number' ? 'number' : 'text'}
      style={{
        background: COLORS.wh,
        border: `2px solid ${COLORS.yl}`,
        borderRadius: 6,
        color: COLORS.dg,
        padding: mob ? '8px 10px' : '3px 6px',
        fontSize: mob ? 14 : 12,
        fontFamily: FONTS.body,
        outline: 'none',
        width: '100%',
        textAlign: type === 'number' ? 'right' : 'left',
        minHeight: mob ? 38 : 'auto',
      }}
    />
  );
}
