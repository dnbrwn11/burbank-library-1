import { useState, useEffect } from 'react';
import { getScenarios, createLineItems, updateGlobals as saveGlobals } from '../supabase/db';

const ACCENT = '#B89030';
const HEADER = '#222222';
const BG = '#F9F9F8';

const PLACEHOLDERS = [
  "97,500 SF civic library — reading room, digital media lab, children's wing, underground parking. LEED Silver. Seismic Zone D.",
  "12-story Class A office tower, 220,000 SF. LEED Gold. 4-level parking podium, ground-floor retail.",
  "52-story residential high-rise, 450 units, 3-level podium parking, rooftop terrace, Phase 1 of master plan.",
  "85,000 SF K-12 campus — gymnasium, cafeteria, DSA compliance, phased to keep existing school open.",
  "65,000 SF outpatient medical building — imaging suite, 4 ORs, OSHPD compliance, emergency generator backup.",
  "8-story mixed-use TOD — ground-floor retail, 120 residential units above, 2-level underground parking.",
];

// ── Project-aware helpers ──────────────────────────────────────────────────────

function buildStarterText(project) {
  const sf   = project.gross_sf  ? `${Number(project.gross_sf).toLocaleString()} SF` : '';
  const type = project.building_type || '';
  const loc  = [project.city, project.state].filter(Boolean).join(', ');
  let text   = [sf, type, loc ? `in ${loc}` : ''].filter(Boolean).join(' ');
  const extras = [project.labor_type, project.delivery_method].filter(Boolean);
  if (extras.length) text += `. ${extras.join(', ')}`;
  if (project.target_budget) text += `. Target budget: $${Number(project.target_budget).toLocaleString()}`;
  return text ? text + '.' : '';
}

const TEMPLATE_DEFS = [
  {
    label: 'Civic Library', icon: '📚',
    matchTypes: ['Library', 'Civic'],
    buildText: (p) => `New ${p.sf} SF public library and civic center in ${p.city}, ${p.state}. Three-story building with full-height reading room, digital media lab, children's wing with story room, community meeting rooms, maker space, and underground parking structure. ${p.labor}. ${p.delivery}. LEED Silver target.`,
  },
  {
    label: 'K-12 School', icon: '🏫',
    matchTypes: ['Education'],
    buildText: (p) => `New ${p.sf} SF K-12 campus in ${p.city}, ${p.state}. Single-story classroom wings, two-story administration building, gymnasium with bleachers, cafeteria and full commercial kitchen, covered outdoor walkways. ${p.labor}. ${p.delivery}. DSA-compliant. Phased to keep existing school operational.`,
  },
  {
    label: 'High-Rise Residential', icon: '🏢',
    matchTypes: ['Multi-Family', 'Residential'],
    buildText: (p) => `52-story high-rise residential tower in ${p.city}, ${p.state}. 450 market-rate units (studios, 1BR, 2BR), 3-level podium parking (400 stalls), ground-floor retail, amenity deck on level 6, rooftop terrace. ${p.labor}. ${p.delivery}. Concrete moment frame, Type I-A construction.`,
  },
  {
    label: 'Office Building', icon: '🏬',
    matchTypes: ['Office'],
    buildText: (p) => `12-story Class A office building in ${p.city}, ${p.state}, ${p.sf} GSF. LEED Gold target. Open floor plates averaging 18,500 SF, two-story lobby, ground-floor retail, 4-level parking podium (600 stalls). ${p.labor}. ${p.delivery}. Steel moment frame with concrete core.`,
  },
  {
    label: 'Healthcare', icon: '🏥',
    matchTypes: ['Healthcare'],
    buildText: (p) => `${p.sf} SF outpatient medical office building in ${p.city}, ${p.state}. Ground-floor imaging suite (MRI, CT, X-ray), second-floor ASC (4 ORs, PACU, sterile processing), upper floors general clinic. ${p.labor}. ${p.delivery}. OSHPD compliant. N+1 emergency generator.`,
  },
  {
    label: 'Data Center', icon: '💻',
    matchTypes: [],
    buildText: (p) => `Tier III data center in ${p.city}, ${p.state}, 40,000 SF. 15,000 SF critical whitespace, 8 MW IT load. N+1 UPS and generator redundancy, raised floor, precision cooling, fiber entry vaults. ${p.labor}. ${p.delivery}.`,
  },
  {
    label: 'Mixed-Use', icon: '🏙️',
    matchTypes: ['Mixed-Use'],
    buildText: (p) => `Mixed-use transit-oriented development in ${p.city}, ${p.state}. 8-story building: ground-floor retail/restaurant (8,000 SF), 7 floors residential (120 units, 1BR and 2BR), 2 levels underground parking (140 stalls), courtyard amenity deck, rooftop terrace. ${p.labor}. ${p.delivery}.`,
  },
  {
    label: 'Sports Arena', icon: '🏟️',
    matchTypes: [],
    buildText: (p) => `Multi-purpose indoor arena in ${p.city}, ${p.state}, 8,500 seats, 285,000 GSF. Main bowl with retractable seating, premium club level, 12 luxury suites, broadcast infrastructure, commercial kitchen, locker rooms, surface parking. ${p.labor}. ${p.delivery}.`,
  },
];

