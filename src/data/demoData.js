/**
 * Hardcoded demo dataset — "Sample: 85,000 SF Civic Library — Burbank, CA"
 *
 * Used by the /demo route. No Supabase queries involved.
 * 32 line items across 6 CSI-ordered categories with realistic
 * Southern California prevailing-wage 3-point pricing (2025–2027 escalation).
 */

export const DEMO_GLOBALS = {
  escalation: 0.04,         // 4% to midpoint of construction (2027)
  laborBurden: 0.42,        // Prevailing wage benefits + burden
  tax: 0.0975,              // CA state + Burbank local sales tax
  insurance: 0.012,         // GL & builder's risk
  contingency: 0.075,       // 7.5% design + construction reserve
  fee: 0.045,               // 4.5% GC overhead & profit
  regionFactor: 1.15,       // Southern California cost index
  bond: 0.008,              // Payment & performance bond
  generalConditions: 0.10,  // 10% jobsite overhead
  buildingSF: 85000,
  parkingStalls: 0,
  openSpaceSF: 22000,
};

export const DEMO_ITEMS = [
  // ── Substructure (3) ───────────────────────────────────────────────────────
  {
    id: 'dd01', category: 'Substructure', subcategory: 'Earthwork',
    description: 'Excavation & export', qtyMin: 4200, qtyMax: 4800, unit: 'CY',
    unitCostLow: 42, unitCostMid: 58, unitCostHigh: 78,
    basis: 'MTA Soils Report', sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 0,
  },
  {
    id: 'dd02', category: 'Substructure', subcategory: 'Foundations',
    description: 'Concrete footings & grade beams', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 18, unitCostMid: 24, unitCostHigh: 32,
    basis: null, sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 1,
  },
  {
    id: 'dd03', category: 'Substructure', subcategory: 'Waterproofing',
    description: 'Below-grade waterproofing & drainage mat', qtyMin: 22000, qtyMax: 22000, unit: 'SF',
    unitCostLow: 14, unitCostMid: 20, unitCostHigh: 28,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 2,
  },

  // ── Shell (6) ──────────────────────────────────────────────────────────────
  {
    id: 'dd04', category: 'Shell', subcategory: 'Structure',
    description: 'Structural steel frame & connections', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 48, unitCostMid: 62, unitCostHigh: 80,
    basis: 'Seismic Cat D — CBC 2022', sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 3,
  },
  {
    id: 'dd05', category: 'Shell', subcategory: 'Structure',
    description: 'Metal deck & lightweight concrete topping', qtyMin: 170000, qtyMax: 170000, unit: 'SF',
    unitCostLow: 12, unitCostMid: 16, unitCostHigh: 21,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 4,
  },
  {
    id: 'dd06', category: 'Shell', subcategory: 'Facade',
    description: 'Curtain wall glazing system — high-performance', qtyMin: 22000, qtyMax: 22000, unit: 'SF',
    unitCostLow: 110, unitCostMid: 145, unitCostHigh: 195,
    basis: 'LEED v4 / Title 24 compliance', sensitivity: 'Very High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 5,
  },
  {
    id: 'dd07', category: 'Shell', subcategory: 'Facade',
    description: 'Precast concrete panel cladding', qtyMin: 8500, qtyMax: 8500, unit: 'SF',
    unitCostLow: 85, unitCostMid: 110, unitCostHigh: 140,
    basis: null, sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 6,
  },
  {
    id: 'dd08', category: 'Shell', subcategory: 'Roofing',
    description: 'Built-up roofing, rigid insulation & flashing', qtyMin: 42500, qtyMax: 42500, unit: 'SF',
    unitCostLow: 18, unitCostMid: 24, unitCostHigh: 32,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 7,
  },
  {
    id: 'dd09', category: 'Shell', subcategory: 'Facade',
    description: 'Exterior aluminum louvers & metal panel accent', qtyMin: 3500, qtyMax: 3500, unit: 'SF',
    unitCostLow: 65, unitCostMid: 88, unitCostHigh: 115,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 8,
  },

  // ── Interiors (7) ─────────────────────────────────────────────────────────
  {
    id: 'dd10', category: 'Interiors', subcategory: 'Partitions',
    description: 'Metal stud framing & gypsum board', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 22, unitCostMid: 29, unitCostHigh: 38,
    basis: null, sensitivity: 'Low',
    notes: null, inSummary: true, isArchived: false, sortOrder: 9,
  },
  {
    id: 'dd11', category: 'Interiors', subcategory: 'Ceilings',
    description: 'Acoustic tile ceilings — suspension system', qtyMin: 52000, qtyMax: 52000, unit: 'SF',
    unitCostLow: 9, unitCostMid: 12, unitCostHigh: 16,
    basis: null, sensitivity: 'Low',
    notes: null, inSummary: true, isArchived: false, sortOrder: 10,
  },
  {
    id: 'dd12', category: 'Interiors', subcategory: 'Flooring',
    description: 'Polished concrete floors — reading rooms', qtyMin: 28000, qtyMax: 28000, unit: 'SF',
    unitCostLow: 8, unitCostMid: 12, unitCostHigh: 18,
    basis: null, sensitivity: 'Low',
    notes: null, inSummary: true, isArchived: false, sortOrder: 11,
  },
  {
    id: 'dd13', category: 'Interiors', subcategory: 'Flooring',
    description: 'Porcelain tile — lobby & circulation', qtyMin: 18000, qtyMax: 18000, unit: 'SF',
    unitCostLow: 18, unitCostMid: 26, unitCostHigh: 36,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 12,
  },
  {
    id: 'dd14', category: 'Interiors', subcategory: 'Casework',
    description: 'Custom millwork, shelving & library casework', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 14, unitCostMid: 20, unitCostHigh: 28,
    basis: null, sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 13,
  },
  {
    id: 'dd15', category: 'Interiors', subcategory: 'Doors',
    description: 'Interior doors & hardware sets', qtyMin: 180, qtyMax: 200, unit: 'EA',
    unitCostLow: 2200, unitCostMid: 3000, unitCostHigh: 4200,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 14,
  },
  {
    id: 'dd16', category: 'Interiors', subcategory: 'Finishes',
    description: 'Painting, wall finishes & graphics', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 4, unitCostMid: 6, unitCostHigh: 8.5,
    basis: null, sensitivity: 'Low',
    notes: null, inSummary: true, isArchived: false, sortOrder: 15,
  },

  // ── Services (7) ──────────────────────────────────────────────────────────
  {
    id: 'dd17', category: 'Services', subcategory: 'Mechanical',
    description: 'HVAC — air handlers, ductwork & controls', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 38, unitCostMid: 50, unitCostHigh: 68,
    basis: 'ASHRAE 90.1 / Title 24', sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 16,
  },
  {
    id: 'dd18', category: 'Services', subcategory: 'Plumbing',
    description: 'Plumbing rough-in, fixtures & domestic water', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 14, unitCostMid: 19, unitCostHigh: 26,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 17,
  },
  {
    id: 'dd19', category: 'Services', subcategory: 'Fire Protection',
    description: 'Fire suppression — wet pipe sprinkler system', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 6, unitCostMid: 8.5, unitCostHigh: 12,
    basis: 'NFPA 13', sensitivity: 'Low',
    notes: null, inSummary: true, isArchived: false, sortOrder: 18,
  },
  {
    id: 'dd20', category: 'Services', subcategory: 'Electrical',
    description: 'Electrical distribution, switchgear & panels', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 18, unitCostMid: 24, unitCostHigh: 33,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 19,
  },
  {
    id: 'dd21', category: 'Services', subcategory: 'Electrical',
    description: 'Lighting fixtures, controls & devices', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 16, unitCostMid: 22, unitCostHigh: 30,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 20,
  },
  {
    id: 'dd22', category: 'Services', subcategory: 'Controls',
    description: 'Building automation system (BAS / DDC)', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 5, unitCostMid: 7, unitCostHigh: 10,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 21,
  },
  {
    id: 'dd23', category: 'Services', subcategory: 'Vertical Transportation',
    description: 'Passenger elevators — 3 cabs, 4-stop', qtyMin: 3, qtyMax: 3, unit: 'EA',
    unitCostLow: 120000, unitCostMid: 160000, unitCostHigh: 220000,
    basis: null, sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 22,
  },

  // ── Equipment (4) ─────────────────────────────────────────────────────────
  {
    id: 'dd24', category: 'Equipment', subcategory: 'Library Systems',
    description: 'Library shelving, stacks & compact storage', qtyMin: 1, qtyMax: 1, unit: 'LS',
    unitCostLow: 480000, unitCostMid: 650000, unitCostHigh: 880000,
    basis: null, sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 23,
  },
  {
    id: 'dd25', category: 'Equipment', subcategory: 'Technology',
    description: 'Security, AV & IT infrastructure', qtyMin: 85000, qtyMax: 85000, unit: 'SF',
    unitCostLow: 8, unitCostMid: 12, unitCostHigh: 18,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 24,
  },
  {
    id: 'dd26', category: 'Equipment', subcategory: 'Signage',
    description: 'Signage & wayfinding program', qtyMin: 1, qtyMax: 1, unit: 'LS',
    unitCostLow: 55000, unitCostMid: 80000, unitCostHigh: 120000,
    basis: null, sensitivity: 'Low',
    notes: null, inSummary: true, isArchived: false, sortOrder: 25,
  },
  {
    id: 'dd27', category: 'Equipment', subcategory: 'Acoustics',
    description: 'Special acoustics — baffles, isolation & panels', qtyMin: 22000, qtyMax: 22000, unit: 'SF',
    unitCostLow: 18, unitCostMid: 26, unitCostHigh: 38,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 26,
  },

  // ── Sitework (5) ──────────────────────────────────────────────────────────
  {
    id: 'dd28', category: 'Sitework', subcategory: 'Demolition',
    description: 'Site demolition & hazmat abatement', qtyMin: 1, qtyMax: 1, unit: 'LS',
    unitCostLow: 380000, unitCostMid: 520000, unitCostHigh: 720000,
    basis: 'Phase II ESA required', sensitivity: 'Very High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 27,
  },
  {
    id: 'dd29', category: 'Sitework', subcategory: 'Earthwork',
    description: 'Mass grading, rough cut & import fill', qtyMin: 22000, qtyMax: 22000, unit: 'CY',
    unitCostLow: 28, unitCostMid: 38, unitCostHigh: 52,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 28,
  },
  {
    id: 'dd30', category: 'Sitework', subcategory: 'Paving',
    description: 'Asphalt paving, concrete curbs & hardscape', qtyMin: 28000, qtyMax: 28000, unit: 'SF',
    unitCostLow: 22, unitCostMid: 30, unitCostHigh: 42,
    basis: null, sensitivity: 'Medium',
    notes: null, inSummary: true, isArchived: false, sortOrder: 29,
  },
  {
    id: 'dd31', category: 'Sitework', subcategory: 'Landscaping',
    description: 'Landscape planting, irrigation & turf', qtyMin: 22000, qtyMax: 22000, unit: 'SF',
    unitCostLow: 12, unitCostMid: 17, unitCostHigh: 25,
    basis: null, sensitivity: 'Low',
    notes: null, inSummary: true, isArchived: false, sortOrder: 30,
  },
  {
    id: 'dd32', category: 'Sitework', subcategory: 'Utilities',
    description: 'Utility connections — water, sewer, gas & electric', qtyMin: 1, qtyMax: 1, unit: 'LS',
    unitCostLow: 280000, unitCostMid: 380000, unitCostHigh: 520000,
    basis: 'LADWP / SoCal Gas coordination', sensitivity: 'High',
    notes: null, inSummary: true, isArchived: false, sortOrder: 31,
  },
];

export const DEMO_SCENARIO = {
  id: 'demo-baseline',
  name: 'Baseline',
  globals: DEMO_GLOBALS,
  items: DEMO_ITEMS,
};

export const DEMO_PROJECT_META = {
  id: 'demo',
  name: 'Sample: 85,000 SF Civic Library — Burbank, CA',
};
