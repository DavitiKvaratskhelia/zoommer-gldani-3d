// =====================================================================
//  ზუმერი — გლდანი მოლი · ფილიალის 3D მოდელის კონფიგურაცია
//  წყარო: „ZGMP - გეგმები - Update 6.pdf“ (DODO Designs, 07–08.2025)
//
//  ერთეული: 1 = 1 მეტრი.  ღერძები (გეგმაზე):
//    X → მარჯვნივ (ფასადი A-ს გასწვრივ)
//    Z → ქვემოთ  (ფასადი B-ს გასწვრივ, ქვედა 18.16 მ კედლისკენ)
//    Y → ზემოთ  (სიმაღლე)
//  სათავე (0,0,0): ორი მინის ფასადის (A — ზედა, B — მარცხენა) შიდა
//  წახნაგების გადაკვეთა, იატაკის დონეზე.
//
//  ზომის სტატუსები:
//    'pdf'      — რიცხვით მითითებულია PDF-ში (ან ზუსტად გამოითვლება
//                 მითითებული ზომების ჯამით)
//    'measured' — PDF-ში რიცხვი არ არის; გაზომილია ნახაზიდან 1:70
//                 მასშტაბით (დაკალიბრებულია 18160 მმ ზომით, ცდომილება
//                 ≈ ±30 მმ)
//    'assumed'  — PDF-ში არ არის; გონივრული ვარაუდი (მარტივად შესაცვლელი)
// =====================================================================

export const META = {
  title: 'ზუმერი — გლდანი მოლი',
  subtitle: 'ფილიალის 3D მოდელი · 1 ერთეული = 1 მ',
  source: 'ZGMP - გეგმები - Update 6.pdf (DODO Designs)',
};

// ---------------------------------------------------------------------
//  ძირითადი სიმაღლეები და სისქეები
// ---------------------------------------------------------------------
export const H = {
  ceiling: 4.10,        // pdf — ZGMP-12: თაბაშირმუყაოს ჭერი 4.10 მ ნიშნულზე
  ceilingThk: 0.0125,   // pdf — თაბაშირმუყაო 12.5 მმ
  slab: 4.65,           // pdf — განშლები ZGMP-08: 4650 (ბეტონის გადახურვა; მოდელში არ არის)
  extWall: 4.50,        // pdf — ქვედა კედელი H4500 (სხვა გარე კედლებისთვის ვარაუდი იგივე)
  partition: 4.10,      // assumed — ახალი ტიხრები ჭერამდე (4.10)
  glazing: 3.00,        // pdf — ვიტრაჟი H3000
  signBandBottom: 3.00, // pdf — ZGMP-14: ფასადის ნარინჯისფერი ზოლი ვიტრაჟის თავზე
  signBandTop: 3.80,    // pdf — ზოლის სიმაღლე 800 (240+320+240)
  door: 2.10,           // assumed — კარის სიმაღლე PDF-ში არ არის
  column: 4.50,         // assumed — სვეტები ჭერს ზემოთ (გადახურვამდე) გრძელდება
  floorSlab: 0.10,      // assumed — იატაკის ფილის ვიზუალური სისქე
  inlay: 0.004,         // assumed — ვინილის ჩანართის სისქე
};

export const T = {
  extWall: 0.10,      // measured — შავი (არსებული) კედლები ≈100 მმ
  partition: 0.10,    // pdf — ZGMP-07: „ტიხრები სიგანით 100 მმ“
  concrete: 0.20,     // measured — დაშტრიხული (ბეტონის) კედელი ≈200 მმ
  glassZone: 0.10,    // pdf — ფასადის კუთხის 100 მმ ზომა
  glass: 0.012,       // pdf — ZGMP-14: 12 მმ ნაწრთობი მინა
  signBand: 0.05,     // assumed — ალუმინის კომპოზიტის ზოლის სისქე
};

// ---------------------------------------------------------------------
//  ფერები / მასალები (RAL — PDF-დან; სხვა — ნეიტრალური ან PDF-ის 3D ხედებიდან)
// ---------------------------------------------------------------------
export const COLORS = {
  floor:      { c: '#bdb7ae', r: 0.36, name: 'კერამოგრანიტი Z-FL-01 (ფერი დაუზუსტებელი — ნეიტრალური)' },
  wall:       { c: '#ebe9e4', r: 0.9,  name: 'კედელი RAL 9010 (Z-WP-1)' },
  wallExt:    { c: '#e6e4df', r: 0.9,  name: 'გარე კედელი (ნეიტრალური)' },
  concrete:   { c: '#bdbab3', r: 0.95, name: 'ბეტონის კედელი (ნეიტრალური)' },
  ceiling:    { c: '#f4f1ea', r: 0.95, name: 'ჭერი RAL 9010' },
  column:     { c: '#e4e2dd', r: 0.8,  name: 'სვეტი (ნეიტრალური)' },
  partition:  { c: '#ebe9e4', r: 0.9,  name: 'თაბაშირმუყაოს ტიხარი RAL 9010' },
  door:       { c: '#d8d4ca', r: 0.7,  name: 'კარი (ნეიტრალური)' },
  glass:      { c: '#cfe3ec', r: 0.05, opacity: 0.22, name: 'მინა 12 მმ' },
  frame:      { c: '#8d9096', r: 0.4, m: 0.6, name: 'ალუმინის პროფილი' },
  signBand:   { c: '#ff7514', r: 0.5,  name: 'ალუმინის კომპ. პანელი RAL 2003' },
  // ავეჯი — PDF-ის აქსონომეტრიული ხედების (ZGMP-01…04) მიხედვით
  furnOrange: { c: '#f0561d', r: 0.5,  name: 'ავეჯი — ნარინჯისფერი (3D ხედებიდან)' },
  furnWhite:  { c: '#efeeea', r: 0.45, name: 'ავეჯი — თეთრი' },
  furnGlass:  { c: '#dfeaf0', r: 0.05, opacity: 0.35, name: 'ვიტრინის მინა' },
  furnGray:   { c: '#8f9297', r: 0.7,  name: 'პერფორირებული პანელი (ნეიტრალური)' },
  furnPurple: { c: '#5a45d2', r: 0.5,  name: 'გეიმინგ ზონის ავეჯი (3D ხედებიდან)' },
  furnDark:   { c: '#2b2d31', r: 0.4,  name: 'ეკრანი / მუქი ელემენტი' },
  seat:       { c: '#c9c7c2', r: 0.8,  name: 'სკამი (ნეიტრალური)' },
  pouf:       { c: '#9a9da3', r: 0.9,  name: 'პუფი (ნეიტრალური)' },
  // RAL ფერები — PDF ZGMP-08/09
  ral1016:    { c: '#e9dc3c', r: 0.7,  name: 'RAL 1016' },
  ral6034:    { c: '#7cb0ae', r: 0.7,  name: 'RAL 6034' },
  ral4009:    { c: '#a08a96', r: 0.7,  name: 'RAL 4009' },
  ral4005:    { c: '#776a9e', r: 0.7,  name: 'RAL 4005' },
  ral5022:    { c: '#28306a', r: 0.7,  name: 'RAL 5022' },
  ral7015:    { c: '#4e535a', r: 0.7,  name: 'RAL 7015' },
};

