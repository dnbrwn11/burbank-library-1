// Vercel serverless function — calls Anthropic Claude API to generate a
// construction cost estimate. Requires ANTHROPIC_API_KEY in Vercel env vars.
export const config = { maxDuration: 300 };

// ── Regional calibration ─────────────────────────────────────────────────────

function getRegionFactor(city, state) {
  const c = (city || '').toLowerCase();
  const s = (state || '').toUpperCase();

  if (s === 'CA') {
    if (['san francisco', 'daly city', 'south san francisco'].some(k => c.includes(k))) return 1.30;
    if (['palo alto', 'mountain view', 'sunnyvale', 'san jose', 'santa clara', 'cupertino'].some(k => c.includes(k))) return 1.28;
    if (['oakland', 'berkeley', 'emeryville', 'alameda'].some(k => c.includes(k))) return 1.25;
    if (['los angeles', 'burbank', 'pasadena', 'glendale', 'culver city', 'santa monica', 'west hollywood', 'el segundo'].some(k => c.includes(k))) return 1.15;
    if (['long beach', 'torrance', 'compton', 'carson', 'hawthorne'].some(k => c.includes(k))) return 1.12;
    if (['san diego', 'chula vista', 'el cajon', 'escondido', 'la mesa'].some(k => c.includes(k))) return 1.10;
    if (['irvine', 'anaheim', 'fullerton', 'santa ana', 'garden grove', 'costa mesa', 'orange'].some(k => c.includes(k))) return 1.10;
    if (['riverside', 'ontario', 'rancho cucamonga', 'fontana', 'san bernardino', 'moreno valley'].some(k => c.includes(k))) return 1.05;
    if (['bakersfield', 'fresno', 'modesto', 'stockton', 'visalia'].some(k => c.includes(k))) return 1.02;
    if (['sacramento', 'elk grove', 'roseville', 'folsom'].some(k => c.includes(k))) return 1.05;
    return 1.08; // generic CA
  }
  if (s === 'NY') {
    if (['new york', 'manhattan', 'brooklyn', 'bronx', 'queens', 'staten island', 'jersey city', 'hoboken'].some(k => c.includes(k))) return 1.40;
    if (['white plains', 'yonkers', 'mount vernon'].some(k => c.includes(k))) return 1.25;
    return 1.15;
  }
  if (s === 'WA') {
    if (['seattle', 'bellevue', 'redmond', 'kirkland', 'renton', 'bothell'].some(k => c.includes(k))) return 1.20;
    return 1.05;
  }
  if (s === 'OR') {
    if (['portland', 'beaverton', 'hillsboro'].some(k => c.includes(k))) return 1.10;
    return 0.98;
  }
  if (s === 'TX') {
    if (['austin', 'round rock'].some(k => c.includes(k))) return 0.92;
    if (['houston', 'dallas', 'fort worth', 'arlington', 'plano', 'irving'].some(k => c.includes(k))) return 0.90;
    return 0.86;
  }
  if (s === 'FL') {
    if (['miami', 'miami beach', 'coral gables', 'brickell'].some(k => c.includes(k))) return 1.00;
    if (['orlando', 'tampa', 'st. pete', 'jacksonville'].some(k => c.includes(k))) return 0.92;
    return 0.90;
  }
  if (s === 'IL') {
    if (['chicago', 'evanston', 'oak park'].some(k => c.includes(k))) return 1.18;
    return 0.98;
  }
  if (s === 'MA') {
    if (['boston', 'cambridge', 'somerville', 'brookline'].some(k => c.includes(k))) return 1.22;
    return 1.08;
  }
  if (s === 'CO') {
    if (['denver', 'boulder', 'aurora', 'lakewood'].some(k => c.includes(k))) return 1.00;
    return 0.92;
  }
  if (['AZ', 'NV'].includes(s)) return 0.95;
  if (['CT', 'NJ'].includes(s)) return 1.10;
  if (['VA', 'MD'].includes(s)) {
    if (['arlington', 'bethesda', 'chevy chase', 'tysons'].some(k => c.includes(k))) return 1.12;
    return 1.00;
  }
  if (['GA'].includes(s)) {
    if (['atlanta', 'buckhead', 'midtown'].some(k => c.includes(k))) return 0.98;
    return 0.88;
  }
  return 0.90; // national default
}

const STATE_TAX = {
  CA: 0.0975, TX: 0.0825, FL: 0.07, NY: 0.08875, WA: 0.1025,
  IL: 0.1025, PA: 0.06, OH: 0.0725, GA: 0.07, AZ: 0.086,
  CO: 0.029, NV: 0.0685, OR: 0, MT: 0, NH: 0, DE: 0,
  NJ: 0.06625, MA: 0.0625, CT: 0.0635, MI: 0.06, VA: 0.053, MD: 0.06,
};

function getLaborBurden(laborType) {
  const lt = (laborType || '').toLowerCase();
  if (lt.includes('open shop')) return 0.32;
  if (lt.includes('mixed')) return 0.38;
  return 0.42; // prevailing wage or union
}

