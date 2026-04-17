import { useState, useEffect } from 'react';
import { getProjects, getOrgProjects, createProject, getScenarios, createLineItems, duplicateProject } from '../supabase/db';
import { analytics } from '../analytics';
import { OrgAvatar, OrgMenu } from './OrgSettings';

// ── Sample project seed data (25 items, 5 categories) ───────────────────────
const _si = (cat, sub, desc, qmin, qmax, unit, low, mid, high, sens, order) => ({
  category: cat, subcategory: sub, description: desc,
  qty_min: qmin, qty_max: qmax, unit,
  unit_cost_low: low, unit_cost_mid: mid, unit_cost_high: high,
  sensitivity: sens, in_summary: true, is_archived: false,
  sort_order: order, basis: null, notes: null,
});

const SAMPLE_LINE_ITEMS = [
  _si('Shell','Structure','Concrete structure & foundations',85000,85000,'SF',45,55,68,'High',0),
  _si('Shell','Envelope','Building envelope & curtain wall',14000,18000,'SF',95,120,148,'High',1),
  _si('Shell','Roofing','Roofing system (TPO/PVC)',21000,21000,'SF',20,27,36,'Medium',2),
  _si('Shell','Glazing','Exterior glazing & storefront entries',2500,4000,'SF',70,90,120,'Medium',3),
  _si('Shell','Structure','Structural steel — long-span library',120,180,'TON',7000,8500,10500,'Medium',4),

  _si('Interiors','Partitions','Interior partitions & framing',85000,110000,'SF',13,17,24,'Medium',5),
  _si('Interiors','Flooring','Floor finishes (carpet, VCT, concrete)',85000,85000,'SF',11,16,22,'Medium',6),
  _si('Interiors','Ceilings','Ceiling finishes (ACT, GWB, open)',72000,72000,'SF',8,12,18,'Low',7),
  _si('Interiors','Doors','Interior doors & hardware',160,220,'each',1800,2700,3900,'Medium',8),
  _si('Interiors','Specialties','Signage & wayfinding system',1,1,'LS',140000,270000,440000,'Medium',9),
  _si('Interiors','Glazing','Interior glazed partitions & sidelights',4000,7000,'SF',58,82,115,'Medium',10),

  _si('Services','Mechanical','HVAC & mechanical systems',85000,85000,'SF',32,43,56,'High',11),
  _si('Services','Plumbing','Plumbing & fixtures',85000,85000,'SF',13,18,24,'Medium',12),
  _si('Services','Fire Protection','Fire protection sprinkler system',85000,85000,'SF',6,8,12,'Low',13),
  _si('Services','Electrical','Electrical & lighting',85000,85000,'SF',22,30,42,'Medium',14),
  _si('Services','Technology','Data, AV & security systems',85000,85000,'SF',10,15,22,'Medium',15),
  _si('Services','Vertical Transport','Elevators',3,3,'each',95000,125000,168000,'Medium',16),
  _si('Services','Controls','Building automation system (BAS)',1,1,'LS',420000,640000,880000,'High',17),

  _si('Sitework','Earthwork','Site preparation, grading & utilities',2,2,'acres',88000,130000,175000,'High',18),
  _si('Sitework','Hardscape','Hardscape, paving & walks',18000,24000,'SF',12,18,28,'Medium',19),
  _si('Sitework','Landscape','Landscaping & irrigation',12000,18000,'SF',8,14,22,'Low',20),
  _si('Sitework','Utilities','Site utility connections',1,1,'LS',175000,280000,420000,'High',21),

  _si('General Conditions','Supervision','General conditions & project supervision',85000,85000,'SF',14,18,24,'Medium',22),
  _si('General Conditions','Temporary','Temporary facilities & protection',1,1,'LS',110000,180000,270000,'Medium',23),
  _si('General Conditions','Insurance','Insurance, bonds & permits allowance',1,1,'LS',175000,275000,370000,'Medium',24),
];

const isLockError = (err) => {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('lock') && (msg.includes('stole') || msg.includes('released'));
};

const ACCENT = '#B89030';
const HEADER = '#222222';
const BG = '#F9F9F8';

