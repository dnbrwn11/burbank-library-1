import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseServer.js';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 60 };

function stripFences(text) {
  return text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing authorization token' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

    const { veItem, affectedLines = [], allItems = [], project = {} } = req.body || {};
    if (!veItem?.title) return res.status(400).json({ error: 'veItem required' });

    const client = new Anthropic({ apiKey });

    const affectedSummary = affectedLines.map(l =>
      `  - ${l.description || 'Line item'}: current $${Math.round(l.current_cost).toLocaleString()} → proposed $${Math.round(l.proposed_cost).toLocaleString()} (delta ${l.delta >= 0 ? '+' : ''}$${Math.round(l.delta).toLocaleString()})`
    ).join('\n');

    const allItemsSummary = allItems.slice(0, 80).map(i =>
      `${i.category}|${i.subcategory || ''}|${i.description}|$${Math.round(((i.qtyMin + i.qtyMax) / 2) * (i.unitCostMid || 0)).toLocaleString()}`
    ).join('\n');

    const prompt = `You are a senior construction cost estimator performing cross-trade impact analysis.

PROJECT: ${project.name || 'Unknown'} — ${project.city || ''}, ${project.state || ''}
Building type: ${project.building_type || 'Not specified'}

VALUE ENGINEERING ITEM: "${veItem.title}"
Description: ${veItem.description || 'No description provided'}
Category: ${veItem.category}
Direct cost impact: $${Math.round(veItem.cost_impact || 0).toLocaleString()}

DIRECTLY AFFECTED LINE ITEMS:
${affectedSummary || '  (none specified)'}

FULL ESTIMATE CONTEXT (category|subcategory|description|mid cost):
${allItemsSummary}

Analyze what OTHER line items will be indirectly affected by this VE change. Think about ripple effects across trades (e.g., if curtain wall changes, structural connections, HVAC sizing, waterproofing may change).

Return ONLY a valid JSON object — no markdown, no backticks:
{
  "cross_trade_impacts": [
    {
      "trade": "category name",
      "description": "which line item and why it is affected",
      "estimated_delta": <number, negative = savings>,
      "confidence": "low" | "medium" | "high"
    }
  ],
  "net_adjusted_savings": <total delta including cross-trade impacts, negative = savings>,
  "summary": "<one sentence summarizing the cross-trade impact>",
  "risks": ["<risk 1>", "<risk 2>"]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let parsed;
    try {
      parsed = JSON.parse(stripFences(raw));
    } catch (e) {
      console.error('[ve-impact] JSON parse error:', e.message, 'Raw:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Failed to parse AI response', raw: raw.slice(0, 500) });
    }

    console.log(`[ve-impact] ${user.id}: ${parsed.cross_trade_impacts?.length || 0} cross-trade impacts`);
    return res.status(200).json(parsed);

  } catch (err) {
    Sentry.captureException(err);
    console.error('[ve-impact] Error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
