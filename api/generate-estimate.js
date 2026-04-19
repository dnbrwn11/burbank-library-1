import Anthropic from '@anthropic-ai/sdk';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 300 };

// ── Model configuration ───────────────────────────────────────────────────────
// Planning call uses Sonnet for richer project understanding.
// Chunk calls use Haiku — it's faster and cheaper for structured JSON output.
// Switch CHUNK_MODEL back to 'claude-sonnet-4-6' if output quality suffers.
const PLANNING_MODEL = 'claude-sonnet-4-6';
const CHUNK_MODEL    = 'claude-haiku-4-5-20251001';

// ── 3 parallel chunks (down from 5 sequential) ────────────────────────────────
// sortStart pre-assigns non-overlapping sort_order ranges so results merge in
// the correct order regardless of which chunk finishes first.
const CHUNKS = [
  {
    index:     0,
    name:      'Structure & Site',
    sortStart: 0,
    count:     55,
    categories: ['Substructure', 'Shell', 'Sitework'],
    focus: 'Substructure (foundations, footings, grade beams, slab-on-grade, below-grade waterproofing, dewatering), Shell (structural frame — steel/concrete, metal deck, exterior walls, curtainwall & glazing, roofing system, skylights, parapet, exterior doors & entrances), Sitework (demolition, excavation & grading, underground utilities, site concrete & paving, hardscape, landscaping & irrigation, site lighting, fencing)',
  },
  {
    index:     1,
    name:      'Interiors & Soft Costs',
    sortStart: 55,
    count:     55,
    categories: ['Interiors', 'Equipment', 'Special Construction', 'General Conditions', 'Overhead & Fee', 'Contingency'],
    focus: 'Interiors (metal stud partitions, gypsum board, interior doors & hardware, interior glazing, acoustic ceilings, all flooring types, wall finishes & paint, millwork & casework, signage & wayfinding, toilet partitions & accessories, window treatments, specialty interiors), Equipment (specialty kitchen, lab, medical, conveying equipment), General Conditions (supervision, temp facilities, permits, insurance, bonds), Overhead & Fee, Contingency',
  },
  {
    index:     2,
    name:      'All Services',
    sortStart: 110,
    count:     65,
    categories: ['Services'],
    focus: 'Plumbing (fixtures, domestic water distribution, sanitary & storm drainage, natural gas, water heaters), HVAC (chillers, boilers, cooling towers, AHUs, VAVs, FCUs, exhaust fans, ductwork, insulation), BAS/DDC controls, testing & balancing, fire suppression (wet sprinkler, dry, clean agent), fire alarm & detection, utility service & metering, main switchgear, distribution panels, branch circuit wiring, interior & exterior lighting, lighting controls & dimmers, emergency lighting, standby generator, UPS, structured cabling, data infrastructure, Wi-Fi, AV & multimedia, security cameras, access control, elevators & escalators',
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

// ── Project context builder ───────────────────────────────────────────────────

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
    ['Structure Type',    project.structure_type],
    ['Foundation',        project.foundation_type],
    ['Parking',           project.parking && project.parking !== 'None'
      ? project.parking + (project.parking_stalls ? ` (${project.parking_stalls} stalls)` : '')
      : null],
    ['Site Conditions',   project.site_conditions],
    ['Soil Conditions',   project.soil_conditions],
    ['Exterior Envelope', project.exterior_envelope],
    ['Roofing',           project.roofing],
    ['HVAC',              project.hvac],
    ['Electrical Service',project.electrical_service],
    ['Fire Protection',   project.fire_protection],
    ['Sustainability',    project.sustainability],
    ['Elevators',         project.elevators && project.elevators !== 'None'
      ? project.elevators + (project.num_elevators ? ` (${project.num_elevators})` : '')
      : null],
    ['Total Units',       project.total_units],
    ['Unit Mix',          project.unit_mix],
    ['Amenities',         Array.isArray(project.amenities) && project.amenities.length ? project.amenities.join(', ') : null],
    ['Renovation Scope',  project.reno_scope],
    ['Occupied During Construction', project.occupied],
    ['Existing Structure',project.existing_structure],
    ['Hazmat Status',     project.hazmat],
  ];
  for (const [label, val] of optional) {
    if (val && val !== 'Unknown' && val !== 'None / Code Minimum') lines.push(`${label}: ${val}`);
  }
  return `Project Details:\n${lines.map(l => `- ${l}`).join('\n')}`;
}

// ── Item parser (robust against partial JSON / markdown fences) ───────────────