// ---------------------------------------------------------------------
//  საკვანძო კოორდინატები (მ) — ყველა ზომა ერთ ადგილზე
// ---------------------------------------------------------------------
export const P = {
  // ფასადი A (ზედა): 3700 მინა | 2000 შესასვლელი | 5350 მინა | 860 კედელი  (pdf, ZGMP-07)
  aGlass1: [0, 3.70],
  aDoor: [3.70, 5.70],
  aGlass2: [5.70, 11.05],
  aSolid: [11.05, 11.91],
  returnX: 11.91,          // pdf — მარჯვენა „გამოწეული“ კედლის შიდა წახნაგი (3700+2000+5350+860)
  // ფასადი B (მარცხენა): 6400 მინა | 2500 შესასვლელი | 7380 მინა  (pdf)
  bGlass1: [0, 6.40],
  bDoor: [6.40, 8.90],
  bGlass2: [8.90, 16.28],
  bottomZ: 16.28,          // pdf — 6400+2500+7380
  stepZ: 4.33,             // pdf (ჯამი) — 2430+690+1110+530−430
  bottomLen: 18.16,        // pdf — H4500 კედელი
  tvWallX: 18.16,          // pdf — 6250 (11.91→18.16) და 18160
  // ბეტონის (დაშტრიხული) კედლის შიდა წახნაგი — ოდნავ დახრილია ნახაზზე
  // ზედა: 18.26 + 2320 (საწყობი) = 20.58 Z=5.16-ზე; ქვედა: 18.26 + 2160 = 20.42 Z=15.88-ზე (pdf)
  concreteA: [20.594, 4.13],
  concreteB: [20.411, 16.38],
};

// დახრილი ბეტონის კედლის შიდა წახნაგის X მოცემულ Z-ზე
export function concreteXAt(z) {
  const [x0, z0] = P.concreteA, [x1, z1] = P.concreteB;
  return x0 + (x1 - x0) * (z - z0) / (z1 - z0);
}

