import { useState, useMemo } from 'react';
import AIGenerator from './AIGenerator';
import { PROJECT_TEMPLATES, findTemplateForBuildingType, templateDescription, templatePsfRange } from '../../lib/templates';
import { useGenerateEstimate } from '../../lib/useGenerateEstimate';
import { getScenarios, createLineItems, updateScenario } from '../supabase/db';

const ACCENT  = '#B89030';
const HEADER  = '#222222';
const BORDER  = '#E5E5E0';
const BG      = '#F9F9F8';

// ── Building-type SVG icon ────────────────────────────────────────────────────

function BuildingIcon({ templateId, size = 44 }) {
  const color = '#555';
  const stroke = 1.6;
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (templateId) {
    case 'civic_library': return (
      <svg {...common}><path d="M8 14 L24 6 L40 14" /><rect x="10" y="14" width="28" height="26" /><path d="M16 20v16M24 20v16M32 20v16" /></svg>
    );
    case 'k12_school': return (
      <svg {...common}><rect x="6" y="16" width="36" height="26" /><path d="M6 16 L24 6 L42 16" /><rect x="20" y="28" width="8" height="14" /></svg>
    );
    case 'high_rise_residential': return (
      <svg {...common}><rect x="12" y="4" width="24" height="40" /><path d="M16 10h4M28 10h4M16 18h4M28 18h4M16 26h4M28 26h4M16 34h4M28 34h4" /></svg>
    );
    case 'office': return (
      <svg {...common}><rect x="8" y="8" width="32" height="36" /><path d="M14 14h4M22 14h4M30 14h4M14 22h4M22 22h4M30 22h4M14 30h4M22 30h4M30 30h4" /></svg>
    );
    case 'hospital': return (
      <svg {...common}><rect x="6" y="12" width="36" height="32" /><path d="M24 18v14M17 25h14" stroke={ACCENT} strokeWidth="2.5" /></svg>
    );
    case 'hotel': return (
      <svg {...common}><rect x="8" y="6" width="32" height="38" /><path d="M14 14h4M22 14h4M30 14h4M14 22h4M22 22h4M30 22h4M14 30h4M22 30h4M30 30h4" /><path d="M22 38h4v6h-4z" /></svg>
    );
    case 'arena': return (
      <svg {...common}><ellipse cx="24" cy="28" rx="18" ry="10" /><path d="M8 28 L8 38 A 16 10 0 0 0 40 38 L40 28" /><ellipse cx="24" cy="28" rx="10" ry="5" /></svg>
    );
    case 'data_center': return (
      <svg {...common}><rect x="6" y="10" width="36" height="8" /><rect x="6" y="22" width="36" height="8" /><rect x="6" y="34" width="36" height="8" /><circle cx="12" cy="14" r="1" fill={color} /><circle cx="12" cy="26" r="1" fill={color} /><circle cx="12" cy="38" r="1" fill={color} /></svg>
    );
    case 'mixed_use': return (
      <svg {...common}><rect x="6" y="6" width="36" height="38" /><path d="M6 32h36" strokeWidth="2.2" /><path d="M14 14h4M22 14h4M30 14h4M14 22h4M22 22h4M30 22h4M12 38h6M22 36v6M28 36v6M34 38h2" /></svg>
    );
    case 'warehouse': return (
      <svg {...common}><path d="M6 18 L24 8 L42 18 L42 42 L6 42 Z" /><rect x="14" y="26" width="8" height="16" /><rect x="26" y="26" width="8" height="16" /></svg>
    );
    default: return (
      <svg {...common}><rect x="8" y="10" width="32" height="34" /><path d="M8 10 L24 4 L40 10" /></svg>
    );
  }
}

// ── Template Modal ────────────────────────────────────────────────────────────

