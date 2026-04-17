import { useState } from 'react';
import { getScenarios, createLineItems, updateGlobals as saveGlobals } from '../supabase/db';
import { useGenerateEstimate } from '../../lib/useGenerateEstimate';
import GenerationProgress from './GenerationProgress';
import { useWindowSize } from '../hooks/useWindowSize';

const ACCENT = '#B89030';
const HEADER = '#222222';
const BG = '#F9F9F8';

// ── Form options ──────────────────────────────────────────────────────────────

const SCOPE_OPTS = ['New Construction', 'Renovation', 'Addition', 'Tenant Improvement', 'Demolition Only'];
const LABOR_OPTS = ['Prevailing Wage', 'Union', 'Open Shop'];
const RENO_SCOPE_OPTS = ['Gut Renovation', 'Cosmetic Refresh', 'Systems Upgrade', 'Seismic Retrofit', 'Historic Restoration', 'ADA Compliance'];
const OCCUPIED_OPTS = ['Yes — Phased', 'Yes — Off-Hours Only', 'No — Fully Vacant'];
const EXIST_STRUCT_OPTS = ['Steel Frame', 'Concrete Frame', 'Wood Frame', 'Masonry Bearing Wall', 'Unknown'];
const HAZMAT_OPTS = ['Yes — Confirmed', 'Assumed — ACM/LBP Likely', 'No — Survey Complete', 'Unknown — No Survey'];
const AMENITY_OPTS = ['Pool', 'Fitness Center', 'Clubhouse', 'Rooftop Deck', 'Dog Park', 'Co-Working', 'Package Lockers', 'EV Charging', 'Bike Storage'];
const STRUCTURE_OPTS = ['Steel Moment Frame', 'Steel Braced Frame', 'Cast-in-Place Concrete', 'Post-Tensioned Concrete', 'Precast Concrete', 'Wood Frame — Type V', 'Wood Frame — Type III', 'Mass Timber / CLT', 'Masonry Bearing Wall', 'Tilt-Up Concrete', 'Pre-Engineered Metal', 'Hybrid', 'Unknown'];
const FOUNDATION_OPTS = ['Spread Footings', 'Continuous Footings', 'Mat/Raft', 'Driven Piles', 'Drilled Caissons/Shafts', 'Helical Piles', 'Micropiles', 'Unknown'];
const PARKING_OPTS = ['None', 'Surface Lot', 'Above-Grade Structure', 'Subterranean — 1 Level', 'Subterranean — 2+ Levels', 'Podium', 'Unknown'];
const SITE_OPTS = ['Greenfield — Open', 'Urban — Constrained Access', 'Brownfield — Remediation Likely', 'Hillside — Significant Grading', 'Waterfront', 'Unknown'];
const SOIL_OPTS = ['Normal', 'Rock — Blasting Likely', 'High Water Table', 'Poor Soils — Surcharge Needed', 'Unknown'];
const ENVELOPE_OPTS = ['Curtain Wall', 'Storefront Glazing', 'Brick Veneer', 'Metal Panel — ACM/MCM', 'Fiber Cement Panel', 'Stucco/EIFS', 'Precast Concrete', 'Stone Veneer', 'Glass Fiber Reinforced Concrete', 'Wood/Composite Siding', 'Mixed/Multiple Systems', 'Unknown'];
const ROOFING_OPTS = ['TPO/PVC Membrane', 'Modified Bitumen', 'Standing Seam Metal', 'Built-Up', 'Green/Vegetated Roof', 'Shingle', 'Tile', 'Unknown'];
const HVAC_OPTS = ['VAV with Central Plant', 'VRF/VRV', 'Split Systems / Mini-Split', 'Packaged Rooftop Units', 'Chilled Beams', 'Geothermal', 'Radiant', '4-Pipe Fan Coil', 'DOAS + ERV', 'Unknown'];
const ELECTRICAL_OPTS = ['Normal Power', 'High Power — Data/Lab', 'Emergency Generator — Full', 'Emergency Generator — Life Safety Only', 'Solar PV Included', 'Unknown'];
const FIRE_OPTS = ['Full Wet Sprinkler', 'Partial Sprinkler', 'Dry System', 'Pre-Action — Data/Archive', 'Special Suppression — Clean Agent', 'None', 'Unknown'];
const SUSTAIN_OPTS = ['None / Code Minimum', 'LEED Silver', 'LEED Gold', 'LEED Platinum', 'Net Zero Energy', 'Net Zero Carbon', 'Living Building Challenge', 'Passive House', 'WELL Certified', 'Fitwel', 'CalGreen Tier 1', 'CalGreen Tier 2', 'Unknown'];
const ELEVATOR_OPTS = ['None', 'Hydraulic', 'Traction — Low-Rise', 'Traction — High-Rise', 'Machine-Room-Less', 'Freight Only', 'Unknown'];

const EMPTY_GEN_FORM = {
  scope: '', labor_type: '', gross_sf: '', stories: '',
  reno_scope: '', occupied: '', existing_structure: '', hazmat: '',
  total_units: '', unit_mix: '', amenities: [],
  structure_type: '', foundation_type: '', parking: '', parking_stalls: '',
  site_conditions: '', soil_conditions: '',
  exterior_envelope: '', roofing: '', hvac: '', electrical_service: '',
  fire_protection: '', sustainability: '', elevators: '', num_elevators: '',
  description: '',
  contingency: '', gc_fee: '', general_conditions: '', escalation: '',
  labor_burden: '', sales_tax: '', insurance: '', bond: '', region_factor: '',
};

