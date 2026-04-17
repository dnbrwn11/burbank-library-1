import { useState, useEffect } from 'react';
import { getProjects, createProject } from '../supabase/db';
import { analytics } from '../analytics';

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

export default function ProjectDashboard({ user, onSignOut, onSelectProject, onProjectCreated }) {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadProjects = async () => {
    setLoadingProjects(true);
    const { data } = await getProjects();
    setProjects(data || []);
    setLoadingProjects(false);
  };

  useEffect(() => { loadProjects(); }, []);

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
      );
      if (error) {
        console.error('[handleCreate] createProject error:', error);
        if (isLockError(error)) {
          const { data: existing } = await getProjects();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#888', fontFamily: "'Figtree', sans-serif", fontSize: 13 }}>
            {user.email}
          </span>
          <button
            onClick={onSignOut}
            style={{
              background: 'none', border: '1px solid #444',
              borderRadius: 6, color: '#bbb',
              fontFamily: "'Figtree', sans-serif", fontSize: 12,
              padding: '5px 13px', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 880, width: '100%', margin: '0 auto', padding: '44px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{
              fontFamily: "'Archivo', sans-serif", fontWeight: 800,
              fontSize: 28, color: '#111', marginBottom: 6,
            }}>
              Projects
            </h1>
            <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14 }}>
              Select a project to open it, or create a new one.
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
            <p style={{ fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 15 }}>
              No projects yet. Create your first one to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={onSelectProject} fmtBudget={fmtBudget} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project: p, onSelect, fmtBudget }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onSelect(p)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        <div style={{
          fontFamily: "'Archivo', sans-serif", fontWeight: 700,
          fontSize: 16, color: '#111', marginBottom: 5,
        }}>
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
          <span style={{
            background: '#f2f2ef', borderRadius: 5, padding: '3px 9px',
            fontFamily: "'Figtree', sans-serif", fontSize: 11,
            color: '#666', whiteSpace: 'nowrap',
          }}>
            {p.delivery_method}
          </span>
        )}
        {p.labor_type && (
          <span style={{
            background: '#fdf6e3', borderRadius: 5, padding: '3px 9px',
            fontFamily: "'Figtree', sans-serif", fontSize: 11,
            color: '#8a6a1a', whiteSpace: 'nowrap',
          }}>
            {p.labor_type}
          </span>
        )}
        <span style={{ color: ACCENT, fontSize: 20, fontWeight: 300, marginLeft: 4 }}>›</span>
      </div>
    </button>
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
