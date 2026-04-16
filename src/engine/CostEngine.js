/**
 * CostEngine — Centralized calculation logic for 3-point estimates.
 *
 * All formulas are pure functions: (data) → number.
 * No side effects, no state, no UI concerns.
 *
 * To modify how costs are calculated, edit ONLY this file.
 */

function N(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Average of qty range: (min + max) / 2 */
export function qtyAvg(item) {
  const a = N(item.qtyMin), b = N(item.qtyMax);
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/** Low total = qtyMin × unitCostLow */
export function lowTotal(item) {
  const q = N(item.qtyMin), u = N(item.unitCostLow);
  return (q != null && u != null) ? q * u : null;
}

/** Mid total = qtyAvg × unitCostMid */
export function midTotal(item) {
  const q = qtyAvg(item), u = N(item.unitCostMid);
  return (q != null && u != null) ? q * u : null;
}

/** High total = qtyMax × unitCostHigh */
export function highTotal(item) {
  const q = N(item.qtyMax), u = N(item.unitCostHigh);
  return (q != null && u != null) ? q * u : null;
}

/**
 * Apply project-level markups to a base cost.
 * Order: escalation → contingency → GC → fee → insurance/bond → tax
 */
export function applyMarkups(base, globals) {
  const co = base * (N(globals.contingency) || 0);
  const gc = (base + co) * (N(globals.generalConditions) || 0);
  const fe = (base + co + gc) * (N(globals.fee) || 0);
  const ins = (base + co + gc + fe) * ((N(globals.insurance) || 0) + (N(globals.bond) || 0));
  // Tax on ~45% of base (materials + equipment portion)
  const tx = base * 0.45 * (N(globals.tax) || 0);
  return { sub: base, co, gc, fe, ins, tx, tot: base + co + gc + fe + ins + tx };
}

/**
 * Full project calculation across all active line items.
 * Returns { raw: {l,m,h}, full: {l,m,h} } where each level
 * includes the full markup breakdown.
 */
export function projectTotals(items, globals) {
  let lR = 0, mR = 0, hR = 0;
  items.filter(i => !i.isArchived && i.inSummary).forEach(i => {
    lR += lowTotal(i) || 0;
    mR += midTotal(i) || 0;
    hR += highTotal(i) || 0;
  });

  const factor = (1 + (N(globals.escalation) || 0)) * (N(globals.regionFactor) || 1);

  return {
    raw: { l: lR, m: mR, h: hR },
    full: {
      l: applyMarkups(lR * factor, globals),
      m: applyMarkups(mR * factor, globals),
      h: applyMarkups(hR * factor, globals),
    },
  };
}

/**
 * Category-level totals (raw, before markups).
 */
export function categoryTotals(items, globals, category) {
  let l = 0, m = 0, h = 0;
  items.filter(i => !i.isArchived && i.inSummary && i.category === category).forEach(i => {
    l += lowTotal(i) || 0;
    m += midTotal(i) || 0;
    h += highTotal(i) || 0;
  });
  return { l, m, h };
}

/** Shorthand accessor for the selected cost view */
export function itemTotal(item, cv) {
  return cv === 'low' ? lowTotal(item) : cv === 'mid' ? midTotal(item) : highTotal(item);
}

/** Cost view key for category totals */
export function cvKey(cv) {
  return cv === 'low' ? 'l' : cv === 'mid' ? 'm' : 'h';
}
