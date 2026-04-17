import { useState, useEffect } from 'react';
import { getScenarios, createLineItems, updateGlobals as saveGlobals } from '../supabase/db';

const ACCENT = '#B89030';
const HEADER = '#222222';
const BG = '#F9F9F8';

const PLACEHOLDERS = [
  "97,500 SF civic library — reading room, digital media lab, children's wing, underground parking. LEED Silver. Seismic Zone D.",
  "12-story Class A office tower, 220,000 SF. LEED Gold. 4-level parking podium, ground-floor retail.",
  "52-story residential high-rise, 450 units, 3-level podium parking, rooftop terrace, Phase 1 of master plan.",
  "85,000 SF K-12 campus — gymnasium, cafeteria, DSA compliance, phased to keep existing school open.",
  "65,000 SF outpatient medical building — imaging suite, 4 ORs, OSHPD compliance, emergency generator backup.",
  "8-story mixed-use TOD — ground-floor retail, 120 residential units above, 2-level underground parking.",
];

const CHIPS = [
  'LEED Gold certification',
  'Seismic Zone D reinforcement',
  'Rooftop solar PV',
  '3-level structured parking',
  'High-end lobby finishes',
  'Full MEP commissioning',
  'Prevailing wage labor',
  'Phased construction',
];

const TEMPLATES = [
  {
    label: 'Civic Library', icon: '📚',
    text: "New 97,500 SF public library and civic center. Three-story building with full-height reading room, digital media lab, children's wing with story room, community meeting rooms, maker space, and underground parking structure. LEED Silver target. Seismic Zone D.",
  },
  {
    label: 'K-12 School', icon: '🏫',
    text: "New 85,000 SF K-12 campus. Single-story classroom wings, two-story administration building, gymnasium with bleachers, cafeteria and full commercial kitchen, covered outdoor walkways. DSA-compliant. Phased to keep existing school operational.",
  },
  {
    label: 'High-Rise Residential', icon: '🏢',
    text: "52-story high-rise residential tower. 450 market-rate units (studios, 1BR, 2BR), 3-level podium parking (400 stalls), ground-floor retail, amenity deck on level 6, rooftop terrace. Concrete moment frame, Type I-A construction.",
  },
  {
    label: 'Office Building', icon: '🏬',
    text: "12-story Class A office building, 220,000 GSF. LEED Gold target. Open floor plates averaging 18,500 SF, two-story lobby, ground-floor retail, 4-level parking podium (600 stalls). Steel moment frame with concrete core.",
  },
  {
    label: 'Healthcare', icon: '🏥',
    text: "65,000 SF outpatient medical office building. Ground-floor imaging suite (MRI, CT, X-ray), second-floor ASC (4 ORs, PACU, sterile processing), upper floors general clinic. OSHPD compliant. N+1 emergency generator.",
  },
  {
    label: 'Data Center', icon: '💻',
    text: "Tier III data center, 40,000 SF. 15,000 SF critical whitespace, 8 MW IT load. N+1 UPS and generator redundancy, raised floor, precision cooling, fiber entry vaults, full security perimeter.",
  },
  {
    label: 'Mixed-Use', icon: '🏙️',
    text: "Mixed-use transit-oriented development. 8-story building: ground-floor retail/restaurant (8,000 SF), 7 floors residential (120 units, 1BR and 2BR), 2 levels underground parking (140 stalls), courtyard amenity deck, rooftop terrace.",
  },
  {
    label: 'Sports Arena', icon: '🏟️',
    text: "Multi-purpose indoor arena, 8,500 seats, 285,000 GSF. Main bowl with retractable seating, premium club level, 12 luxury suites, broadcast infrastructure, commercial kitchen, locker rooms, surface parking (1,800 stalls).",
  },
];

const STATUS_MSGS = [
  'Analyzing project scope…',
  'Calibrating to {city} market pricing…',
  'Generating CSI UniFormat line items…',
  'Applying regional labor rates…',
  'Computing quantities and unit costs…',
  'Validating estimate structure…',
];

