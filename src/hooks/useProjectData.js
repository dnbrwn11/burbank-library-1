import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getScenarios, getLineItems, createScenario,
  updateLineItem, createLineItems, updateGlobals,
} from '../supabase/db';
import { createSeedItems } from '../data/seedData';
import { DEFAULT_GLOBALS } from '../data/defaults';

// camelCase app field → snake_case DB column
const TO_DB = {
  qtyMin: 'qty_min',
  qtyMax: 'qty_max',
  unitCostLow: 'unit_cost_low',
  unitCostMid: 'unit_cost_mid',
  unitCostHigh: 'unit_cost_high',
  isArchived: 'is_archived',
  inSummary: 'in_summary',
};
const toDb = (f) => TO_DB[f] ?? f;

function rowToItem(row) {
  return {
    id: row.id,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    qtyMin: row.qty_min,
    qtyMax: row.qty_max,
    unit: row.unit,
    unitCostLow: row.unit_cost_low,
    unitCostMid: row.unit_cost_mid,
    unitCostHigh: row.unit_cost_high,
    basis: row.basis,
    sensitivity: row.sensitivity,
    notes: row.notes,
    inSummary: row.in_summary ?? true,
    isArchived: row.is_archived ?? false,
  };
}

function itemToInsertRow(item, sortOrder) {
  return {
    category: item.category,
    subcategory: item.subcategory,
    description: item.description,
    qty_min: item.qtyMin,
    qty_max: item.qtyMax,
    unit: item.unit,
    unit_cost_low: item.unitCostLow,
    unit_cost_mid: item.unitCostMid,
    unit_cost_high: item.unitCostHigh,
    basis: item.basis ?? null,
    sensitivity: item.sensitivity ?? null,
    notes: item.notes ?? null,
    in_summary: item.inSummary ?? true,
    is_archived: false,
    sort_order: sortOrder,
  };
}

/**
 * Supabase-backed replacement for useScenarios.
 * Exposes the same API surface + loading / error / saveError.
 */
