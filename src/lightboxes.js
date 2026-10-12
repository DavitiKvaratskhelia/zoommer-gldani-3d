// ---------------------------------------------------------------------
//  ლაითბოქსები და ჭერის ნავიგაცია — კონფიგურაცია (ყველა ზომა მმ-ში)
//  წყაროები:
//   • „ZGMF - ავეჯი - Update 2.pdf“: გვ. 29 (ჭერის გეგმა), 30–32 (ZF-19, ZGMF-27/28/29), 33 (ZF-20, ZGMF-30)
//   • „გლდანი - სითი მოლი Lightboxes.pdf“: გვ. 2–5 (კედლის), 6–10 (ვერტიკალური) — სარეკლამო გამოსახულებები
//   • „ZGMP - გეგმები - Update 6.pdf“ გვ. 12 (ZGMP-11, PL-07-2) — ნავიგაციის ადგილები და ორიენტაცია
//  ტექსტურები: src/assets/lightbox-textures.js (იქმნება tools/make-lightbox-textures.mjs-ით).
// ---------------------------------------------------------------------

// ---- RAL / NCS ფერები (ეკრანზე მიახლოებითი; კოდი ინახება მასალის მონაცემებში) ----
export const NAV_RAL = {
  2003: '#f67828', 7016: '#383e42', 5022: '#222d5a', 6034: '#7fb5b5', 1016: '#f1dd38', 4005: '#76689a', 4009: '#a18594',
};

// ---- ZF-20-1 / ZF-20-2 — კედლის ჰორიზონტალური ლაითბოქსები (ZGMF-30) ----
// კორპუსი 120 მმ სიღრმის, კანტი RAL 2003; ქვედა ნიშნული — ვიტრინის თავს (2050) + 150 = 2200, სიმაღლე 800.
// wall: 'z'|'x' — კედლის სიბრტყე; at — სიბრტყის კოორდინატა (მ); n — კედლიდან დარბაზისკენ (+1/−1);
// from/to — კიდეები კედლის გასწვრივ (მ). tex — ტექსტურის id. ზედა სია — მარცხნიდან მარჯვნივ, როგორც ნახაზზე.
const BOTTOM = (k) => [0.84 + k * 1.83, 0.84 + k * 1.83 + 1.8];
export const WALL_LIGHTBOXES = [
  // გვ. 2 — მობილურების ზონა, ქვედა კედელი: 840 | 8 × 1800 (შუალედი 30) | 2650 + 60 (ZGMF-30 ზედხედი 1; ჭერის გეგმა: 840 | 14610 | 2710)
  ...[
    ['h_xiaomi_pad', 'Xiaomi Pad 7 Pro'], ['h_nothing', 'Nothing Phone 3'], ['h_pixel', 'Pixel 10 / 10 Pro / 10 Pro XL'], ['h_accessories', 'Accessories'],
    ['h_apple_watch', 'Apple Watch'], ['h_iphone17', 'iPhone 17'], ['h_iphone_air', 'iPhone Air'], ['h_iphone17pro', 'iPhone 17 Pro / 17 Pro Max'],
  ].map(([tex, title], i) => ({
    id: `LB-H-MOB-${i + 1}`, code: 'ZF-20-1', zone: 'მობილურები (ქვედა კედელი)', title, tex,
    wall: 'z', at: 16.28, n: -1, span: BOTTOM(7 - i), y0: 2.2, w: 1800, h: 800, d: 120,
    drawings: ['f33', 'l02', 'f29'], pos: 'pdf',
  })),
  // გვ. 3 — სმარტის ზონა: 330 | 1400 | 30 | 1400 | 820 (კედელი z = 4.33, TV ტიხრამდე 820)
  { id: 'LB-H-SMART-1', code: 'ZF-20-2', zone: 'სმარტი', title: 'Xiaomi Robot Vacuum Cleaner', tex: 'h_robot',
    wall: 'z', at: 4.33, n: 1, span: [14.51, 15.91], y0: 2.2, w: 1400, h: 800, d: 120, drawings: ['f33', 'l03', 'f29'], pos: 'pdf' },
  { id: 'LB-H-SMART-2', code: 'ZF-20-2', zone: 'სმარტი', title: 'Smart Home', tex: 'h_smarthome',
    wall: 'z', at: 4.33, n: 1, span: [15.94, 17.34], y0: 2.2, w: 1400, h: 800, d: 120, drawings: ['f33', 'l03', 'f29'], pos: 'pdf' },
  // გვ. 4 — აიტი ტექნიკა: 480 | 1800 | 160 (გამოწეული კედელი x = 11.91, სვეტის მოპირკეთებამდე 160)
  { id: 'LB-H-IT-1', code: 'ZF-20-1', zone: 'აიტი ტექნიკა', title: 'Laptop Bags', tex: 'h_laptop_bags',
    wall: 'x', at: 11.91, n: -1, span: [0.48, 2.28], y0: 2.2, w: 1800, h: 800, d: 120, drawings: ['f33', 'l04', 'f29'], pos: 'pdf' },
  // გვ. 5 — ტელევიზორების სივრცე: 150 | 1800 | 150 (ტიხარი x = 18.16, დრონების/კამერების ვიტრინების თავზე)
  { id: 'LB-H-TV-1', code: 'ZF-20-1', zone: 'ტელევიზორების სივრცე', title: 'Xiaomi Projectors', tex: 'h_projectors',
    wall: 'x', at: 18.16, n: -1, span: [9.76, 11.56], y0: 2.2, w: 1800, h: 800, d: 120, drawings: ['f33', 'l05', 'f29'], pos: 'measured',
    note: '150 | 1800 | 150-ის ათვლის ხაზი ნახაზზე ცალსახად არ ჩანს — პანელი ცენტრირებულია ქვემოთ მდგარ ორ ვიტრინაზე (≈ ±70 მმ)' },
];