function getLaborContext(laborType, state) {
  const lt = (laborType || '').toLowerCase();
  const inCA = (state || '').toUpperCase() === 'CA';
  if (lt.includes('prevailing')) {
    return `All labor at ${inCA ? 'California DIR' : 'federal/state'} prevailing wage rates. Representative all-in rates (labor + burden): Carpenter $${inCA ? '95-115' : '75-95'}/hr, Laborer $${inCA ? '70-85' : '55-70'}/hr, Iron Worker $${inCA ? '110-125' : '85-105'}/hr, MEP trades $${inCA ? '100-130' : '80-110'}/hr. Labor burden is 42% of base wage.`;
  }
  if (lt.includes('union')) {
    return `All trades under collective bargaining agreements. Rates similar to prevailing wage in this market. Labor burden 42%.`;
  }
  if (lt.includes('open shop') || lt.includes('open')) {
    return `Merit shop / open shop labor. All-in labor rates approximately 20-30% below prevailing wage. Competitive bidding on subcontracts. Labor burden 32%.`;
  }
  return `Mixed labor market. Union trades for structural, MEP, and heavy scope; open shop for finishes and specialty. Average burden 38%.`;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(description, project) {
  const { name, city, state, building_type, delivery_method, labor_type, gross_sf, target_budget } = project;
  const regionFactor = getRegionFactor(city, state);
  const tax = STATE_TAX[(state || '').toUpperCase()] ?? 0.07;
  const laborBurden = getLaborBurden(labor_type);
  const laborContext = getLaborContext(labor_type, state);
  const sfStr = gross_sf ? `${Number(gross_sf).toLocaleString()} SF` : 'size TBD';
  const budgetStr = target_budget
    ? `$${(target_budget / 1e6).toFixed(1)}M` : 'not specified';

  return `You are a senior preconstruction cost estimator at a major general contractor. You are generating a detailed construction cost estimate. Respond with ONLY valid JSON — no markdown, no explanation, no text outside the JSON.

PROJECT:
Name: ${name || 'New Project'}
Location: ${city || 'Unknown'}, ${state || 'Unknown'}
Building Type: ${building_type || 'Not specified'}
Delivery Method: ${delivery_method || 'Not specified'}
Labor: ${labor_type || 'Prevailing Wage'} (${(laborBurden * 100).toFixed(0)}% burden)
Size: ${sfStr}
Target Budget: ${budgetStr}

DESCRIPTION:
${description}

MARKET CONTEXT — ${city}, ${state} (2025-2026):
${laborContext}
Regional cost factor: ${regionFactor.toFixed(2)}x vs national baseline
State/local sales tax: ${(tax * 100).toFixed(2)}%
Unit costs = installed cost (labor + material + equipment). Do NOT include GC markup, fee, contingency, or tax in unit costs — those are applied via globals.

REQUIRED JSON STRUCTURE:
{
  "globals": {
    "escalation": <decimal 0.03-0.06 — escalation to construction midpoint>,
    "laborBurden": ${laborBurden},
    "tax": ${tax},
    "insurance": 0.012,
    "contingency": <decimal 0.05-0.15 based on project type, complexity, and design stage>,
    "fee": 0.045,
    "regionFactor": ${regionFactor},
    "bond": 0.008,
    "generalConditions": <decimal 0.06-0.12 based on project complexity>,
    "buildingSF": ${gross_sf || 0},
    "parkingStalls": <integer — estimate based on building type and SF, or 0>,
    "openSpaceSF": <integer — estimate site open space SF, or 0>
  },
  "items": [
    {
      "category": "A - Substructure",
      "subcategory": "Foundations",
      "description": "Spread footings & grade beams",
      "qty_min": 50000,
      "qty_max": 50000,
      "unit": "SF",
      "unit_cost_low": 16,
      "unit_cost_mid": 22,
      "unit_cost_high": 30,
      "basis": "4500 psi, seismic Cat D",
      "sensitivity": "High",
      "notes": "Geotech pending",
      "sort_order": 0
    }
  ]
}

CATEGORIES — use exactly these strings, in this order, only include those applicable:
"A - Substructure" — foundations, slab on grade, site excavation & shoring
"B - Shell" — superstructure (frame, decking), exterior walls, roofing, windows & doors
"C - Interiors" — interior partitions, doors, finishes (flooring, ceilings, paint), specialties
"D - Services" — HVAC, plumbing, fire protection, electrical (power, lighting), communications/AV, elevators
"E - Equipment & Furnishings" — fixed equipment, casework, FF&E if included in construction contract
"F - Special Construction" — seismic isolation, blast resistance, clean rooms, special pools, hazmat
"G - Sitework" — site clearing, paving & hardscape, site utilities, landscaping, site lighting, signage
"General Conditions" — project management staff, temp facilities, equipment, site safety, bonds/insurance
"Owner Soft Costs" — A/E design fees, permits & fees, testing & inspection, commissioning, owner contingency

GUIDELINES:
- Generate 40–60 line items covering all applicable categories.
- qty_min/qty_max: same value if fixed; range if scope-variable.
- unit_cost_low/mid/high: Low ≈ −20% of mid, High ≈ +20% of mid.
- sensitivity: "Low" | "Medium" | "High" | "Very High"
- basis: ≤50 chars. notes: brief context or null. sort_order: 0-indexed per category.
- Calibrate quantities to ${sfStr}.
- Include seismic allowances if in CA, WA, or AK.
- Keep response compact. Use short descriptions. No extra whitespace.

Respond ONLY with the JSON object. Start with { and end with }.`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

function repairTruncatedJSON(text) {
  // Find the last complete object before truncation by walking back from the end
  // looking for a closing } that balances an opening {
  let s = text;

  // Remove trailing incomplete object: find last '}' and cut there
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace === -1) throw new Error('No closing brace found');
  s = s.slice(0, lastBrace + 1);

  // Count unclosed brackets/braces to determine what needs closing
  let braces = 0, brackets = 0;
  let inString = false, escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  // Close any unclosed arrays then objects
  s += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces));
  return JSON.parse(s);
}

