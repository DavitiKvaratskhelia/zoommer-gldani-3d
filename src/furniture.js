// ზუმერი — გლდანი მოლი · ავეჯის დეტალური მოდელები.
// წყარო: „ZGMF - ავეჯი - Update 2.pdf“ (DODO Designs) — ყველა ზომა მილიმეტრებშია ნახაზიდან და
// ერთიანად გადაყვანილია მეტრებში (mm()). ავეჯის ადგილი, მობრუნება და რაოდენობა — config.js
// (გეგმა ZGMP-06). ადგილობრივი ღერძები: +Z — ავეჯის წინა მხარე, +Y — ზემოთ, სათავე — იატაკზე.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mesh, lbox, flatExtrude, roundedRect, mat } from './model.js';
import { H } from './config.js';
import FONT_JSON from './assets/font-helvetiker-bold.js';
import { LOGO_LATIN, LOGO_LOCKUP } from './assets/logos.js';

const DEG = Math.PI / 180;
const mm = (v) => v / 1000;
let FONT = null;
const font = () => (FONT ??= new FontLoader().parse(FONT_JSON));

// ------------------------------------------------------------------ დამხმარეები
const add = (g, o) => { g.add(o); return o; };
const B = (g, name, sx, sy, sz, cx, cy, cz, mk, opts) => add(g, lbox(name, sx, sy, sz, cx, cy, cz, mk, opts));
const M = (g, geo, mk, name, opts) => add(g, mesh(geo, mk, name, opts));
const noPick = (o) => { o.userData.noPick = true; return o; };

// წინხედის მომრგვალებული მართკუთხედი (x — სიგანე, y — სიმაღლე, ქვედა კიდე y0-ზე)
function rr(w, h, rt, rb, asPath = false, cx = 0, y0 = 0) {
  const s = asPath ? new THREE.Path() : new THREE.Shape();
  const x0 = cx - w / 2, x1 = cx + w / 2, y1 = y0 + h;
  rt = Math.min(rt, w / 2, h / 2); rb = Math.min(rb, w / 2, h / 2);
  s.moveTo(x0 + rb, y0);
  s.lineTo(x1 - rb, y0); if (rb > 0) s.absarc(x1 - rb, y0 + rb, rb, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - rt); if (rt > 0) s.absarc(x1 - rt, y1 - rt, rt, 0, Math.PI / 2, false);
  s.lineTo(x0 + rt, y1); if (rt > 0) s.absarc(x0 + rt, y1 - rt, rt, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + rb); if (rb > 0) s.absarc(x0 + rb, y0 + rb, rb, Math.PI, 1.5 * Math.PI, false);
  return s;
}
// წინხედის ფიგურის ამოწევა Z ღერძზე: z0 → z0 + depth
function exZ(shape, z0, depth, seg = 10) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, z0);
  return g;
}
// მომრგვალებული ჩარჩო („მილი“) — სისქე t, სიღრმე depth
function tube(g, name, w, h, t, rt, rb, y0, z0, depth, mk) {
  const s = rr(w, h, rt, rb, false, 0, y0);
  s.holes.push(rr(w - 2 * t, h - 2 * t, Math.max(rt - t, 0.002), Math.max(rb - t, 0.002), true, 0, y0 + t));
  return M(g, exZ(s, z0, depth, 10), mk, name);
}
// ბრტყელი პანელი ფაქტურით (ბადე/პერფორაცია): UV იზრდება ზომის მიხედვით — ნიმუშის ბიჯი მეტრებში
function sheet(g, name, w, h, cx, cy, cz, mk, pitchU, pitchV = pitchU, rotY = 0) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / pitchU, uv.getY(i) * h / pitchV);
  const m = mesh(geo, mk, name, { cast: false });
  m.position.set(cx, cy, cz);
  m.rotation.y = rotY;
  return add(g, m);
}
const glassBox = (g, name, w, h, t, cx, cy, cz) => noPick(B(g, name, w, h, t, cx, cy, cz, 'glassClear', { cast: false }));
const ledX = (g, name, len, cx, cy, cz) => B(g, name, len, 0.006, 0.008, cx, cy, cz, 'led', { cast: false });
const ledY = (g, name, len, cx, cy, cz) => B(g, name, 0.008, len, 0.006, cx, cy, cz, 'led', { cast: false });
const seamX = (g, name, len, cx, cy, cz) => B(g, name, len, 0.003, 0.002, cx, cy, cz, 'holeDark', { cast: false });
const seamY = (g, name, len, cx, cy, cz) => B(g, name, 0.003, len, 0.002, cx, cy, cz, 'holeDark', { cast: false });
// Z ღერძის მიმართულების ცილინდრი (სახელური, საკიდის დისკი…)
function cylZ(g, name, r, len, cx, cy, cz, mk, seg = 20) {
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.rotateX(Math.PI / 2);
  const m = mesh(geo, mk, name);
  m.position.set(cx, cy, cz);
  return add(g, m);
}
function cylY(g, name, r, y0, h, cx, cz, mk, seg = 48) {
  const m = mesh(new THREE.CylinderGeometry(r, r, h, seg), mk, name);
  m.position.set(cx, y0 + h / 2, cz);
  return add(g, m);
}
// გეგმის ფიგურა (x, −z) → ვერტიკალური ამოწევა y0 → y0 + h
const P = (g, shape, y0, h, mk, name, seg = 12) => M(g, flatExtrude(shape, y0, h, seg), mk, name);
function stadium(len, wid) { return roundedRect(len, wid, wid / 2); } // ოვალური ფეხი (გეგმა)

function text(g, str, size, depth, mk, name) {
  const geo = new TextGeometry(str, { font: font(), size, depth, curveSegments: 4, bevelEnabled: false });
  geo.computeBoundingBox();
  return M(g, geo, mk, name);
}

// ------------------------------------------------------------------ ვიტრინები (ZF-01-x)
// shell: კორპუსი 1000 × 1800, ჩარჩო ორმაგი MDF 36 მმ, ზედა კუთხეები R150 (შიგნით R114).
// rows: შიდა ვერტიკალური განაწილება ზემოდან ქვემოთ (მმ): რიცხვი — სიმაღლე, 's' — თარო 18,
// 'd' — გამყოფი 18 (ზედა/ქვედა კარების საზღვარი).
const VITRINES = {
  '01-1': { sheet: 'ZGMF-01', page: 3, d: 350, rear: 0, back: 18, plinth: true, mk: 'ncsOrange',
    rows: [300, 's', 300, 's', 300, 's', 300, 'd', 219, 's', 219], lower: 'mesh' },
  '01-3': { sheet: 'ZGMF-07', page: 9, d: 350, rear: 0, back: 18, plinth: true, mk: 'ncsOrange',
    rows: [618, 's', 300, 's', 300, 'd', 219, 's', 219], lower: 'mesh', watches: true },
  '01-6': { sheet: 'ZGMF-06', page: 8, d: 450, rear: 100, back: 25, pipe: true, lightbox: true, mk: 'ncsOrange',
    rows: [300, 's', 300, 's', 300, 's', 300, 'd', 456], lower: 'mesh' },
  '5A': { sheet: 'ZGMF-03', page: 5, d: 490, rear: 110, back: 18, pipe: true, lightbox: true, mk: 'ral5022Mdf',
    rows: [440, 'p', 365, 's', 365, 'd', 504], lower: 'glass', partial: 'right' },
  '5A-2': { sheet: 'ZGMF-03', page: 5, d: 490, rear: 110, back: 18, pipe: true, lightbox: true, mk: 'ral5022Mdf',
    rows: [440, 'p', 365, 's', 365, 'd', 504], lower: 'glass', partial: 'left' },
  '5A-1': { sheet: 'ZGMF-04', page: 6, d: 490, rear: 110, back: 18, pipe: true, lightbox: true, mk: 'ral5022Mdf',
    rows: [440, 's', 748, 'd', 504], lower: 'glass', psDisc: true },
  'B': { sheet: 'ZGMF-02', page: 4, d: 490, rear: 110, back: 18, pipe: true, lightbox: true, mk: 'ral5022Mdf',
    rows: [570, 's', 300, 's', 300, 'd', 504], lower: 'glass', split: true },
};

