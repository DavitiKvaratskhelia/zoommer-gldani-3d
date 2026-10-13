// ზუმერი — გლდანი მოლი · განათების სისტემის, ცხაურებისა და ლუქების გეომეტრია (მონაცემები — lighting.js).
// DOM-ის გარეშე — მუშაობს ბრაუზერშიც და Node-შიც (GLB ექსპორტი). სინათლის წყაროები (RectAreaLight)
// აქ არ იქმნება: მათ სანახავი (viewer.js) აგებს lightSources()-ის მონაცემებით, ცალკე ჯგუფში.
import * as THREE from 'three';
import { mergeByMaterial } from './furniture.js';
import {
  RAYS, LIGHT_CENTER, LIGHT_H, PENDANTS, VENTS, VENT_DIM, HATCHES, HATCH_SIZE, SPECS, SIM,
} from './lighting.js';

const DEG = Math.PI / 180;
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);

// ------------------------------------------------------------------ მასალები (საერთო — ერთი ცვლილება ყველა სანათზე)
const mats = new Map();
function m(key, make) { if (!mats.has(key)) mats.set(key, make()); return mats.get(key); }
const std = (name, opts, code, description) => {
  const mm = new THREE.MeshStandardMaterial({ name, ...opts });
  mm.userData = { colorCode: code, description };
  return mm;
};
export const LIGHT_MATS = {
  get body() { return m('body', () => std('lighting_body_RAL9010', { color: '#f1ede4', roughness: 0.42, metalness: 0.12 }, 'RAL 9010', 'სანათის კორპუსი — შეღებილი ალუმინი, თეთრი')); },
  get rail() { return m('rail', () => std('track_rail_RAL9010', { color: '#eeebe3', roughness: 0.4, metalness: 0.15 }, 'RAL 9010 (ვარაუდი)', 'სამფაზა რელსი — ალუმინის პროფილი (ფერი სპეციფიკაციაში არ არის)')); },
  get slot() { return m('slot', () => std('track_slot', { color: '#2b2d31', roughness: 0.7 }, 'რელსის ღარი', 'რელსის ქვედა ღია ღარი')); },
  get wire() { return m('wire', () => std('suspension_wire', { color: '#b9bdc3', roughness: 0.32, metalness: 0.85 }, 'ფოლადის ტროსი', 'საკიდი ტროსი / სამაგრი')); },
  // ოპალის დიფუზორი — ემისია (ფერი/ჩართვა) იმართება სანახავიდან setDiffuserGlow()-ით
  get opal() { return m('opal', () => std('opal_diffuser', { color: '#f6f6f3', roughness: 0.3, metalness: 0, emissive: '#000000', emissiveIntensity: 0 }, 'Opal', 'ოპალის დიფუზორი')); },
  get vent() { return m('vent', () => std('vent_grille_RAL9010', { color: '#f0ece3', roughness: 0.55, metalness: 0.1 }, 'RAL 9010 (ჭერის ფერი)', 'სავენტილაციო ცხაური — ჩარჩო და ლამელები')); },
  get ventDark() { return m('ventDark', () => std('vent_plenum', { color: '#1b1d20', roughness: 0.9 }, 'ჰაერსატარი', 'ცხაურის უკანა სივრცე (ჰაერსატარი)')); },
  get hatch() { return m('hatch', () => std('service_hatch_RAL9010', { color: '#f4f1ea', roughness: 0.95 }, 'RAL 9010 (ჭერის ფერი)', 'მომსახურების ლუქის პანელი — თაბაშირმუყაო')); },
  get seam() { return m('seam', () => std('service_hatch_seam', { color: '#4a4c51', roughness: 0.8 }, 'ნაკერი', 'ლუქის პერიმეტრული ნაკერი')); },
};
// დიფუზორის ნათება: on — ჩართულია; color — ფერის ტემპერატურის ფერი (წრფივი, სიკაშკაშე = 1)
const GLOW = 2.4; // ეკრანზე ჩანს ფერის ელფერი (ტონური რუკა არ „ათეთრებს“) — ვიზუალური მნიშვნელობა, არა ფოტომეტრიული
export function setDiffuserGlow(on, color) {
  const o = LIGHT_MATS.opal;
  if (color) o.emissive.copy(color);
  o.emissiveIntensity = on ? GLOW : 0;
}