// Subtype cards keyed by ProjectDashboard BUILDING_TYPES values.
// `recommended: true` marks the most common subtype (shown first with badge).
const SUBTYPE_DEFS = {
  'Library / Civic Center': [
    { label: 'Main Branch Library',       icon: '📚', recommended: true,
      buildText: (p) => `New ${p.sf} SF main branch public library in ${p.city}, ${p.state}. Three-story building with full-height reading room, digital media lab, children's wing with story room, teen center, community meeting rooms, maker space, café, and underground parking structure. ${p.labor}. ${p.delivery}. LEED Silver target.` },
    { label: 'Community Branch Library',  icon: '📖', recommended: false,
      buildText: (p) => `New ${p.sf} SF community branch library in ${p.city}, ${p.state}. Single-story building with open reading room, children's corner, study rooms, computer lab, and surface parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Civic Center + Library',    icon: '🏛️', recommended: false,
      buildText: (p) => `New ${p.sf} SF combined civic center and public library in ${p.city}, ${p.state}. Library with reading room and media lab, city council chambers, administrative offices, public meeting rooms, and structured parking. ${p.labor}. ${p.delivery}. LEED Gold target.` },
    { label: 'Library Renovation / Expansion', icon: '🔄', recommended: false,
      buildText: (p) => `Renovation and ${p.sf} SF addition to existing public library in ${p.city}, ${p.state}. New wing with expanded children's services, digital media lab, updated HVAC/electrical, ADA upgrades, new roof, and reconfigured parking. ${p.labor}. ${p.delivery}.` },
  ],
  'Office': [
    { label: 'Class A High-Rise Office',   icon: '🏢', recommended: true,
      buildText: (p) => `${p.sf} SF Class A high-rise office tower in ${p.city}, ${p.state}. 12 stories, open floor plates, two-story lobby with feature stair, ground-floor retail, 4-level parking podium (600 stalls). ${p.labor}. ${p.delivery}. LEED Gold target. Steel moment frame.` },
    { label: 'Mid-Rise Office Campus',     icon: '🏬', recommended: false,
      buildText: (p) => `${p.sf} SF mid-rise office campus in ${p.city}, ${p.state}. 4–6 story buildings, structured parking, campus walkways, outdoor amenity space, shared conference center. ${p.labor}. ${p.delivery}. LEED Silver target.` },
    { label: 'Medical Office Building',   icon: '🏥', recommended: false,
      buildText: (p) => `${p.sf} SF medical office building (MOB) in ${p.city}, ${p.state}. Clinical suites, imaging, procedure rooms, administrative offices. Surface and structured parking. ${p.labor}. ${p.delivery}. Healthcare-grade MEP throughout.` },
    { label: 'Government / Civic Office', icon: '🏛️', recommended: false,
      buildText: (p) => `${p.sf} SF government office building in ${p.city}, ${p.state}. Open office floors, public-facing service counters, hearing rooms, server room, emergency generator, and secure parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Creative / Tech Office',    icon: '💡', recommended: false,
      buildText: (p) => `${p.sf} SF creative/tech office in ${p.city}, ${p.state}. Open plan, exposed structure, collaborative breakout areas, rooftop deck, bike storage, showers. ${p.labor}. ${p.delivery}. LEED Gold target.` },
    { label: 'Tenant Improvement',        icon: '🔧', recommended: false,
      buildText: (p) => `${p.sf} SF office tenant improvement in ${p.city}, ${p.state}. Full demolition and rebuild: new partitions, ceiling, lighting, MEP distribution, IT infrastructure, custom millwork, restroom upgrades. ${p.labor}. ${p.delivery}.` },
    { label: 'Office + Ground Floor Retail', icon: '🏪', recommended: false,
      buildText: (p) => `${p.sf} SF mixed-use office building in ${p.city}, ${p.state}. Ground-floor retail/restaurant (8,000 SF), upper floors Class A office, structured parking. ${p.labor}. ${p.delivery}. LEED Silver target.` },
    { label: 'Corporate Headquarters',    icon: '🏆', recommended: false,
      buildText: (p) => `${p.sf} SF corporate headquarters campus in ${p.city}, ${p.state}. Signature architecture, executive floors, full-service café, fitness center, auditorium (300 seats), structured parking. ${p.labor}. ${p.delivery}. LEED Platinum target.` },
  ],
  'Multi-Family Residential': [
    { label: 'High-Rise Residential',  icon: '🏢', recommended: true,
      buildText: (p) => `${p.sf} SF high-rise residential tower in ${p.city}, ${p.state}. 450 market-rate units (studios, 1BR, 2BR), 3-level podium parking, ground-floor retail, amenity deck, rooftop terrace. ${p.labor}. ${p.delivery}. Concrete moment frame, Type I-A.` },
    { label: 'Mid-Rise Apartments',   icon: '🏘️', recommended: false,
      buildText: (p) => `${p.sf} SF mid-rise apartment complex in ${p.city}, ${p.state}. 6–8 story wood-frame over concrete podium, 150 units, podium parking, courtyard amenity space, rooftop deck. ${p.labor}. ${p.delivery}. Type III-A construction.` },
    { label: 'Podium Mixed-Use',      icon: '🏙️', recommended: false,
      buildText: (p) => `${p.sf} SF podium mixed-use residential in ${p.city}, ${p.state}. Ground-floor retail (10,000 SF), 2 levels parking, 6 residential floors (120 units). ${p.labor}. ${p.delivery}. Type III-A over Type I-A podium.` },
    { label: 'Affordable Housing',    icon: '🏠', recommended: false,
      buildText: (p) => `${p.sf} SF affordable housing complex in ${p.city}, ${p.state}. 100 units (1BR–3BR), surface parking, community room, on-site management office. LIHTC project. ${p.labor}. ${p.delivery}.` },
    { label: 'Senior Living',         icon: '🧓', recommended: false,
      buildText: (p) => `${p.sf} SF senior living facility in ${p.city}, ${p.state}. Independent living units, assisted living suites, memory care wing, dining, fitness, activity rooms, surface parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Build-to-Rent',         icon: '🏡', recommended: false,
      buildText: (p) => `${p.sf} SF build-to-rent single-family community in ${p.city}, ${p.state}. Detached and attached units, private yards, community clubhouse and pool, alley-loaded garages. ${p.labor}. ${p.delivery}.` },
  ],
  'Mixed-Use': [
    { label: 'TOD Mixed-Use',        icon: '🚆', recommended: true,
      buildText: (p) => `${p.sf} SF transit-oriented mixed-use in ${p.city}, ${p.state}. Ground-floor retail, residential floors above, 2-level underground parking, courtyard amenity deck, rooftop terrace. ${p.labor}. ${p.delivery}.` },
    { label: 'Urban Infill Mixed-Use', icon: '🏙️', recommended: false,
      buildText: (p) => `${p.sf} SF urban infill mixed-use in ${p.city}, ${p.state}. Retail ground floor, office floors 2–4, residential floors 5–8, underground parking. ${p.labor}. ${p.delivery}. LEED Silver target.` },
    { label: 'Retail + Residential', icon: '🏬', recommended: false,
      buildText: (p) => `${p.sf} SF retail-over-residential in ${p.city}, ${p.state}. Ground-floor retail (12,000 SF), 5 residential floors (80 units), podium parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Hotel + Retail',       icon: '🏨', recommended: false,
      buildText: (p) => `${p.sf} SF hotel and retail mixed-use in ${p.city}, ${p.state}. 150-key select service hotel, ground-floor retail and restaurant, structured parking, rooftop bar. ${p.labor}. ${p.delivery}.` },
  ],
  'Retail': [
    { label: 'Neighborhood Shopping Center', icon: '🏪', recommended: true,
      buildText: (p) => `${p.sf} SF neighborhood shopping center in ${p.city}, ${p.state}. Inline retail suites, anchor grocery tenant (45,000 SF), surface parking (400 stalls), outpads for drive-through tenants. ${p.labor}. ${p.delivery}.` },
    { label: 'Grocery-Anchored Strip Mall', icon: '🛒', recommended: false,
      buildText: (p) => `${p.sf} SF grocery-anchored strip center in ${p.city}, ${p.state}. 50,000 SF anchor, inline retail, drive-through endcap, ample surface parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Single Tenant Retail',       icon: '🏬', recommended: false,
      buildText: (p) => `${p.sf} SF freestanding single-tenant retail building in ${p.city}, ${p.state}. Drive-through service window, surface parking, prominent signage. ${p.labor}. ${p.delivery}.` },
    { label: 'Retail Renovation',          icon: '🔄', recommended: false,
      buildText: (p) => `${p.sf} SF retail renovation in ${p.city}, ${p.state}. Full interior and facade upgrade, updated MEP systems, ADA compliance, parking lot resurfacing. ${p.labor}. ${p.delivery}.` },
  ],
  'Hospitality': [
    { label: 'Select Service Hotel', icon: '🏨', recommended: true,
      buildText: (p) => `${p.sf} SF select service hotel in ${p.city}, ${p.state}. 120 keys, fitness center, breakfast area, meeting room, surface parking. ${p.labor}. ${p.delivery}. Franchise flag (Marriott/Hilton/IHG).` },
    { label: 'Full Service Hotel',   icon: '🌟', recommended: false,
      buildText: (p) => `${p.sf} SF full service hotel in ${p.city}, ${p.state}. 200 keys, full-service restaurant and bar, ballroom (5,000 SF), 10,000 SF meeting space, fitness center, pool, structured parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Extended Stay',        icon: '🛏️', recommended: false,
      buildText: (p) => `${p.sf} SF extended stay hotel in ${p.city}, ${p.state}. 150 studio and 1BR suites with kitchenettes, fitness center, coin laundry, surface parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Boutique Hotel',       icon: '✨', recommended: false,
      buildText: (p) => `${p.sf} SF boutique hotel in ${p.city}, ${p.state}. 80 uniquely designed rooms, rooftop bar and lounge, ground-floor restaurant, valet parking. ${p.labor}. ${p.delivery}. High-end finishes throughout.` },
  ],
  'Industrial': [
    { label: 'Distribution Warehouse',     icon: '📦', recommended: true,
      buildText: (p) => `${p.sf} SF distribution warehouse in ${p.city}, ${p.state}. 36' clear height, 60 dock doors, 4 drive-in doors, ESFR sprinkler, LED lighting, 200 trailer stalls. ${p.labor}. ${p.delivery}.` },
    { label: 'Light Industrial / Flex',    icon: '🏭', recommended: false,
      buildText: (p) => `${p.sf} SF light industrial/flex building in ${p.city}, ${p.state}. 24' clear height, grade-level doors, front office build-out (20% of area), surface parking. ${p.labor}. ${p.delivery}.` },
    { label: 'Cold Storage / Food Grade',  icon: '❄️', recommended: false,
      buildText: (p) => `${p.sf} SF cold storage facility in ${p.city}, ${p.state}. Blast freeze, cooler and freezer zones, insulated metal panel construction, refrigerated dock doors, ammonia refrigeration. ${p.labor}. ${p.delivery}.` },
    { label: 'Manufacturing',              icon: '⚙️', recommended: false,
      buildText: (p) => `${p.sf} SF manufacturing facility in ${p.city}, ${p.state}. Heavy power (4 MW), overhead crane provisions (50-ton), 30' clear height, process piping, hazmat storage, surface parking. ${p.labor}. ${p.delivery}.` },
  ],
  'Healthcare': [
    { label: 'Outpatient Medical Office', icon: '🏥', recommended: true,
      buildText: (p) => `${p.sf} SF outpatient medical office building in ${p.city}, ${p.state}. Imaging suite (MRI, CT, X-ray), ASC (4 ORs, PACU, sterile processing), general clinic floors. ${p.labor}. ${p.delivery}. OSHPD-3 compliant. N+1 emergency generator.` },
    { label: 'Ambulatory Surgery Center', icon: '⚕️', recommended: false,
      buildText: (p) => `${p.sf} SF ambulatory surgery center in ${p.city}, ${p.state}. 6 ORs, PACU, pre-op holding, central sterile, pharmacy, medical gas systems. ${p.labor}. ${p.delivery}. OSHPD-2 compliant. 100% backup generator.` },
    { label: 'Urgent Care / Clinic',      icon: '🩺', recommended: false,
      buildText: (p) => `${p.sf} SF urgent care clinic in ${p.city}, ${p.state}. Exam rooms, procedure room, X-ray suite, waiting area, lab draw station. ${p.labor}. ${p.delivery}. OSHPD-3 compliant.` },
    { label: 'Hospital Wing Addition',    icon: '🏨', recommended: false,
      buildText: (p) => `${p.sf} SF hospital inpatient wing addition in ${p.city}, ${p.state}. 80 private patient rooms, nursing stations, clean/soiled utility, patient lift system, dock connection to existing. ${p.labor}. ${p.delivery}. OSHPD-1 compliant.` },
  ],
  'Education': [
    { label: 'K-12 School Campus',            icon: '🏫', recommended: true,
      buildText: (p) => `${p.sf} SF K-12 campus in ${p.city}, ${p.state}. Classroom wings, administration building, gymnasium with bleachers, cafeteria with commercial kitchen, covered walkways. ${p.labor}. ${p.delivery}. DSA-compliant. Phased to keep existing school operational.` },
    { label: 'Community College Building',    icon: '🎓', recommended: false,
      buildText: (p) => `${p.sf} SF community college instructional building in ${p.city}, ${p.state}. Flexible classrooms, computer labs, student collaboration areas, faculty offices, campus-connected covered walkways. ${p.labor}. ${p.delivery}. DSA-compliant. LEED Silver target.` },
    { label: 'University Classroom Building', icon: '🏛️', recommended: false,
      buildText: (p) => `${p.sf} SF university classroom and office building in ${p.city}, ${p.state}. Lecture halls (150, 300, 500 seats), seminar rooms, faculty offices, student lounge, underground parking. ${p.labor}. ${p.delivery}. LEED Gold target.` },
    { label: 'Early Childhood Center',        icon: '🧒', recommended: false,
      buildText: (p) => `${p.sf} SF early childhood education center in ${p.city}, ${p.state}. Classrooms for infant through pre-K, outdoor play areas, kitchen, multipurpose room. ${p.labor}. ${p.delivery}. DSA-compliant.` },
  ],
  'Parking Structure': [
    { label: 'Above-Grade Parking Garage',  icon: '🚗', recommended: true,
      buildText: (p) => `${p.sf} SF above-grade parking structure in ${p.city}, ${p.state}. 600 stalls, post-tensioned concrete, open-air design, EV charging (20%), ground-floor activated frontage. ${p.labor}. ${p.delivery}.` },
    { label: 'Underground Parking',         icon: '⬇️', recommended: false,
      buildText: (p) => `${p.sf} SF underground parking structure in ${p.city}, ${p.state}. 300 stalls, 2 basement levels, waterproofing, sump pumps, mechanical ventilation, EV charging rough-in. ${p.labor}. ${p.delivery}.` },
    { label: 'Mixed-Use Parking + Retail',  icon: '🏪', recommended: false,
      buildText: (p) => `${p.sf} SF parking structure with ground-floor retail in ${p.city}, ${p.state}. 500 stalls, activated retail frontage (8,000 SF), EV charging, bicycle parking. ${p.labor}. ${p.delivery}.` },
  ],
};

function buildTemplates(project) {
  const params = {
    sf:       project.gross_sf ? Number(project.gross_sf).toLocaleString() : '97,500',
    city:     project.city || 'Los Angeles',
    state:    project.state || 'CA',
    labor:    project.labor_type || 'Prevailing Wage',
    delivery: project.delivery_method || 'CM at Risk (GMP)',
  };
  const bt = project.building_type || '';

  // If we have subtypes for this building type, use them (recommended first)
  const subtypeDefs = bt && SUBTYPE_DEFS[bt];
  if (subtypeDefs?.length) {
    const all = subtypeDefs.map(t => ({ label: t.label, icon: t.icon, text: t.buildText(params), recommended: t.recommended }));
    return [...all.filter(t => t.recommended), ...all.filter(t => !t.recommended)];
  }

  // Fallback: generic cross-type templates with project values
  const recLabel = TEMPLATE_DEFS.find(t => t.matchTypes.some(m => bt.includes(m)))?.label ?? null;
  const all = TEMPLATE_DEFS.map(t => ({ label: t.label, icon: t.icon, text: t.buildText(params), recommended: t.label === recLabel }));
  return [...all.filter(t => t.recommended), ...all.filter(t => !t.recommended)];
}

const SEISMIC_STATES   = new Set(['CA','OR','WA','AK','NV','UT','ID','MT','HI']);
const HURRICANE_STATES = new Set(['FL','TX','LA','MS','AL','SC','NC','GA','VA']);
const SNOW_STATES      = new Set(['CO','UT','MT','WY','MN','WI','MI','NY','VT','NH','ME','MA','PA']);

function buildChips(project) {
  const state = project.state || '';
  const bt    = project.building_type || '';
  const chips = [];

  if (SEISMIC_STATES.has(state))   chips.push('Seismic Zone D reinforcement');
  if (HURRICANE_STATES.has(state)) chips.push('Hurricane-resistant construction');
  if (SNOW_STATES.has(state))      chips.push('Heavy snow load design');

  chips.push('LEED Gold certification', 'Rooftop solar PV array');

  if (bt.includes('Library') || bt.includes('Civic')) {
    chips.push('Structured underground parking', "Children's wing & maker space", 'Digital media lab');
  } else if (bt.includes('Office')) {
    chips.push('4-level parking podium', 'Open floor plate design', 'Building automation system');
  } else if (bt.includes('Residential') || bt.includes('Multi-Family')) {
    chips.push('Amenity deck & rooftop terrace', 'Underground parking structure', 'Ground-floor retail');
  } else if (bt.includes('Healthcare')) {
    chips.push('OSHPD-3 compliance', 'N+1 generator redundancy', 'Imaging suite (MRI, CT)');
  } else if (bt.includes('Education')) {
    chips.push('DSA compliance', 'Gymnasium with bleachers', 'Covered outdoor walkways');
  } else if (bt.includes('Mixed-Use')) {
    chips.push('Ground-floor retail', '2-level underground parking', 'Courtyard amenity space');
  } else {
    chips.push('3-level structured parking', 'High-end lobby finishes', 'Full MEP commissioning');
  }

  if (project.labor_type === 'Prevailing Wage') chips.push('Prevailing wage labor');
  else if (project.labor_type === 'Union')      chips.push('Union labor rates');

  chips.push('Phased construction');
  return [...new Set(chips)].slice(0, 10);
}

const STATUS_MSGS = [
  'Analyzing project scope…',
  'Calibrating to {city} market pricing…',
  'Generating CSI UniFormat line items…',
  'Applying regional labor rates…',
  'Computing quantities and unit costs…',
  'Validating estimate structure…',
];

const CSI_ORDER = [
  'Substructure', 'Shell', 'Interiors', 'Services', 'Equipment',
  'Special Construction', 'Sitework', 'General Conditions', 'Overhead & Fee', 'Contingency',
];

function fmtM(n) {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function pct(n) {
  if (!n && n !== 0) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function itemMidCost(item) {
  const qty = Number(item.qty_min) === Number(item.qty_max)
    ? Number(item.qty_min)
    : (Number(item.qty_min) + Number(item.qty_max)) / 2;
  return (qty || 0) * (Number(item.unit_cost_mid) || 0);
}

function applyGlobals(raw, g) {
  if (!g) return raw;
  return raw
    * (1 + (g.generalConditions || 0.09))
    * (1 + (g.contingency || 0.10))
    * (1 + (g.fee || 0.045))
    * (1 + (g.escalation || 0.04))
    * (1 + (g.bond || 0.008) + (g.insurance || 0.012))
    * (1 + (g.tax || 0.07));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIGenerator({ project, user, onSave, onSkip, onSignOut }) {
  const [step, setStep] = useState('describe');
  const [tab, setTab] = useState('describe');
  const [description, setDescription] = useState(() => buildStarterText(project));
  const [phIdx, setPhIdx] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [generatedData, setGeneratedData] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    if (step !== 'describe') return;
    const t = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== 'generating') return;
    const t = setInterval(() => setStatusIdx(i => (i + 1) % STATUS_MSGS.length), 2800);
    return () => clearInterval(t);
  }, [step]);

  const generate = async () => {
    const desc = description.trim();
    if (!desc) return;
    console.log('[AIGenerator] Starting generation...');
    setStep('generating');
    setStatusIdx(0);
    setGenError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    const requestBody = { description: desc, project };
    console.log('[AIGenerator] Calling /api/generate with:', requestBody);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      console.log('[AIGenerator] API response status:', res.status);
      const data = await res.json();
      console.log('[AIGenerator] API response body:', data);
      if (!res.ok) throw new Error(data.error || `API returned ${res.status}`);
      const lineItems = data.lineItems;
      console.log('[AIGenerator] Line items found:', lineItems);
      if (!Array.isArray(lineItems) || !lineItems.length) throw new Error('No line items returned from AI');
      setGeneratedData(data);
      setEditedItems(lineItems.map((item, i) => ({ ...item, _key: i })));
      const allCats = [...new Set(lineItems.map(i => i.category))];
      setCollapsed(Object.fromEntries(allCats.map(c => [c, false])));
      setStep('review');
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        setGenError('Generation is taking longer than expected. Try again with a simpler description.');
      } else {
        setGenError(err.message);
      }
      setStep('error');
    }
  };

  const updateItem = (_key, field, value) => {
    setEditedItems(prev => prev.map(item => item._key === _key ? { ...item, [field]: value } : item));
  };

  const deleteItem = (_key) => {
    setEditedItems(prev => prev.filter(item => item._key !== _key));
  };

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Save timed out after 30s — check your connection and try again')), 30_000)
    );

    try {
      console.log('[AIGenerator] saveAll: starting, user:', user?.id, 'project:', project.id);

      if (!user?.id) throw new Error('Not logged in — please refresh and try again');

      console.log('[AIGenerator] saveAll: fetching scenarios...');
      const { data: scenarios, error: scErr } = await Promise.race([getScenarios(project.id), timeout]);
      if (scErr) { console.error('[AIGenerator] saveAll: getScenarios error:', scErr); throw new Error(scErr.message); }
      if (!scenarios?.length) throw new Error('Could not find project scenario');
      console.log('[AIGenerator] saveAll: got', scenarios.length, 'scenarios');

      const baseline = scenarios.find(s => s.is_baseline) ?? scenarios[0];
      console.log('[AIGenerator] saveAll: baseline scenario:', baseline.id);

      const rows = editedItems.map((item, idx) => ({
        category: item.category || 'General Conditions',
        subcategory: item.subcategory || '',
        description: item.description || '',
        qty_min: Number(item.qty_min) || 0,
        qty_max: Number(item.qty_max) || 0,
        unit: item.unit || 'LS',
        unit_cost_low: Number(item.unit_cost_low) || 0,
        unit_cost_mid: Number(item.unit_cost_mid) || 0,
        unit_cost_high: Number(item.unit_cost_high) || 0,
        basis: item.basis || null,
        sensitivity: item.sensitivity || 'Medium',
        notes: item.notes || null,
        in_summary: true,
        is_archived: false,
        sort_order: idx,
      }));

      console.log('[AIGenerator] saveAll: inserting', rows.length, 'line items...');
      const { error: liErr } = await Promise.race([createLineItems(baseline.id, rows), timeout]);
      if (liErr) { console.error('[AIGenerator] saveAll: createLineItems error:', liErr); throw new Error(liErr.message); }
      console.log('[AIGenerator] saveAll: line items saved');

      console.log('[AIGenerator] saveAll: saving globals...');
      const { error: glErr } = await Promise.race([saveGlobals(baseline.id, generatedData.globals), timeout]);
      if (glErr) { console.error('[AIGenerator] saveAll: saveGlobals error:', glErr); throw new Error(glErr.message); }
      console.log('[AIGenerator] saveAll: done, calling onSave');

      onSave();
    } catch (err) {
      console.error('[AIGenerator] saveAll: caught error:', err);
      setSaveError(err.message || 'Unknown error — check the browser console');
    } finally {
      setSaving(false);
    }
  };

  const statusMsg = STATUS_MSGS[statusIdx].replace('{city}', project.city || 'local');

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: HEADER, height: 56, padding: '0 28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>
          COSTDECK
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#666', fontFamily: "'Figtree', sans-serif", fontSize: 13 }}>
            {project.name}
          </span>
          <button
            onClick={onSignOut}
            style={{
              background: 'none', border: '1px solid #444', borderRadius: 6,
              color: '#bbb', fontFamily: "'Figtree', sans-serif", fontSize: 12,
              padding: '5px 13px', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {step === 'describe' && (
        <DescribeStep
          tab={tab} setTab={setTab}
          description={description} setDescription={setDescription}
          phIdx={phIdx} project={project}
          templates={buildTemplates(project)}
          chips={buildChips(project)}
          onGenerate={generate} onSkip={onSkip}
        />
      )}

      {step === 'generating' && <GeneratingStep statusMsg={statusMsg} />}

      {step === 'review' && (
        <ReviewStep
          project={project}
          items={editedItems}
          globals={generatedData?.globals}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          updateItem={updateItem}
          deleteItem={deleteItem}
          saving={saving}
          saveError={saveError}
          onSave={saveAll}
          onRegenerate={() => { setStep('describe'); setGenError(null); }}
          onSkip={onSkip}
        />
      )}

      {step === 'error' && (
        <ErrorStep error={genError} onRetry={() => { setStep('describe'); setGenError(null); }} />
      )}
    </div>
  );
}

