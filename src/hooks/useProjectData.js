import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getScenarios, getLineItems, createScenario,
  updateLineItem, createLineItem, createLineItems, updateGlobals,
} from '../supabase/db';
import { supabase } from '../supabase/supabaseClient';
import { analytics } from '../analytics';

const isLockError = (err) => {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('lock') && (msg.includes('stole') || msg.includes('released'));
};
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
  sortOrder: 'sort_order',
  isAllowance: 'is_allowance',
  aiAdvice: 'ai_advice',
  assignedTo: 'assigned_to',
  trade: 'trade',
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
    sortOrder: row.sort_order ?? 0,
    isAllowance: row.is_allowance ?? false,
    aiAdvice: row.ai_advice ?? null,
    assignedTo: row.assigned_to ?? null,
    trade: row.trade ?? null,
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
    ai_advice: item.aiAdvice ?? null,
    assigned_to: item.assignedTo ?? null,
    trade: item.trade ?? null,
  };
}

/**
 * Supabase-backed replacement for useScenarios.
 * Exposes the same API surface + loading / error / saveError.
 */
const LOAD_TIMEOUT_MS = 10_000;

export function useProjectData(projectId, { skipSeed = false } = {}) {
  const [scenarios, setScenarios] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [savePending, setSavePending] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount(n => n + 1), []);

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
    let timeoutId = null;

    // Immediately clear stale data from any previous project so the UI
    // shows an empty/loading state instead of the previous project's numbers.
    setScenarios([]);
    setActiveId(null);
    setAudit([]);

    const load = async (attempt = 0) => {
      setLoading(true);
      setError(null);

      // Hard timeout — if loading hasn't finished in 10s, surface an error
      // instead of spinning forever.
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          console.error('[useProjectData] Load timed out after 10s for project', projectId);
          setError('Project data is taking too long to load. Check your connection and try again.');
          setLoading(false);
        }
      }, LOAD_TIMEOUT_MS);

      try {
        // Await session before querying — prevents a race condition on page
        // reload where the data fetch fires before GoTrue has re-hydrated the
        // stored session, which causes RLS to reject the queries silently.
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionErr || !session) {
          console.error('[useProjectData] No active session:', sessionErr?.message);
          setError('Your session has expired. Please sign in again.');
          setLoading(false);
          return;
        }

        const { data: scenarioRows, error: scErr } = await getScenarios(projectId);
        if (cancelled) return;

        if (scErr && isLockError(scErr) && attempt < 1) {
          console.warn('[useProjectData] Auth lock error — retrying in 400ms…');
          clearTimeout(timeoutId);
          await new Promise(r => setTimeout(r, 400));
          if (!cancelled) load(1);
          return;
        }

        if (scErr) {
          console.error('[useProjectData] getScenarios error:', scErr.message, '| code:', scErr.code);
          setError(`Failed to load project: ${scErr.message}`);
          setLoading(false);
          return;
        }

        if (!scenarioRows?.length) {
          setError('No scenarios found for this project. It may have been deleted or you may not have access.');
          setLoading(false);
          return;
        }

        // Load scenarios sequentially — Promise.all would fire multiple
        // requests in parallel, and if any triggers a token refresh the
        // parallel requests contend on the GoTrue lock.
        const loaded = [];
        for (const sr of scenarioRows) {
          if (cancelled) return;

          const globals = sr.globals ?? { ...DEFAULT_GLOBALS };

          let { data: itemRows, error: liErr } = await getLineItems(sr.id);
          if (cancelled) return;

          if (liErr) {
            console.error(`[useProjectData] getLineItems failed for scenario ${sr.id}:`, liErr.message);
            itemRows = []; // degrade gracefully — show empty scenario
          }

          let items;
          if (!itemRows?.length) {
            if (skipSeed) {
              // Generation in progress — start with empty items so generated
              // rows are injected cleanly without colliding with seed data.
              items = [];
            } else {
              // First open — seed default line items into this scenario
              const seeds = createSeedItems();
              const insertRows = seeds.map((item, idx) => itemToInsertRow(item, idx));
              const { data: created, error: cErr } = await createLineItems(sr.id, insertRows);
              if (cErr) {
                console.error(`[useProjectData] createLineItems failed for scenario ${sr.id}:`, cErr.message);
              }
              items = !cErr && created?.length ? created.map(rowToItem) : seeds;
            }
          } else {
            items = itemRows.map(rowToItem);
          }

          loaded.push({ id: sr.id, name: sr.name, globals, items });
        }

        if (cancelled) return;
        clearTimeout(timeoutId);
        setScenarios(loaded);
        setActiveId(loaded[0]?.id ?? null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        clearTimeout(timeoutId);
        console.error('[useProjectData] Unexpected load error:', err?.message, err);
        setError(`Unexpected error loading project: ${err?.message || 'Unknown error'}`);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  // retryCount is intentionally included — incrementing it re-triggers this effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, retryCount]);

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

    analytics.lineItemEdited(field);

    // Optimistic UI update
    setScenarios(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      return { ...s, items: s.items.map(i => i.id === id ? { ...i, [field]: value } : i) };
    }));

    // Persist — maps camelCase field to snake_case DB column
    setSavePending(p => p + 1);
    const { error: saveErr } = await updateLineItem(id, { [toDb(field)]: value });
    setSavePending(p => Math.max(0, p - 1));
    if (saveErr && !isLockError(saveErr)) setSaveError(`Save failed: ${saveErr.message}`);
    else setLastSaved(new Date());
  }, [activeId, log]);

  // ── reorderItems ────────────────────────────────────────────────────────
  // updates: [{ id, sortOrder, category? }]
  // Only changed rows are included; all fire in parallel.
  const reorderItems = useCallback(async (updates) => {
    const map = {};
    updates.forEach(u => { map[u.id] = u; });

    setScenarios(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      const newItems = s.items.map(i => {
        const u = map[i.id];
        if (!u) return i;
        return { ...i, sortOrder: u.sortOrder, ...(u.category !== undefined ? { category: u.category } : {}) };
      });
      newItems.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return { ...s, items: newItems };
    }));

    await Promise.all(updates.map(u => {
      const fields = { sort_order: u.sortOrder };
      if (u.category !== undefined) fields.category = u.category;
      return updateLineItem(u.id, fields);
    }));
  }, [activeId]);

  // ── createItem ──────────────────────────────────────────────────────────
  const createItem = useCallback(async (category, partial = {}) => {
    const s = scenariosRef.current.find(s => s.id === activeId);
    if (!s) return { error: 'No active scenario' };

    const sortOrder = s.items.length;
    const row = itemToInsertRow({
      category,
      subcategory: partial.subcategory ?? '',
      description: partial.description ?? '',
      qtyMin: partial.qtyMin ?? 1,
      qtyMax: partial.qtyMax ?? 1,
      unit: partial.unit ?? 'LS',
      unitCostLow: partial.unitCostLow ?? 0,
      unitCostMid: partial.unitCostMid ?? 0,
      unitCostHigh: partial.unitCostHigh ?? 0,
      sensitivity: partial.sensitivity ?? 'Medium',
      inSummary: true,
    }, sortOrder);

    setSavePending(p => p + 1);
    const { data, error: saveErr } = await createLineItem(activeId, row);
    setSavePending(p => Math.max(0, p - 1));
    if (saveErr) {
      if (!isLockError(saveErr)) setSaveError(`Could not create item: ${saveErr.message}`);
      return { error: saveErr.message };
    }

    setLastSaved(new Date());
    const created = rowToItem(data);
    setScenarios(prev => prev.map(s =>
      s.id === activeId ? { ...s, items: [...s.items, created] } : s
    ));
    return { data: created };
  }, [activeId]);

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
    globalsTimer.current[sid] = setTimeout(async () => {
      const latest = scenariosRef.current.find(s => s.id === sid);
      if (latest) {
        setSavePending(p => p + 1);
        await updateGlobals(sid, latest.globals);
        setSavePending(p => Math.max(0, p - 1));
        setLastSaved(new Date());
      }
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
      if (!isLockError(scErr)) setSaveError(`Could not create scenario: ${scErr?.message}`);
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
    analytics.scenarioCreated(name);
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

  // Merge Supabase-format rows into the active scenario's items list.
  // Used by the generation orchestrator to add items as each chunk saves.
  const injectItems = useCallback((savedRows) => {
    const converted = (savedRows || []).map(rowToItem);
    if (!converted.length) return;
    setScenarios(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      const existingIds = new Set(s.items.map(i => i.id));
      const toAdd = converted.filter(i => !existingIds.has(i.id));
      if (!toAdd.length) return s;
      const merged = [...s.items, ...toAdd].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return { ...s, items: merged };
    }));
  }, [activeId]);

  return {
    scenarios,
    active,
    activeId,
    setActiveId,
    audit,
    loading,
    error,
    retry,
    saveError,
    setSaveError,
    savePending,
    lastSaved,
    updateItem,
    createItem,
    reorderItems,
    updateGlobal,
    addScenario,
    deleteScenario,
    injectItems,
  };
}