function TemplateModal({ template, project, onClose, onGenerate, isGenerating }) {
  const scopeType = project.scope_type || 'new_construction';
  const defaultAnythingElse = scopeType === 'renovation'
    ? 'Renovation of existing building, selective demolition, phased construction'
    : `${template.default_stories} stor${template.default_stories === 1 ? 'y' : 'ies'}, ${template.delivery_method}, ${template.labor_type}`;
  const [grossSf, setGrossSf] = useState(String(template.default_sf));
  const [anythingElse, setAnythingElse] = useState(defaultAnythingElse);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isGenerating) return;
    onGenerate({ template, grossSf: Number(grossSf) || template.default_sf, anythingElse: anythingElse.trim() });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: 28,
          maxWidth: 560, width: '100%', boxShadow: '0 12px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ background: '#fafaf8', borderRadius: 12, padding: 8, flexShrink: 0 }}>
            <BuildingIcon templateId={template.id} size={48} />
          </div>
          <div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, color: '#111' }}>
              {template.name}{scopeType === 'renovation' ? ' (Renovation)' : ''}
            </div>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#888', marginTop: 2 }}>
              {templatePsfRange(template, scopeType).label} · {template.typical_sf_range}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Gross SF
            </label>
            <input
              type="number" min="0" required value={grossSf} onChange={e => setGrossSf(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0dc', borderRadius: 7, fontFamily: "'Figtree', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Anything else?
            </label>
            <textarea
              value={anythingElse}
              onChange={e => setAnythingElse(e.target.value)}
              rows={4}
              placeholder="Add details like stories, labor type, delivery method, structural system, amenities, phasing, or any project-specific requirements"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0dc', borderRadius: 7, fontFamily: "'Figtree', sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button" onClick={onClose} disabled={isGenerating}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '10px 20px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#555', cursor: isGenerating ? 'not-allowed' : 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isGenerating}
              style={{ background: isGenerating ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: isGenerating ? 'not-allowed' : 'pointer' }}
            >
              {isGenerating ? 'Generating…' : 'Generate Estimate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Generation progress overlay ───────────────────────────────────────────────

function ProgressOverlay({ progress, onCancel }) {
  const pct = progress.totalBatches > 0 ? (progress.batch / progress.totalBatches) * 100 : 0;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '32px 36px', maxWidth: 440, width: '92%', textAlign: 'center', boxShadow: '0 12px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, color: '#111', marginBottom: 6 }}>
          Generating Estimate
        </div>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#888', marginBottom: 18 }}>
          Batch {Math.min(progress.batch, progress.totalBatches)} of {progress.totalBatches} — {progress.batchName || 'Preparing…'}
        </div>
        <div style={{ background: '#f0f0ee', borderRadius: 10, height: 10, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ background: ACCENT, height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
        </div>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: '1px solid #ddd', borderRadius: 7, padding: '7px 18px', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#555', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GenerateEstimateScreen({ project, user, onSave, onGoHome, onSignOut }) {
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [description, setDescription]   = useState('');
  const [descGrossSf, setDescGrossSf]   = useState('');
  const [error, setError] = useState(null);
  const { generate, cancel, progress, isGenerating } = useGenerateEstimate();

  const scopeType = project.scope_type || 'new_construction';
  const autoMatchTemplate = useMemo(
    () => findTemplateForBuildingType(project.building_type),
    [project.building_type],
  );

  // ── Save generated items to the baseline scenario ──────────────────────────
  const saveGeneratedItems = async (items, globals) => {
    const { data: scenarios } = await getScenarios(project.id);
    const baseline = scenarios?.find(s => s.is_baseline) || scenarios?.[0];
    if (!baseline) throw new Error('No baseline scenario found');
    const stamped = (items || []).map((it, idx) => ({
      ...it,
      in_summary: true,
      is_archived: false,
      sort_order: idx,
    }));
    if (stamped.length) await createLineItems(baseline.id, stamped);
    if (globals && typeof globals === 'object') {
      const mergedGlobals = { ...(baseline.globals || {}), ...globals };
      await updateScenario(baseline.id, { globals: mergedGlobals });
    }
  };

  // ── Path 1: template ───────────────────────────────────────────────────────
  const handleTemplateGenerate = async ({ template, grossSf, anythingElse }) => {
    setError(null);
    const ctx = templateDescription(template, scopeType);
    const lines = [
      `${template.name}${scopeType === 'renovation' ? ' (Renovation / TI)' : ''} for ${project.client_name || 'client'}${project.client_type ? ' (' + project.client_type + ')' : ''} at ${project.city || ''}, ${project.state || ''}.`,
      ctx,
    ];
    if (anythingElse) lines.push('Additional details: ' + anythingElse);
    const fullDescription = lines.filter(Boolean).join('\n\n');

    const projectCtx = {
      name: project.name,
      city: project.city,
      state: project.state,
      building_type: project.building_type,
      delivery_method: template.delivery_method,
      labor_type: template.labor_type,
      scope: scopeType === 'renovation' ? 'Renovation' : 'New Construction',
      gross_sf: grossSf,
      stories: template.default_stories,
      target_budget: project.target_budget,
    };

    try {
      const { items, globals } = await generate(fullDescription, projectCtx);
      await saveGeneratedItems(items, globals);
      onSave?.();
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Generation failed');
    }
  };

  // ── Path 2: plain-English description ──────────────────────────────────────
  const handleDescribeGenerate = async () => {
    if (!description.trim()) { setError('Please describe your project.'); return; }
    setError(null);

    const lines = [
      `Project: ${project.name} — ${project.city || ''}, ${project.state || ''}.`,
      project.client_name ? `Client: ${project.client_name}${project.client_type ? ' (' + project.client_type + ')' : ''}.` : null,
      `Building type: ${project.building_type}. Scope: ${scopeType === 'renovation' ? 'Renovation / TI' : 'New Construction'}.`,
      description.trim(),
    ].filter(Boolean);
    const fullDescription = lines.join('\n\n');

    const projectCtx = {
      name: project.name,
      city: project.city,
      state: project.state,
      building_type: project.building_type,
      scope: scopeType === 'renovation' ? 'Renovation' : 'New Construction',
      gross_sf: descGrossSf ? Number(descGrossSf) : undefined,
      target_budget: project.target_budget,
    };

    try {
      const { items, globals } = await generate(fullDescription, projectCtx);
      await saveGeneratedItems(items, globals);
      onSave?.();
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Generation failed');
    }
  };

  // ── Advanced (delegate to existing AIGenerator) ────────────────────────────
  if (advancedMode) {
    return (
      <AIGenerator
        project={project}
        user={user}
        onSave={onSave}
        onSkip={onSave}
        onGoHome={() => setAdvancedMode(false)}
        onSignOut={onSignOut}
      />
    );
  }

  const scopeLabel = scopeType === 'renovation' ? 'Renovation / TI' : 'New Construction';

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Figtree', sans-serif", color: '#1A1A1A' }}>
      {/* Header */}
      <header style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>
          COSTDECK
        </span>
        <button
          onClick={onGoHome}
          style={{ background: 'none', color: '#aaa', border: '1px solid #3a3a3a', borderRadius: 6, padding: '5px 12px', fontFamily: "'Figtree', sans-serif", fontSize: 12, cursor: 'pointer' }}
        >
          ← All Projects
        </button>
      </header>

      {/* Project summary bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '16px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, color: '#111' }}>
              {project.name}
            </div>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#666', marginTop: 2, display: 'flex', gap: '4px 10px', flexWrap: 'wrap' }}>
              {project.client_name && <span>{project.client_name}</span>}
              {(project.city || project.state) && <span>· {[project.city, project.state].filter(Boolean).join(', ')}</span>}
              {project.building_type && <span>· {project.building_type}</span>}
              <span>· <b style={{ color: ACCENT }}>{scopeLabel}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px 60px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 22, fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* ── Path 1: Templates ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22, color: '#111', marginBottom: 6 }}>
            Choose a starting point
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888', marginBottom: 22 }}>
            Pick a template that matches your project type. We'll pre-fill sensible defaults and generate a tailored estimate.
          </p>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {PROJECT_TEMPLATES.map(tpl => {
              const isMatch = autoMatchTemplate && autoMatchTemplate.id === tpl.id;
              const psfRange = templatePsfRange(tpl, scopeType);
              return (
                <button
                  key={tpl.id}
                  onClick={() => { setSelectedTemplate(tpl); setShowTemplateModal(true); }}
                  style={{
                    background: '#fff',
                    border: isMatch ? `2px solid ${ACCENT}` : `1.5px solid ${BORDER}`,
                    borderRadius: 12, padding: '18px 18px 16px',
                    textAlign: 'left', cursor: 'pointer',
                    boxShadow: isMatch ? '0 4px 18px rgba(184,144,48,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', gap: 12,
                    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isMatch) e.currentTarget.style.borderColor = '#c4c4be'; }}
                  onMouseLeave={e => { if (!isMatch) e.currentTarget.style.borderColor = BORDER; }}
                >
                  {isMatch && (
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      background: ACCENT, color: '#fff', borderRadius: 4, padding: '2px 7px',
                      fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 0.6,
                    }}>
                      MATCH
                    </span>
                  )}
                  <BuildingIcon templateId={tpl.id} size={44} />
                  <div>
                    <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#111' }}>
                      {tpl.name}{scopeType === 'renovation' ? ' (Renovation)' : ''}
                    </div>
                    <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#888', marginTop: 3 }}>
                      {tpl.typical_sf_range}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', 'Menlo', monospace", fontSize: 12, color: '#555', marginTop: 5, letterSpacing: 0.2 }}>
                      {psfRange.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Path 2: Describe your project ─────────────────────────────────── */}
        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: '#111', marginBottom: 6 }}>
            Or describe it in your own words
          </h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888', marginBottom: 16 }}>
            Claude reads your description and builds a detailed estimate with the right line items for your project.
          </p>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
              placeholder="Describe your project in plain English. Example: 200-unit luxury high-rise in DTLA, 25 stories, prevailing wage, pool and fitness center, structured parking, $150M budget. Or: 10,000 SF office tenant improvement, 15th floor, demo existing layout, 4 private offices, 2 conference rooms."
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e0e0dc', borderRadius: 8, fontFamily: "'Figtree', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#666', fontWeight: 600 }}>Gross SF</label>
                <input
                  type="number" min="0"
                  value={descGrossSf} onChange={e => setDescGrossSf(e.target.value)}
                  placeholder="optional"
                  style={{ width: 140, padding: '8px 10px', border: '1.5px solid #e0e0dc', borderRadius: 7, fontFamily: "'Figtree', sans-serif", fontSize: 13, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                />
                <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#aaa' }}>
                  Claude can estimate if left blank.
                </span>
              </div>
              <div style={{ flex: 1 }} />
              <button
                onClick={handleDescribeGenerate}
                disabled={isGenerating || !description.trim()}
                style={{
                  background: (isGenerating || !description.trim()) ? '#d4b86a' : ACCENT,
                  color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px',
                  fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13,
                  cursor: (isGenerating || !description.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                Generate Estimate
              </button>
            </div>
          </div>
        </section>

        {/* ── Path 3: Advanced ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: 20 }}>
          <button
            onClick={() => setAdvancedMode(true)}
            style={{
              background: 'none', border: 'none',
              fontFamily: "'Figtree', sans-serif", fontSize: 13,
              color: ACCENT, cursor: 'pointer', padding: '8px 0',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            Advanced: specify all details manually →
          </button>
        </section>
      </main>

      {/* Modals / overlays */}
      {showTemplateModal && selectedTemplate && !isGenerating && (
        <TemplateModal
          template={selectedTemplate}
          project={project}
          onClose={() => setShowTemplateModal(false)}
          onGenerate={async (data) => {
            setShowTemplateModal(false);
            await handleTemplateGenerate(data);
          }}
          isGenerating={false}
        />
      )}
      {isGenerating && (
        <ProgressOverlay progress={progress} onCancel={cancel} />
      )}
    </div>
  );
}