const CSI_ORDER = [
  'A - Substructure', 'B - Shell', 'C - Interiors', 'D - Services',
  'E - Equipment & Furnishings', 'F - Special Construction', 'G - Sitework',
  'General Conditions', 'Owner Soft Costs',
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

export default function AIGenerator({ project, onSave, onSkip, onSignOut }) {
  const [step, setStep] = useState('describe');
  const [tab, setTab] = useState('describe');
  const [description, setDescription] = useState('');
  const [phIdx, setPhIdx] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [generatedData, setGeneratedData] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    if (step !== 'describe') return;
    const t = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== 'generating') return;
    const t = setInterval(() => setStatusIdx(i => (i + 1) % STATUS_MSGS.length), 2800);
    return () => clearInterval(t);
  }, [step]);

  const generate = async () => {
    const desc = description.trim();
    if (!desc) return;
    setStep('generating');
    setStatusIdx(0);
    setGenError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API returned ${res.status}`);
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('No line items returned from AI');
      setGeneratedData(data);
      setEditedItems(data.items.map((item, i) => ({ ...item, _key: i })));
      setCollapsed(Object.fromEntries(CSI_ORDER.map(c => [c, false])));
      setStep('review');
    } catch (err) {
      setGenError(err.message);
      setStep('error');
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
    try {
      const { data: scenarios, error: scErr } = await getScenarios(project.id);
      if (scErr || !scenarios?.length) throw new Error('Could not find project scenario');
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

      const { error: liErr } = await createLineItems(baseline.id, rows);
      if (liErr) throw new Error(liErr.message);

      await saveGlobals(baseline.id, generatedData.globals);
      onSave();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusMsg = STATUS_MSGS[statusIdx].replace('{city}', project.city || 'local');

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: HEADER, height: 56, padding: '0 28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>
          COSTDECK
        </span>
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

      {step === 'describe' && (
        <DescribeStep
          tab={tab} setTab={setTab}
          description={description} setDescription={setDescription}
          phIdx={phIdx} project={project}
          onGenerate={generate} onSkip={onSkip}
        />
      )}

      {step === 'generating' && <GeneratingStep statusMsg={statusMsg} />}

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
          saveError={saveError}
          onSave={saveAll}
          onRegenerate={() => { setStep('describe'); setGenError(null); }}
          onSkip={onSkip}
        />
      )}

      {step === 'error' && (
        <ErrorStep error={genError} onRetry={() => { setStep('describe'); setGenError(null); }} />
      )}
    </div>
  );
}

// ── DescribeStep ──────────────────────────────────────────────────────────────

function DescribeStep({ tab, setTab, description, setDescription, phIdx, project, onGenerate, onSkip }) {
  return (
    <main style={{ flex: 1, maxWidth: 860, width: '100%', margin: '0 auto', padding: '44px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Archivo', sans-serif", fontWeight: 800,
          fontSize: 26, color: '#111', marginBottom: 8,
        }}>
          Generate Your Estimate
        </h1>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14 }}>
          Describe your project and Claude will generate
          {project.gross_sf ? ` a calibrated ${Number(project.gross_sf).toLocaleString()} SF estimate` : ' a detailed estimate'} for {project.city || 'your location'}.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0dc', marginBottom: 28 }}>
        {[['describe', 'Describe Your Project'], ['template', 'Start from Template']].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: tab === t ? `2.5px solid ${ACCENT}` : '2.5px solid transparent',
              fontFamily: "'Archivo', sans-serif", fontWeight: 600,
              fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase',
              color: tab === t ? '#111' : '#aaa', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'describe' ? (
        <>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={PLACEHOLDERS[phIdx]}
            rows={6}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '14px 16px',
              fontSize: 14, fontFamily: "'Figtree', sans-serif", lineHeight: 1.6,
              border: '1.5px solid #e0e0dc', borderRadius: 10,
              resize: 'vertical', outline: 'none', color: '#111',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = ACCENT; }}
            onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa', alignSelf: 'center' }}>
              Add:
            </span>
            {CHIPS.map(chip => (
              <ChipButton
                key={chip}
                label={chip}
                onClick={() => setDescription(d => d.trim() ? `${d.trim()} ${chip.toLowerCase()}.` : chip)}
              />
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {TEMPLATES.map(tpl => (
            <TemplateCard
              key={tpl.label}
              tpl={tpl}
              active={description === tpl.text}
              onClick={() => { setDescription(tpl.text); setTab('describe'); }}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          onClick={onGenerate}
          disabled={!description.trim()}
          style={{
            background: description.trim() ? ACCENT : '#e0e0dc',
            color: description.trim() ? '#fff' : '#aaa',
            border: 'none', borderRadius: 8, padding: '12px 28px',
            fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14,
            cursor: description.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          Generate Estimate →
        </button>
      </div>
    </main>
  );
}

function ChipButton({ label, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#fdf6e3' : '#f5f5f2',
        border: `1px solid ${hov ? ACCENT : '#e0e0dc'}`,
        borderRadius: 20, padding: '5px 12px',
        fontFamily: "'Figtree', sans-serif", fontSize: 12,
        color: '#555', cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      + {label}
    </button>
  );
}

function TemplateCard({ tpl, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active ? '#fdf6e3' : '#fff',
        border: `1.5px solid ${active || hov ? ACCENT : '#e6e6e2'}`,
        borderRadius: 10, padding: '16px 14px', textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        boxShadow: hov ? '0 2px 10px rgba(184,144,48,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{tpl.icon}</div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 4 }}>
        {tpl.label}
      </div>
      <div style={{
        fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#999', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {tpl.text}
      </div>
    </button>
  );
}

// ── GeneratingStep ────────────────────────────────────────────────────────────

function GeneratingStep({ statusMsg }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes barSlide {
          0%   { width: 20%; margin-left: 0; }
          50%  { width: 45%; margin-left: 25%; }
          100% { width: 20%; margin-left: 80%; }
        }
      `}</style>
      <div style={{
        background: '#fff', border: '1px solid #e6e6e2', borderRadius: 16,
        padding: '48px 48px', textAlign: 'center', maxWidth: 440,
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #f0f0ee', borderTopColor: ACCENT,
          margin: '0 auto 24px',
          animation: 'spin 0.9s linear infinite',
        }} />
        <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: '#111', marginBottom: 10 }}>
          Generating Estimate
        </h2>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14, marginBottom: 28, lineHeight: 1.5, minHeight: 40 }}>
          {statusMsg}
        </p>
        <div style={{ width: '100%', height: 4, background: '#f0f0ee', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: ACCENT, borderRadius: 2, animation: 'barSlide 2s ease-in-out infinite' }} />
        </div>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#bbb', fontSize: 12, marginTop: 20 }}>
          This typically takes 20–40 seconds
        </p>
      </div>
    </div>
  );
}

// ── ReviewStep ────────────────────────────────────────────────────────────────

function ReviewStep({ project, items, globals, collapsed, setCollapsed, updateItem, deleteItem, saving, saveError, onSave, onRegenerate, onSkip }) {
  const categoryGroups = CSI_ORDER
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
      {/* Top bar */}
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
            {saving ? 'Saving…' : 'Save & Open Project →'}
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

      {/* Two-column layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Items column */}
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

        {/* Summary sidebar */}
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

function SummarySidebar({ project, globals, totalRaw, totalFull, psf, itemCount, saving, onSave, onSkip }) {
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
              fontSize: bold ? 13 : 11,
              fontWeight: bold ? 700 : 400,
              color: indent ? '#888' : (bold ? '#111' : '#555'),
              paddingLeft: indent ? 6 : 0,
            }}>
              {indent ? '+ ' : ''}{label}
            </span>
            <span style={{
              fontFamily: "'Figtree', sans-serif",
              fontSize: bold ? 14 : 11,
              fontWeight: bold ? 700 : 400,
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
          {saving ? 'Saving…' : 'Save & Open Project →'}
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
