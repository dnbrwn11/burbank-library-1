import * as XLSX from 'xlsx';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 30 };

const $n = v => Number(v || 0);
const $r = v => Math.round($n(v));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items = [], globals = {}, projectName = 'Estimate', scenarioName = 'Baseline' } = req.body;

    const active = items.filter(i => !i.isArchived && i.inSummary !== false);

    // ── Sheet 1: Estimate ─────────────────────────────────────────────────────
    const estimateAoa = [[
      'Category', 'Subcategory', 'Description',
      'Qty Min', 'Qty Max', 'Unit',
      '$/Low', '$/Mid', '$/High',
      'Total Low', 'Total Mid', 'Total High',
      'Sensitivity', 'Allowance',
    ]];
    for (const i of active) {
      const qAvg = ($n(i.qtyMin) + $n(i.qtyMax)) / 2;
      estimateAoa.push([
        i.category || '', i.subcategory || '', i.description || '',
        $n(i.qtyMin), $n(i.qtyMax), i.unit || '',
        $n(i.unitCostLow), $n(i.unitCostMid), $n(i.unitCostHigh),
        $r($n(i.qtyMin) * $n(i.unitCostLow)),
        $r(qAvg * $n(i.unitCostMid)),
        $r($n(i.qtyMax) * $n(i.unitCostHigh)),
        i.sensitivity || '', i.isAllowance ? 'Yes' : 'No',
      ]);
    }
    const wsEstimate = XLSX.utils.aoa_to_sheet(estimateAoa);
    wsEstimate['!cols'] = [
      { wch: 18 }, { wch: 16 }, { wch: 35 },
      { wch: 8 }, { wch: 8 }, { wch: 7 },
      { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 },
    ];

    // ── Sheet 2: Summary ──────────────────────────────────────────────────────
    const catMap = {};
    for (const i of active) {
      const c = i.category || 'Uncategorized';
      if (!catMap[c]) catMap[c] = { l: 0, m: 0, h: 0 };
      const qAvg = ($n(i.qtyMin) + $n(i.qtyMax)) / 2;
      catMap[c].l += $n(i.qtyMin) * $n(i.unitCostLow);
      catMap[c].m += qAvg * $n(i.unitCostMid);
      catMap[c].h += $n(i.qtyMax) * $n(i.unitCostHigh);
    }
    const summaryAoa = [['Category', 'Total Low', 'Total Mid', 'Total High']];
    let totL = 0, totM = 0, totH = 0;
    for (const [c, t] of Object.entries(catMap)) {
      summaryAoa.push([c, $r(t.l), $r(t.m), $r(t.h)]);
      totL += t.l; totM += t.m; totH += t.h;
    }
    summaryAoa.push(['', '', '', '']);
    summaryAoa.push(['SUBTOTAL (Raw)', $r(totL), $r(totM), $r(totH)]);
    const g = globals;
    const factor = (1 + $n(g.escalation)) * ($n(g.regionFactor) || 1);
    const co = totM * factor * $n(g.contingency);
    const gc = (totM * factor + co) * $n(g.generalConditions);
    const fe = (totM * factor + co + gc) * $n(g.fee);
    const ins = (totM * factor + co + gc + fe) * ($n(g.insurance) + $n(g.bond));
    const tx = totM * factor * 0.45 * $n(g.tax);
    summaryAoa.push(['TOTAL (Loaded Mid)', '', '', $r(totM * factor + co + gc + fe + ins + tx)]);
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

    // ── Sheet 3: Globals ──────────────────────────────────────────────────────
    const pct = v => `${($n(v) * 100).toFixed(1)}%`;
    const globalsAoa = [
      ['Parameter', 'Value', 'Display'],
      ['Escalation', $n(g.escalation), pct(g.escalation)],
      ['Labor Burden', $n(g.laborBurden), pct(g.laborBurden)],
      ['Sales Tax', $n(g.tax), pct(g.tax)],
      ['Insurance', $n(g.insurance), pct(g.insurance)],
      ['Contingency', $n(g.contingency), pct(g.contingency)],
      ['GC Fee', $n(g.fee), pct(g.fee)],
      ['Region Factor', $n(g.regionFactor), `${$n(g.regionFactor)}×`],
      ['Bond', $n(g.bond), pct(g.bond)],
      ['General Conditions', $n(g.generalConditions), pct(g.generalConditions)],
      ['Building SF', $n(g.buildingSF), `${$n(g.buildingSF).toLocaleString('en-US')} SF`],
      ['Parking Stalls', $n(g.parkingStalls), `${$n(g.parkingStalls)} stalls`],
      ['Open Space SF', $n(g.openSpaceSF), `${$n(g.openSpaceSF).toLocaleString('en-US')} SF`],
      ...(g.designPhase ? [['Design Phase', g.designPhase, g.designPhase]] : []),
    ];
    const wsGlobals = XLSX.utils.aoa_to_sheet(globalsAoa);
    wsGlobals['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 18 }];

    // ── Assemble workbook ─────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsEstimate, 'Estimate');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsGlobals, 'Globals');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeName = `${projectName}_${scenarioName}`.replace(/[^a-z0-9_-]/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
    return res.send(buf);
  } catch (err) {
    Sentry.captureException(err);
    console.error('[export-excel]', err?.message);
    return res.status(500).json({ error: err?.message || 'Export failed' });
  }
}
