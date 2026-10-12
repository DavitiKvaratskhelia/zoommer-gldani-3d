// ზუმერი — გლდანი მოლი · ლაითბოქსები და ჭერის ნავიგაცია (კონფიგურაცია — lightboxes.js).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { H } from './config.js';
import { WALL_LIGHTBOXES, NAV_COMPOSITIONS, NAV_RAL, NAV_DRAWINGS, NAV_HANGER } from './lightboxes.js';
import { LB_TEX } from './assets/lightbox-textures.js';

const mm = (v) => v / 1000;

// ------------------------------------------------------------------ ტექსტურები
// ბრაუზერში — data URL-იდან; Node-ში (GLB ექსპორტი) — setTextureFactory()-ით მიწოდებული გაშიფრული პიქსელებიდან.
let factory = (id, url) => new THREE.TextureLoader().load(url);
export function setTextureFactory(fn) { factory = fn; }
const texCache = new Map();
export function lbTexture(id) {
  if (texCache.has(id)) return texCache.get(id);
  const url = LB_TEX[id];
  if (!url) throw new Error('ტექსტურა ვერ მოიძებნა: ' + id);
  const t = factory(id, url);
  t.name = id;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.mimeType = 'image/jpeg'; // GLB-ში — JPEG (გამჭვირვალობა არ არის საჭირო)
  texCache.set(id, t);
  return t;
}

// ------------------------------------------------------------------ მასალები (ყველა — ცალკე, სხვა ავეჯს არ ეხება)
const matCache = new Map();
function cached(key, make) { if (!matCache.has(key)) matCache.set(key, make()); return matCache.get(key); }
// სარეკლამო პანელი: დიფუზორი (ტექსტილი/ორგმინა) შიდა LED განათებით — ფერი + თანაბარი ნათება იგივე ტექსტურით
export function adMaterial(tex, title) {
  return cached('ad:' + tex, () => {
    const map = lbTexture(tex);
    const m = new THREE.MeshStandardMaterial({
      name: `lightbox_${tex}`, map, emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.5,
      roughness: 0.62, metalness: 0, envMapIntensity: 0.12, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    });
    m.userData = { colorCode: 'ლაითბოქსი — დიფუზორი, შიდა LED განათება', description: title || tex };
    return m;
  });
}
const pvc = (ral) => cached('navPvc:' + ral, () => {
  const m = new THREE.MeshStandardMaterial({ name: `nav_pvc_RAL${ral}`, color: new THREE.Color(NAV_RAL[ral]), roughness: 0.5, metalness: 0 });
  m.userData = { colorCode: `RAL ${ral}`, description: 'შეღებილი PVC (ნავიგაცია)' };
  return m;
});
const lbEdge = () => cached('lbEdge', () => {
  const m = new THREE.MeshStandardMaterial({ name: 'lightbox_edge_RAL2003', color: new THREE.Color(NAV_RAL[2003]), roughness: 0.42, metalness: 0.15 });
  m.userData = { colorCode: 'RAL 2003', description: 'ლაითბოქსის კანტი (ZGMF-30)' };
  return m;
});
const hangerMat = (ral) => cached('navHanger:' + ral, () => {
  const m = new THREE.MeshStandardMaterial({ name: `nav_hanger_RAL${ral}`, color: new THREE.Color(NAV_RAL[ral]), roughness: 0.4, metalness: 0.55 });
  m.userData = { colorCode: `RAL ${ral}`, description: 'ლითონის ზოლი — საკიდი (ფერი ნახაზის ხაზის მიხედვით)' };
  return m;
});
// ნავიგაციის განათებული ორგმინა (წარწერისა და სიმბოლოს უკან) — ჩართვა/გამორთვა მხოლოდ ამ მასალებზე
export const NAV_LIT = [];
const NAV_LIT_ON = 0.85;
const navLit = (tex) => cached('navLit:' + tex, () => {
  const map = lbTexture(tex);
  const m = new THREE.MeshStandardMaterial({ name: `nav_lit_${tex}`, map, emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: NAV_LIT_ON, roughness: 0.45, metalness: 0, envMapIntensity: 0.2 });
  m.userData = { colorCode: 'განათებული ორგმინა; წარწერა/სიმბოლო — PVC RAL 7016', description: tex };
  NAV_LIT.push(m);
  return m;
});
export function setNavLighting(on) { for (const m of NAV_LIT) m.emissiveIntensity = on ? NAV_LIT_ON : 0; }

