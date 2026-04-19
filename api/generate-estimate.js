import Anthropic from '@anthropic-ai/sdk';
import { Sentry } from '../lib/sentry-server.js';

export const config = { maxDuration: 300 };

// ── Model configuration ───────────────────────────────────────────────────────
const PLANNING_MODEL = 'claude-sonnet-4-6';
const CHUNK_MODEL    = 'claude-haiku-4-5-20251001';

// ── Scope detection ───────────────────────────────────────────────────────────
function isRenovation(project) {
  const st = (project?.scope_type || '').toLowerCase();
  const sc = (project?.scope || '').toLowerCase();
  const desc = (project?.description || '').toLowerCase();
  return st === 'renovation'
    || st.includes('renov')
    || st.includes('tenant')
    || st.includes(' ti')
    || sc.includes('renovation')
    || sc.includes('tenant improvement')
    || sc.includes('reno')
    || desc.includes('tenant improvement')
    || desc.includes(' ti ')
    || desc.startsWith('ti ');
}

// ── Budget-calibrated item counts ─────────────────────────────────────────────
// Renovation/TI: fewer items, scaled to budget so the AI has right scope size.
// New construction: same 3-chunk structure but scaled to budget.
function getRenovationItemCounts(budget) {
  if (!budget || budget <= 0) return { demo: 30, mep: 20 };
  if (budget < 1_000_000)   return { demo: 12, mep:  8 };
  if (budget < 5_000_000)   return { demo: 20, mep: 12 };
  if (budget < 15_000_000)  return { demo: 28, mep: 18 };
  if (budget < 40_000_000)  return { demo: 38, mep: 24 };
  return { demo: 48, mep: 30 };
}

function getNewConstructionItemCounts(budget) {
  if (!budget || budget <= 0) return { site: 55, interiors: 55, services: 65 };
  if (budget < 5_000_000)    return { site: 18, interiors: 18, services: 20 };
  if (budget < 20_000_000)   return { site: 28, interiors: 28, services: 32 };
  if (budget < 60_000_000)   return { site: 40, interiors: 42, services: 48 };
  if (budget < 150_000_000)  return { site: 50, interiors: 52, services: 58 };
  return { site: 55, interiors: 55, services: 65 };
}

