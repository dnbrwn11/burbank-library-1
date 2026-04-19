// Sample project: 45,000 SF civic library in Los Angeles at prevailing wage.
// ~120 line items across Substructure, Shell, Interiors, Services, Equipment,
// Sitework, and General Conditions. Realistic unit costs for 2026 LA pricing.

const _si = (cat, sub, desc, qmin, qmax, unit, low, mid, high, sens, order) => ({
  category: cat, subcategory: sub, description: desc,
  qty_min: qmin, qty_max: qmax, unit,
  unit_cost_low: low, unit_cost_mid: mid, unit_cost_high: high,
  sensitivity: sens, in_summary: true, is_archived: false,
  sort_order: order, basis: null, notes: null,
});

let i = 0;
const next = () => i++;

export const SAMPLE_LIBRARY_LINE_ITEMS = [
  // ── SUBSTRUCTURE (10) ──────────────────────────────────────────────────────
  _si('Substructure', 'Earthwork',     'Site excavation & mass cut',               3500,  5000,  'CY',    32,    45,    62,    'Medium', next()),
  _si('Substructure', 'Earthwork',     'Over-excavation & recompaction',           2500,  3500,  'CY',    38,    52,    68,    'Medium', next()),
  _si('Substructure', 'Earthwork',     'Temporary shoring at property line',       1,     1,     'LS',    120000, 180000, 260000, 'High', next()),
  _si('Substructure', 'Earthwork',     'Dewatering during construction',           1,     1,     'LS',    35000, 65000, 110000, 'High',   next()),
  _si('Substructure', 'Foundations',   'Spread footings — concrete & reinf',      18,    24,    'CY',    800,   1050,  1400,  'Medium', next()),
  _si('Substructure', 'Foundations',   'Continuous strip footings',                12,    18,    'CY',    780,   1020,  1380,  'Medium', next()),
  _si('Substructure', 'Foundations',   'Foundation walls (CIP)',                   280,   340,   'CY',    950,   1220,  1580,  'Medium', next()),
  _si('Substructure', 'Slab on Grade', 'Slab on grade — 5" with rebar',           45000, 45000, 'SF',    8.5,   11.2,  14.5,  'Low',    next()),
  _si('Substructure', 'Slab on Grade', 'Underslab vapor barrier & capillary break',45000, 45000, 'SF',    1.8,   2.6,   3.6,   'Low',    next()),
  _si('Substructure', 'Waterproofing', 'Below-grade waterproofing',                6500,  8500,  'SF',    12,    17,    24,    'Medium', next()),

  // ── SHELL — STRUCTURE (12) ─────────────────────────────────────────────────
  _si('Shell', 'Structure', 'Structural steel — columns',                  95,    115,   'TON',   7200,  8600,  10400, 'High',   next()),
  _si('Shell', 'Structure', 'Structural steel — beams & girders',         130,   160,   'TON',   7000,  8400,  10200, 'High',   next()),
  _si('Shell', 'Structure', 'Metal deck with concrete topping',            45000, 45000, 'SF',    22,    28,    36,    'Medium', next()),
  _si('Shell', 'Structure', 'Steel connections & misc. steel',             1,     1,     'LS',    180000, 250000, 340000, 'Medium', next()),
  _si('Shell', 'Structure', 'Steel fireproofing (SFRM)',                  45000, 45000, 'SF',    2.4,   3.2,   4.4,   'Low',    next()),
  _si('Shell', 'Structure', 'Shear walls & lateral bracing',               1,     1,     'LS',    220000, 310000, 420000, 'High',   next()),
  _si('Shell', 'Structure', 'Exterior stair structures',                   2,     2,     'each',  85000, 120000, 160000, 'Medium', next()),
  _si('Shell', 'Structure', 'Interior stair — monumental',                 1,     1,     'LS',    140000, 210000, 290000, 'Medium', next()),
  _si('Shell', 'Structure', 'Roof structure — long-span trusses',          90,    120,   'TON',   7800,  9500,  11600, 'Medium', next()),
  _si('Shell', 'Structure', 'Parapet framing & blocking',                  1,     1,     'LS',    65000, 92000, 130000, 'Medium', next()),
  _si('Shell', 'Structure', 'Canopy & entry feature structure',            1,     1,     'LS',    110000, 165000, 230000, 'Medium', next()),
  _si('Shell', 'Structure', 'Rough carpentry & blocking',                  1,     1,     'LS',    45000, 68000, 95000, 'Low',    next()),

  // ── SHELL — ENVELOPE (10) ──────────────────────────────────────────────────
  _si('Shell', 'Envelope', 'Curtain wall — reading rooms',                 5800,  7200,  'SF',    98,    128,   165,   'High',   next()),
  _si('Shell', 'Envelope', 'Storefront entries & vestibules',              1400,  1800,  'SF',    82,    108,   140,   'Medium', next()),
  _si('Shell', 'Envelope', 'Brick veneer — secondary elevations',          8500,  10500, 'SF',    42,    56,    75,    'Medium', next()),
  _si('Shell', 'Envelope', 'Metal panel rainscreen (ACM)',                 3200,  4500,  'SF',    54,    72,    96,    'Medium', next()),
  _si('Shell', 'Envelope', 'Cast stone accents & coping',                  1,     1,     'LS',    85000, 125000, 175000, 'Medium', next()),
  _si('Shell', 'Envelope', 'Exterior soffit systems',                      2200,  2800,  'SF',    28,    38,    52,    'Low',    next()),
  _si('Shell', 'Envelope', 'Air & vapor barrier system',                   22000, 26000, 'SF',    6.8,   9.2,   12.4,  'Low',    next()),
  _si('Shell', 'Envelope', 'Exterior sealants & flashings',                1,     1,     'LS',    48000, 68000, 92000, 'Low',    next()),
  _si('Shell', 'Envelope', 'Overhead coiling doors',                       2,     2,     'each',  18000, 26000, 36000, 'Low',    next()),
  _si('Shell', 'Envelope', 'Exterior sunshades & fins',                    1,     1,     'LS',    95000, 145000, 205000, 'Medium', next()),

  // ── SHELL — ROOFING (6) ────────────────────────────────────────────────────
  _si('Shell', 'Roofing', 'TPO membrane roof — 60 mil',                    48000, 48000, 'SF',    9.5,   12.5,  16.5,  'Low',    next()),
  _si('Shell', 'Roofing', 'Roof insulation — R-30 poly iso',               48000, 48000, 'SF',    5.2,   6.8,   9.0,   'Low',    next()),
  _si('Shell', 'Roofing', 'Green roof section — amenity terrace',          2500,  3500,  'SF',    38,    52,    72,    'Medium', next()),
  _si('Shell', 'Roofing', 'Skylights — clerestory & reading rooms',        12,    18,    'each',  9500,  14000, 19500, 'Medium', next()),
  _si('Shell', 'Roofing', 'Roof drains, scuppers & overflows',             1,     1,     'LS',    42000, 58000, 78000, 'Low',    next()),
  _si('Shell', 'Roofing', 'Roof hatches, ladders & fall protection',       1,     1,     'LS',    28000, 42000, 58000, 'Low',    next()),

  // ── INTERIORS — PARTITIONS (8) ─────────────────────────────────────────────
  _si('Interiors', 'Partitions', 'Metal stud partitions — standard',       42000, 52000, 'SF',    9.8,   13.5,  18.5,  'Medium', next()),
  _si('Interiors', 'Partitions', 'Shaft walls — fire-rated',               4500,  6000,  'SF',    16,    22,    30,    'Medium', next()),
  _si('Interiors', 'Partitions', 'Acoustic partitions — study rooms',      3800,  5200,  'SF',    14,    19,    26,    'Medium', next()),
  _si('Interiors', 'Partitions', 'Demountable glass partitions',           1200,  1800,  'SF',    68,    92,    125,   'Medium', next()),
  _si('Interiors', 'Partitions', 'Folding partition — community room',     1,     1,     'LS',    48000, 72000, 98000, 'Medium', next()),
  _si('Interiors', 'Partitions', 'Gypsum board & skim coat',               85000, 105000,'SF',    3.8,   5.2,   7.0,   'Low',    next()),
  _si('Interiors', 'Partitions', 'Sound attenuation batts',                42000, 52000, 'SF',    1.6,   2.2,   3.0,   'Low',    next()),
  _si('Interiors', 'Partitions', 'Corner guards & wall protection',        1,     1,     'LS',    18000, 28000, 42000, 'Low',    next()),

  // ── INTERIORS — FINISHES (10) ──────────────────────────────────────────────
  _si('Interiors', 'Flooring', 'Sealed & polished concrete',               14000, 18000, 'SF',    4.2,   5.8,   8.0,   'Low',    next()),
  _si('Interiors', 'Flooring', 'Carpet tile — reading rooms',              18000, 22000, 'SF',    6.8,   9.2,   12.4,  'Medium', next()),
  _si('Interiors', 'Flooring', 'Luxury vinyl tile — staff areas',          4500,  6500,  'SF',    8.2,   11.2,  14.8,  'Low',    next()),
  _si('Interiors', 'Flooring', 'Porcelain tile — restrooms & entry',       3800,  4800,  'SF',    18,    25,    34,    'Medium', next()),
  _si('Interiors', 'Flooring', 'Entry matting system (recessed)',          1,     1,     'LS',    22000, 34000, 48000, 'Low',    next()),
  _si('Interiors', 'Flooring', 'Resilient base & transitions',             45000, 45000, 'SF',    1.4,   2.0,   2.8,   'Low',    next()),
  _si('Interiors', 'Walls',    'Interior painting & coatings',             45000, 45000, 'SF',    3.2,   4.4,   6.0,   'Low',    next()),
  _si('Interiors', 'Walls',    'Wood wall paneling — accent walls',        1,     1,     'LS',    85000, 130000, 185000, 'High',   next()),
  _si('Interiors', 'Walls',    'Specialty acoustic wall panels',           2200,  3200,  'SF',    28,    42,    62,    'Medium', next()),
  _si('Interiors', 'Walls',    'Wallcoverings — decorative',               1,     1,     'LS',    28000, 45000, 68000, 'Medium', next()),

  // ── INTERIORS — CEILINGS (4) ───────────────────────────────────────────────
  _si('Interiors', 'Ceilings', 'Acoustical ceiling tile',                  28000, 34000, 'SF',    6.8,   9.2,   12.4,  'Low',    next()),
  _si('Interiors', 'Ceilings', 'Gypsum board ceilings',                    8000,  12000, 'SF',    10.5,  14.2,  18.8,  'Low',    next()),
  _si('Interiors', 'Ceilings', 'Wood slat ceiling — feature',              3500,  5000,  'SF',    38,    54,    76,    'High',   next()),
  _si('Interiors', 'Ceilings', 'Exposed structure — painted',              4500,  6000,  'SF',    4.2,   5.8,   8.2,   'Low',    next()),

  // ── INTERIORS — DOORS & SPECIALTIES (10) ───────────────────────────────────
  _si('Interiors', 'Doors', 'Interior wood doors & frames',                 85,    110,   'each',  1650,  2400,  3400,  'Medium', next()),
  _si('Interiors', 'Doors', 'Interior glass doors — study rooms',           18,    26,    'each',  3800,  5400,  7500,  'Medium', next()),
  _si('Interiors', 'Doors', 'Hollow metal door assemblies',                 22,    32,    'each',  1900,  2700,  3800,  'Medium', next()),
  _si('Interiors', 'Doors', 'Door hardware allowance',                      1,     1,     'LS',    95000, 140000, 195000, 'Medium', next()),
  _si('Interiors', 'Doors', 'Automatic entry operators',                    3,     3,     'each',  8500,  12500, 17500, 'Low',    next()),
  _si('Interiors', 'Specialties', 'Signage & wayfinding — interior',        1,     1,     'LS',    95000, 145000, 210000, 'Medium', next()),
  _si('Interiors', 'Specialties', 'Toilet partitions — solid phenolic',     24,    32,    'each',  2400,  3400,  4600,  'Low',    next()),
  _si('Interiors', 'Specialties', 'Toilet accessories',                     1,     1,     'LS',    28000, 42000, 58000, 'Low',    next()),
  _si('Interiors', 'Specialties', 'Lockers — staff',                        28,    40,    'each',  380,   540,   760,   'Low',    next()),
  _si('Interiors', 'Specialties', 'Fire extinguishers & cabinets',          1,     1,     'LS',    12000, 18000, 26000, 'Low',    next()),

  // ── INTERIORS — MILLWORK (4) ───────────────────────────────────────────────
  _si('Interiors', 'Millwork', 'Service desk — millwork',                   1,     1,     'LS',    175000, 265000, 385000, 'High',   next()),
  _si('Interiors', 'Millwork', 'Library stacks & shelving (owner)',         1,     1,     'LS',    240000, 365000, 520000, 'High',   next()),
  _si('Interiors', 'Millwork', 'Built-in reading banquettes',               1,     1,     'LS',    95000, 145000, 210000, 'Medium', next()),
  _si('Interiors', 'Millwork', 'Staff break room & workroom millwork',      1,     1,     'LS',    48000, 72000, 105000, 'Medium', next()),

  // ── SERVICES — HVAC (10) ───────────────────────────────────────────────────
  _si('Services', 'Mechanical', 'Air handling units (central)',             3,     3,     'each',  65000, 95000, 135000, 'High',   next()),
  _si('Services', 'Mechanical', 'VAV boxes with reheat',                    55,    75,    'each',  2400,  3400,  4800,  'Medium', next()),
  _si('Services', 'Mechanical', 'Ductwork — supply & return',               45000, 45000, 'SF',    9.8,   13.2,  17.8,  'Medium', next()),
  _si('Services', 'Mechanical', 'Grilles, registers & diffusers',           1,     1,     'LS',    58000, 85000, 120000, 'Low',    next()),
  _si('Services', 'Mechanical', 'Chilled water plant — chiller',            1,     1,     'LS',    320000, 475000, 680000, 'High',   next()),
  _si('Services', 'Mechanical', 'Cooling tower',                            1,     1,     'LS',    145000, 215000, 305000, 'Medium', next()),
  _si('Services', 'Mechanical', 'Hot water boilers',                        2,     2,     'each',  42000, 62000, 88000, 'Medium', next()),
  _si('Services', 'Mechanical', 'Hydronic piping & insulation',             1,     1,     'LS',    185000, 280000, 405000, 'Medium', next()),
  _si('Services', 'Mechanical', 'HVAC testing, adjusting & balancing',      1,     1,     'LS',    45000, 68000, 95000, 'Low',    next()),
  _si('Services', 'Mechanical', 'Exhaust fans & energy recovery',           1,     1,     'LS',    72000, 108000, 155000, 'Medium', next()),

  // ── SERVICES — PLUMBING (6) ────────────────────────────────────────────────
  _si('Services', 'Plumbing', 'Domestic water — copper/PEX distribution',   45000, 45000, 'SF',    3.4,   4.6,   6.2,   'Low',    next()),
  _si('Services', 'Plumbing', 'Sanitary & storm drainage piping',           45000, 45000, 'SF',    4.8,   6.5,   8.8,   'Low',    next()),
  _si('Services', 'Plumbing', 'Plumbing fixtures (WC, lav, drinking)',      48,    62,    'each',  1650,  2400,  3400,  'Medium', next()),
  _si('Services', 'Plumbing', 'Water heaters & circulation pumps',          1,     1,     'LS',    52000, 78000, 112000, 'Low',    next()),
  _si('Services', 'Plumbing', 'Natural gas piping & meters',                1,     1,     'LS',    28000, 42000, 60000, 'Low',    next()),
  _si('Services', 'Plumbing', 'Roof & floor drains',                        1,     1,     'LS',    22000, 34000, 48000, 'Low',    next()),

  // ── SERVICES — FIRE PROTECTION (3) ─────────────────────────────────────────
  _si('Services', 'Fire Protection', 'Wet sprinkler system',                45000, 45000, 'SF',    4.2,   5.8,   8.0,   'Low',    next()),
  _si('Services', 'Fire Protection', 'Fire pump & backflow',                1,     1,     'LS',    48000, 72000, 105000, 'Low',    next()),
  _si('Services', 'Fire Protection', 'Standpipes & hose connections',       1,     1,     'LS',    28000, 42000, 60000, 'Low',    next()),

  // ── SERVICES — ELECTRICAL (8) ──────────────────────────────────────────────
  _si('Services', 'Electrical', 'Main electrical service & switchgear',     1,     1,     'LS',    185000, 275000, 395000, 'Medium', next()),
  _si('Services', 'Electrical', 'Distribution panels & transformers',       1,     1,     'LS',    125000, 185000, 265000, 'Medium', next()),
  _si('Services', 'Electrical', 'Branch circuit wiring & devices',          45000, 45000, 'SF',    7.5,   10.2,  13.8,  'Medium', next()),
  _si('Services', 'Electrical', 'Interior lighting — LED fixtures',         45000, 45000, 'SF',    8.8,   12.0,  16.2,  'Medium', next()),
  _si('Services', 'Electrical', 'Lighting controls (DLM)',                  45000, 45000, 'SF',    2.2,   3.0,   4.2,   'Low',    next()),
  _si('Services', 'Electrical', 'Site & exterior lighting',                 1,     1,     'LS',    72000, 108000, 155000, 'Medium', next()),
  _si('Services', 'Electrical', 'Emergency generator (life safety)',        1,     1,     'LS',    145000, 215000, 305000, 'High',   next()),
  _si('Services', 'Electrical', 'Grounding & lightning protection',         1,     1,     'LS',    45000, 68000, 97000, 'Low',    next()),

  // ── SERVICES — LOW VOLTAGE / TECH (6) ──────────────────────────────────────
  _si('Services', 'Technology', 'Structured cabling (Cat6A)',               45000, 45000, 'SF',    2.8,   3.8,   5.2,   'Low',    next()),
  _si('Services', 'Technology', 'Wi-Fi infrastructure & APs',               1,     1,     'LS',    85000, 125000, 180000, 'Medium', next()),
  _si('Services', 'Technology', 'Security — CCTV & access control',         1,     1,     'LS',    95000, 145000, 205000, 'Medium', next()),
  _si('Services', 'Technology', 'Fire alarm system',                        45000, 45000, 'SF',    2.2,   3.0,   4.2,   'Low',    next()),
  _si('Services', 'Technology', 'AV — community room & classrooms',         1,     1,     'LS',    125000, 185000, 265000, 'Medium', next()),
  _si('Services', 'Technology', 'Paging / assistive listening',             1,     1,     'LS',    22000, 34000, 48000, 'Low',    next()),

  // ── SERVICES — CONVEYANCE (2) ──────────────────────────────────────────────
  _si('Services', 'Vertical Transport', 'Passenger elevators',              2,     2,     'each',  135000, 195000, 275000, 'Medium', next()),
  _si('Services', 'Vertical Transport', 'Book lift (dumbwaiter)',           1,     1,     'LS',    45000, 68000, 97000, 'Low',    next()),

  // ── EQUIPMENT & FURNISHINGS (4) ────────────────────────────────────────────
  _si('Equipment', 'Library Equipment', 'Self-service checkout kiosks',     6,     8,     'each',  18000, 26000, 36000, 'Low',    next()),
  _si('Equipment', 'Library Equipment', 'RFID security gates',              2,     2,     'each',  22000, 32000, 45000, 'Low',    next()),
  _si('Equipment', 'Library Equipment', 'Public computer stations',         24,    32,    'each',  2200,  3200,  4400,  'Medium', next()),
  _si('Equipment', 'Library Equipment', 'Study-room booking systems',       1,     1,     'LS',    28000, 42000, 58000, 'Low',    next()),

  // ── SITEWORK (9) ───────────────────────────────────────────────────────────
  _si('Sitework', 'Demolition',   'Site demolition & disposal',             1,     1,     'LS',    85000, 125000, 180000, 'Medium', next()),
  _si('Sitework', 'Earthwork',    'Site grading & compaction',              1,     1,     'LS',    95000, 145000, 210000, 'Medium', next()),
  _si('Sitework', 'Utilities',    'Water, sewer & storm utility connections',1,    1,     'LS',    180000, 265000, 380000, 'High',   next()),
  _si('Sitework', 'Utilities',    'Site electrical & telecom',              1,     1,     'LS',    95000, 142000, 205000, 'Medium', next()),
  _si('Sitework', 'Hardscape',    'Asphalt paving — parking lot',           26000, 32000, 'SF',    6.8,   9.2,   12.5,  'Medium', next()),
  _si('Sitework', 'Hardscape',    'Concrete walks & plaza',                 8500,  12000, 'SF',    14,    19,    26,    'Medium', next()),
  _si('Sitework', 'Hardscape',    'Site furnishings (benches, bollards)',   1,     1,     'LS',    48000, 72000, 105000, 'Low',    next()),
  _si('Sitework', 'Landscape',    'Landscape planting & irrigation',        12000, 16000, 'SF',    7.5,   10.5,  14.5,  'Medium', next()),
  _si('Sitework', 'Landscape',    'Stormwater capture & bioswales',         1,     1,     'LS',    85000, 128000, 185000, 'Medium', next()),

  // ── GENERAL CONDITIONS (5) ─────────────────────────────────────────────────
  _si('General Conditions', 'Supervision', 'General conditions & supervision', 1,  1,     'LS',    680000, 980000, 1360000,'Medium', next()),
  _si('General Conditions', 'Temporary',   'Temporary facilities & utilities',  1,  1,     'LS',    165000, 245000, 350000,'Medium', next()),
  _si('General Conditions', 'Temporary',   'Jobsite security & fencing',        1,  1,     'LS',    68000, 105000, 152000, 'Low',    next()),
  _si('General Conditions', 'Insurance',   'Builder\'s risk insurance',         1,  1,     'LS',    95000, 145000, 205000, 'Low',    next()),
  _si('General Conditions', 'Permits',     'Permits & plan-check allowance',    1,  1,     'LS',    145000, 220000, 315000, 'Medium', next()),
];

export const SAMPLE_PROJECT = {
  name: 'Sample: Civic Center Library',
  client_name: 'City of Los Angeles',
  client_type: 'Public Municipality',
  city: 'Los Angeles',
  state: 'CA',
  building_type: 'Civic/Library',
  scope_type: 'new_construction',
  delivery_method: 'CM at Risk (GMP)',
  labor_type: 'Prevailing Wage',
  gross_sf: 45000,
  target_budget: 45000000,
  status: 'sample',
};

export const SAMPLE_GLOBALS = {
  escalation: 0.04,
  laborBurden: 0.42,
  tax: 0.0975,
  insurance: 0.012,
  contingency: 0.05,
  fee: 0.045,
  regionFactor: 1.15,
  bond: 0.008,
  generalConditions: 0.08,
  buildingSF: 45000,
  parkingStalls: 0,
  openSpaceSF: 0,
};
