import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseServer.js';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 90 };

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

    const { items = [], project = {} } = req.body || {};
    if (!items.length) return res.status(400).json({ error: 'items required' });

    const client = new Anthropic({ apiKey });

    const totalMid = items.reduce((s, i) => {
      return s + (((i.qtyMin + i.qtyMax) / 2) * (i.unitCostMid || 0));
    }, 0);

    const itemSummary = items.map(i => {
      const mid = ((i.qtyMin + i.qtyMax) / 2) * (i.unitCostMid || 0);
      return `${i.category}|${i.subcategory || ''}|${i.description}|$${Math.round(mid).toLocaleString()}|${i.unit}|qty:${i.qtyMin}-${i.qtyMax}|unit$:${i.unitCostMid}`;
    }).join('\n');

    const prompt = `You are a senior preconstruction estimator and VE specialist with expertise in ${project.building_type || 'construction'} projects.

PROJECT: ${project.name || 'Unknown'} — ${project.city || ''}, ${project.state || ''}
Building type: ${project.building_type || 'Not specified'}
Scope: ${project.scope_type === 'renovation' ? 'Renovation / TI' : 'New Construction'}
Total Mid Estimate: $${Math.round(totalMid).toLocaleString()}
${project.target_budget ? `Target Budget: $${Math.round(project.target_budget).toLocaleString()}` : ''}

ESTIMATE LINE ITEMS (category|subcategory|description|mid_cost|unit|qty_range|unit_cost):
${itemSummary}

Generate 5-10 ranked VE suggestions for this project. Focus on high-impact, realistic savings that are appropriate for this building type and scope. Rank by estimated savings (largest first).

Return ONLY a valid JSON array — no markdown, no backticks:
[
  {
    "title": "<concise VE title, max 8 words>",
    "description": "<1-2 sentence description of the VE strategy and rationale>",
    "category": "<one of: Material Substitution | System Redesign | Scope Reduction | Constructability | Schedule Optimization | Design Simplification>",
    "estimated_savings": <positive number in dollars>,
    "risk_level": "low" | "medium" | "high",
    "affected_items": ["<line item description 1>", "<line item description 2>"],
    "notes": "<any caveats or conditions>"
  }
]`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let parsed;
    try {
      parsed = JSON.parse(stripFences(raw));
      if (!Array.isArray(parsed)) throw new Error('Expected array');
    } catch (e) {
      console.error('[ve-suggestions] JSON parse error:', e.message, 'Raw:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Failed to parse AI response', raw: raw.slice(0, 500) });
    }

    console.log(`[ve-suggestions] ${user.id}: ${parsed.length} suggestions`);
    return res.status(200).json({ suggestions: parsed });

  } catch (err) {
    Sentry.captureException(err);
    console.error('[ve-suggestions] Error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