// ------------------------------------------------------------------ დამხმარეები
function box(sx, sy, sz, cx, cy, cz, mat, name) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  b.position.set(cx, cy, cz);
  b.name = name;
  return b;
}
function cyl(r, h, cx, cy0, cz, mat, name, seg = 12) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  c.position.set(cx, cy0 + h / 2, cz);
  c.name = name;
  return c;
}
// კვადრატული ჩარჩო (გარე a, შიდა b) y0–y1 დიაპაზონში
function squareRing(g, a, b, y0, y1, mat, name) {
  const t = (a - b) / 2, h = y1 - y0, y = (y0 + y1) / 2;
  g.add(box(a, h, t, 0, y, -(b + t) / 2, mat, name), box(a, h, t, 0, y, (b + t) / 2, mat, name));
  g.add(box(t, h, b, -(b + t) / 2, y, 0, mat, name), box(t, h, b, (b + t) / 2, y, 0, mat, name));
}
const rayDir = (a) => [Math.cos(a * DEG), Math.sin(a * DEG)];
const at = (a, r) => { const [ux, uz] = rayDir(a); return [LIGHT_CENTER[0] + ux * r, LIGHT_CENTER[1] + uz * r]; };
function place(g, x, z, angDeg) {
  g.position.set(x, 0, z);
  g.rotation.y = -angDeg * DEG; // ადგილობრივი +X → სხივის მიმართულება (cos a, sin a) გეგმაზე
}

// ------------------------------------------------------------------ მონაცემები (ერთიანი ჩანაწერი თითო სანათზე)
// ID-ები: PPL-01…84 — სხივების მიხედვით (0°-დან საათის ისრით), ცენტრიდან გარეთ; PLED-01…32 — ZGMP-12-ის
// რიგით (ზემოდან ქვემოთ); რელსები TR-<სხივი>.<სექცია>; ცხაურები VG-1…6; ლუქები SH-1…7.
export const FIXTURES = (() => {
  const out = [];
  let n = 0;
  RAYS.forEach((ray, ri) => {
    const [ux, uz] = rayDir(ray.a);
    ray.lums.forEach((r, k) => {
      const [x, z] = at(ray.a, r);
      out.push({
        id: `PPL-${String(++n).padStart(2, '0')}`, model: 'PPL 9033-T', kind: 'linear', ray: ri + 1, rayAngle: ray.a, idxOnRay: k + 1, r,
        x, z, ux, uz, rot: ray.a, L: 1.0, W: LIGHT_H.pplW, H: LIGHT_H.pplH,
        yBottom: LIGHT_H.rail - LIGHT_H.adapterH - LIGHT_H.pplH, yTop: LIGHT_H.rail - LIGHT_H.adapterH,
        flux: SPECS['PPL 9033-T'].flux, power: SPECS['PPL 9033-T'].power, sheet: 'ZGMP-10',
      });
    });
  });
  PENDANTS.forEach(([x, z], i) => out.push({
    id: `PLED-${String(i + 1).padStart(2, '0')}`, model: 'PLED 5060', kind: 'pendant', x, z, rot: 0, D: 0.50, H: 0.10,
    yBottom: LIGHT_H.pledTop - 0.10, yTop: LIGHT_H.pledTop, flux: null, power: SPECS['PLED 5060'].power, sheet: 'ZGMP-12',
  }));
  return out;
})();

