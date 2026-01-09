/**
 * Default Category Images Configuration - KENYA CONSTRUCTION MATERIALS
 * 
 * This file contains images for Kenyan construction material categories.
 * Suppliers can choose to use these default images or upload their own custom images.
 * 
 * HOW TO ADD REAL KENYAN BRAND IMAGES:
 * 1. Take photos at local hardware stores OR
 * 2. Contact Kenyan suppliers (Bamburi, Mabati, Crown Paints) for permission OR
 * 3. Use free stock photos from:
 *    - Unsplash (unsplash.com) - Free for commercial use
 *    - Pexels (pexels.com) - Free for commercial use
 * 
 * 4. Upload YOUR images to Supabase Storage:
 *    - Bucket: 'default-category-images'
 *    - Recommended size: 800x800px
 *    - Format: JPG or PNG
 * 
 * 5. Replace the URLs below with your Supabase public URLs:
 *    Format: https://YOUR_PROJECT.supabase.co/storage/v1/object/public/default-category-images/cement.jpg
 * 
 * See: KENYA_SPECIFIC_IMAGES_GUIDE.md for detailed instructions
 */

export interface CategoryImage {
  category: string;
  imageUrl: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS - DEFAULT IMAGES
// Based on complete analysis of Kenya's construction industry
// ═══════════════════════════════════════════════════════════════════════════════
export const DEFAULT_CATEGORY_IMAGES: Record<string, CategoryImage> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // STRUCTURAL & FOUNDATION MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Cement': {
    category: 'Cement',
    imageUrl: '/cement.png',
    description: 'Cement - Bamburi, Savannah, Mombasa, Simba, Athi River (50kg bags)'
  },
  'Steel': {
    category: 'Steel',
    imageUrl: '/steel.png',
    description: 'Steel Bars - Y8, Y10, Y12, Y16, Y20, Y25, Y32 KEBS approved rebar'
  },
  'Aggregates': {
    category: 'Aggregates',
    imageUrl: '/aggregates.png',
    description: 'Ballast, gravel, crushed stone for construction'
  },
  'Sand': {
    category: 'Sand',
    imageUrl: '/sand.png',
    description: 'River sand, pit sand, plastering sand, building sand'
  },
  'Stone': {
    category: 'Stone',
    imageUrl: '/stone.png',
    description: 'Machine cut stones, natural stones, foundation stones'
  },
  'Blocks': {
    category: 'Blocks',
    imageUrl: '/blocks.png',
    description: 'Concrete blocks, hollow blocks, solid blocks, cabro pavers'
  },
  'Bricks': {
    category: 'Bricks',
    imageUrl: '/blocks.png',
    description: 'Clay bricks, fire bricks, decorative bricks'
  },
  'Ready Mix Concrete': {
    category: 'Ready Mix Concrete',
    imageUrl: '/cement.png',
    description: 'Pre-mixed concrete, screed, ready-to-pour concrete'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOFING MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Roofing': {
    category: 'Roofing',
    imageUrl: '/roofing.png',
    description: 'Roofing - Mabati, Safal, Corrugated Iron Sheets Kenya'
  },
  'Iron Sheets': {
    category: 'Iron Sheets',
    imageUrl: '/iron-sheets.png',
    description: 'Iron Sheets - Mabati Box Profile, Gauge 28-32'
  },
  'Roofing Tiles': {
    category: 'Roofing Tiles',
    imageUrl: '/roofing.png',
    description: 'Clay tiles, concrete tiles, slate tiles'
  },
  'Gutters & Downpipes': {
    category: 'Gutters & Downpipes',
    imageUrl: '/roofing.png',
    description: 'PVC gutters, metal gutters, downpipes, rainwater systems'
  },
  'Roofing Accessories': {
    category: 'Roofing Accessories',
    imageUrl: '/roofing.png',
    description: 'Ridge caps, flashing, roofing nails, screws, fasteners'
  },
  'Waterproofing': {
    category: 'Waterproofing',
    imageUrl: '/insulation.png',
    description: 'Damp proof membrane, bitumen, roof sealants, waterproof coatings'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TIMBER & WOOD PRODUCTS
  // ─────────────────────────────────────────────────────────────────────────────
  'Timber': {
    category: 'Timber',
    imageUrl: '/timber.png',
    description: 'Timber - Cypress, Pine, Hardwood, Mahogany, Mvule (treated & untreated)'
  },
  'Plywood': {
    category: 'Plywood',
    imageUrl: '/plywood.png',
    description: 'Marine plywood, shuttering plywood, MDF boards'
  },
  'Particle Board': {
    category: 'Particle Board',
    imageUrl: '/plywood.png',
    description: 'Chipboard, OSB, hardboard panels'
  },
  'Timber Trusses': {
    category: 'Timber Trusses',
    imageUrl: '/timber.png',
    description: 'Roof trusses, prefab trusses, engineered trusses'
  },
  'Formwork': {
    category: 'Formwork',
    imageUrl: '/plywood.png',
    description: 'Shuttering boards, formwork panels, concrete forms'
  },
  'Treated Poles': {
    category: 'Treated Poles',
    imageUrl: '/timber.png',
    description: 'Fence posts, power poles, building poles, treated timber'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DOORS, WINDOWS & OPENINGS
  // ─────────────────────────────────────────────────────────────────────────────
  'Doors': {
    category: 'Doors',
    imageUrl: '/doors.png',
    description: 'Wooden doors, flush doors, panel doors, security doors'
  },
  'Steel Doors': {
    category: 'Steel Doors',
    imageUrl: '/doors.png',
    description: 'Metal doors, security grills, roller shutters'
  },
  'Windows': {
    category: 'Windows',
    imageUrl: '/windows.png',
    description: 'Wooden windows, steel windows, casement windows'
  },
  'Aluminium Windows': {
    category: 'Aluminium Windows',
    imageUrl: '/windows.png',
    description: 'Sliding windows, casement windows, louvers, aluminium frames'
  },
  'Glass': {
    category: 'Glass',
    imageUrl: '/glass.png',
    description: 'Float glass, tinted glass, frosted glass, tempered glass'
  },
  'Door Frames': {
    category: 'Door Frames',
    imageUrl: '/doors.png',
    description: 'Wooden frames, metal frames, architraves'
  },
  'Door Hardware': {
    category: 'Door Hardware',
    imageUrl: '/hardware.png',
    description: 'Locks, handles, hinges, door closers, door stops'
  },
  'Window Hardware': {
    category: 'Window Hardware',
    imageUrl: '/hardware.png',
    description: 'Window stays, handles, locks, hinges, fasteners'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PLUMBING & WATER SYSTEMS
  // ─────────────────────────────────────────────────────────────────────────────
  'Plumbing': {
    category: 'Plumbing',
    imageUrl: '/plumbing.png',
    description: 'Plumbing - Kenpipe, PVC pipes & fittings KEBS approved'
  },
  'PVC Pipes': {
    category: 'PVC Pipes',
    imageUrl: '/plumbing.png',
    description: 'Pressure pipes, drainage pipes, conduits, PVC fittings'
  },
  'PPR Pipes': {
    category: 'PPR Pipes',
    imageUrl: '/plumbing.png',
    description: 'Hot water pipes, cold water pipes, PPR fittings'
  },
  'GI Pipes': {
    category: 'GI Pipes',
    imageUrl: '/plumbing.png',
    description: 'Galvanized iron pipes, GI fittings, threaded pipes'
  },
  'HDPE Pipes': {
    category: 'HDPE Pipes',
    imageUrl: '/plumbing.png',
    description: 'High density polyethylene pipes, HDPE fittings'
  },
  'Pipe Fittings': {
    category: 'Pipe Fittings',
    imageUrl: '/plumbing.png',
    description: 'Elbows, tees, reducers, couplings, unions, adapters'
  },
  'Valves': {
    category: 'Valves',
    imageUrl: '/plumbing.png',
    description: 'Gate valves, ball valves, check valves, float valves'
  },
  'Water Tanks': {
    category: 'Water Tanks',
    imageUrl: '/plumbing.png',
    description: 'Plastic tanks, steel tanks, underground tanks, header tanks'
  },
  'Pumps': {
    category: 'Pumps',
    imageUrl: '/plumbing.png',
    description: 'Water pumps, booster pumps, submersible pumps, pressure pumps'
  },
  'Taps & Mixers': {
    category: 'Taps & Mixers',
    imageUrl: '/plumbing.png',
    description: 'Kitchen taps, bathroom taps, shower mixers, basin taps'
  },
  'Sanitary Ware': {
    category: 'Sanitary Ware',
    imageUrl: '/plumbing.png',
    description: 'Toilets, sinks, basins, bidets, urinals, WC suites'
  },
  'Bathroom Accessories': {
    category: 'Bathroom Accessories',
    imageUrl: '/plumbing.png',
    description: 'Towel rails, soap dishes, mirrors, shower heads, bath accessories'
  },
  'Septic Tanks': {
    category: 'Septic Tanks',
    imageUrl: '/plumbing.png',
    description: 'Bio-digesters, septic systems, waste treatment'
  },
  'Water Heaters': {
    category: 'Water Heaters',
    imageUrl: '/plumbing.png',
    description: 'Electric heaters, solar heaters, instant heaters, geysers'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ELECTRICAL MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Electrical': {
    category: 'Electrical',
    imageUrl: '/electrical.png',
    description: 'Electrical - Nyayo, Kinga cables KEBS certified'
  },
  'Cables & Wires': {
    category: 'Cables & Wires',
    imageUrl: '/electrical.png',
    description: 'Twin & earth, single core, armored cables, data cables'
  },
  'Switches & Sockets': {
    category: 'Switches & Sockets',
    imageUrl: '/electrical.png',
    description: 'Light switches, power sockets, dimmers, USB sockets'
  },
  'Distribution Boards': {
    category: 'Distribution Boards',
    imageUrl: '/electrical.png',
    description: 'DB boxes, MCBs, RCCBs, isolators, consumer units'
  },
  'Lighting': {
    category: 'Lighting',
    imageUrl: '/electrical.png',
    description: 'Bulbs, tubes, LED lights, chandeliers, spotlights'
  },
  'Conduits': {
    category: 'Conduits',
    imageUrl: '/electrical.png',
    description: 'PVC conduits, metal conduits, trunking, cable trays'
  },
  'Electrical Accessories': {
    category: 'Electrical Accessories',
    imageUrl: '/electrical.png',
    description: 'Junction boxes, cable clips, terminals, connectors'
  },
  'Solar Equipment': {
    category: 'Solar Equipment',
    imageUrl: '/electrical.png',
    description: 'Solar panels, inverters, batteries, charge controllers'
  },
  'Generators': {
    category: 'Generators',
    imageUrl: '/electrical.png',
    description: 'Diesel generators, petrol generators, standby generators'
  },
  'UPS & Stabilizers': {
    category: 'UPS & Stabilizers',
    imageUrl: '/electrical.png',
    description: 'Power backup, voltage stabilizers, surge protectors'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TILES & FLOORING
  // ─────────────────────────────────────────────────────────────────────────────
  'Tiles': {
    category: 'Tiles',
    imageUrl: '/tiles.png',
    description: 'Floor and wall tiles - ceramic, porcelain, granite'
  },
  'Ceramic Tiles': {
    category: 'Ceramic Tiles',
    imageUrl: '/tiles.png',
    description: 'Wall tiles, floor tiles, kitchen tiles, bathroom tiles'
  },
  'Porcelain Tiles': {
    category: 'Porcelain Tiles',
    imageUrl: '/tiles.png',
    description: 'Polished, matte, anti-slip porcelain tiles'
  },
  'Granite Tiles': {
    category: 'Granite Tiles',
    imageUrl: '/tiles.png',
    description: 'Natural granite, engineered stone tiles'
  },
  'Marble': {
    category: 'Marble',
    imageUrl: '/tiles.png',
    description: 'Natural marble, cultured marble, marble tiles'
  },
  'Terrazzo': {
    category: 'Terrazzo',
    imageUrl: '/tiles.png',
    description: 'Terrazzo tiles, terrazzo chips, terrazzo flooring'
  },
  'Vinyl Flooring': {
    category: 'Vinyl Flooring',
    imageUrl: '/tiles.png',
    description: 'PVC flooring, LVT, vinyl tiles, vinyl planks'
  },
  'Wooden Flooring': {
    category: 'Wooden Flooring',
    imageUrl: '/timber.png',
    description: 'Parquet, laminate, engineered wood flooring'
  },
  'Carpet': {
    category: 'Carpet',
    imageUrl: '/tiles.png',
    description: 'Wall to wall carpet, carpet tiles, rugs'
  },
  'Tile Adhesive': {
    category: 'Tile Adhesive',
    imageUrl: '/tiles.png',
    description: 'Cement-based, ready-mixed tile adhesives'
  },
  'Tile Grout': {
    category: 'Tile Grout',
    imageUrl: '/tiles.png',
    description: 'Colored grout, epoxy grout, tile sealers'
  },
  'Skirting': {
    category: 'Skirting',
    imageUrl: '/tiles.png',
    description: 'Wooden skirting, PVC skirting, tile skirting'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PAINT & FINISHES
  // ─────────────────────────────────────────────────────────────────────────────
  'Paint': {
    category: 'Paint',
    imageUrl: '/paint.png',
    description: 'Paints - Crown, Basco, Sadolin, Dulux, Galaxy Paints Kenya'
  },
  'Emulsion Paint': {
    category: 'Emulsion Paint',
    imageUrl: '/paint.png',
    description: 'Interior wall paint, ceiling paint, water-based paint'
  },
  'Gloss Paint': {
    category: 'Gloss Paint',
    imageUrl: '/paint.png',
    description: 'Oil-based paint, enamel paint, high gloss finish'
  },
  'Exterior Paint': {
    category: 'Exterior Paint',
    imageUrl: '/paint.png',
    description: 'Weather shield, textured paint, exterior coatings'
  },
  'Wood Finish': {
    category: 'Wood Finish',
    imageUrl: '/paint.png',
    description: 'Varnish, wood stain, lacquer, wood preservatives'
  },
  'Metal Paint': {
    category: 'Metal Paint',
    imageUrl: '/paint.png',
    description: 'Hammerite, rust-proof paint, metal primers'
  },
  'Primers': {
    category: 'Primers',
    imageUrl: '/paint.png',
    description: 'Wall primer, metal primer, wood primer, undercoats'
  },
  'Putty & Fillers': {
    category: 'Putty & Fillers',
    imageUrl: '/paint.png',
    description: 'Wall putty, wood filler, crack filler, plaster of Paris'
  },
  'Thinners & Solvents': {
    category: 'Thinners & Solvents',
    imageUrl: '/paint.png',
    description: 'Paint thinner, turpentine, spirit, cleaning solvents'
  },
  'Brushes & Rollers': {
    category: 'Brushes & Rollers',
    imageUrl: '/tools.jpg',
    description: 'Paint brushes, rollers, spray guns, painting accessories'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WALL & CEILING FINISHES
  // ─────────────────────────────────────────────────────────────────────────────
  'Gypsum': {
    category: 'Gypsum',
    imageUrl: '/insulation.png',
    description: 'Gypsum boards, gypsum plaster, drywall'
  },
  'Ceiling Boards': {
    category: 'Ceiling Boards',
    imageUrl: '/insulation.png',
    description: 'PVC ceiling, T&G boards, acoustic ceiling tiles'
  },
  'Plaster': {
    category: 'Plaster',
    imageUrl: '/cement.png',
    description: 'Cement plaster, lime plaster, finishing plaster'
  },
  'Wallpaper': {
    category: 'Wallpaper',
    imageUrl: '/paint.png',
    description: 'Vinyl wallpaper, fabric wallpaper, wall murals'
  },
  'Wall Cladding': {
    category: 'Wall Cladding',
    imageUrl: '/stone.png',
    description: 'Stone cladding, wood cladding, PVC panels'
  },
  'Insulation': {
    category: 'Insulation',
    imageUrl: '/insulation.png',
    description: 'Thermal insulation, acoustic insulation, rockwool'
  },
  'Cornices': {
    category: 'Cornices',
    imageUrl: '/insulation.png',
    description: 'Gypsum cornices, decorative moldings, coving'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HARDWARE & FASTENERS
  // ─────────────────────────────────────────────────────────────────────────────
  'Hardware': {
    category: 'Hardware',
    imageUrl: '/hardware.png',
    description: 'Construction hardware and general supplies'
  },
  'Nails': {
    category: 'Nails',
    imageUrl: '/hardware.png',
    description: 'Wire nails, masonry nails, roofing nails, concrete nails'
  },
  'Screws': {
    category: 'Screws',
    imageUrl: '/hardware.png',
    description: 'Wood screws, self-tapping, drywall screws, machine screws'
  },
  'Bolts & Nuts': {
    category: 'Bolts & Nuts',
    imageUrl: '/hardware.png',
    description: 'Hex bolts, anchor bolts, expansion bolts, nuts, washers'
  },
  'Hinges': {
    category: 'Hinges',
    imageUrl: '/hardware.png',
    description: 'Butt hinges, piano hinges, gate hinges, concealed hinges'
  },
  'Locks': {
    category: 'Locks',
    imageUrl: '/hardware.png',
    description: 'Padlocks, mortise locks, rim locks, digital locks'
  },
  'Chains': {
    category: 'Chains',
    imageUrl: '/hardware.png',
    description: 'Galvanized chain, stainless chain, anchor chain'
  },
  'Wire': {
    category: 'Wire',
    imageUrl: '/wire.png',
    description: 'Binding wire, fencing wire, barbed wire, GI wire'
  },
  'Wire Mesh': {
    category: 'Wire Mesh',
    imageUrl: '/wire.png',
    description: 'BRC mesh, chicken mesh, welded mesh, expanded metal'
  },
  'Brackets & Supports': {
    category: 'Brackets & Supports',
    imageUrl: '/hardware.png',
    description: 'Shelf brackets, joist hangers, angles, supports'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOLS & EQUIPMENT
  // ─────────────────────────────────────────────────────────────────────────────
  'Tools': {
    category: 'Tools',
    imageUrl: '/tools.jpg',
    description: 'Construction tools and equipment'
  },
  'Hand Tools': {
    category: 'Hand Tools',
    imageUrl: '/tools.jpg',
    description: 'Hammers, screwdrivers, pliers, spanners, wrenches'
  },
  'Power Tools': {
    category: 'Power Tools',
    imageUrl: '/tools.jpg',
    description: 'Drills, grinders, saws, sanders, power tools'
  },
  'Measuring Tools': {
    category: 'Measuring Tools',
    imageUrl: '/tools.jpg',
    description: 'Tape measures, levels, squares, laser levels'
  },
  'Cutting Tools': {
    category: 'Cutting Tools',
    imageUrl: '/tools.jpg',
    description: 'Hacksaws, tile cutters, bolt cutters, angle grinders'
  },
  'Masonry Tools': {
    category: 'Masonry Tools',
    imageUrl: '/tools.jpg',
    description: 'Trowels, floats, jointers, brick hammers'
  },
  'Painting Tools': {
    category: 'Painting Tools',
    imageUrl: '/tools.jpg',
    description: 'Brushes, rollers, spray equipment, paint trays'
  },
  'Safety Equipment': {
    category: 'Safety Equipment',
    imageUrl: '/tools.jpg',
    description: 'Helmets, boots, gloves, harnesses, safety vests'
  },
  'Scaffolding': {
    category: 'Scaffolding',
    imageUrl: '/tools.jpg',
    description: 'Steel scaffolding, wooden scaffolding, scaffold accessories'
  },
  'Ladders': {
    category: 'Ladders',
    imageUrl: '/tools.jpg',
    description: 'Aluminium ladders, wooden ladders, step ladders'
  },
  'Wheelbarrows': {
    category: 'Wheelbarrows',
    imageUrl: '/tools.jpg',
    description: 'Construction wheelbarrows, concrete mixers, barrows'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADHESIVES & SEALANTS
  // ─────────────────────────────────────────────────────────────────────────────
  'Adhesives': {
    category: 'Adhesives',
    imageUrl: '/hardware.png',
    description: 'Construction adhesive, wood glue, contact cement'
  },
  'Sealants': {
    category: 'Sealants',
    imageUrl: '/hardware.png',
    description: 'Silicone sealant, acrylic sealant, PU sealant'
  },
  'Caulking': {
    category: 'Caulking',
    imageUrl: '/hardware.png',
    description: 'Gap filler, expansion joint filler, caulk guns'
  },
  'Epoxy': {
    category: 'Epoxy',
    imageUrl: '/hardware.png',
    description: 'Epoxy resin, epoxy grout, anchoring epoxy'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FENCING & SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  'Fencing': {
    category: 'Fencing',
    imageUrl: '/wire.png',
    description: 'Chain link, welded mesh, palisade fencing'
  },
  'Barbed Wire': {
    category: 'Barbed Wire',
    imageUrl: '/wire.png',
    description: 'Razor wire, concertina wire, barbed wire rolls'
  },
  'Electric Fence': {
    category: 'Electric Fence',
    imageUrl: '/electrical.png',
    description: 'Energizers, insulators, fence wire, electric fence kits'
  },
  'Gates': {
    category: 'Gates',
    imageUrl: '/doors.png',
    description: 'Steel gates, sliding gates, swing gates, driveway gates'
  },
  'Security Systems': {
    category: 'Security Systems',
    imageUrl: '/electrical.png',
    description: 'CCTV, alarms, access control, intercoms'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LANDSCAPING & OUTDOOR
  // ─────────────────────────────────────────────────────────────────────────────
  'Paving': {
    category: 'Paving',
    imageUrl: '/blocks.png',
    description: 'Cabro, pavers, kerbs, edging, paving blocks'
  },
  'Outdoor Tiles': {
    category: 'Outdoor Tiles',
    imageUrl: '/tiles.png',
    description: 'Non-slip tiles, pool tiles, outdoor flooring'
  },
  'Drainage': {
    category: 'Drainage',
    imageUrl: '/plumbing.png',
    description: 'Drainage channels, manholes, gratings, storm drains'
  },
  'Retaining Walls': {
    category: 'Retaining Walls',
    imageUrl: '/stone.png',
    description: 'Gabions, retaining blocks, landscape walls'
  },
  'Garden Materials': {
    category: 'Garden Materials',
    imageUrl: '/sand.png',
    description: 'Topsoil, compost, mulch, pebbles, decorative stones'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // KITCHEN & BUILT-IN
  // ─────────────────────────────────────────────────────────────────────────────
  'Kitchen Cabinets': {
    category: 'Kitchen Cabinets',
    imageUrl: '/doors.png',
    description: 'Base units, wall units, pantry, kitchen furniture'
  },
  'Countertops': {
    category: 'Countertops',
    imageUrl: '/tiles.png',
    description: 'Granite tops, quartz, solid surface counters'
  },
  'Kitchen Sinks': {
    category: 'Kitchen Sinks',
    imageUrl: '/plumbing.png',
    description: 'Stainless steel, ceramic, granite kitchen sinks'
  },
  'Kitchen Hardware': {
    category: 'Kitchen Hardware',
    imageUrl: '/hardware.png',
    description: 'Drawer slides, soft close hinges, kitchen accessories'
  },
  'Wardrobes': {
    category: 'Wardrobes',
    imageUrl: '/doors.png',
    description: 'Built-in wardrobes, closet systems, wardrobe fittings'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HVAC & VENTILATION
  // ─────────────────────────────────────────────────────────────────────────────
  'Air Conditioning': {
    category: 'Air Conditioning',
    imageUrl: '/electrical.png',
    description: 'Split units, cassette, ducted AC, air conditioners'
  },
  'Ventilation': {
    category: 'Ventilation',
    imageUrl: '/electrical.png',
    description: 'Exhaust fans, air vents, ducting, ventilation systems'
  },
  'Ceiling Fans': {
    category: 'Ceiling Fans',
    imageUrl: '/electrical.png',
    description: 'Decorative fans, industrial fans, ceiling fan accessories'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FIRE SAFETY
  // ─────────────────────────────────────────────────────────────────────────────
  'Fire Safety': {
    category: 'Fire Safety',
    imageUrl: '/hardware.png',
    description: 'Fire extinguishers, fire blankets, safety equipment'
  },
  'Fire Doors': {
    category: 'Fire Doors',
    imageUrl: '/doors.png',
    description: 'Fire rated doors, smoke seals, fire door hardware'
  },
  'Fire Alarm': {
    category: 'Fire Alarm',
    imageUrl: '/electrical.png',
    description: 'Smoke detectors, fire alarm panels, heat detectors'
  },
  'Sprinkler Systems': {
    category: 'Sprinkler Systems',
    imageUrl: '/plumbing.png',
    description: 'Fire sprinklers, hose reels, fire suppression'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIALTY MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────
  'Damp Proofing': {
    category: 'Damp Proofing',
    imageUrl: '/insulation.png',
    description: 'DPC, DPM, tanking slurry, damp proof course'
  },
  'Expansion Joints': {
    category: 'Expansion Joints',
    imageUrl: '/hardware.png',
    description: 'Joint fillers, movement joints, expansion strips'
  },
  'Reinforcement Accessories': {
    category: 'Reinforcement Accessories',
    imageUrl: '/steel.png',
    description: 'Spacers, chairs, tie wire, rebar accessories'
  },
  'Curing Compounds': {
    category: 'Curing Compounds',
    imageUrl: '/cement.png',
    description: 'Concrete curing, membrane curing, curing agents'
  },
  'Admixtures': {
    category: 'Admixtures',
    imageUrl: '/cement.png',
    description: 'Plasticizers, accelerators, retarders, concrete admixtures'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MISCELLANEOUS
  // ─────────────────────────────────────────────────────────────────────────────
  'Geotextiles': {
    category: 'Geotextiles',
    imageUrl: '/insulation.png',
    description: 'Woven, non-woven geotextiles, ground fabric'
  },
  'Polythene': {
    category: 'Polythene',
    imageUrl: '/insulation.png',
    description: 'DPM sheets, packaging, protective covers'
  },
  'Tarpaulins': {
    category: 'Tarpaulins',
    imageUrl: '/insulation.png',
    description: 'Waterproof covers, shade nets, protective tarps'
  },
  'Signage': {
    category: 'Signage',
    imageUrl: '/hardware.png',
    description: 'Safety signs, construction signs, warning signs'
  },
  'Other': {
    category: 'Other',
    imageUrl: 'https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=800&q=80',
    description: 'Other construction materials'
  }
};

/**
 * Get the default image URL for a given category
 * @param category - The material category
 * @returns The default image URL or undefined if not found
 */
const normalizeCategory = (raw: string): string => {
  const v = (raw || '').trim().toLowerCase();
  const direct = Object.keys(DEFAULT_CATEGORY_IMAGES).find(k => k.toLowerCase() === v);
  if (direct) return direct;
  
  // Comprehensive synonyms mapping for Kenya construction materials
  const synonyms: Record<string, string[]> = {
    // STRUCTURAL & FOUNDATION
    'Cement': ['cement', 'bamburi', 'savannah cement', 'mombasa cement', 'simba cement', 'athi river cement', 'portland cement'],
    'Steel': ['rebar', 'steel bars', 'reinforcement', 'y8', 'y10', 'y12', 'y16', 'y20', 'y25', 'y32', 'deformed bars', 'brc'],
    'Aggregates': ['ballast', 'gravel', 'crushed stone', 'aggregate', 'hardcore'],
    'Sand': ['river sand', 'pit sand', 'plastering sand', 'building sand', 'sharp sand', 'soft sand'],
    'Stone': ['machine cut', 'natural stone', 'foundation stone', 'building stone', 'dressed stone'],
    'Blocks': ['concrete block', 'hollow block', 'solid block', 'cabro', 'paving block'],
    'Bricks': ['clay brick', 'fire brick', 'decorative brick', 'red brick'],
    'Ready Mix Concrete': ['ready mix', 'premix', 'screed', 'concrete mix'],
    
    // ROOFING
    'Iron Sheets': ['mabati', 'iron sheet', 'corrugated', 'box profile', 'gauge 28', 'gauge 30', 'gauge 32'],
    'Roofing Tiles': ['clay tile', 'concrete tile', 'slate tile', 'roof tile'],
    'Gutters & Downpipes': ['gutter', 'downpipe', 'rainwater', 'fascia'],
    'Roofing Accessories': ['ridge cap', 'flashing', 'roofing nail', 'roofing screw', 'roof fastener'],
    'Waterproofing': ['dpm', 'bitumen', 'roof sealant', 'waterproof membrane', 'tanking'],
    
    // TIMBER & WOOD
    'Timber': ['wood', 'lumber', 'cypress', 'pine', 'hardwood', 'mahogany', 'mvule', 'softwood'],
    'Plywood': ['marine plywood', 'shuttering plywood', 'mdf', 'ply'],
    'Particle Board': ['chipboard', 'osb', 'hardboard', 'fibreboard'],
    'Timber Trusses': ['roof truss', 'prefab truss', 'truss'],
    'Formwork': ['shuttering', 'form panel', 'concrete form'],
    'Treated Poles': ['fence post', 'power pole', 'building pole', 'eucalyptus pole'],
    
    // DOORS, WINDOWS & OPENINGS
    'Doors': ['wooden door', 'flush door', 'panel door', 'door'],
    'Steel Doors': ['metal door', 'security door', 'security grill', 'roller shutter'],
    'Windows': ['wooden window', 'steel window', 'casement window'],
    'Aluminium Windows': ['aluminium', 'sliding window', 'louver', 'upvc window'],
    'Glass': ['float glass', 'tinted glass', 'frosted glass', 'tempered glass', 'mirror'],
    'Door Frames': ['door frame', 'architrave', 'door lining'],
    'Door Hardware': ['door lock', 'door handle', 'door hinge', 'door closer'],
    'Window Hardware': ['window stay', 'window handle', 'window lock', 'window hinge'],
    
    // PLUMBING & WATER
    'Plumbing': ['plumbing', 'kenpipe'],
    'PVC Pipes': ['pvc pipe', 'pressure pipe', 'drainage pipe', 'conduit pipe'],
    'PPR Pipes': ['ppr', 'hot water pipe', 'polypropylene'],
    'GI Pipes': ['galvanized', 'gi pipe', 'threaded pipe'],
    'HDPE Pipes': ['hdpe', 'polyethylene pipe'],
    'Pipe Fittings': ['elbow', 'tee', 'reducer', 'coupling', 'union', 'adapter', 'fitting'],
    'Valves': ['gate valve', 'ball valve', 'check valve', 'float valve', 'stop cock'],
    'Water Tanks': ['tank', 'sintex', 'roto', 'header tank', 'storage tank'],
    'Pumps': ['water pump', 'booster pump', 'submersible', 'pressure pump', 'dayliff'],
    'Taps & Mixers': ['tap', 'mixer', 'faucet', 'basin tap', 'kitchen tap'],
    'Sanitary Ware': ['toilet', 'sink', 'basin', 'bidet', 'urinal', 'wc', 'closet'],
    'Bathroom Accessories': ['towel rail', 'soap dish', 'shower head', 'bath accessory'],
    'Septic Tanks': ['septic', 'bio-digester', 'biodigester'],
    'Water Heaters': ['geyser', 'water heater', 'instant heater', 'solar heater'],
    
    // ELECTRICAL
    'Electrical': ['electrical'],
    'Cables & Wires': ['cable', 'wire', 'twin earth', 'single core', 'armored cable', 'nyayo', 'kinga'],
    'Switches & Sockets': ['switch', 'socket', 'dimmer', 'usb socket', 'power point'],
    'Distribution Boards': ['db box', 'mcb', 'rccb', 'isolator', 'consumer unit', 'distribution board'],
    'Lighting': ['bulb', 'tube', 'led', 'chandelier', 'spotlight', 'light fixture', 'lamp'],
    'Conduits': ['conduit', 'trunking', 'cable tray'],
    'Electrical Accessories': ['junction box', 'cable clip', 'terminal', 'connector'],
    'Solar Equipment': ['solar panel', 'inverter', 'battery', 'charge controller', 'solar'],
    'Generators': ['generator', 'genset', 'diesel generator', 'petrol generator'],
    'UPS & Stabilizers': ['ups', 'stabilizer', 'surge protector', 'power backup'],
    
    // TILES & FLOORING
    'Tiles': ['tile'],
    'Ceramic Tiles': ['ceramic', 'wall tile', 'floor tile'],
    'Porcelain Tiles': ['porcelain', 'polished tile'],
    'Granite Tiles': ['granite', 'engineered stone'],
    'Marble': ['marble'],
    'Terrazzo': ['terrazzo'],
    'Vinyl Flooring': ['vinyl', 'lvt', 'pvc flooring'],
    'Wooden Flooring': ['parquet', 'laminate', 'engineered wood', 'wood floor'],
    'Carpet': ['carpet', 'rug'],
    'Tile Adhesive': ['tile adhesive', 'tile cement', 'tile bond'],
    'Tile Grout': ['grout', 'tile sealer'],
    'Skirting': ['skirting', 'baseboard'],
    
    // PAINT & FINISHES
    'Paint': ['paint', 'crown paint', 'basco', 'sadolin', 'dulux', 'galaxy'],
    'Emulsion Paint': ['emulsion', 'wall paint', 'ceiling paint', 'water based'],
    'Gloss Paint': ['gloss', 'enamel', 'oil based'],
    'Exterior Paint': ['exterior', 'weather shield', 'textured paint'],
    'Wood Finish': ['varnish', 'wood stain', 'lacquer', 'wood preservative'],
    'Metal Paint': ['hammerite', 'rust proof', 'metal paint'],
    'Primers': ['primer', 'undercoat'],
    'Putty & Fillers': ['putty', 'filler', 'crack filler', 'plaster of paris', 'pop'],
    'Thinners & Solvents': ['thinner', 'turpentine', 'spirit', 'solvent'],
    'Brushes & Rollers': ['brush', 'roller', 'spray gun'],
    
    // WALL & CEILING
    'Gypsum': ['gypsum', 'drywall', 'plasterboard'],
    'Ceiling Boards': ['ceiling board', 'pvc ceiling', 't&g', 'acoustic ceiling'],
    'Plaster': ['plaster', 'render'],
    'Wallpaper': ['wallpaper', 'wall mural'],
    'Wall Cladding': ['cladding', 'wall panel'],
    'Insulation': ['insulation', 'rockwool', 'thermal insulation', 'acoustic insulation'],
    'Cornices': ['cornice', 'molding', 'coving'],
    
    // HARDWARE & FASTENERS
    'Hardware': ['hardware'],
    'Nails': ['nail', 'wire nail', 'masonry nail', 'roofing nail', 'concrete nail'],
    'Screws': ['screw', 'wood screw', 'drywall screw', 'self tapping'],
    'Bolts & Nuts': ['bolt', 'nut', 'washer', 'anchor bolt', 'expansion bolt'],
    'Hinges': ['hinge', 'butt hinge', 'piano hinge', 'gate hinge'],
    'Locks': ['lock', 'padlock', 'mortise lock', 'rim lock', 'digital lock'],
    'Chains': ['chain', 'anchor chain'],
    'Wire': ['wire', 'binding wire', 'fencing wire', 'gi wire'],
    'Wire Mesh': ['mesh', 'brc mesh', 'chicken mesh', 'welded mesh', 'expanded metal'],
    'Brackets & Supports': ['bracket', 'joist hanger', 'angle', 'support'],
    
    // TOOLS & EQUIPMENT
    'Tools': ['tool'],
    'Hand Tools': ['hammer', 'screwdriver', 'plier', 'spanner', 'wrench'],
    'Power Tools': ['drill', 'grinder', 'saw', 'sander', 'power tool'],
    'Measuring Tools': ['tape measure', 'level', 'square', 'laser level'],
    'Cutting Tools': ['hacksaw', 'tile cutter', 'bolt cutter'],
    'Masonry Tools': ['trowel', 'float', 'jointer', 'brick hammer'],
    'Painting Tools': ['paint brush', 'paint roller', 'spray equipment'],
    'Safety Equipment': ['helmet', 'boot', 'glove', 'harness', 'safety vest', 'ppe'],
    'Scaffolding': ['scaffold', 'scaffolding'],
    'Ladders': ['ladder', 'step ladder'],
    'Wheelbarrows': ['wheelbarrow', 'concrete mixer', 'barrow'],
    
    // ADHESIVES & SEALANTS
    'Adhesives': ['adhesive', 'glue', 'contact cement'],
    'Sealants': ['sealant', 'silicone', 'acrylic sealant', 'pu sealant'],
    'Caulking': ['caulk', 'gap filler'],
    'Epoxy': ['epoxy', 'epoxy resin'],
    
    // FENCING & SECURITY
    'Fencing': ['fence', 'chain link', 'palisade'],
    'Barbed Wire': ['barbed', 'razor wire', 'concertina'],
    'Electric Fence': ['electric fence', 'energizer'],
    'Gates': ['gate', 'sliding gate', 'swing gate', 'driveway gate'],
    'Security Systems': ['cctv', 'alarm', 'access control', 'intercom'],
    
    // LANDSCAPING & OUTDOOR
    'Paving': ['paver', 'kerb', 'edging', 'paving'],
    'Outdoor Tiles': ['outdoor tile', 'pool tile', 'non slip'],
    'Drainage': ['drain', 'manhole', 'grating', 'storm drain'],
    'Retaining Walls': ['gabion', 'retaining block', 'retaining wall'],
    'Garden Materials': ['topsoil', 'compost', 'mulch', 'pebble', 'decorative stone'],
    
    // KITCHEN & BUILT-IN
    'Kitchen Cabinets': ['kitchen cabinet', 'base unit', 'wall unit', 'pantry'],
    'Countertops': ['countertop', 'worktop', 'kitchen top'],
    'Kitchen Sinks': ['kitchen sink', 'stainless sink'],
    'Kitchen Hardware': ['drawer slide', 'soft close', 'kitchen accessory'],
    'Wardrobes': ['wardrobe', 'closet', 'built-in'],
    
    // HVAC & VENTILATION
    'Air Conditioning': ['ac', 'air conditioner', 'split unit', 'cassette', 'ducted'],
    'Ventilation': ['exhaust fan', 'air vent', 'ducting', 'ventilation'],
    'Ceiling Fans': ['ceiling fan', 'industrial fan'],
    
    // FIRE SAFETY
    'Fire Safety': ['fire extinguisher', 'fire blanket'],
    'Fire Doors': ['fire door', 'fire rated', 'smoke seal'],
    'Fire Alarm': ['smoke detector', 'fire alarm', 'heat detector'],
    'Sprinkler Systems': ['sprinkler', 'hose reel', 'fire suppression'],
    
    // SPECIALTY MATERIALS
    'Damp Proofing': ['dpc', 'damp proof', 'tanking slurry'],
    'Expansion Joints': ['expansion joint', 'movement joint'],
    'Reinforcement Accessories': ['spacer', 'chair', 'tie wire', 'rebar accessory'],
    'Curing Compounds': ['curing compound', 'membrane curing'],
    'Admixtures': ['plasticizer', 'accelerator', 'retarder', 'admixture'],
    
    // MISCELLANEOUS
    'Geotextiles': ['geotextile', 'ground fabric'],
    'Polythene': ['polythene', 'plastic sheet', 'protective cover'],
    'Tarpaulins': ['tarpaulin', 'tarp', 'shade net'],
    'Signage': ['sign', 'safety sign', 'construction sign', 'warning sign']
  };
  
  for (const target of Object.keys(synonyms)) {
    if (synonyms[target].some(s => v.includes(s))) return target;
  }
  return 'Other';
};

export const getDefaultCategoryImage = (category: string): string | undefined => {
  const key = normalizeCategory(category);
  return DEFAULT_CATEGORY_IMAGES[key]?.imageUrl;
};

/**
 * Get all category options with their default images
 * @returns Array of category options
 */
export const getCategoryOptions = (): CategoryImage[] => {
  return Object.values(DEFAULT_CATEGORY_IMAGES);
};

/**
 * Check if a category has a default image
 * @param category - The material category
 * @returns True if default image exists
 */
export const hasDefaultImage = (category: string): boolean => {
  const key = normalizeCategory(category);
  return !!DEFAULT_CATEGORY_IMAGES[key];
};

