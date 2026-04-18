import Anthropic from '@anthropic-ai/sdk';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 300 };

const BATCHES = [
  {
    index: 0,
    name: 'Substructure & Shell',
    categories: ['Substructure', 'Shell'],
    focus: 'Substructure (foundations, caissons, grade beams, slab-on-grade, below-grade waterproofing) and Shell (structural frame, metal decking, exterior walls & cladding, curtainwall & glazing, roofing system, skylights, exterior doors & entrances)',
    count: 25,
  },
  {
    index: 1,
    name: 'Interiors & Finishes',
    categories: ['Interiors'],
    focus: 'Interior partitions & framing, interior doors & hardware, interior glazed partitions, acoustic ceiling systems, flooring (carpet, tile, wood, polished concrete, epoxy), wall finishes & paint, millwork & casework, signage & wayfinding, toilet partitions & accessories, window treatments, specialty interiors',
    count: 28,
  },
  {
    index: 2,
    name: 'Mechanical, Plumbing & Fire Protection',
    categories: ['Services'],
    focus: 'Plumbing (fixtures, domestic cold/hot water, sanitary & storm drainage, natural gas), HVAC (chillers, boilers, cooling towers, AHUs, VAVs, FCUs, exhaust fans, ductwork, insulation), BAS/DDC controls, fire suppression (wet sprinkler, clean agent), fire alarm & detection',
    count: 28,
  },
  {
    index: 3,
    name: 'Electrical & Low Voltage',
    categories: ['Services'],
    focus: 'Utility service & metering, main switchgear, panelboards & distribution, branch circuit wiring, interior & exterior lighting, lighting controls & dimmers, emergency lighting & exit signs, standby generator, UPS, structured cabling & data infrastructure, telecommunications, AV & multimedia, security cameras (CCTV), access control',
    count: 25,
  },
  {
    index: 4,
    name: 'Equipment, Sitework & Soft Costs',
    categories: ['Equipment', 'Special Construction', 'Sitework', 'General Conditions', 'Overhead & Fee', 'Contingency'],
    focus: 'Equipment (specialty kitchen, lab, medical, conveying — elevators & escalators), Special Construction, Sitework (demolition, excavation & grading, underground utilities, site concrete, paving, hardscape, landscaping & irrigation, site lighting, fencing), General Conditions (supervision, temporary facilities, permits, insurance), Overhead & Fee, Contingency',
    count: 22,
  },
];

const ITEM_SCHEMA = `{
  "category": "exact category name from allowed list",
  "subcategory": "specific system or trade",
  "description": "short name max 6 words",
  "qty_min": number,
  "qty_max": number,
  "unit": "SF|LF|EA|LS|TON|CY|SQ|GAL",
  "unit_cost_low": number,
  "unit_cost_mid": number,
  "unit_cost_high": number,
  "basis": "how quantity was derived",
  "sensitivity": "Low|Medium|High|Very High",
  "notes": ""
}`;

function buildProjectContext(project) {
  if (!project) return '';
  const lines = [
    `Building Type: ${project.building_type || 'Not specified'}`,
    `Location: ${project.city || ''}, ${project.state || 'CA'}`,
    `Scope: ${project.scope || 'New Construction'}`,
    `Gross SF: ${project.gross_sf ? Number(project.gross_sf).toLocaleString() : 'Not specified'}`,
    `Stories: ${project.stories || 'Not specified'}`,
    `Labor Type: ${project.labor_type || 'Not specified'}`,
    `Delivery Method: ${project.delivery_method || 'Not specified'}`,
    `Target Budget: ${project.target_budget ? '$' + Number(project.target_budget).toLocaleString() : 'Not specified'}`,
  ];

  const optional = [
    ['Structure Type', project.structure_type],
    ['Foundation', project.foundation_type],
    ['Parking', project.parking && project.parking !== 'None'
      ? project.parking + (project.parking_stalls ? ` (${project.parking_stalls} stalls)` : '')
      : null],
    ['Site Conditions', project.site_conditions],
    ['Soil Conditions', project.soil_conditions],
    ['Exterior Envelope', project.exterior_envelope],
    ['Roofing', project.roofing],
    ['HVAC', project.hvac],
    ['Electrical Service', project.electrical_service],
    ['Fire Protection', project.fire_protection],
    ['Sustainability', project.sustainability],
    ['Elevators', project.elevators && project.elevators !== 'None'
      ? project.elevators + (project.num_elevators ? ` (${project.num_elevators})` : '')
      : null],
    ['Total Units', project.total_units],
    ['Unit Mix', project.unit_mix],
    ['Amenities', Array.isArray(project.amenities) && project.amenities.length ? project.amenities.join(', ') : null],
    ['Renovation Scope', project.reno_scope],
    ['Occupied During Construction', project.occupied],
    ['Existing Structure', project.existing_structure],
    ['Hazmat Status', project.hazmat],
  ];

  for (const [label, val] of optional) {
    if (val && val !== 'Unknown' && val !== 'None / Code Minimum') {
      lines.push(`${label}: ${val}`);
    }
  }

  return `Project Details:\n${lines.map(l => `- ${l}`).join('\n')}`;
}

