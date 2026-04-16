import { SENSITIVITY_COLORS, FONTS } from '../data/constants';

export function Badge({ sensitivity, mob = false }) {
  const color = SENSITIVITY_COLORS[sensitivity] || '#A6A6A6';
  return (
    <span style={{
      fontSize: mob ? 10 : 9,
      fontWeight: 600,
      fontFamily: FONTS.heading,
      padding: '3px 8px',
      borderRadius: 4,
      background: `${color}18`,
      color,
      textTransform: 'uppercase',
    }}>
      {sensitivity}
    </span>
  );
}
