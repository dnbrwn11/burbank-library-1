// Project starting-point templates for the Generate Estimate screen.
// Each template carries typical size/cost ranges, sensible defaults for the
// AIGenerator inputs, and a chunk of AI context that Claude uses as project
// briefing during line-item generation.

export const PROJECT_TEMPLATES = [
  {
    id: 'civic_library',
    name: 'Civic Library',
    building_type: 'Civic/Library',
    delivery_method: 'CM at Risk (GMP)',
    labor_type: 'Prevailing Wage',
    default_sf: 45000,
    default_stories: 2,
    typical_sf_range: '30K–60K SF',
    typical_psf_range: '$450–750/SF',
    psf_low: 450,
    psf_high: 750,
    scope: 'public civic library with reading rooms, meeting rooms, community space, staff offices, and stacks',
    ai_context:
      'Two-story civic library on a compact urban site. Steel frame with metal-deck floors, curtain-wall glazing at reading rooms, brick veneer on secondary elevations, TPO roof with a small green-roof section, VAV central HVAC, full wet-sprinkler, BAS controls, LEED Silver target. Expect generous millwork for service desks and stacks, acoustic treatments, assistive-listening AV in community room, and public-restroom count per occupancy.',
    ai_context_renovation:
      'Renovation of existing civic library. Selective demolition of interior partitions, ceilings, and finishes; MEP retrofit; new envelope upgrades at existing curtain wall; reuse foundations and superstructure. Include hazmat allowance, temporary protection of open collections, phased construction to keep portions of the facility operating.',
  },
  {
    id: 'k12_school',
    name: 'K-12 School',
    building_type: 'K-12 Education',
    delivery_method: 'Design-Bid-Build',
    labor_type: 'Prevailing Wage',
    default_sf: 85000,
    default_stories: 2,
    typical_sf_range: '60K–120K SF',
    typical_psf_range: '$350–600/SF',
    psf_low: 350,
    psf_high: 600,
    scope: 'K-12 public school with classrooms, admin, cafeteria, MPR, kitchen, and athletics',
    ai_context:
      'Two-story public K-12 campus, DSA-regulated construction in California. Steel/CMU structure, stucco and metal panel envelope, standing-seam metal roof, VRF HVAC with DOAS, full sprinklers, LED lighting, emergency generator for life-safety. Include MPR, kitchen, classrooms with tackable walls, science labs, library/media center, and admin suite. DSA inspection allowance and OPSC checklists expected.',
    ai_context_renovation:
      'Modernization of existing K-12 school. DSA re-approval for altered work, selective demolition, new HVAC/lighting/ceilings/finishes, ADA upgrades, roof replacement, window replacement. Phased over summer shutdowns. Hazmat and abatement allowance likely.',
  },
  {
    id: 'high_rise_residential',
    name: 'High-Rise Residential',
    building_type: 'High-Rise Residential',
    delivery_method: 'CM at Risk (GMP)',
    labor_type: 'Prevailing Wage',
    default_sf: 200000,
    default_stories: 20,
    typical_sf_range: '150K–350K SF',
    typical_psf_range: '$400–800/SF',
    psf_low: 400,
    psf_high: 800,
    scope: 'high-rise luxury residential tower with amenity deck and structured parking',
    ai_context:
      '20-story post-tensioned concrete residential tower over subterranean parking. Curtain-wall and metal-panel envelope, amenity deck at podium with pool/fitness/clubroom, four-pipe fan-coil HVAC, standpipe and wet sprinklers throughout, traction elevators, emergency generator, stormwater capture, and Title 24 photovoltaics. Expect high-end unit finishes, MEP risers, and corridor rated assemblies.',
    ai_context_renovation:
      'Interior renovation of existing high-rise residential tower. Unit turns at scale, corridor refresh, amenity upgrades, MEP riser repairs. Tenant-in-place phasing with noise and dust control. Envelope window replacement may be part of scope. Add capital reserves allowance and scaffolding.',
  },
  {
    id: 'office',
    name: 'Office',
    building_type: 'Office',
    delivery_method: 'CM at Risk (GMP)',
    labor_type: 'Open Shop',
    default_sf: 100000,
    default_stories: 6,
    typical_sf_range: '60K–150K SF',
    typical_psf_range: '$300–600/SF',
    psf_low: 300,
    psf_high: 600,
    scope: 'Class-A office building with open floors and structured parking',
    ai_context:
      'Six-story steel-frame office building over one level of subterranean parking. Curtain-wall and metal-panel envelope, TPO roof with PV, VAV with central plant HVAC, full sprinklers, MRL traction elevators, LEED Gold target. Core-and-shell pricing with generous TI allowance for tenant fit-out, lobby build-out at ground floor, and a bike room with showers.',
    ai_context_renovation:
      'Tenant improvement of existing office floor. Selective demolition, new partitions, open-office and private-office mix, conference rooms, small pantry, MEP modifications, new finishes, lighting, and branded reception. Assume minimal structural work.',
  },
  {
    id: 'hospital',
    name: 'Hospital',
    building_type: 'Healthcare/Hospital',
    delivery_method: 'CM at Risk (GMP)',
    labor_type: 'Prevailing Wage',
    default_sf: 150000,
    default_stories: 4,
    typical_sf_range: '100K–300K SF',
    typical_psf_range: '$600–1200/SF',
    psf_low: 600,
    psf_high: 1200,
    scope: 'acute-care hospital with surgical, imaging, and inpatient suites',
    ai_context:
      'Four-story acute-care hospital. OSHPD/HCAI-regulated construction in California. Steel braced-frame with base-isolation, metal-panel/brick envelope, standing-seam metal roof, 100% outside-air HVAC with high MERV filtration, medical gas distribution, redundant emergency generators, UPS, and pneumatic tube system. Include ORs, imaging (MRI/CT), clean rooms, negative-pressure isolation, and PACU recovery. Expect OSHPD submittals and special inspections.',
    ai_context_renovation:
      'Phased renovation in an operating hospital. OSHPD/HCAI re-approval, ICRA barriers, negative-air, extensive infection-control and life-safety measures. Night/weekend work, limited outages, extensive protection of adjacent care areas. High hazmat/abatement likelihood.',
  },
  {
    id: 'hotel',
    name: 'Hotel',
    building_type: 'Hotel/Hospitality',
    delivery_method: 'Design-Build',
    labor_type: 'Open Shop',
    default_sf: 120000,
    default_stories: 8,
    typical_sf_range: '80K–180K SF',
    typical_psf_range: '$350–700/SF',
    psf_low: 350,
    psf_high: 700,
    scope: 'select-service hotel with lobby bar, meeting rooms, and fitness',
    ai_context:
      'Eight-story post-tensioned concrete select-service hotel. Stucco/metal-panel envelope, TPO roof, PTAC/VRF guestroom HVAC with central DOAS at amenities, standpipes + wet sprinklers, two traction elevators. Guestroom finishes per brand standard, lobby bar, breakfast area, meeting rooms, fitness, and a small pool. Heavy MEP repetition across stacked guestroom floors.',
    ai_context_renovation:
      'Full-building hotel renovation — PIP (property improvement plan) per brand standard. Gut guestrooms, corridor, lobby and amenities. Phased by floor to keep hotel partially operating. Envelope repairs, new FF&E, MEP upgrades.',
  },
  {
    id: 'arena',
    name: 'Arena',
    building_type: 'Arena/Stadium',
    delivery_method: 'CM at Risk (GMP)',
    labor_type: 'Prevailing Wage',
    default_sf: 500000,
    default_stories: 4,
    typical_sf_range: '350K–800K SF',
    typical_psf_range: '$800–1500/SF',
    psf_low: 800,
    psf_high: 1500,
    scope: 'multi-purpose arena with bowl seating, concourses, suites, and BOH',
    ai_context:
      'Multi-purpose indoor arena, roughly 15,000 seats. Long-span steel trusses and moment frames, precast-concrete seating bowl, ETFE or standing-seam roof, custom cladding, massive electrical service, broadcast infrastructure, scoreboard, ribbon boards, ice plant, full-service kitchens, suites and clubs, BOH with loading docks. Expect significant temporary bracing, erection sequencing, and extensive audiovisual.',
    ai_context_renovation:
      'Major arena renovation — bowl refurbishment, suite rebuild, concourse finishes, new AV/scoreboard, MEP upgrades, envelope and roof repairs. Phased around event schedule; event-day coverage required. Significant temporary protection.',
  },
  {
    id: 'data_center',
    name: 'Data Center',
    building_type: 'Data Center',
    delivery_method: 'Design-Build',
    labor_type: 'Open Shop',
    default_sf: 50000,
    default_stories: 1,
    typical_sf_range: '30K–120K SF',
    typical_psf_range: '$800–1500/SF',
    psf_low: 800,
    psf_high: 1500,
    scope: 'Tier III colocation data center with N+1 redundancy',
    ai_context:
      'Single-story tilt-up concrete data center, Tier III target. Hot-aisle/cold-aisle white space with raised floor, N+1 CRAH/CRAC units, chilled-water plant with economizer, redundant utility feeds, generator plant, UPS rooms, fuel yard, VESDA, clean-agent fire suppression in IT rooms, pre-action sprinkler elsewhere, access-controlled mantraps, 24/7 security monitoring. Expect extensive MEP scope and minimal interior finishes.',
    ai_context_renovation:
      'Retrofit of existing building into data center. Structural strengthening, new MEP infrastructure (very heavy), new generator yard and utility service, raised floor, cooling plant, and security upgrades. Typically more complex than new construction for equivalent capacity.',
  },
  {
    id: 'mixed_use',
    name: 'Mixed-Use',
    building_type: 'Mixed-Use',
    delivery_method: 'CM at Risk (GMP)',
    labor_type: 'Prevailing Wage',
    default_sf: 180000,
    default_stories: 7,
    typical_sf_range: '120K–280K SF',
    typical_psf_range: '$350–650/SF',
    psf_low: 350,
    psf_high: 650,
    scope: 'mixed-use building with ground-floor retail and residential above',
    ai_context:
      'Seven-story mixed-use over podium parking. Type III-A wood framing over Type I-A concrete podium, stucco/metal-panel envelope, TPO roof, 4-pipe fan-coil HVAC in residential with DOAS at retail, standpipes + wet sprinklers, two traction elevators, amenity deck at podium level, ground-floor retail shell + TI allowance. Include bike room, package room, and leasing office.',
    ai_context_renovation:
      'Repositioning of existing mixed-use building. Residential unit renovation, retail shell refresh, amenity upgrades, lobby rebuild. Phased around tenant leases. Envelope repairs and MEP riser replacement likely.',
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    building_type: 'Industrial/Warehouse',
    delivery_method: 'Design-Build',
    labor_type: 'Open Shop',
    default_sf: 100000,
    default_stories: 1,
    typical_sf_range: '50K–300K SF',
    typical_psf_range: '$100–250/SF',
    psf_low: 100,
    psf_high: 250,
    scope: 'tilt-up distribution warehouse with dock doors and small office',
    ai_context:
      'Single-story tilt-up concrete distribution warehouse, 32–36 foot clear. Metal deck roof, TPO membrane, skylights, dock doors (dock-high and grade-level), dock levelers and seals, ESFR sprinklers, metal-halide/LED high-bay lighting, painted interior finishes, small office fit-out (5–10%), dedicated truck court with heavy-duty paving.',
    ai_context_renovation:
      'Warehouse conversion or expansion. New dock doors, sprinkler upgrade to ESFR, new LED lighting, skylight infill, floor repairs or new slab overlay, office fit-out expansion, truck-court repair.',
  },
];

export function findTemplateForBuildingType(buildingType) {
  if (!buildingType) return null;
  return PROJECT_TEMPLATES.find(t => t.building_type === buildingType) || null;
}

export function templateDescription(template, scopeType) {
  if (!template) return '';
  return scopeType === 'renovation' ? template.ai_context_renovation : template.ai_context;
}

export function templatePsfRange(template, scopeType) {
  if (!template) return null;
  if (scopeType === 'renovation') {
    // Renovation roughly 60–70% of new-construction ranges
    return {
      low:  Math.round(template.psf_low  * 0.65),
      high: Math.round(template.psf_high * 0.65),
      label: `$${Math.round(template.psf_low * 0.65)}–${Math.round(template.psf_high * 0.65)}/SF`,
    };
  }
  return { low: template.psf_low, high: template.psf_high, label: template.typical_psf_range };
}

export const CLIENT_TYPES = [
  'Public Municipality',
  'Private Developer',
  'Institutional/Non-Profit',
  'Healthcare System',
  'School District / Higher Ed',
  'Federal / State / County',
  'Corporate',
  'Other',
];