// ------------------------------------------------------------------ რელსის სექცია
function buildRailSection(ray, ri, k, s0, len, first, last) {
  const g = new THREE.Group();
  const id = `TR-${ri + 1}.${k + 1}`;
  g.name = `${id} განათების რელსი ${len} მ`;
  const H = LIGHT_H, yb = H.rail, yt = H.rail + H.railH, W = H.railW;
  const L = len - 0.003; // სექციებს შორის მცირე ნაკერი
  g.add(box(L, H.railH, W, 0, (yb + yt) / 2, 0, LIGHT_MATS.rail, 'რელსის პროფილი'));
  g.add(box(L, 0.0012, 0.013, 0, yb - 0.0005, 0, LIGHT_MATS.slot, 'რელსის ღარი'));
  // შეერთება (სწორი მიმყვანი) — სექციის დასაწყისში, თუ წინ სხვა სექციაა; ბოლოებზე — საფარი
  if (!first) g.add(box(0.07, H.railH + 0.004, W + 0.004, -len / 2, (yb + yt) / 2, 0, LIGHT_MATS.rail, 'შეერთება (კონექტორი)'));
  if (first) g.add(box(0.014, H.railH + 0.002, W + 0.002, -len / 2 + 0.007, (yb + yt) / 2, 0, LIGHT_MATS.rail, 'საწყისი საფარი / კვების მიმყვანი'));
  if (last) g.add(box(0.012, H.railH + 0.002, W + 0.002, len / 2 - 0.006, (yb + yt) / 2, 0, LIGHT_MATS.rail, 'ბოლო საფარი'));
  // საკიდები (ვარაუდი — წყაროებში არ არის): ბოლოებიდან 0.30 მ-ზე და შუაში (≥ 2 მ სექციებზე)
  const hs = [-len / 2 + 0.3, len / 2 - 0.3];
  if (len >= 2) hs.push(0);
  for (const s of hs) {
    g.add(cyl(0.0013, H.ceiling - yt, s, yt, 0, LIGHT_MATS.wire, 'საკიდი ტროსი', 6));
    g.add(box(0.03, 0.008, W + 0.006, s, yt + 0.004, 0, LIGHT_MATS.wire, 'რელსის სამაგრი'));
    g.add(cyl(0.016, 0.006, s, H.ceiling - 0.006, 0, LIGHT_MATS.wire, 'ჭერის სამაგრი', 16));
  }
  mergeByMaterial(g, id);
  const [x, z] = at(ray.a, s0 + len / 2);
  place(g, x, z, ray.a);
  g.children.forEach((c) => { c.castShadow = c.material !== LIGHT_MATS.wire; });
  g.userData.info = {
    name: `განათების რელსი ${len} მ — სექცია ${k + 1}`, code: id, kind: 'განათების რელსი', zone: `სხივი ${ri + 1} (${ray.a}°)`,
    size: { 'სიგრძე': f2(len), 'პროფილი (სიგ.)': f3(W), 'პროფილი (სიმ.)': f3(H.railH), 'ნიშნული': f2(yb) },
    status: { 'სიგრძე': 'pdf', 'პროფილი (სიგ.)': 'measured', 'პროფილი (სიმ.)': 'assumed', 'ნიშნული': 'pdf', 'მდებარეობა': 'pdf' },
    note: `ZGMP-10: სხივი ${ray.a}°, ცენტრიდან ${f2(s0)}–${f2(s0 + len)} მ. რელსი დამაგრებულია 3.83 მ-ზე (ნახაზის შენიშვნა; მოდელში — ქვედა ზედაპირი). `
      + 'პროფილის სიმაღლე, ფერი და საკიდების ბიჯი წყაროებში არ არის — ვარაუდი.',
    drawings: ['p11', 'p13'],
    mark: { x, z, len, wid: 0.12, ang: ray.a },
  };
  return g;
}

// ------------------------------------------------------------------ PPL 9033-T
function buildLinear(fx) {
  const g = new THREE.Group();
  g.name = `${fx.id} PPL 9033-T`;
  const H = LIGHT_H, W = fx.W;
  const yb = fx.yBottom, yt = fx.yTop;
  g.add(box(1.0, yt - yb - 0.004, W, 0, (yb + 0.004 + yt) / 2, 0, LIGHT_MATS.body, 'კორპუსი (ალუმინი)'));
  g.add(box(0.994, 0.004, W - 0.012, 0, yb + 0.002, 0, LIGHT_MATS.opal, 'ოპალის დიფუზორი'));
  // კორპუსის ქვედა ჩარჩო დიფუზორის გარშემო
  g.add(box(1.0, 0.004, 0.006, 0, yb + 0.002, -W / 2 + 0.003, LIGHT_MATS.body, 'ჩარჩო'), box(1.0, 0.004, 0.006, 0, yb + 0.002, W / 2 - 0.003, LIGHT_MATS.body, 'ჩარჩო'));
  // რელსის ადაპტერი (კვება) და მექანიკური სამაგრი — სპეციფიკაციის ფოტოს მიხედვით, ზომები ვარაუდია
  g.add(box(0.11, H.adapterH, 0.034, 0.30, yt + H.adapterH / 2, 0, LIGHT_MATS.body, 'რელსის ადაპტერი'));
  g.add(box(0.04, H.adapterH, 0.03, -0.38, yt + H.adapterH / 2, 0, LIGHT_MATS.body, 'მექანიკური სამაგრი'));
  mergeByMaterial(g, fx.id);
  place(g, fx.x, fx.z, fx.rot);
  g.children.forEach((c) => { c.castShadow = true; });
  return g;
}

