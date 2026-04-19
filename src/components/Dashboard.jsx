import { useState, useMemo, useEffect } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import * as CE from '../engine/CostEngine';
import { COLORS, FONTS } from '../data/constants';
import { fmt, fK, psf } from '../utils/format';
import { supabase } from '../supabase/supabaseClient';
import AllowancesPanel from './AllowancesPanel';
import ProjectSummaryCard from './ProjectSummaryCard';
import QuickStatsRow from './QuickStatsRow';
import BudgetTracker from './BudgetTracker';

const INDIRECT_CATEGORIES = new Set([
  'General Conditions', 'Overhead & Fee', 'Contingency',
  'Bond', 'Insurance', 'Bond & Insurance', 'Overhead & Profit',
]);

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ totals, catGroups, activeItems, bsf, globals, teamMembers = [], project, active, user, canEdit, updateGlobal, onProjectUpdate, onManageTeam }) {
  const { mob, tab } = useWindowSize();
  const [costView, setCostView] = useState('total'); // 'total' | 'direct'
  const [alternates, setAlternates] = useState([]);
  const [checkedAlts, setCheckedAlts] = useState({});

  const isDirect = costView === 'direct';

  const chartGroups = isDirect
    ? catGroups.filter(g => !INDIRECT_CATEGORIES.has(g.c))
    : catGroups;

  const mx = Math.max(...chartGroups.map(g => g.t.m), 1);

  const topDrivers = useMemo(() =>
    [...activeItems]
      .map(i => ({ ...i, _m: CE.midTotal(i) || 0 }))
      .sort((a, b) => b._m - a._m)
      .slice(0, 10),
    [activeItems]
  );

  const spreadTotals = useMemo(
    () => CE.projectSpreadTotals(activeItems, globals),
    [activeItems, globals]
  );

  // KPI values switch based on mode
  const kpi = isDirect
    ? [
        ['Low',  totals.raw.l, COLORS.lg, '#E8F5F1'],
        ['Mid',  totals.raw.m, COLORS.gn, '#EFF6E8'],
        ['High', totals.raw.h, COLORS.or, '#FFF3EC'],
      ]
    : [
        ['Low',  totals.full.l.tot, COLORS.lg, '#E8F5F1'],
        ['Mid',  totals.full.m.tot, COLORS.gn, '#EFF6E8'],
        ['High', totals.full.h.tot, COLORS.or, '#FFF3EC'],
      ];

  const gc = mob ? '1fr' : tab ? '1fr 1fr' : '1fr 1fr 1fr';

  // ── Contextual warnings ──────────────────────────────────────────────────────
  const warnings = useMemo(() => {
    const w = [];
    const psfVal = bsf > 0 ? totals.raw.m / bsf : 0;
    if (psfVal > 0 && (psfVal < 80 || psfVal > 1200)) {
      w.push(`Direct cost of $${psfVal.toFixed(0)}/SF is outside typical range ($80–$1,200/SF) — verify quantities and unit costs.`);
    }
    if ((globals.contingency ?? 0) === 0) {
      w.push('Contingency is set to 0% — consider adding a reserve for design and construction risk.');
    }
    const topItem = activeItems.reduce((max, i) => {
      const m = CE.midTotal(i) || 0;
      return m > (CE.midTotal(max) || 0) ? i : max;
    }, activeItems[0]);
    if (topItem && totals.raw.m > 0) {
      const topMid = CE.midTotal(topItem) || 0;
      if (topMid / totals.raw.m > 0.2) {
        w.push(`"${topItem.description}" is ${(topMid / totals.raw.m * 100).toFixed(0)}% of total cost — review for reasonableness.`);
      }
    }
    return w;
  }, [activeItems, totals, globals, bsf]);

  // ── Alternates ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!project?.id || !active?.id) return;
    supabase
      .from('alternates')
      .select('*, alternate_items(*)')
      .eq('project_id', project.id)
      .eq('scenario_id', active.id)
      .order('number', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setAlternates(data);
          // Default: all accepted alternates checked
          const defaults = {};
          data.forEach(a => { if (a.status === 'accepted') defaults[a.id] = true; });
          setCheckedAlts(defaults);
        }
      })
      .catch(() => {}); // table may not exist yet
  }, [project?.id, active?.id]);

  const altNetTotal = useMemo(() => {
    return alternates
      .filter(a => checkedAlts[a.id])
      .reduce((sum, a) => {
        const net = (a.alternate_items || []).reduce((s, item) => {
          const t = (item.quantity || 0) * (item.unit_cost_adjustment || 0);
          return s + (item.adjustment_type === 'deduct' ? -t : t);
        }, 0);
        return sum + net;
      }, 0);
  }, [alternates, checkedAlts]);

  // ── Allowances ───────────────────────────────────────────────────────────────
  const allowanceItems = useMemo(
    () => activeItems.filter(i => i.isAllowance),
    [activeItems],
  );

  // ── Assignment progress ──────────────────────────────────────────────────────
  const assignmentProgress = useMemo(() => {
    if (!teamMembers.length) return null;
    const total = activeItems.length;
    if (!total) return null;
    const byMember = {};
    activeItems.forEach(i => {
      if (i.assignedTo) byMember[i.assignedTo] = (byMember[i.assignedTo] || 0) + 1;
    });
    const unassigned = activeItems.filter(i => !i.assignedTo).length;
    const rows = teamMembers
      .map(m => ({ member: m, count: byMember[m.user_id] || 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
    return { rows, unassigned, total };
  }, [activeItems, teamMembers]);

  return (
    <div style={{ fontFamily: FONTS.body }}>

      {/* Project Summary Card */}
      {project && (
        <ProjectSummaryCard
          project={project}
          active={active}
          globals={globals}
          updateGlobal={updateGlobal}
          teamMembers={teamMembers}
          canEdit={canEdit}
          onUpdate={onProjectUpdate}
          onManageTeam={onManageTeam}
        />
      )}

      {/* Quick stats row */}
      <QuickStatsRow activeItems={activeItems} />

    <div style={{ display: 'grid', gridTemplateColumns: gc, gap: mob ? 10 : 14 }}>

      {/* Toggle */}
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', border: `1px solid ${COLORS.bd}`, borderRadius: 8, overflow: 'hidden' }}>
          {[['total', 'Total Cost'], ['direct', 'Direct Cost']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setCostView(v)}
              style={{
                background: costView === v ? COLORS.gn : COLORS.wh,
                color: costView === v ? COLORS.wh : COLORS.dg,
                border: 'none', padding: '8px 18px',
                fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Estimate KPIs */}
      <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3,1fr)', gap: mob ? 8 : 12 }}>
        {kpi.map(([label, val, color, bg]) => (
          <div key={label} style={{ background: bg, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 14 : '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>{label} Estimate</div>
            <div style={{ fontSize: mob ? 22 : 24, fontWeight: 700, fontFamily: FONTS.heading, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(val)}</div>
            <div style={{ fontSize: 12, color, fontFamily: FONTS.heading, fontWeight: 600, marginTop: 2 }}>{psf(val, bsf)}</div>
            {isDirect && (
              <div style={{ fontSize: 10, color: COLORS.mg, fontFamily: FONTS.body, marginTop: 4 }}>direct cost only</div>
            )}
          </div>
        ))}
      </div>

      {/* Spread model panel */}
      {spreadTotals && (
        <div style={{ gridColumn: '1/-1', background: '#FFFBF0', border: '1px solid #E8D5A0', borderRadius: 10, padding: mob ? 12 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gn, textTransform: 'uppercase', letterSpacing: 2 }}>
                Spread Model — {spreadTotals.phase.label} ({spreadTotals.phase.aace})
              </div>
              <div style={{ fontSize: 11, color: COLORS.mg, marginTop: 2, fontFamily: FONTS.body }}>
                {spreadTotals.phase.multiplier}× phase multiplier · Low/High computed from Mid + sensitivity spread
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3,1fr)', gap: mob ? 8 : 12 }}>
            {[
              ['Spread Low',  spreadTotals.full.l.tot, COLORS.lg, '#E8F5F1'],
              ['Spread Mid',  spreadTotals.full.m.tot, COLORS.gn, '#EFF6E8'],
              ['Spread High', spreadTotals.full.h.tot, COLORS.or, '#FFF3EC'],
            ].map(([label, val, color, bg]) => (
              <div key={label} style={{ background: bg, border: `1px solid ${COLORS.bd}`, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.mg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: mob ? 18 : 20, fontWeight: 700, fontFamily: FONTS.heading, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(val)}</div>
                <div style={{ fontSize: 11, color, fontFamily: FONTS.heading, fontWeight: 600, marginTop: 2 }}>{psf(val, bsf)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual warnings */}
      {warnings.length > 0 && (
        <div style={{ gridColumn: '1/-1', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: mob ? 10 : 14 }}>
          <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>⚠ Estimate Alerts</div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: '#78350F', padding: '3px 0', lineHeight: 1.5, fontFamily: FONTS.body }}>• {w}</div>
          ))}
        </div>
      )}

      {/* Allowances panel */}
      {allowanceItems.length > 0 && (
        <div style={{ gridColumn: '1/-1', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
          <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
            Allowances ({allowanceItems.length})
          </div>
          <AllowancesPanel allowanceItems={allowanceItems} user={user} canEdit={canEdit} />
        </div>
      )}

      {/* Assignment progress */}
      {assignmentProgress && assignmentProgress.rows.length > 0 && (
        <div style={{ gridColumn: '1/-1', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
          <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
            Assignment Progress — {assignmentProgress.total - assignmentProgress.unassigned}/{assignmentProgress.total} assigned
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignmentProgress.rows.map(({ member, count }) => {
              const pct = count / assignmentProgress.total * 100;
              const name = member.profiles?.full_name || member.profiles?.email || 'Member';
              const initials = name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
              return (
                <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: COLORS.gn, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: FONTS.heading, flexShrink: 0 }}>{initials}</div>
                  <span style={{ fontSize: 12, width: mob ? 80 : 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <div style={{ flex: 1, background: COLORS.bl, borderRadius: 3, height: 14, position: 'relative', overflow: 'hidden', minWidth: 40 }}>
                    <div style={{ background: `linear-gradient(90deg,${COLORS.gn}88,${COLORS.gn})`, width: `${pct}%`, height: '100%', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, color: COLORS.mg, width: 40, textAlign: 'right', flexShrink: 0 }}>{count} items</span>
                </div>
              );
            })}
            {assignmentProgress.unassigned > 0 && (
              <div style={{ fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, marginTop: 2 }}>{assignmentProgress.unassigned} items unassigned</div>
            )}
          </div>
        </div>
      )}

      {/* Category bars */}
      <div style={{ gridColumn: '1/-1', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          Cost by Category (Mid{isDirect ? ', Direct' : ', Loaded'}) — {bsf.toLocaleString()} SF
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: mob ? 6 : 8 }}>
          {chartGroups.map(g => (
            <div key={g.c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: mob ? 10 : 11, fontWeight: 500, width: mob ? 100 : 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.c}</span>
              <div style={{ flex: 1, background: COLORS.bl, borderRadius: 3, height: mob ? 14 : 18, position: 'relative', overflow: 'hidden', minWidth: 50 }}>
                <div style={{ background: `linear-gradient(90deg,${COLORS.yl}88,${COLORS.yl})`, width: `${(g.t.m / mx) * 100}%`, height: '100%', borderRadius: 3 }} />
                <span style={{ position: 'absolute', right: 4, top: mob ? 0 : 1, fontSize: mob ? 9 : 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fK(g.t.m)}</span>
              </div>
              {!mob && <span style={{ fontSize: 9, color: COLORS.mg, width: 55, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{psf(g.t.m, bsf)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Mid Breakdown</div>

        {isDirect ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${COLORS.bl}` }}>
              <span style={{ color: COLORS.mg }}>Raw Installed Cost</span>
              <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(totals.raw.m)} <span style={{ color: COLORS.mg, fontSize: 10 }}>{psf(totals.raw.m, bsf)}</span>
              </span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, padding: '10px 0 4px', fontStyle: 'italic' }}>
              No markups applied (GC, contingency, fee, tax excluded)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, fontFamily: FONTS.heading, paddingTop: 6, color: COLORS.gn }}>
              <span>DIRECT TOTAL</span><span>{fmt(totals.raw.m)}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.gn }}>{psf(totals.raw.m, bsf)}</div>
          </>
        ) : (
          <>
            {[
              ['Escalated Sub',  totals.full.m.sub],
              ['Contingency',    totals.full.m.co],
              ['GC',             totals.full.m.gc],
              ['Fee',            totals.full.m.fe],
              ['Ins+Bond',       totals.full.m.ins],
              ['Tax',            totals.full.m.tx],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${COLORS.bl}` }}>
                <span style={{ color: COLORS.mg }}>{l}</span>
                <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(v)} <span style={{ color: COLORS.mg, fontSize: 10 }}>{psf(v, bsf)}</span>
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, fontFamily: FONTS.heading, paddingTop: 10, color: COLORS.gn }}>
              <span>TOTAL</span><span>{fmt(totals.full.m.tot)}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.gn }}>{psf(totals.full.m.tot, bsf)}</div>
          </>
        )}
      </div>

      {/* Top drivers */}
      <div style={{ gridColumn: mob ? '1/-1' : tab ? '1/-1' : 'span 2', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Top 10 Cost Drivers</div>
        {topDrivers.map((d, i) => (
          <div key={d.id} style={{ display: 'flex', gap: 6, fontSize: mob ? 12 : 11, padding: '5px 0', borderBottom: `1px solid ${COLORS.bl}`, alignItems: 'center' }}>
            <span style={{ color: COLORS.gn, fontWeight: 700, fontFamily: FONTS.heading, width: 18, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</span>
            <span style={{ color: COLORS.gn, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fK(d._m)}</span>
          </div>
        ))}
      </div>

      {/* Alternates summary */}
      {alternates.length > 0 && (
        <div style={{ gridColumn: '1/-1', background: COLORS.sf, border: `1px solid ${COLORS.bd}`, borderRadius: 10, padding: mob ? 12 : 16 }}>
          <div style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
            Alternates Summary
          </div>

          {/* Base bid row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${COLORS.bl}` }}>
            <div style={{ width: 20, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg }}>Base Bid</span>
            <span style={{ fontSize: 13, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.dg, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(totals.full.m.tot)}
            </span>
          </div>

          {/* Each alternate */}
          {alternates.map(a => {
            const net = (a.alternate_items || []).reduce((s, item) => {
              const t = (item.quantity || 0) * (item.unit_cost_adjustment || 0);
              return s + (item.adjustment_type === 'deduct' ? -t : t);
            }, 0);
            const checked = !!checkedAlts[a.id];
            const typeColor = a.type === 'deduct' ? '#991b1b' : '#166534';
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${COLORS.bl}` }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setCheckedAlts(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                  style={{ width: 15, height: 15, accentColor: '#B89030', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: 12, fontFamily: FONTS.body, color: COLORS.dg }}>
                  Alt #{a.number} — {a.title}
                  <span style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 3, background: a.type === 'deduct' ? '#fef2f2' : '#f0fdf4', color: typeColor, fontWeight: 600 }}>
                    {a.type === 'deduct' ? 'Deduct' : 'Add'}
                  </span>
                </span>
                <span style={{
                  fontSize: 12, fontFamily: FONTS.heading, fontWeight: 600,
                  color: checked ? (net >= 0 ? '#166534' : '#991b1b') : '#bbb',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {net >= 0 ? '+' : ''}{fmt(net)}
                </span>
              </div>
            );
          })}

          {/* Adjusted total */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 2px', borderTop: `2px solid ${COLORS.bd}`, marginTop: 2 }}>
            <div style={{ width: 20, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontFamily: FONTS.heading, fontWeight: 800, color: COLORS.gn, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Adjusted Total
            </span>
            <span style={{ fontSize: 14, fontFamily: FONTS.heading, fontWeight: 800, color: COLORS.gn, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(totals.full.m.tot + altNetTotal)}
            </span>
          </div>
          {Object.values(checkedAlts).some(Boolean) && (
            <div style={{ textAlign: 'right', fontSize: 11, color: COLORS.mg, fontFamily: FONTS.body, marginTop: 2 }}>
              {altNetTotal >= 0 ? '+' : ''}{fmt(altNetTotal)} from selected alternates
            </div>
          )}
        </div>
      )}

      {/* Budget Tracker */}
      {project && (
        <BudgetTracker
          project={project}
          totals={totals}
          canEdit={canEdit}
          user={user}
        />
      )}

    </div>
    </div>
  );
}