// ── Build rich text description from form fields ──────────────────────────────
function buildDescriptionFromForm(form, project) {
  const parts = [];

  if (form.scope) parts.push(form.scope);
  if (form.gross_sf) parts.push(`${Number(form.gross_sf).toLocaleString()} SF`);
  if (form.stories) parts.push(`${form.stories}-story`);

  const type = project.building_type || '';
  const city = project.city || '';
  const state = project.state || '';
  if (type) parts.push(type);
  if (city || state) parts.push(`in ${[city, state].filter(Boolean).join(', ')}`);

  if (project.delivery_method) parts.push(`${project.delivery_method} delivery`);
  if (form.labor_type) parts.push(`${form.labor_type} labor`);

  if (form.structure_type && form.structure_type !== 'Unknown') parts.push(`${form.structure_type} structure`);
  if (form.foundation_type && form.foundation_type !== 'Unknown') parts.push(`${form.foundation_type} foundation`);

  if (form.parking && form.parking !== 'None' && form.parking !== 'Unknown') {
    let p = form.parking;
    if (form.parking_stalls) p += ` (${form.parking_stalls} stalls)`;
    parts.push(`${p} parking`);
  }

  if (form.site_conditions && form.site_conditions !== 'Unknown') parts.push(`${form.site_conditions} site`);
  if (form.soil_conditions && form.soil_conditions !== 'Unknown') parts.push(`${form.soil_conditions} soil`);
  if (form.exterior_envelope && form.exterior_envelope !== 'Unknown') parts.push(`${form.exterior_envelope} facade`);
  if (form.roofing && form.roofing !== 'Unknown') parts.push(`${form.roofing} roof`);
  if (form.hvac && form.hvac !== 'Unknown') parts.push(`${form.hvac} HVAC`);
  if (form.electrical_service && form.electrical_service !== 'Unknown') parts.push(`${form.electrical_service} electrical`);
  if (form.fire_protection && form.fire_protection !== 'Unknown' && form.fire_protection !== 'None') {
    parts.push(`${form.fire_protection} fire protection`);
  }
  if (form.sustainability && form.sustainability !== 'Unknown' && form.sustainability !== 'None / Code Minimum') {
    parts.push(`${form.sustainability} sustainability target`);
  }
  if (form.elevators && form.elevators !== 'None' && form.elevators !== 'Unknown') {
    const e = form.num_elevators
      ? `${form.num_elevators} ${form.elevators} elevator(s)`
      : `${form.elevators} elevator(s)`;
    parts.push(e);
  }

  if (form.total_units) parts.push(`${form.total_units} residential units`);
  if (form.unit_mix) parts.push(`Unit mix: ${form.unit_mix}`);
  if (form.amenities?.length) parts.push(`Amenities: ${form.amenities.join(', ')}`);

  if (['Renovation', 'Addition', 'Tenant Improvement'].includes(form.scope)) {
    if (form.reno_scope) parts.push(`${form.reno_scope} renovation scope`);
    if (form.occupied && form.occupied !== 'No — Fully Vacant') {
      parts.push(`Occupied during construction: ${form.occupied}`);
    }
    if (form.existing_structure && form.existing_structure !== 'Unknown') {
      parts.push(`Existing structure: ${form.existing_structure}`);
    }
    if (form.hazmat && form.hazmat !== 'No — Survey Complete') {
      parts.push(`Hazmat: ${form.hazmat}`);
    }
  }

  if (project.target_budget) parts.push(`Target budget: $${Number(project.target_budget).toLocaleString()}`);

  let base = parts.join('. ');
  if (base && !base.endsWith('.')) base += '.';
  if (form.description?.trim()) base = base ? `${base} ${form.description.trim()}` : form.description.trim();

  return base;
}

// ── Review helpers ────────────────────────────────────────────────────────────

const CSI_ORDER = [
  'Substructure', 'Shell', 'Interiors', 'Services', 'Equipment',
  'Special Construction', 'Sitework', 'General Conditions', 'Overhead & Fee', 'Contingency',
];

