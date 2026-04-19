import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseServer.js';
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

    const {
      projectName = 'Project',
      buildingType = '',
      city = '',
      state = '',
      deliveryMethod = '',
      grossSf,
      targetBudget,
    } = req.body || {};

    const client = new Anthropic({ apiKey });

    const prompt = `You are a senior construction cost estimator preparing bid documents for a ${buildingType || 'construction'} project.

PROJECT: ${projectName}
Location: ${[city, state].filter(Boolean).join(', ') || 'Unknown'}
Building Type: ${buildingType || 'Not specified'}
Delivery Method: ${deliveryMethod || 'Not specified'}
${grossSf ? `Gross SF: ${Number(grossSf).toLocaleString()} SF` : ''}
${targetBudget ? `Target Budget: $${Math.round(targetBudget).toLocaleString()}` : ''}

Generate a professional set of exclusions, qualifications, and clarifications appropriate for this estimate.

Exclusions: Items explicitly NOT included in the scope of this estimate (typically 8-12 items).
Qualifications: Conditions and assumptions this estimate is based on (typically 8-12 items).
Clarifications: Additional scope notes and explanations (typically 5-8 items).

Each item should be a single, clear, professional sentence.

Respond ONLY with a valid JSON object — no markdown fences, no preamble:
{
  "exclusions": ["<item>", ...],
  "qualifications": ["<item>", ...],
  "clarifications": ["<item>", ...]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const { data: parsed, error: parseErr } = safeParseJSON(raw);

    if (parseErr || !parsed) {
      console.error('[generate-scope-notes] Parse error:', parseErr, 'Raw:', raw.slice(0, 300));
      return res.status(500).json({ error: 'Failed to parse AI response', raw: raw.slice(0, 500) });
    }

    const exclusions     = Array.isArray(parsed.exclusions)     ? parsed.exclusions     : [];
    const qualifications = Array.isArray(parsed.qualifications) ? parsed.qualifications : [];
    const clarifications = Array.isArray(parsed.clarifications) ? parsed.clarifications : [];

    console.log(`[generate-scope-notes] ${user.id}: ${exclusions.length} excl, ${qualifications.length} qual, ${clarifications.length} clar`);

    return res.status(200).json({ exclusions, qualifications, clarifications });

  } catch (err) {
    Sentry.captureException(err);
    console.error('[generate-scope-notes] Error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
