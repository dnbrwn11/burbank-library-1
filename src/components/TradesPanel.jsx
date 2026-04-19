import { useState, useMemo } from 'react';
import { COLORS, FONTS } from '../data/constants';
import { fK, psf } from '../utils/format';
import * as CE from '../engine/CostEngine';
import { supabase } from '../supabase/supabaseClient';
import BiddingPanel from './BiddingPanel';

export function TradesPanel({ items, globals, bsf, updateItem, project, canEdit, active, user, totals, createItem, mob }) {
  const [scopeLoading, setScopeLoading] = useState(null);
  const [scopes, setScopes] = useState({});
  const [expandedTrade, setExpandedTrade] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingDraft, setEditingDraft] = useState('');

  const activeItems = useMemo(() => items.filter(i => !i.isArchived), [items]);

  const tradeGroups = useMemo(() => {
    const g = {};
    activeItems.forEach(i => {
      const t = i.trade?.trim() || '(Unassigned)';
      if (!g[t]) g[t] = [];
      g[t].push(i);
    });
    return Object.entries(g)
      .sort(([a], [b]) => {
        if (a === '(Unassigned)') return 1;
        if (b === '(Unassigned)') return -1;
        return a.localeCompare(b);
      })
      .map(([trade, tradeItems]) => ({
        trade,
        items: tradeItems,
        midTotal: tradeItems.reduce((s, i) => s + (CE.midTotal(i) || 0), 0),
      }));
  }, [activeItems]);

  async function generateScope(tradeName, tradeItems) {
    setScopeLoading(tradeName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/generate-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          trade: tradeName,
          items: tradeItems.map(i => ({
            description: i.description, subcategory: i.subcategory,
            qtyMin: i.qtyMin, qtyMax: i.qtyMax, unit: i.unit,
            unitCostLow: i.unitCostLow, unitCostMid: i.unitCostMid, unitCostHigh: i.unitCostHigh,
          })),
          projectName: project?.name || 'Project',
          scenarioName: active?.name || 'Baseline',
          scenarioId: active?.id,
        }),
      });
      const data = await res.json();
      if (data.scope) {
        setScopes(prev => ({ ...prev, [tradeName]: data.scope }));
        setExpandedTrade(tradeName);
      } else {
        console.error('[TradesPanel] No scope returned:', data.error);
      }
    } catch (err) {
      console.error('[TradesPanel] generateScope error:', err);
    } finally {
      setScopeLoading(null);
    }
  }

  function exportScopeAsText(tradeName, scope) {
    const lines = [
      scope.title || `${tradeName} Scope of Work`,
      '='.repeat(60),
      '',
      'SUMMARY',
      scope.summary || '',
      '',
      'INCLUSIONS',
      ...(scope.inclusions || []).map(s => `  • ${s}`),
      '',
      'EXCLUSIONS',
      ...(scope.exclusions || []).map(s => `  • ${s}`),
      '',
      'QUALIFICATIONS',
      ...(scope.qualifications || []).map(s => `  • ${s}`),
      '',
      'SCHEDULE',
      scope.schedule || '',
      '',
      'INSURANCE & BONDING',
      scope.insuranceBonding || '',
      '',
      'REQUIRED SUBMITTALS',
      ...(scope.submittals || []).map(s => `  • ${s}`),
      '',
      'INSPECTIONS & TESTING',
      ...(scope.inspections || []).map(s => `  • ${s}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tradeName.replace(/[^a-zA-Z0-9]/g, '_')}_Scope.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function startEdit(item) {
    setEditingItemId(item.id);
    setEditingDraft(item.trade || '');
  }

  function commitEdit(item) {
    const val = editingDraft.trim() || null;
    if (val !== item.trade) updateItem(item.id, 'trade', val);
    setEditingItemId(null);
  }

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gn, textTransform: 'uppercase', letterSpacing: 2 }}>Trades</div>
          <div style={{ fontSize: 12, color: COLORS.mg, marginTop: 2 }}>
            {activeItems.length} items · {tradeGroups.filter(g => g.trade !== '(Unassigned)').length} trades assigned
            {canEdit && <span> · Click a trade cell in the Cost Model or here to assign</span>}
          </div>
        </div>
      </div>

      {tradeGroups.map(({ trade, items: tradeItems, midTotal }) => {
        const isExpanded = expandedTrade === trade;
        const scope = scopes[trade];
        const isLoading = scopeLoading === trade;

        return (
          <div key={trade} style={{ background: COLORS.wh, border: `1px solid #E5E5E2`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
            {/* Trade header */}
            <div
              onClick={() => setExpandedTrade(isExpanded ? null : trade)}
              style={{ background: '#FAFAF6', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: isExpanded ? `1px solid #E5E5E2` : 'none' }}>
              <span style={{ color: COLORS.gn, fontSize: 9, flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>
              <span style={{ fontWeight: 700, fontSize: 13, fontFamily: FONTS.heading, color: trade === '(Unassigned)' ? COLORS.mg : COLORS.dg, flex: 1 }}>{trade}</span>
              <span style={{ fontSize: 11, color: COLORS.mg }}>{tradeItems.length} items</span>
              <span style={{ fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn, fontSize: 14 }}>{fK(midTotal)}</span>
              <span style={{ fontSize: 10, color: COLORS.mg, width: 52, textAlign: 'right' }}>{psf(midTotal, bsf)}</span>
              {trade !== '(Unassigned)' && canEdit && (
                <button
                  onClick={e => { e.stopPropagation(); generateScope(trade, tradeItems); }}
                  disabled={isLoading}
                  style={{ background: COLORS.gn, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, cursor: isLoading ? 'wait' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {isLoading ? '⟳ Generating…' : '✦ Gen Scope'}
                </button>
              )}
              {scope && (
                <button onClick={e => { e.stopPropagation(); exportScopeAsText(trade, scope); }}
                  style={{ background: COLORS.wh, border: `1px solid #E5E5E2`, color: COLORS.dg, borderRadius: 6, padding: '5px 10px', fontSize: 11, fontFamily: FONTS.heading, cursor: 'pointer', flexShrink: 0 }}>
                  Export
                </button>
              )}
            </div>

            {isExpanded && (
              <div>
                {/* Items table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: FONTS.body }}>
                  <thead>
                    <tr style={{ background: COLORS.sf }}>
                      {['Description', 'Sub', 'Qty', 'Unit', '$/Mid', 'Total', canEdit ? 'Trade' : null]
                        .filter(Boolean)
                        .map((h, i) => (
                          <th key={i} style={{ padding: '5px 10px', textAlign: i >= 2 && i <= 5 ? 'right' : 'left', fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tradeItems.map(item => {
                      const mt = CE.midTotal(item) || 0;
                      const isEditing = editingItemId === item.id;
                      return (
                        <tr key={item.id} style={{ borderBottom: `1px solid #E5E5E2` }}>
                          <td style={{ padding: '5px 10px' }}>{item.description}</td>
                          <td style={{ padding: '5px 10px', color: COLORS.mg, fontSize: 10 }}>{item.subcategory}</td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', color: COLORS.mg }}>
                            {((Number(item.qtyMin) || 0) + (Number(item.qtyMax) || 0)) / 2}
                          </td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', color: COLORS.mg }}>{item.unit}</td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', color: COLORS.mg }}>
                            {(Number(item.unitCostMid) || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: COLORS.gn }}>{fK(mt)}</td>
                          {canEdit && (
                            <td style={{ padding: '3px 10px', minWidth: 80 }}>
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={editingDraft}
                                  onChange={e => setEditingDraft(e.target.value)}
                                  onBlur={() => commitEdit(item)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') commitEdit(item);
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                                  style={{ width: '100%', border: `1px solid #E5E5E2`, borderRadius: 4, padding: '2px 6px', fontSize: 11, fontFamily: FONTS.body, outline: 'none' }}
                                />
                              ) : (
                                <span onClick={() => startEdit(item)} style={{ cursor: 'pointer', fontSize: 11, color: item.trade ? COLORS.dg : COLORS.mg, padding: '2px 4px', borderRadius: 3 }}>
                                  {item.trade || '+ assign'}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={canEdit ? 7 : 6} style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontFamily: FONTS.heading, color: COLORS.gn, borderTop: `1px solid #E5E5E2` }}>
                        Trade Total: {fK(midTotal)} &nbsp;·&nbsp; {psf(midTotal, bsf)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Scope preview */}
                {scope && (
                  <div style={{ padding: '14px 16px', borderTop: `1px solid #E5E5E2`, background: '#FFFBF0' }}>
                    <div style={{ fontSize: 12, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gn, marginBottom: 10 }}>
                      ✦ {scope.title}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.mg, lineHeight: 1.6, marginBottom: 12 }}>{scope.summary}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Inclusions</div>
                        {(scope.inclusions || []).map((s, i) => <div key={i} style={{ fontSize: 11, color: COLORS.dg, padding: '1px 0', lineHeight: 1.4 }}>• {s}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Exclusions</div>
                        {(scope.exclusions || []).map((s, i) => <div key={i} style={{ fontSize: 11, color: COLORS.dg, padding: '1px 0', lineHeight: 1.4 }}>• {s}</div>)}
                      </div>
                    </div>
                    {(scope.qualifications?.length > 0) && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Qualifications</div>
                        {scope.qualifications.map((s, i) => <div key={i} style={{ fontSize: 11, color: COLORS.mg, padding: '1px 0', lineHeight: 1.4 }}>• {s}</div>)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 4 }}>
                      {scope.schedule && <div style={{ fontSize: 11, color: COLORS.dg }}><span style={{ fontWeight: 600 }}>Schedule: </span>{scope.schedule}</div>}
                      {scope.insuranceBonding && <div style={{ fontSize: 11, color: COLORS.dg }}><span style={{ fontWeight: 600 }}>Insurance: </span>{scope.insuranceBonding}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {tradeGroups.length === 0 && (
        <div style={{ background: COLORS.wh, border: '1.5px dashed #d8d8d4', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🏗</div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 8 }}>No items yet</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: '#999' }}>Add line items in the Cost Model tab to see trades here.</div>
        </div>
      )}

      {/* Bid packages — merged from former BIDDING tab */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: `1px solid #E5E5E2` }}>
        <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 18, color: COLORS.dg, marginBottom: 6 }}>
          Trade Partner Bidding
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.mg, marginBottom: 18 }}>
          Package scopes, invite trade partners, collect submissions, and award.
        </div>
        <BiddingPanel project={project} user={user} totals={totals} createItem={createItem} canEdit={canEdit} mob={mob} />
      </div>
    </div>
  );
}
