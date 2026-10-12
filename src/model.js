// ზუმერი — გლდანი მოლი · 3D გეომეტრიის აგება config.js-ის მიხედვით.
// იყენებს მხოლოდ three.js-ს (DOM-ის გარეშე) — მუშაობს ბრაუზერშიც და Node-შიც.
import * as THREE from 'three';
import {
  H, T, P, COLORS, WALLS, BOXES_INTERIOR, WALL_FINISHES, GLAZING, FACADE, DOORS,
  COLUMNS, FLOOR_OUTLINE, CEILING_OUTLINE, INLAYS, FURNITURE, concreteXAt,
} from './config.js';
import { BUILDERS, SHEETS, mergeByMaterial } from './furniture.js';
import { buildWallLightboxes, buildNavigation } from './lightbox-model.js';
import { VERTICAL_ADS } from './lightboxes.js';
import { DRAWINGS_BY_CODE } from './drawings.js';

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
  if (c.e) { m.emissive = new THREE.Color(c.e); m.emissiveIntensity = c.ei ?? 1; }
  if (c.tex) m.map = texture(c.tex);
  if (c.alphaTest) { m.alphaTest = c.alphaTest; m.side = THREE.DoubleSide; }
  if (c.double) m.side = THREE.DoubleSide;
  if (c.env !== undefined) m.envMapIntensity = c.env;
  // ორიგინალი ფერის კოდი (RAL/NCS) — ინახება მოდელის მონაცემებში (GLB: material extras)
  m.userData = { colorCode: c.code || c.name, description: c.name };
  matCache.set(key, m);
  return m;
}

// ------------------------------------------------------------------ პროცედურული ფაქტურები (DOM-ის გარეშე)
// mesh — ლითონის ბადე (რომბისებრი, გამჭვირვალე ღიობებით), perf — პერფორირებული ფურცელი,
// peg — პერფორირებული ფილა (ხვრელები 300 × 200 ბიჯით, ZF-18). ნიმუშის ბიჯს UV განსაზღვრავს.
const texCache = new Map();
function texture(kind) {
  if (texCache.has(kind)) return texCache.get(kind);
  const N = 64, data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    let v = 255, a = 255;
    if (kind === 'mesh') {
      const d1 = Math.abs(((x + y) % 32) - 16), d2 = Math.abs(((x - y + 64) % 32) - 16);
      a = (d1 > 12 || d2 > 12) ? 255 : 0;
    } else if (kind === 'perf') {
      const dx = (x % 16) - 8, dy = (y % 16) - 8;
      v = dx * dx + dy * dy < 13 ? 70 : 255;
    } else if (kind === 'peg') {
      const dx = x - 32, dy = y - 32;
      v = (Math.abs(dx) < 3 && Math.abs(dy) < 7) ? 60 : 255;
    }
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = a;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.name = kind;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  if (kind === 'peg') t.repeat.set(1 / 0.30, 1 / 0.20);
  t.needsUpdate = true;
  texCache.set(kind, t);
  return t;
}

// ------------------------------------------------------------------ დამხმარეები
export function mesh(geo, matKey, name, { cast = true, receive = true, material } = {}) {
  const m = new THREE.Mesh(geo, material || mat(matKey));
  m.name = name;
  m.castShadow = cast && !(material ? material.transparent : COLORS[matKey].opacity);
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
export function lbox(name, sx, sy, sz, cx, cy, cz, matKey, opts) {
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
export function flatExtrude(shape, y0, height, curveSegments = 48) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments });
  g.rotateX(-Math.PI / 2); // shape (x, y, extrude z) → world (x, z_extrude, −y)
  g.translate(0, y0, 0);
  return g;
}

export function roundedRect(w, d, r) {
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

// ------------------------------------------------------------------ ავეჯი (furniture.js — ZGMF ავეჯის კრებულის მიხედვით)
function buildFurniture(o, i) {
  const g = new THREE.Group();
  const label = o.n > 1 ? `${o.name} #${o.idx}` : o.name;
  g.name = `${o.code} ${label}`.trim();
  const build = BUILDERS[o.type];
  if (!build) throw new Error('უცნობი ავეჯის ტიპი: ' + o.type);
  // ვერტიკალური ლაითბოქსის რეკლამა (Lightboxes PDF, გვ. 7–10) — ფასადის მიხედვით
  if (o.type === 'vitrine' && !o.ad) {
    o.ad = VERTICAL_ADS.find((a) => (a.facade === 'B' ? Math.abs(o.x - 0.635) < 0.03 && Math.abs(o.z - a.at) < 0.01 : Math.abs(o.z - 0.625) < 0.03 && Math.abs(o.x - a.at) < 0.01));
  }
  build(o, g);
  mergeByMaterial(g, o.code);
  g.position.set(o.x, 0, o.z);
  g.rotation.y = (o.rot || 0) * DEG;
  const st = o.st || {};
  const src = SHEETS[o.type]?.(o) || {};
  const sheet = o.sheet || src.sheet, page = o.page || src.page;
  const size = o.size || { 'სიგანე': fmt(o.w), 'სიღრმე': fmt(o.d), 'სიმაღლე': fmt(o.h) };
  const status = o.sizeSt || { 'სიგანე': st.w, 'სიღრმე': st.d, 'სიმაღლე': st.h, 'მდებარეობა': st.pos };
  if (!o.sizeSt && st.pos) status['მდებარეობა'] = st.pos;
  const adNote = o.ad ? `ლაითბოქსის რეკლამა (ფასადის მხარეს): „${o.ad.title}“ — Lightboxes PDF, გვ. ${+o.ad.page.slice(1)}` : null;
  const notes = [sheet ? `წყარო: ${sheet} (ავეჯის PDF, გვ. ${page})` : null, adNote, o.note].filter(Boolean).join('. ');
  const drawings = o.ad ? [...(DRAWINGS_BY_CODE[o.code] || []).filter((d) => d !== 'p07'), o.ad.page, 'p07'] : undefined;
  info(g, { name: label, code: o.code, kind: 'ავეჯი', zone: o.zone, size, status, id: `F-${i + 1}`, note: notes || undefined, sheet, page, drawings });
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
    lightboxes: mk('Wall_Lightboxes', 'კედლის ლაითბოქსები'),
    navigation: mk('ceilingNavigationGroup', 'ჭერის ნავიგაცია (ZF-19)'),
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
  groups.ceiling.add(info(ceil, { name: 'ჭერი — თაბაშირმუყაო RAL 9010', code: 'ZGMP-12', kind: 'ჭერი', size: { 'ნიშნული': fmt(H.ceiling), 'ფართი (PDF)': '≈290 მ²' }, status: { 'ნიშნული': 'pdf', 'ფართი (PDF)': 'pdf' }, note: 'სანათები და რელსები მოდელში არ არის; ჭერის ნავიგაცია — ცალკე ჯგუფი (ZF-19)' }));

  // ავეჯი
  FURNITURE.forEach((o, i) => groups.furniture.add(buildFurniture(o, i)));

  // ლაითბოქსები და ჭერის ნავიგაცია
  buildWallLightboxes(groups.lightboxes);
  buildNavigation(groups.navigation);

  root.updateMatrixWorld(true);
  return { root, groups };
}

export { STATUS_TXT };