function fmtM(n) {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function pct(n) {
  if (!n && n !== 0) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function itemMidCost(item) {
  const qty = Number(item.qty_min) === Number(item.qty_max)
    ? Number(item.qty_min)
    : (Number(item.qty_min) + Number(item.qty_max)) / 2;
  return (qty || 0) * (Number(item.unit_cost_mid) || 0);
}

function applyGlobals(raw, g) {
  if (!g) return raw;
  return raw
    * (1 + (g.generalConditions || 0.09))
    * (1 + (g.contingency || 0.10))
    * (1 + (g.fee || 0.045))
    * (1 + (g.escalation || 0.04))
    * (1 + (g.bond || 0.008) + (g.insurance || 0.012))
    * (1 + (g.tax || 0.07));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIGenerator({ project, user, onSave, onSkip, onGoHome, onSignOut }) {
  const [step, setStep] = useState('form');
  const [generatedData, setGeneratedData] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 });
  const [saveError, setSaveError] = useState(null);
  const [genError, setGenError] = useState(null);

  const { generate: streamGenerate, progress } = useGenerateEstimate();

  const generate = async (formData) => {
    setStep('generating');
    setGenError(null);

    try {
      const desc = buildDescriptionFromForm(formData, project);
      const enrichedProject = { ...project, ...formData };
      const result = await streamGenerate(desc, enrichedProject);
      const lineItems = result?.items ?? [];
      if (!lineItems.length) throw new Error('No line items returned from AI');
      setGeneratedData({ lineItems, globals: result.globals });
      setEditedItems(lineItems.map((item, i) => ({ ...item, _key: i })));
      const allCats = [...new Set(lineItems.map(i => i.category))];
      setCollapsed(Object.fromEntries(allCats.map(c => [c, false])));
      setStep('review');
    } catch (err) {
      if (err.name !== 'AbortError') {
        setGenError(err.message || 'Generation failed');
        setStep('error');
      }
    }
  };

  const updateItem = (_key, field, value) => {
    setEditedItems(prev => prev.map(item => item._key === _key ? { ...item, [field]: value } : item));
  };

  const deleteItem = (_key) => {
    setEditedItems(prev => prev.filter(item => item._key !== _key));
  };

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveProgress({ saved: 0, total: 0 });

    const BATCH_SIZE = 10;
    const deadline = Date.now() + 90_000;

    const withTimeout = (promise, ms) =>
      Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('Request timed out')), ms))]);

    try {
      if (!user?.id) throw new Error('Not logged in — please refresh and try again');

      const { data: scenarios, error: scErr } = await withTimeout(getScenarios(project.id), 15_000);
      if (scErr) throw new Error(scErr.message);
      if (!scenarios?.length) throw new Error('Could not find project scenario');

      const baseline = scenarios.find(s => s.is_baseline) ?? scenarios[0];

      const rows = editedItems.map((item, idx) => ({
        category: item.category || 'General Conditions',
        subcategory: item.subcategory || '',
        description: item.description || '',
        qty_min: Number(item.qty_min) || 0,
        qty_max: Number(item.qty_max) || 0,
        unit: item.unit || 'LS',
        unit_cost_low: Number(item.unit_cost_low) || 0,
        unit_cost_mid: Number(item.unit_cost_mid) || 0,
        unit_cost_high: Number(item.unit_cost_high) || 0,
        basis: item.basis || null,
        sensitivity: item.sensitivity || 'Medium',
        notes: item.notes || null,
        in_summary: true,
        is_archived: false,
        sort_order: idx,
      }));

      setSaveProgress({ saved: 0, total: rows.length });

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        if (Date.now() > deadline) throw new Error('Save timed out after 90s — please try again');
        const batch = rows.slice(i, i + BATCH_SIZE);
        const batchMs = Math.min(20_000, deadline - Date.now());

        let lastErr;
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error } = await withTimeout(createLineItems(baseline.id, batch), batchMs);
          if (!error) { lastErr = null; break; }
          lastErr = error;
          if (attempt === 0) await new Promise(r => setTimeout(r, 600));
        }
        if (lastErr) throw new Error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${lastErr.message}`);

        setSaveProgress({ saved: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
        if (i + BATCH_SIZE < rows.length) await new Promise(r => setTimeout(r, 150));
      }

      const { error: glErr } = await withTimeout(saveGlobals(baseline.id, generatedData.globals), 10_000);
      if (glErr) throw new Error(glErr.message);

      onSave();
    } catch (err) {
      console.error('[AIGenerator] saveAll error:', err);
      setSaveError(err.message || 'Unknown error — check the browser console');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: HEADER, height: 56, padding: '0 28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={onGoHome}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: ACCENT, fontFamily: "'Archivo', sans-serif",
            fontWeight: 800, fontSize: 18, letterSpacing: 2,
          }}
        >
          COSTDECK
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#666', fontFamily: "'Figtree', sans-serif", fontSize: 13 }}>
            {project.name}
          </span>
          <button
            onClick={onSignOut}
            style={{
              background: 'none', border: '1px solid #444', borderRadius: 6,
              color: '#bbb', fontFamily: "'Figtree', sans-serif", fontSize: 12,
              padding: '5px 13px', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {step === 'form' && (
        <FormStep project={project} onGenerate={generate} onSkip={onSkip} />
      )}

      {step === 'generating' && <GenerationProgress progress={progress} />}

      {step === 'review' && (
        <ReviewStep
          project={project}
          items={editedItems}
          globals={generatedData?.globals}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          updateItem={updateItem}
          deleteItem={deleteItem}
          saving={saving}
          saveProgress={saveProgress}
          saveError={saveError}
          onSave={saveAll}
          onRegenerate={() => { setStep('form'); setGenError(null); }}
          onSkip={onSkip}
        />
      )}

      {step === 'error' && (
        <ErrorStep error={genError} onRetry={() => { setStep('form'); setGenError(null); }} />
      )}
    </div>
  );
}

// ── FormStep ──────────────────────────────────────────────────────────────────

function FormStep({ project, onGenerate, onSkip }) {
  const { mob } = useWindowSize();
  const [form, setForm] = useState(EMPTY_GEN_FORM);
  const [open, setOpen] = useState({
    basics: true, renovation: true, residential: true,
    structure: true, systems: true, description: true, markups: false,
  });

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));
  const toggle = (section) => setOpen(o => ({ ...o, [section]: !o[section] }));

  const toggleAmenity = (amenity) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter(a => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const showRenovation = ['Renovation', 'Addition', 'Tenant Improvement'].includes(form.scope);
  const bt = (project.building_type || '').toLowerCase();
  const showResidential = bt.includes('residential') || bt.includes('hotel') || bt.includes('mixed-use');
  const showParkingStalls = form.parking && form.parking !== 'None' && form.parking !== 'Unknown';
  const showNumElevators = form.elevators && form.elevators !== 'None' && form.elevators !== 'Unknown';

  const canGenerate = form.scope && form.labor_type && form.gross_sf && form.stories;

  const cols = mob ? '1fr' : '1fr 1fr';

  return (
    <main style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: mob ? '24px 16px 100px' : '36px 28px 100px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Archivo', sans-serif", fontWeight: 800,
            fontSize: mob ? 22 : 26, color: '#111', marginBottom: 6,
          }}>
            Generate Estimate
          </h1>
          <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14, margin: 0 }}>
            Tell us about your project and Claude will generate a calibrated estimate.
          </p>
        </div>

        {/* Project context bar */}
        <div style={{
          background: '#fff', border: '1px solid #e6e6e2', borderRadius: 10,
          padding: '14px 18px', marginBottom: 28,
          display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center',
        }}>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#111' }}>
            {project.name}
          </span>
          <span style={{ color: '#ddd' }}>|</span>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#666' }}>
            {[project.city, project.state].filter(Boolean).join(', ')}
          </span>
          {project.building_type && (
            <>
              <span style={{ color: '#ddd' }}>|</span>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#666' }}>
                {project.building_type}
              </span>
            </>
          )}
          {project.delivery_method && (
            <>
              <span style={{ color: '#ddd' }}>|</span>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#666' }}>
                {project.delivery_method}
              </span>
            </>
          )}
        </div>

        {/* ── Section 1: Project Basics ── */}
        <FormSection title="Project Basics" open={open.basics} onToggle={() => toggle('basics')}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '14px 20px' }}>
            <GField label="Scope of Work" required>
              <GSelect value={form.scope} onChange={set('scope')} options={SCOPE_OPTS} />
            </GField>
            <GField label="Labor Type" required>
              <GSelect value={form.labor_type} onChange={set('labor_type')} options={LABOR_OPTS} />
            </GField>
            <GField label="Gross SF" required>
              <GInput
                value={form.gross_sf} onChange={set('gross_sf')}
                placeholder="97,500" type="text" inputMode="numeric"
              />
            </GField>
            <GField label="Stories" required>
              <GInput
                value={form.stories} onChange={set('stories')}
                placeholder="e.g. 4" type="number" min="1"
              />
            </GField>
          </div>
        </FormSection>

        {/* ── Section 2: Renovation Details (conditional) ── */}
        <div style={{
          maxHeight: showRenovation ? '600px' : 0,
          opacity: showRenovation ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.25s ease',
          marginBottom: showRenovation ? 0 : 0,
        }}>
          <FormSection title="Renovation Details" open={open.renovation} onToggle={() => toggle('renovation')}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '14px 20px' }}>
              <GField label="Renovation Scope">
                <GSelect value={form.reno_scope} onChange={set('reno_scope')} options={RENO_SCOPE_OPTS} />
              </GField>
              <GField label="Occupied During Construction?">
                <GSelect value={form.occupied} onChange={set('occupied')} options={OCCUPIED_OPTS} />
              </GField>
              <GField label="Existing Structure Type">
                <GSelect value={form.existing_structure} onChange={set('existing_structure')} options={EXIST_STRUCT_OPTS} />
              </GField>
              <GField label="Hazmat Expected?">
                <GSelect value={form.hazmat} onChange={set('hazmat')} options={HAZMAT_OPTS} />
              </GField>
            </div>
          </FormSection>
        </div>

        {/* ── Section 3: Residential Details (conditional) ── */}
        <div style={{
          maxHeight: showResidential ? '600px' : 0,
          opacity: showResidential ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.25s ease',
        }}>
          <FormSection title="Residential Details" open={open.residential} onToggle={() => toggle('residential')}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '14px 20px' }}>
              <GField label="Total Units">
                <GInput value={form.total_units} onChange={set('total_units')} placeholder="e.g. 240" type="number" min="0" />
              </GField>
              <GField label="Unit Mix">
                <GInput value={form.unit_mix} onChange={set('unit_mix')} placeholder="e.g. 40 Studio, 80 1BR, 100 2BR" />
              </GField>
              <GField label="Amenities" span={2}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                  {AMENITY_OPTS.map(a => (
                    <label
                      key={a}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        background: form.amenities.includes(a) ? '#fdf6e3' : '#f5f5f2',
                        border: `1px solid ${form.amenities.includes(a) ? ACCENT : '#e0e0dc'}`,
                        borderRadius: 20, padding: '5px 12px',
                        fontFamily: "'Figtree', sans-serif", fontSize: 12,
                        color: form.amenities.includes(a) ? '#8a6a1a' : '#555',
                        transition: 'all 0.12s', userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.amenities.includes(a)}
                        onChange={() => toggleAmenity(a)}
                        style={{ display: 'none' }}
                      />
                      {form.amenities.includes(a) ? '✓ ' : '+ '}{a}
                    </label>
                  ))}
                </div>
              </GField>
            </div>
          </FormSection>
        </div>

        {/* ── Section 4: Structure and Site ── */}
        <FormSection title="Structure & Site" open={open.structure} onToggle={() => toggle('structure')}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '14px 20px' }}>
            <GField label="Structure Type">
              <GSelect value={form.structure_type} onChange={set('structure_type')} options={STRUCTURE_OPTS} />
            </GField>
            <GField label="Foundation Type">
              <GSelect value={form.foundation_type} onChange={set('foundation_type')} options={FOUNDATION_OPTS} />
            </GField>
            <GField label="Parking">
              <GSelect value={form.parking} onChange={set('parking')} options={PARKING_OPTS} />
            </GField>
            {showParkingStalls ? (
              <GField label="Parking Stalls">
                <GInput value={form.parking_stalls} onChange={set('parking_stalls')} placeholder="e.g. 350" type="number" min="0" />
              </GField>
            ) : <div />}
            <GField label="Site Conditions">
              <GSelect value={form.site_conditions} onChange={set('site_conditions')} options={SITE_OPTS} />
            </GField>
            <GField label="Soil Conditions">
              <GSelect value={form.soil_conditions} onChange={set('soil_conditions')} options={SOIL_OPTS} />
            </GField>
          </div>
        </FormSection>

        {/* ── Section 5: Building Systems ── */}
        <FormSection title="Building Systems" open={open.systems} onToggle={() => toggle('systems')}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '14px 20px' }}>
            <GField label="Exterior Envelope">
              <GSelect value={form.exterior_envelope} onChange={set('exterior_envelope')} options={ENVELOPE_OPTS} />
            </GField>
            <GField label="Roofing">
              <GSelect value={form.roofing} onChange={set('roofing')} options={ROOFING_OPTS} />
            </GField>
            <GField label="HVAC System">
              <GSelect value={form.hvac} onChange={set('hvac')} options={HVAC_OPTS} />
            </GField>
            <GField label="Electrical Service">
              <GSelect value={form.electrical_service} onChange={set('electrical_service')} options={ELECTRICAL_OPTS} />
            </GField>
            <GField label="Fire Protection">
              <GSelect value={form.fire_protection} onChange={set('fire_protection')} options={FIRE_OPTS} />
            </GField>
            <GField label="Sustainability Target">
              <GSelect value={form.sustainability} onChange={set('sustainability')} options={SUSTAIN_OPTS} />
            </GField>
            <GField label="Elevator / Vertical Transport">
              <GSelect value={form.elevators} onChange={set('elevators')} options={ELEVATOR_OPTS} />
            </GField>
            {showNumElevators ? (
              <GField label="Number of Elevators">
                <GInput value={form.num_elevators} onChange={set('num_elevators')} placeholder="e.g. 3" type="number" min="1" />
              </GField>
            ) : <div />}
          </div>
        </FormSection>

        {/* ── Section 6: Project Description ── */}
        <FormSection title="Project Description" open={open.description} onToggle={() => toggle('description')}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={form.description}
              onChange={e => set('description')(e.target.value)}
              placeholder="Describe anything else about the project — program spaces, special features, phasing, schedule constraints, unique conditions, LEED certification goals, DSA/OSHPD compliance requirements..."
              rows={5}
              maxLength={2000}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                fontSize: 14, fontFamily: "'Figtree', sans-serif", lineHeight: 1.6,
                border: '1.5px solid #e0e0dc', borderRadius: 8,
                resize: 'vertical', outline: 'none', color: '#111',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = ACCENT; }}
              onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
            />
            <span style={{
              position: 'absolute', bottom: 8, right: 10,
              fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#ccc',
            }}>
              {form.description.length}/2000
            </span>
          </div>
        </FormSection>

        {/* ── Section 7: Markups & Assumptions (collapsed by default) ── */}
        <FormSection
          title="Markups & Assumptions"
          subtitle="Customize markups (optional)"
          open={open.markups}
          onToggle={() => toggle('markups')}
        >
          <p style={{
            fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#999',
            marginBottom: 14, marginTop: 0,
          }}>
            Leave blank to use defaults. Values are percentages (e.g., enter "5" for 5%).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '14px 20px' }}>
            <GField label="Contingency %">
              <GInput value={form.contingency} onChange={set('contingency')} placeholder="5" type="number" min="0" step="0.1" />
            </GField>
            <GField label="GC Fee %">
              <GInput value={form.gc_fee} onChange={set('gc_fee')} placeholder="4.5" type="number" min="0" step="0.1" />
            </GField>
            <GField label="General Conditions %">
              <GInput value={form.general_conditions} onChange={set('general_conditions')} placeholder="8" type="number" min="0" step="0.1" />
            </GField>
            <GField label="Escalation %">
              <GInput value={form.escalation} onChange={set('escalation')} placeholder="4" type="number" min="0" step="0.1" />
            </GField>
            <GField label="Labor Burden %">
              <GInput value={form.labor_burden} onChange={set('labor_burden')} placeholder="42" type="number" min="0" step="0.1" />
            </GField>
            <GField label="Sales Tax %">
              <GInput value={form.sales_tax} onChange={set('sales_tax')} placeholder="9.75" type="number" min="0" step="0.01" />
            </GField>
            <GField label="Insurance %">
              <GInput value={form.insurance} onChange={set('insurance')} placeholder="1.2" type="number" min="0" step="0.01" />
            </GField>
            <GField label="Bond %">
              <GInput value={form.bond} onChange={set('bond')} placeholder="0.8" type="number" min="0" step="0.01" />
            </GField>
            <GField label="Region Factor" span={2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <GInput value={form.region_factor} onChange={set('region_factor')} placeholder="1.15" type="number" min="0.5" step="0.01" />
                <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#999', flexShrink: 0 }}>
                  1.0 = national average
                </span>
              </div>
            </GField>
          </div>
        </FormSection>

        {/* ── Bottom actions ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginTop: 8,
          flexWrap: 'wrap', gap: 12,
        }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontFamily: "'Figtree', sans-serif", fontSize: 13,
              color: '#aaa', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Skip — use default line items
          </button>
          <button
            onClick={() => canGenerate && onGenerate(form)}
            disabled={!canGenerate}
            style={{
              background: canGenerate ? ACCENT : '#e0e0dc',
              color: canGenerate ? '#fff' : '#aaa',
              border: 'none', borderRadius: 8, padding: '13px 32px',
              fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
              boxShadow: canGenerate ? '0 2px 12px rgba(184,144,48,0.3)' : 'none',
            }}
          >
            Generate Estimate →
          </button>
        </div>
        {!canGenerate && (
          <p style={{
            textAlign: 'right', fontFamily: "'Figtree', sans-serif",
            fontSize: 12, color: '#bbb', marginTop: 8,
          }}>
            Scope of work, labor type, gross SF, and stories are required
          </p>
        )}
      </div>
    </main>
  );
}

// ── FormSection ───────────────────────────────────────────────────────────────

function FormSection({ title, subtitle, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: open ? 18 : 4,
        }}
      >
        <span style={{
          color: '#B89030', fontFamily: "'Archivo', sans-serif",
          fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
          letterSpacing: 1.5, whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        {subtitle && !open && (
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa' }}>
            — {subtitle}
          </span>
        )}
        <div style={{ flex: 1, height: 1, background: '#e6e6e2' }} />
        <span style={{
          color: '#B89030', fontSize: 13, flexShrink: 0,
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>
          ▾
        </span>
      </button>
      <div style={{
        maxHeight: open ? '1200px' : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s ease',
      }}>
        <div style={{
          background: '#fff', border: '1px solid #e6e6e2', borderRadius: 10,
          padding: '20px 20px',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Form primitives ───────────────────────────────────────────────────────────

function GField({ label, required, span, children }) {
  return (
    <div style={span === 2 ? { gridColumn: '1/-1' } : {}}>
      <label style={{
        display: 'block', fontFamily: "'Figtree', sans-serif",
        fontSize: 11, fontWeight: 600, color: '#666',
        textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
      }}>
        {label}
        {required && <span style={{ color: '#B89030', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function GSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '9px 12px',
        border: '1.5px solid #e0e0dc', borderRadius: 7,
        fontFamily: "'Figtree', sans-serif", fontSize: 13,
        outline: 'none', boxSizing: 'border-box',
        background: '#fff', cursor: 'pointer',
        color: value ? '#111' : '#999',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 30,
      }}
      onFocus={e => { e.target.style.borderColor = '#B89030'; }}
      onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
    >
      <option value="" style={{ color: '#999' }}>—</option>
      {options.map(o => <option key={o} value={o} style={{ color: '#111' }}>{o}</option>)}
    </select>
  );
}

function GInput({ value, onChange, placeholder, type = 'text', min, step, inputMode }) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      style={{
        width: '100%', padding: '9px 12px',
        border: '1.5px solid #e0e0dc', borderRadius: 7,
        fontFamily: "'Figtree', sans-serif", fontSize: 13,
        outline: 'none', boxSizing: 'border-box', color: '#111',
        background: '#fff',
      }}
      onFocus={e => { e.target.style.borderColor = '#B89030'; }}
      onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
    />
  );
}

// ── ReviewStep ────────────────────────────────────────────────────────────────

function saveLabel(saving, saveProgress) {
  if (!saving) return 'Save & Open Project →';
  if (saveProgress.total > 0) return `Saving items… ${Math.min(saveProgress.saved, saveProgress.total)}/${saveProgress.total}`;
  return 'Saving…';
}

function ReviewStep({ project, items, globals, collapsed, setCollapsed, updateItem, deleteItem, saving, saveProgress, saveError, onSave, onRegenerate, onSkip }) {
  const uniqueCats = [...new Set(items.map(i => i.category))];
  const orderedCats = [
    ...CSI_ORDER.filter(c => uniqueCats.includes(c)),
    ...uniqueCats.filter(c => !CSI_ORDER.includes(c)),
  ];
  const categoryGroups = orderedCats
    .map(cat => ({ cat, items: items.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  const rawByCategory = {};
  let totalRaw = 0;
  items.forEach(item => {
    const sub = itemMidCost(item);
    rawByCategory[item.category] = (rawByCategory[item.category] || 0) + sub;
    totalRaw += sub;
  });
  const totalFull = applyGlobals(totalRaw, globals);
  const psf = globals?.buildingSF > 0 ? totalFull / globals.buildingSF : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{
        background: '#fff', borderBottom: '1px solid #e6e6e2',
        padding: '12px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#111' }}>
            AI-Generated Estimate
          </span>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#999', marginLeft: 14 }}>
            {items.length} items · {project.city}, {project.state}
            {project.gross_sf ? ` · ${Number(project.gross_sf).toLocaleString()} SF` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onRegenerate}
            style={{
              background: 'none', border: '1px solid #ddd', borderRadius: 7,
              padding: '8px 16px', fontFamily: "'Figtree', sans-serif",
              fontSize: 12, color: '#555', cursor: 'pointer',
            }}
          >
            ↺ Regenerate
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              background: saving ? '#d4b86a' : ACCENT, color: '#fff',
              border: 'none', borderRadius: 7, padding: '8px 20px',
              fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saveLabel(saving, saveProgress)}
          </button>
        </div>
      </div>

      {saveError && (
        <div style={{
          background: '#fef2f2', borderBottom: '1px solid #fca5a5',
          padding: '8px 24px', flexShrink: 0,
          fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#991b1b',
        }}>
          ⚠ {saveError}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {categoryGroups.map(({ cat, items: catItems }) => (
            <CategorySection
              key={cat}
              cat={cat}
              catItems={catItems}
              subtotal={rawByCategory[cat] || 0}
              collapsed={collapsed[cat] ?? false}
              onToggle={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
              updateItem={updateItem}
              deleteItem={deleteItem}
            />
          ))}
        </div>

        <div style={{
          width: 288, flexShrink: 0, borderLeft: '1px solid #e6e6e2',
          overflowY: 'auto', padding: '20px', background: '#fff',
        }}>
          <SummarySidebar
            project={project}
            globals={globals}
            totalRaw={totalRaw}
            totalFull={totalFull}
            psf={psf}
            itemCount={items.length}
            saving={saving}
            saveProgress={saveProgress}
            onSave={onSave}
            onSkip={onSkip}
          />
        </div>
      </div>
    </div>
  );
}

function CategorySection({ cat, catItems, subtotal, collapsed, onToggle, updateItem, deleteItem }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', background: '#f5f5f2',
          border: '1px solid #e6e6e2',
          borderRadius: collapsed ? 8 : '8px 8px 0 0',
          padding: '9px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, color: '#111' }}>
            {cat}
          </span>
          <span style={{
            fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#888',
            background: '#e8e8e4', borderRadius: 10, padding: '1px 7px',
          }}>
            {catItems.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: ACCENT, fontWeight: 600 }}>
            {fmtM(subtotal)}
          </span>
          <span style={{ color: '#aaa', fontSize: 13 }}>{collapsed ? '›' : '⌄'}</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ border: '1px solid #e6e6e2', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ background: '#fafaf8', borderBottom: '1px solid #ebebea' }}>
                  {['Description', 'Qty Min', 'Qty Max', 'Unit', 'Low $/U', 'Mid $/U', 'High $/U', 'Subtotal', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '6px 8px', fontFamily: "'Figtree', sans-serif",
                      fontSize: 10, fontWeight: 600, color: '#888',
                      textAlign: i === 0 ? 'left' : 'right',
                      whiteSpace: 'nowrap', letterSpacing: 0.3,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catItems.map((item, rowIdx) => (
                  <ItemRow
                    key={item._key}
                    item={item}
                    striped={rowIdx % 2 === 1}
                    updateItem={updateItem}
                    deleteItem={deleteItem}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, striped, updateItem, deleteItem }) {
  const sub = itemMidCost(item);

  const numInput = (field, val) => (
    <input
      type="number"
      value={val ?? ''}
      onChange={e => updateItem(item._key, field, e.target.value === '' ? 0 : Number(e.target.value))}
      style={{
        width: '100%', padding: '3px 4px', border: '1px solid transparent',
        borderRadius: 3, fontFamily: "'Figtree', sans-serif", fontSize: 12,
        textAlign: 'right', background: 'transparent', outline: 'none',
      }}
      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }}
    />
  );

  const txtInput = (field, val, align = 'left') => (
    <input
      type="text"
      value={val ?? ''}
      onChange={e => updateItem(item._key, field, e.target.value)}
      style={{
        width: '100%', padding: '3px 4px', border: '1px solid transparent',
        borderRadius: 3, fontFamily: "'Figtree', sans-serif", fontSize: 12,
        textAlign: align, color: '#222', background: 'transparent', outline: 'none',
      }}
      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }}
    />
  );

  return (
    <tr style={{ background: striped ? '#fcfcfb' : '#fff', borderBottom: '1px solid #f0f0ee' }}>
      <td style={{ padding: '4px 8px', minWidth: 200 }}>{txtInput('description', item.description)}</td>
      <td style={{ padding: '4px 8px', width: 72 }}>{numInput('qty_min', item.qty_min)}</td>
      <td style={{ padding: '4px 8px', width: 72 }}>{numInput('qty_max', item.qty_max)}</td>
      <td style={{ padding: '4px 8px', width: 50 }}>{txtInput('unit', item.unit, 'center')}</td>
      <td style={{ padding: '4px 8px', width: 70 }}>{numInput('unit_cost_low', item.unit_cost_low)}</td>
      <td style={{ padding: '4px 8px', width: 70 }}>{numInput('unit_cost_mid', item.unit_cost_mid)}</td>
      <td style={{ padding: '4px 8px', width: 70 }}>{numInput('unit_cost_high', item.unit_cost_high)}</td>
      <td style={{
        padding: '4px 8px', width: 82, textAlign: 'right',
        fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#444', whiteSpace: 'nowrap',
      }}>
        {fmtM(sub)}
      </td>
      <td style={{ padding: '4px 4px', width: 28, textAlign: 'center' }}>
        <button
          onClick={() => deleteItem(item._key)}
          title="Remove item"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#ccc', fontSize: 15, padding: '2px', lineHeight: 1, borderRadius: 3,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#c0392b'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#ccc'; }}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function SummarySidebar({ project, globals, totalRaw, totalFull, psf, itemCount, saving, saveProgress, onSave, onSkip }) {
  if (!globals) return null;
  const g = globals;

  const afterGC   = totalRaw   * (1 + (g.generalConditions || 0));
  const afterCont = afterGC    * (1 + (g.contingency || 0));
  const afterFee  = afterCont  * (1 + (g.fee || 0));
  const afterEsc  = afterFee   * (1 + (g.escalation || 0));
  const afterBI   = afterEsc   * (1 + (g.bond || 0) + (g.insurance || 0));
  const afterTax  = afterBI    * (1 + (g.tax || 0));

  const rows = [
    { label: 'Raw Installed Cost', value: totalRaw },
    { label: `Gen. Conditions (${pct(g.generalConditions)})`, value: afterGC - totalRaw, indent: true },
    { label: `Contingency (${pct(g.contingency)})`, value: afterCont - afterGC, indent: true },
    { label: `Fee (${pct(g.fee)})`, value: afterFee - afterCont, indent: true },
    { label: `Escalation (${pct(g.escalation)})`, value: afterEsc - afterFee, indent: true },
    { label: `Bond & Ins. (${pct((g.bond || 0) + (g.insurance || 0))})`, value: afterBI - afterEsc, indent: true },
    { label: `Tax (${pct(g.tax)})`, value: afterTax - afterBI, indent: true },
    { label: 'Total Project Cost', value: afterTax, bold: true },
  ];

  return (
    <div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>
        Summary
      </div>

      <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #efefec' }}>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#666', lineHeight: 1.9 }}>
          <div>{project.city}, {project.state}</div>
          {project.gross_sf && <div>{Number(project.gross_sf).toLocaleString()} SF</div>}
          {project.building_type && <div>{project.building_type}</div>}
          {project.labor_type && <div>{project.labor_type}</div>}
          <div style={{ color: '#aaa' }}>{itemCount} line items</div>
        </div>
      </div>

      <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #efefec' }}>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 10, color: '#aaa', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Applied Factors
        </div>
        {[
          ['Region Factor', `${(g.regionFactor || 1).toFixed(2)}×`],
          ['Labor Burden', pct(g.laborBurden)],
          ['Contingency', pct(g.contingency)],
          ['Tax Rate', pct(g.tax)],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#555', marginBottom: 4 }}>
            <span>{k}</span>
            <span style={{ color: '#333', fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        {rows.map(({ label, value, bold, indent }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: bold ? 0 : 5,
            paddingTop: bold ? 9 : 0,
            borderTop: bold ? '1.5px solid #e6e6e2' : 'none',
          }}>
            <span style={{
              fontFamily: "'Figtree', sans-serif",
              fontSize: bold ? 13 : 11, fontWeight: bold ? 700 : 400,
              color: indent ? '#888' : (bold ? '#111' : '#555'),
              paddingLeft: indent ? 6 : 0,
            }}>
              {indent ? '+ ' : ''}{label}
            </span>
            <span style={{
              fontFamily: "'Figtree', sans-serif",
              fontSize: bold ? 14 : 11, fontWeight: bold ? 700 : 400,
              color: bold ? ACCENT : '#666',
            }}>
              {fmtM(value)}
            </span>
          </div>
        ))}
        {psf > 0 && (
          <div style={{ marginTop: 6, fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#aaa', textAlign: 'right' }}>
            ${Math.round(psf).toLocaleString()} / SF
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            background: saving ? '#d4b86a' : ACCENT, color: '#fff',
            border: 'none', borderRadius: 8, padding: '11px 0', width: '100%',
            fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saveLabel(saving, saveProgress)}
        </button>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 8,
            padding: '9px 0', width: '100%',
            fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#888', cursor: 'pointer',
          }}
        >
          Discard &amp; use defaults
        </button>
      </div>
    </div>
  );
}

// ── ErrorStep ─────────────────────────────────────────────────────────────────

function ErrorStep({ error, onRetry }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        background: '#fff', border: '1px solid #fdd', borderRadius: 16,
        padding: '40px 48px', textAlign: 'center', maxWidth: 440,
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
        <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 18, color: '#333', marginBottom: 10 }}>
          Generation Failed
        </h2>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          {error || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={onRetry}
          style={{
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
            padding: '11px 28px', fontFamily: "'Archivo', sans-serif",
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
