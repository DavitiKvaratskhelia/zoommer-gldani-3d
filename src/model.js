// ზუმერი — გლდანი მოლი · 3D გეომეტრიის აგება config.js-ის მიხედვით.
// იყენებს მხოლოდ three.js-ს (DOM-ის გარეშე) — მუშაობს ბრაუზერშიც და Node-შიც.
import * as THREE from 'three';
import {
  H, T, P, COLORS, WALLS, BOXES_INTERIOR, WALL_FINISHES, GLAZING, FACADE, DOORS,
  COLUMNS, FLOOR_OUTLINE, CEILING_OUTLINE, INLAYS, FURNITURE, concreteXAt,
} from './config.js';

const DEG = Math.PI / 180;
const STATUS_TXT = { pdf: 'PDF', measured: 'ნახაზიდან გაზომილი', assumed: 'ვარაუდი' };

// ------------------------------------------------------------------ მასალები
const matCache = new Map();
export function mat(key) {
  if (matCache.has(key)) return matCache.get(key);
  const c = COLORS[key];
  if (!c) throw new Error('უცნობი მასალა: ' + key);
  const m = new THREE.MeshStandardMaterial({
    name: key,
    color: new THREE.Color(c.c),
    roughness: c.r ?? 0.7,
    metalness: c.m ?? 0,
  });
  if (c.opacity !== undefined) {
    m.transparent = true;
    m.opacity = c.opacity;
    m.depthWrite = false;
  }
  matCache.set(key, m);
  return m;
}

// ------------------------------------------------------------------ დამხმარეები
function mesh(geo, matKey, name, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat(matKey));
  m.name = name;
  m.castShadow = cast && !COLORS[matKey].opacity;
  m.receiveShadow = receive;
  return m;
}

// ღერძებთან პარალელური ყუთი [x0,x1]×[y0,y1]×[z0,z1]
function aabb(name, x, y, z, matKey, opts) {
  const g = new THREE.BoxGeometry(Math.abs(x[1] - x[0]), Math.abs(y[1] - y[0]), Math.abs(z[1] - z[0]));
  const m = mesh(g, matKey, name, opts);
  m.position.set((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
  return m;
}

// ლოკალური ყუთი: ცენტრი (cx, cy, cz), ზომები (sx, sy, sz)
function lbox(name, sx, sy, sz, cx, cy, cz, matKey, opts) {
  const m = mesh(new THREE.BoxGeometry(sx, sy, sz), matKey, name, opts);
  m.position.set(cx, cy, cz);
  return m;
}

function cyl(name, r, h, cx, cy0, cz, matKey, seg = 32, opts) {
  const m = mesh(new THREE.CylinderGeometry(r, r, h, seg), matKey, name, opts);
  m.position.set(cx, cy0 + h / 2, cz);
  return m;
}

// იატაკის გეგმის კონტური (x, z) → THREE.Shape (shape-ის y = −z)
function shapeFromPoints(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}

// path: ['M',x,z] ['L',x,z] ['A',cx,cz,r,a0,a1]
function shapeFromPath(path) {
  const s = new THREE.Shape();
  for (const seg of path) {
    if (seg[0] === 'M') s.moveTo(seg[1], -seg[2]);
    else if (seg[0] === 'L') s.lineTo(seg[1], -seg[2]);
    else if (seg[0] === 'A') {
      const [, cx, cz, r, a0, a1] = seg;
      // გეგმაზე კუთხე იზომება +X → +Z; shape-ში y = −z, ამიტომ კუთხე იცვლის ნიშანს
      s.absarc(cx, -cz, r, -a0 * DEG, -a1 * DEG, a1 > a0);
    }
  }
  return s;
}

// ბრტყელი ფიგურის ამოწევა: y0-დან height-მდე (გეგმის კოორდინატებში)
function flatExtrude(shape, y0, height, curveSegments = 48) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments });
  g.rotateX(-Math.PI / 2); // shape (x, y, extrude z) → world (x, z_extrude, −y)
  g.translate(0, y0, 0);
  return g;
}