function parseItems(rawText) {
  // Strip markdown fences
  let text = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Fast path: full array
  try { const arr = JSON.parse(text); if (Array.isArray(arr)) return arr; } catch {}

  // Object-by-object extraction for partial/truncated responses
  const objects = [];
  let depth = 0, currentObj = '', prevChar = '';
  for (const char of text) {
    if (char === '{') {
      if (depth === 0) currentObj = '';
      depth++;
    }
    if (depth > 0) {
      currentObj += char;
      if (char === '}') {
        depth--;
        if (depth === 0) {
          try { objects.push(JSON.parse(currentObj)); } catch {}
          currentObj = '';
        }
      }
    }
    prevChar = char;
  }
  return objects.length ? objects : null;
}

// ── Globals inference ─────────────────────────────────────────────────────────

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
  const pctVal = (field, def) => {
    const v = project[field];
    return (v !== '' && v !== undefined && v !== null) ? parseFloat(v) / 100 : def;
  };
  const defaultLaborBurden = project.labor_type === 'Prevailing Wage' ? 0.45 : 0.35;
  return {
    regionFactor:      project.region_factor ? parseFloat(project.region_factor) : (regionFactors[state] || 1.0),
    tax:               pctVal('sales_tax', taxRates[state] || 0.08),
    escalation:        pctVal('escalation', 0.04),
    laborBurden:       pctVal('labor_burden', defaultLaborBurden),
    insurance:         pctVal('insurance', 0.012),
    contingency:       pctVal('contingency', 0.05),
    fee:               pctVal('gc_fee', 0.045),
    bond:              pctVal('bond', 0.008),
    generalConditions: pctVal('general_conditions', 0.08),
    buildingSF:        project.gross_sf ? Number(project.gross_sf) : 0,
    parkingStalls:     project.parking_stalls ? Number(project.parking_stalls) : 0,
    openSpaceSF:       0,
  };
}

// ── Planning call (Sonnet) ────────────────────────────────────────────────────
// Returns an enhanced context string shared with all chunk prompts.