export function useProjectData(projectId) {
  const [scenarios, setScenarios] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Mutable ref kept in sync — lets async callbacks read the latest state
  // without becoming stale closures.
  const scenariosRef = useRef([]);
  useEffect(() => { scenariosRef.current = scenarios; }, [scenarios]);

  // One debounce timer slot per scenario id
  const globalsTimer = useRef({});

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: scenarioRows, error: scErr } = await getScenarios(projectId);
      if (cancelled) return;

      if (scErr || !scenarioRows?.length) {
        setError(scErr?.message ?? 'No scenarios found for this project.');
        setLoading(false);
        return;
      }

      // Load scenarios sequentially — Promise.all would fire multiple
      // requests in parallel, and if any triggers a token refresh the
      // parallel requests contend on the GoTrue lock.
      const loaded = [];
      for (const sr of scenarioRows) {
        const globals = sr.globals ?? { ...DEFAULT_GLOBALS };

        let { data: itemRows, error: liErr } = await getLineItems(sr.id);
        if (liErr) itemRows = [];

        let items;
        if (!itemRows?.length) {
          // First open — seed the default line items into this scenario
          const seeds = createSeedItems();
          const insertRows = seeds.map((item, idx) => itemToInsertRow(item, idx));
          const { data: created, error: cErr } = await createLineItems(sr.id, insertRows);
          // Fall back to in-memory items if the insert fails
          items = !cErr && created?.length ? created.map(rowToItem) : seeds;
        } else {
          items = itemRows.map(rowToItem);
        }

        loaded.push({ id: sr.id, name: sr.name, globals, items });
      }

      if (cancelled) return;
      setScenarios(loaded);
      setActiveId(loaded[0]?.id ?? null);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Audit log helper ────────────────────────────────────────────────────
  const log = useCallback((itemId, field, oldVal, newVal) => {
    const s = scenariosRef.current.find(s => s.id === activeId);
    setAudit(prev => [{
      id: Date.now() + Math.random(),
      iid: itemId,
      f: field,
      o: oldVal,
      n: newVal,
      ts: new Date().toISOString(),
      sc: s?.name ?? '',
    }, ...prev]);
  }, [activeId]);

  // ── updateItem ──────────────────────────────────────────────────────────
  const updateItem = useCallback(async (id, field, value) => {
    // Read old value from ref to avoid stale closure
    const s = scenariosRef.current.find(s => s.id === activeId);
    const item = s?.items.find(i => i.id === id);
    if (item) log(id, field, item[field], value);

    // Optimistic UI update
    setScenarios(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      return { ...s, items: s.items.map(i => i.id === id ? { ...i, [field]: value } : i) };
    }));

    // Persist — maps camelCase field to snake_case DB column
    const { error: saveErr } = await updateLineItem(id, { [toDb(field)]: value });
    if (saveErr) setSaveError(`Save failed: ${saveErr.message}`);
  }, [activeId, log]);

  // ── updateGlobal ────────────────────────────────────────────────────────
  // Optimistic + debounced write (800ms) to avoid a round-trip per keystroke.
  const updateGlobal = useCallback((field, value) => {
    const sid = activeId;
    if (!sid) return;

    const s = scenariosRef.current.find(s => s.id === sid);
    if (s) log('G', field, s.globals[field], value);

    // Functional updater so we always apply on top of the latest state
    setScenarios(prev => prev.map(s =>
      s.id === sid ? { ...s, globals: { ...s.globals, [field]: value } } : s
    ));

    // The timer reads from the ref at fire time, so it always saves the
    // fully-accumulated state even if multiple fields changed quickly.
    clearTimeout(globalsTimer.current[sid]);
    globalsTimer.current[sid] = setTimeout(() => {
      const latest = scenariosRef.current.find(s => s.id === sid);
      if (latest) updateGlobals(sid, latest.globals);
    }, 800);
  }, [activeId, log]);

  // ── addScenario ─────────────────────────────────────────────────────────
  const addScenario = useCallback(async (name) => {
    const base = scenariosRef.current.find(s => s.id === activeId);
    if (!base) return;

    const { data: newSr, error: scErr } = await createScenario(projectId, {
      name,
      globals: { ...base.globals },
    });
    if (scErr || !newSr) {
      setSaveError(`Could not create scenario: ${scErr?.message}`);
      return;
    }

    const insertRows = base.items
      .filter(i => !i.isArchived)
      .map((item, idx) => itemToInsertRow(item, idx));

    const { data: newItems, error: liErr } = await createLineItems(newSr.id, insertRows);
    const items = !liErr && newItems?.length
      ? newItems.map(rowToItem)
      : base.items.filter(i => !i.isArchived).map(i => ({ ...i })); // in-memory fallback

    const ns = {
      id: newSr.id,
      name: newSr.name,
      globals: newSr.globals ?? { ...base.globals },
      items,
    };
    setScenarios(prev => [...prev, ns]);
    setActiveId(ns.id);
    return ns.id;
  }, [projectId, activeId]);

  // ── deleteScenario ──────────────────────────────────────────────────────
  // Local only — no hard-delete in db.js. The scenario stays in Supabase
  // but disappears from this session until refresh.
  const deleteScenario = useCallback((id) => {
    const all = scenariosRef.current;
    if (all.length <= 1) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeId === id) {
      const remaining = all.filter(s => s.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  }, [activeId]);

  const active = scenarios.find(s => s.id === activeId)
    ?? scenarios[0]
    ?? { id: null, name: '', items: [], globals: { ...DEFAULT_GLOBALS } };

  return {
    scenarios,
    active,
    activeId,
    setActiveId,
    audit,
    loading,
    error,
    saveError,
    setSaveError,
    updateItem,
    updateGlobal,
    addScenario,
    deleteScenario,
  };
}
