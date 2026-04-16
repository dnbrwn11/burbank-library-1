/** Format as currency: $1,234,567 */
export function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

/** Format as compact currency: $1.23M or $456K */
export function fK(n) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

/** Format as $/SF */
export function psf(n, sf) {
  return sf > 0 && n != null ? `$${Math.round(n / sf)}/SF` : '—';
}

/** Format as percentage from decimal: 0.05 → "5.0%" */
export function pct(n) {
  return `${((n || 0) * 100).toFixed(1)}%`;
}
