/**
 * Burbank Library & Civic Center — Full Program Cost Model
 * 180 line items, 28 categories
 *
 * Format: [category, subcategory, description, qtyMin, qtyMax, unit,
 *          unitCostLow, unitCostMid, unitCostHigh, basis, sensitivity, notes]
 *
 * Pricing basis: Burbank CA, prevailing wage, 2026-2028 market
 */

let _id = 0;
const mkId = () => `li_${++_id}`;

const RAW = [
  // ═══ SUBSTRUCTURE & FOUNDATIONS ═══
  ["Substructure","Foundations","Spread footings & grade beams",97500,97500,"SF",18,24,30,"Seismic Cat D","High","Geotech"],
  ["Substructure","Foundations","Mat slab / foundation system",97500,97500,"SF",8,14,22,"If poor soils","High","Pending"],
  ["Substructure","Foundations","Slab on grade",24000,24000,"SF",12,16,20,"Ground floor","Medium","6\" reinf"],
  ["Substructure","Foundations","Shoring & excavation",800,800,"LF",150,275,400,"Adjacent structures","High","Site specific"],
  ["Substructure","Foundations","Dewatering allowance",1,1,"LS",75000,200000,350000,"If high water table","High","Geotech"],
  ["Substructure","Foundations","Seismic base isolation",1,1,"LS",0,1200000,2800000,"Performance-based","Very High","Optional"],
  // ═══ SUPERSTRUCTURE ═══
  ["Superstructure","Concrete","CIP concrete frame",97500,97500,"SF",38,52,68,"4-story moment frame","High","Seismic"],
  ["Superstructure","Concrete","Elevated slabs",73500,73500,"SF",22,30,38,"Levels 2-4","Medium","Post-tension"],
  ["Superstructure","Steel","Structural steel",120,180,"TON",6500,8200,10000,"Long-span library","Medium","Prevailing"],
  ["Superstructure","Steel","Metal decking",73500,73500,"SF",6,8,11,"Composite deck","Low","Standard"],
  ["Superstructure","Concrete","Stairs & landings",8,8,"flight",25000,38000,52000,"Exit + feature","Medium","Code"],
  ["Superstructure","Steel","Misc metals",97500,97500,"SF",3,5,7,"Lintels, embeds","Low","Standard"],
  // ═══ ENVELOPE ═══
  ["Envelope","Glazing","Curtain wall",18000,24000,"SF",85,120,165,"High-performance","High","Low-E"],
  ["Envelope","Glazing","Storefront / entries",3000,4500,"SF",65,90,125,"Ground level","Medium","ADA"],
  ["Envelope","Glazing","Skylights / clerestory",2000,4000,"SF",120,175,240,"Library daylight","High","Design"],
  ["Envelope","Cladding","Metal panel / rain screen",8000,12000,"SF",55,80,110,"Upper floors","Medium","ACM"],
  ["Envelope","Cladding","Stone / masonry accent",2000,5000,"SF",65,95,135,"Civic entry","Medium","Design"],
  ["Envelope","Roofing","Single-ply roofing",24500,24500,"SF",18,26,35,"TPO/PVC","Medium","20-yr"],
  ["Envelope","Roofing","Green roof / planters",3000,6000,"SF",45,75,110,"Roof deck","High","Level 4"],
  ["Envelope","Roofing","Roof pavers / deck",4000,8000,"SF",28,42,58,"Rooftop terrace","Medium","Pedestal"],
  ["Envelope","Waterproofing","Below-grade WP",24000,24000,"SF",8,14,20,"Foundation walls","Medium","Membrane"],
  ["Envelope","Insulation","Thermal insulation",97500,97500,"SF",4,6,9,"Title 24","Low","Walls/roof"],
  // ═══ INTERIOR CONSTRUCTION ═══
  ["Interior Construction","Partitions","Metal stud / gypboard",85000,110000,"SF",12,17,23,"All partitions","Medium","STC varies"],
  ["Interior Construction","Partitions","Glazed partitions",6000,10000,"SF",55,80,115,"Conference, offices","Medium","Demountable"],
  ["Interior Construction","Partitions","Acoustic walls",4000,8000,"SF",35,55,80,"Quiet zones, auditorium","High","STC 55+"],
  ["Interior Construction","Doors","Interior doors",200,280,"each",1800,2800,4000,"All types","Medium","HW incl"],
  ["Interior Construction","Doors","Specialty doors",15,25,"each",5000,8500,12000,"Secure, server","Medium","Card access"],
  ["Interior Construction","Specialties","Signage / wayfinding",1,1,"LS",150000,300000,500000,"Civic, bilingual","Medium","Graphics"],
  ["Interior Construction","Specialties","Toilet partitions",30,45,"each",2500,4000,5500,"All cores","Low","ADA"],
  ["Interior Construction","Specialties","Window treatments",15000,20000,"SF",8,14,22,"Motorized shades","Medium","Solar"],
  // ═══ INTERIOR FINISHES ═══
  ["Interior Finishes","Flooring","Polished concrete",15000,25000,"SF",8,14,20,"Lobby, circulation","Medium","Dye/seal"],
  ["Interior Finishes","Flooring","Carpet tile",35000,50000,"SF",6,10,15,"Office, reading","Low","Modular"],
  ["Interior Finishes","Flooring","LVT / resilient",15000,25000,"SF",8,13,18,"High traffic","Low","Commercial"],
  ["Interior Finishes","Flooring","Porcelain tile",8000,12000,"SF",16,24,35,"Restrooms, café","Medium","Large format"],
  ["Interior Finishes","Flooring","Terrazzo / wood specialty",3000,6000,"SF",30,55,85,"Feature areas","High","Statement"],
  ["Interior Finishes","Ceilings","ACT ceilings",50000,65000,"SF",8,12,17,"Office, BOH","Low","Grid"],
  ["Interior Finishes","Ceilings","Specialty ceilings",10000,20000,"SF",25,45,70,"Library, lobby","High","Feature"],
  ["Interior Finishes","Ceilings","Gypboard soffits",8000,15000,"SF",14,22,32,"Transitions","Medium","Painted"],
  ["Interior Finishes","Walls","Paint & prep",180000,220000,"SF",2,4,6,"All surfaces","Low","Low-VOC"],
  ["Interior Finishes","Walls","Feature walls",3000,6000,"SF",25,50,80,"Lobby, gallery","High","Wood/stone"],
  ["Interior Finishes","Walls","FRP / impact panels",4000,8000,"SF",12,18,26,"BOH, children's","Low","Durability"],
  // ═══ HVAC ═══
  ["HVAC","Plant","Chiller plant",300,350,"ton",2800,3800,5000,"Central plant","High","Title 24"],
  ["HVAC","Plant","Boiler plant",97500,97500,"SF",4,7,10,"Condensing","Medium","High-eff"],
  ["HVAC","Distribution","Air handling units",97500,97500,"SF",12,18,25,"Humidity control","High","DOAS+VRF"],
  ["HVAC","Distribution","Ductwork",97500,97500,"SF",10,15,21,"Supply/return/exhaust","Medium","Prevailing"],
  ["HVAC","Distribution","VAV / terminals",97500,97500,"SF",6,9,13,"Zone control","Medium","DDC"],
  ["HVAC","Controls","BAS",97500,97500,"SF",5,8,12,"Full DDC","Medium","Integration"],
  ["HVAC","Controls","TAB",97500,97500,"SF",1,2,3,"Testing & balancing","Low","Required"],
  ["HVAC","Specialty","Café exhaust",1,1,"LS",80000,175000,300000,"If hot food","Very High","Menu dep"],
  ["HVAC","Specialty","Auditorium HVAC",1,1,"LS",150000,325000,550000,"High occupancy","High","Separate"],
  // ═══ PLUMBING ═══
  ["Plumbing","Water","Domestic water",97500,97500,"SF",5,8,11,"Hot/cold, recirc","Medium","Low-flow"],
  ["Plumbing","Sanitary","Waste & vent",97500,97500,"SF",5,8,11,"Gravity system","Medium","CI/PVC"],
  ["Plumbing","Storm","Storm drainage",97500,97500,"SF",3,5,8,"Roof drains","Medium","CA compliance"],
  ["Plumbing","Fixtures","Plumbing fixtures",65,90,"each",2500,4200,6000,"WC, lavs","Medium","ADA"],
  ["Plumbing","Fixtures","Specialty fixtures",15,25,"each",3000,5500,8000,"Café, grease","Medium","Health dept"],
  ["Plumbing","Equipment","Water heaters",3,5,"each",8000,15000,25000,"High-eff","Medium","Title 24"],
  ["Plumbing","Equipment","Rainwater harvesting",1,1,"LS",50000,125000,225000,"Sustainability","High","Optional"],
  // ═══ ELECTRICAL ═══
  ["Electrical","Service","Main switchgear",1,1,"LS",350000,550000,800000,"4000A, 480/277V","Medium","SCE"],
  ["Electrical","Distribution","Power distribution",97500,97500,"SF",10,15,21,"Panels, feeders","Medium","Prevailing"],
  ["Electrical","Lighting","Interior lighting",97500,97500,"SF",12,18,25,"LED, controls","Medium","Title 24"],
  ["Electrical","Lighting","Exterior lighting",43000,43000,"SF",4,8,13,"Site lighting","Medium","Dark sky"],
  ["Electrical","Lighting","Specialty lighting",1,1,"LS",250000,600000,1000000,"Lobby, auditorium","High","Design"],
  ["Electrical","Power","Generator",1,1,"LS",200000,375000,600000,"Life safety, IT","Medium","Nat gas"],
  ["Electrical","Power","UPS",1,1,"LS",50000,125000,225000,"IT, security","Medium","Battery"],
  ["Electrical","Power","Solar PV",1,1,"LS",200000,500000,900000,"Roof-mounted","High","CA mandate"],
  ["Electrical","Low Voltage","Data / cabling",97500,97500,"SF",5,8,12,"Cat 6A, fiber","Medium","Future"],
  ["Electrical","Low Voltage","AV systems",1,1,"LS",300000,600000,1000000,"Meeting rooms","High","Technology"],
  // ═══ FIRE PROTECTION ═══
  ["Fire Protection","Suppression","Sprinklers",97500,97500,"SF",5,8,11,"NFPA 13","Medium","Full"],
  ["Fire Protection","Alarm","Fire alarm",97500,97500,"SF",3,5,7,"Addressable","Medium","ADA"],
  ["Fire Protection","Specialty","Clean agent",2,4,"room",25000,45000,70000,"Server rooms","Low","FM-200"],
  // ═══ VERTICAL TRANSPORT ═══
  ["Vertical Transport","Elevators","Passenger elevators",3,4,"each",180000,275000,400000,"MRL, 4 stops","Medium","ADA"],
  ["Vertical Transport","Elevators","Service elevator",1,1,"each",225000,350000,500000,"Freight","Medium","5000 lb"],
  // ═══ LIBRARY COLLECTIONS & FF&E ═══
  ["Library Collections","Shelving","Adult shelving",4500,6500,"LF",140,190,240,"Double-faced","Medium","FF&E"],
  ["Library Collections","Shelving","Children's shelving",1500,2500,"LF",160,218,275,"Lower, features","Medium","FF&E"],
  ["Library Collections","Shelving","Teen shelving",800,1400,"LF",150,200,250,"Age-appropriate","Medium","FF&E"],
  ["Library Collections","Shelving","Feature / display",300,600,"LF",175,238,300,"Higher finish","Medium","FF&E"],
  ["Library Collections","Shelving","Holds / BOH shelving",1400,2800,"LF",120,170,230,"Processing","Medium","FF&E"],
  ["Library Collections","Technology","Book return sorting",1,1,"LS",50000,150000,250000,"Automation","High","Tech"],
  ["Library Collections","Technology","Self-check stations",2,6,"each",8000,16500,25000,"HW/SW","High","Tech"],
  ["Library Collections","Technology","Security gates",1,1,"set",15000,37500,60000,"Entry/exit","Medium","Tech"],
  ["Library Collections","Misc","Book carts",10,25,"each",500,1000,1500,"Operational","Low","FF&E"],
  // ═══ LIBRARY SEATING ═══
  ["Library Seating","Reading","Reading seats",180,240,"each",1500,2250,3000,"Tables/soft","Medium","FF&E"],
  ["Library Seating","Reading","Lounge & study",40,110,"each",750,1750,2750,"Various","Low","FF&E"],
  ["Library Seating","Reading","Task chairs & bar",65,160,"each",350,750,1200,"Ergonomic","Low","FF&E"],
  ["Library Seating","Reading","Power tables & booths",12,35,"each",2500,5000,8000,"Built-in power","Medium","FF&E"],
  ["Library Seating","Outdoor","Outdoor furniture",30,75,"seat",1000,1750,2500,"Weather-resistant","Low","Site"],
  // ═══ CHILDREN'S AREA ═══
  ["Children's Area","Rooms","Storytime room",800,1200,"SF",225,300,375,"Higher finish","High","Size dep"],
  ["Children's Area","Rooms","Activity room",600,1000,"SF",225,300,375,"Sink, storage","High","Size dep"],
  ["Children's Area","FF&E","Family seating & learning",10,18,"each",4000,5750,7500,"Clusters","Medium","Tech"],
  ["Children's Area","FF&E","Play / discovery",1,1,"LS",15000,57500,100000,"Design swing","High","Specialty"],
  ["Children's Area","FF&E","Millwork nooks",3,10,"each",5000,12000,20000,"Reading nooks","High","Millwork"],
  ["Children's Area","Rooms","Family restroom",1,2,"each",25000,42500,60000,"Specialized","Medium","Restroom"],
  // ═══ TEEN AREA ═══
  ["Teen Area","FF&E","Teen lounge & booths",24,38,"each",2500,4500,6500,"Mix types","Medium","FF&E"],
  ["Teen Area","FF&E","Gaming / media",1,2,"each",20000,35000,50000,"AV + tech","High","Tech"],
  ["Teen Area","FF&E","Charging lockers",2,3,"each",4000,9500,15000,"Support","Low","FF&E"],
  // ═══ CREATIVE / WORKFORCE ═══
  ["Creative / Workforce","Rooms","Coworking + focus",26,44,"each",5000,10000,16000,"Seats + rooms","Low","FF&E"],
  ["Creative / Workforce","Rooms","Training classroom",800,1200,"SF",175,238,300,"Flexible, AV","Medium","Size dep"],
  ["Creative / Workforce","Specialty","Podcast booth",1,2,"each",30000,52500,75000,"Acoustic","High","Specialty"],
  ["Creative / Workforce","Specialty","Maker lab",800,1200,"SF",300,425,550,"Tools, vent","High","Size dep"],
  ["Creative / Workforce","Technology","Media stations",6,14,"each",3500,5750,8000,"Monitors","Medium","Tech"],
  ["Creative / Workforce","Technology","Acoustics + equip",1,1,"LS",25000,55000,95000,"Panels, 3D printer","High","Equip"],
  // ═══ MEETING / EVENT / AUDITORIUM ═══
  ["Meeting / Event","Rooms","Study / meeting rooms",4,6,"each",20000,30000,40000,"4-8 person","Low","Standard"],
  ["Meeting / Event","Rooms","Community rooms",2,2,"SF",250,338,425,"Per SF","Medium","Size dep"],
  ["Meeting / Event","Rooms","Room AV packages",6,9,"each",6000,12000,18000,"Displays, camera","Medium","Tech"],
  ["Meeting / Event","Auditorium","Auditorium fit-out",4000,5500,"SF",425,575,725,"Signature space","Very High","Acoustic/AV"],
  ["Meeting / Event","Auditorium","Seating package",150,250,"seats",1500,3250,5000,"Fixed/telescoping","High","FF&E"],
  ["Meeting / Event","Auditorium","Telescoping premium",1,1,"LS",200000,550000,900000,"Large swing","Very High","Optional"],
  ["Meeting / Event","Auditorium","Stage / platform",1,1,"LS",40000,120000,200000,"Modular","High","Specialty"],
  ["Meeting / Event","Auditorium","Lighting + sound",1,1,"LS",125000,337500,550000,"Combined AV","High","Specialty"],
  ["Meeting / Event","Auditorium","Control + acoustics",1,1,"LS",70000,212500,355000,"Support","High","Specialty"],
  // ═══ CITY OFFICE ═══
  ["City Office","Workstations","Workstations",120,150,"each",3000,4250,5500,"Desk, chair","Medium","FF&E"],
  ["City Office","Workstations","Private offices",12,18,"each",15000,22500,30000,"Partition, door","Medium","Fit-out"],
  ["City Office","Conference","Conference rooms",7,12,"each",30000,55000,85000,"All sizes","Medium","AV"],
  ["City Office","Conference","Board / training",1,1,"each",125000,212500,300000,"Strong AV","High","Specialty"],
  ["City Office","Support","Huddle + touchdown",14,28,"each",8000,13000,18000,"Small rooms","Low","Standard"],
  ["City Office","Support","Reception & wellness",3,5,"each",15000,40000,65000,"Public-facing","Medium","Millwork"],
  ["City Office","Support","Support equip",1,1,"LS",65000,170000,345000,"AV, printers","Medium","Various"],
  // ═══ PUBLIC CAFÉ ═══
  ["Public Café","Spaces","Front-of-house",800,1500,"SF",250,338,425,"Counter, finishes","High","Build-out"],
  ["Public Café","Spaces","Back-of-house",250,600,"SF",350,475,600,"Higher MEP","High","Build-out"],
  ["Public Café","FF&E","Seating + POS millwork",1,1,"LS",60000,140000,235000,"All café FF&E","High","FF&E"],
  ["Café Equipment","Equipment","Café equipment package",1,1,"LS",88000,196500,335000,"All equipment","High","Equipment"],
  ["Café Infrastructure","Utilities","Café MEP infrastructure",1,1,"LS",44000,117000,217000,"Grease, exhaust","High","MEP"],
  // ═══ STAFF FOOD SERVICE ═══
  ["Staff Food Service","Rooms","Break rooms + pantry",1,1,"LS",30000,75000,130000,"Combined","Medium","Multi-room"],
  ["Staff Food Service","Equipment","Kitchen equipment",1,1,"LS",15000,38000,68000,"Break room grade","Low","Equipment"],
  // ═══ BUILDING SUPPORT ═══
  ["Building Support","Infrastructure","IT / telecom rooms",5,12,"each",8000,15000,25000,"Per room","Medium","Size dep"],
  ["Building Support","Infrastructure","Loading / janitor",1,1,"LS",60000,130000,200000,"Dock, closets","Medium","Ops"],
  ["Building Support","Technology","Signage / wayfinding",1,1,"LS",150000,350000,600000,"Civic, bilingual","Medium","Graphics"],
  ["Building Support","Technology","Security / access",1,1,"LS",200000,450000,750000,"Public building","High","Low voltage"],
  ["Building Support","Technology","CCTV + PA",1,1,"LS",75000,200000,375000,"Campus","Medium","Low voltage"],
  ["Building Support","Technology","Public Wi-Fi",1,1,"LS",75000,175000,300000,"High-density","Medium","Low voltage"],
  ["Building Support","Technology","Public art",1,1,"LS",200000,500000,850000,"Civic req","High","% of constr"],
  // ═══ RESTROOMS ═══
  ["Restrooms","Public","Restroom groups",4,8,"each",75000,125000,175000,"Per floor","High","Fixture dep"],
  ["Restrooms","Public","Family / assisted",2,4,"each",25000,42500,60000,"ADA","Medium","Inclusive"],
  ["Restrooms","Accessories","Baby changing + lactation",3,8,"each",1000,3000,5500,"Code + amenity","Low","Accessories"],
  // ═══ PARKING STRUCTURE ═══
  ["Parking Structure","Structure","Garage structure",310,310,"stalls",42000,52000,65000,"Above-grade","High","Prevailing"],
  ["Parking Structure","MEP","Ventilation & FP",310,310,"stalls",2500,4000,6000,"Exhaust, sprinklers","Medium","Code"],
  ["Parking Structure","Electrical","Lighting & power",310,310,"stalls",1500,2500,3800,"LED, EV rough-in","Medium","EV-ready"],
  ["Parking Structure","Technology","Guidance / access",1,1,"LS",150000,325000,550000,"Wayfinding","Medium","Tech"],
  ["Parking Structure","Specialty","EV charging",30,60,"each",3500,6500,10000,"Level 2 + DCFC","Medium","CA mandate"],
  ["Parking Structure","Finishes","Arch screening",1,1,"LS",400000,800000,1400000,"Civic quality","High","Design"],
  // ═══ SITEWORK & CIVIL ═══
  ["Sitework & Civil","Demolition","Demolition",1,1,"LS",300000,600000,1000000,"Clear site","Medium","Abatement"],
  ["Sitework & Civil","Earthwork","Grading",43000,65000,"SF",3,6,10,"Cut/fill","Medium","Geotech"],
  ["Sitework & Civil","Utilities","Storm drainage",1,1,"LS",400000,750000,1200000,"LID, MS4","High","CA stormwater"],
  ["Sitework & Civil","Utilities","Sewer",1,1,"LS",100000,225000,400000,"Connections","Medium","Utility"],
  ["Sitework & Civil","Utilities","Water & fire",1,1,"LS",150000,300000,500000,"Service","Medium","Utility"],
  ["Sitework & Civil","Utilities","Electrical / telecom",1,1,"LS",200000,400000,650000,"Primary","Medium","SCE"],
  ["Sitework & Civil","Utilities","Gas",1,1,"LS",50000,100000,175000,"Kitchen/boiler","Low","SoCalGas"],
  ["Sitework & Civil","Paving","Vehicular paving",25000,35000,"SF",8,14,20,"Asphalt + curb","Medium","ADA"],
  ["Sitework & Civil","Paving","Pedestrian paseo",15000,22000,"SF",18,30,45,"Enhanced","Medium","Civic"],
  // ═══ OPEN SPACE ═══
  ["Open Space","Plaza","Civic plaza",8000,12000,"SF",35,55,80,"Large events","Medium","Gathering"],
  ["Open Space","Plaza","Farmer's market",6000,10000,"SF",25,42,60,"Infrastructure","Medium","Events"],
  ["Open Space","Lawn","Lawn / events area",8000,12000,"SF",12,22,35,"Irrigated, perf pad","Medium","Community"],
  ["Open Space","Landscape","Landscape & planting",10000,18000,"SF",15,28,45,"Shade, native plants","Medium","Drought tol"],
  ["Open Space","Landscape","Site furnishings",1,1,"LS",200000,450000,750000,"Benches, shade","Medium","FF&E"],
  ["Open Space","Deck","Library deck terrace",3000,5000,"SF",45,75,110,"Outdoor reading","Medium","Structural"],
  ["Open Space","Deck","Rooftop event terrace",4000,6000,"SF",55,90,130,"Level 4 amenity","High","Premium"],
  ["Open Space","Infrastructure","Site lighting",1,1,"LS",250000,500000,800000,"Pedestrian, feature","Medium","Dark sky"],
  ["Open Space","Infrastructure","Stormwater mgmt",1,1,"LS",200000,425000,700000,"Bioswales, LID","High","Environ"],
  ["Open Space","Infrastructure","Event power/data",1,1,"LS",75000,175000,300000,"Market, concerts","Medium","Infra"],
  ["Open Space","Specialty","Shade structures",4,12,"each",15000,40000,75000,"Performance area","High","Design"],
  ["Open Space","Specialty","Water feature",0,1,"LS",100000,300000,600000,"Optional amenity","High","Optional"],
  ["Open Space","Specialty","Exterior signage",1,1,"LS",75000,175000,300000,"Monument, donors","Medium","Graphics"],
  // ═══ GENERAL CONDITIONS ═══
  ["General Conditions","Management","PM staff",21,21,"mo",120000,175000,250000,"PM, super, PE","Medium","Duration"],
  ["General Conditions","Facilities","Temp facilities",21,21,"mo",15000,25000,40000,"Trailers, power","Low","Standard"],
  ["General Conditions","Equipment","Crane / hoisting",12,15,"mo",35000,55000,80000,"4-story + parking","Medium","Schedule"],
  ["General Conditions","Protection","Protection & cleanup",21,21,"mo",8000,15000,25000,"Fencing, SWPPP","Low","Standard"],
  // ═══ OWNER SOFT COSTS ═══
  ["Owner Soft Costs","Professional","A/E design",1,1,"LS",6000000,8000000,10500000,"Architect + consult","Medium","5-7%"],
  ["Owner Soft Costs","Professional","Preconstruction",1,1,"LS",800000,1200000,1800000,"DB precon","Medium","9-month"],
  ["Owner Soft Costs","Management","Owner's PM (MOCA)",1,1,"LS",2500000,3500000,5000000,"Full service","Medium","Completion"],
  ["Owner Soft Costs","Management","Testing & inspection",1,1,"LS",600000,1000000,1500000,"Materials, IOR","Medium","Code"],
  ["Owner Soft Costs","Regulatory","Permits & fees",1,1,"LS",800000,1500000,2200000,"City of Burbank","Medium","Regulatory"],
  ["Owner Soft Costs","Professional","Commissioning",1,1,"LS",300000,500000,750000,"Farnsworth Group","Medium","Required"],
  ["Owner Soft Costs","Professional","Cost estimating",1,1,"LS",200000,350000,500000,"Dharam Consulting","Low","Precon"],
  ["Owner Soft Costs","Other","FF&E procurement",1,1,"LS",150000,300000,500000,"Sourcing, install","Low","Separate"],
  ["Owner Soft Costs","Other","Relocation",1,1,"LS",200000,400000,650000,"Temp operations","Medium","Swing space"],
  ["Owner Soft Costs","Other","CEQA",1,1,"LS",200000,400000,650000,"Environmental","Medium","Entitlements"],
  ["Owner Soft Costs","Contingency","Owner contingency",1,1,"LS",3000000,5000000,7500000,"Program reserve","High","Risk"],
];

/** Create a fresh set of seed items (deep copy). Call for each new scenario. */
export function createSeedItems() {
  return RAW.map(r => ({
    id: mkId(),
    category: r[0],
    subcategory: r[1],
    description: r[2],
    qtyMin: r[3],
    qtyMax: r[4],
    unit: r[5],
    unitCostLow: r[6],
    unitCostMid: r[7],
    unitCostHigh: r[8],
    basis: r[9],
    sensitivity: r[10],
    notes: r[11],
    inSummary: true,
    isArchived: false,
  }));
}

/** Ordered list of categories (preserves spreadsheet order) */
export const CATEGORIES = [...new Set(RAW.map(r => r[0]))];
