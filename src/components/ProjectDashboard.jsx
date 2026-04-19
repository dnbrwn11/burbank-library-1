import { useState, useEffect, useMemo, useRef } from 'react';
import { getAllProjects, getOrgProjects, createProject, updateProject, deleteProject, getScenarios, createLineItems, duplicateProject } from '../supabase/db';
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

const STATUS_OPTIONS = ['active', 'on_hold', 'won', 'lost', 'archived'];
const STATUS_LABELS = { active: 'Active', on_hold: 'On Hold', won: 'Won', lost: 'Lost', archived: 'Archived' };
const STATUS_COLORS = {
  active:   { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  on_hold:  { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  won:      { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  lost:     { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  archived: { bg: '#f5f5f4', color: '#78716c', border: '#d6d3d1' },
};

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'budget', label: 'Budget' },
  { value: 'created', label: 'Date Created' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'archived', label: 'Archived' },
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
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [search, setSearch] = useState('');
  const [editingProject, setEditingProject] = useState(null);

  const loadProjects = async () => {
    setLoadingProjects(true);
    const { data } = org?.id
      ? await getOrgProjects(org.id)
      : await getAllProjects();
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
          const { data: existing } = org?.id ? await getOrgProjects(org.id) : await getAllProjects();
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

  const handleStatusChange = async (projectId, newStatus) => {
    await updateProject(projectId, { status: newStatus });
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
  };

  const handleDelete = async (projectId) => {
    await deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleRename = async (projectId, newName) => {
    if (!newName.trim()) return;
    await updateProject(projectId, { name: newName.trim() });
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName.trim() } : p));
    setEditingProject(null);
  };

  const fmtBudget = (n) => {
    if (!n) return null;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  const applySort = (list) => {
    if (sortBy === 'name')    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'budget')  return [...list].sort((a, b) => (b.target_budget || 0) - (a.target_budget || 0));
    if (sortBy === 'created') return [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return [...list].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  };

  const applySearch = (list) => {
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.building_type || '').toLowerCase().includes(q)
    );
  };

  const filteredProjects = useMemo(() => {
    // When viewing a specific non-archived status filter, show only that status
    if (filterStatus !== 'all') {
      return applySort(applySearch(projects.filter(p => (p.status || 'active') === filterStatus)));
    }
    // "All" view: exclude archived (they appear in the separate section below)
    return applySort(applySearch(projects.filter(p => (p.status || 'active') !== 'archived')));
  }, [projects, filterStatus, sortBy, search]);

  // Archived projects always shown in separate section (only when filter is 'all')
  const archivedProjects = useMemo(() => {
    if (filterStatus !== 'all') return [];
    return applySort(applySearch(projects.filter(p => (p.status || 'active') === 'archived')));
  }, [projects, filterStatus, sortBy, search]);

  const hasProjects = projects.length > 0;

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
                ? `All projects for ${org.name}.`
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
        ) : !hasProjects ? (
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
          <>
            {/* Toolbar: search + filter + sort */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, city, or type…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                    border: '1.5px solid #e0e0dc', borderRadius: 8,
                    fontFamily: "'Figtree', sans-serif", fontSize: 13,
                    outline: 'none', boxSizing: 'border-box', background: '#fff',
                  }}
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{
                  padding: '8px 12px', border: '1.5px solid #e0e0dc', borderRadius: 8,
                  fontFamily: "'Figtree', sans-serif", fontSize: 13,
                  background: '#fff', cursor: 'pointer', outline: 'none',
                }}
              >
                {FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: '8px 12px', border: '1.5px solid #e0e0dc', borderRadius: 8,
                  fontFamily: "'Figtree', sans-serif", fontSize: 13,
                  background: '#fff', cursor: 'pointer', outline: 'none',
                }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {filteredProjects.length === 0 && archivedProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 24px', fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 14 }}>
                No projects match your filter.
              </div>
            ) : (
              <>
                {filteredProjects.length === 0 && filterStatus === 'all' ? (
                  <div style={{ textAlign: 'center', padding: '24px', fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 14, background: '#fff', border: '1px solid #e6e6e2', borderRadius: 10 }}>
                    No active projects match your search.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredProjects.map(p => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onSelect={onSelectProject}
                        fmtBudget={fmtBudget}
                        userId={user.id}
                        onDuplicated={loadProjects}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        editingProject={editingProject}
                        setEditingProject={setEditingProject}
                        onRename={handleRename}
                      />
                    ))}
                  </div>
                )}

                {/* Archived projects section */}
                {archivedProjects.length > 0 && (
                  <ArchivedSection
                    archivedProjects={archivedProjects}
                    onSelect={onSelectProject}
                    fmtBudget={fmtBudget}
                    userId={user.id}
                    onDuplicated={loadProjects}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    editingProject={editingProject}
                    setEditingProject={setEditingProject}
                    onRename={handleRename}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ArchivedSection({ archivedProjects, ...cardProps }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 0', marginBottom: expanded ? 10 : 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5"
          style={{ transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>
          Archived Projects ({archivedProjects.length})
        </span>
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.75 }}>
          {archivedProjects.map(p => (
            <ProjectCard key={p.id} project={p} {...cardProps} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, onSelect, fmtBudget, userId, onDuplicated, onStatusChange, onDelete, editingProject, setEditingProject, onRename }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName] = useState('');
  const menuRef = useRef(null);
  const isEditing = editingProject === p.id;
  const status = p.status || 'active';
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.active;

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setDuplicating(true);
    await duplicateProject(p.id, userId);
    setDuplicating(false);
    if (onDuplicated) onDuplicated();
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    onStatusChange(p.id, status === 'archived' ? 'active' : 'archived');
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setMenuOpen(false);
    setConfirmDelete(false);
    onDelete(p.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setEditName(p.name);
    setEditingProject(p.id);
  };

  const handleStatusChange = (e, newStatus) => {
    e.stopPropagation();
    setMenuOpen(false);
    onStatusChange(p.id, newStatus);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); setConfirmDelete(false); }}
      style={{ position: 'relative' }}
    >
      {isEditing ? (
        <div style={{ background: '#fff', border: `1.5px solid ${ACCENT}`, borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRename(p.id, editName);
              if (e.key === 'Escape') setEditingProject(null);
            }}
            style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e0e0dc', borderRadius: 7, fontFamily: "'Figtree', sans-serif", fontSize: 14, outline: 'none' }}
          />
          <button onClick={() => onRename(p.id, editName)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
          <button onClick={() => setEditingProject(null)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 7, padding: '8px 14px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#555', cursor: 'pointer' }}>Cancel</button>
        </div>
      ) : (
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#111' }}>
                {p.name}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`,
                flexShrink: 0, fontFamily: "'Figtree', sans-serif",
              }}>
                {STATUS_LABELS[status] || status}
              </span>
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
      )}

      {/* Three-dot menu */}
      {hovered && !isEditing && (
        <div ref={menuRef} style={{ position: 'absolute', top: '50%', right: 52, transform: 'translateY(-50%)', zIndex: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); setConfirmDelete(false); }}
            style={{ background: menuOpen ? '#f0f0ee' : '#fff', border: '1px solid #e0e0dc', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 16, color: '#888', lineHeight: 1 }}
            title="More options"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', right: 0, top: 34, background: '#fff', border: '1px solid #e6e6e2', borderRadius: 8, padding: 4, zIndex: 100, minWidth: 190, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}
            >
              <MenuItem onClick={handleEdit}>✏ Edit Name</MenuItem>

              <div style={{ borderTop: '1px solid #f0f0ee', margin: '4px 0', padding: '4px 0' }}>
                <div style={{ padding: '4px 14px 2px', fontSize: 10, color: '#aaa', fontFamily: "'Figtree', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>Set Status</div>
                {STATUS_OPTIONS.filter(s => s !== (p.status || 'active')).map(s => (
                  <MenuItem key={s} onClick={(e) => handleStatusChange(e, s)}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s]?.color || '#888', marginRight: 8 }} />
                    {STATUS_LABELS[s]}
                  </MenuItem>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #f0f0ee', margin: '4px 0' }}>
                <MenuItem onClick={handleDuplicate} disabled={duplicating}>
                  {duplicating ? '⧉ Duplicating…' : '⧉ Duplicate'}
                </MenuItem>
                <MenuItem onClick={handleArchive}>
                  {status === 'archived' ? '↩ Unarchive' : '📁 Archive'}
                </MenuItem>
              </div>

              <div style={{ borderTop: '1px solid #f0f0ee', margin: '4px 0' }}>
                <MenuItem onClick={handleDelete} danger>
                  {confirmDelete ? 'Click again to confirm delete' : '🗑 Delete'}
                </MenuItem>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children, disabled, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: hov ? (danger ? '#fef2f2' : '#f9f9f8') : 'transparent',
        border: 'none', padding: '8px 14px', fontSize: 13,
        fontFamily: "'Figtree', sans-serif",
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? '#aaa' : danger ? '#dc2626' : '#333',
        borderRadius: 4,
      }}
    >
      {children}
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