function vitrine(o, g) {
  const v = VITRINES[o.variant];
  const W = 1.0, D = mm(v.d), y0 = 0.25, Hs = 1.8, t = 0.036, rt = 0.15, rb = 0.05;
  const zF = D / 2, zB = -D / 2;
  const mk = v.mk;
  const zIn0 = zB + mm(v.rear) + mm(v.back);     // ვიტრინის შიდა უკანა სიბრტყე
  const zDoor = zF - 0.008;                        // მინის კარის ცენტრი
  const inW = W - 2 * t;
  // კორპუსი (მომრგვალებული ჩარჩო მთელ სიღრმეზე)
  tube(g, `კორპუსი ${W * 1000}×${v.d}×1800, ჩარჩო 36`, W, Hs, t, rt, rb, y0, zB, D, mk);
  // უკანა პანელი / ლაითბოქსის გამყოფი
  B(g, v.rear ? 'გამყოფი ლაითბოქსსა და ვიტრინას შორის' : 'უკანა პანელი (თეთრი ლამ. MDF 18)',
    inW, Hs - 2 * t, mm(v.back), 0, y0 + Hs / 2, zB + mm(v.rear) + mm(v.back) / 2, 'whiteLam');
  if (v.lightbox) {
    const lb = rr(inW, Hs - 2 * t, rt - t, Math.max(rb - t, 0.002), false, 0, y0 + t);
    M(g, exZ(lb, zB + 0.004, 0.006), 'lightbox', 'ლაითბოქსი (უკანა მხარე, განათებული)', { cast: false });
  }
  // საყრდენი
  if (v.plinth) {
    const pl = M(g, flatExtrude(stadium(0.70, 0.20), 0, y0), mk, 'ცოკოლი 700×200×250');
    pl.position.z = zB + 0.10;
  }
  if (v.pipe) {
    const zp = zB + 0.05;
    cylY(g, 'ავეჯის მილი Ø100 (იატაკიდან ჭერამდე)', 0.05, 0, H.ceiling, 0, zp, mk, 24);
    cylY(g, 'მილის ძირი Ø240', 0.12, 0, 0.01, 0, zp, 'metalDark', 32);
  }
  // შიდა თაროები
  const shelfD = zF - 0.034 - zIn0;                 // თარო კარამდე (34 მმ კარის ზონა)
  const shelfZ = zIn0 + shelfD / 2;
  let y = y0 + Hs - t;                              // შიდა ზედა სიბრტყე
  const yTop = y;
  let yDiv = null;
  const zones = [];
  let zoneTop = y;
  v.rows.forEach((r, i) => {
    if (typeof r === 'number') { y -= mm(r); return; }
    const yc = y - 0.009;
    if (r === 'd') { yDiv = y - 0.018; zones.push([y, zoneTop]); zoneTop = yDiv; }
    if (r === 'p') {
      const pw = 0.63, px = v.partial === 'right' ? inW / 2 - pw / 2 : -inW / 2 + pw / 2;
      B(g, `თარო 630 (${v.partial === 'right' ? 'მარჯვნივ' : 'მარცხნივ — სარკისებური'})`, pw, 0.018, shelfD, px, yc, shelfZ, 'whiteLam');
      ledX(g, 'LED (თაროს წინა კიდე)', pw - 0.02, px, yc - 0.012, zF - 0.045);
    } else {
      B(g, r === 'd' ? 'გამყოფი თარო (ზედა/ქვედა სათავსი)' : `თარო ${i}`, inW, 0.018, shelfD, 0, yc, shelfZ, 'whiteLam');
      if (r === 's' && (yDiv === null)) ledX(g, 'LED (თაროს წინა კიდე)', inW - 0.02, 0, yc - 0.012, zF - 0.045);
    }
    y -= 0.018;
  });
  zones.push([y0 + t, zoneTop]);
  const [upBot, upTop] = zones[0];
  const [loBot, loTop] = zones[1];
  ledX(g, 'LED (ზედა ფილაში ამოფრეზილი)', inW - 0.02, 0, yTop - 0.004, zF - 0.045);
  // ვერტიკალური გამყოფი (ZF-01-5B)
  if (v.split) B(g, 'ვერტიკალური გამყოფი 18', 0.018, upTop - upBot, shelfD, 0, (upTop + upBot) / 2, shelfZ, 'whiteLam');
  // კარები
  const leafW = inW / 2 - 0.002;
  const glassDoor = (name, cx, yb, yt) => {
    glassBox(g, name, leafW, yt - yb - 0.004, 0.006, cx, (yb + yt) / 2, zDoor);
    const hx = cx + Math.sign(cx) * (leafW / 2 - 0.012);
    const n = yt - yb > 0.8 ? 3 : 2;
    for (let k = 0; k < n; k++) B(g, 'ანჯამა (მინის კარი)', 0.014, 0.045, 0.02, hx, yb + 0.1 + k * (yt - yb - 0.2) / Math.max(n - 1, 1), zDoor - 0.006, 'hardware');
  };
  if (v.split) {
    // მარცხენა ზედა — დახურული პანელი წარწერით; მარჯვენა — მინის კარი
    B(g, 'დახურული ფასადი (PLAY HAS NO LIMITS)', leafW, upTop - upBot - 0.004, 0.018, -inW / 4, (upTop + upBot) / 2, zF - 0.012, mk);
    const tg = text(g, 'PLAY HAS NO LIMITS', 0.062, 0.012, 'orgWhite', 'წარწერა „PLAY HAS NO LIMITS“ (ორგმინა, განათებული)');
    const bbx = tg.geometry.boundingBox;
    tg.geometry.translate(-(bbx.min.x + bbx.max.x) / 2, -(bbx.min.y + bbx.max.y) / 2, 0);
    const len = bbx.max.x - bbx.min.x, sc = 0.91 / len;
    tg.scale.set(sc, sc, 1);
    tg.rotation.z = Math.PI / 2;
    tg.position.set(-inW / 2 + 0.065 + 0.075, (upTop + upBot) / 2 + 0.05, zF - 0.003);
    glassDoor('მინის კარი (ზედა მარჯვენა)', inW / 4, upBot, upTop);
  } else {
    glassDoor('მინის კარი (ზედა მარცხენა)', -inW / 4, upBot, upTop);
    glassDoor('მინის კარი (ზედა მარჯვენა)', inW / 4, upBot, upTop);
    cylZ(g, 'საკეტი (მინის კარები)', 0.012, 0.012, 0, upBot + 0.04, zF + 0.002, 'hardware');
  }
  if (v.lower === 'glass') {
    glassDoor('მინის კარი (ქვედა მარცხენა)', -inW / 4, loBot, loTop);
    glassDoor('მინის კარი (ქვედა მარჯვენა)', inW / 4, loBot, loTop);
  } else {
    // ლითონის ბადის კარები: MDF ჩარჩო 15, ნარინჯისფერი ბადე, უკან თეთრი ლამინირებული ფილა
    for (const sx of [-1, 1]) {
      const cx = sx * inW / 4, h = loTop - loBot - 0.004, yc = (loTop + loBot) / 2;
      const fr = rr(leafW, h, 0, 0, false, cx, yc - h / 2);
      fr.holes.push(rr(leafW - 0.03, h - 0.03, 0, 0, true, cx, yc - h / 2 + 0.015));
      M(g, exZ(fr, zF - 0.018, 0.018), mk, 'სათავსის კარის ჩარჩო 15');
      sheet(g, 'ლითონის ბადე (სათავსის კარი)', leafW - 0.03, h - 0.03, cx, yc, zF - 0.006, 'meshOrange', 0.04);
      B(g, 'თეთრი ლამინირებული ფილა ბადის უკან', leafW - 0.03, h - 0.03, 0.006, cx, yc, zF - 0.016, 'whiteLam', { cast: false });
      cylZ(g, 'სახელური/საკეტი', 0.008, 0.01, sx * 0.03, loTop - 0.05, zF + 0.004, 'hardware');
    }
  }
  // სმარტ საათების საკიდები (ZF-01-3): 5 თეთრი დისკი Ø160, ბიჯი 170
  if (v.watches) {
    for (let k = 0; k < 5; k++) {
      const xc = -inW / 2 + mm(124) + k * mm(170);   // ცენტრები: 124 + 4 × 170 + 124 = 928
      const yy = yTop - mm(k % 2 ? 290 : 240);
      cylZ(g, `სმარტ საათის საკიდი Ø160 #${k + 1} (თეთრი)`, 0.08, 0.04, xc, yy, zIn0 + 0.10, 'whiteLam', 36);
      B(g, `საკიდის ღერო #${k + 1}`, 0.04, 0.06, 0.08, xc, yy + 0.04, zIn0 + 0.04, 'whiteLam');
    }
  }
  // PlayStation-ის ლოგოს დისკი Ø200 და გამჭვირვალე ორგმინის თარო (ZF-01-5A-1)
  if (v.psDisc) {
    const compTop = yTop - mm(440) - 0.018, compBot = compTop - mm(748);
    cylZ(g, 'PlayStation-ის დისკი Ø200 (განათებული)', 0.10, 0.03, inW / 2 - mm(80) - 0.10, compTop - mm(260), zIn0 + 0.02, 'ral5022Mdf', 40);
    const tri = new THREE.Shape([new THREE.Vector2(-0.045, -0.035), new THREE.Vector2(0.045, -0.035), new THREE.Vector2(0, 0.045)]);
    tri.holes.push(new THREE.Path([new THREE.Vector2(-0.025, -0.022), new THREE.Vector2(0, 0.022), new THREE.Vector2(0.025, -0.022)]));
    const tm = M(g, exZ(tri, 0, 0.006), 'psGreen', '△ სიმბოლო (განათებული)', { cast: false });
    tm.position.set(inW / 2 - mm(80) - 0.10, compTop - mm(260), zIn0 + 0.036);
    noPick(B(g, 'გამჭვირვალე ორგმინის თარო 450', 0.45, 0.010, 0.21, -inW / 2 + mm(80) + 0.225, compBot + mm(468), zIn0 + 0.12, 'orgClear', { cast: false }));
  }
}