// ------------------------------------------------------------------ PLED 5060
const pledGeo = {};
function buildPendant(fx) {
  const g = new THREE.Group();
  g.name = `${fx.id} PLED 5060`;
  const R = 0.25, yb = fx.yBottom, yt = fx.yTop, H = LIGHT_H;
  pledGeo.body ??= new THREE.CylinderGeometry(R, R, yt - yb, 72, 1, false);
  pledGeo.diff ??= new THREE.CircleGeometry(R - 0.012, 72).rotateX(Math.PI / 2);
  const body = new THREE.Mesh(pledGeo.body, LIGHT_MATS.body);
  body.position.y = (yb + yt) / 2; body.name = 'კორპუსი RAL 9010';
  const diff = new THREE.Mesh(pledGeo.diff, LIGHT_MATS.opal);
  diff.position.y = yb - 0.0008; diff.name = 'ოპალის დიფუზორი';
  g.add(body, diff);
  // სამი საკიდი ტროსი (მწარმოებლის ფოტოს მიხედვით) — სიგრძე = ჭერი − სანათის ზედა სიბრტყე
  for (const a of [90, 210, 330]) {
    const x = Math.cos(a * DEG) * 0.2, z = Math.sin(a * DEG) * 0.2;
    g.add(cyl(0.0009, H.ceiling - yt, x, yt, z, LIGHT_MATS.wire, 'საკიდი ტროსი', 6));
    g.add(cyl(0.006, 0.012, x, yt, z, LIGHT_MATS.wire, 'ტროსის დამჭერი', 10));
    g.add(cyl(0.012, 0.008, x, H.ceiling - 0.008, z, LIGHT_MATS.wire, 'ჭერის სამაგრი', 14));
  }
  mergeByMaterial(g, fx.id);
  g.position.set(fx.x, 0, fx.z);
  g.children.forEach((c) => { c.castShadow = c.material !== LIGHT_MATS.wire; });
  return g;
}

function fixtureInfo(fx) {
  const sp = SPECS[fx.model];
  const linear = fx.kind === 'linear';
  return {
    name: fx.model, code: fx.id, kind: linear ? 'ხაზოვანი სანათი' : 'მრგვალი დაკიდებული სანათი',
    zone: linear ? `სხივი ${fx.ray} (${fx.rayAngle}°), ${fx.idxOnRay}-ე` : 'ZGMP-12',
    size: linear
      ? { 'სიგრძე': '1.00', 'სიგანე': f3(fx.W), 'სიმაღლე': f3(fx.H), 'ქვედა სიბრტყე': f2(fx.yBottom) }
      : { 'დიამეტრი': '0.50', 'სიმაღლე': '0.10', 'ქვედა სიბრტყე': f2(fx.yBottom), 'საკიდი (ფაქტ.)': f2(LIGHT_H.ceiling - fx.yTop) },
    status: linear
      ? { 'სიგრძე': 'pdf', 'სიგანე': 'measured', 'სიმაღლე': 'assumed', 'ქვედა სიბრტყე': 'assumed', 'მდებარეობა': 'measured' }
      : { 'დიამეტრი': 'pdf', 'სიმაღლე': 'pdf', 'ქვედა სიბრტყე': 'measured', 'საკიდი (ფაქტ.)': 'measured', 'მდებარეობა': 'pdf' },
    drawings: linear ? ['p11', 'p13'] : ['p13', 'p11'],
    mark: linear ? { x: fx.x, z: fx.z, len: 1.0, wid: 0.16, ang: fx.rot } : { x: fx.x, z: fx.z, d: 0.5 },
    lum: { ...fx, spec: sp },
  };
}