function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  r = Math.min(r, w / 2, d / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function info(obj, data) {
  obj.userData.info = data;
  return obj;
}

function fmt(v) { return v.toFixed(2); }

// ------------------------------------------------------------------ კედლები
function buildWall(w) {
  const g = new THREE.Group();
  g.name = `${w.id} ${w.name}`;
  const [ax, az] = w.a, [bx, bz] = w.b;
  const len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len, uz = (bz - az) / len;
  // მარცხენა ნორმალი გეგმაზე (Z ქვემოთ): (uz, −ux)
  const sgn = w.side === 'L' ? 1 : -1;
  const nx = uz * sgn, nz = -ux * sgn;
  const rotY = Math.atan2(-uz, ux);

  const piece = (s0, s1, y0, y1, tag) => {
    if (s1 - s0 < 1e-4 || y1 - y0 < 1e-4) return;
    const m = mesh(new THREE.BoxGeometry(s1 - s0, y1 - y0, w.t), w.mat, `${w.id} ${tag}`);
    const sc = (s0 + s1) / 2;
    m.position.set(ax + ux * sc + nx * w.t / 2, (y0 + y1) / 2, az + uz * sc + nz * w.t / 2);
    m.rotation.y = rotY;
    g.add(m);
  };

  const ops = [...(w.openings || [])].sort((p, q) => p.s0 - q.s0);
  let s = 0;
  ops.forEach((o, i) => {
    piece(s, o.s0, 0, w.h, `segment ${i + 1}`);
    piece(o.s0, o.s1, 0, o.y0, `sill ${i + 1}`);
    piece(o.s0, o.s1, o.y1, w.h, `header ${i + 1}`);
    s = Math.max(s, o.s1);
  });
  piece(s, len, 0, w.h, `segment ${ops.length + 1}`);

  const st = w.status || {};
  info(g, {
    name: w.name, code: w.id, kind: w.group === 'exterior' ? 'გარე კედელი' : 'შიდა ტიხარი',
    size: { 'სიგრძე': fmt(len), 'სისქე': fmt(w.t), 'სიმაღლე': fmt(w.h) },
    status: { 'სიგრძე': st.len || 'pdf', 'სისქე': st.t || 'pdf', 'სიმაღლე': st.h || 'pdf' },
    note: (w.openings || []).map((o) => `ღიობი: ${o.label} — ${fmt(o.s1 - o.s0)} მ`).join('; ') || undefined,
  });
  return g;
}

function buildBoxElement(b, kind) {
  const m = aabb(`${b.id} ${b.name}`, b.x, b.y, b.z, b.mat);
  return info(m, {
    name: b.name, code: b.id, kind,
    size: { 'X': fmt(b.x[1] - b.x[0]), 'Z': fmt(b.z[1] - b.z[0]), 'სიმაღლე': fmt(b.y[1] - b.y[0]) },
    status: { 'X': b.status, 'Z': b.status, 'სიმაღლე': b.y[1] === H.partition || b.y[1] === H.ceiling ? 'assumed' : b.status },
  });
}

// ------------------------------------------------------------------ ფასადი
function buildFacade(group) {
  const f = FACADE;
  group.add(info(aabb('FAC-corner ფასადის კუთხე', f.corner.x, [0, H.extWall], f.corner.z, 'frame'),
    { name: 'ფასადის კუთხის დგარი 100×100', code: 'FAC', kind: 'ფასადი', size: { 'X': '0.10', 'Z': '0.10', 'სიმაღლე': fmt(H.extWall) }, status: { 'X': 'pdf', 'Z': 'pdf', 'სიმაღლე': 'assumed' } }));
  group.add(info(aabb('FAC-A bulkhead ვიტრაჟის ზედა კედელი A', f.bulkheadA.x, [H.glazing, H.extWall], f.bulkheadA.z, 'wallExt'),
    { name: 'ფასადი A — კედელი ვიტრაჟის ზემოთ', code: 'FAC-A', kind: 'ფასადი', size: { 'სიგრძე': fmt(f.bulkheadA.x[1] - f.bulkheadA.x[0]), 'სიმაღლე': fmt(H.extWall - H.glazing) }, status: { 'სიგრძე': 'pdf', 'სიმაღლე': 'assumed' } }));
  group.add(info(aabb('FAC-B bulkhead ვიტრაჟის ზედა კედელი B', f.bulkheadB.x, [H.glazing, H.extWall], f.bulkheadB.z, 'wallExt'),
    { name: 'ფასადი B — კედელი ვიტრაჟის ზემოთ', code: 'FAC-B', kind: 'ფასადი', size: { 'სიგრძე': fmt(f.bulkheadB.z[1] - f.bulkheadB.z[0]), 'სიმაღლე': fmt(H.extWall - H.glazing) }, status: { 'სიგრძე': 'pdf', 'სიმაღლე': 'assumed' } }));
  group.add(info(aabb('FAC-A sign band ნარინჯისფერი ზოლი A', f.bandA.x, [H.signBandBottom, H.signBandTop], f.bandA.z, 'signBand'),
    { name: 'ფასადი A — ალუმინის კომპოზიტის ზოლი RAL 2003', code: 'ZGMP-14', kind: 'ფასადი', size: { 'სიგრძე': fmt(f.bandA.x[1] - f.bandA.x[0]), 'სიმაღლე': '0.80' }, status: { 'სიგრძე': 'pdf', 'სიმაღლე': 'pdf' }, note: 'წარწერა „ზუმერი / zoommer“ მოდელში არ არის ჩართული' }));
  group.add(info(aabb('FAC-B sign band ნარინჯისფერი ზოლი B', f.bandB.x, [H.signBandBottom, H.signBandTop], f.bandB.z, 'signBand'),
    { name: 'ფასადი B — ალუმინის კომპოზიტის ზოლი RAL 2003', code: 'ZGMP-14', kind: 'ფასადი', size: { 'სიგრძე': fmt(f.bandB.z[1] - f.bandB.z[0]), 'სიმაღლე': '0.80' }, status: { 'სიგრძე': 'pdf', 'სიმაღლე': 'pdf' }, note: 'წარწერა „ზუმერი / zoommer“ მოდელში არ არის ჩართული' }));

  for (const gz of GLAZING) {
    const g = new THREE.Group();
    g.name = `${gz.id} ${gz.name}`;
    const len = gz.to - gz.from, mid = (gz.from + gz.to) / 2, j = f.jamb;
    const along = (s0, s1, y0, y1, th, matKey, tag) => {
      const m = gz.axis === 'x'
        ? aabb(`${gz.id} ${tag}`, [s0, s1], [y0, y1], [gz.at - th / 2, gz.at + th / 2], matKey)
        : aabb(`${gz.id} ${tag}`, [gz.at - th / 2, gz.at + th / 2], [y0, y1], [s0, s1], matKey);
      g.add(m);
    };
    along(gz.from + j, gz.to - j, 0.03, H.glazing - 0.04, T.glass, 'glass', 'მინა');
    along(gz.from, gz.to, 0, 0.03, 0.06, 'frame', 'ქვედა პროფილი');
    along(gz.from, gz.to, H.glazing - 0.04, H.glazing, 0.06, 'frame', 'ზედა პროფილი');
    along(gz.from, gz.from + j, 0, H.glazing, 0.08, 'frame', 'დგარი 1');
    along(gz.to - j, gz.to, 0, H.glazing, 0.08, 'frame', 'დგარი 2');
    g.children.forEach((c) => { if (c.material.name === 'glass') c.userData.noPick = true; });
    info(g, { name: gz.name, code: gz.id, kind: 'ვიტრაჟი (12 მმ ნაწრთობი მინა)', size: { 'სიგრძე': fmt(len), 'სიმაღლე': fmt(H.glazing) }, status: { 'სიგრძე': gz.status, 'სიმაღლე': 'pdf' }, note: 'ჩარჩოს პროფილები — ვარაუდი' });
    void mid;
    group.add(g);
  }
}

// ------------------------------------------------------------------ კარები
function buildDoor(d) {
  const at = d.at ?? (concreteXAt((d.from + d.to) / 2) + T.concrete / 2);
  const th = 0.04;
  const m = d.axis === 'x'
    ? aabb(`${d.id} ${d.name}`, [d.from, d.to], [0, d.h], [at - th / 2, at + th / 2], 'door')
    : aabb(`${d.id} ${d.name}`, [at - th / 2, at + th / 2], [0, d.h], [d.from, d.to], 'door');
  return info(m, {
    name: d.name, code: d.id, kind: 'კარი',
    size: { 'სიგანე': fmt(d.to - d.from), 'სიმაღლე': fmt(d.h) },
    status: { 'სიგანე': d.status.w, 'სიმაღლე': d.status.h },
  });
}

// ------------------------------------------------------------------ ავეჯი
// ავეჯის ფორმები — ზომები „ZGMF - ავეჯი - Update 2.pdf“-ის მიხედვით (ფურცლები ZGMF-01…26).
const F = {
  // ZF-01-1 / 01-7: 1000×350×2050, კორპუსი 1800 ცოკოლზე 250 (700×200).
  // ZF-01-6 / 01-5A / 01-B: კორპუსი 1800 ჰაერში, 250 მმ იატაკიდან, Ø100 მილზე (იატაკიდან ჭერამდე),
  // მილის ზონა უკან 100 მმ.
  unit(o, g) {
    const { w, d, h } = o;
    const main = o.color || 'furnOrange';
    const y0 = 0.25;                        // კორპუსის ქვედა ნიშნული
    const zb = o.pipe ? -d / 2 + 0.10 : -d / 2; // კორპუსის უკანა წახნაგი
    const bd = d / 2 - zb;                  // კორპუსის სიღრმე
    const zc = (zb + d / 2) / 2;
    const lc = o.lower ?? 0.51;              // ქვედა (დახურული) სათავსის სიმაღლე
    const t = 0.036;
    if (o.pipe) {
      g.add(cyl('ავეჯის მილი Ø100 (იატაკიდან ჭერამდე)', 0.05, H.ceiling, 0, 0, -d / 2 + 0.05, main, 20));
    } else {
      g.add(lbox('ცოკოლი 700×200', 0.70, y0, 0.20, 0, y0 / 2, zb + 0.10, main));
    }
    g.add(lbox('ქვედა სათავსი', w, lc, bd, 0, y0 + lc / 2, zc, main));
    const uy0 = y0 + lc, uh = h - uy0;
    g.add(lbox('უკანა პანელი', w - 2 * t, uh - t, 0.018, 0, uy0 + (uh - t) / 2, zb + 0.009, 'furnWhite'));
    g.add(lbox('გვერდი 1', t, uh, bd, -w / 2 + t / 2, uy0 + uh / 2, zc, main));
    g.add(lbox('გვერდი 2', t, uh, bd, w / 2 - t / 2, uy0 + uh / 2, zc, main));
    g.add(lbox('სახურავი', w, t, bd, 0, h - t / 2, zc, main));
    const n = o.shelves ?? 3;
    for (let i = 1; i <= n; i++) {
      const y = uy0 + (uh - t) * i / (n + 1);
      g.add(lbox(`თარო ${i}`, w - 2 * t, 0.018, bd - 0.05, 0, y, zc - 0.02, 'furnWhite'));
    }
    const glass = lbox('მინის კარი', w - 2 * t, uh - t, 0.008, 0, uy0 + (uh - t) / 2, d / 2 - 0.01, 'furnGlass');
    glass.userData.noPick = true;
    g.add(glass);
  },
  // ZF-16-1 (2000) / ZF-16-2 (3000): 350 სიღრმე, 2050 სიმაღლე; ცოკოლი 250 (გვერდებიდან 150 შეწეული),
  // სათავსი 275, ზემოთ პერფორირებული პანელი 1525 (სიღრმე 140) კაკვებით.
  peg(o, g) {
    const { w, d, h } = o;
    const zb = -d / 2;
    g.add(lbox('ცოკოლი', w - 0.30, 0.25, 0.20, 0, 0.125, zb + 0.10, 'furnOrange'));
    g.add(lbox('სათავსი', w, 0.275, d, 0, 0.25 + 0.1375, 0, 'furnOrange'));
    const py0 = 0.525, ph = h - py0, pd = 0.14, t = 0.036;
    g.add(lbox('პერფორირებული პანელი', w - 2 * t, ph - 2 * t, 0.02, 0, py0 + ph / 2, zb + 0.10, 'furnGray'));
    g.add(lbox('ჩარჩო — გვერდი 1', t, ph, pd, -w / 2 + t / 2, py0 + ph / 2, zb + pd / 2, 'furnOrange'));
    g.add(lbox('ჩარჩო — გვერდი 2', t, ph, pd, w / 2 - t / 2, py0 + ph / 2, zb + pd / 2, 'furnOrange'));
    g.add(lbox('ჩარჩო — ზედა', w, t, pd, 0, h - t / 2, zb + pd / 2, 'furnOrange'));
    const n = Math.max(2, Math.round(w / 0.5));
    for (let r = 0; r < 4; r++) {
      const y = py0 + 0.20 + r * 0.363;
      g.add(lbox(`კაკვების რიგი ${r + 1}`, w - 0.15, 0.015, 0.012, 0, y, zb + 0.12, 'frame'));
      for (let i = 0; i < n; i++) {
        const k = lbox(`კაკვი ${r + 1}.${i + 1}`, 0.008, 0.008, 0.21, -w / 2 + (i + 0.5) * w / n, y, zb + 0.225, 'frame');
        k.castShadow = false;
        g.add(k);
      }
    }
  },
  // ZF-03-1 / 03-2 (2000×1000) და ZF-03-3 (2500×1000): სიმაღლე 900 — ზედა კორპუსი 400
  // (თეთრი ზედაპირი), ფეხები 500 (ოვალური 150×650 MDF, ძირითადად 2, ZF-03-3-ზე 3).
  table(o, g) {
    const { w, d, h } = o;
    const r = 0.15, legH = 0.50, boxH = h - legH;
    g.add(mesh(flatExtrude(roundedRect(w, d, r), h - 0.018, 0.018, 8), 'furnWhite', 'ზედაპირი (თეთრი)'));
    g.add(mesh(flatExtrude(roundedRect(w, d, r), legH, boxH - 0.018, 8), 'furnOrange', 'კორპუსი / სათავსები'));
    const along = w >= d ? 'x' : 'z', L = Math.max(w, d);
    const nLegs = L > 2.2 ? 3 : 2;
    for (let i = 0; i < nLegs; i++) {
      const p = -L / 2 + L * (i + 0.5) / nLegs;
      const leg = mesh(flatExtrude(roundedRect(along === 'x' ? 0.15 : 0.65, along === 'x' ? 0.65 : 0.15, 0.075), 0, legH, 12), 'furnOrange', `ფეხი ${i + 1}`);
      leg.position[along] = p;
      g.add(leg);
    }
  },
  // ZF-08: გარე R1950, შიდა R1500, სიმაღლე 1100; შიდა სამუშაო მაგიდა R1200–R1500.
  ring(o, g) {
    const sector = (r0, r1) => {
      const s = new THREE.Shape();
      const a0 = o.a0 * DEG, a1 = o.a1 * DEG;
      s.absarc(0, 0, r1, -a0, -a1, true);
      s.absarc(0, 0, r0, -a1, -a0, false);
      s.closePath();
      return s;
    };
    g.add(mesh(flatExtrude(sector(o.rIn, o.rOut - 0.02), 0, 0.07, 96), 'furnDark', 'ცოკოლი'));
    g.add(mesh(flatExtrude(sector(o.rIn, o.rOut), 0.07, o.h - 0.07 - 0.03, 96), 'furnOrange', 'გარე დახლი'));
    g.add(mesh(flatExtrude(sector(o.rIn - 0.02, o.rOut + 0.02), o.h - 0.03, 0.03, 96), 'furnOrange', 'დახლის ზედაპირი'));
    g.add(mesh(flatExtrude(sector(o.rInner, o.rIn), o.hInner - 0.03, 0.03, 96), 'furnWhite', 'შიდა სამუშაო მაგიდა'));
    g.add(mesh(flatExtrude(sector(o.rIn - 0.03, o.rIn), 0, o.hInner - 0.03, 96), 'furnWhite', 'სამუშაო მაგიდის ფარი'));
  },
  // ZF-09-2 / ZF-14-3: ცილინდრი Ø700 × 1000.
  pedestal(o, g) {
    const r = o.w / 2;
    g.add(cyl('კორპუსი', r, o.h - 0.036, 0, 0, 0, o.color || 'furnWhite', 40));
    g.add(cyl('ზედაპირი', r, 0.036, 0, o.h - 0.036, 0, 'furnGray', 40));
  },
  // ZF-07: ცილინდრი (Ø1000×300 ან Ø800×500).
  pouf(o, g) {
    g.add(cyl('კუნძული', o.w / 2, o.h, 0, 0, 0, 'pouf', 48));
  },
  // ZF-09-1: ჩეკ-დესკი სვეტთან — 1000 × 900 × 1000; ნახევარწრიული წინა მხარე R500.
  checkDesk(o, g) {
    const R = 0.45, back = 0.36;
    const dShape = (rr, bb) => {
      const s = new THREE.Shape();
      s.moveTo(-rr, bb); s.lineTo(-rr, 0);
      s.absarc(0, 0, rr, Math.PI, 0, false); // რკალი წინ (shape −y = გეგმის +z)
      s.lineTo(rr, bb); s.closePath();
      return s;
    };
    // shape-ის +y = გეგმის −z (უკანა მხარე სვეტისკენ), რკალი — წინ (+z)
    g.add(mesh(flatExtrude(dShape(R - 0.05, back), 0, 0.07, 48), 'furnGray', 'ცოკოლი'));
    g.add(mesh(flatExtrude(dShape(R, back), 0.07, 0.894, 48), 'furnWhite', 'კორპუსი'));
    g.add(mesh(flatExtrude(dShape(0.50, back + 0.03), 0.964, 0.036, 48), 'furnWhite', 'ზედაპირი R500'));
  },
  // ZF-10-2: 1618 × 1090 × 900 — ფეხები 540, ფილა 100, მინის ვიტრინა 260.
  audio(o, g) {
    const { w, d, h } = o;
    // ფეხები: გრძელი მხარის (d = 1618) გასწვრივ 150-იანი და 654-იანი, მოკლე მხარეს 750
    g.add(lbox('ფეხი 1', 0.75, 0.54, 0.15, 0, 0.27, -d / 2 + 0.357 + 0.075, 'furnOrange'));
    g.add(lbox('ფეხი 2', 0.75, 0.54, 0.654, 0, 0.27, d / 2 - 0.607 - 0.327, 'furnOrange'));
    g.add(lbox('ფილა / უჯრა', w, 0.10, d, 0, 0.59, 0, 'furnOrange'));
    const gy = 0.64, gh = h - gy;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
      const c = lbox(`სექცია ${i + 1}.${j + 1}`, w / 2 - 0.03, gh - 0.02, d / 3 - 0.03, (i - 0.5) * w / 2, gy + (gh - 0.02) / 2, (j - 1) * d / 3, (i + j) % 2 ? 'furnWhite' : 'furnOrange');
      c.castShadow = false;
      g.add(c);
    }
    const top = lbox('მინის ყუთი', w, gh, d, 0, gy + gh / 2, 0, 'furnGlass');
    top.userData.noPick = true;
    g.add(top);
  },
  // ZF-04: 2000 × 400 × 1500 — ცოკოლი 70, სათავსი 230, ორმხრივი პერფორირებული პანელი 1200 (1960 სიგანე).
  gondola(o, g) {
    const { w, d, h } = o;
    g.add(lbox('ცოკოლი', w - 0.10, 0.07, d - 0.10, 0, 0.035, 0, 'furnOrange'));
    g.add(lbox('სათავსი', w, 0.23, d, 0, 0.07 + 0.115, 0, 'furnOrange'));
    const py0 = 0.30, ph = h - py0, t = 0.02;
    g.add(lbox('პერფორირებული პანელი', 1.96 - 2 * t, ph - 2 * t, 0.12, 0, py0 + ph / 2, 0, 'furnGray'));
    g.add(lbox('ჩარჩო — გვერდი 1', t, ph, 0.14, -0.98 + t / 2, py0 + ph / 2, 0, 'furnOrange'));
    g.add(lbox('ჩარჩო — გვერდი 2', t, ph, 0.14, 0.98 - t / 2, py0 + ph / 2, 0, 'furnOrange'));
    g.add(lbox('ჩარჩო — ზედა', 1.96, t, 0.14, 0, h - t / 2, 0, 'furnOrange'));
    for (let r = 0; r < 3; r++) for (const sd of [-1, 1]) {
      const k = lbox(`კაკვების რიგი ${r + 1}`, 1.76, 0.012, 0.13, 0, py0 + 0.25 + r * 0.38, sd * 0.13, 'frame');
      k.castShadow = false;
      g.add(k);
    }
  },
  // ZF-02 („სათავსი O“): 1960 × 350 × 2050, შუაში ღიობი 1000 × 1210 (იატაკიდან 420-ზე).
  oFrame(o, g) {
    const { w, d, h } = o;
    const s = new THREE.Shape();
    const R = 0.42, hw = w / 2;
    s.moveTo(-hw + R, 0); s.lineTo(hw - R, 0); s.quadraticCurveTo(hw, 0, hw, R);
    s.lineTo(hw, h - R); s.quadraticCurveTo(hw, h, hw - R, h);
    s.lineTo(-hw + R, h); s.quadraticCurveTo(-hw, h, -hw, h - R);
    s.lineTo(-hw, R); s.quadraticCurveTo(-hw, 0, -hw + R, 0);
    const hole = new THREE.Path();
    const ow = 1.0, oy0 = 0.42, oy1 = 0.42 + 1.21, r2 = 0.10;
    hole.moveTo(-ow / 2 + r2, oy0); hole.lineTo(ow / 2 - r2, oy0); hole.quadraticCurveTo(ow / 2, oy0, ow / 2, oy0 + r2);
    hole.lineTo(ow / 2, oy1 - r2); hole.quadraticCurveTo(ow / 2, oy1, ow / 2 - r2, oy1);
    hole.lineTo(-ow / 2 + r2, oy1); hole.quadraticCurveTo(-ow / 2, oy1, -ow / 2, oy1 - r2);
    hole.lineTo(-ow / 2, oy0 + r2); hole.quadraticCurveTo(-ow / 2, oy0, -ow / 2 + r2, oy0);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 12 });
    geo.translate(0, 0, -d / 2);
    g.add(mesh(geo, 'furnOrange', 'კორპუსი (O-ფორმა)'));
    [0.42 + 0.403, 0.42 + 0.806].forEach((y, i) => {
      const sh = lbox(`მინის თარო ${i + 1}`, ow, 0.008, d - 0.02, 0, y, 0, 'furnGlass');
      sh.userData.noPick = true;
      g.add(sh);
    });
  },
  // ZF-15-3: PlayStation ტოტემი — 550 × 500 × 2490 (ბაზა Ø550×70, საყრდენი 140×130×300,
  // კვადრატი 550, X 550, O 470, სამკუთხედი 550).
  totem(o, g) {
    const W = o.w, D = o.d;
    g.add(cyl('ბაზა Ø550', 0.275, 0.07, 0, 0, 0, 'furnGray', 40));
    g.add(lbox('საყრდენი', 0.14, 0.30, 0.13, 0, 0.07 + 0.15, 0, 'furnGray'));
    let y = 0.37;
    // კვადრატი (ჩარჩო)
    const fr = 0.128;
    g.add(lbox('□ ზედა', W, fr, D, 0, y + 0.55 - fr / 2, 0, 'furnWhite'));
    g.add(lbox('□ ქვედა', W, fr, D, 0, y + fr / 2, 0, 'furnWhite'));
    g.add(lbox('□ მარცხენა', fr, 0.55, D, -W / 2 + fr / 2, y + 0.275, 0, 'furnWhite'));
    g.add(lbox('□ მარჯვენა', fr, 0.55, D, W / 2 - fr / 2, y + 0.275, 0, 'furnWhite'));
    y += 0.55;
    // X
    [45, -45].forEach((a, i) => {
      const bar = lbox(`✕ ზოლი ${i + 1}`, 0.70, fr, D, 0, y + 0.275, 0, 'furnGray');
      bar.rotation.z = a * DEG;
      g.add(bar);
    });
    y += 0.55;
    // O (რგოლი, ღერძი სიღრმის მიმართულებით)
    const ring = new THREE.Shape(); ring.absarc(0, 0, 0.275, 0, Math.PI * 2, false);
    const rh = new THREE.Path(); rh.absarc(0, 0, 0.275 - fr, 0, Math.PI * 2, true); ring.holes.push(rh);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: D, bevelEnabled: false, curveSegments: 32 });
    rg.translate(0, y + 0.235, -D / 2);
    g.add(mesh(rg, 'furnWhite', '○ რგოლი'));
    y += 0.47;
    // სამკუთხედი
    const tri = new THREE.Shape(); tri.moveTo(-W / 2, 0); tri.lineTo(W / 2, 0); tri.lineTo(0, 0.55); tri.closePath();
    const th = new THREE.Path(); th.moveTo(-0.07, 0.15); th.lineTo(0, 0.28); th.lineTo(0.07, 0.15); th.closePath(); tri.holes.push(th);
    const tg = new THREE.ExtrudeGeometry(tri, { depth: D, bevelEnabled: false });
    tg.translate(0, y, -D / 2);
    g.add(mesh(tg, 'furnGray', '△ სამკუთხედი'));
  },
  // ZF-15-2: პალმა — 2780 სიმაღლე; ბაზა Ø700×70, ღერო 1960 (300 → 175), ვარჯი 1350 × 300 × 750.
  palm(o, g) {
    g.add(cyl('ბაზა Ø700', 0.35, 0.07, 0, 0, 0, 'furnWhite', 40));
    const trunk = mesh(new THREE.CylinderGeometry(0.175 / Math.SQRT2, 0.30 / Math.SQRT2, 1.96, 4), 'furnWhite', 'ღერო');
    trunk.rotation.y = Math.PI / 4;
    trunk.position.set(0, 0.07 + 0.98, 0);
    g.add(trunk);
    const top = 0.07 + 1.96;
    [[1, 0.62, 0.30], [-1, 0.62, 0.30], [1, 0.36, -0.10], [-1, 0.36, -0.10]].forEach(([sd, yo, tilt], i) => {
      const leaf = lbox(`ფოთოლი ${i + 1}`, 0.30, 0.03, 0.675, 0, 0, sd * 0.3375, 'furnWhite');
      const pivot = new THREE.Group();
      pivot.name = `ფოთლის საყრდენი ${i + 1}`;
      pivot.position.set(0, top + yo, 0);
      pivot.rotation.x = sd * tilt;
      pivot.add(leaf);
      g.add(pivot);
    });
  },
  // ZF-18: სმარტ კედელი — 2150 + 2×120 დგარი = 2390; სახლის ფორმა: კარნიზი 1750, ქედი 2590;
  // თაროები 350 სიღრმის (N1 3×715, N2 3×550), სათავსი N3 1120, ბაზა N4 1630×350×100.
  smartHome(o, g) {
    const { w, d, h } = o;
    const t = 0.12, back = -d / 2;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, o.eave); s.lineTo(0, h); s.lineTo(-w / 2, o.eave); s.closePath();
    const panel = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.036, bevelEnabled: false }), 'ral1016', 'პერფორირებული ზურგი');
    panel.position.z = back;
    g.add(panel);
    g.add(lbox('დგარი 1 (120)', t, o.eave, d, -w / 2 + t / 2, o.eave / 2, 0, 'ral1016'));
    g.add(lbox('დგარი 2 (120)', t, o.eave, d, w / 2 - t / 2, o.eave / 2, 0, 'ral1016'));
    const slope = Math.hypot(w / 2, h - o.eave), ang = Math.atan2(h - o.eave, w / 2);
    [-1, 1].forEach((sd, i) => {
      const r = lbox(`სახურავის ზოლი ${i + 1}`, slope, t, d, sd * w / 4, (o.eave + h) / 2, 0, 'ral1016');
      r.rotation.z = -sd * ang;
      g.add(r);
    });
    const iw = w - 2 * t;
    g.add(lbox('ბაზა N4 (1630×350×100)', 1.63, 0.10, 0.35, 0, 0.05, back + 0.036 + 0.175, 'ral1016'));
    g.add(lbox('სათავსი N3 (1120)', 1.12, 0.22, 0.35, 0.30, 0.55, back + 0.036 + 0.175, 'ral1016'));
    g.add(lbox('თარო N2 (3×550)', 1.65, 0.036, 0.35, 0, 1.05, back + 0.036 + 0.175, 'ral1016'));
    g.add(lbox('თარო N1 (3×715)', Math.min(iw, 2.145), 0.036, 0.35, 0, 1.45, back + 0.036 + 0.175, 'ral1016'));
  },
  // ZF-12: პედესტალი დაისონის მტვერსასრუტებისთვის — R500, სიმაღლე 100, სვეტის ყუთის გარშემო (¾ წრე).
  pedestal34(o, g) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.absarc(0, 0, o.r, Math.PI / 2, Math.PI * 2, false); // shape-ის I მეოთხედი (გეგმაზე +x, −z) — ყუთის ადგილი
    s.closePath();
    g.add(mesh(flatExtrude(s, 0, o.h, 48), 'ral1016', 'პედესტალი R500'));
  },
  // ZF-06: TV კედელი — 3800 × 3380, სიღრმე 375; ნიშა 3700, თაროები 350 სიღრმის;
  // ტელევიზორები ნახაზის მიხედვით: 40", 55", 55" / 50", 55", 55" / 65", 75".
  tvWall(o, g) {
    const { w, d, h } = o;
    const zb = -d / 2, t = 0.15;
    g.add(lbox('ზურგი RAL 7015', w, h, 0.025, 0, h / 2, zb + 0.0125, 'ral7015'));
    g.add(lbox('ჩარჩო — მარცხენა', t, h, d, -w / 2 + t / 2, h / 2, 0, 'ral7015'));
    g.add(lbox('ჩარჩო — მარჯვენა', t, h, d, w / 2 - t / 2, h / 2, 0, 'ral7015'));
    g.add(lbox('ჩარჩო — ზედა', w, 0.25, d, 0, h - 0.125, 0, 'ral7015'));
    g.add(lbox('ჩარჩო — ქვედა', w, 0.25, d, 0, 0.125, 0, 'ral7015'));
    [1.352, 2.211].forEach((y, i) => g.add(lbox(`თარო ${i + 1} (350)`, w - 2 * t, 0.018, 0.35, 0, y, zb + 0.025 + 0.175, 'ral7015')));
    const tv = (inch) => [inch * 0.8716 * 0.0254, inch * 0.4903 * 0.0254];
    const L = -w / 2 + 0.05; // ნიშის მარცხენა კიდე
    [[40, 0.70, 2.68], [55, 1.85, 2.68], [55, 3.04, 2.68], [50, 0.70, 1.79], [55, 1.85, 1.79], [55, 3.00, 1.79], [65, 1.05, 0.80], [75, 2.71, 0.80]]
      .forEach(([inch, x, y], i) => {
        const [tw, th] = tv(inch);
        g.add(lbox(`ტელევიზორი ${i + 1} — ${inch}"`, tw, th, 0.05, L + x, y, zb + 0.06, 'furnDark'));
      });
  },
  // ZF-05-2: ბანკის მაგიდა — 700 (მომხმარებლის მხარე) × 800 × 750; თეთრი MDF.
  bankDesk(o, g) {
    const { w, d, h } = o; // w — გეგმაზე X (800), d — Z (700)
    const t = 0.036;
    g.add(lbox('ზედაპირი', w, t, d, 0, h - t / 2, 0, 'furnWhite'));
    g.add(lbox('გვერდი 1', w, h - t, t, 0, (h - t) / 2, -d / 2 + t / 2, 'furnWhite'));
    g.add(lbox('გვერდი 2', w, h - t, t, 0, (h - t) / 2, d / 2 - t / 2, 'furnWhite'));
    g.add(lbox('მომხმარებლის მხარის პანელი', t, h - t, d - 2 * t, -w / 2 + t / 2, (h - t) / 2, 0, 'furnWhite'));
    g.add(lbox('თარო პრინტერისთვის', 0.40, 0.018, d - 2 * t, w / 2 - 0.30, 0.22, 0, 'furnWhite'));
    g.add(lbox('უჯრა', 0.40, 0.184, d - 2 * t, w / 2 - 0.30, 0.11, 0, 'furnWhite'));
    const chair = (x, back, tag) => {
      g.add(lbox(`${tag} — სავარძელი`, 0.46, 0.06, 0.46, x, 0.46, 0, 'seat'));
      g.add(lbox(`${tag} — საზურგე`, 0.04, 0.42, 0.44, x + back * 0.21, 0.72, 0, 'seat'));
      g.add(cyl(`${tag} — საყრდენი`, 0.03, 0.43, x, 0, 0, 'frame', 12));
    };
    chair(-w / 2 - 0.27, -1, 'კლიენტის სკამი');
    chair(w / 2 + 0.29, 1, 'ბანკის თანამშრომლის სკამი');
  },
};