// ------------------------------------------------------------------ აქსესუარების კედელი ZF-16-1 / ZF-16-2
// ცოკოლი 250 (გვერდებიდან 150 შეწეული, სიღრმე 200), სათავსი 275 (სიღრმე 350, წინა კუთხეები R120),
// პერფორირებული პანელი 1525 (ჩარჩო 36, ზედა კუთხეები R150, სიღრმე 140), ლითონის საკიდები.
function pegWall(o, g) {
  const W = o.w, D = 0.35, zB = -D / 2, zF = D / 2;
  const cols = o.cols;   // მმ
  const doors = o.doors; // მმ
  const pl = M(g, flatExtrude(roundedRect(W - 0.30, 0.20, 0.02), 0, 0.25), 'ncsOrange', 'ცოკოლი 250');
  pl.position.z = zB + 0.10;
  P(g, roundedRect(W, D, 0.12), 0.25, 0.275, 'ncsOrange', 'სათავსი 275 (R120)');
  let x = -W / 2 + 0.12;
  seamY(g, 'კარის ღრიჭო', 0.24, x, 0.3875, zF + 0.001);
  doors.forEach((dw, i) => {
    const w = mm(dw);
    cylZ(g, `სახელური #${i + 1}`, 0.007, 0.012, x + w / 2 + (i % 2 ? -0.06 : 0.06), 0.49, zF + 0.006, 'hardware');
    x += w;
    seamY(g, 'კარის ღრიჭო', 0.24, x, 0.3875, zF + 0.001);
  });
  seamX(g, 'კარის ღრიჭო', W - 0.24, 0, 0.268, zF + 0.001);
  seamX(g, 'კარის ღრიჭო', W - 0.24, 0, 0.507, zF + 0.001);
  // პანელი
  const py0 = 0.525, ph = 1.525, pd = 0.14;
  tube(g, 'პანელის ჩარჩო 36 (R150)', W, ph, 0.036, 0.15, 0.0, py0, zB, pd, 'ncsOrange');
  B(g, 'ზურგი — თეთრი ლამინირებული MDF', W - 0.072, ph - 0.072, 0.018, 0, py0 + ph / 2, zB + 0.009, 'whiteLam');
  const zs = zB + 0.112;
  sheet(g, 'პერფორირებული ლითონის ფურცელი (თეთრი)', W - 0.072, ph - 0.072, 0, py0 + ph / 2, zs, 'perfWhite', 0.012);
  // ლითონის საკიდების პროფილები და საკიდები
  const inX0 = -W / 2 + 0.036;
  let cx = inX0;
  const rows = [363, 363, 363, 364];
  cols.forEach((cw, ci) => {
    const w = mm(cw);
    if (ci > 0) B(g, 'ვერტიკალური პროფილი', 0.012, ph - 0.072, 0.02, cx, py0 + ph / 2, zs + 0.01, 'metalDark');
    let yy = py0 + 0.036;
    rows.forEach((rh, ri) => {
      const h = mm(rh);
      if (ri > 0) B(g, 'ჰორიზონტალური პროფილი (საკიდის რელსი)', w, 0.012, 0.02, cx + w / 2, yy, zs + 0.01, 'metalDark');
      for (const f of [0.3, 0.7]) {
        const hk = B(g, 'ლითონის საკიდი 210 (რაოდენობა — ვარაუდი)', 0.006, 0.006, 0.21, cx + w * f, yy + h * 0.55, zs + 0.105, 'metalDark', { cast: false });
        void hk;
      }
      yy += h;
    });
    cx += w;
  });
  // LED ჩარჩოში (თავსა და გვერდებზე)
  ledX(g, 'LED (ჩარჩოს ზედა ნაწილი)', W - 0.36, 0, py0 + ph - 0.04, zB + pd - 0.004);
  ledY(g, 'LED (ჩარჩოს გვერდი)', ph - 0.25, -W / 2 + 0.04, py0 + (ph - 0.15) / 2, zB + pd - 0.004);
  ledY(g, 'LED (ჩარჩოს გვერდი)', ph - 0.25, W / 2 - 0.04, py0 + (ph - 0.15) / 2, zB + pd - 0.004);
}

// ------------------------------------------------------------------ აქსესუარების სტენდი ZF-04 (ორმხრივი)
// 2000 × 400 × 1500: ცოკოლი 70, სათავსი 230 (R120, კარები მხოლოდ ერთ მხარეს 3×600),
// ორმხრივი პერფორირებული პანელი 1960 × 1200 (ჩარჩო 20, R150, სიღრმე 160), 2×3 უჯრედი.
function gondola(o, g) {
  P(g, roundedRect(1.90, 0.30, 0.10), 0, 0.07, 'ncsOrange', 'ცოკოლი 70');
  P(g, roundedRect(2.0, 0.40, 0.12), 0.07, 0.23, 'ncsOrange', 'სათავსი 230 (R120)');
  let x = -1.0 + 0.10;
  seamY(g, 'კარის ღრიჭო', 0.2, x, 0.185, 0.201);
  for (let i = 0; i < 3; i++) {
    cylZ(g, `სახელური #${i + 1}`, 0.007, 0.012, x + 0.3 + (i === 1 ? -0.05 : 0.05), 0.26, 0.206, 'hardware');
    x += 0.6;
    seamY(g, 'კარის ღრიჭო', 0.2, x, 0.185, 0.201);
  }
  const py0 = 0.30, ph = 1.20, pw = 1.96;
  tube(g, 'პანელის ჩარჩო 20 (R150)', pw, ph, 0.02, 0.15, 0.15, py0, -0.08, 0.16, 'ncsOrange');
  B(g, 'მილკვადრატის ვერტიკალური ტიხარი', 0.04, ph - 0.04, 0.04, 0, py0 + ph / 2, 0, 'metalDark');
  for (const sd of [1, -1]) {
    const z = sd * 0.062;
    sheet(g, `პერფორირებული ფურცელი (${sd > 0 ? 'წინა' : 'უკანა'} მხარე)`, pw - 0.04, ph - 0.04, 0, py0 + ph / 2, z, 'perfWhite', 0.012, 0.012, sd > 0 ? 0 : Math.PI);
    B(g, 'ვერტიკალური პროფილი (980 | 980)', 0.01, ph - 0.04, 0.012, 0, py0 + ph / 2, z + sd * 0.006, 'metalDark');
    B(g, 'ჰორიზონტალური პროფილი', pw - 0.04, 0.01, 0.012, 0, py0 + 0.02 + 0.38, z + sd * 0.006, 'metalDark');
    B(g, 'ჰორიზონტალური პროფილი', pw - 0.04, 0.01, 0.012, 0, py0 + 0.02 + 0.78, z + sd * 0.006, 'metalDark');
    for (const yy of [0.20, 0.59, 0.98]) for (const xx of [-0.73, -0.25, 0.25, 0.73]) {
      B(g, 'ლითონის საკიდი (რაოდენობა — ვარაუდი)', 0.006, 0.006, 0.20, xx, py0 + yy, z + sd * 0.10, 'metalDark', { cast: false });
    }
    ledX(g, 'LED (ჩარჩოს პერიმეტრი)', pw - 0.36, 0, py0 + ph - 0.03, sd * 0.078);
    ledX(g, 'LED (ჩარჩოს პერიმეტრი)', pw - 0.36, 0, py0 + 0.03, sd * 0.078);
  }
}

