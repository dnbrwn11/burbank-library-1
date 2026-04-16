/* ═══════════════════════════════════════════════════════════
   PCL Brand Colors
   Primary: Yellow #FFC425, Green #00502F, White
   Secondary: Indigo #4E5BA8, Light Green #098371, Orange #D83C31
   Grays: Dark #36383D, Mid #A6A6A6, Light #CFCFCF
   ═══════════════════════════════════════════════════════════ */

export const COLORS = {
  yl: '#FFC425',
  gn: '#00502F',
  wh: '#FFFFFF',
  ind: '#4E5BA8',
  lg: '#098371',
  or: '#D83C31',
  dg: '#36383D',
  mg: '#A6A6A6',
  ltg: '#CFCFCF',
  bg: '#F7F7F5',
  sf: '#FFFFFF',
  bd: '#E5E5E0',
  bl: '#EEEEEA',
};

export const FONTS = {
  body: "'Barlow', Arial, sans-serif",
  heading: "'Barlow Condensed', Arial, sans-serif",
};

export const SENSITIVITIES = ['Low', 'Medium', 'High', 'Very High'];

export const SENSITIVITY_COLORS = {
  Low: COLORS.lg,
  Medium: COLORS.ind,
  High: COLORS.or,
  'Very High': COLORS.or,
};

export const SCENARIO_TYPES = [
  'Baseline',
  'Option A',
  'Option B',
  'GMP Target',
  'VE Option',
];