// ── Dynamic chunk configuration ───────────────────────────────────────────────
function getChunks(project) {
  const budget = Number(project?.target_budget) || 0;
  const reno = isRenovation(project);

  if (reno) {
    const counts = getRenovationItemCounts(budget);
    return [
      {
        index:      0,
        name:       'Demo & Interior Construction',
        sortStart:  0,
        count:      counts.demo,
        categories: ['Interiors', 'Special Construction'],
        focus: `Selective demolition of existing partitions, ceilings, flooring, MEP (to be removed). New interior framing, gypsum board, drywall, acoustic ceiling tile, all flooring types (carpet, LVT, tile, polished concrete), interior paint & coatings, millwork & casework, interior doors & hardware, interior glazing & storefronts, signage & wayfinding, toilet partitions & accessories, window treatments, specialty items.
CRITICAL: DO NOT include foundations, structural frame, roofing, building shell/envelope, elevators, escalators, major sitework, parking, or anything outside the tenant space.`,
      },
      {
        index:      1,
        name:       'Interior MEP, Fire & Soft Costs',
        sortStart:  counts.demo,
        count:      counts.mep,
        categories: ['Services', 'General Conditions', 'Overhead & Fee', 'Contingency'],
        focus: `INTERIOR DISTRIBUTION ONLY — the base building already has main MEP equipment:
- Plumbing: new fixtures (sinks, toilets, water closets), connecting branch pipes to existing risers, hot water distribution within TI space.
- HVAC: VAV terminal boxes, fan coil units, ductwork within space, diffusers/grilles/registers, thermostats, BAS connections — NOT chillers/boilers/cooling towers/AHUs (base building has those).
- Electrical: branch circuit wiring within TI, new lighting fixtures & controls, electrical panels (if new subpanel needed) — NOT main switchgear, NOT emergency generator.
- Fire protection: sprinkler head relocation/new drops, fire alarm devices (speakers, strobes, pull stations, detectors) — NOT fire pump or main riser.
- Low voltage: structured cabling, Wi-Fi APs, security cameras, card readers, AV/multimedia.
- General Conditions: project supervision, temporary protection & dust barriers, phasing, permits, insurance, bonds.
- Overhead & Fee, Contingency.
CRITICAL: No chillers, boilers, cooling towers, AHUs, main switchgear, emergency generators, elevators, or site utilities.`,
      },
    ];
  }

  // New construction — 3-chunk parallel structure
  const counts = getNewConstructionItemCounts(budget);
  return [
    {
      index:     0,
      name:      'Structure & Site',
      sortStart: 0,
      count:     counts.site,
      categories: ['Substructure', 'Shell', 'Sitework'],
      focus: 'Substructure (foundations, footings, grade beams, slab-on-grade, below-grade waterproofing), Shell (structural frame, metal deck, exterior walls, curtainwall & glazing, roofing system, skylights, parapet, exterior doors), Sitework (demolition, excavation & grading, underground utilities, site concrete & paving, hardscape, landscaping, site lighting, fencing)',
    },
    {
      index:     1,
      name:      'Interiors & Soft Costs',
      sortStart: counts.site,
      count:     counts.interiors,
      categories: ['Interiors', 'Equipment', 'Special Construction', 'General Conditions', 'Overhead & Fee', 'Contingency'],
      focus: 'Interiors (metal stud partitions, gypsum board, interior doors & hardware, interior glazing, acoustic ceilings, all flooring types, wall finishes & paint, millwork & casework, signage & wayfinding, toilet partitions & accessories, window treatments, specialty interiors), Equipment (specialty kitchen, lab, medical, conveying equipment), General Conditions (supervision, temp facilities, permits, insurance, bonds), Overhead & Fee, Contingency',
    },
    {
      index:     2,
      name:      'All Services',
      sortStart: counts.site + counts.interiors,
      count:     counts.services,
      categories: ['Services'],
      focus: 'Plumbing (fixtures, domestic water, sanitary & storm, natural gas, water heaters), HVAC (chillers, boilers, cooling towers, AHUs, VAVs, FCUs, exhaust fans, ductwork, insulation, BAS/DDC), fire suppression (wet sprinkler, fire alarm & detection), utility service & metering, main switchgear, distribution panels, branch circuit wiring, interior & exterior lighting, lighting controls, standby generator, UPS, structured cabling, Wi-Fi, AV, security, access control, elevators & escalators',
    },
  ];
}

// ── Critical prompt blocks ────────────────────────────────────────────────────