// ------------------------------------------------------------------ სადემონსტრაციო მაგიდები ZF-03-x
// ზედა ნაწილი 400 (თეთრი ლამინირებული ზედაპირი, ნარინჯისფერი კანტი 36, R150), ოვალური ფეხები 500
// (150 სიგანის MDF), სათავსები ორივე გრძელ მხარეს, საკაბელო ღარი, ZF-03-2/3 — აქსესუარების საკიდი.
const TABLES = {
  '03-1': { sheet: 'ZGMF-09', page: 11, L: 2.0, doors: [620, 620, 620], slot: 1.0, rail: false,
    legs: [{ kind: 'diag', len: 0.65, x: 0.60, a: 45 }, { kind: 'straight', len: 0.65, x: 1.525 }] },
  '03-2': { sheet: 'ZGMF-10', page: 12, L: 2.0, doors: [620, 620, 620], slot: 1.0, rail: true,
    legs: [{ kind: 'diag', len: 0.50, x: 0.598, a: 45 }, { kind: 'straight', len: 0.50, x: 1.525 }] },
  '03-3': { sheet: 'ZGMF-11', page: 13, L: 2.5, doors: [590, 590, 590, 590], slot: 1.5, rail: true,
    legs: [{ kind: 'straight', len: 0.65, x: 0.475 }, { kind: 'diag', len: 0.65, x: 1.25, a: 45 }, { kind: 'diag', len: 0.50, x: 2.025, a: -45 }] },
};
function demoTable(o, g0) {
  const v = TABLES[o.variant];
  const g = new THREE.Group();
  g.name = 'მაგიდის ლოკალური ღერძი';
  if (o.d > o.w) g.rotation.y = Math.PI / 2;
  g0.add(g);
  const L = v.L, Wd = 1.0, R = 0.15, t = 0.036;
  // ქვედა კორპუსი (სათავსები) 500 → 882
  P(g, roundedRect(L, Wd, R), 0.50, 0.382, 'ncsOrange', 'კორპუსი / სათავსები (შეღებილი MDF)');
  // კანტი 36 და თეთრი ზედაპირი ღარით
  const rim = roundedRect(L, Wd, R);
  rim.holes.push(roundedRect(L - 2 * t, Wd - 2 * t, R - t));
  P(g, rim, 0.882, 0.018, 'ncsOrange', 'ნარინჯისფერი კანტი 36');
  const top = roundedRect(L - 2 * t, Wd - 2 * t, R - t);
  top.holes.push(roundedRect(v.slot, 0.12, 0.06));
  P(g, top, 0.882, 0.018, 'whiteLam', 'ზედაპირი — თეთრი ლამინირებული MDF');
  P(g, roundedRect(v.slot, 0.12, 0.06), 0.883, 0.002, 'holeDark', 'საკაბელო ღარი 120 (დენის წყარო)');
  // სათავსის კარები ორივე გრძელ მხარეს
  for (const sd of [1, -1]) {
    const z = sd * (Wd / 2 + 0.001);
    // კარების ღრიჭოები მხოლოდ ბრტყელ ზედაპირზე (კიდურა ღრიჭოები R150 მომრგვალების დასაწყისში)
    let x = -L / 2 + 0.07;
    v.doors.forEach((dw, i) => {
      const w = mm(dw);
      cylZ(g, `სახელური #${i + 1}`, 0.007, 0.012, x + w / 2, 0.80, z + sd * 0.006, 'hardware');
      x += w;
      if (i < v.doors.length - 1) seamY(g, 'კარის ღრიჭო', 0.30, x, 0.68, z);
    });
    for (const ex of [-1, 1]) seamY(g, 'კარის ღრიჭო', 0.30, ex * (L / 2 - R), 0.68, z);
    seamX(g, 'კარის ღრიჭო', L - 0.30, 0, 0.53, z);
    seamX(g, 'კარის ღრიჭო', L - 0.30, 0, 0.83, z);
    if (v.rail) {
      B(g, 'აქსესუარების რელსი (ლითონი)', L - 0.30, 0.012, 0.012, 0, 0.85, sd * (Wd / 2 + 0.008), 'metalDark');
      const n = Math.round((L - 0.4) / 0.25) + 1;
      for (let k = 0; k < n; k++) {
        B(g, 'საკიდი (აქსესუარები)', 0.005, 0.005, 0.10, -(L - 0.4) / 2 + k * (L - 0.4) / (n - 1), 0.85, sd * (Wd / 2 + 0.06), 'metalDark', { cast: false });
      }
    }
  }
  // ოვალური ფეხები (MDF, 150 სიგანე)
  v.legs.forEach((lg, i) => {
    const shape = lg.kind === 'straight' ? stadium(0.15, lg.len) : stadium(lg.len, 0.15);
    const m = P(g, shape, 0, 0.50, 'ncsOrange', `ფეხი ${i + 1} (${lg.kind === 'straight' ? 'სწორი' : '45°'} ${lg.len * 1000}×150)`);
    m.position.x = -L / 2 + lg.x;
    if (lg.kind === 'diag') m.rotation.y = (lg.a ?? 45) * DEG;
  });
}

// ------------------------------------------------------------------ სალარო ZF-08
// გარე R1950, გარსი R1850–R1950, ზედა ფილა R1500–R1950 (100 სისქე, 1000–1100), შიდა სამუშაო
// მაგიდა R1200–R1744 (740 სიმაღლე, თეთრი მქრალი) სათავსებით (6 სექცია ~60°), ცოკოლი 70.
function cashDesk(o, g) {
  const a0 = o.a0 * DEG, a1 = o.a1 * DEG;
  const sector = (r0, r1) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, -a0, -a1, true);
    s.absarc(0, 0, r0, -a1, -a0, false);
    s.closePath();
    return s;
  };
  P(g, sector(1.80, 1.90), 0, 0.07, 'ncsOrange', 'ცოკოლი 70', 72);
  P(g, sector(1.85, 1.95), 0.07, 0.93, 'ncsOrange', 'გარე ფასადი (შეღებილი MDF)', 96);
  P(g, sector(1.50, 1.95), 1.0, 0.10, 'ncsOrange', 'დახლის ზედა ფილა 450 × 100', 96);
  P(g, sector(1.22, 1.744), 0, 0.704, 'whiteMatte', 'შიდა სათავსები (სამუშაო მაგიდის ქვეშ)', 72);
  P(g, sector(1.20, 1.744), 0.704, 0.036, 'whiteMatte', 'სამუშაო მაგიდა R1200–R1744 (თეთრი მქრალი)', 72);
  // სათავსების დანაწევრება ~60.07°-ით
  for (let a = o.a0 + 30; a < o.a1; a += 60.07) {
    const r = a * DEG, s = seamY(g, 'სათავსის კარის ღრიჭო', 0.62, 1.219 * Math.cos(r), 0.39, 1.219 * Math.sin(r));
    s.rotation.y = -r + Math.PI / 2;
  }
  // ბრენდინგი: ოფიციალური ლოგო (ქართული წარწერა + ემბლემა) და ლათინური „zoommer“ — განათებული ორგმინა
  const R = 1.95;
  const toShapes = (data, idx, sc, flip) => data.shapes.filter((_, i) => idx(i)).map((s) => {
    const p = (pts) => pts.map(([x, y]) => new THREE.Vector2(x * sc, -y * sc));
    const sh = new THREE.Shape(p(s.shape));
    s.holes.forEach((h) => sh.holes.push(new THREE.Path(p(h))));
    return sh;
  });
  // ნახაზი ZGMF-13: ქართული წარწერა და „zoommer“ — 200 მმ, ემბლემა — Ø620 (იატაკიდან 300), ზოლის ცენტრი 620 მმ.
  const mkGeo = (shapes) => new THREE.ExtrudeGeometry(shapes, { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
  const geoKa = mkGeo(toShapes(LOGO_LOCKUP, (i) => i < 6, 0.20 / (29.72 - 14.87)));
  const geoEm = mkGeo(toShapes(LOGO_LOCKUP, (i) => i >= 6, 0.62 / 44.6));
  const geoLa = mkGeo(toShapes(LOGO_LATIN, () => true, 0.20 / 62.742));
  const parts = [geoKa, geoEm, geoLa];
  parts.forEach((p) => p.computeBoundingBox());
  const gap = 0.07;
  const totalW = parts.reduce((a, p) => a + p.boundingBox.max.x - p.boundingBox.min.x, 0) + gap * 2;
  let cursor = -totalW / 2;
  parts.forEach((p) => {
    const b = p.boundingBox;
    p.translate(cursor - b.min.x, 0.62 - (b.min.y + b.max.y) / 2, 0);
    cursor += b.max.x - b.min.x + gap;
  });
  const gLock = mergeGeometries([geoKa, geoEm]), gLat = geoLa;
  const thc = (o.logoAt ?? 195) * DEG;
  const bend = (geo) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), yy = p.getY(i), w = p.getZ(i);
      const th = thc - u / R, rad = R + 0.002 + w;
      p.setXYZ(i, rad * Math.cos(th), yy, rad * Math.sin(th));
    }
    geo.computeVertexNormals();
    return geo;
  };
  M(g, bend(gLock), 'orgWhite', 'ლოგო — ემბლემა და „ზუმერი“ (ოფიციალური ვექტორი, განათებული ორგმინა)', { cast: false });
  M(g, bend(gLat), 'orgWhite', 'წარწერა „zoommer“ (ოფიციალური ვექტორი, განათებული ორგმინა)', { cast: false });
}

