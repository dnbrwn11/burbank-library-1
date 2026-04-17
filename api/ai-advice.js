import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[ai-advice] Missing Supabase env vars — SUPABASE_URL:', !!SUPABASE_URL, 'ANON_KEY:', !!SUPABASE_ANON_KEY);
      return res.status(500).json({ error: 'Server configuration error: Supabase env vars missing' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // ── Anthropic API key ─────────────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[ai-advice] ANTHROPIC_API_KEY is not set');
      return res.status(500).json({ error: 'AI service is not configured: ANTHROPIC_API_KEY missing' });
    }

    // ── Validate input ────────────────────────────────────────────────────────
    const { item } = req.body;
    if (!item || !item.description) {
      return res.status(400).json({ error: 'item.description is required' });
    }

    // ── Call Claude ───────────────────────────────────────────────────────────
    const client = new Anthropic({ apiKey });

    const prompt = `You are a senior construction cost estimator with 25 years of experience across commercial, civic, and institutional projects. You specialize in public works and prevailing wage projects.

ESTIMATE THIS LINE ITEM:
- Description: ${item.description}
- Category: ${item.category || 'Unknown'}
- Subcategory: ${item.subcategory || 'Unknown'}
- Unit of measure: ${item.unit || 'LS'}
- Current estimate range: $${item.unitCostLow ?? '?'} / $${item.unitCostMid ?? '?'} / $${item.unitCostHigh ?? '?'} per ${item.unit || 'LS'}
${item.basis ? `- Estimator's note: ${item.basis}` : ''}
${item.notes ? `- Additional context: ${item.notes}` : ''}

Provide your independent cost opinion based on current US market conditions. Respond ONLY with a JSON object — no markdown fences, no preamble, no trailing text:
{
  "low": <number>,
  "mid": <number>,
  "high": <number>,
  "confidence": "low" or "medium" or "high",
  "reasoning": "<2-3 sentences on what drives this cost in current market conditions>",
  "risk_up": "<one key factor that could push cost higher>",
  "risk_down": "<one key factor that could bring cost lower>",
  "market_note": "<brief note on current market conditions for this trade/item>"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    let advice;
    try {
      advice = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch (parseErr) {
      console.error('[ai-advice] JSON parse failed. Raw:', rawText.slice(0, 300));
      return res.status(502).json({
        error: 'Failed to parse AI response',
        raw: rawText.slice(0, 200),
      });
    }

    console.log('[ai-advice] Success for user', user.id, '— item:', item.description);
    return res.status(200).json(advice);

  } catch (err) {
    console.error('[ai-advice] Unexpected error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