function parseItems(rawText) {
  let jsonText = rawText.trim();
  if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
  if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
  if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
  jsonText = jsonText.trim();

  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) return parsed;
    return parsed.items || parsed.line_items || parsed.data || [];
  } catch {
    return repairTruncatedJSON(jsonText) || [];
  }
}

function repairTruncatedJSON(text) {
  const arrayStart = text.indexOf('[');
  if (arrayStart === -1) return null;
  text = text.slice(arrayStart);

  const objects = [];
  let depth = 0, currentObj = '', inString = false, prevChar = '';

  for (let i = 1; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && prevChar !== '\\') inString = !inString;
    if (!inString) {
      if (char === '{') { if (depth === 0) currentObj = ''; depth++; }
      if (char === '}') {
        depth--;
        if (depth === 0) {
          currentObj += char;
          try { objects.push(JSON.parse(currentObj)); } catch { }
          currentObj = ''; prevChar = char; continue;
        }
      }
    }
    if (depth > 0) currentObj += char;
    prevChar = char;
  }
  return objects.length > 0 ? objects : null;
}

function inferGlobals(project) {
  if (!project) return {};
  const state = (project.state || 'CA').toUpperCase();
  const regionFactors = {
    CA: 1.15, NY: 1.25, WA: 1.1, TX: 0.9, FL: 0.92,
    IL: 1.05, CO: 1.0, AZ: 0.88, GA: 0.9, MA: 1.18,
    OR: 1.08, NV: 1.0, HI: 1.35, PA: 1.05, OH: 0.92,
  };
  const taxRates = {
    CA: 0.0975, NY: 0.08, WA: 0.1, TX: 0.0825, FL: 0.07,
    IL: 0.0875, CO: 0.079, AZ: 0.08, GA: 0.074, MA: 0.0625,
    OR: 0.0, NV: 0.0825, HI: 0.045, PA: 0.06, OH: 0.0725,
  };

  // pctVal: parse custom % from form (stored as "5" for 5%) or fall back to default
  const pctVal = (field, def) => {
    const v = project[field];
    return (v !== '' && v !== undefined && v !== null) ? parseFloat(v) / 100 : def;
  };

  const defaultLaborBurden = project.labor_type === 'Prevailing Wage' ? 0.45 : 0.35;

  return {
    regionFactor: project.region_factor ? parseFloat(project.region_factor) : (regionFactors[state] || 1.0),
    tax: pctVal('sales_tax', taxRates[state] || 0.08),
    escalation: pctVal('escalation', 0.04),
    laborBurden: pctVal('labor_burden', defaultLaborBurden),
    insurance: pctVal('insurance', 0.012),
    contingency: pctVal('contingency', 0.05),
    fee: pctVal('gc_fee', 0.045),
    bond: pctVal('bond', 0.008),
    generalConditions: pctVal('general_conditions', 0.08),
    buildingSF: project.gross_sf ? Number(project.gross_sf) : 0,
    parkingStalls: project.parking_stalls ? Number(project.parking_stalls) : 0,
    openSpaceSF: 0,
  };
}

async function generateBatch(client, description, project, batch) {
  const allowedCategories = batch.categories.join(', ');
  const projectContext = buildProjectContext(project);

  const systemPrompt = `You are a senior preconstruction estimator. Generate EXACTLY ${batch.count} construction cost line items for the "${batch.name}" section.

Focus on: ${batch.focus}
Allowed categories: ${allowedCategories}

RULES:
1. Respond with ONLY a valid JSON array. No markdown, no backticks, no explanation.
2. Generate EXACTLY ${batch.count} items.
3. Keep descriptions SHORT — max 6 words.
4. Every item MUST use only these categories: ${allowedCategories}
5. Calibrate costs to ${project?.city || 'local'}, ${project?.state || 'CA'} 2025–2026 market rates.
6. Derive quantities realistically from the project description.

Each item must have exactly these fields:
${ITEM_SCHEMA}

Start with [ and end with ]. Nothing else.`;

  const userPrompt = `Generate ${batch.count} line items for "${batch.name}" for this project:

${description}

${projectContext}

Section focus: ${batch.focus}

JSON array only. Exactly ${batch.count} items. Start with [ end with ].`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return parseItems(rawText);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, project } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const client = new Anthropic({ apiKey });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  console.log('[generate-estimate] Starting multi-batch generation');
  send({ type: 'start', totalBatches: BATCHES.length });

  let globalSortOrder = 0;

  for (const batch of BATCHES) {
    console.log(`[generate-estimate] Batch ${batch.index + 1}/${BATCHES.length}: ${batch.name}`);
    try {
      const items = await generateBatch(client, description, project, batch);
      const withOrder = items.map((item, i) => ({ ...item, sort_order: globalSortOrder + i }));
      globalSortOrder += items.length;
      console.log(`[generate-estimate] Batch ${batch.index + 1} done: ${items.length} items`);
      send({ type: 'batch', batchIndex: batch.index, batchName: batch.name, items: withOrder, itemCount: withOrder.length });
    } catch (err) {
      Sentry.captureException(err);
      console.error(`[generate-estimate] Batch ${batch.index + 1} error:`, err.message);
      send({ type: 'batch_error', batchIndex: batch.index, batchName: batch.name, error: err.message });
    }
  }

  send({ type: 'done', totalItems: globalSortOrder, globals: inferGlobals(project) });
  res.end();
}
