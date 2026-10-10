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
const F = {
  unit(o, g) {
    const { w, d, h } = o;
    const main = o.color || 'furnOrange';
    const zb = -d / 2;
    g.add(lbox('ცოკოლი', w - 0.04, 0.10, d - 0.04, 0, 0.05, 0, main));
    g.add(lbox('ქვედა კარადა', w, 0.65, d, 0, 0.425, 0, main));
    g.add(lbox('უკანა პანელი', w - 0.04, h - 0.75, 0.025, 0, (0.75 + h) / 2, zb + 0.0125, 'furnWhite'));
    g.add(lbox('გვერდი 1', 0.03, h - 0.75, d, -w / 2 + 0.015, (0.75 + h) / 2, 0, main));
    g.add(lbox('გვერდი 2', 0.03, h - 0.75, d, w / 2 - 0.015, (0.75 + h) / 2, 0, main));
    g.add(lbox('სახურავი', w, 0.04, d, 0, h - 0.02, 0, main));
    for (let i = 1; i <= 3; i++) {
      const y = 0.75 + (h - 0.79) * i / 4;
      g.add(lbox(`თარო ${i}`, w - 0.06, 0.02, d - 0.05, 0, y, -0.02, 'furnWhite'));
    }
    const glass = lbox('მინის კარი', w - 0.06, h - 0.79, 0.008, 0, (0.75 + h - 0.04) / 2, d / 2 - 0.01, 'furnGlass');
    glass.userData.noPick = true;
    g.add(glass);
    if (o.pipe) g.add(cyl('ავეჯის მილი (4.10 მ-მდე)', 0.045, H.ceiling, 0, 0, zb + 0.06, main, 20));
  },
  peg(o, g) {
    const { w, d, h } = o;
    g.add(lbox('ცოკოლი', w - 0.04, 0.10, d - 0.04, 0, 0.05, 0, 'furnOrange'));
    g.add(lbox('ქვედა კარადა', w, 0.65, d, 0, 0.425, 0, 'furnOrange'));
    g.add(lbox('პერფორირებული პანელი', w - 0.06, h - 0.79, 0.03, 0, (0.75 + h - 0.04) / 2, -d / 2 + 0.03, 'furnGray'));
    g.add(lbox('ჩარჩო 1', 0.03, h - 0.75, d * 0.5, -w / 2 + 0.015, (0.75 + h) / 2, -d / 4, 'furnOrange'));
    g.add(lbox('ჩარჩო 2', 0.03, h - 0.75, d * 0.5, w / 2 - 0.015, (0.75 + h) / 2, -d / 4, 'furnOrange'));
    g.add(lbox('სახურავი', w, 0.04, d * 0.5, 0, h - 0.02, -d / 4, 'furnOrange'));
    const n = Math.max(2, Math.round(w / 0.5));
    for (let r = 0; r < 3; r++) {
      g.add(lbox(`კაკვების რიგი ${r + 1}`, w - 0.15, 0.015, 0.012, 0, 1.05 + r * 0.32, -d / 2 + 0.06, 'frame'));
      for (let i = 0; i < n; i++) {
        const k = lbox(`კაკვი ${r + 1}.${i + 1}`, 0.008, 0.008, 0.2, -w / 2 + (i + 0.5) * w / n, 1.05 + r * 0.32, -d / 2 + 0.16, 'frame');
        k.castShadow = false;
        g.add(k);
      }
    }
  },
  table(o, g) {
    const { w, d, h } = o;
    const r = 0.14;
    g.add(mesh(flatExtrude(roundedRect(w, d, r), h - 0.03, 0.03, 8), 'furnWhite', 'ზედაპირი'));
    g.add(mesh(flatExtrude(roundedRect(w - 0.08, d - 0.08, r * 0.8), h - 0.18, 0.15, 8), 'furnOrange', 'ფარტუკი'));
    const lx = w / 2 - 0.14, lz = d / 2 - 0.14;
    [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z], i) =>
      g.add(lbox(`ფეხი ${i + 1}`, 0.07, h - 0.18, 0.07, x, (h - 0.18) / 2, z, 'furnOrange')));
  },
  ring(o, g) {
    const sector = (r0, r1) => {
      const s = new THREE.Shape();
      const a0 = o.a0 * DEG, a1 = o.a1 * DEG;
      s.absarc(0, 0, r1, -a0, -a1, true);
      s.absarc(0, 0, r0, -a1, -a0, false);
      s.closePath();
      return s;
    };
    g.add(mesh(flatExtrude(sector(o.rIn, o.rOut), 0, o.h - 0.03, 96), 'furnOrange', 'გარე დახლი'));
    g.add(mesh(flatExtrude(sector(o.rIn - 0.02, o.rOut + 0.02), o.h - 0.03, 0.03, 96), 'furnOrange', 'დახლის ზედაპირი'));
    g.add(mesh(flatExtrude(sector(o.rInner, o.rIn), 0, o.hInner, 96), 'furnWhite', 'შიდა სამუშაო დახლი'));
  },
  pedestal(o, g) {
    const r = o.w / 2;
    g.add(cyl('კორპუსი', r, o.h - 0.03, 0, 0, 0, o.color || 'furnWhite', 40));
    g.add(cyl('ზედაპირი', r + 0.01, 0.03, 0, o.h - 0.03, 0, 'furnGray', 40));
  },
  pouf(o, g) {
    g.add(cyl('პუფი', o.w / 2, o.h, 0, 0, 0, 'pouf', 40));
  },
  audio(o, g) {
    const { w, d, h } = o;
    g.add(lbox('კორპუსი', w, h - 0.03, d, 0, (h - 0.03) / 2, 0, 'furnWhite'));
    const top = lbox('მინის სახურავი', w, 0.03, d, 0, h - 0.015, 0, 'furnGlass');
    top.userData.noPick = true;
    g.add(top);
    for (let i = 1; i < 2; i++) g.add(lbox('ტიხარი', 0.01, 0.12, d - 0.04, -w / 2 + w * i / 2, h - 0.09, 0, 'furnGray'));
    for (let i = 1; i < 3; i++) g.add(lbox('ტიხარი', w - 0.04, 0.12, 0.01, 0, h - 0.09, -d / 2 + d * i / 3, 'furnGray'));
  },
  gondola(o, g) {
    const { w, d, h } = o;
    g.add(lbox('ბაზა', w, 0.10, d, 0, 0.05, 0, 'furnOrange'));
    g.add(lbox('ცენტრალური პანელი', w - 0.1, h - 0.10, 0.06, 0, (h + 0.10) / 2, 0, 'furnOrange'));
    for (let r = 0; r < 4; r++) for (const sd of [-1, 1]) {
      const k = lbox(`კაკვების რიგი ${r + 1}`, w - 0.2, 0.015, d / 2 - 0.08, 0, 0.55 + r * 0.32, sd * (d / 4 + 0.01), 'frame');
      k.castShadow = false;
      g.add(k);
    }
  },
  display(o, g) {
    const { w, d, h } = o;
    g.add(lbox('ბაზა', w, 0.10, d, 0, 0.05, 0, 'furnOrange'));
    g.add(lbox('კორპუსი', w, h - 0.13, d, 0, 0.10 + (h - 0.13) / 2, 0, 'furnWhite'));
    const top = lbox('მინა', w, 0.03, d, 0, h - 0.015, 0, 'furnGlass');
    top.userData.noPick = true;
    g.add(top);
  },
  totem(o, g) {
    const n = 4, gap = 0.012, bh = (o.h - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) g.add(lbox(`მოდული ${i + 1}`, o.w, bh, o.d, 0, i * (bh + gap) + bh / 2, 0, i % 2 ? 'furnWhite' : 'furnGray'));
  },
  palm(o, g) {
    const th = o.h - 0.25;
    g.add(cyl('ღერო', 0.09, th, 0, 0, 0, 'furnWhite', 16));
    const leaves = [[0, 0.68], [180, 0.68], [55, 0.45], [125, 0.45], [235, 0.45], [305, 0.45]];
    leaves.forEach(([a, L], i) => {
      const leaf = lbox(`ფოთოლი ${i + 1}`, 0.16, 0.015, L, 0, 0, L / 2, 'furnWhite');
      const pivot = new THREE.Group();
      pivot.name = `ფოთლის საყრდენი ${i + 1}`;
      pivot.position.set(0, th, 0);
      pivot.rotation.order = 'YXZ';
      pivot.rotation.y = a * DEG;
      pivot.rotation.x = 0.35;
      pivot.add(leaf);
      g.add(pivot);
    });
  },
  smartHome(o, g) {
    const { w, d, h } = o;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, o.eave); s.lineTo(0, h); s.lineTo(-w / 2, o.eave); s.closePath();
    const back = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }), 'ral1016', 'სახლის ფორმის პანელი');
    back.position.z = -d / 2;
    g.add(back);
    [0.85, 1.25, 1.65].forEach((y, i) => g.add(lbox(`თარო ${i + 1}`, w - 0.3, 0.025, 0.30, 0, y, -d / 2 + 0.19, 'ral1016')));
    g.add(lbox('ქვედა სადგამი', w, 0.40, d - 0.04, 0, 0.20, 0.02, 'ral1016'));
    g.add(lbox('გვერდითი ფარფლი', 0.04, o.eave, d, w / 2 - 0.02, o.eave / 2, 0, 'ral1016'));
  },
  stands(o, g) {
    [-0.2, 0.2].forEach((z, i) => {
      g.add(lbox(`სადგამი ${i + 1}`, o.w, o.h - 0.25, 0.25, 0, (o.h - 0.25) / 2, z, 'furnWhite'));
      g.add(lbox(`ეკრანი ${i + 1}`, o.w, 0.25, 0.25, 0, o.h - 0.125, z, 'furnGray'));
    });
  },
  tvWall(o, g) {
    const { w, d, h } = o;
    g.add(lbox('TV კედლის კორპუსი RAL 7015', w, h, d, 0, h / 2, 0, 'ral7015'));
    const zf = d / 2 + 0.03;
    [[-0.9, 2.65, 1.45, 0.83], [0.9, 2.65, 1.45, 0.83], [-0.9, 1.75, 1.22, 0.70], [0.9, 1.75, 1.22, 0.70]].forEach(([x, y, sw, sh], i) =>
      g.add(lbox(`ტელევიზორი ${i + 1} (სავარაუდო)`, sw, sh, 0.06, x, y, zf, 'furnDark')));
    g.add(lbox('კონსოლის თარო', w - 0.4, 0.06, 0.30, 0, 0.95, d / 2 + 0.15, 'furnWhite'));
  },
  bankDesk(o, g) {
    const { w, d, h } = o;
    g.add(lbox('მაგიდის ზედაპირი', w, 0.03, d, 0, h - 0.015, 0, 'furnWhite'));
    g.add(lbox('წინა პანელი', w - 0.04, h - 0.03, 0.03, 0, (h - 0.03) / 2, -d / 2 + 0.05, 'furnWhite'));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) =>
      g.add(lbox(`ფეხი ${i + 1}`, 0.04, h - 0.03, 0.04, sx * (w / 2 - 0.04), (h - 0.03) / 2, sz * (d / 2 - 0.04), 'frame')));
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
    : { 'სიგანე': fmt(o.w), 'სიღრმე': fmt(o.d), 'სიმაღლე': fmt(o.h) };
  const status = o.type === 'ring'
    ? { 'გარე დიამეტრი': st.w, 'დახლის სიგანე': st.d, 'სიმაღლე': st.h, 'მდებარეობა': st.pos }
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