function buildCriticalRules(project, chunk) {
  const budget = Number(project?.target_budget) || 0;
  const sf     = Number(project?.gross_sf) || 0;
  const reno   = isRenovation(project);
  const psfImplied = (budget > 0 && sf > 0) ? Math.round(budget / sf) : null;

  const lines = ['=== CRITICAL RULES — MUST FOLLOW EXACTLY ===', ''];

  // Budget rule — PRESCRIPTIVE, not advisory
  if (budget > 0) {
    lines.push(`RULE 1 — BUDGET CALIBRATION:`);
    lines.push(`The CLIENT'S TARGET BUDGET is $${budget.toLocaleString()}.`);
    if (psfImplied) {
      lines.push(`That implies $${psfImplied.toLocaleString()}/SF for ${sf.toLocaleString()} SF.`);
    }
    lines.push(`Your generated items for THIS CHUNK must be proportionally sized so the full estimate totals approximately that budget.`);
    lines.push(`If the budget is low, REDUCE SCOPE — fewer items, simpler finishes, less specialty scope.`);
    lines.push(`Do NOT generate expensive items that would push the total far beyond this budget.`);
    lines.push('');
  } else {
    lines.push('RULE 1 — BUDGET: No target budget provided. Estimate at market-typical quality for the building type and location.');
    lines.push('');
  }

  // Renovation/TI scope rule
  if (reno) {
    lines.push(`RULE 2 — SCOPE TYPE: RENOVATION / TENANT IMPROVEMENT.`);
    lines.push(`This is NOT new construction. You MUST NOT include:`);
    lines.push(`  ✗ Foundations, footings, grade beams, structural frame, moment frames, shear walls`);
    lines.push(`  ✗ Roofing systems, building envelope, curtain wall, exterior cladding`);
    lines.push(`  ✗ Site grading, mass excavation, underground utilities, parking structures`);
    lines.push(`  ✗ Main HVAC equipment (chillers, boilers, cooling towers, main AHUs)`);
    lines.push(`  ✗ Main electrical switchgear, emergency generators, main service entrance`);
    lines.push(`  ✗ Elevators (unless explicitly mentioned in the project description)`);
    lines.push(`You MUST include:`);
    lines.push(`  ✓ Selective demolition of existing interior conditions`);
    lines.push(`  ✓ Interior framing, drywall, ceilings, flooring, paint, millwork`);
    lines.push(`  ✓ MEP distribution within the tenant space (branch circuits, not main equipment)`);
    lines.push(`  ✓ Temporary protection and dust barriers (especially if occupied)`);
    if (psfImplied) {
      lines.push(`Typical TI ranges: basic $40-80/SF, standard $80-150/SF, high-end $150-250/SF.`);
      lines.push(`At $${psfImplied}/SF this implies a ${psfImplied < 80 ? 'basic' : psfImplied < 150 ? 'standard' : 'high-end'} finish level.`);
    }
    lines.push('');
  }

  lines.push(`RULE 3 — ITEM COUNT: Generate EXACTLY ${chunk.count} items. No more, no less.`);
  lines.push(`RULE 4 — FORMAT: Respond with ONLY a valid JSON array. No markdown, no explanation.`);
  lines.push(`RULE 5 — CATEGORIES: Every item MUST use one of these categories: ${chunk.categories.join(', ')}`);
  lines.push(`RULE 6 — LOCATION: Calibrate unit costs to ${project?.city || 'local'}, ${project?.state || 'CA'} 2025–2026 market rates.`);
  lines.push('');
  lines.push('=== END CRITICAL RULES ===');

  return lines.join('\n');
}

// ── Project context (for logging + AI context) ────────────────────────────────

function buildProjectContext(project) {
  if (!project) return '';
  const reno = isRenovation(project);
  const scopeLabel = reno ? 'RENOVATION / TENANT IMPROVEMENT' : (project.scope || 'New Construction');
  const lines = [
    `Building Type: ${project.building_type || 'Not specified'}`,
    `Scope: ${scopeLabel}`,
    `scope_type field: ${project.scope_type || 'not set'}`,
    `Location: ${project.city || ''}, ${project.state || 'CA'}`,
    `Client: ${project.client_name || 'Not specified'}${project.client_type ? ` (${project.client_type})` : ''}`,
    `Gross SF: ${project.gross_sf ? Number(project.gross_sf).toLocaleString() : 'Not specified'}`,
    `Stories: ${project.stories || 'Not specified'}`,
    `Labor Type: ${project.labor_type || 'Not specified'}`,
    `Delivery Method: ${project.delivery_method || 'Not specified'}`,
    `Target Budget: ${project.target_budget ? '$' + Number(project.target_budget).toLocaleString() : 'TBD / Not specified'}`,
  ];
  const optional = [
    ['Renovation Scope',  project.reno_scope],
    ['Occupied During Construction', project.occupied],
    ['Existing Structure',project.existing_structure],
    ['Hazmat Status',     project.hazmat],
    ['Sustainability',    project.sustainability],
    ['HVAC',              project.hvac],
    ['Amenities',         Array.isArray(project.amenities) && project.amenities.length ? project.amenities.join(', ') : null],
  ];
  for (const [label, val] of optional) {
    if (val && val !== 'Unknown' && val !== 'None / Code Minimum') lines.push(`${label}: ${val}`);
  }
  return `Project Details:\n${lines.map(l => `- ${l}`).join('\n')}`;
}

// ── Item parser ───────────────────────────────────────────────────────────────

