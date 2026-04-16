import { useState, useCallback } from 'react';
import { createSeedItems } from '../data/seedData';
import { DEFAULT_GLOBALS } from '../data/defaults';

/**
 * Custom hook for managing scenario state.
 * Each scenario has its own independent copy of items + globals.
 */
export function useScenarios() {
  const [scenarios, setScenarios] = useState(() => [{
    id: 's0',
    name: 'Baseline',
    items: createSeedItems(),
    globals: { ...DEFAULT_GLOBALS },
  }]);
  const [activeId, setActiveId] = useState('s0');
  const [audit, setAudit] = useState([]);

  const active = scenarios.find(s => s.id === activeId) || scenarios[0];

  const log = useCallback((itemId, field, oldVal, newVal) => {
    setAudit(prev => [{
      id: Date.now() + Math.random(),
      iid: itemId,
      f: field,
      o: oldVal,
      n: newVal,
      ts: new Date().toISOString(),
      sc: active.name,
    }, ...prev]);
  }, [active.name]);

  const updateItem = useCallback((id, field, value) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      return {
        ...s,
        items: s.items.map(i => {
          if (i.id !== id) return i;
          log(id, field, i[field], value);
          return { ...i, [field]: value };
        }),
      };
    }));
  }, [activeId, log]);

  const updateGlobal = useCallback((field, value) => {
    log('G', field, active.globals[field], value);
    setScenarios(prev => prev.map(s =>
      s.id === activeId ? { ...s, globals: { ...s.globals, [field]: value } } : s
    ));
  }, [activeId, active.globals, log]);

  const addScenario = useCallback((name) => {
    const base = scenarios.find(s => s.id === activeId);
    const ns = {
      id: `s${Date.now()}`,
      name,
      items: JSON.parse(JSON.stringify(base.items)),
      globals: { ...base.globals },
    };
    setScenarios(prev => [...prev, ns]);
    setActiveId(ns.id);
    return ns.id;
  }, [activeId, scenarios]);

  const deleteScenario = useCallback((id) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(scenarios[0].id);
  }, [activeId, scenarios]);

  return {
    scenarios,
    active,
    activeId,
    setActiveId,
    audit,
    updateItem,
    updateGlobal,
    addScenario,
    deleteScenario,
  };
}