// ── DescribeStep ──────────────────────────────────────────────────────────────

function DescribeStep({ tab, setTab, description, setDescription, phIdx, project, templates, chips, onGenerate, onSkip }) {
  return (
    <main style={{ flex: 1, maxWidth: 860, width: '100%', margin: '0 auto', padding: '44px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Archivo', sans-serif", fontWeight: 800,
          fontSize: 26, color: '#111', marginBottom: 8,
        }}>
          Generate Your Estimate
        </h1>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14 }}>
          Describe your project and Claude will generate
          {project.gross_sf ? ` a calibrated ${Number(project.gross_sf).toLocaleString()} SF estimate` : ' a detailed estimate'} for {project.city || 'your location'}.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0dc', marginBottom: 28 }}>
        {[['describe', 'Describe Your Project'], ['template', 'Start from Template']].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: tab === t ? `2.5px solid ${ACCENT}` : '2.5px solid transparent',
              fontFamily: "'Archivo', sans-serif", fontWeight: 600,
              fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase',
              color: tab === t ? '#111' : '#aaa', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'describe' ? (
        <>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={PLACEHOLDERS[phIdx]}
            rows={6}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '14px 16px',
              fontSize: 14, fontFamily: "'Figtree', sans-serif", lineHeight: 1.6,
              border: '1.5px solid #e0e0dc', borderRadius: 10,
              resize: 'vertical', outline: 'none', color: '#111',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = ACCENT; }}
            onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa', alignSelf: 'center' }}>
              Add:
            </span>
            {chips.map(chip => (
              <ChipButton
                key={chip}
                label={chip}
                onClick={() => setDescription(d => d.trim() ? `${d.trim()} ${chip.toLowerCase()}.` : chip)}
              />
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {templates.map(tpl => (
            <TemplateCard
              key={tpl.label}
              tpl={tpl}
              active={description === tpl.text}
              onClick={() => { setDescription(tpl.text); setTab('describe'); }}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: 'none', padding: 0,
            fontFamily: "'Figtree', sans-serif", fontSize: 13,
            color: '#aaa', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Skip — use default line items
        </button>
        <button
          onClick={onGenerate}
          disabled={!description.trim()}
          style={{
            background: description.trim() ? ACCENT : '#e0e0dc',
            color: description.trim() ? '#fff' : '#aaa',
            border: 'none', borderRadius: 8, padding: '12px 28px',
            fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14,
            cursor: description.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          Generate Estimate →
        </button>
      </div>
    </main>
  );
}

function ChipButton({ label, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#fdf6e3' : '#f5f5f2',
        border: `1px solid ${hov ? ACCENT : '#e0e0dc'}`,
        borderRadius: 20, padding: '5px 12px',
        fontFamily: "'Figtree', sans-serif", fontSize: 12,
        color: '#555', cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      + {label}
    </button>
  );
}

function TemplateCard({ tpl, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active ? '#fdf6e3' : tpl.recommended ? '#fffdf5' : '#fff',
        border: `1.5px solid ${active ? ACCENT : tpl.recommended ? ACCENT : hov ? ACCENT : '#e6e6e2'}`,
        borderRadius: 10, padding: '16px 14px', textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 0.12s, box-shadow 0.12s', position: 'relative',
        boxShadow: hov || tpl.recommended ? '0 2px 10px rgba(184,144,48,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {tpl.recommended && (
        <div style={{
          position: 'absolute', top: -1, right: -1,
          background: ACCENT, color: '#fff', fontSize: 9,
          fontFamily: "'Archivo', sans-serif", fontWeight: 700,
          letterSpacing: 0.5, padding: '3px 8px',
          borderRadius: '0 9px 0 6px', textTransform: 'uppercase',
        }}>
          Recommended
        </div>
      )}
      <div style={{ fontSize: 22, marginBottom: 8 }}>{tpl.icon}</div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 4 }}>
        {tpl.label}
      </div>
      <div style={{
        fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#999', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {tpl.text}
      </div>
    </button>
  );
}

// ── GeneratingStep ────────────────────────────────────────────────────────────

function GeneratingStep({ statusMsg }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes barSlide {
          0%   { width: 20%; margin-left: 0; }
          50%  { width: 45%; margin-left: 25%; }
          100% { width: 20%; margin-left: 80%; }
        }
      `}</style>
      <div style={{
        background: '#fff', border: '1px solid #e6e6e2', borderRadius: 16,
        padding: '48px 48px', textAlign: 'center', maxWidth: 440,
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #f0f0ee', borderTopColor: ACCENT,
          margin: '0 auto 24px',
          animation: 'spin 0.9s linear infinite',
        }} />
        <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color: '#111', marginBottom: 10 }}>
          Generating Estimate
        </h2>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 14, marginBottom: 28, lineHeight: 1.5, minHeight: 40 }}>
          {statusMsg}
        </p>
        <div style={{ width: '100%', height: 4, background: '#f0f0ee', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: ACCENT, borderRadius: 2, animation: 'barSlide 2s ease-in-out infinite' }} />
        </div>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#bbb', fontSize: 12, marginTop: 20 }}>
          This typically takes 20–40 seconds
        </p>
      </div>
    </div>
  );
}

// ── ReviewStep ────────────────────────────────────────────────────────────────

function ReviewStep({ project, items, globals, collapsed, setCollapsed, updateItem, deleteItem, saving, saveError, onSave, onRegenerate, onSkip }) {
  const uniqueCats = [...new Set(items.map(i => i.category))];
  const orderedCats = [
    ...CSI_ORDER.filter(c => uniqueCats.includes(c)),
    ...uniqueCats.filter(c => !CSI_ORDER.includes(c)),
  ];
  const categoryGroups = orderedCats
    .map(cat => ({ cat, items: items.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  const rawByCategory = {};
  let totalRaw = 0;
  items.forEach(item => {
    const sub = itemMidCost(item);
    rawByCategory[item.category] = (rawByCategory[item.category] || 0) + sub;
    totalRaw += sub;
  });
  const totalFull = applyGlobals(totalRaw, globals);
  const psf = globals?.buildingSF > 0 ? totalFull / globals.buildingSF : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e6e6e2',
        padding: '12px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#111' }}>
            AI-Generated Estimate
          </span>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#999', marginLeft: 14 }}>
            {items.length} items · {project.city}, {project.state}
            {project.gross_sf ? ` · ${Number(project.gross_sf).toLocaleString()} SF` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onRegenerate}
            style={{
              background: 'none', border: '1px solid #ddd', borderRadius: 7,
              padding: '8px 16px', fontFamily: "'Figtree', sans-serif",
              fontSize: 12, color: '#555', cursor: 'pointer',
            }}
          >
            ↺ Regenerate
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              background: saving ? '#d4b86a' : ACCENT, color: '#fff',
              border: 'none', borderRadius: 7, padding: '8px 20px',
              fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save & Open Project →'}
          </button>
        </div>
      </div>

      {saveError && (
        <div style={{
          background: '#fef2f2', borderBottom: '1px solid #fca5a5',
          padding: '8px 24px', flexShrink: 0,
          fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#991b1b',
        }}>
          ⚠ {saveError}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Items column */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {categoryGroups.map(({ cat, items: catItems }) => (
            <CategorySection
              key={cat}
              cat={cat}
              catItems={catItems}
              subtotal={rawByCategory[cat] || 0}
              collapsed={collapsed[cat] ?? false}
              onToggle={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
              updateItem={updateItem}
              deleteItem={deleteItem}
            />
          ))}
        </div>

        {/* Summary sidebar */}
        <div style={{
          width: 288, flexShrink: 0, borderLeft: '1px solid #e6e6e2',
          overflowY: 'auto', padding: '20px', background: '#fff',
        }}>
          <SummarySidebar
            project={project}
            globals={globals}
            totalRaw={totalRaw}
            totalFull={totalFull}
            psf={psf}
            itemCount={items.length}
            saving={saving}
            onSave={onSave}
            onSkip={onSkip}
          />
        </div>
      </div>
    </div>
  );
}

function CategorySection({ cat, catItems, subtotal, collapsed, onToggle, updateItem, deleteItem }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', background: '#f5f5f2',
          border: '1px solid #e6e6e2',
          borderRadius: collapsed ? 8 : '8px 8px 0 0',
          padding: '9px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, color: '#111' }}>
            {cat}
          </span>
          <span style={{
            fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#888',
            background: '#e8e8e4', borderRadius: 10, padding: '1px 7px',
          }}>
            {catItems.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: ACCENT, fontWeight: 600 }}>
            {fmtM(subtotal)}
          </span>
          <span style={{ color: '#aaa', fontSize: 13 }}>{collapsed ? '›' : '⌄'}</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ border: '1px solid #e6e6e2', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ background: '#fafaf8', borderBottom: '1px solid #ebebea' }}>
                  {['Description', 'Qty Min', 'Qty Max', 'Unit', 'Low $/U', 'Mid $/U', 'High $/U', 'Subtotal', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '6px 8px', fontFamily: "'Figtree', sans-serif",
                      fontSize: 10, fontWeight: 600, color: '#888',
                      textAlign: i === 0 ? 'left' : 'right',
                      whiteSpace: 'nowrap', letterSpacing: 0.3,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catItems.map((item, rowIdx) => (
                  <ItemRow
                    key={item._key}
                    item={item}
                    striped={rowIdx % 2 === 1}
                    updateItem={updateItem}
                    deleteItem={deleteItem}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, striped, updateItem, deleteItem }) {
  const sub = itemMidCost(item);

  const numInput = (field, val) => (
    <input
      type="number"
      value={val ?? ''}
      onChange={e => updateItem(item._key, field, e.target.value === '' ? 0 : Number(e.target.value))}
      style={{
        width: '100%', padding: '3px 4px', border: '1px solid transparent',
        borderRadius: 3, fontFamily: "'Figtree', sans-serif", fontSize: 12,
        textAlign: 'right', background: 'transparent', outline: 'none',
      }}
      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }}
    />
  );

  const txtInput = (field, val, align = 'left') => (
    <input
      type="text"
      value={val ?? ''}
      onChange={e => updateItem(item._key, field, e.target.value)}
      style={{
        width: '100%', padding: '3px 4px', border: '1px solid transparent',
        borderRadius: 3, fontFamily: "'Figtree', sans-serif", fontSize: 12,
        textAlign: align, color: '#222', background: 'transparent', outline: 'none',
      }}
      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }}
    />
  );

  return (
    <tr style={{ background: striped ? '#fcfcfb' : '#fff', borderBottom: '1px solid #f0f0ee' }}>
      <td style={{ padding: '4px 8px', minWidth: 200 }}>{txtInput('description', item.description)}</td>
      <td style={{ padding: '4px 8px', width: 72 }}>{numInput('qty_min', item.qty_min)}</td>
      <td style={{ padding: '4px 8px', width: 72 }}>{numInput('qty_max', item.qty_max)}</td>
      <td style={{ padding: '4px 8px', width: 50 }}>{txtInput('unit', item.unit, 'center')}</td>
      <td style={{ padding: '4px 8px', width: 70 }}>{numInput('unit_cost_low', item.unit_cost_low)}</td>
      <td style={{ padding: '4px 8px', width: 70 }}>{numInput('unit_cost_mid', item.unit_cost_mid)}</td>
      <td style={{ padding: '4px 8px', width: 70 }}>{numInput('unit_cost_high', item.unit_cost_high)}</td>
      <td style={{
        padding: '4px 8px', width: 82, textAlign: 'right',
        fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#444', whiteSpace: 'nowrap',
      }}>
        {fmtM(sub)}
      </td>
      <td style={{ padding: '4px 4px', width: 28, textAlign: 'center' }}>
        <button
          onClick={() => deleteItem(item._key)}
          title="Remove item"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#ccc', fontSize: 15, padding: '2px', lineHeight: 1, borderRadius: 3,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#c0392b'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#ccc'; }}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function SummarySidebar({ project, globals, totalRaw, totalFull, psf, itemCount, saving, onSave, onSkip }) {
  if (!globals) return null;
  const g = globals;

  const afterGC   = totalRaw   * (1 + (g.generalConditions || 0));
  const afterCont = afterGC    * (1 + (g.contingency || 0));
  const afterFee  = afterCont  * (1 + (g.fee || 0));
  const afterEsc  = afterFee   * (1 + (g.escalation || 0));
  const afterBI   = afterEsc   * (1 + (g.bond || 0) + (g.insurance || 0));
  const afterTax  = afterBI    * (1 + (g.tax || 0));

  const rows = [
    { label: 'Raw Installed Cost', value: totalRaw },
    { label: `Gen. Conditions (${pct(g.generalConditions)})`, value: afterGC - totalRaw, indent: true },
    { label: `Contingency (${pct(g.contingency)})`, value: afterCont - afterGC, indent: true },
    { label: `Fee (${pct(g.fee)})`, value: afterFee - afterCont, indent: true },
    { label: `Escalation (${pct(g.escalation)})`, value: afterEsc - afterFee, indent: true },
    { label: `Bond & Ins. (${pct((g.bond || 0) + (g.insurance || 0))})`, value: afterBI - afterEsc, indent: true },
    { label: `Tax (${pct(g.tax)})`, value: afterTax - afterBI, indent: true },
    { label: 'Total Project Cost', value: afterTax, bold: true },
  ];

  return (
    <div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>
        Summary
      </div>

      <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #efefec' }}>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#666', lineHeight: 1.9 }}>
          <div>{project.city}, {project.state}</div>
          {project.gross_sf && <div>{Number(project.gross_sf).toLocaleString()} SF</div>}
          {project.building_type && <div>{project.building_type}</div>}
          {project.labor_type && <div>{project.labor_type}</div>}
          <div style={{ color: '#aaa' }}>{itemCount} line items</div>
        </div>
      </div>

      <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #efefec' }}>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 10, color: '#aaa', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Applied Factors
        </div>
        {[
          ['Region Factor', `${(g.regionFactor || 1).toFixed(2)}×`],
          ['Labor Burden', pct(g.laborBurden)],
          ['Contingency', pct(g.contingency)],
          ['Tax Rate', pct(g.tax)],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#555', marginBottom: 4 }}>
            <span>{k}</span>
            <span style={{ color: '#333', fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        {rows.map(({ label, value, bold, indent }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: bold ? 0 : 5,
            paddingTop: bold ? 9 : 0,
            borderTop: bold ? '1.5px solid #e6e6e2' : 'none',
          }}>
            <span style={{
              fontFamily: "'Figtree', sans-serif",
              fontSize: bold ? 13 : 11,
              fontWeight: bold ? 700 : 400,
              color: indent ? '#888' : (bold ? '#111' : '#555'),
              paddingLeft: indent ? 6 : 0,
            }}>
              {indent ? '+ ' : ''}{label}
            </span>
            <span style={{
              fontFamily: "'Figtree', sans-serif",
              fontSize: bold ? 14 : 11,
              fontWeight: bold ? 700 : 400,
              color: bold ? ACCENT : '#666',
            }}>
              {fmtM(value)}
            </span>
          </div>
        ))}
        {psf > 0 && (
          <div style={{ marginTop: 6, fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#aaa', textAlign: 'right' }}>
            ${Math.round(psf).toLocaleString()} / SF
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            background: saving ? '#d4b86a' : ACCENT, color: '#fff',
            border: 'none', borderRadius: 8, padding: '11px 0', width: '100%',
            fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save & Open Project →'}
        </button>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 8,
            padding: '9px 0', width: '100%',
            fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#888', cursor: 'pointer',
          }}
        >
          Discard &amp; use defaults
        </button>
      </div>
    </div>
  );
}

// ── ErrorStep ─────────────────────────────────────────────────────────────────

function ErrorStep({ error, onRetry }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        background: '#fff', border: '1px solid #fdd', borderRadius: 16,
        padding: '40px 48px', textAlign: 'center', maxWidth: 440,
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
        <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 18, color: '#333', marginBottom: 10 }}>
          Generation Failed
        </h2>
        <p style={{ fontFamily: "'Figtree', sans-serif", color: '#888', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          {error || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={onRetry}
          style={{
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
            padding: '11px 28px', fontFamily: "'Archivo', sans-serif",
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