// ---- ვერტიკალური ლაითბოქსები ავეჯზე (ZF-01-6 და PlayStation-ის ვიტრინების უკანა მხარე) ----
// გამოსახულება — ლაითბოქსის მხარეს (ფასადის მინისკენ); თანმიმდევრობა — გარედან, მარცხნიდან მარჯვნივ.
// key: ავეჯის ადგილი (ფასადი + კოორდინატა) → ტექსტურა.
export const VERTICAL_ADS = [
  // გვ. 7 — მობილურები: ფასადი B, ZF-01-6 ×4 (z ზრდადობით)
  { facade: 'B', at: 12.19, tex: 'v_iphone', title: 'iPhone 17 Pro | 17 Pro Max', page: 'l07' },
  { facade: 'B', at: 13.19, tex: 'v_macbook', title: 'MacBook Neo', page: 'l07' },
  { facade: 'B', at: 14.19, tex: 'v_apple_watch', title: 'Apple Watch', page: 'l07' },
  { facade: 'B', at: 15.19, tex: 'v_airpods', title: 'AirPods Pro 3 / AirPods 4', page: 'l07' },
  // გვ. 8 — გეიმინგი: PlayStation-ის ვიტრინები (RAL 5022)
  { facade: 'B', at: 2.09, tex: 'v_ps5', title: 'PS5', page: 'l08' },
  { facade: 'B', at: 3.09, tex: 'v_switch', title: 'Nintendo Switch 2', page: 'l08' },
  { facade: 'B', at: 4.09, tex: 'v_asus', title: 'ASUS', page: 'l08' },
  { facade: 'B', at: 5.09, tex: 'v_meta_quest', title: 'Meta Quest', page: 'l08' },
  // გვ. 9 — აიტი: ფასადი A, ZF-01-6 ×2 (გარედან მარცხნიდან მარჯვნივ = x კლებადობით)
  { facade: 'A', at: 2.88, tex: 'v_marshall', title: 'Marshall', page: 'l09' },
  { facade: 'A', at: 1.88, tex: 'v_rog', title: 'ROG Strix', page: 'l09' },
  // გვ. 10 — სმარტი: ფასადი A, ZF-01-6 ×4
  { facade: 'A', at: 9.85, tex: 'v_segway', title: 'Segway Ninebot KickScooter', page: 'l10' },
  { facade: 'A', at: 8.85, tex: 'v_roborock', title: 'Roborock', page: 'l10' },
  { facade: 'A', at: 7.85, tex: 'v_dreame', title: 'Dreame', page: 'l10' },
  { facade: 'A', at: 6.85, tex: 'v_dyson', title: 'Dyson', page: 'l10' },
];