const BUILDING_TYPES = [
  'Civic/Library', 'K-12 Education', 'Higher Education', 'Healthcare/Hospital',
  'Office', 'High-Rise Residential', 'Mid-Rise Residential', 'Low-Rise Residential',
  'Hotel/Hospitality', 'Mixed-Use', 'Retail', 'Industrial/Warehouse',
  'Data Center', 'Arena/Stadium', 'Parking Structure', 'Religious/Worship',
  'Restaurant', 'Laboratory/Research', 'Courthouse', 'Fire/Police Station',
  'Community Center', 'Museum', 'Performing Arts', 'Convention Center',
  'Airport Terminal', 'Transit Station', 'Water/Wastewater', 'Other',
];

const DELIVERY_METHODS = [
  'CM at Risk (GMP)', 'Design-Bid-Build', 'Design-Build',
  'CM Multi-Prime', 'IPD', 'Construction Management Agency',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY',
];

const EMPTY_FORM = {
  name: '', city: '', state: '', building_type: '',
  delivery_method: '', target_budget: '', target_budget_tbd: false,
};

export default function ProjectDashboard({ user, org, orgRole, onSignOut, onSelectProject, onProjectCreated, onOrgSettings }) {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const loadProjects = async () => {
    setLoadingProjects(true);
    const { data } = org?.id
      ? await getOrgProjects(org.id)
      : await getProjects();
    setProjects(data || []);
    setLoadingProjects(false);
  };

  const handleCreateSample = async () => {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const { data, error } = await createProject(
        {
          name: 'Sample: 85,000 SF Civic Library',
          city: 'Burbank',
          state: 'CA',
          building_type: 'Civic/Library',
          delivery_method: 'CM at Risk (GMP)',
          gross_sf: 85000,
          target_budget: 45000000,
        },
        user.id,
        org?.id || null,
      );
      if (error || !data) {
        setFormError('Could not create sample project. Please try again.');
        return;
      }
      // Pre-seed sample items so auto-seed (180 items) doesn't run
      const { data: scenarios } = await getScenarios(data.id);
      const baseline = scenarios?.[0];
      if (baseline) {
        await createLineItems(baseline.id, SAMPLE_LINE_ITEMS);
      }
      analytics.projectCreated(data);
      onProjectCreated ? onProjectCreated(data) : onSelectProject(data);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { loadProjects(); }, [org?.id]);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const { data, error } = await createProject(
        {
          name: form.name.trim(),
          city: form.city.trim(),
          state: form.state,
          building_type: form.building_type,
          delivery_method: form.delivery_method,
          labor_type: null,
          gross_sf: null,
          target_budget: (!form.target_budget_tbd && form.target_budget) ? parseFloat(form.target_budget) : null,
        },
        user.id,
        org?.id || null,
      );
      if (error) {
        console.error('[handleCreate] createProject error:', error);
        if (isLockError(error)) {
          const { data: existing } = org?.id ? await getOrgProjects(org.id) : await getProjects();
          const created = existing?.find(p => p.name === form.name.trim());
          if (created) {
            setForm(EMPTY_FORM);
            setShowForm(false);
            analytics.projectCreated(created);
            onProjectCreated ? onProjectCreated(created) : onSelectProject(created);
            return;
          }
          setFormError('Project creation failed due to a temporary issue. Please try again.');
        } else {
          const detail = [error.code, error.message].filter(Boolean).join(': ');
          setFormError(detail || 'Project creation failed. Check the browser console for details.');
        }
      } else {
        setForm(EMPTY_FORM);
        setShowForm(false);
        if (data) {
          analytics.projectCreated(data);
          onProjectCreated ? onProjectCreated(data) : onSelectProject(data);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const fmtBudget = (n) => {
    if (!n) return null;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: HEADER, height: 56, padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          color: ACCENT, fontFamily: "'Archivo', sans-serif",
          fontWeight: 800, fontSize: 18, letterSpacing: 2,
        }}>
          COSTDECK
        </span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: '1px solid #3a3a3a',
              borderRadius: 8, padding: '5px 12px 5px 8px',
              cursor: 'pointer',
            }}
          >
            <OrgAvatar org={org} size={26} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              {org && (
                <span style={{ color: '#ddd', fontFamily: "'Figtree', sans-serif", fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
                  {org.name}
                </span>
              )}
              <span style={{ color: '#888', fontFamily: "'Figtree', sans-serif", fontSize: 11, lineHeight: 1 }}>
                {user.email}
              </span>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showMenu && (
            <OrgMenu
              org={org}
              user={user}
              onOrgSettings={(tab) => { setShowMenu(false); onOrgSettings(tab); }}
              onSignOut={onSignOut}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 880, width: '100%', margin: '0 auto', padding: '44px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{
              fontFamily: "'Archivo', sans-serif", fontWeight: 800,
              fontSize: 28, color: '#111', marginBottom: 6,
            }}>
              {org ? org.name : 'Projects'}
            </h1>
            <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14 }}>
              {org
                ? `All active projects for ${org.name}.`
                : 'Select a project to open it, or create a new one.'}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setFormError(null); }}
            style={{
              background: showForm ? '#f0f0ee' : ACCENT,
              color: showForm ? '#555' : '#fff',
              border: showForm ? '1px solid #ddd' : 'none',
              borderRadius: 8, padding: '10px 20px',
              fontFamily: "'Archivo', sans-serif", fontWeight: 700,
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              marginTop: 4,
            }}
          >
            {showForm ? 'Cancel' : '+ New Project'}
          </button>
        </div>

        {showForm && (
          <div style={{
            background: '#fff', border: '1px solid #e6e6e2',
            borderRadius: 12, padding: '28px 28px 24px',
            marginBottom: 28,
            boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
          }}>
            <h2 style={{
              fontFamily: "'Archivo', sans-serif", fontWeight: 700,
              fontSize: 17, color: '#111', marginBottom: 6,
            }}>
              New Project
            </h2>
            <p style={{
              fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#999', marginBottom: 22,
            }}>
              Enter the basics — you'll add size, scope, and technical details on the next screen.
            </p>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>

                <FormField label="Project Name" required span={2}>
                  <FormInput
                    value={form.name} onChange={set('name')}
                    placeholder="e.g. Downtown Civic Center" required
                  />
                </FormField>

                <FormField label="City" required>
                  <FormInput value={form.city} onChange={set('city')} placeholder="e.g. Los Angeles" required />
                </FormField>

                <FormField label="State" required>
                  <FormSelect value={form.state} onChange={set('state')} options={US_STATES} required />
                </FormField>

                <FormField label="Building Type" required>
                  <FormSelect value={form.building_type} onChange={set('building_type')} options={BUILDING_TYPES} required />
                </FormField>

                <FormField label="Delivery Method" required>
                  <FormSelect value={form.delivery_method} onChange={set('delivery_method')} options={DELIVERY_METHODS} required />
                </FormField>

                <FormField label="Target Budget ($)">
                  <FormInput
                    type="number"
                    value={form.target_budget_tbd ? '' : form.target_budget}
                    onChange={set('target_budget')}
                    placeholder="45,000,000"
                    min="0"
                    disabled={form.target_budget_tbd}
                  />
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 7, marginTop: 8,
                    cursor: 'pointer', fontFamily: "'Figtree', sans-serif",
                    fontSize: 12, color: '#666', userSelect: 'none',
                  }}>
                    <input
                      type="checkbox"
                      checked={form.target_budget_tbd}
                      onChange={e => {
                        set('target_budget_tbd')(e.target.checked);
                        if (e.target.checked) set('target_budget')('');
                      }}
                      style={{ width: 14, height: 14, accentColor: ACCENT, cursor: 'pointer' }}
                    />
                    TBD / Unknown
                  </label>
                </FormField>

              </div>

              {formError && (
                <p style={{
                  color: '#c0392b', fontFamily: "'Figtree', sans-serif",
                  fontSize: 13, marginTop: 14,
                }}>
                  {formError}
                </p>
              )}

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null); }}
                  style={{
                    background: 'none', border: '1px solid #ddd', borderRadius: 7,
                    padding: '9px 20px', fontFamily: "'Figtree', sans-serif",
                    fontSize: 13, color: '#555', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: saving ? '#d4b86a' : ACCENT,
                    color: '#fff', border: 'none', borderRadius: 7,
                    padding: '9px 22px', fontFamily: "'Archivo', sans-serif",
                    fontWeight: 700, fontSize: 13,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Creating…' : 'Continue →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loadingProjects ? (
          <div style={{
            textAlign: 'center', padding: 64,
            fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 14,
          }}>
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '56px 24px',
            background: '#fff', border: '1.5px dashed #d8d8d4',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🏛</div>
            <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: '#111', marginBottom: 8 }}>
              Create your first estimate in 60 seconds
            </h2>
            <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
              Build a detailed construction cost model with AI-powered line items, scenario comparisons, and PDF exports.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowForm(true); setFormError(null); }}
                style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                + New Project
              </button>
              <button
                onClick={handleCreateSample}
                disabled={saving}
                style={{ background: '#fff', color: '#555', border: '1.5px solid #ddd', borderRadius: 8, padding: '12px 24px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer' }}
              >
                {saving ? 'Creating sample…' : 'Try a Sample Project →'}
              </button>
            </div>
            {formError && <p style={{ color: '#c0392b', fontFamily: "'Figtree', sans-serif", fontSize: 13, marginTop: 16 }}>{formError}</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onSelect={onSelectProject}
                fmtBudget={fmtBudget}
                userId={user.id}
                onDuplicated={loadProjects}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project: p, onSelect, fmtBudget, userId, onDuplicated }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const menuRef = useState(null)[0];

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setDuplicating(true);
    await duplicateProject(p.id, userId);
    setDuplicating(false);
    if (onDuplicated) onDuplicated();
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{ position: 'relative' }}
    >
      <button
        onClick={() => onSelect(p)}
        style={{
          background: '#fff',
          border: `1px solid ${hovered ? ACCENT : '#e6e6e2'}`,
          borderRadius: 10, padding: '18px 22px',
          textAlign: 'left', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: hovered ? '0 2px 12px rgba(184,144,48,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 5 }}>
            {p.name}
          </div>
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#999', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
            {(p.city || p.state) && <span>{[p.city, p.state].filter(Boolean).join(', ')}</span>}
            {p.building_type && <span>· {p.building_type}</span>}
            {p.gross_sf && <span>· {p.gross_sf.toLocaleString()} SF</span>}
            {p.target_budget && <span>· {fmtBudget(p.target_budget)} budget</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 16 }}>
          {p.delivery_method && (
            <span style={{ background: '#f2f2ef', borderRadius: 5, padding: '3px 9px', fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
              {p.delivery_method}
            </span>
          )}
          {p.labor_type && (
            <span style={{ background: '#fdf6e3', borderRadius: 5, padding: '3px 9px', fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#8a6a1a', whiteSpace: 'nowrap' }}>
              {p.labor_type}
            </span>
          )}
          <span style={{ color: ACCENT, fontSize: 20, fontWeight: 300, marginLeft: 4 }}>›</span>
        </div>
      </button>

      {/* Three-dot menu button */}
      {hovered && (
        <div style={{ position: 'absolute', top: '50%', right: 52, transform: 'translateY(-50%)', zIndex: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{ background: menuOpen ? '#f0f0ee' : '#fff', border: '1px solid #e0e0dc', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 16, color: '#888', lineHeight: 1 }}
            title="More options"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', right: 0, top: 34, background: '#fff', border: '1px solid #e6e6e2', borderRadius: 8, padding: 4, zIndex: 100, minWidth: 150, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}
            >
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 14px', fontSize: 13, fontFamily: "'Figtree', sans-serif", cursor: duplicating ? 'default' : 'pointer', color: duplicating ? '#aaa' : '#333', borderRadius: 4 }}
              >
                {duplicating ? 'Duplicating…' : '⧉ Duplicate'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, required, span, children }) {
  return (
    <div style={span === 2 ? { gridColumn: 'span 2' } : {}}>
      <label style={{
        display: 'block', fontFamily: "'Figtree', sans-serif",
        fontSize: 12, fontWeight: 600, color: '#555',
        marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4,
      }}>
        {label}
        {required && <span style={{ color: ACCENT, marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FormInput({ value, onChange, placeholder, type = 'text', required, min, disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px',
        border: '1.5px solid #e0e0dc', borderRadius: 7,
        fontFamily: "'Figtree', sans-serif", fontSize: 14,
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
        background: disabled ? '#f5f5f3' : '#fff',
        color: disabled ? '#aaa' : '#111',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = ACCENT; }}
      onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
    />
  );
}

function FormSelect({ value, onChange, options, required }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      style={{
        width: '100%', padding: '9px 12px',
        border: '1.5px solid #e0e0dc', borderRadius: 7,
        fontFamily: "'Figtree', sans-serif", fontSize: 14,
        outline: 'none', boxSizing: 'border-box',
        background: '#fff', cursor: 'pointer',
      }}
      onFocus={e => { e.target.style.borderColor = ACCENT; }}
      onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
    >
      <option value="">Select…</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
