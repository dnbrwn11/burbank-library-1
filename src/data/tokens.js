// ── CostDeck design tokens ───────────────────────────────────────────────────
// Strict 4px spacing grid. No magic numbers. Import from here everywhere.

export const SPACE = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
};

export const COLOR = {
  // Core brand
  graphite:  '#1A1A1A',
  gold:      '#B89030',
  white:     '#FFFFFF',

  // Backgrounds
  page:      '#F9F9F8',
  card:      '#FFFFFF',
  altBg:     '#F3F3F1',
  sidebarBg: '#1A1A1A',
  hoverRow:  '#F8F7F4',
  stripeRow: '#FAFAF9',
  selRow:    '#FEFCF6',

  // Text
  text:       '#1A1A1A',
  textBody:   '#3A3A3A',
  textMuted:  '#888888',
  textLabel:  '#888888',
  textSub:    '#555555',
  textFaint:  '#CCCCCC',

  // Strokes
  border:     '#E5E5E2',
  borderSoft: '#F0F0ED',
  borderDark: '#333333',

  // Status
  success:       '#3D946A',
  successBg:     '#EAF3DE',
  successText:   '#27500A',

  info:          '#4470A0',
  infoBg:        '#E1EBF5',
  infoText:      '#1E3A5F',

  warning:       '#D49030',
  warningBg:     '#FAEEDA',
  warningText:   '#633806',

  danger:        '#CC4444',
  dangerBg:      '#FCEBEB',
  dangerText:    '#791F1F',

  goldBg:        '#FBF5E8',
  goldText:      '#8A6820',
  goldBorder:    '#B89030',

  neutralBg:     '#F3F3F1',
  neutralText:   '#888888',
};

export const RADIUS = {
  xs:  4,
  sm:  6,
  md:  8,
  lg:  12,
  xl:  16,
  pill: 9999,
};

export const SHADOW = {
  none:   'none',
  card:   '0 2px 8px rgba(0,0,0,0.06)',
  modal:  '0 8px 30px rgba(0,0,0,0.12)',
  sticky: '0 -1px 3px rgba(0,0,0,0.04)',
  scroll: '0 1px 3px rgba(0,0,0,0.05)',
};

export const FONT = {
  heading: "'Archivo', Arial, sans-serif",
  body:    "'Figtree', Arial, sans-serif",
  mono:    "'JetBrains Mono', Menlo, monospace",
};

// Typography scale — use these exclusively
export const TYPE = {
  pageTitle:   { family: FONT.heading, size: 22, weight: 600, color: COLOR.text },
  sectionHead: { family: FONT.heading, size: 16, weight: 600, color: '#333333' },
  cardTitle:   { family: FONT.heading, size: 14, weight: 600, color: COLOR.text },
  body:        { family: FONT.body,    size: 14, weight: 400, color: COLOR.textBody },
  bodyMuted:   { family: FONT.body,    size: 13, weight: 400, color: COLOR.textMuted },
  label:       { family: FONT.body,    size: 12, weight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  num:         { family: FONT.mono,    size: 14, weight: 500, color: COLOR.text, fontVariantNumeric: 'tabular-nums' },
  numLarge:    { family: FONT.mono,    size: 28, weight: 600, color: COLOR.text, fontVariantNumeric: 'tabular-nums' },
  numHeader:   { family: FONT.mono,    size: 16, weight: 600, color: COLOR.gold, fontVariantNumeric: 'tabular-nums' },
};

export const TRANSITION = {
  fast:   '150ms ease',
  normal: '200ms ease',
};

export const BADGE_STYLES = {
  active:      { bg: COLOR.successBg, color: COLOR.successText },
  on_hold:     { bg: COLOR.warningBg, color: COLOR.warningText },
  won:         { bg: COLOR.goldBg,    color: COLOR.goldText },
  lost:        { bg: COLOR.dangerBg,  color: COLOR.dangerText },
  archived:    { bg: COLOR.neutralBg, color: COLOR.neutralText },
  draft:       { bg: COLOR.neutralBg, color: COLOR.neutralText },
  sample:      { bg: COLOR.infoBg,    color: COLOR.infoText },
  renovation:  { bg: COLOR.goldBg,    color: COLOR.goldText },
  new_construction: { bg: COLOR.successBg, color: COLOR.successText },
};
