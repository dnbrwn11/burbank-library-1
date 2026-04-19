import { useMemo } from 'react';
import { FONTS, COLORS } from '../data/constants';

const ACCENT = '#B89030';
const BORDER = '#E5E5E0';

export default function QuickStatsRow({ activeItems, activeItems: items }) {
  const stats = useMemo(() => {
    const lineItems   = items?.length ?? 0;
    const categories  = new Set((items || []).map(i => i.category).filter(Boolean)).size;
    const hasAdvice   = (items || []).some(i => i.aiAdvice);
    const withCost    = (items || []).filter(i => (i.unitCostMid || 0) > 0).length;
    const completeness = lineItems > 0 ? Math.round(withCost / lineItems * 100) : 0;

    return { lineItems, categories, hasAdvice, completeness };
  }, [items]);

  const tiles = [
    {
      label: 'Line Items',
      value: stats.lineItems.toLocaleString(),
      icon: '≡',
      color: '#1e40af',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      label: 'Categories',
      value: stats.categories.toLocaleString(),
      icon: '◈',
      color: '#6d28d9',
      bg: '#f5f3ff',
      border: '#ddd6fe',
    },
    {
      label: 'Last Audited',
      value: stats.hasAdvice ? 'Done' : 'Not yet',
      icon: '◎',
      color: stats.hasAdvice ? '#166534' : '#92400e',
      bg:    stats.hasAdvice ? '#f0fdf4' : '#fffbeb',
      border:stats.hasAdvice ? '#bbf7d0' : '#fde68a',
    },
    {
      label: 'Completeness',
      value: `${stats.completeness}%`,
      icon: '◉',
      color: stats.completeness >= 80 ? '#166534' : stats.completeness >= 40 ? ACCENT : '#92400e',
      bg:    stats.completeness >= 80 ? '#f0fdf4' : stats.completeness >= 40 ? '#fffbf0' : '#fffbeb',
      border:stats.completeness >= 80 ? '#bbf7d0' : stats.completeness >= 40 ? '#fde68a' : '#fde68a',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 10,
      marginBottom: 16,
    }}>
      {tiles.map(t => (
        <div
          key={t.label}
          style={{
            background: t.bg,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18, color: t.color, lineHeight: 1, flexShrink: 0 }}>{t.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: FONTS.heading, fontWeight: 800, fontSize: 16,
              color: t.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>
              {t.value}
            </div>
            <div style={{
              fontFamily: FONTS.body, fontSize: 10, color: '#888',
              marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {t.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
