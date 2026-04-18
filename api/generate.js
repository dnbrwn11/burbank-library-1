import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  try {
    const { description, project } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Project description is required.' });
    }

    const projectContext = project
      ? `Project Details:
- Building Type: ${project.building_type || 'Not specified'}
- Location: ${project.city || ''}, ${project.state || 'CA'}
- Gross SF: ${project.gross_sf ? project.gross_sf.toLocaleString() : 'Not specified'}
- Labor Type: ${project.labor_type || 'Not specified'}
- Delivery Method: ${project.delivery_method || 'Not specified'}
- Target Budget: ${project.target_budget ? '$' + Number(project.target_budget).toLocaleString() : 'Not specified'}`
      : '';

    const systemPrompt = `You are a senior preconstruction estimator. Generate a construction cost estimate as a JSON array.

CRITICAL RULES:
1. Respond with ONLY a valid JSON array. No markdown, no backticks, no explanation.
2. Generate exactly 35-45 line items. Do NOT exceed 45 items.
3. Keep descriptions SHORT — max 6 words each.
4. Use CSI UniFormat categories: Substructure, Shell, Interiors, Services, Equipment, Special Construction, Sitework, General Conditions, Overhead & Fee, Contingency.
5. Calibrate costs to the location, labor type, and current 2025-2026 market rates.

Each item in the array must have exactly these fields:
{
  "category": "CSI category name",
  "subcategory": "specific system",
  "description": "short name max 6 words",
  "qty_min": number,
  "qty_max": number,
  "unit": "SF|LF|EA|LS|TON|CY|SQ",
  "unit_cost_low": number,
  "unit_cost_mid": number,
  "unit_cost_high": number,
  "basis": "how quantity was derived",
  "sensitivity": "Low|Medium|High|Very High",
  "notes": ""
}

Start your response with [ and end with ]. Nothing else.`;

    const userPrompt = `Generate a construction cost estimate for:

${description}

${projectContext}

Remember: JSON array ONLY. 35-45 items. Short descriptions. Start with [ end with ].`;

    console.log('[generate] Calling Anthropic API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16384,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[generate] Anthropic error:', response.status, errorBody);
      return res.status(502).json({
        error: `Claude API returned ${response.status}: ${errorBody.substring(0, 200)}`,
      });
    }

    const data = await response.json();
    console.log('[generate] Response received. Stop reason:', data.stop_reason);

    // Extract text from response
    const rawText = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Clean up the response — remove markdown fences if present
    let jsonText = rawText.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
    jsonText = jsonText.trim();

    // Try to parse the JSON
    let lineItems;
    try {
      lineItems = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('[generate] JSON parse failed, attempting repair...');
      console.warn('[generate] Parse error:', parseError.message);

      // Repair truncated JSON
      lineItems = repairTruncatedJSON(jsonText);

      if (!lineItems) {
        console.error('[generate] JSON repair failed. Raw response length:', rawText.length);
        console.error('[generate] Last 200 chars:', rawText.slice(-200));
        return res.status(502).json({
          error: `Could not parse JSON from Claude: ${parseError.message}`,
        });
      }
    }

    // Validate it's an array
    if (!Array.isArray(lineItems)) {
      // Maybe it's wrapped in an object
      if (lineItems.line_items) lineItems = lineItems.line_items;
      else if (lineItems.items) lineItems = lineItems.items;
      else if (lineItems.data) lineItems = lineItems.data;
      else {
        return res.status(502).json({ error: 'Response was not an array of line items.' });
      }
    }

    // Add sort_order
    lineItems = lineItems.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    console.log(`[generate] Successfully generated ${lineItems.length} line items`);

    return res.status(200).json({
      lineItems,
      globals: inferGlobals(project),
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[generate] Unexpected error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}

/**
 * Attempt to repair truncated JSON arrays.
 * When max_tokens cuts off mid-response, the JSON is incomplete.
 */
function repairTruncatedJSON(text) {
  // Find the start of the array
  const arrayStart = text.indexOf('[');
  if (arrayStart === -1) return null;
  text = text.slice(arrayStart);

  // Split by the pattern that separates objects in the array
  // Each complete object ends with }
  const objects = [];
  let depth = 0;
  let currentObj = '';
  let inString = false;
  let prevChar = '';

  for (let i = 1; i < text.length; i++) {
    const char = text[i];

    // Track string boundaries
    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') {
        if (depth === 0) currentObj = '';
        depth++;
      }
      if (char === '}') {
        depth--;
        if (depth === 0) {
          currentObj += char;
          try {
            const parsed = JSON.parse(currentObj);
            objects.push(parsed);
          } catch (e) {
            // skip malformed object
          }
          currentObj = '';
          prevChar = char;
          continue;
        }
      }
    }

    if (depth > 0) {
      currentObj += char;
    }
    prevChar = char;
  }

  if (objects.length > 0) {
    console.log('[generate] Repaired JSON: recovered ' + objects.length + ' items from truncated response');
    return objects;
  }

  return null;
}

/**
 * Infer global assumptions from project location
 */
function inferGlobals(project) {
  if (!project) return {};

  const state = (project.state || 'CA').toUpperCase();

  // Regional cost factors (California baseline = 1.15)
  const regionFactors = {
    CA: 1.15, NY: 1.25, WA: 1.1, TX: 0.9, FL: 0.92,
    IL: 1.05, CO: 1.0, AZ: 0.88, GA: 0.9, MA: 1.18,
    OR: 1.08, NV: 1.0, HI: 1.35, PA: 1.05, OH: 0.92,
  };

  // Tax rates by state
  const taxRates = {
    CA: 0.0975, NY: 0.08, WA: 0.1, TX: 0.0825, FL: 0.07,
    IL: 0.0875, CO: 0.079, AZ: 0.08, GA: 0.074, MA: 0.0625,
    OR: 0.0, NV: 0.0825, HI: 0.045, PA: 0.06, OH: 0.0725,
  };

  return {
    regionFactor: regionFactors[state] || 1.0,
    tax: taxRates[state] || 0.08,
    escalation: 0.04,
    laborBurden: project.labor_type === 'Prevailing Wage' ? 0.45 : 0.35,
    insurance: 0.012,
    contingency: 0.05,
    fee: 0.045,
    bond: 0.008,
    generalConditions: 0.08,
    buildingSF: project.gross_sf || 0,
    parkingStalls: project.parking_stalls || 0,
    openSpaceSF: 0,
  };
}