async function runPlanningCall(client, description, project) {
  const projectContext = buildProjectContext(project);
  const prompt = `You are a senior preconstruction estimator. Read this project brief and return a single JSON object with key construction details that will help generate accurate line items.

PROJECT BRIEF:
${description}

${projectContext}

Return ONLY a JSON object — no markdown, no explanation:
{
  "construction_type": "<steel frame | concrete frame | wood frame | tilt-up | other>",
  "labor_market": "<prevailing wage | union | open shop>",
  "complexity": "<low | medium | high | very high>",
  "key_drivers": ["<cost driver 1>", "<cost driver 2>", "<cost driver 3>"],
  "special_conditions": "<any unusual site, regulatory, or scope conditions>",
  "psf_target": <estimated $/SF for total direct cost, integer>
}`;

  try {
    const msg = await client.messages.create({
      model: PLANNING_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    // Build enhanced context string for chunks
    return [
      parsed.construction_type   ? `Construction type: ${parsed.construction_type}` : '',
      parsed.labor_market        ? `Labor market: ${parsed.labor_market}` : '',
      parsed.complexity          ? `Project complexity: ${parsed.complexity}` : '',
      parsed.key_drivers?.length ? `Key cost drivers: ${parsed.key_drivers.join(', ')}` : '',
      parsed.special_conditions  ? `Special conditions: ${parsed.special_conditions}` : '',
      parsed.psf_target          ? `Target $/SF: ~$${parsed.psf_target}` : '',
    ].filter(Boolean).join('\n');
  } catch (err) {
    console.error('[generate-estimate] planning call error (non-fatal):', err.message);
    return ''; // non-fatal — chunks still run without enhanced context
  }
}

// ── Single chunk generator ────────────────────────────────────────────────────

async function generateChunk(client, description, project, chunk, planningContext) {
  const allowedCategories = chunk.categories.join(', ');
  const projectContext    = buildProjectContext(project);

  const systemPrompt = `You are a senior preconstruction estimator. Generate EXACTLY ${chunk.count} construction cost line items for the "${chunk.name}" section.

Focus on: ${chunk.focus}
Allowed categories: ${allowedCategories}

RULES:
1. Respond with ONLY a valid JSON array. No markdown, no backticks, no explanation.
2. Generate EXACTLY ${chunk.count} items.
3. Keep descriptions SHORT — max 6 words.
4. Every item MUST use only these categories: ${allowedCategories}
5. Calibrate costs to ${project?.city || 'local'}, ${project?.state || 'CA'} 2025–2026 market rates.
6. Derive quantities realistically from the project description.

Each item must have exactly these fields:
${ITEM_SCHEMA}

Start with [ and end with ]. Nothing else.`;

  const userPrompt = `Generate ${chunk.count} line items for "${chunk.name}":

${description}

${projectContext}
${planningContext ? '\nAdditional context:\n' + planningContext : ''}

Section focus: ${chunk.focus}

JSON array only. Exactly ${chunk.count} items. Start with [ end with ].`;

  const message = await client.messages.create({
    model:      CHUNK_MODEL,
    max_tokens: 8192,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const rawText = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const items   = parseItems(rawText);
  if (!items) throw new Error(`Chunk "${chunk.name}": failed to parse response`);
  return items;
}

// ── Assumptions generator (runs in parallel with chunks) ─────────────────────

async function generateAssumptions(client, project) {
  try {
    const prompt = `You are a senior construction estimator. List 6-8 key assumptions made when generating this estimate.

Project: ${project?.name || 'Unnamed'}, ${project?.city || ''}, ${project?.state || ''}
Building type: ${project?.building_type || 'Not specified'}
Scope: ${project?.scope || 'New Construction'}
Gross SF: ${project?.gross_sf ? Number(project.gross_sf).toLocaleString() + ' SF' : 'Not specified'}
Labor type: ${project?.labor_type || 'Not specified'}

Return ONLY a JSON array of concise assumption strings (max 12 words each). No markdown, no backticks:
["assumption 1", "assumption 2", ...]`;

    const msg = await client.messages.create({
      model:      CHUNK_MODEL,
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    });
    const raw     = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed  = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : [];
  } catch (err) {
    console.error('[generate-estimate] assumptions error (non-fatal):', err.message);
    return [];
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { description, project, retry_chunk } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });

  const client = new Anthropic({ apiKey });

  // ── Retry mode: re-run a single failed chunk ──────────────────────────────
  if (retry_chunk !== undefined) {
    const chunk = CHUNKS.find(c => c.index === retry_chunk);
    if (!chunk) return res.status(400).json({ error: `Unknown chunk index: ${retry_chunk}` });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    send({ type: 'start', totalBatches: 1, retry: true });

    try {
      const items    = await generateChunk(client, description, project, chunk, '');
      const withOrder = items.map((item, i) => ({ ...item, sort_order: chunk.sortStart + i }));
      send({ type: 'batch', batchIndex: chunk.index, batchName: chunk.name, items: withOrder, itemCount: withOrder.length });
      send({ type: 'done', totalItems: withOrder.length, globals: inferGlobals(project), ai_assumptions: [], failedChunks: [] });
    } catch (err) {
      Sentry.captureException(err);
      send({ type: 'batch_error', batchIndex: chunk.index, batchName: chunk.name, error: err.message });
      send({ type: 'done', totalItems: 0, globals: inferGlobals(project), ai_assumptions: [], failedChunks: [chunk.index] });
    }
    res.end();
    return;
  }

  // ── Normal mode: planning call → parallel chunks + assumptions ────────────

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  console.log('[generate-estimate] Starting parallel generation — planning call first');
  send({ type: 'start', totalBatches: CHUNKS.length });

  // Step 1: planning call (Sonnet) — enhances context shared with all chunks
  const planningContext = await runPlanningCall(client, description, project);
  console.log('[generate-estimate] Planning done — firing', CHUNKS.length, 'chunks in parallel');

  let totalItems = 0;
  const failedChunkIndices = [];

  // Step 2: fire all chunks + assumptions simultaneously
  const chunkPromises = CHUNKS.map(chunk =>
    generateChunk(client, description, project, chunk, planningContext)
      .then(items => {
        const withOrder = items.map((item, i) => ({
          ...item,
          sort_order: chunk.sortStart + i,
        }));
        totalItems += withOrder.length;
        console.log(`[generate-estimate] Chunk "${chunk.name}" done: ${withOrder.length} items`);
        // Send SSE immediately when this chunk resolves — don't wait for others
        send({
          type:       'batch',
          batchIndex: chunk.index,
          batchName:  chunk.name,
          items:      withOrder,
          itemCount:  withOrder.length,
        });
        return withOrder;
      })
      .catch(err => {
        Sentry.captureException(err);
        console.error(`[generate-estimate] Chunk "${chunk.name}" failed:`, err.message);
        failedChunkIndices.push(chunk.index);
        send({
          type:       'batch_error',
          batchIndex: chunk.index,
          batchName:  chunk.name,
          error:      err.message,
        });
        return null; // treat as empty — don't abort other chunks
      })
  );

  const assumptionsPromise = generateAssumptions(client, project);

  // Step 3: wait for everything
  const [, ai_assumptions] = await Promise.all([
    Promise.allSettled(chunkPromises),
    assumptionsPromise,
  ]);

  const succeeded = CHUNKS.length - failedChunkIndices.length;
  console.log(`[generate-estimate] Done — ${succeeded}/${CHUNKS.length} chunks, ${totalItems} items`);

  send({
    type:          'done',
    totalItems,
    globals:       inferGlobals(project),
    ai_assumptions: ai_assumptions || [],
    failedChunks:  failedChunkIndices,
  });
  res.end();
}