// ------------------------------------------------------------------ კედლის ლაითბოქსები (ZF-20-1, ZF-20-2)
function info(obj, data) { obj.userData.info = data; return obj; }
export function buildWallLightboxes(group) {
  for (const L of WALL_LIGHTBOXES) {
    const g = new THREE.Group();
    g.name = `${L.code} ${L.id} — ${L.title}`;
    const W = mm(L.w), Hh = mm(L.h), D = mm(L.d), gap = 0.001;
    const fx = L.wall === 'x' ? L.n : 0, fz = L.wall === 'z' ? L.n : 0;
    const mid = (L.span[0] + L.span[1]) / 2;
    const c = L.wall === 'z' ? [mid, L.at + L.n * (gap + D / 2)] : [L.at + L.n * (gap + D / 2), mid];
    g.position.set(c[0], L.y0 + Hh / 2, c[1]);
    g.rotation.y = Math.atan2(fx, fz);
    // კორპუსი 120 მმ, კანტი RAL 2003
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), lbEdge());
    body.name = `${L.id} / კორპუსი ${L.d} მმ (კანტი RAL 2003)`;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    // წინა დიფუზორი სარეკლამო გამოსახულებით (კანტი 6 მმ ჩანს გარშემო)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.012, Hh - 0.012), adMaterial(L.tex, L.title));
    face.name = `${L.id} / სარეკლამო დიფუზორი — ${L.title}`;
    face.position.z = D / 2 + 0.0015;
    g.add(face);
    info(g, {
      name: `${L.title} — კედლის ლაითბოქსი`, code: L.code, kind: 'კედლის ლაითბოქსი', zone: L.zone,
      size: { 'სიგანე': W.toFixed(2), 'სიმაღლე': Hh.toFixed(2), 'სიღრმე': D.toFixed(2), 'ქვედა ნიშნული': L.y0.toFixed(2) },
      status: { 'სიგანე': 'pdf', 'სიმაღლე': 'pdf', 'სიღრმე': 'pdf', 'ქვედა ნიშნული': 'pdf', 'მდებარეობა': L.pos },
      note: ['წყარო: ZGMF-30 (ავეჯის PDF, გვ. 33); გამოსახულება — Lightboxes PDF', L.note].filter(Boolean).join('. '),
      drawings: L.drawings,
    });
    group.add(g);
  }
}