function buildFurniture(o, i) {
  const g = new THREE.Group();
  const label = o.n > 1 ? `${o.name} #${o.idx}` : o.name;
  g.name = `${o.code} ${label}`.trim();
  F[o.type](o, g);
  g.children.forEach((c) => { if (!c.name.startsWith(o.code)) c.name = `${o.code} / ${c.name}`; });
  g.position.set(o.x, 0, o.z);
  g.rotation.y = (o.rot || 0) * DEG;
  const st = o.st || {};
  const size = o.type === 'ring'
    ? { 'გარე დიამეტრი': fmt(o.rOut * 2), 'დახლის სიგანე': fmt(o.rOut - o.rIn), 'სიმაღლე': fmt(o.h) }
    : o.type === 'pedestal34' ? { 'რადიუსი': fmt(o.r), 'სიმაღლე': fmt(o.h) }
    : { 'სიგანე': fmt(o.w), 'სიღრმე': fmt(o.d), 'სიმაღლე': fmt(o.h) };
  const status = o.type === 'ring'
    ? { 'გარე დიამეტრი': st.w, 'დახლის სიგანე': st.d, 'სიმაღლე': st.h, 'მდებარეობა': st.pos }
    : o.type === 'pedestal34' ? { 'რადიუსი': st.w, 'სიმაღლე': st.h, 'მდებარეობა': st.pos }
    : { 'სიგანე': st.w, 'სიღრმე': st.d, 'სიმაღლე': st.h, 'მდებარეობა': st.pos };
  info(g, { name: label, code: o.code, kind: 'ავეჯი', zone: o.zone, size, status, id: `F-${i + 1}` });
  return g;
}