// ------------------------------------------------------------------ ცხაური და ლუქი
function buildVent([x, z], i) {
  const g = new THREE.Group();
  const id = `VG-${i + 1}`;
  g.name = `${id} სავენტილაციო ცხაური`;
  const V = VENT_DIM, c = LIGHT_H.ceiling;
  // ჭერი არ იჭრება: ცხაური ჭერის ქვედა სიბრტყის ქვეშაა (≈18 მმ), მუქი ფონი — ლამელების უკან
  squareRing(g, V.outer, V.step1, c - 0.006, c - 0.0005, LIGHT_MATS.vent, 'ჩარჩო 640');
  squareRing(g, V.step1, V.step2, c - 0.012, c - 0.0005, LIGHT_MATS.vent, 'საფეხური 540');
  squareRing(g, V.step2, V.core, c - 0.018, c - 0.0005, LIGHT_MATS.vent, 'საფეხური 480');
  g.add(box(V.core, 0.001, V.core, 0, c - 0.0012, 0, LIGHT_MATS.ventDark, 'ჰაერსატარი (ფონი)'));
  for (let k = 0; k < V.lamellae; k++) {
    const zz = (k - (V.lamellae - 1) / 2) * V.pitch;
    const l = box(V.core - 0.002, 0.013, 0.0025, 0, c - 0.0095, zz, LIGHT_MATS.vent, 'ლამელი');
    l.rotation.x = 25 * DEG;
    g.add(l);
  }
  mergeByMaterial(g, id);
  g.position.set(x, 0, z);
  g.children.forEach((ch) => { ch.castShadow = false; });
  g.userData.info = {
    name: `სავენტილაციო ცხაური ${id}`, code: id, kind: 'სავენტილაციო ცხაური', zone: 'ჭერი 4.10 მ',
    size: { 'ჩარჩო': '0.64 × 0.64', 'ცხაური': '0.42 × 0.42', 'ლამელები': '10 × 42 მმ', 'ნიშნული': '4.10' },
    status: { 'ჩარჩო': 'measured', 'ცხაური': 'measured', 'ლამელები': 'measured', 'ნიშნული': 'pdf', 'მდებარეობა': 'pdf' },
    note: 'ZGMP-10 (ლეგენდა „სავენტილაციო ცხაური“, მდებარეობის ზომები) და ZGMP-12 (ვექტორული სიმბოლო). ზომის რიცხვი ფურცელზე არ არის — გაზომილია 1:70 მასშტაბით. '
      + 'ფერი — ჭერის RAL 9010 (ნახაზის პირობითი შტრიხი ფერად არ არის გადატანილი). ლამელების დახრა — ვიზუალური ვარაუდი.',
    drawings: ['p11', 'p13'], mark: { x, z, sq: V.outer },
  };
  return g;
}
function buildHatch([x, z], i) {
  const g = new THREE.Group();
  const id = `SH-${i + 1}`;
  g.name = `${id} მომსახურების ლუქი`;
  const S = HATCH_SIZE, c = LIGHT_H.ceiling, seam = 0.003;
  g.add(box(S - 2 * seam, 0.0125, S - 2 * seam, 0, c - 0.0015 + 0.00625, 0, LIGHT_MATS.hatch, 'ლუქის პანელი'));
  squareRing(g, S, S - 2 * seam, c - 0.001, c + 0.0125, LIGHT_MATS.seam, 'პერიმეტრული ნაკერი');
  mergeByMaterial(g, id);
  g.position.set(x, 0, z);
  g.children.forEach((ch) => { ch.castShadow = false; });
  g.userData.info = {
    name: `მომსახურების ლუქი ${id}`, code: id, kind: 'მომსახურების ლუქი', zone: 'ჭერი 4.10 მ',
    size: { 'ზომა': '0.40 × 0.40', 'ნიშნული': '4.10' },
    status: { 'ზომა': 'pdf', 'ნიშნული': 'pdf', 'მდებარეობა': 'pdf' },
    note: 'ZGMP-10: ზომა 400 × 400 (იისფერი ზომები) და მდებარეობა; ZGMP-12-ზე იგივე ლუქი 380 მმ სიმბოლოთია. '
      + 'პანელი ჭერის სიბრტყეშია, თეთრი (RAL 9010); ნახაზის ცისფერი ფერი პირობითია.',
    drawings: ['p11', 'p13'], mark: { x, z, sq: S },
  };
  return g;
}