// ------------------------------------------------------------------ ჩეკ-დესკები ZF-09-1 (სვეტთან) და ZF-09-2
// ZF-09-1: ზედაპირი R500 (36), კორპუსი R446 (894), ცოკოლი 70; ფიგურა იჭრება სვეტის სიბრტყით
// ცენტრიდან 362 მმ-ზე (ადგილობრივი +X — სვეტისკენ). ქორდა 690 = სვეტის სიგანე.
function checkDesk(o, g) {
  const cut = 0.362;
  const seg = (R) => {
    const a = Math.acos(Math.min(cut / R, 1));
    const s = new THREE.Shape();
    s.absarc(0, 0, R, a, 2 * Math.PI - a, false);
    s.closePath();
    return s;
  };
  P(g, seg(0.40), 0, 0.07, 'metalDark', 'ცოკოლი 70', 64);
  P(g, seg(0.446), 0.07, 0.894, 'whiteMatte', 'კორპუსი (ავსტრიული ლამ. MDF, თეთრი მქრალი)', 64);
  const top = seg(0.50);
  top.holes.push((() => { const h = new THREE.Path(); h.absarc(0.27, 0.30, 0.05, 0, Math.PI * 2, true); return h; })());
  P(g, top, 0.964, 0.036, 'whiteMatte', 'ზედაპირი R500 / 36 (ნივთების ჩასადები ხვრელი Ø100)', 64);
  P(g, (() => { const s = new THREE.Shape(); s.absarc(0.27, 0.30, 0.05, 0, Math.PI * 2, false); return s; })(), 0.94, 0.002, 'holeDark', 'ხვრელის ფსკერი');
  // წინა კარების ღრიჭო და Ø80 ხვრელი (ადგილობრივი −X — წინა მხარე)
  seamY(g, 'კარების ღრიჭო', 0.79, -0.447, 0.07 + 0.052 + 0.395, 0).rotation.y = Math.PI / 2;
  const hole = cylZ(g, 'Ø80 (ნახაზის მიხედვით)', 0.04, 0.004, -0.447, 0.07 + 0.40, 0, 'holeDark', 32);
  hole.rotation.y = Math.PI / 2;
}
// ZF-09-2 / ZF-14-3: ცილინდრი Ø700 × 1000
function roundDesk(o, g) {
  if (o.variant === '09-2') {
    cylY(g, 'ცოკოლი 70', 0.25, 0, 0.07, 0, 0, 'metalDark');
    cylY(g, 'კორპუსი Ø600 (თეთრი მქრალი)', 0.30, 0.07, 0.894, 0, 0, 'whiteMatte');
    const top = new THREE.Shape(); top.absarc(0, 0, 0.35, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0.16, -0.12, 0.05, 0, Math.PI * 2, true); top.holes.push(hole);
    P(g, top, 0.964, 0.036, 'whiteMatte', 'ზედაპირი Ø700 (ხვრელი Ø100)', 64);
    P(g, (() => { const s = new THREE.Shape(); s.absarc(0.16, -0.12, 0.05, 0, Math.PI * 2, false); return s; })(), 0.94, 0.002, 'holeDark', 'ხვრელის ფსკერი');
    // მომრგვალებული კარი 490 (წინა მხარე +Z) და Ø60 ხვრელი
    const s1 = seamY(g, 'კარის ღრიჭო', 0.79, 0.245, 0.07 + 0.052 + 0.395, Math.sqrt(0.3 ** 2 - 0.245 ** 2) + 0.001);
    const s2 = seamY(g, 'კარის ღრიჭო', 0.79, -0.245, 0.07 + 0.052 + 0.395, Math.sqrt(0.3 ** 2 - 0.245 ** 2) + 0.001);
    void s1; void s2;
    cylZ(g, 'Ø60', 0.03, 0.004, 0, 0.07 + 0.443, 0.301, 'holeDark', 24);
  } else {
    cylY(g, 'კუნძული Ø700 × 1000 (RAL 1016)', 0.35, 0, 1.0, 0, 0, 'ral1016Mdf');
    P(g, (() => { const s = new THREE.Shape(); s.absarc(0, 0, 0.075, 0, Math.PI * 2, false); return s; })(), 1.0, 0.001, 'holeDark', 'კაბელის ხვრელი Ø150');
    // დაისონის ლოგოს ადგილი: 440 × 85, ზემოდან 60 მმ — ოფიციალური ლოგოს ვექტორი არ გვაქვს (ცარიელი განათებული ზოლი)
    const geo = new THREE.CylinderGeometry(0.352, 0.352, 0.085, 32, 1, true, 0, 0.44 / 0.352);
    const m = M(g, geo, 'orgWhite', 'დაისონის ლოგოს განათებული ზოლი 440×85 (ლოგო არ არის აღდგენილი)', { cast: false });
    m.position.y = 1.0 - 0.06 - 0.0425;
    m.rotation.y = (o.logoAt ?? 0) * DEG;
  }
}

// ------------------------------------------------------------------ ZF-07: TV კუნძულები (RAL 7015)
function island(o, g) {
  const R = o.w / 2;
  let s;
  if (o.cutBy) {
    // დიდ კუნძულს აქვს ჩაჭრა მეზობელი Ø800 ცილინდრის ფორმით (ნახაზი: ქორდა 580/529, სიღრმე 100)
    const cx = o.cutBy.dx, cy = -o.cutBy.dz, r = o.cutBy.r;
    const d = Math.hypot(cx, cy), al = Math.atan2(cy, cx);
    const a = (R * R - r * r + d * d) / (2 * d), be = Math.acos(a / R);
    s = new THREE.Shape();
    s.absarc(0, 0, R, al + be, al - be + 2 * Math.PI, false);
    const pm = [R * Math.cos(al - be), R * Math.sin(al - be)], pp = [R * Math.cos(al + be), R * Math.sin(al + be)];
    const gm = Math.atan2(pm[1] - cy, pm[0] - cx), gp = Math.atan2(pp[1] - cy, pp[0] - cx);
    let span = gp - gm; while (span < 0) span += 2 * Math.PI;
    const mid = gm + span / 2;
    const ccwOk = Math.cos(mid - (al + Math.PI)) > 0;
    s.absarc(cx, cy, r, gm, gp, !ccwOk);
  } else {
    s = new THREE.Shape();
    s.absarc(0, 0, R, 0, Math.PI * 2, false);
  }
  P(g, s, 0, o.h, 'ral7015Mdf', `TV კუნძული Ø${o.w * 1000} × ${o.h * 1000} (RAL 7015)`, 96);
  P(g, (() => { const c = new THREE.Shape(); c.absarc(0, 0, 0.075, 0, Math.PI * 2, false); return c; })(), o.h, 0.001, 'holeDark', 'კაბელის ხუფი Ø150');
}