// ------------------------------------------------------------------ ZF-19 — ჭერის ნავიგაცია
// რგოლი: ფიგურა XY სიბრტყეში, სისქე Z ღერძზე (წინა მხარე +Z). ჯგუფები: 0 — უკანა, 1 — წინა, 2 — გვერდები.
function ringGeometry(D, hole, T) {
  const s = new THREE.Shape();
  s.absarc(0, 0, D / 2, 0, Math.PI * 2, false);
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole / 2, 0, Math.PI * 2, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 56 });
  g.translate(0, 0, -T / 2);
  const lid = g.groups[0].count, total = g.attributes.position.count;
  g.clearGroups();
  g.addGroup(0, lid / 2, 0);
  g.addGroup(lid / 2, lid / 2, 1);
  g.addGroup(lid, total - lid, 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / D + 0.5, p.getY(i) / D + 0.5);
  // ინდექსირება (ფაილის ზომა ~3× მცირდება); სამკუთხედების რიგი უცვლელია — ჯგუფები იგივეა
  const groups = g.groups.map((x) => ({ ...x }));
  const r = mergeVertices(g, 1e-6);
  groups.forEach((x) => r.addGroup(x.start, x.count, x.materialIndex));
  return r;
}
const KIND = { main: 'წარწერიანი რგოლი', symbol: 'სიმბოლოს რგოლი', open: 'რგოლი' };
export function buildNavigation(group) {
  for (const C of NAV_COMPOSITIONS) {
    const g = new THREE.Group();
    g.name = C.id;
    const a = (C.face * Math.PI) / 180, fx = Math.cos(a), fz = Math.sin(a);
    g.position.set(C.x, 0, C.z);
    g.rotation.y = Math.atan2(fx, fz);
    const texts = [];
    C.rings.forEach((R, i) => {
      const D = mm(R.D), T = mm(R.T), cy = mm(R.bottom + R.D / 2);
      const rg = new THREE.Group();
      rg.name = `${C.id}_${String(i + 1).padStart(2, '0')}_${R.kind}`;
      rg.position.set(mm(R.r), cy, mm(R.f));
      if (R.kind === 'main') {
        texts.push(R.text);
        const tex = `n_txt_${C.code}_${R.text}`;
        const m = new THREE.Mesh(ringGeometry(D, mm(R.hole), T), [pvc(2003), navLit(tex), pvc(2003)]);
        m.name = `${rg.name} — „${R.text}“ (ორგმინა + PVC RAL 7016 წარწერა, კიდეები RAL 2003)`;
        rg.add(m);
      } else if (R.kind === 'symbol') {
        const ring = new THREE.Mesh(ringGeometry(D, mm(R.inner), T), pvc(R.ral));
        ring.name = `${rg.name} — რგოლი RAL ${R.ral} Ø${R.D}`;
        const disc = new THREE.Mesh(ringGeometry(mm(R.inner), 0, T), [pvc(R.ral), navLit(`n_sym_${R.symbol}`), pvc(R.ral)]);
        disc.name = `${rg.name} — სიმბოლო „${R.symbol}“ Ø${R.inner} (ორგმინა + PVC RAL 7016)`;
        rg.add(ring, disc);
      } else {
        const ring = new THREE.Mesh(ringGeometry(D, mm(R.hole), T), pvc(R.ral));
        ring.name = `${rg.name} — რგოლი RAL ${R.ral} Ø${R.D} / ${R.hole}`;
        rg.add(ring);
      }
      rg.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      // საკიდი: ჭერიდან (4.10) რგოლის თავამდე — ლითონის ზოლი 20 × 3 მმ, ჭერზე ფირფიტა
      const top = mm(R.bottom + R.D), len = H.ceiling - top;
      const hm = hangerMat(R.kind === 'main' ? 2003 : 7016);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(mm(NAV_HANGER.t), len, mm(NAV_HANGER.w)), hm);
      strip.name = `${rg.name} — საკიდი ${Math.round(len * 1000)} მმ`;
      strip.position.set(mm(R.r), top + len / 2, mm(R.f));
      const plate = new THREE.Mesh(new THREE.BoxGeometry(mm(NAV_HANGER.plate), 0.004, mm(NAV_HANGER.plate)), hm);
      plate.name = `${rg.name} — ჭერის სამაგრი`;
      plate.position.set(mm(R.r), H.ceiling - 0.002, mm(R.f));
      g.add(rg, strip, plate);
    });
    const ringsTxt = C.rings.map((R) => (R.kind === 'symbol' ? `Ø${R.D}/${R.inner}` : `Ø${R.D}/${R.hole}`)).join(', ');
    const lows = C.rings.map((R) => R.bottom);
    info(g, {
      name: `ჭერის ნავიგაცია — „${texts.join(' ').replace(/\s+/g, ' ')}“`, code: C.code, kind: 'ჭერის ნავიგაცია', zone: C.id,
      size: { 'რგოლები (მმ)': ringsTxt, 'ქვედა ნიშნულები': `${(Math.min(...lows) / 1000).toFixed(2)}–${(Math.max(...lows) / 1000).toFixed(2)} მ`, 'ჭერი': H.ceiling.toFixed(2) },
      status: { 'რგოლები (მმ)': 'pdf', 'ქვედა ნიშნულები': 'pdf', 'ჭერი': 'pdf', 'მდებარეობა': 'measured' },
      note: ['წყარო: ZGMF-27/28/29 (ავეჯის PDF, გვ. 30–32); ადგილი და ორიენტაცია — ჭერის გეგმიდან (≈ ±50 მმ, ±5°); საკიდის ზოლის კვეთა 20 × 3 მმ — ვარაუდი', C.note].filter(Boolean).join('. '),
      drawings: NAV_DRAWINGS[C.sheetPage],
    });
    group.add(g);
  }
}
