import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../lib/supabaseServer.js';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 60 };

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

    const { trade, items = [], projectName = 'Project', scenarioName = 'Baseline', scenarioId } = req.body;
    if (!trade) return res.status(400).json({ error: 'trade is required' });

    const totalMid = items.reduce((sum, i) => sum + itemMid(i), 0);

    const itemLines = items.map(i => {
      const mid = Math.round(itemMid(i));
      return `  • ${i.description} | ${i.qtyMin || 1}–${i.qtyMax || 1} ${i.unit || 'LS'} @ $${Number(i.unitCostMid || 0).toLocaleString()}/unit = $${mid.toLocaleString()}`;
    }).join('\n');

    const client = new Anthropic({ apiKey });

    const prompt = `You are a senior construction project manager writing a formal scope of work for a subcontractor bid package. Project is public civic construction in Southern California with prevailing wage requirements.

PROJECT: ${projectName} — ${scenarioName}
TRADE PACKAGE: ${trade}
TOTAL BUDGET (MID): $${Math.round(totalMid).toLocaleString()}

LINE ITEMS IN THIS PACKAGE:
${itemLines}

Write a comprehensive, professional scope of work that a general contractor would issue with a bid invitation. Respond ONLY with a JSON object — no markdown fences, no preamble:
{
  "title": "<trade> Scope of Work",
  "summary": "<2-3 sentences describing the overall scope>",
  "inclusions": ["<specific item or task explicitly included in this bid>"],
  "exclusions": ["<item explicitly NOT in this subcontractor's scope>"],
  "qualifications": ["<assumption or qualification that affects pricing>"],
  "schedule": "<key milestones and estimated duration>",
  "insuranceBonding": "<minimum insurance limits and bonding requirements>",
  "submittals": ["<required submittal item>"],
  "inspections": ["<required inspection or test>"]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const { data: scope, error: parseErr } = safeParseJSON(rawText);
    if (parseErr) {
      console.error('[generate-scope] Parse error:', parseErr, 'Raw:', rawText.slice(0, 300));
      return res.status(502).json({ error: 'Failed to parse AI response', raw: rawText.slice(0, 200) });
    }

    // Persist to trade_scopes if scenarioId provided
    if (scenarioId && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
        await admin.from('trade_scopes').upsert(
          { scenario_id: scenarioId, trade, scope_json: scope, updated_at: new Date().toISOString() },
          { onConflict: 'scenario_id,trade' },
        );
      } catch (dbErr) {
        console.error('[generate-scope] DB save error:', dbErr?.message);
      }
    }

    console.log(`[generate-scope] ${user.id}: trade=${trade}, items=${items.length}`);
    return res.status(200).json({ scope });

  } catch (err) {
    Sentry.captureException(err);
    console.error('[generate-scope] Error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