// ------------------------------------------------------------------ ZF-10-2: აუდიო სისტემების მაგიდა
// 1618 × 1090 × 900: ოვალური ფეხები 540 (750×150 სწორი და 45°), ფილა-უჯრა 100 (NCS S 1060-Y40R),
// მინის ვიტრინა 260: 3×2 უჯრედი (ნარინჯისფერი/თეთრი), ზედა მინა 10 მმ, გვერდითი 8 მმ.
function audioTable(o, g) {
  const Wx = o.w, Lz = o.d;
  const l1 = P(g, stadium(0.75, 0.15), 0, 0.54, 'ncsOrange1060', 'ფეხი 1 (სწორი 750×150)');
  l1.position.z = -Lz / 2 + 0.357;
  const l2 = P(g, stadium(0.75, 0.15), 0, 0.54, 'ncsOrange1060', 'ფეხი 2 (45° 750×150)');
  l2.position.z = -Lz / 2 + 1.011; l2.rotation.y = 45 * DEG;
  B(g, 'ფილა / უჯრა 100', Wx, 0.10, Lz, 0, 0.59, 0, 'ncsOrange1060');
  for (const sd of [1, -1]) {
    const sm = seamX(g, 'უჯრის ღრიჭო', Lz - 0.1, sd * (Wx / 2 + 0.001), 0.59, 0);
    sm.rotation.y = Math.PI / 2;
  }
  const cw = (Wx - 0.036) / 2, cl = (Lz - 0.036) / 3;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const orange = (i + j) % 2 === 0;
    B(g, `სექცია ${i + 1}.${j + 1} (${orange ? 'ნარინჯისფერი' : 'თეთრი'})`, cw - 0.018, 0.25, cl - 0.018,
      -Wx / 2 + 0.018 + cw * (i + 0.5), 0.64 + 0.125, -Lz / 2 + 0.018 + cl * (j + 0.5), orange ? 'ncsOrange1060' : 'whiteLam');
  }
  glassBox(g, 'ზედა მინა 10 მმ', Wx, 0.010, Lz, 0, 0.895, 0);
  glassBox(g, 'გვერდითი მინა 8 მმ', Wx, 0.25, 0.008, 0, 0.765, Lz / 2 - 0.004);
  glassBox(g, 'გვერდითი მინა 8 მმ', Wx, 0.25, 0.008, 0, 0.765, -Lz / 2 + 0.004);
  glassBox(g, 'გვერდითი მინა 8 მმ', 0.008, 0.25, Lz - 0.016, Wx / 2 - 0.004, 0.765, 0);
  glassBox(g, 'გვერდითი მინა 8 მმ', 0.008, 0.25, Lz - 0.016, -Wx / 2 + 0.004, 0.765, 0);
}

// ------------------------------------------------------------------ ZF-02: სათავსი „O“
// 1960 × 350 × 2050: ჩარჩო ორმაგი MDF 36, გარე R420, ღიობი 1000 × 1210 (R100, იატაკიდან 420),
// გვერდებზე და ზოლებში ლითონის ბადის უჯრედები (ორივე მხარეს, უკან თეთრი ფილა), ღიობში მინის თაროები.
function oFrame(o, g) {
  const W = 1.96, Hh = 2.05, D = 0.35, t = 0.036, Ro = 0.42;
  const oy0 = 0.42, ow = 1.0, oh = 1.21, ro = 0.10;
  const outer = rr(W, Hh, Ro, Ro);
  const opening = rr(ow + 2 * t, oh + 2 * t, ro + t, ro + t, true, 0, oy0 - t);
  // გარე და შიდა კედლები (ჩარჩოები)
  tube(g, 'გარე ჩარჩო 36 (R420)', W, Hh, t, Ro, Ro, 0, -D / 2, D, 'ncsOrange');
  const inner = rr(ow + 2 * t, oh + 2 * t, ro + t, ro + t, false, 0, oy0 - t);
  inner.holes.push(rr(ow, oh, ro, ro, true, 0, oy0));
  M(g, exZ(inner, -D / 2, D, 24), 'ncsOrange', 'ღიობის ჩარჩო 36 (R100)');
  // ტიხრები (45 მმ) უჯრედებს შორის
  const sideW = (W - ow) / 2 - 2 * t;
  for (const sx of [-1, 1]) {
    const cx = sx * (ow / 2 + t + sideW / 2);
    for (const yy of [oy0 - 0.0225, oy0 + oh / 2, oy0 + oh + 0.0225]) B(g, 'ტიხარი 45', sideW, 0.045, D, cx, yy, 0, 'ncsOrange');
  }
  // უჯრედები: ბადე ორივე ზედაპირზე + თეთრი ფილა შუაში
  const cell = rr(W - 2 * t, Hh - 2 * t, Ro - t, Ro - t, false, 0, t);
  cell.holes.push(opening);
  const wGeo = new THREE.ShapeGeometry(cell, 24);
  const wm = M(g, wGeo.clone().translate(0, 0, 0), 'whiteLam', 'თეთრი ლამინირებული ფილა (ბადის უკან)', { cast: false });
  wm.material.side = THREE.DoubleSide;
  for (const sd of [1, -1]) {
    const geo = new THREE.ShapeGeometry(cell, 24);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.04, uv.getY(i) / 0.04);
    if (sd < 0) geo.rotateY(Math.PI);
    geo.translate(0, 0, sd * (D / 2 - 0.012));
    M(g, geo, 'meshOrange', `ლითონის ბადე (${sd > 0 ? 'წინა' : 'უკანა'} მხარე)`, { cast: false });
  }
  // ღიობის მინის თაროები და ვერტიკალური მინა
  for (const k of [1, 2]) glassBox(g, `მინის თარო ${k}`, ow - 0.004, 0.008, D - 0.02, 0, oy0 + k * oh / 3, 0);
  glassBox(g, 'ვერტიკალური მინა', 0.008, oh - 0.004, D - 0.02, 0, oy0 + oh / 2, 0);
  // LED ამოფრეზილ MDF-ში (ღიობის პერიმეტრზე)
  for (const sd of [1, -1]) {
    ledX(g, 'LED (ღიობის ზედა კიდე)', ow - 0.25, 0, oy0 + oh - 0.004, sd * (D / 2 - 0.02));
    ledY(g, 'LED (ღიობის გვერდი)', oh - 0.25, -ow / 2 + 0.004, oy0 + oh / 2, sd * (D / 2 - 0.02));
    ledY(g, 'LED (ღიობის გვერდი)', oh - 0.25, ow / 2 - 0.004, oy0 + oh / 2, sd * (D / 2 - 0.02));
  }
  void outer;
}

// ------------------------------------------------------------------ ZF-06: TV კედელი (RAL 7015)
// 3800 × 3380, სიღრმე 375; ნიშა 3700 × 2880 (250-დან, ზედა კუთხეები R100, გვერდები 50), თაროები 350 და 200,
// LED ნიშის პერიმეტრზე, ტელევიზორები: 40", 55", 55" / 50", 55", 55" / 65", 75".
function tvWall(o, g) {
  const W = 3.8, Hh = 3.38, D = o.d, zB = -D / 2, zF = D / 2;
  B(g, 'ზურგი — ორმაგი თაბაშირმუყაო, RAL 7015', W, Hh, 0.025, 0, Hh / 2, zB + 0.0125, 'ral7015Mdf');
  const front = rr(W, Hh, 0, 0);
  front.holes.push(rr(3.7, 2.88, 0.10, 0, true, 0, 0.25));
  M(g, exZ(front, zF - 0.025, 0.025), 'ral7015Mdf', 'ფასადის ჩარჩო (ნიშა 3700 × 2880, R100)');
  B(g, 'ნიშის გვერდი 50', 0.05, Hh, D - 0.05, -W / 2 + 0.025, Hh / 2, 0, 'ral7015Mdf');
  B(g, 'ნიშის გვერდი 50', 0.05, Hh, D - 0.05, W / 2 - 0.025, Hh / 2, 0, 'ral7015Mdf');
  B(g, 'ნიშის ძირი', W, 0.25, D - 0.05, 0, 0.125, 0, 'ral7015Mdf');
  B(g, 'ნიშის თავი', W, 0.25, D - 0.05, 0, Hh - 0.125, 0, 'ral7015Mdf');
  B(g, 'თარო 35 სმ (ფიქსირებული)', 3.7, 0.018, 0.35, 0, 1.379, zB + 0.025 + 0.175, 'ral7015Mdf');
  B(g, 'თარო 20 სმ (ფიქსირებული)', 3.7, 0.018, 0.20, 0, 2.256, zB + 0.025 + 0.10, 'ral7015Mdf');
  ledX(g, 'LED (ნიშის ზედა პერიმეტრი)', 3.45, 0, 3.12, zF - 0.035);
  ledY(g, 'LED (ნიშის გვერდი)', 2.75, -1.845, 1.65, zF - 0.035);
  ledY(g, 'LED (ნიშის გვერდი)', 2.75, 1.845, 1.65, zF - 0.035);
  // ტელევიზორების მართკუთხედები ZGMF-15 წინხედიდან (1:30): [დიაგონალი, x-ცენტრი, y-ცენტრი, სიგანე, სიმაღლე] მ
  [[40, -1.270, 2.566, 1.118, 0.648], [55, -0.060, 2.637, 1.231, 0.677], [55, 1.200, 2.637, 1.231, 0.677],
    [50, -1.278, 1.749, 1.091, 0.651], [55, -0.082, 1.806, 1.238, 0.651], [55, 1.191, 1.826, 1.237, 0.690],
    [65, -0.904, 0.840, 1.450, 0.831], [75, 0.845, 0.925, 1.702, 1.001]]
    .forEach(([inch, x, y, tw, th], i) => {
      B(g, `ტელევიზორი ${i + 1} — ${inch}" (ნახაზის მართკუთხედი; მოდელი დაუზუსტებელი)`, tw, th, 0.045, x, y, zB + 0.06, 'tvScreen');
    });
}