function extractJSON(text, stopReason) {
  // Strip markdown fences if Claude adds them despite instructions
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  try {
    return JSON.parse(stripped);
  } catch {
    // If truncated due to max_tokens, attempt repair before giving up
    if (stopReason === 'max_tokens') {
      console.warn('[generate] Response truncated (max_tokens) — attempting JSON repair');
      try {
        return repairTruncatedJSON(stripped);
      } catch (repairErr) {
        console.error('[generate] JSON repair failed:', repairErr.message);
      }
    }
    // Last resort: find the outermost { ... } and try repairing that
    const match = stripped.match(/\{[\s\S]*/);
    if (match) {
      try { return repairTruncatedJSON(match[0]); } catch {}
    }
    throw new Error('No valid JSON found in Claude response');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  let description, project;
  try {
    ({ description, project } = req.body);
    if (!description?.trim()) throw new Error('description is required');
    if (!project) throw new Error('project is required');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const prompt = buildPrompt(description.trim(), project);

  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    system: 'Output valid JSON only. No markdown, no explanation. Start with { and end with }.',
    messages: [{ role: 'user', content: prompt }],
  };
  console.log('[generate] Sending request to Anthropic:', {
    url: 'https://api.anthropic.com/v1/messages',
    model: requestBody.model,
    max_tokens: requestBody.max_tokens,
    promptLength: prompt.length,
  });

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkErr) {
    console.error('[generate] Network error calling Anthropic:', networkErr.message);
    return res.status(502).json({ error: `Network error calling Claude: ${networkErr.message}` });
  }

  console.log('[generate] Anthropic response status:', anthropicRes.status, anthropicRes.statusText);

  const rawBody = await anthropicRes.text().catch(() => '');
  console.log('[generate] Anthropic raw response body:', rawBody.slice(0, 1000));

  if (!anthropicRes.ok) {
    let detail = rawBody;
    try { detail = JSON.parse(rawBody)?.error?.message || rawBody; } catch {}
    console.error('[generate] Anthropic error response:', anthropicRes.status, detail);
    return res.status(502).json({
      error: `Claude API returned ${anthropicRes.status}: ${detail.slice(0, 300)}`,
    });
  }

  let anthropicData;
  try {
    anthropicData = JSON.parse(rawBody);
  } catch (parseErr) {
    console.error('[generate] Failed to parse Anthropic response as JSON:', parseErr.message);
    return res.status(502).json({
      error: `Anthropic returned non-JSON response: ${rawBody.slice(0, 300)}`,
    });
  }

  const rawText = anthropicData.content?.[0]?.text;
  const stopReason = anthropicData.stop_reason;

  console.log('[generate] stop_reason:', stopReason);
  if (stopReason === 'max_tokens') {
    console.warn('[generate] Response hit max_tokens limit — JSON may be truncated, will attempt repair');
  }

  if (!rawText) {
    console.error('[generate] No text content in Anthropic response:', JSON.stringify(anthropicData).slice(0, 300));
    return res.status(502).json({ error: 'Empty response from Claude API', detail: JSON.stringify(anthropicData).slice(0, 300) });
  }

  let parsed;
  try {
    parsed = extractJSON(rawText, stopReason);
  } catch (parseErr) {
    return res.status(502).json({
      error: `Could not parse JSON from Claude: ${parseErr.message}`,
      raw: rawText.slice(0, 600),
    });
  }

  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    return res.status(502).json({
      error: 'Claude did not return any line items',
      raw: rawText.slice(0, 600),
    });
  }

  // Ensure every item has required defaults
  parsed.items = parsed.items.map((item, idx) => ({
    category: 'General Conditions',
    subcategory: '',
    description: '',
    qty_min: 0,
    qty_max: 0,
    unit: 'LS',
    unit_cost_low: 0,
    unit_cost_mid: 0,
    unit_cost_high: 0,
    basis: null,
    sensitivity: 'Medium',
    notes: null,
    ...item,
    in_summary: true,
    is_archived: false,
    sort_order: idx,
  }));

  return res.status(200).json(parsed);
}