// ---------------------------------------------------------------------
//  კედლები. a→b — კედლის ერთი წახნაგის ხაზი; thickness გადადის
//  side-ის მიმართულებით: 'L' — a→b მიმართულების მარცხნივ (გეგმაზე),
//  'R' — მარჯვნივ. openings: { s0, s1 } — მანძილი a-დან (მ),
//  { y0, y1 } — სიმაღლეები. status — ზომის სტატუსი.
// ---------------------------------------------------------------------
const cz = concreteXAt;
export const WALLS = [
  // ---- გარე / არსებული კედლები (ჯგუფი: exterior) ----
  { id: 'W-bottom', group: 'exterior', name: 'ქვედა კედელი H4500', a: [-0.10, 16.28], b: [cz(16.33), 16.28], side: 'R', t: T.extWall, h: H.extWall, mat: 'wallExt', status: { len: 'pdf', h: 'pdf', t: 'measured' } },
  { id: 'W-return', group: 'exterior', name: 'გარე კედელი (ფასადი A-ს ბოლო, „გამოწეული“)', a: [P.returnX, -0.10], b: [P.returnX, P.stepZ], side: 'L', t: T.extWall, h: H.extWall, mat: 'wallExt', status: { len: 'pdf', h: 'assumed', t: 'measured' } },
  { id: 'W-step', group: 'exterior', name: 'გარე კედელი (ჭკვიანი სახლის / საწყობის მხარე)', a: [P.returnX, P.stepZ], b: [cz(4.28) + 0.02, P.stepZ], side: 'L', t: T.extWall, h: H.extWall, mat: 'wallExt', status: { len: 'pdf', h: 'assumed', t: 'measured' } },
  { id: 'W-concrete', group: 'exterior', name: 'ბეტონის კედელი (არსებული, დაშტრიხული)', a: P.concreteA, b: P.concreteB, side: 'L', t: T.concrete, h: H.extWall, mat: 'concrete',
    openings: [{ s0: 11.71 - 4.13, s1: 12.81 - 4.13, y0: 0, y1: H.door, label: 'დერეფნის გასასვლელი' }],
    status: { len: 'measured', h: 'assumed', t: 'measured' } },
  { id: 'W-A-solid', group: 'exterior', name: 'ფასადი A — ყრუ მონაკვეთი 860', a: [P.aSolid[0], 0], b: [P.aSolid[1], 0], side: 'L', t: T.glassZone, h: H.extWall, mat: 'wallExt', status: { len: 'pdf', h: 'assumed', t: 'pdf' } },

  // ---- ახალი თაბაშირმუყაოს ტიხრები (ჯგუფი: interior) — ZGMP-07 ----
  { id: 'P-tv-top', group: 'interior', name: 'ტიხარი (TV-ს ზემოთ)', a: [P.tvWallX, P.stepZ], b: [P.tvWallX, 5.63], side: 'L', t: T.partition, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  { id: 'P-tv-jog1', group: 'interior', name: 'ტიხარი (TV ნიშის ზედა ბოლო)', a: [P.tvWallX, 5.63], b: [18.58, 5.63], side: 'L', t: T.partition, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  { id: 'P-tv-back', group: 'interior', name: 'TV ნიშის უკანა კედელი (320 მმ ჩაღრმავება)', a: [18.48, 5.53], b: [18.48, 9.53], side: 'L', t: T.partition, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  { id: 'P-tv-jog2', group: 'interior', name: 'ტიხარი (TV ნიშის ქვედა ბოლო)', a: [P.tvWallX, 9.43], b: [18.58, 9.43], side: 'R', t: T.partition, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  { id: 'P-tv-low', group: 'interior', name: 'ტიხარი (დრონები / კამერები)', a: [P.tvWallX, 9.43], b: [P.tvWallX, 11.71], side: 'L', t: T.partition, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  { id: 'P-storage-s', group: 'interior', name: 'საწყობის კედელი (დერეფნის მხარე)', a: [18.26, 11.71], b: [cz(11.66) + 0.02, 11.71], side: 'L', t: T.partition, h: H.partition, mat: 'partition',
    openings: [{ s0: 0, s1: 1.00, y0: 0, y1: H.door, label: 'კარი 90 სმ (დამალული)' }], status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  { id: 'P-staff-n', group: 'interior', name: 'პერსონალის ოთახის კედელი (დერეფნის მხარე)', a: [18.26, 12.81], b: [cz(12.86) + 0.02, 12.81], side: 'R', t: T.partition, h: H.partition, mat: 'partition',
    openings: [
      { s0: 0, s1: 1.00, y0: 0, y1: H.door, label: 'კარი 90 სმ (დამალული)' },
      { s0: 1.49, s1: 2.03, y0: 0.97, y1: 1.62, label: 'სახანძრო ჰიდრანტის ნიშა 540' },
    ], status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  { id: 'P-banks', group: 'interior', name: 'ბანკების კედელი', a: [P.tvWallX, 12.81], b: [P.tvWallX, P.bottomZ], side: 'L', t: T.partition, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'pdf' } },
  // ჰიდრანტის ნიშის ყუთი (პერსონალის ოთახის მხარეს, ZGMP-07: 390 | 740 | 70, სიღრმე 250)
  { id: 'P-niche-l', group: 'interior', name: 'ჰიდრანტის ნიშის ყუთი', a: [19.65, 12.91], b: [19.65, 13.06], side: 'L', t: 0.10, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'measured' } },
  { id: 'P-niche-r', group: 'interior', name: 'ჰიდრანტის ნიშის ყუთი', a: [20.39, 12.91], b: [20.39, 13.06], side: 'R', t: 0.10, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'measured' } },
  { id: 'P-niche-b', group: 'interior', name: 'ჰიდრანტის ნიშის ყუთი', a: [19.65, 13.06], b: [20.39, 13.06], side: 'L', t: 0.05, h: H.partition, mat: 'partition',
    status: { len: 'pdf', h: 'assumed', t: 'measured' } },
  // სვეტის „ჩაკეტვა“ კედლამდე (ZGMP-07: 480 + 480, ზედა მარჯვენა სვეტი)
  { id: 'P-colfin-1', group: 'interior', name: 'სვეტის მოპირკეთება კედლამდე', a: [11.43, 2.43], b: [P.returnX, 2.43], side: 'R', t: 0.05, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'measured' } },
  { id: 'P-colfin-2', group: 'interior', name: 'სვეტის მოპირკეთება კედლამდე', a: [11.43, 3.12], b: [P.returnX, 3.12], side: 'L', t: 0.05, h: H.partition, mat: 'partition', status: { len: 'pdf', h: 'assumed', t: 'measured' } },
];

// ჰიდრანტის ნიშის ზედა/ქვედა შევსება (ნიშის ღიობი 0.97–1.62 მ)
export const BOXES_INTERIOR = [
  { id: 'P-niche-fill-lo', name: 'ჰიდრანტის ნიშის ქვედა ნაწილი', x: [19.75, 20.29], z: [12.91, 13.01], y: [0, 0.97], mat: 'partition', status: 'measured' },
  { id: 'P-niche-fill-hi', name: 'ჰიდრანტის ნიშის ზედა ნაწილი', x: [19.75, 20.29], z: [12.91, 13.01], y: [1.62, H.partition], mat: 'partition', status: 'measured' },
  // თაბაშირმუყაოს ყუთი კუთხეში (ZGMP-07: 480 × 530, 70 მმ კედლიდან)
  { id: 'P-box', name: 'თაბაშირმუყაოს ყუთი 480×530 (ჭკვიანი სახლის კუთხე)', x: [11.36, 11.84], z: [4.23, 4.76], y: [0, H.partition], mat: 'partition', status: 'pdf' },
];

// ბანკების კედლის ფერადი პანელები (ZGMP-07/08: 60|760|100|760|100|760|100|760|60; Z-WP-7/4/2/3)
const bankZ0 = 12.81 + 0.06;
export const BANK_BAYS = ['ral5022', 'ral4005', 'ral6034', 'ral4009'].map((mat, i) => ({
  i, mat, z: [bankZ0 + i * 0.86, bankZ0 + i * 0.86 + 0.76],
  wall: ['Z-WP-7', 'Z-WP-4', 'Z-WP-2', 'Z-WP-3'][i],
  floor: ['Z-FL-06', 'Z-FL-04', 'Z-FL-02', 'Z-FL-03'][i],
}));

// კედლის შეღებვები (ZGMP-08). Z-WP-6 — ჭკვიანი სახლის კედელი RAL 1016, 11 მ²
// (სიგანე ≈2390 გაზომილია განშლიდან). ეკუთვნის გარე კედლის ჯგუფს.
export const WALL_FINISHES = [
  { id: 'WP-6', group: 'exterior', name: 'კედლის შეღებვა Z-WP-6 RAL 1016 (11 მ²)', x: [11.84, 14.23], z: [P.stepZ, P.stepZ + 0.01], y: [0, H.ceiling], mat: 'ral1016', status: 'measured' },
  ...BANK_BAYS.map((b) => ({
    id: `WP-bank-${b.i + 1}`, group: 'interior', name: `ბანკის კედლის ვინილი ${b.wall} ${COLORS[b.mat].name} (3.2 მ²)`,
    x: [P.tvWallX - 0.05, P.tvWallX], z: b.z, y: [0, H.ceiling], mat: b.mat, status: 'pdf',
  })),
];

// ---------------------------------------------------------------------
//  ვიტრაჟი / ფასადები (ჯგუფი: exterior)
// ---------------------------------------------------------------------
export const GLAZING = [
  { id: 'G-A1', name: 'ვიტრაჟი A — 3700 (H3000)', axis: 'x', at: -0.05, from: P.aGlass1[0], to: P.aGlass1[1], status: 'pdf' },
  { id: 'G-A2', name: 'ვიტრაჟი A — 5350 (H3000)', axis: 'x', at: -0.05, from: P.aGlass2[0], to: P.aGlass2[1], status: 'pdf' },
  { id: 'G-B1', name: 'ვიტრაჟი B — 6400 (H3000)', axis: 'z', at: -0.05, from: P.bGlass1[0], to: P.bGlass1[1], status: 'pdf' },
  { id: 'G-B2', name: 'ვიტრაჟი B — 7380 (H3000)', axis: 'z', at: -0.05, from: P.bGlass2[0], to: P.bGlass2[1], status: 'pdf' },
];
export const ENTRANCES = [
  { id: 'E-A', name: 'შესასვლელი A — 2000', axis: 'x', from: P.aDoor[0], to: P.aDoor[1], status: 'pdf' },
  { id: 'E-B', name: 'შესასვლელი B — 2500', axis: 'z', from: P.bDoor[0], to: P.bDoor[1], status: 'pdf' },
];
// ვიტრაჟის ზემოთ — კედელი 3.00 → 4.50; გარეთ — ნარინჯისფერი ზოლი 3.00 → 3.80
export const FACADE = {
  corner: { x: [-0.10, 0], z: [-0.10, 0] },
  bulkheadA: { x: [-0.10, P.aSolid[0]], z: [-0.10, 0] },
  bulkheadB: { x: [-0.10, 0], z: [0, P.bottomZ] },
  bandA: { x: [-0.15, P.returnX + T.extWall], z: [-0.10 - T.signBand, -0.10], len: 'pdf (12210)' },
  bandB: { x: [-0.10 - T.signBand, -0.10], z: [-0.15, P.bottomZ + T.extWall], len: 'pdf (16600)' },
  jamb: 0.05, // assumed — ვიტრაჟის ბოლოების ალუმინის პროფილი
};

// ---------------------------------------------------------------------
//  კარები (ტიხრის/კედლის ღიობებში)
// ---------------------------------------------------------------------
export const DOORS = [
  { id: 'D-storage', group: 'interior', name: 'საწყობის კარი 90 სმ (დამალული)', axis: 'x', at: 11.66, from: 18.31, to: 19.21, h: H.door, status: { w: 'pdf', h: 'assumed' } },
  { id: 'D-staff', group: 'interior', name: 'პერსონალის ოთახის კარი 90 სმ (დამალული)', axis: 'x', at: 12.86, from: 18.31, to: 19.21, h: H.door, status: { w: 'pdf', h: 'assumed' } },
  { id: 'D-exit', group: 'exterior', name: 'დერეფნის გასასვლელი კარი', axis: 'z', at: null, from: 11.76, to: 12.76, h: H.door, status: { w: 'assumed', h: 'assumed' } },
];

// ---------------------------------------------------------------------
//  სვეტები (ჯგუფი: structure — მიმაგრებულია იატაკზე, არ იმალება)
// ---------------------------------------------------------------------
export const COLUMNS = [
  { id: 'C-1', name: 'სვეტი 690×690 მოპირკეთებით 1000×690', x: [2.073, 3.073], z: [2.454, 3.146], status: 'pdf' },
  { id: 'C-2', name: 'სვეტი 690×690', x: [10.74, 11.43], z: [2.43, 3.12], status: 'pdf' },
  { id: 'C-3', name: 'სვეტი 690×690', x: [2.254, 2.944], z: [10.945, 11.635], status: 'measured' },
  { id: 'C-4', name: 'სვეტი 690×690 (სალაროსთან)', x: [10.749, 11.439], z: [10.943, 11.633], status: 'measured' },
  { id: 'C-5', name: 'სვეტი 690×690 (საწყობში)', x: [19.255, 19.945], z: [10.945, 11.635], status: 'pdf' },
  { id: 'C-6', name: 'მცირე შვერილი ≈160×160 (ფუნქცია დაუზუსტებელი)', x: [20.37, 20.53], z: [6.92, 7.08], status: 'measured' },
  { id: 'C-7', name: 'მცირე შვერილი ≈160×160 (ფუნქცია დაუზუსტებელი)', x: [20.285, 20.445], z: [11.17, 11.33], status: 'measured' },
  { id: 'C-8', name: 'მცირე შვერილი ≈160×160 (ფუნქცია დაუზუსტებელი)', x: [20.215, 20.375], z: [15.45, 15.61], status: 'measured' },
];

// ---------------------------------------------------------------------
//  იატაკი და ფერადი ვინილის ჩანართები (ZGMP-09)
//  path: ['M',x,z] ['L',x,z] ['A',cx,cz,r,a0,a1]  (კუთხე გრადუსებში,
//  იზომება +X-დან +Z-ისკენ; a1>a0 — საათის ისრის მიმართულებით გეგმაზე)
// ---------------------------------------------------------------------
export const FLOOR_OUTLINE = [
  [-0.10, -0.10], [P.returnX + T.extWall, -0.10], [P.returnX + T.extWall, P.stepZ - T.extWall],
  [P.concreteA[0] + T.concrete, P.stepZ - T.extWall], [P.concreteB[0] + T.concrete, P.bottomZ + T.extWall], [-0.10, P.bottomZ + T.extWall],
];
// შიდა კონტური (ჭერისთვის): 266.9 + 14.7 + 7.1 + 2.5 ≈ 290 მ² (pdf, ZGMP-12)
export const CEILING_OUTLINE = [
  [0, 0], [P.returnX, 0], [P.returnX, P.stepZ], [concreteXAt(P.stepZ), P.stepZ], [concreteXAt(P.bottomZ), P.bottomZ], [0, P.bottomZ],
];

export const INLAYS = [
  { id: 'FL-06-gaming', code: 'Z-FL-06', name: 'გეიმინგ ზონის ვინილი RAL 5022 (8.75 მ²)', mat: 'ral5022', status: 'pdf',
    // R1340 და R2230 რკალები (pdf), ცენტრები — ნახაზიდან
    path: [['M', 0, 0], ['L', 1.47, 0], ['A', 2.30, 1.05, 1.34, 231.7, 127.6], ['A', -0.16, 3.62, 2.23, -42.6, 85.9], ['L', 0, 0]] },
  { id: 'FL-02-sports', code: 'Z-FL-02', name: 'სპორტული კუთხის ვინილი RAL 6034 (3.03 მ²)', mat: 'ral6034', status: 'pdf',
    path: [['M', 0, 9.103], ['A', 0.232, 10.331, 1.25, -100.7, 100.7], ['L', 0, 9.103]] },
  { id: 'FL-07-smart', code: 'Z-FL-07', name: 'ჭკვიანი სახლის ვინილი RAL 1016 (5.12 მ²)', mat: 'ral1016', status: 'pdf',
    path: [['M', 11.845, P.stepZ], ['L', 14.178, P.stepZ], ['L', 14.178, 5.53], ['A', 13.0115, 5.53, 1.1665, 0, 180], ['L', 11.845, P.stepZ]] },
  { id: 'FL-05-tv', code: 'Z-FL-05', name: 'TV ზონის ვინილი RAL 7015 (9.84 მ²)', mat: 'ral7015', status: 'pdf',
    path: [['M', 18.16, 5.454], ['L', 17.711, 5.454], ['A', 17.711, 7.529, 2.075, -90, -270], ['L', 18.16, 9.604], ['L', 18.16, 9.38], ['L', 18.48, 9.38], ['L', 18.48, 5.68], ['L', 18.16, 5.68], ['L', 18.16, 5.454]] },
  ...BANK_BAYS.map((b) => ({
    id: `FL-bank-${b.i + 1}`, code: b.floor, name: `ბანკის ჯიხურის ვინილი ${COLORS[b.mat].name} (2.0 მ²)`, mat: b.mat, status: 'pdf',
    path: [['M', 15.60, b.z[0]], ['L', 18.10, b.z[0]], ['L', 18.10, b.z[1]], ['L', 15.60, b.z[1]], ['L', 15.60, b.z[0]]],
  })),
];

// ---------------------------------------------------------------------
//  ავეჯი (ZGMP-05 / ZGMP-06).  x,z — ცენტრი; w — სიგანე (ადგილობრივი X),
//  d — სიღრმე (ადგილობრივი Z, „წინა“ მხარე +Z-ისკენ); rot — მობრუნება
//  გრადუსებში Y ღერძის გარშემო (0: წინა მხარე +Z; 90: +X; 180: −Z; −90: −X;
//  45: გრძელი ღერძი „/“ მიმართულებით გეგმაზე).
//  st: { w, d, h, pos } — ზომის სტატუსები.
// ---------------------------------------------------------------------
const HU = 2.05;  // measured — კედლის ვიტრინის სიმაღლე განშლებიდან (ZGMP-08) ≈2050
const HT = 0.90;  // measured — მაგიდის სიმაღლე განშლიდან ≈900
const unitSt = { w: 'pdf', d: 'pdf', h: 'measured', pos: 'pdf' };

function row(code, label, zone, type, opts, centers) {
  return centers.map((c, i) => ({ code, name: label, zone, type, ...opts, ...(typeof c === 'number' ? { [opts.axis === 'z' ? 'z' : 'x']: c } : c), idx: i + 1, n: centers.length }));
}

export const FURNITURE = [
  // ===== ფასადი A-ს გასწვრივ (400 მმ მინიდან, სიღრმე 450) =====
  ...row('ZF-01-6', 'კედლის ვიტრინა — პლანშეტები (tabs)', 'ფასადი A', 'unit',
    { axis: 'x', z: 0.625, w: 1.0, d: 0.45, h: HU, rot: 0, pipe: true, color: 'furnOrange', st: unitSt }, [1.88, 2.88]),
  ...row('ZF-01-6', 'კედლის ვიტრინა — IT', 'ფასადი A', 'unit',
    { axis: 'x', z: 0.625, w: 1.0, d: 0.45, h: HU, rot: 0, pipe: true, color: 'furnOrange', st: unitSt }, [6.85, 7.85, 8.85, 9.85]),

  // ===== გეიმინგ ზონა (ფასადი B, ზედა) =====
  ...row('ZF-01-5A', 'გეიმინგ ვიტრინა — PlayStation (ps)', 'გეიმინგ ზონა', 'unit',
    { axis: 'z', x: 0.645, w: 1.0, d: 0.49, h: HU, rot: 90, pipe: true, color: 'furnPurple', st: unitSt }, [2.09, 3.09, 4.09, 5.09])
    .map((u, i) => ({ ...u, code: ['ZF-01-5A-1', 'ZF-01-5A', 'ZF-01-5A', 'ZF-01-B'][i] })),
  { code: 'ZF-15-3', name: 'PlayStation-ის სიმბოლოების ტოტემი', zone: 'გეიმინგ ზონა', type: 'totem', x: 0.61, z: 0.65, w: 0.47, d: 0.47, h: 2.40, rot: 45,
    st: { w: 'measured', d: 'measured', h: 'assumed', pos: 'pdf' } },

  // ===== სვეტი C-1 =====
  { code: 'ZF-01-7', name: 'სმარტ საათების ვიტრინა (sm.watch)', zone: 'სვეტი C-1', type: 'unit', x: 2.573, z: 3.321, w: 1.0, d: 0.35, h: HU, rot: 0, color: 'furnOrange',
    st: { w: 'pdf', d: 'measured', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-09-2', name: '„check“ სადგამი', zone: 'გეიმინგ ზონა', type: 'pedestal', x: 2.797, z: 5.466, w: 0.70, d: 0.70, h: 1.0,
    st: { w: 'measured', d: 'measured', h: 'measured', pos: 'pdf' } },

  // ===== კომპიუტერები (comps) =====
  ...row('ZF-03-2', 'მაგიდა — კომპიუტერები (comps)', 'დარბაზი', 'table',
    { axis: 'x', z: 2.95, w: 1.0, d: 2.0, h: HT, rot: 0, st: { w: 'pdf', d: 'pdf', h: 'measured', pos: 'pdf' } }, [5.943, 8.343]),
  { code: 'ZF-03-3', name: 'მაგიდა — კომპიუტერები (comps)', zone: 'დარბაზი', type: 'table', x: 7.14, z: 5.85, w: 2.5, d: 1.0, h: HT, rot: 0,
    st: { w: 'measured', d: 'pdf', h: 'measured', pos: 'pdf' } },

  // ===== ზედა მარჯვენა კუთხე =====
  { code: 'ZF-16-1', name: 'აქსესუარების კედელი (acc x2)', zone: 'დარბაზი', type: 'peg', x: 11.745, z: 1.38, w: 2.0, d: 0.33, h: HU, rot: -90,
    st: { w: 'pdf', d: 'measured', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-09-1', name: '„check“ სადგამი სვეტთან', zone: 'სვეტი C-2', type: 'pedestal', x: 10.656, z: 2.77, w: 0.80, d: 0.80, h: 1.0,
    st: { w: 'measured', d: 'measured', h: 'measured', pos: 'measured' } },
  { code: 'ZF-01-1', name: 'კედლის ვიტრინა — სმარტ მოწყობილობები (smart)', zone: 'დარბაზი', type: 'unit', x: 11.735, z: 3.71, w: 1.0, d: 0.35, h: HU, rot: -90, color: 'furnOrange',
    st: { w: 'measured', d: 'pdf', h: 'measured', pos: 'measured' } },

  // ===== ჭკვიანი სახლი =====
  { code: 'ZF-12-1', name: 'სმარტ მოწყობილობების სადგამები', zone: 'ჭკვიანი სახლი', type: 'stands', x: 11.205, z: 4.625, w: 0.27, d: 0.73, h: 1.40, rot: 0,
    st: { w: 'measured', d: 'measured', h: 'measured', pos: 'measured' } },
  { code: 'ZF-18', name: 'ჭკვიანი სახლის კედელი (სახლის ფორმის პანელი)', zone: 'ჭკვიანი სახლი', type: 'smartHome', x: 13.0115, z: 4.60, w: 2.333, d: 0.54, h: 2.58, eave: 1.84, rot: 0,
    st: { w: 'pdf', d: 'measured', h: 'measured', pos: 'pdf' } },
  { code: 'ZF-14-3', name: 'მრგვალი სადგამი (ჭკვიანი სახლი)', zone: 'ჭკვიანი სახლი', type: 'pedestal', x: 12.467, z: 6.213, w: 0.70, d: 0.70, h: 0.90, color: 'ral1016',
    st: { w: 'measured', d: 'measured', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-03-1', name: 'მაგიდა — ჭკვიანი სახლი', zone: 'დარბაზი', type: 'table', x: 13.67, z: 8.13, w: 2.0, d: 1.0, h: HT, rot: 45,
    st: { w: 'measured', d: 'measured', h: 'measured', pos: 'pdf' } },
  ...row('ZF-01-1', 'კედლის ვიტრინა — სმარტ მოწყობილობები (smart x3)', 'დარბაზი', 'unit',
    { axis: 'x', z: 4.505, w: 1.0, d: 0.35, h: HU, rot: 0, color: 'furnOrange', st: unitSt }, [14.932, 15.932, 16.932]),

  // ===== TV ზონა =====
  { code: 'ZF-06', name: 'TV კედელი (დეტალები სავარაუდო — იხ. ავეჯის კრებული)', zone: 'TV ზონა', type: 'tvWall', x: 18.33, z: 7.53, w: 3.70, d: 0.30, h: H.ceiling, rot: -90,
    st: { w: 'pdf', d: 'pdf', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-07', name: 'პუფი (TV ზონა)', zone: 'TV ზონა', type: 'pouf', x: 16.25, z: 8.01, w: 0.78, d: 0.78, h: 0.45, st: { w: 'measured', d: 'measured', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-07', name: 'პუფი (TV ზონა)', zone: 'TV ზონა', type: 'pouf', x: 16.72, z: 8.65, w: 0.78, d: 0.78, h: 0.45, st: { w: 'measured', d: 'measured', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-09-2', name: '„check“ სადგამი', zone: 'TV ზონა', type: 'pedestal', x: 16.66, z: 6.18, w: 0.70, d: 0.70, h: 1.0, st: { w: 'measured', d: 'measured', h: 'measured', pos: 'pdf' } },
  { code: 'ZF-02', name: '„O“ ვიტრინა (გეგმაზე აღნიშნულია „O“)', zone: 'დარბაზი', type: 'display', x: 15.42, z: 10.463, w: 1.93, d: 0.34, h: 1.0, rot: -45,
    st: { w: 'measured', d: 'measured', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-01-1', name: 'კედლის ვიტრინა — დრონები (drones)', zone: 'დარბაზი', type: 'unit', x: 17.985, z: 10.16, w: 1.0, d: 0.35, h: HU, rot: -90, color: 'furnOrange', st: unitSt },
  { code: 'ZF-01-1', name: 'კედლის ვიტრინა — კამერები (cams)', zone: 'დარბაზი', type: 'unit', x: 17.985, z: 11.16, w: 1.0, d: 0.35, h: HU, rot: -90, color: 'furnOrange', st: unitSt },

  // ===== სალარო და ცენტრი =====
  { code: 'ZF-08', name: 'სალარო (წრიული დახლი)', zone: 'სალარო', type: 'ring', x: 9.621, z: 10.15, rOut: 1.94, rIn: 1.506, rInner: 1.15, a0: 50, a1: 387, h: 1.10, hInner: 0.75,
    st: { w: 'measured', d: 'measured', h: 'measured', pos: 'measured' } },
  { code: 'ZF-09-2', name: '„check“ სადგამი', zone: 'დარბაზი', type: 'pedestal', x: 13.386, z: 11.596, w: 0.70, d: 0.70, h: 1.0, st: { w: 'measured', d: 'measured', h: 'measured', pos: 'pdf' } },
  { code: 'ZF-10-2', name: 'აუდიო სისტემის მაგიდა (audio)', zone: 'დარბაზი', type: 'audio', x: 4.943, z: 10.265, w: 1.08, d: 1.62, h: HT, rot: 0,
    st: { w: 'pdf', d: 'pdf', h: 'assumed', pos: 'pdf' } },
  { code: 'ZF-09-1', name: '„check“ სადგამი სვეტთან', zone: 'სვეტი C-3', type: 'pedestal', x: 2.599, z: 10.919, w: 1.0, d: 1.0, h: 1.0,
    st: { w: 'measured', d: 'measured', h: 'measured', pos: 'measured' } },

  // ===== სპორტული კუთხე (ფასადი B) =====
  { code: 'ZF-15-2', name: 'სპორტული კუთხე — პალმის ფორმის დეკორი', zone: 'სპორტული კუთხე', type: 'palm', x: 0.395, z: 9.72, w: 0.31, d: 1.36, h: 2.60, rot: 0,
    st: { w: 'measured', d: 'measured', h: 'measured', pos: 'pdf' } },

  // ===== მობილურები (ფასადი B, ქვედა) =====
  ...row('ZF-01-6', 'კედლის ვიტრინა — მობილურები (mobs x4)', 'ფასადი B', 'unit',
    { axis: 'z', x: 0.625, w: 1.0, d: 0.45, h: HU, rot: 90, pipe: true, color: 'furnOrange', st: unitSt }, [12.19, 13.19, 14.19, 15.19]),
  ...row('ZF-03-1', 'მაგიდა — მობილურები (mobs)', 'დარბაზი', 'table',
    { axis: 'x', z: 13.73, w: 1.0, d: 2.0, h: HT, rot: 0, st: { w: 'pdf', d: 'pdf', h: 'measured', pos: 'pdf' } }, [2.73, 4.93, 7.13]),
  ...row('ZF-04', 'აქსესუარების სადგამი (acc x4)', 'დარბაზი', 'gondola',
    { axis: 'x', z: 13.936, w: 1.95, d: 0.38, h: 1.80, rot: 45, st: { w: 'measured', d: 'measured', h: 'assumed', pos: 'pdf' } }, [10.346, 13.236]),

  // ===== ქვედა კედელი (სიღრმე 350, წინა მხარე −Z) =====
  ...row('ZF-01-1', 'კედლის ვიტრინა — მობილურები (mobs x3)', 'ქვედა კედელი', 'unit',
    { axis: 'x', z: 16.105, w: 1.0, d: 0.35, h: HU, rot: 180, color: 'furnOrange', st: unitSt }, [1.34, 2.34, 3.34]),
  { code: 'ZF-16-1', name: 'აქსესუარების კედელი (acc x2)', zone: 'ქვედა კედელი', type: 'peg', x: 4.84, z: 16.105, w: 2.0, d: 0.35, h: HU, rot: 180, st: unitSt },
  ...row('ZF-01-1', 'კედლის ვიტრინა — მობილურები (mobs x4)', 'ქვედა კედელი', 'unit',
    { axis: 'x', z: 16.105, w: 1.0, d: 0.35, h: HU, rot: 180, color: 'furnOrange', st: unitSt }, [6.34, 7.34, 8.34, 9.34]),
  { code: 'ZF-16-2', name: 'აქსესუარების კედელი (acc x3)', zone: 'ქვედა კედელი', type: 'peg', x: 11.34, z: 16.105, w: 3.0, d: 0.35, h: HU, rot: 180, st: unitSt },
  ...row('ZF-01-1', 'კედლის ვიტრინა — მობილურები (mobs x2)', 'ქვედა კედელი', 'unit',
    { axis: 'x', z: 16.105, w: 1.0, d: 0.35, h: HU, rot: 180, color: 'furnOrange', st: unitSt }, [13.34, 14.34]),

  // ===== ბანკები (ZF-05-2: მაგიდა 800×700, 1100 კედლამდე) =====
  ...BANK_BAYS.map((b) => ({
    code: 'ZF-05-2', name: `ბანკის მაგიდა ${b.i + 1} (banks)`, zone: 'ბანკები', type: 'bankDesk', x: 16.66, z: (b.z[0] + b.z[1]) / 2, w: 0.80, d: 0.70, h: 0.75, rot: 0,
    st: { w: 'pdf', d: 'pdf', h: 'assumed', pos: 'pdf' },
  })),
];

// ---------------------------------------------------------------------
//  ოთახების დასახელებები (pdf, ZGMP-05)
// ---------------------------------------------------------------------
export const ROOMS = [
  { name: 'დარბაზი', area: '266.9 მ²', x: 6.2, z: 8.3 },
  { name: 'საწყობი', area: '14.7 მ²', x: 19.75, z: 6.4 },
  { name: 'პერს. ოთახი', area: '7.1 მ²', x: 19.4, z: 14.7 },
  { name: 'დერეფანი', area: '2.5 მ²', x: 19.75, z: 12.26 },
];

// ---------------------------------------------------------------------
//  ზომების ხაზები (status: 'pdf' — მითითებული, სხვა — სავარაუდო/გაზომილი)
//  a,b — წერტილები [x,z]; y — სიმაღლე; off — დაშორება [dx,dz]
// ---------------------------------------------------------------------
export const DIMENSIONS = [
  // ფასადი A
  { a: [0, 0], b: [3.70, 0], off: [0, -0.9], text: '3700', status: 'pdf' },
  { a: [3.70, 0], b: [5.70, 0], off: [0, -0.9], text: '2000 (შესასვლ.)', status: 'pdf' },
  { a: [5.70, 0], b: [11.05, 0], off: [0, -0.9], text: '5350', status: 'pdf' },
  { a: [11.05, 0], b: [11.91, 0], off: [0, -0.9], text: '860', status: 'pdf' },
  { a: [0, 0], b: [11.91, 0], off: [0, -1.7], text: '11910', status: 'pdf' },
  // ფასადი B
  { a: [0, 0], b: [0, 6.40], off: [-0.9, 0], text: '6400', status: 'pdf' },
  { a: [0, 6.40], b: [0, 8.90], off: [-0.9, 0], text: '2500 (შესასვლ.)', status: 'pdf' },
  { a: [0, 8.90], b: [0, 16.28], off: [-0.9, 0], text: '7380', status: 'pdf' },
  { a: [0, 0], b: [0, 16.28], off: [-1.7, 0], text: '16280', status: 'pdf' },
  // ქვედა
  { a: [0, 16.28], b: [18.16, 16.28], off: [0, 0.9], text: '18160 (H4500)', status: 'pdf' },
  { a: [18.26, 16.28], b: [20.42, 16.28], off: [0, 0.9], text: '2160', status: 'pdf' },
  { a: [0, 16.28], b: [20.42, 16.28], off: [0, 1.7], text: '20420 (ჯამი)', status: 'pdf' },
  // მარჯვენა ნაწილი
  { a: [11.91, 0], b: [11.91, 4.33], off: [0.9, 0], text: '4330', status: 'pdf' },
  { a: [11.91, 4.33], b: [18.16, 4.33], off: [0, -0.7], text: '6250', status: 'pdf' },
  { a: [18.26, 5.16], b: [20.58, 5.16], off: [0, 0], text: '2320 (საწყობი)', status: 'pdf' },
  { a: [18.9, 4.33], b: [18.9, 11.71], off: [0, 0], text: '7380 (ტიხარი)', status: 'pdf' },
  { a: [18.16, 5.63], b: [18.16, 9.43], off: [-0.35, 0], text: '3800 (TV ნიშა, 320 სიღრმე)', status: 'pdf' },
  { a: [18.7, 11.71], b: [18.7, 12.81], off: [0, 0], text: '1100', status: 'pdf' },
  { a: [17.9, 12.81], b: [17.9, 16.28], off: [0, 0], text: '3460 (ბანკები)', status: 'pdf' },
  { a: [20.59, 4.33], b: [20.42, 16.28], off: [0.9, 0], text: '≈11950 (ბეტონის კედელი)', status: 'measured' },
  // შიდა ძირითადი ზომები
  { a: [3.073, 3.6], b: [5.443, 3.6], off: [0, 0], text: '2370', status: 'pdf' },
  { a: [6.443, 3.6], b: [7.843, 3.6], off: [0, 0], text: '1400', status: 'pdf' },
  { a: [8.843, 3.6], b: [10.74, 3.6], off: [0, 0], text: '1900', status: 'pdf' },
  { a: [3.23, 12.4], b: [4.43, 12.4], off: [0, 0], text: '1200', status: 'pdf' },
  { a: [5.43, 12.4], b: [6.63, 12.4], off: [0, 0], text: '1200', status: 'pdf' },
  { a: [0.85, 12.4], b: [2.23, 12.4], off: [0, 0], text: '1380', status: 'pdf' },
  { a: [16.26, 12.6], b: [17.06, 12.6], off: [0, 0], text: '800', status: 'pdf' },
  { a: [17.06, 12.6], b: [18.16, 12.6], off: [0, 0], text: '1100', status: 'pdf' },
  { a: [7.681, 10.15], b: [11.561, 10.15], off: [0, 0], y: 1.25, text: '≈Ø3880 (სალარო)', status: 'measured' },
  // სიმაღლეები (ვერტიკალური)
  { a: [-0.6, -0.6], b: [-0.6, -0.6], v: [0, 3.0], text: '3000 (ვიტრაჟი)', status: 'pdf' },
  { a: [-1.2, -1.2], b: [-1.2, -1.2], v: [0, 4.1], text: '4100 (ჭერი)', status: 'pdf' },
  { a: [-0.6, -0.6], b: [-0.6, -0.6], v: [3.0, 3.8], text: '800 (ზოლი)', status: 'pdf' },
  { a: [-0.3, 16.9], b: [-0.3, 16.9], v: [0, 4.5], text: '4500 (H4500)', status: 'pdf' },
  { a: [1.88, 0.95], b: [1.88, 0.95], v: [0, HU], text: '≈2050 (ვიტრინა)', status: 'measured' },
];