// ------------------------------------------------------------------ ZF-05-2: ბანკის მაგიდა
// 700 (მომხმარებლის მხარე) × 800 × 750, თეთრი MDF პრიალა; სამუშაო მხარეს თარო პრინტერისთვის და უჯრა.
// ადგილობრივი −X — მომხმარებლის მხარე, +X — თანამშრომლის მხარე.
function bankDesk(o, g) {
  const Lx = 0.80, Wz = 0.70, Hh = 0.75, t = 0.036;
  B(g, 'ზედაპირი 36', Lx, t, Wz, 0, Hh - t / 2, 0, 'whiteLam');
  B(g, 'გვერდი 36', Lx, Hh - t, t, 0, (Hh - t) / 2, -Wz / 2 + t / 2, 'whiteLam');
  B(g, 'გვერდი 36', Lx, Hh - t, t, 0, (Hh - t) / 2, Wz / 2 - t / 2, 'whiteLam');
  B(g, 'მომხმარებლის მხარის პანელი 18', 0.018, Hh - t, Wz - 2 * t, -Lx / 2 + 0.018 + 0.009, (Hh - t) / 2, 0, 'whiteLam');
  B(g, 'მოდულის ზურგი', 0.018, Hh - t - 0.018, Wz - 2 * t, Lx / 2 - 0.10 - 0.40, (Hh - t) / 2, 0, 'whiteLam');
  B(g, 'თარო პრინტერისთვის', 0.40, 0.018, Wz - 2 * t, Lx / 2 - 0.10 - 0.20, 0.22, 0, 'whiteLam');
  B(g, 'უჯრა 184', 0.382, 0.184, Wz - 2 * t - 0.004, Lx / 2 - 0.10 - 0.20, 0.018 + 0.092, 0, 'whiteLam');
  // სკამები ავეჯის კრებულში არ არის — ძველი მოდელიდან დატოვებული, ვარაუდი
  const chair = (x, back, tag) => {
    B(g, `${tag} — სავარძელი`, 0.46, 0.06, 0.46, x, 0.46, 0, 'seat');
    B(g, `${tag} — საზურგე`, 0.04, 0.42, 0.44, x + back * 0.21, 0.72, 0, 'seat');
    cylY(g, `${tag} — საყრდენი`, 0.03, 0, 0.43, x, 0, 'frame', 12);
  };
  chair(-Lx / 2 - 0.27, -1, 'კლიენტის სკამი (ვარაუდი)');
  chair(Lx / 2 + 0.29, 1, 'თანამშრომლის სკამი (ვარაუდი)');
}

// ------------------------------------------------------------------ ZF-15-2: პალმა (სპორტული კუთხე)
// 2780: ბაზა Ø700 × 70 (შეღებილი MDF), ღერო 1960 (300 → 175, ცისფრად დაფერილი განათებული ორგმინა),
// ვარჯი 1350 × 300 × 750 (შეღებილი PVC, RAL 6034). ფოთლების კონტური — წინხედიდან მიახლოებით.
function palm(o, g) {
  cylY(g, 'ბაზა Ø700 × 70 (RAL 6034)', 0.35, 0, 0.07, 0, 0, 'ral6034Mdf', 48);
  const trunk = mesh(new THREE.CylinderGeometry(0.175 / Math.SQRT2, 0.30 / Math.SQRT2, 1.96, 4, 1), 'orgBlueLit', 'ღერო 1960 (განათებული ორგმინა)');
  trunk.rotation.y = Math.PI / 4;
  trunk.position.set(0, 0.07 + 0.98, 0);
  add(g, trunk);
  const y0 = 2.03, top = 2.78;
  const leaf = (sx, upper) => {
    // ერთი ფოთოლი (X-Y სიბრტყეში), კბილანებიანი ქვედა კიდით
    const s = new THREE.Shape();
    const tipX = sx * (upper ? 0.675 : 0.60), tipY = upper ? top - 0.17 : y0 + 0.02;
    const baseY = upper ? top - 0.02 : top - 0.27;
    s.moveTo(0, baseY);
    s.quadraticCurveTo(sx * 0.35, baseY + (upper ? 0.03 : 0.08), tipX, tipY);
    const n = 5;
    for (let k = n; k >= 1; k--) {
      const f = k / (n + 1);
      const px = tipX * f, py = baseY - (upper ? 0.16 : 0.24) * Math.sin(f * Math.PI) - 0.02;
      s.lineTo(px + sx * 0.03, py + 0.05);
      s.lineTo(px, py);
    }
    s.lineTo(0, baseY - 0.08);
    s.closePath();
    const m = M(g, exZ(s, -0.15 + (upper ? 0.20 : 0.05), 0.05), 'ral6034Mdf', `ფოთოლი (${upper ? 'ზედა' : 'ქვედა'}, PVC RAL 6034)`);
    return m;
  };
  for (const sx of [-1, 1]) { leaf(sx, true); leaf(sx, false); }
}

// ------------------------------------------------------------------ ZF-15-3: PlayStation-ის სიმბოლოების ტოტემი
// 550 × 500 × 2490: ბაზა Ø550 × 70, საყრდენი 140 × 130 × 300, □ 550, ✕ 550, ○ 470, △ 550 (ზოლი 128).
// სიმბოლოების წინა/უკანა ზედაპირი — ლურჯად დაფერილი განათებული ორგმინა, გვერდები — შეღებილი PVC RAL 5022.
function totem(o, g) {
  const D = 0.50, b = 0.128, mats = [mat('orgNavyLit'), mat('ral5022Mdf')];
  const piece = (shape, y0, name) => {
    const geo = exZ(shape, -D / 2, D, 32);
    geo.translate(0, y0, 0);
    const m = new THREE.Mesh(geo, mats);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
    return add(g, m);
  };
  cylY(g, 'ბაზა Ø550 × 70 (შეღებილი MDF)', 0.275, 0, 0.07, 0, 0, 'ral5022Mdf', 48);
  B(g, 'საყრდენი 140 × 130 × 300', 0.14, 0.30, 0.13, 0, 0.22, 0, 'ral5022Mdf');
  let y = 0.37;
  const sq = rr(0.55, 0.55, 0, 0); sq.holes.push(rr(0.55 - 2 * b, 0.55 - 2 * b, 0, 0, true, 0, b));
  piece(sq, y, '□ კვადრატი 550'); y += 0.55;
  const x = new THREE.Shape();
  const hb = b / Math.SQRT2, e = 0.275;
  x.moveTo(-e, -e + hb * 2); x.lineTo(-e + hb * 2, -e); x.lineTo(0, -hb * 2 + 0.0001); x.lineTo(e - hb * 2, -e); x.lineTo(e, -e + hb * 2);
  x.lineTo(hb * 2, 0); x.lineTo(e, e - hb * 2); x.lineTo(e - hb * 2, e); x.lineTo(0, hb * 2); x.lineTo(-e + hb * 2, e); x.lineTo(-e, e - hb * 2); x.lineTo(-hb * 2, 0);
  x.closePath();
  const xg = piece(x, y + 0.275, '✕ ჯვარი 550'); void xg; y += 0.55;
  const ring = new THREE.Shape(); ring.absarc(0, 0, 0.275, 0, Math.PI * 2, false);
  const rh = new THREE.Path(); rh.absarc(0, 0, 0.275 - b, 0, Math.PI * 2, true); ring.holes.push(rh);
  piece(ring, y + 0.235, '○ წრე Ø550 (სიმაღლის წილი 470)'); y += 0.47;
  const tri = new THREE.Shape([new THREE.Vector2(-0.275, 0), new THREE.Vector2(0.275, 0), new THREE.Vector2(0, 0.55)]);
  const ti = new THREE.Path([new THREE.Vector2(-0.07, 0.17), new THREE.Vector2(0, 0.31), new THREE.Vector2(0.07, 0.17)]);
  tri.holes.push(ti);
  piece(tri, y, '△ სამკუთხედი 550');
}

