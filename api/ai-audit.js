import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseServer.js';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 120 };

function stripFences(text) {
  return text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

function safeParseJSON(text) {
  try {
    return { data: JSON.parse(stripFences(text)), error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

function itemMid(i) {
  const q = ((Number(i.qtyMin) || 0) + (Number(i.qtyMax) || 0)) / 2;
  return q * (Number(i.unitCostMid) || 0);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing authorization token' });
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ error: 'Server configuration error' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI service not configured: ANTHROPIC_API_KEY missing' });

    const { items = [], globals = {}, bsf = 97500, projectName = 'Project', scenarioName = 'Baseline' } = req.body;

    const active = items.filter(i => !i.isArchived && i.inSummary !== false);
    if (!active.length) return res.status(400).json({ error: 'No active line items to audit' });

    const totalMid = active.reduce((sum, i) => sum + itemMid(i), 0);
    const psfValue = bsf > 0 ? totalMid / bsf : 0;

    const catMap = {};
    active.forEach(i => { catMap[i.category] = (catMap[i.category] || 0) + itemMid(i); });
    const catBreakdown = Object.entries(catMap)
      .map(([cat, total]) => ({ cat, total, pct: totalMid > 0 ? +(total / totalMid * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.total - a.total);

    const client = new Anthropic({ apiKey });

    // ── Call 1: Project-level assessment ──────────────────────────────────────
    const projectPrompt = `You are a senior construction cost estimator with 25+ years of experience on public civic and institutional projects in California (prevailing wage, SoCal region).

PROJECT: ${projectName} — ${scenarioName}
Building area: ${Number(bsf).toLocaleString()} SF
Total estimated cost (mid): $${Math.round(totalMid).toLocaleString()}
Cost per SF: $${psfValue.toFixed(0)}/SF

CATEGORY BREAKDOWN:
${catBreakdown.map(c => `  ${c.cat}: $${Math.round(c.total).toLocaleString()} (${c.pct}% of total)`).join('\n')}

PROJECT GLOBALS:
  Contingency: ${((Number(globals.contingency) || 0) * 100).toFixed(1)}%
  GC Fee: ${((Number(globals.fee) || 0) * 100).toFixed(1)}%
  Escalation: ${((Number(globals.escalation) || 0) * 100).toFixed(1)}%

Based on current California market conditions for public civic/institutional construction (2025–2026, prevailing wage, SoCal), evaluate this estimate.

Respond ONLY with a JSON object — no markdown fences, no preamble, no trailing text:
{
  "grade": "A" or "B" or "C" or "D" or "F",
  "gradeReason": "<one sentence>",
  "psfRange": { "low": <number>, "mid": <number>, "high": <number> },
  "categoryProportions": [
    { "category": "<name>", "yours": <pct>, "typical": <pct>, "note": "<brief if significantly off, else empty string>" }
  ],
  "concerns": ["<concern>"],
  "strengths": ["<strength>"],
  "recommendation": "<2-3 sentences>"
}`;

    const projectMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: projectPrompt }],
    });
    const projectRaw = projectMsg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const { data: projectResult, error: projectParseErr } = safeParseJSON(projectRaw);
    if (projectParseErr) {
      console.error('[ai-audit] Project parse error:', projectParseErr, 'Raw:', projectRaw.slice(0, 300));
    }

    // ── Call 2: Item-level benchmarking (batches of 25) ───────────────────────
    const BATCH_SIZE = 25;
    const itemAudits = [];

    for (let i = 0; i < active.length; i += BATCH_SIZE) {
      const batch = active.slice(i, i + BATCH_SIZE);
      const batchSummary = batch.map(it => ({
        id: it.id,
        description: it.description,
        category: it.category || '',
        unit: it.unit || 'LS',
        unitCostMid: Number(it.unitCostMid) || 0,
        totalMid: Math.round(itemMid(it)),
      }));

      const batchPrompt = `You are a senior construction cost estimator reviewing line items for a public civic building in Southern California (prevailing wage, 2025–2026 pricing).

For each item, evaluate whether the unit cost ($/unit) is reasonable for current market conditions.

Return ONLY a JSON array — no markdown fences, no preamble:
[{ "id": "<id>", "status": "ok" or "caution" or "flagged", "message": "<brief note if caution/flagged, empty string if ok>" }]

Thresholds:
- "ok": unit cost within 15% of typical market range for this scope
- "caution": unit cost 15–30% outside typical range
- "flagged": unit cost >30% outside typical range, obviously zero for real scope, or clearly wrong unit

ITEMS:
${JSON.stringify(batchSummary, null, 2)}`;

      const batchMsg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: batchPrompt }],
      });
      const batchRaw = batchMsg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const { data: batchResult, error: batchParseErr } = safeParseJSON(batchRaw);
      if (batchParseErr) {
        console.error('[ai-audit] Batch parse error:', batchParseErr, 'Raw:', batchRaw.slice(0, 300));
        batch.forEach(it => itemAudits.push({ id: it.id, status: 'ok', message: '' }));
      } else if (Array.isArray(batchResult)) {
        itemAudits.push(...batchResult);
      }
    }

    const inRange = itemAudits.filter(a => a.status === 'ok').length;
    const caution = itemAudits.filter(a => a.status === 'caution').length;
    const flagged  = itemAudits.filter(a => a.status === 'flagged').length;

    console.log(`[ai-audit] ${user.id}: ${active.length} items, grade=${projectResult?.grade}, flagged=${flagged}`);

    return res.status(200).json({
      grade:               projectResult?.grade       || 'C',
      gradeReason:         projectResult?.gradeReason || '',
      psf:                 psfValue,
      psfRange:            projectResult?.psfRange    || { low: 300, mid: 500, high: 750 },
      categoryProportions: projectResult?.categoryProportions || catBreakdown.map(c => ({ category: c.cat, yours: c.pct, typical: 0, note: '' })),
      concerns:            projectResult?.concerns     || [],
      strengths:           projectResult?.strengths    || [],
      recommendation:      projectResult?.recommendation || '',
      itemAudits,
      summary: { total: active.length, inRange, caution, flagged },
    });

  } catch (err) {
    Sentry.captureException(err);
    console.error('[ai-audit] Error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