// ------------------------------------------------------------------ მთავარი
export function buildLighting(groups) {
  setDiffuserGlow(false);
  // რელსები
  const rails = new THREE.Group(); rails.name = 'Track_Rails'; rails.userData = { label: 'განათების რელსები (54)' };
  RAYS.forEach((ray, ri) => {
    let s = ray.r0;
    ray.secs.forEach((len, k) => { rails.add(buildRailSection(ray, ri, k, s, len, k === 0, k === ray.secs.length - 1)); s += len; });
  });
  const linear = new THREE.Group(); linear.name = 'PPL_9033-T_Linear'; linear.userData = { label: 'ხაზოვანი სანათები PPL 9033-T (84)' };
  const pend = new THREE.Group(); pend.name = 'PLED_5060_Pendants'; pend.userData = { label: 'მრგვალი სანათები PLED 5060 (32)' };
  for (const fx of FIXTURES) {
    const g = fx.kind === 'linear' ? buildLinear(fx) : buildPendant(fx);
    g.userData.info = fixtureInfo(fx);
    g.userData.fixture = { id: fx.id, model: fx.model, position: [fx.x, (fx.yBottom + fx.yTop) / 2, fx.z], rotationDeg: fx.rot, flux_lm: fx.flux, power_W: fx.power, cct_K: SPECS[fx.model].cct };
    (fx.kind === 'linear' ? linear : pend).add(g);
  }
  groups.lighting.add(rails, linear, pend);
  VENTS.forEach((v, i) => groups.vents.add(buildVent(v, i)));
  HATCHES.forEach((h, i) => groups.hatches.add(buildHatch(h, i)));
  groups.lighting.userData.summary = {
    rails: rails.children.length, ppl: linear.children.length, pled: pend.children.length,
    vents: groups.vents.children.length, hatches: groups.hatches.children.length,
  };
}

// ------------------------------------------------------------------ სინათლის წყაროები (სანახავისთვის)
// ხაზოვანი სანათები ერთიანდება სხივზე ერთ ზოლად (პირველი სანათის დასაწყისიდან ბოლოს ბოლომდე),
// ნაკადი = სანათების რაოდენობა × 4400 lm — სიმულაციის გამარტივება შეიდერის სიჩქარისთვის; 3.75 მ
// სიმაღლიდან იატაკზე განაწილება პრაქტიკულად იგივეა. მრგვალი სანათი — Ø500-ის ტოლი ფართობის კვადრატი.
export function lightSources() {
  const out = [];
  RAYS.forEach((ray, ri) => {
    const list = FIXTURES.filter((f) => f.kind === 'linear' && f.ray === ri + 1);
    const r0 = Math.min(...list.map((f) => f.r)) - 0.5, r1 = Math.max(...list.map((f) => f.r)) + 0.5;
    const [x, z] = at(ray.a, (r0 + r1) / 2);
    const [ux, uz] = rayDir(ray.a);
    out.push({ kind: 'linear', ids: list.map((f) => f.id), x, z, y: list[0].yBottom - 0.0005, ux, uz, w: r1 - r0, h: LIGHT_H.pplW - 0.012, flux: list.length * SPECS['PPL 9033-T'].flux });
  });
  for (const f of FIXTURES.filter((q) => q.kind === 'pendant')) {
    const s = Math.sqrt(Math.PI) * 0.238; // ფართობი = π · 0.238² (დიფუზორი)
    out.push({ kind: 'pendant', ids: [f.id], x: f.x, z: f.z, y: f.yBottom - 0.0015, ux: 1, uz: 0, w: s, h: s, flux: SIM.pledVisualFlux, fluxIsAssumed: true });
  }
  return out;
}