// ------------------------------------------------------------------ ZF-18: სმარტ კედელი
// 2390 = 120 + 2150 + 120; სახლის ფორმა: კარნიზი 1750, ქედი 2590, ჩარჩო 120 (R140), სიღრმე 560;
// ზურგი — პერფორირებული ფილა (ხვრელები 300 × 200 ბიჯით), თაროები N1 3×715, N2 3×550 (350 სიღრმე),
// N3 სათავსი 1120 × 220 × 500, N4 ბაზა 1630 × 350 × 100, N5 დაისონის დამჭერი ×3, წარწერა „SMART HOME“.
function smartWall(o, g) {
  const W = o.w, E = o.eave, Hr = o.h, D = o.d, t = 0.12, zB = -D / 2, zF = D / 2;
  const half = W / 2, al = Math.atan2(Hr - E, half), ci = t / Math.cos(al);
  const Ei = E - ci + t * Math.tan(al), Hi = Hr - ci;
  const r = 0.14;
  const fr = new THREE.Shape();
  const toward = (ax, ay, bx, by, d) => { const L = Math.hypot(bx - ax, by - ay); return [ax + (bx - ax) * d / L, ay + (by - ay) * d / L]; };
  fr.moveTo(-half, 0);
  fr.lineTo(...toward(-half, E, -half, 0, r)); fr.quadraticCurveTo(-half, E, ...toward(-half, E, 0, Hr, r));
  fr.lineTo(...toward(0, Hr, -half, E, r)); fr.quadraticCurveTo(0, Hr, ...toward(0, Hr, half, E, r));
  fr.lineTo(...toward(half, E, 0, Hr, r)); fr.quadraticCurveTo(half, E, ...toward(half, E, half, 0, r));
  fr.lineTo(half, 0); fr.lineTo(half - t, 0);
  fr.lineTo(...toward(half - t, Ei, half - t, 0, r * 0.6)); fr.quadraticCurveTo(half - t, Ei, ...toward(half - t, Ei, 0, Hi, r * 0.6));
  fr.lineTo(...toward(0, Hi, half - t, Ei, r)); fr.quadraticCurveTo(0, Hi, ...toward(0, Hi, -half + t, Ei, r));
  fr.lineTo(...toward(-half + t, Ei, 0, Hi, r * 0.6)); fr.quadraticCurveTo(-half + t, Ei, ...toward(-half + t, Ei, -half + t, 0, r * 0.6));
  fr.lineTo(-half + t, 0); fr.closePath();
  M(g, exZ(fr, zB, D, 16), 'ral1016Mdf', 'სახლის ფორმის ჩარჩო 120 (R140)');
  // ზურგი — პერფორირებული ფილა
  const bk = new THREE.Shape([new THREE.Vector2(-half + t, 0), new THREE.Vector2(half - t, 0), new THREE.Vector2(half - t, Ei), new THREE.Vector2(0, Hi), new THREE.Vector2(-half + t, Ei)]);
  M(g, exZ(bk, zB, 0.018), 'pegYellow', 'პერფორირებული ზურგი (ხვრელები 300 × 200)');
  const zs = zB + 0.018, ix = -half + t, iw = W - 2 * t;
  for (let k = 0; k < 3; k++) B(g, `თარო N1 715 × 350 #${k + 1}`, 0.715 - 0.004, 0.036, 0.35, ix + 0.3575 + k * 0.715, 1.626, zs + 0.175, 'ral1016Mdf');
  for (let k = 0; k < 3; k++) B(g, `თარო N2 550 × 350 #${k + 1}`, 0.55 - 0.004, 0.036, 0.35, ix + iw - 1.65 + 0.275 + k * 0.55, 1.223, zs + 0.175, 'ral1016Mdf');
  [0.26, 0.561, 0.862].forEach((xx, k) => {
    for (const s of [-1, 1]) B(g, `დაისონის დამჭერი N5 #${k + 1}`, 0.036, 0.112, 0.24, ix + xx + s * 0.038, 0.989, zs + 0.12, 'ral1016Mdf');
  });
  B(g, 'სათავსი N3 1120 × 220 × 500', 1.12, 0.22, 0.50, ix + iw - 0.56, 0.49, zs + 0.25, 'ral1016Mdf');
  B(g, 'ბაზა მტვერსასრუტებისთვის N4 1630 × 350 × 100', 1.63, 0.10, 0.35, ix + 0.815, 0.18, zs + 0.175, 'ral1016Mdf');
  ledY(g, 'LED (ჩარჩოს შიდა კიდე)', E - 0.2, -half + t + 0.004, E / 2, zF - 0.02);
  ledY(g, 'LED (ჩარჩოს შიდა კიდე)', E - 0.2, half - t - 0.004, E / 2, zF - 0.02);
  // „SMART HOME“ — მარჯვენა ფერდზე (თეთრი ორგმინა, განათებული)
  const tg = text(g, 'SMART HOME', 0.085, 0.015, 'orgWhite', 'წარწერა „SMART HOME“ (ორგმინა, განათებული)');
  const bb = tg.geometry.boundingBox;
  tg.geometry.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
  const mx = half / 2, my = (E + Hr) / 2;
  tg.rotation.z = -al;
  tg.position.set(mx + Math.sin(al) * 0.03, my + Math.cos(al) * 0.03, zF - 0.10);
}
// ZF-12: პედესტალი დაისონის მტვერსასრუტებისთვის — R500, სიმაღლე 100, ¾ წრე ყუთის გარშემო (RAL 1016)
function pedestal34(o, g) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.absarc(0, 0, o.r, Math.PI / 2, Math.PI * 2, false);
  s.closePath();
  P(g, s, 0, o.h, 'ral1016Mdf', 'პედესტალი R500 × 100', 48);
}

export const BUILDERS = { vitrine, pegWall, gondola, demoTable, cashDesk, checkDesk, roundDesk, island, audioTable, oFrame, tvWall, bankDesk, palm, totem, smartWall, pedestal34 };
export const SHEETS = {
  vitrine: (o) => VITRINES[o.variant], demoTable: (o) => TABLES[o.variant],
};

// ------------------------------------------------------------------ ერთი ავეჯის მეშების გაერთიანება მასალების მიხედვით
// (ნაკლები draw call — რბილი ტრიალი ტელეფონზეც). ობიექტის ჯგუფი, სახელი და ინფორმაცია უცვლელია.
export function mergeByMaterial(group, code) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const keep = [];
  group.traverse((o) => {
    if (!o.isMesh || o === group) return;
    if (Array.isArray(o.material)) { keep.push(o); return; }
    const key = o.material.uuid + (o.userData.noPick ? ':np' : '');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [], noPick: !!o.userData.noPick, cast: o.castShadow, names: [] });
    const b = buckets.get(key);
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    b.geos.push(geo);
    b.names.push(o.name);
  });
  const kept = keep.map((o) => {
    const m = o.clone();
    new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).decompose(m.position, m.quaternion, m.scale);
    return m;
  });
  while (group.children.length) group.remove(group.children[0]);
  for (const b of buckets.values()) {
    const geo = mergeVertices(mergeGeometries(b.geos, false), 1e-5);
    const m = new THREE.Mesh(geo, b.mat);
    const label = b.mat.userData?.colorCode || b.mat.name;
    m.name = `${code} / ${label}`;
    m.castShadow = b.cast; m.receiveShadow = true;
    if (b.noPick) m.userData.noPick = true;
    m.userData.parts = [...new Set(b.names.map((n) => n.replace(/ #\d+$/, '')))].slice(0, 40);
    group.add(m);
  }
  kept.forEach((m) => group.add(m));
}