function parseItems(rawText) {
  let text = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { const arr = JSON.parse(text); if (Array.isArray(arr)) return arr; } catch {}
  const objects = [];
  let depth = 0, currentObj = '';
  for (const char of text) {
    if (char === '{') { if (depth === 0) currentObj = ''; depth++; }
    if (depth > 0) {
      currentObj += char;
      if (char === '}') {
        depth--;
        if (depth === 0) { try { objects.push(JSON.parse(currentObj)); } catch {} currentObj = ''; }
      }
    }
  }
  return objects.length ? objects : null;
}

// ── Globals inference ─────────────────────────────────────────────────────────

function inferGlobals(project) {
  if (!project) return {};
  const state = (project.state || 'CA').toUpperCase();
  const regionFactors = { CA: 1.15, NY: 1.25, WA: 1.1, TX: 0.9, FL: 0.92, IL: 1.05, CO: 1.0, AZ: 0.88, GA: 0.9, MA: 1.18, OR: 1.08, NV: 1.0, HI: 1.35, PA: 1.05, OH: 0.92 };
  const taxRates      = { CA: 0.0975, NY: 0.08, WA: 0.1, TX: 0.0825, FL: 0.07, IL: 0.0875, CO: 0.079, AZ: 0.08, GA: 0.074, MA: 0.0625, OR: 0.0, NV: 0.0825, HI: 0.045, PA: 0.06, OH: 0.0725 };
  const pctVal = (field, def) => { const v = project[field]; return (v !== '' && v !== undefined && v !== null) ? parseFloat(v) / 100 : def; };
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

// ── Planning call ─────────────────────────────────────────────────────────────

async function runPlanningCall(client, description, project) {
  const reno = isRenovation(project);
  const budget = Number(project?.target_budget) || 0;
  const sf = Number(project?.gross_sf) || 0;
  const projectContext = buildProjectContext(project);

  const scopeGuidance = reno
    ? `IMPORTANT: This is a RENOVATION/TI. The planner must only consider INTERIOR scope. Do not plan for structural, roofing, foundations, or major site work.`
    : `This is new construction.`;

  const budgetGuidance = budget > 0
    ? `The target budget is $${budget.toLocaleString()}${sf > 0 ? ` ($${Math.round(budget/sf)}/SF implied)` : ''}. Calibrate $/SF accordingly.`
    : '';

  const prompt = `You are a senior preconstruction estimator. Analyze this project and return calibration data.

${scopeGuidance}
${budgetGuidance}

PROJECT BRIEF:
${description}

${projectContext}

Return ONLY a JSON object:
{
  "construction_type": "<interior fit-out | steel frame | concrete frame | wood frame | tilt-up | other>",
  "labor_market": "<prevailing wage | union | open shop>",
  "complexity": "<low | medium | high | very high>",
  "key_drivers": ["<cost driver 1>", "<cost driver 2>", "<cost driver 3>"],
  "special_conditions": "<any unusual scope, regulatory, or phasing conditions>",
  "psf_target": <estimated $/SF for DIRECT construction cost, integer — for TI this should be 40-250 depending on quality level>,
  "scope_type": "<renovation_ti | new_construction>",
  "is_renovation": ${reno}
}`;

  try {
    const msg = await client.messages.create({ model: PLANNING_MODEL, max_tokens: 512, messages: [{ role: 'user', content: prompt }] });
    const raw = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const parsed = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
    const ctx = [
      parsed.construction_type ? `Construction type: ${parsed.construction_type}` : '',
      parsed.labor_market      ? `Labor market: ${parsed.labor_market}` : '',
      parsed.complexity        ? `Complexity: ${parsed.complexity}` : '',
      parsed.key_drivers?.length ? `Key cost drivers: ${parsed.key_drivers.join(', ')}` : '',
      parsed.special_conditions  ? `Special conditions: ${parsed.special_conditions}` : '',
      parsed.psf_target         ? `Planner $/SF target: $${parsed.psf_target}` : '',
    ].filter(Boolean).join('\n');
    console.log('[generate-estimate] Planning result:', ctx);
    return ctx;
  } catch (err) {
    console.error('[generate-estimate] planning call error (non-fatal):', err.message);
    return '';
  }
}

// ── Single chunk generator ────────────────────────────────────────────────────

async function generateChunk(client, description, project, chunk, planningContext) {
  const projectContext = buildProjectContext(project);
  const criticalRules  = buildCriticalRules(project, chunk);

  const systemPrompt = `You are a senior preconstruction estimator generating a construction cost estimate.

${criticalRules}

SECTION TO GENERATE: "${chunk.name}"
Allowed categories: ${chunk.categories.join(', ')}
Section scope: ${chunk.focus}

Each item must have exactly these fields:
{
  "category": "exact category name from allowed list",
  "subcategory": "specific system or trade",
  "description": "short name max 6 words",
  "qty_min": number,
  "qty_max": number,
  "unit": "SF|LF|EA|LS|TON|CY",
  "unit_cost_low": number,
  "unit_cost_mid": number,
  "unit_cost_high": number,
  "basis": "how quantity was derived",
  "sensitivity": "Low|Medium|High|Very High",
  "notes": ""
}

Start with [ and end with ]. JSON array only. ${chunk.count} items exactly.`;

  const userPrompt = `Generate ${chunk.count} line items for the "${chunk.name}" section.

PROJECT:
${description}

${projectContext}
${planningContext ? '\nAdditional planner context:\n' + planningContext : ''}

Section: ${chunk.name}
Generate exactly ${chunk.count} items. JSON array only.`;

  // Log first chunk prompt for debugging
  if (chunk.index === 0) {
    console.log('[generate-estimate] === SYSTEM PROMPT (chunk 0) ===');
    console.log(systemPrompt.slice(0, 2000));
    console.log('[generate-estimate] === USER PROMPT (chunk 0) ===');
    console.log(userPrompt.slice(0, 1000));
  }

  const message = await client.messages.create({
    model:    CHUNK_MODEL,
    max_tokens: 8192,
    system:   systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const items = parseItems(rawText);
  if (!items) throw new Error(`Chunk "${chunk.name}": failed to parse response`);
  return items;
}

// ── Post-generation sanity check ──────────────────────────────────────────────

function computeSanityCheck(allItems, project) {
  const budget = Number(project?.target_budget) || 0;
  if (!budget) return null;

  const midTotal = allItems.reduce((sum, item) => {
    const qty = ((Number(item.qty_min) || 0) + (Number(item.qty_max) || 0)) / 2;
    return sum + qty * (Number(item.unit_cost_mid) || 0);
  }, 0);

  if (midTotal <= 0) return null;

  const ratio = midTotal / budget;
  const fmtM  = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${Math.round(n/1000)}K`;

  if (ratio > 2) {
    return {
      type: 'over_budget',
      ratio: ratio.toFixed(1),
      message: `Generated estimate (${fmtM(midTotal)}) is ${(ratio-1)*100 | 0}% over the target budget (${fmtM(budget)}). The AI may have over-scoped this project. Consider regenerating with a more specific description, or verify the budget and SF inputs.`,
    };
  }
  if (ratio < 0.4 && midTotal > 0) {
    return {
      type: 'under_budget',
      ratio: ratio.toFixed(1),
      message: `Generated estimate (${fmtM(midTotal)}) is well under the target budget (${fmtM(budget)}). Scope may be under-estimated.`,
    };
  }
  return null;
}

// ── Assumptions generator ─────────────────────────────────────────────────────

async function generateAssumptions(client, project) {
  const reno = isRenovation(project);
  try {
    const prompt = `You are a senior construction estimator. List 5-7 key assumptions for this estimate.

Project: ${project?.name || 'Unnamed'}, ${project?.city || ''}, ${project?.state || ''}
Building type: ${project?.building_type || 'Not specified'}
Scope: ${reno ? 'Renovation / TI (interior only, NOT new construction)' : (project?.scope || 'New Construction')}
Gross SF: ${project?.gross_sf ? Number(project.gross_sf).toLocaleString() + ' SF' : 'Not specified'}
Labor type: ${project?.labor_type || 'Not specified'}
${project?.target_budget ? `Target budget: $${Number(project.target_budget).toLocaleString()}` : ''}

Return ONLY a JSON array of concise assumption strings (max 12 words each). No markdown:
["assumption 1", "assumption 2", ...]`;

    const msg = await client.messages.create({ model: CHUNK_MODEL, max_tokens: 300, messages: [{ role: 'user', content: prompt }] });
    const raw = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const parsed = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
    return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : [];
  } catch (err) {
    console.error('[generate-estimate] assumptions error:', err.message);
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

  // ── Diagnostic logging — always log to Vercel ──────────────────────────────
  const reno = isRenovation(project);
  console.log('[generate-estimate] === PROJECT CONTEXT ===');
  console.log(JSON.stringify({
    name:          project?.name,
    building_type: project?.building_type,
    scope_type:    project?.scope_type,
    scope:         project?.scope,
    target_budget: project?.target_budget,
    gross_sf:      project?.gross_sf,
    city:          project?.city,
    state:         project?.state,
    client_name:   project?.client_name,
    client_type:   project?.client_type,
    is_renovation: reno,
  }, null, 2));

  // ── Retry mode ────────────────────────────────────────────────────────────
  if (retry_chunk !== undefined) {
    const chunks = getChunks(project);
    const chunk  = chunks.find(c => c.index === retry_chunk);
    if (!chunk) return res.status(400).json({ error: `Unknown chunk index: ${retry_chunk}` });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    send({ type: 'start', totalBatches: 1, retry: true });

    try {
      const items     = await generateChunk(client, description, project, chunk, '');
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

  // ── Normal mode ───────────────────────────────────────────────────────────
  const chunks = getChunks(project);
  const totalChunks = chunks.length;
  const totalTargetItems = chunks.reduce((s, c) => s + c.count, 0);

  console.log(`[generate-estimate] Scope: ${reno ? 'RENOVATION/TI' : 'NEW CONSTRUCTION'}`);
  console.log(`[generate-estimate] Chunks: ${totalChunks}, target items: ${totalTargetItems}`);
  console.log(`[generate-estimate] Budget: ${project?.target_budget ? '$' + Number(project.target_budget).toLocaleString() : 'none'}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: 'start', totalBatches: totalChunks });

  // Planning call
  const planningContext = await runPlanningCall(client, description, project);

  let totalItems = 0;
  const failedChunkIndices = [];
  const allGeneratedItems  = [];

  // Parallel chunk generation
  const chunkPromises = chunks.map(chunk =>
    generateChunk(client, description, project, chunk, planningContext)
      .then(items => {
        const withOrder = items.map((item, i) => ({ ...item, sort_order: chunk.sortStart + i }));
        totalItems += withOrder.length;
        allGeneratedItems.push(...withOrder);
        console.log(`[generate-estimate] Chunk "${chunk.name}" done: ${withOrder.length} items`);
        send({ type: 'batch', batchIndex: chunk.index, batchName: chunk.name, items: withOrder, itemCount: withOrder.length });
        return withOrder;
      })
      .catch(err => {
        Sentry.captureException(err);
        console.error(`[generate-estimate] Chunk "${chunk.name}" failed:`, err.message);
        failedChunkIndices.push(chunk.index);
        send({ type: 'batch_error', batchIndex: chunk.index, batchName: chunk.name, error: err.message });
        return null;
      })
  );

  const assumptionsPromise = generateAssumptions(client, project);
  const [, ai_assumptions] = await Promise.all([Promise.allSettled(chunkPromises), assumptionsPromise]);

  // Post-generation sanity check
  const sanityCheck = computeSanityCheck(allGeneratedItems, project);
  if (sanityCheck) {
    console.log(`[generate-estimate] SANITY CHECK: ${sanityCheck.type} — ratio ${sanityCheck.ratio}x`);
    console.log(`[generate-estimate] ${sanityCheck.message}`);
  }

  console.log(`[generate-estimate] Done — ${totalChunks - failedChunkIndices.length}/${totalChunks} chunks, ${totalItems} items`);

  send({
    type:         'done',
    totalItems,
    globals:      inferGlobals(project),
    ai_assumptions: ai_assumptions || [],
    failedChunks: failedChunkIndices,
    sanityCheck,
  });
  res.end();
}