// ---- ZF-19 — ჭერის სანავიგაციო კომპოზიციები (ZGMF-27/28/29) ----
// ადგილი (x, z, მ) — მთავარი (წარწერიანი) რგოლის ცენტრი ჭერის გეგმაზე; face — ორიენტაცია გეგმაზე, გრადუსი
// (0° = +X, 90° = +Z; ისარი ჭერის გეგმაზე). რგოლები: r — მარჯვნივ (მაყურებლის მხრიდან), f — წინ (+) / უკან (−),
// bottom — ქვედა ნიშნული იატაკიდან, D — გარე დიამეტრი, hole — ღიობი, inner — სიმბოლოს დისკი, T — სისქე.
// main: წარწერა (ქართული, მთავრული), arc — წარწერის საზღვრები ნახაზზე (გრადუსი, საათის ისრით, 0° = მარჯვნივ).
// sheet — ნახაზის ფურცელი და მთავარი რგოლის ცენტრი (pt) — სიმბოლოს ამოსაჭრელად.
const MAIN = (o) => ({ kind: 'main', D: 520, hole: 220, T: 140, ral: 2003, r: 0, f: 0, ...o });
export const NAV_COMPOSITIONS = [
  { id: 'ZF_19_1', code: 'ZF-19-1', x: 6.06, z: 13.035, face: -103.4, sheetPage: 30, rings: [
    { kind: 'open', D: 460, hole: 360, T: 100, ral: 4009, bottom: 3220, r: -330, f: -340 },
    MAIN({ D: 570, hole: 270, bottom: 3080, text: 'ᲛᲝᲑᲘᲚᲣᲠᲔᲑᲘ', arc: [104, 409], sheet: [172.2, 141.3, 40] }),
    { kind: 'symbol', D: 400, inner: 260, T: 80, ral: 6034, bottom: 3280, r: 430, f: -250, symbol: 'phone' },
  ] },
  ...[[2.725, 5.75, 99], [10.21, 2.63, 180], [2.67, 10.42, -90], [13.41, 11.65, -120]].map(([x, z, face], i) => ({
    id: `ZF_19_2_0${i + 1}`, code: 'ZF-19-2', x, z, face, sheetPage: 30, rings: [
      { kind: 'open', D: 420, hole: 320, T: 90, ral: 4005, bottom: 3290, r: -320, f: -290 },
      MAIN({ bottom: 3080, text: 'ᲨᲔᲐᲛᲝᲬᲛᲔ', arc: [54, 327.5], sheet: [463.3, 144.8, 36.5] }),
      { kind: 'symbol', D: 360, inner: 260, T: 100, ral: 5022, bottom: 3280, r: 340, f: -200, symbol: 'check' },
    ],
  })),
  { id: 'ZF_19_3', code: 'ZF-19-3', x: 11.30, z: 13.86, face: -151, sheetPage: 30, rings: [
    { kind: 'symbol', D: 360, inner: 260, T: 110, ral: 1016, bottom: 3320, r: -570, f: -190, symbol: 'usb' },
    { kind: 'open', D: 450, hole: 360, T: 100, ral: 6034, bottom: 3080, r: -330, f: -340 },
    MAIN({ bottom: 3110, text: 'ᲐᲥᲡᲔᲡᲣᲐᲠᲔᲑᲘ', arc: [99.7, 378.5], sheet: [761.9, 140.6, 36.5] }),
  ] },
  { id: 'ZF_19_4', code: 'ZF-19-4', x: 16.49, z: 7.38, face: 180, sheetPage: 31, rings: [
    { kind: 'symbol', D: 400, inner: 260, T: 120, ral: 6034, bottom: 3280, r: -390, f: 230, symbol: 'tv' },
    MAIN({ bottom: 3080, text: 'ᲢᲔᲚᲔᲕᲘᲖᲝᲠᲔᲑᲘ', arc: [100.1, 428.4], sheet: [310.85, 148.25, 36.45] }),
    { kind: 'open', D: 300, hole: 100, T: 50, ral: 5022, bottom: 3170, r: 310, f: -200 },
  ] },
  { id: 'ZF_19_5', code: 'ZF-19-5', x: 4.715, z: 9.93, face: -100.6, sheetPage: 31, rings: [
    { kind: 'open', D: 300, hole: 100, T: 50, ral: 1016, bottom: 3180, r: -360, f: -200 },
    MAIN({ bottom: 3080, text: 'ᲐᲣᲓᲘᲝ ᲡᲘᲡᲢᲔᲛᲐ', arc: [100.1, 423.4], sheet: [596.35, 148.25, 36.45] }),
    { kind: 'symbol', D: 360, inner: 260, T: 80, ral: 5022, bottom: 3300, r: 350, f: -200, symbol: 'speaker' },
  ] },
  { id: 'ZF_19_6', code: 'ZF-19-6', x: 9.66, z: 9.77, face: -135, sheetPage: 31, rings: [
    MAIN({ D: 560, hole: 260, bottom: 3080, text: 'ᲡᲐᲚᲐᲠᲝ', arc: [140.9, 321.2], sheet: [861.05, 145.35, 39.35] }),
    { kind: 'open', D: 460, hole: 100, T: 50, ral: 6034, bottom: 3220, r: 290, f: -370 },
    { kind: 'symbol', D: 400, inner: 260, T: 120, ral: 4009, bottom: 3150, r: 650, f: -270, symbol: 'cart' },
  ] },
  { id: 'ZF_19_7', code: 'ZF-19-7', x: 11.24, z: 5.58, face: 155, sheetPage: 32, rings: [
    { kind: 'open', D: 400, hole: 260, T: 60, ral: 1016, bottom: 3080, r: -260, f: -170 },
    MAIN({ bottom: 3160, text: 'ᲭᲙᲕᲘᲐᲜᲘ', arc: [109, 336.8], sheet: [259.3, 130, 36.5] }),
    { kind: 'symbol', D: 360, inner: 260, T: 100, ral: 5022, bottom: 3080, r: 360, f: 350, symbol: 'house' },
    MAIN({ r: 630, f: 160, bottom: 3080, text: 'ᲡᲐᲮᲚᲘ', arc: [127.8, 375.2], sheet: [349.55, 142.75, 35.05] }),
  ], note: 'მთავარი რგოლის ქვედა ნიშნული აღებულია საკიდის სიგრძით (420 → 3160); ნახაზზე ახლოს წერია 3200 — დასაზუსტებელი' },
  { id: 'ZF_19_8', code: 'ZF-19-8', x: 1.80, z: 3.945, face: 34, sheetPage: 32, rings: [
    { kind: 'open', D: 460, hole: 100, T: 50, ral: 4009, bottom: 3220, r: -260, f: -310 },
    MAIN({ bottom: 3080, text: 'ᲒᲔᲘᲛᲘᲜᲒᲘ', arc: [111.1, 345.9], sheet: [592.8, 141.4, 36.5] }),
    { kind: 'symbol', D: 360, inner: 260, T: 120, ral: 5022, bottom: 3270, r: 400, f: -270, symbol: 'gamepad' },
  ] },
  { id: 'ZF_19_9', code: 'ZF-19-9', x: 7.30, z: 4.03, face: 149, sheetPage: 32, rings: [
    { kind: 'open', D: 300, hole: 100, T: 50, ral: 5022, bottom: 3250, r: -370, f: -180 },
    MAIN({ bottom: 3160, text: 'ᲚᲔᲞᲢᲝᲞᲔᲑᲘ', arc: [107.1, 406.6], sheet: [875.6, 130.2, 36.3] }),
    { kind: 'symbol', D: 400, inner: 260, T: 120, ral: 4009, bottom: 3080, r: 360, f: 230, symbol: 'laptop' },
  ] },
  { id: 'ZF_19_10', code: 'ZF-19-10', x: 16.20, z: 13.86, face: 180, sheetPage: 30, rings: [
    { kind: 'open', D: 450, hole: 360, T: 100, ral: 6034, bottom: 3170, r: -260, f: -340 },
    MAIN({ bottom: 3080, text: 'ᲒᲐᲜᲕᲐᲓᲔᲑᲐ', arc: [100.4, 359.1], sheet: [1032.6, 144.8, 36.5] }),
    { kind: 'symbol', D: 400, inner: 260, T: 80, ral: 4005, bottom: 3280, r: 360, f: -180, symbol: 'lari' },
  ] },
];
export const NAV_DRAWINGS = { 30: ['f30', 'f29', 'p12'], 31: ['f31', 'f29', 'p12'], 32: ['f32', 'f29', 'p12'] };
export const NAV_HANGER = { w: 20, t: 3, plate: 60 }; // ლითონის ზოლი 20 × 3 მმ (ვარაუდი), ჭერის ფირფიტა 60 × 60