// ------------------------------------------------------------------ მთავარი
export function buildModel() {
  const root = new THREE.Group();
  root.name = 'Zoommer_Gldani_Mall_Branch';
  root.userData = { units: 'meters', origin: 'ფასადების შიდა კუთხე, იატაკის დონე', source: 'ZGMP - გეგმები - Update 6.pdf' };

  const mk = (name, ka) => { const g = new THREE.Group(); g.name = name; g.userData = { label: ka }; root.add(g); return g; };
  const groups = {
    floor: mk('Floor', 'იატაკი'),
    structure: mk('Structure_Columns', 'სვეტები'),
    exterior: mk('Exterior_Walls_Facade', 'გარე კედლები და ვიტრაჟი'),
    interior: mk('Interior_Partitions', 'შიდა ტიხრები'),
    ceiling: mk('Ceiling', 'ჭერი'),
    furniture: mk('Furniture', 'ავეჯი'),
  };

  // იატაკი
  const floor = mesh(flatExtrude(shapeFromPoints(FLOOR_OUTLINE), -H.floorSlab, H.floorSlab), 'floor', 'იატაკი — კერამოგრანიტი Z-FL-01', { cast: false });
  groups.floor.add(info(floor, { name: 'იატაკი — კერამოგრანიტი Z-FL-01', code: 'Z-FL-01', kind: 'იატაკი', size: { 'ფართი (PDF)': '312.3 მ²' }, status: { 'ფართი (PDF)': 'pdf' } }));
  INLAYS.forEach((f) => {
    const m = mesh(flatExtrude(shapeFromPath(f.path), 0.0005, H.inlay, 64), f.mat, `${f.code} ${f.name}`, { cast: false });
    groups.floor.add(info(m, { name: f.name, code: f.code, kind: 'იატაკის ვინილი', size: { 'სისქე': '≈0.004' }, status: { 'კონტური': f.status, 'სისქე': 'assumed' } }));
  });

  // სვეტები
  COLUMNS.forEach((c) => groups.structure.add(info(aabb(`${c.id} ${c.name}`, c.x, [0, H.column], c.z, 'column'), {
    name: c.name, code: c.id, kind: 'სვეტი',
    size: { 'X': fmt(c.x[1] - c.x[0]), 'Z': fmt(c.z[1] - c.z[0]), 'სიმაღლე': fmt(H.column) },
    status: { 'X': c.status, 'Z': c.status, 'სიმაღლე': 'assumed' },
  })));

  // კედლები
  WALLS.forEach((w) => groups[w.group].add(buildWall(w)));
  BOXES_INTERIOR.forEach((b) => groups.interior.add(buildBoxElement(b, 'შიდა ტიხარი')));
  WALL_FINISHES.forEach((b) => groups[b.group].add(buildBoxElement(b, 'კედლის მოპირკეთება')));
  buildFacade(groups.exterior);
  DOORS.forEach((d) => groups[d.group].add(buildDoor(d)));

  // ჭერი
  const ceil = mesh(flatExtrude(shapeFromPoints(CEILING_OUTLINE), H.ceiling, H.ceilingThk), 'ceiling', 'ჭერი — თაბაშირმუყაო RAL 9010 (4.10 მ)', { cast: false });
  groups.ceiling.add(info(ceil, { name: 'ჭერი — თაბაშირმუყაო RAL 9010', code: 'ZGMP-12', kind: 'ჭერი', size: { 'ნიშნული': fmt(H.ceiling), 'ფართი (PDF)': '≈290 მ²' }, status: { 'ნიშნული': 'pdf', 'ფართი (PDF)': 'pdf' }, note: 'სანათები, რელსები და ლაითბოქსები მოდელში არ არის' }));

  // ავეჯი
  FURNITURE.forEach((o, i) => groups.furniture.add(buildFurniture(o, i)));

  root.updateMatrixWorld(true);
  return { root, groups };
}

export { STATUS_TXT };
