// ზუმერი — გლდანი მოლი · ინტერაქტიული 3D სანახავი
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildModel } from './model.js';
import { DIMENSIONS, ROOMS } from './config.js';
import { drawingsFor } from './drawings.js';
import { setNavLighting } from './lightbox-model.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lightSources, setDiffuserGlow } from './lighting-model.js';
import { SIM, SHEETS, MM_PER_PT, LIGHT_H, sheetPx } from './lighting.js';
import { SPEC_IMG } from './assets/lighting-specs.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const canvas = $('#c');
const coarse = matchMedia('(pointer: coarse)').matches;

// ------------------------------------------------------------------ რენდერერი
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// RectAreaLight-ების ციკლს three.js „ხსნის“ (unroll) — 50+ წყაროზე შეიდერი ძალიან იზრდება და კომპილაცია
// (განსაკუთრებით Windows/ANGLE-ზე) წამობით გრძელდება. ციკლი რჩება ჩვეულებრივ ციკლად — WebGL2 ამას უშვებს.
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace(
  /#pragma unroll_loop_start\s*(for \( int i = 0; i < NUM_RECT_AREA_LIGHTS; i \+\+ \) \{[^}]*\})\s*#pragma unroll_loop_end/,
  '$1',
);
RectAreaLightUniformsLib.init();

const labelRenderer = new CSS2DRenderer({ element: $('#labels') });

const scene = new THREE.Scene();

// „დიორამის“ სტილი: მუქი რადიალური ფონი
function gradientTexture(stops, w = 512, h = 512, cx = 0.5, cy = 0.42, r = 0.75) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.max(w, h) * r);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
scene.background = gradientTexture([[0, '#5a5f67'], [0.45, '#3a3e45'], [1, '#1c1e22']]);

// არეკვლებისთვის — რბილი „სტუდიის“ გარემო
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;

// ------------------------------------------------------------------ მოდელი
const { root, groups } = buildModel();
scene.add(root);
groups.ceiling.visible = false; // საწყისად ჭერი მოხსნილია

// ვინილის ჩანართები იატაკიდან მხოლოდ 4 მმ-ითაა ამოწეული — შორიდან სიღრმის ბუფერი მათ
// ვეღარ არჩევს იატაკისგან და ჩნდება წერტილები/ციმციმი (z-fighting). სანახავში ვინილს
// ვაძლევთ სიღრმის წანაცვლებას; GLB-ის ექსპორტისას ორიგინალი მასალები ბრუნდება.
const inlayMats = new Map(); // mesh → [ორიგინალი (GLB-სთვის), სანახავის ასლი]
for (const m of groups.floor.children) {
  if (!m.isMesh || m.userData.info?.kind !== 'იატაკის ვინილი') continue;
  const view = m.material.clone();
  view.polygonOffset = true;
  view.polygonOffsetFactor = -2;
  view.polygonOffsetUnits = -4;
  inlayMats.set(m, [m.material, view]);
  m.material = view;
}
const swapInlayMaterials = (forExport) => {
  for (const [m, [orig, view]] of inlayMats) m.material = forExport ? orig : view;
};


const bbox = new THREE.Box3().setFromObject(root);
const center = bbox.getCenter(new THREE.Vector3());
const size = bbox.getSize(new THREE.Vector3());
const BASE_TOP = -0.10, BASE_Y = -0.42, GROUND_Y = -0.95;
// კადრში მოსაქცევი წერტილები (+ კვარცხლბეკი); ზომების ჩართვისას ემატება ადგილი წარწერებისთვის
const DIM_PAD = 3.0, BASE_PAD = 0.6;
function fitCorners() {
  const p = (dims.visible ? DIM_PAD : 0) + BASE_PAD;
  const out = [];
  for (const x of [bbox.min.x - p, bbox.max.x + p]) for (const y of [BASE_Y, bbox.max.y]) for (const z of [bbox.min.z - p, bbox.max.z + p]) out.push(new THREE.Vector3(x, y, z));
  return out;
}
const homeTarget = new THREE.Vector3(center.x, 0.6, center.z);

// ------------------------------------------------------------------ კვარცხლბეკი, მიწა, განათების ლაქები (GLB-ში არ შედის)
const helpers = new THREE.Group();
helpers.name = 'helpers';
scene.add(helpers);

// განათების სისტემა, ცხაურები, ლუქები — ~450 პატარა ობიექტი. ცალ-ცალკე ხატვა (და ჩრდილის რუკაში ხელახლა)
// ტრიალს ანელებდა, ამიტომ ეკრანზე იხატება მასალების მიხედვით გაერთიანებული რამდენიმე მეში (helpers-ში,
// GLB-ში არ შედის). ორიგინალი ობიექტები რჩება უხილავი მასალით — არჩევისთვის, ბარათისთვის, კონტურისთვის;
// GLB-ის ექსპორტისას მათ ორიგინალი მასალები უბრუნდებათ.
const PROXY_MAT = new THREE.MeshBasicMaterial({ visible: false });
const proxyMats = new Map();
const batched = {};
for (const key of ['lighting', 'vents', 'hatches']) {
  const holder = new THREE.Group();
  holder.name = `${key} — batched render`;
  helpers.add(holder);
  batched[key] = holder;
  const buckets = new Map();
  groups[key].updateMatrixWorld(true);
  groups[key].traverse((m) => {
    if (!m.isMesh) return;
    if (!buckets.has(m.material)) buckets.set(m.material, { geos: [], cast: false });
    const b = buckets.get(m.material);
    b.geos.push(m.geometry.clone().applyMatrix4(m.matrixWorld));
    b.cast ||= m.castShadow;
    proxyMats.set(m, m.material);
    m.material = PROXY_MAT;
    m.castShadow = false;
  });
  for (const [mat, b] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(b.geos, false), mat);
    mesh.name = `${key} / ${mat.name}`;
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    holder.add(mesh);
  }
}
const swapProxyMaterials = (forExport) => {
  for (const [m, mat] of proxyMats) m.material = forExport ? mat : PROXY_MAT;
};

const basePts = [[-0.55, -0.55], [12.46, -0.55], [12.46, 3.78], [21.25, 3.78], [21.06, 16.83], [-0.55, 16.83]];
{
  const sh = new THREE.Shape();
  basePts.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: BASE_TOP - BASE_Y, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, BASE_Y, 0);
  const base = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#34373d', roughness: 0.5, metalness: 0.1 }));
  base.name = 'diorama base';
  base.castShadow = true;
  base.receiveShadow = true;
  helpers.add(base);
}
// მიწა — ფონში რბილად გადადის
{
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grd.addColorStop(0, '#fff'); grd.addColorStop(0.55, '#aaa'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const alpha = new THREE.CanvasTexture(c);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({ color: '#3a3d43', roughness: 0.9, transparent: true, alphaMap: alpha, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(center.x, GROUND_Y, center.z);
  ground.receiveShadow = true;
  ground.name = 'ground';
  helpers.add(ground);
}
// კვარცხლბეკის ქვეშ — თბილი სანათები და მათი შუქის ლაქები მიწაზე
{
  const glowTex = gradientTexture([[0, 'rgba(255,205,150,0.95)'], [0.3, 'rgba(255,165,95,0.38)'], [0.7, 'rgba(255,140,70,0.08)'], [1, 'rgba(255,140,70,0)']], 256, 256, 0.5, 0.5, 0.5);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.42, toneMapped: false });
  const dotMat = new THREE.MeshBasicMaterial({ color: '#fff2dc', toneMapped: false, side: THREE.DoubleSide });
  const glowGeo = new THREE.PlaneGeometry(3.4, 4.6);
  const dotGeo = new THREE.CircleGeometry(0.07, 20);
  const step = 2.3;
  for (let i = 0; i < basePts.length; i++) {
    const [x0, z0] = basePts[i], [x1, z1] = basePts[(i + 1) % basePts.length];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const nx = uz, nz = -ux; // გარე ნორმალი (კონტური საათის ისრით)
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n * len;
      const px = x0 + ux * t, pz = z0 + uz * t;
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = Math.PI / 2;
      dot.position.set(px - nx * 0.22, BASE_Y - 0.004, pz - nz * 0.22);
      helpers.add(dot);
      const gl = new THREE.Mesh(glowGeo, glowMat);
      gl.rotation.x = -Math.PI / 2;
      gl.position.set(px + nx * 0.7, GROUND_Y + 0.01, pz + nz * 0.7);
      gl.rotation.z = Math.atan2(nx, -nz);
      gl.renderOrder = 2;
      gl.userData.noAO = true;
      helpers.add(gl);
    }
  }
}

// ------------------------------------------------------------------ განათება
scene.add(new THREE.HemisphereLight('#dfe7f5', '#4a4038', 0.55));
const sun = new THREE.DirectionalLight('#fff1e0', 1.9);
sun.position.set(center.x - 9, 24, center.z - 12);
sun.target.position.copy(center);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -19; sc.right = 19; sc.top = 19; sc.bottom = -19; sc.near = 1; sc.far = 80;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.025;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#cfdcff', 0.45);
fill.position.set(center.x + 14, 10, center.z + 10);
scene.add(fill);
// ჭერის სანათების წინანდელი იმიტაცია (4 წერტილოვანი წყარო) ჩანაცვლებულია რეალური განათების სისტემით (ქვემოთ).

// ------------------------------------------------------------------ განათების სისტემა: სინათლის წყაროები
// ZGMP-10/12 სანათები: ფიზიკური ობიექტები — groups.lighting (ფენა „განათების სისტემა“); სინათლის წყაროები —
// ცალკე ჯგუფი სცენაში (ფენების ღილაკები მას არ ეხება). RectAreaLight — სინათლე მოდის დიფუზორის მთელი
// ზედაპირიდან (ლამბერტი), არა ერთი წერტილიდან. power (lm) → intensity (nit) = Φ / (π·A) — ამას three.js აკეთებს.
// ექსპოზიცია ფიქსირებულია (renderer.toneMappingExposure); ყველა წყაროს ნაკადი მრავლდება SIM.photometricScale-ზე.
const lightRig = new THREE.Group();
lightRig.name = 'light sources (viewer only)';
scene.add(lightRig);
const fastRig = new THREE.Group();
fastRig.name = 'light sources — fast (camera moving)';
fastRig.visible = false;
scene.add(fastRig);
let rigSimplified = false;
function clusterSources(src, k) {
  // k-means (წონა — ნაკადი); თითო ჯგუფი — კვადრატი, ფართობი = წყაროების ჯამური ფართობი
  let cs = src.filter((_, i) => i % Math.ceil(src.length / k) === 0).slice(0, k).map((q) => ({ x: q.x, z: q.z }));
  let asg = [];
  for (let it = 0; it < 12; it++) {
    asg = src.map((q) => { let b = 0, bd = Infinity; cs.forEach((c, i) => { const d = (c.x - q.x) ** 2 + (c.z - q.z) ** 2; if (d < bd) { bd = d; b = i; } }); return b; });
    cs = cs.map((c, i) => {
      const m = src.filter((_, j) => asg[j] === i);
      if (!m.length) return c;
      const w = m.reduce((a, q) => a + q.flux, 0);
      return { x: m.reduce((a, q) => a + q.x * q.flux, 0) / w, z: m.reduce((a, q) => a + q.z * q.flux, 0) / w };
    });
  }
  return cs.map((c, i) => {
    const m = src.filter((_, j) => asg[j] === i);
    if (!m.length) return null;
    const side = Math.sqrt(m.reduce((a, q) => a + q.w * q.h, 0));
    return { kind: 'cluster', ids: m.flatMap((q) => q.ids), x: c.x, z: c.z, y: Math.min(...m.map((q) => q.y)), ux: 1, uz: 0, w: side, h: side, flux: m.reduce((a, q) => a + q.flux, 0) };
  }).filter(Boolean);
}
{
  let src = lightSources();
  // სუსტ GPU-ზე (ფრაგმენტის uniform-ების მცირე ლიმიტი) წყაროები ერთიანდება სივრცულ ჯგუფებად — ნაკადი იგივეა
  const gl = renderer.getContext();
  const budget = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 1024;
  const maxRect = Math.floor((budget - 170) / 4);
  if (src.length > maxRect) { src = clusterSources(src, Math.max(6, maxRect)); rigSimplified = true; }
  const basis = new THREE.Matrix4();
  for (const q of src) {
    const l = new THREE.RectAreaLight(0xffffff, 0, q.w, q.h);
    const X = new THREE.Vector3(q.ux, 0, q.uz).normalize(), Z = new THREE.Vector3(0, 1, 0), Y = new THREE.Vector3().crossVectors(Z, X);
    l.quaternion.setFromRotationMatrix(basis.makeBasis(X, Y, Z)); // ადგილობრივი −Z = ქვემოთ — ასხივებს იატაკისკენ
    l.position.set(q.x, q.y, q.z);
    l.userData = { flux: q.flux, ids: q.ids, kind: q.kind, fluxIsAssumed: !!q.fluxIsAssumed };
    lightRig.add(l);
  }
  // მოძრაობის რეჟიმი: 52 ფართობის წყარო ინტეგრირებულ GPU-ზე კადრს ~2-ჯერ ანელებს, ამიტომ კამერის
  // მოძრაობისას (როგორც AO) მუშაობს 8 იაფი, ქვემოთ მიმართული წყარო იგივე ჯამური ნაკადით; გაჩერებისას —
  // ზუსტი ფართობის წყაროები. ორივე შეიდერი წინასწარ კომპილირდება (გადართვა შეფერხების გარეშეა).
  for (const q of clusterSources(lightSources(), 8)) {
    const sp = new THREE.SpotLight(0xffffff, 0, 0, Math.PI / 2 * 0.96, 1, 2);
    sp.position.set(q.x, q.y, q.z);
    sp.target.position.set(q.x, 0, q.z);
    sp.userData = { flux: q.flux };
    fastRig.add(sp, sp.target);
  }
}
let fastLights = false;
function setFastLights(on) {
  if (fastLights === on) return;
  fastLights = on;
  lightRig.visible = !on;
  fastRig.visible = on;
}
// ფერის ტემპერატურა → წრფივი sRGB ფერი, სიკაშკაშე (Y) = 1 — ნაკადი K-ის ცვლილებისას არ იცვლება.
// პლანკის ლოკუსი: Kim et al. (2002) კუბური მიახლოება; XYZ → sRGB (D65).
function cctColor(T) {
  const T2 = T * T, T3 = T2 * T;
  const x = T <= 4000 ? -0.2661239e9 / T3 - 0.2343589e6 / T2 + 0.8776956e3 / T + 0.179910 : -3.0258469e9 / T3 + 2.1070379e6 / T2 + 0.2226347e3 / T + 0.240390;
  const x2 = x * x, x3 = x2 * x;
  const y = T <= 2222 ? -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683
    : T <= 4000 ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
      : 3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483;
  const X = x / y, Z = (1 - x - y) / y;
  const r = Math.max(0, 3.2406 * X - 1.5372 - 0.4986 * Z), g = Math.max(0, -0.9689 * X + 1.8758 + 0.0415 * Z), b = Math.max(0, 0.0557 * X - 0.2040 + 1.0570 * Z);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return new THREE.Color().setRGB(r / lum, g / lum, b / lum, THREE.LinearSRGBColorSpace);
}
let lightsOn = true;
let cct = SIM.cctDefault; // გამორთვისას ინახება და ჩართვისას ისევ გამოიყენება
function applyLighting() {
  const c = cctColor(cct);
  for (const l of lightRig.children) {
    l.color.copy(c);
    l.power = lightsOn ? l.userData.flux * SIM.photometricScale : 0;
  }
  for (const l of fastRig.children) {
    if (!l.isSpotLight) continue;
    l.color.copy(c);
    l.power = lightsOn ? l.userData.flux * SIM.photometricScale : 0; // SpotLight: power = I·π — ღერძზე იგივე ძალა, რაც ლამბერტის ზედაპირს
  }
  setDiffuserGlow(lightsOn, c);
  updateLumCard();
  needsRender = true;
}

// ------------------------------------------------------------------ კამერები
const persp = new THREE.PerspectiveCamera(32, 1, 0.02, 600);
const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
let camera = persp;
let controls;
let viewName = 'home';
let userMoved = false;
let lastPersp = null;
let needsRender = true;
// „ცენტრში დაბრუნება“ (ნაგულისხმევად ჩართული): მაღაზიის ცენტრი რჩება ეკრანის ცენტრში —
// ზუმი ცენტრისკენ მიდის, გადაადგილების შემდეგ ხედი რბილად ბრუნდება ცენტრში.
// ფოკუსი (ორჯერ დაჭერა) ძალაშია, სანამ ობიექტი არჩეულია. გამორთვისას — ძველი რეჟიმი.
let autoCenter = true;
// დაშორების ზღვარი ეკრანზე მორგებულ ხედზე არანაკლები — ვიწრო (ვერტიკალურ) ტელეფონზე მთლიანი
// ფილიალის ხედი 95 მ-ზე შორსაა და ზღვარი პირველი შეხებისას კამერას ახტუნებდა.
let maxDist = 95;
let focused = null;
let dragging = false;

let composer = null, aoPass = null;
const AO_ON = true;
function buildComposer() {
  const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
  composer?.dispose();
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  if (AO_ON) {
    const k = coarse ? 0.5 : 1;
    aoPass = new GTAOPass(scene, camera, Math.round(w * k), Math.round(h * k));
    aoPass.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1.2, thickness: 1.5, scale: 1.25, samples: coarse ? 8 : 16 });
    aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: coarse ? 8 : 16 });
    aoPass.blendIntensity = 1.0;
    composer.addPass(aoPass);
  }
  composer.addPass(new OutputPass());
}

function makeControls(cam, target) {
  controls?.dispose();
  controls = new OrbitControls(cam, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = !autoCenter;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 1.1;
  controls.panSpeed = 1.0;
  controls.minDistance = 0.35;
  controls.maxDistance = maxDist;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;
  controls.minZoom = 0.35;
  controls.maxZoom = 40;
  controls.enableRotate = cam !== ortho;
  controls.addEventListener('start', () => { userMoved = true; dragging = true; cancelTween(); hideHint(); });
  controls.addEventListener('end', () => { dragging = false; });
  controls.addEventListener('change', () => { needsRender = true; });
  controls.update();
}

// ------------------------------------------------------------------ კადრში მოქცევა
function fitDistance(cam, dir, target, objCorners = fitCorners(), margin = 0.92) {
  const f = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, f).normalize();
  const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * margin;
  const th = tv * cam.aspect;
  let d = 0;
  for (const c of objCorners) {
    const p = c.clone().sub(target);
    const along = p.dot(dir);
    d = Math.max(d, along + Math.abs(p.dot(right)) / th, along + Math.abs(p.dot(up)) / tv);
  }
  return d;
}

const DIRS = {
  home: new THREE.Vector3(-0.55, 0.98, -0.85).normalize(),
  front: new THREE.Vector3(0, 0.36, -1).normalize(),
  side: new THREE.Vector3(-1, 0.36, 0).normalize(),
};

function perspPose(dir, target = homeTarget, objCorners = fitCorners(), margin) {
  const d = fitDistance(persp, dir, target, objCorners, margin);
  maxDist = Math.max(maxDist, d * 1.6);
  if (controls) controls.maxDistance = maxDist;
  return { pos: target.clone().addScaledVector(dir, d), target: target.clone() };
}

function useCamera(cam) {
  if (camera === cam) return;
  const t = controls ? controls.target.clone() : homeTarget.clone();
  camera = cam;
  makeControls(cam, t);
  buildComposer();
}

function setView(name, animate = true) {
  viewName = name;
  focused = null;
  if (name !== 'fit') setActiveView(name);
  if (name === 'top' || (name === 'fit' && camera === ortho)) {
    if (camera === persp) {
      lastPersp = { pos: persp.position.clone(), target: controls.target.clone() };
      const t0 = controls.target;
      ortho.position.set(t0.x, 80, t0.z + 0.001);
      ortho.zoom = 1;
      ortho.updateProjectionMatrix();
    }
    useCamera(ortho);
    fitOrtho();
    const t = new THREE.Vector3(center.x, 0, center.z);
    tweenTo({ pos: new THREE.Vector3(center.x, 80, center.z + 0.001), target: t, zoom: 1 }, animate);
    return;
  }
  let pose;
  if (name === '3d') {
    pose = lastPersp || perspPose(DIRS.home);
  } else if (name === 'fit') {
    const dir = camera === persp ? persp.position.clone().sub(controls.target).normalize() : DIRS.home;
    pose = perspPose(dir, center.clone());
  } else {
    pose = perspPose(DIRS[name] || DIRS.home);
  }
  if (camera !== persp) {
    // ორთოგრაფიულიდან პერსპექტივაზე: კამერა იწყება ზემოდან, რომ გადასვლა რბილი იყოს
    persp.position.set(controls.target.x, 40, controls.target.z + 0.01);
    useCamera(persp);
  }
  tweenTo(pose, animate);
  if (name !== 'fit') lastPersp = null;
}

// თავისუფალი არე (პანელების გარეშე) — მოდელი ცენტრდება ამ არეში
function freeArea() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (autoCenter) return { w, h, fw: w, fh: h }; // ცენტრი — ეკრანის ზუსტ ცენტრში
  const tb = $('.toolbar').getBoundingClientRect();
  let fw = w, fh = h;
  if (tb.height < h * 0.5 && tb.bottom > h - 4 && tb.width > w * 0.8) fh = Math.max(h * 0.5, tb.top); // ქვედა ზოლი (ტელეფონი)
  else if (tb.left > w * 0.45) fw = Math.max(w * 0.5, tb.left - 8);                                  // მარჯვენა პანელი
  return { w, h, fw, fh };
}
function applyViewOffset() {
  const { w, h, fw, fh } = freeArea();
  if (!w || !h) return { w, h, fw, fh };
  persp.aspect = fw / fh;
  persp.setViewOffset(fw, fh, 0, 0, w, h);
  persp.updateProjectionMatrix();
  return { w, h, fw, fh };
}
function fitOrtho() {
  const { w, h, fw, fh } = freeArea();
  if (!w || !h) return;
  const aspect = fw / fh;
  const m = 1.08;
  const p = dims.visible ? DIM_PAD : 0;
  const hh = Math.max((size.z / 2 + p) * m, ((size.x / 2 + p) * m) / aspect);
  ortho.left = -hh * aspect; ortho.right = hh * aspect; ortho.top = hh; ortho.bottom = -hh;
  ortho.setViewOffset(fw, fh, 0, 0, w, h);
  ortho.updateProjectionMatrix();
}

// ------------------------------------------------------------------ რბილი ანიმაცია
let tween = null;
function cancelTween() { tween = null; }
function tweenTo(pose, animate = true, ms = 700) {
  const from = { pos: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom };
  const to = { pos: pose.pos, target: pose.target, zoom: pose.zoom ?? camera.zoom };
  if (!animate) {
    camera.position.copy(to.pos); controls.target.copy(to.target); camera.zoom = to.zoom;
    camera.updateProjectionMatrix(); controls.update(); needsRender = true; tween = null;
    return;
  }
  tween = { from, to, t0: performance.now(), ms };
}
function stepTween(now) {
  if (!tween) return false;
  let k = Math.min(1, (now - tween.t0) / tween.ms);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
  controls.target.lerpVectors(tween.from.target, tween.to.target, e);
  camera.zoom = tween.from.zoom + (tween.to.zoom - tween.from.zoom) * e;
  camera.updateProjectionMatrix();
  if (k >= 1) tween = null;
  return true;
}

function zoomBy(factor) {
  hideHint();
  userMoved = true;
  if (camera === ortho) {
    const z = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom);
    tweenTo({ pos: camera.position.clone(), target: controls.target.clone(), zoom: z }, true, 280);
  } else {
    const off = camera.position.clone().sub(controls.target);
    const len = THREE.MathUtils.clamp(off.length() / factor, controls.minDistance, controls.maxDistance);
    tweenTo({ pos: controls.target.clone().add(off.setLength(len)), target: controls.target.clone() }, true, 280);
  }
}

// ------------------------------------------------------------------ ზომების ხაზები და წარწერები
const dims = new THREE.Group();
dims.name = 'dimensions';
dims.visible = false;
scene.add(dims);
const lineMat = {
  pdf: new THREE.LineBasicMaterial({ color: '#f2f4f6', depthTest: false, transparent: true }),
  approx: new THREE.LineDashedMaterial({ color: '#ff8a4c', dashSize: 0.18, gapSize: 0.12, depthTest: false, transparent: true }),
};
function label(text, cls, pos) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.position.copy(pos);
  o.center.set(0.5, 0.5);
  dims.add(o);
  return o;
}
function addLine(pts, kind) {
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const l = new THREE.LineSegments(g, lineMat[kind]);
  if (kind === 'approx') l.computeLineDistances();
  l.renderOrder = 10;
  dims.add(l);
}
for (const d of DIMENSIONS) {
  const kind = d.status === 'pdf' ? 'pdf' : 'approx';
  const cls = `dim ${kind}`;
  if (d.v) {
    const [x, z] = d.a, [y0, y1] = d.v;
    const p0 = new THREE.Vector3(x, y0, z), p1 = new THREE.Vector3(x, y1, z);
    const tk = 0.12;
    addLine([p0, p1, new THREE.Vector3(x - tk, y0, z - tk), new THREE.Vector3(x + tk, y0, z + tk), new THREE.Vector3(x - tk, y1, z - tk), new THREE.Vector3(x + tk, y1, z + tk)], kind);
    label(d.text, cls, new THREE.Vector3(x, (y0 + y1) / 2, z));
    continue;
  }
  const y = d.y ?? 0.03;
  const [ox, oz] = d.off || [0, 0];
  const a = new THREE.Vector3(d.a[0] + ox, y, d.a[1] + oz), b = new THREE.Vector3(d.b[0] + ox, y, d.b[1] + oz);
  const u = b.clone().sub(a).normalize();
  const n = new THREE.Vector3(-u.z, 0, u.x).multiplyScalar(0.14);
  const t = u.clone().add(new THREE.Vector3(-u.z, 0, u.x)).normalize().multiplyScalar(0.12);
  const pts = [a, b, a.clone().sub(t), a.clone().add(t), b.clone().sub(t), b.clone().add(t)];
  if (ox || oz) {
    pts.push(new THREE.Vector3(d.a[0], y, d.a[1]), a.clone().add(n.clone().multiplyScalar(Math.sign(ox + oz) || 1)));
    pts.push(new THREE.Vector3(d.b[0], y, d.b[1]), b.clone().add(n.clone().multiplyScalar(Math.sign(ox + oz) || 1)));
  }
  addLine(pts, kind);
  label(d.text, cls, a.clone().lerp(b, 0.5));
}
for (const r of ROOMS) {
  const el = document.createElement('div');
  el.className = 'room';
  el.innerHTML = `<b>${r.name}</b><span>${r.area}</span>`;
  const o = new CSS2DObject(el);
  o.position.set(r.x, 0.05, r.z);
  dims.add(o);
}
label('ფასადი A', 'facade', new THREE.Vector3(5.9, 3.4, -2.6));
label('ფასადი B', 'facade', new THREE.Vector3(-2.6, 3.4, 8.1));

// ------------------------------------------------------------------ ობიექტის არჩევა
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const selBox = new THREE.Box3();
const selHelper = new THREE.Box3Helper(selBox, '#ff5a1f');
selHelper.visible = false;
selHelper.material.depthTest = false;
selHelper.renderOrder = 20;
helpers.add(selHelper);
let selected = null;

function isShown(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
function infoRoot(o) {
  for (let p = o; p && p !== root; p = p.parent) if (p.userData.info) return p;
  return null;
}
function pick(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(root, true);
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    if (h.object.userData.noPick || !isShown(h.object)) continue;
    const ir = infoRoot(h.object);
    if (!ir) continue;
    // ზემოდან რელსი ფარავს მის ქვეშ დაკიდებულ სანათს — თუ სანათი რელსის უშუალოდ ქვემოთაა, ირჩევა სანათი
    if (ir.userData.info.kind === 'განათების რელსი') {
      for (let k = i + 1; k < hits.length && hits[k].distance - h.distance < 0.12; k++) {
        const lr = isShown(hits[k].object) && infoRoot(hits[k].object);
        if (lr?.userData.info.lum) return lr;
      }
    }
    return ir;
  }
  return null;
}

// ორიენტირებული კონტური (სანათები, რელსები, ცხაურები, ლუქები) — ობიექტის საკუთარ ღერძებში
const selOutline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#ff5a1f', depthTest: false, transparent: true }));
selOutline.matrixAutoUpdate = false;
selOutline.visible = false;
selOutline.renderOrder = 21;
helpers.add(selOutline);
function outlineObject(obj) {
  obj.updateMatrixWorld(true);
  const inv = obj.matrixWorld.clone().invert(), b = new THREE.Box3(), mtx = new THREE.Matrix4();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    b.union(o.geometry.boundingBox.clone().applyMatrix4(mtx.multiplyMatrices(inv, o.matrixWorld)));
  });
  const size = b.getSize(new THREE.Vector3()).addScalar(0.03), c = b.getCenter(new THREE.Vector3());
  selOutline.matrix.multiplyMatrices(obj.matrixWorld, new THREE.Matrix4().compose(c, new THREE.Quaternion(), size));
  selOutline.matrixWorldNeedsUpdate = true;
  selOutline.visible = true;
}

// სანათის ბარათი: „სპეციფიკაცია“ / „სქემა“
const NA = '<span class="na">სპეციფიკაციაში მითითებული არ არის</span>';
const DWG_BY_SHEET = Object.fromEntries(Object.entries(SHEETS).map(([k, v]) => [v.drawing, k]));
function markPx(mark, dwgId) {
  const sh = DWG_BY_SHEET[dwgId];
  if (!sh || !mark) return null;
  const [px, py] = sheetPx(sh, mark.x, mark.z);
  const k = 1000 / MM_PER_PT * 3;
  const w = (mark.len ?? mark.d ?? mark.sq) * k, h = (mark.wid ?? mark.d ?? mark.sq) * k;
  return { px, py, w, h, ang: mark.ang || 0, round: mark.d != null };
}
function lumCardHtml(inf) {
  const f = inf.lum, sp = f.spec, lin = f.kind === 'linear';
  const row = (k, v) => `<tr><th>${k}</th><td>${v ?? NA}</td></tr>`;
  const dims = lin
    ? `სიგრძე 1000 მმ <span class="badge ok">სპეც.</span><br>სიგანე ≈${Math.round(f.W * 1000)} მმ <span class="badge meas">≈ ნახაზიდან</span><br>სიმაღლე ${Math.round(f.H * 1000)} მმ <span class="badge asm">ვარაუდი</span>`
    : 'Ø 500 მმ · H 100 მმ <span class="badge ok">სპეც.</span>';
  const mount = lin
    ? `რელსი ${LIGHT_H.rail.toFixed(2)} მ <span class="badge ok">ZGMP-10</span><br>დიფუზორი ≈${f.yBottom.toFixed(2)} მ <span class="badge asm">ვარაუდი</span>`
    : `ზედა სიბრტყე ${f.yTop.toFixed(2)} მ, ქვედა ${f.yBottom.toFixed(2)} მ <span class="badge meas">ZGMP-12 შენიშვნა</span><br>ტროსი ≈${Math.round((LIGHT_H.ceiling - f.yTop) * 1000)} მმ (სპეც.: 600 სმ — მაქსიმალური სიგრძე)`;
  const flux = sp.flux
    ? `${sp.flux} lm <span class="badge ok">სპეც.</span>`
    : `${NA}<br><span class="sub">სიმულაციაში პირობითად ${SIM.pledVisualFlux} lm — მხოლოდ ვიზუალიზაცია, 35 W-იდან არ არის გამოთვლილი</span>`;
  return `
    <div class="meta">${inf.code} · ${inf.kind}${inf.zone ? ' · ' + inf.zone : ''}</div>
    <h2>${inf.name}</h2>
    <div class="ltabs" role="tablist"><button type="button" class="ltab active" data-tab="spec" role="tab">სპეციფიკაცია</button><button type="button" class="ltab" data-tab="scheme" role="tab">სქემა</button></div>
    <div class="lpane" data-pane="spec">
      <div class="lhead"><img src="${SPEC_IMG[sp.image]}" alt="${f.model}"><div><b>${f.model}</b><span>${sp.type}</span>${lin ? '' : '<span class="sub">ფოტო — მწარმოებლის (შავი კორპუსი); პროექტში კორპუსი თეთრია, RAL 9010</span>'}</div></div>
      <table class="spec">
        ${row('უნიკალური ID', `<b>${f.id}</b>`)}
        ${row('მოდელი / ტიპი', `${f.model} — ${sp.type}`)}
        ${row('ზომები', dims)}
        ${row('კორპუსის ფერი', sp.color)}
        ${row('სიმძლავრე', `${sp.power} W`)}
        ${row('სინათლის ნაკადი', flux)}
        ${row('ფერის ტემპ. (სპეც.)', `${sp.cct} K`)}
        ${row('ფერის ტემპ. (სიმულაცია)', '<span id="lc-cct"></span>')}
        ${row('კორპუსის მასალა', sp.body)}
        ${row('დიფუზორი', sp.diffuser)}
        ${row('LED', sp.led)}
        ${row('დრაივერი', sp.driver)}
        ${row('დაცვის კლასი', sp.ip)}
        ${row('სამონტაჟო სიმაღლე', mount)}
        ${row('მდებარეობა', `X ${f.x.toFixed(3)} · Z ${f.z.toFixed(3)} მ${lin ? `<br>სხივი ${f.rayAngle}°, ცენტრიდან ${f.r.toFixed(2)} მ` : ''}`)}
        ${row('განათებულობა (lux)', '<span class="sub">არ ითვლება — IES/LDT ფაილი არ არის; ვიზუალიზაცია მიახლოებითია</span>')}
        ${row('შუქის სტატუსი', '<span id="lc-state"></span>')}
      </table>
    </div>
    <div class="lpane" data-pane="scheme" hidden>
      <div class="sch-sheets" id="sch-sheets"></div>
      <div class="sch-stage" id="sch-stage"><img id="sch-img" alt="" draggable="false"><div class="dmark" id="sch-mark" hidden></div><div class="dring" id="sch-ring" hidden></div><div class="dwg-msg" id="sch-msg"></div></div>
      <div class="sch-tools"><button type="button" class="dwg-btn" id="sch-out" aria-label="დაშორება">−</button><button type="button" class="dwg-btn" id="sch-fit" aria-label="მთლიანი ფურცელი"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button><button type="button" class="dwg-btn" id="sch-in" aria-label="მიახლოება">+</button><button type="button" class="btn" id="sch-full">სრულ ეკრანზე</button></div>
    </div>`;
}
function updateLumCard() {
  const a = document.getElementById('lc-cct'), b = document.getElementById('lc-state');
  if (a) a.innerHTML = `${cct} K <span class="badge asm">ვიზუალური სიმულაცია</span>`;
  if (b) b.innerHTML = lightsOn ? '<span class="badge ok">ჩართული</span>' : '<span class="badge asm">გამორთული</span>';
}

const STATUS = {
  pdf: ['PDF', 'ok'],
  measured: ['≈ ნახაზიდან', 'meas'],
  assumed: ['ვარაუდი', 'asm'],
};
function select(obj) {
  selected = obj;
  const card = $('#info');
  if (!obj) { focused = null; selHelper.visible = false; selOutline.visible = false; card.hidden = true; needsRender = true; return; }
  const inf = obj.userData.info;
  if (inf.mark) { selHelper.visible = false; outlineObject(obj); }
  else { selOutline.visible = false; selBox.setFromObject(obj); selHelper.visible = true; }
  card.classList.toggle('lum', !!inf.lum);
  if (inf.lum) {
    $('#info-body').innerHTML = lumCardHtml(inf);
    updateLumCard();
    card.hidden = false;
    curDrawings = drawingsFor(inf);
    $('#info-drawing').hidden = !curDrawings.length;
    needsRender = true;
    return;
  }
  const rows = Object.entries(inf.size || {}).map(([k, v]) => {
    const st = inf.status?.[k] || 'pdf';
    const [txt, cls] = STATUS[st] || STATUS.pdf;
    const val = /მ²/.test(v) || /[^\d.]/.test(v) ? v : `${st === 'pdf' ? '' : '≈ '}${v} მ`;
    return `<tr><th>${k}</th><td>${val}</td><td><span class="badge ${cls}">${txt}</span></td></tr>`;
  });
  if (inf.status?.['მდებარეობა']) {
    const [txt, cls] = STATUS[inf.status['მდებარეობა']] || STATUS.pdf;
    rows.push(`<tr><th>მდებარეობა</th><td>გეგმაზე</td><td><span class="badge ${cls}">${txt}</span></td></tr>`);
  }
  if (inf.status?.['კონტური']) {
    const [txt, cls] = STATUS[inf.status['კონტური']] || STATUS.pdf;
    rows.push(`<tr><th>კონტური</th><td>გეგმაზე</td><td><span class="badge ${cls}">${txt}</span></td></tr>`);
  }
  const meta = [inf.code, inf.kind, inf.zone].filter(Boolean).join(' · ');
  $('#info-body').innerHTML = `
    <div class="meta">${meta}</div>
    <h2>${inf.name}</h2>
    <table>${rows.join('')}</table>
    ${inf.note ? `<p class="note">${inf.note}</p>` : ''}`;
  card.hidden = false;
  curDrawings = drawingsFor(inf);
  $('#info-drawing').hidden = !curDrawings.length;
  needsRender = true;
}

function focusOn(obj) {
  if (!obj) return;
  focused = obj;
  const b = new THREE.Box3().setFromObject(obj);
  const c = b.getCenter(new THREE.Vector3());
  const cs = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) cs.push(new THREE.Vector3(x, y, z));
  userMoved = true;
  if (camera === ortho) {
    const s = b.getSize(new THREE.Vector3());
    const span = Math.max(s.x / (ortho.right - ortho.left), s.z / (ortho.top - ortho.bottom));
    const zoom = THREE.MathUtils.clamp(0.45 / Math.max(span, 1e-3), controls.minZoom, controls.maxZoom);
    tweenTo({ pos: new THREE.Vector3(c.x, camera.position.y, c.z + 0.001), target: new THREE.Vector3(c.x, 0, c.z), zoom });
    return;
  }
  let dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.25) dir.y = 0.25;
  dir.normalize();
  let d = fitDistance(persp, dir, c, cs, 0.5);
  d = THREE.MathUtils.clamp(d, 1.4, controls.maxDistance);
  tweenTo({ pos: c.clone().addScaledVector(dir, d), target: c }, true, 750);
}

// დაჭერა / ორმაგი დაჭერა (მაუსი და სენსორი)
let down = null, lastTap = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, multi: !e.isPrimary };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || e.pointerId !== down.id || down.multi) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t;
  down = null;
  if (moved > 6 || dt > 450) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const obj = pick(e.clientX, e.clientY);
  const now = performance.now();
  const dbl = lastTap && now - lastTap.t < 380 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
  lastTap = dbl ? null : { t: now, x: e.clientX, y: e.clientY };
  select(obj);
  if (dbl && obj) focusOn(obj);
});

// ------------------------------------------------------------------ ღილაკები
function setActiveView(name) {
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
const layerTargets = { ceiling: groups.ceiling, exterior: groups.exterior, furniture: groups.furniture, dims, nav: groups.navigation, lighting: groups.lighting, vents: groups.vents, hatches: groups.hatches };
// შუქის ჩართვა/გამორთვა — დამოუკიდებელია განათების სისტემის ხილვადობისგან და ნავიგაციის განათებისგან
function setLightsOn(on) {
  lightsOn = on;
  $('#lights-on').setAttribute('aria-pressed', String(on));
  $('#cct').classList.toggle('off', !on);
  applyLighting();
}
$('#lights-on').addEventListener('click', () => setLightsOn(!lightsOn));
// ფერის ტემპერატურის ბარი (2700–6500 K, ბიჯი 100) — ვიზუალური სიმულაცია
function setCct(k) {
  cct = THREE.MathUtils.clamp(Math.round(k / SIM.cctStep) * SIM.cctStep, SIM.cctMin, SIM.cctMax);
  $('#cct-range').value = String(cct);
  $('#cct-val').textContent = `${cct} K`;
  $('#cct-range').style.setProperty('--p', `${((cct - SIM.cctMin) / (SIM.cctMax - SIM.cctMin)) * 100}%`);
  $('#cct-reset').disabled = cct === SIM.cctDefault;
  applyLighting();
}
$('#cct-range').addEventListener('input', (e) => setCct(+e.target.value));
$('#cct-minus').addEventListener('click', () => setCct(cct - SIM.cctStep));
$('#cct-plus').addEventListener('click', () => setCct(cct + SIM.cctStep));
$('#cct-reset').addEventListener('click', () => setCct(SIM.cctDefault));
$('#cct-collapse').addEventListener('click', () => {
  const c = $('#cct').classList.toggle('collapsed');
  $('#cct-collapse').setAttribute('aria-expanded', String(!c));
});
if (rigSimplified) $('#cct').title = 'ამ მოწყობილობაზე სინათლის წყაროები გამარტივებულად (ჯგუფებად) ითვლება — ნაკადი იგივეა.';
// ნავიგაციის განათება — მომხმარებლის ბოლო არჩევანი ინახება, როცა ნავიგაცია დამალულია
let navLightOn = true;
function setNavLight(on) {
  navLightOn = on;
  setNavLighting(on);
  $('#nav-light').setAttribute('aria-pressed', String(on));
  needsRender = true;
}
$('#nav-light').addEventListener('click', () => setNavLight(!navLightOn));
function setLayer(key, on) {
  layerTargets[key].visible = on;
  if (batched[key]) batched[key].visible = on;
  if (key === 'nav') $('#nav-light').disabled = !on;
  const btn = document.querySelector(`[data-layer="${key}"]`);
  btn.setAttribute('aria-pressed', String(on));
  if (key === 'dims') {
    $('#legend').hidden = !on;
    fitOrtho();
    if (!userMoved && !tween) setView(viewName, true);
  }
  if (selected && !isShown(selected)) select(null);
  needsRender = true;
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { hideHint(); userMoved = false; setView(b.dataset.view); }));
document.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => setLayer(b.dataset.layer, !layerTargets[b.dataset.layer].visible)));
$('#zoom-in').addEventListener('click', () => zoomBy(1.35));
$('#zoom-out').addEventListener('click', () => zoomBy(1 / 1.35));
$('#info-close').addEventListener('click', () => select(null));
$('#info-focus').addEventListener('click', () => focusOn(selected));

// ------------------------------------------------------------------ ნახაზი PDF-დან
// ობიექტის ფურცლები (PDF-ის სრული გვერდი, 3573 × 2526 px) — drawings/<id>.webp; ზუმი, გადაადგილება, გვერდები.
let curDrawings = [];
const DWG_DIR = 'drawings/';
const dwg = { el: $('#dwg'), stage: $('#dwg-stage'), img: $('#dwg-img'), msg: $('#dwg-msg'), list: [], i: 0, s: 1, x: 0, y: 0, fitS: 1 };
$('#dwg-hint').textContent = coarse
  ? 'ორი თითი — ზუმი · ერთი თითი — გადაადგილება · ორმაგი შეხება — მიახლოება / მთლიანი ფურცელი'
  : 'ბორბალი — ზუმი · გადათრევა — გადაადგილება · ორჯერ დაჭერა — მიახლოება / მთლიანი ფურცელი · ← → — გვერდები · Esc — დახურვა';
// ნახაზზე არჩეული ობიექტის მონიშვნა (მართკუთხედი/წრე + პულსირებადი რგოლი) — მოძრაობს სურათთან ერთად
function placeMark(markEl, ringEl, m, x, y, s) {
  if (!markEl || !ringEl) return;
  if (!m) { markEl.hidden = ringEl.hidden = true; return; }
  const cx = x + m.px * s, cy = y + m.py * s, w = Math.max(10, m.w * s), h = Math.max(6, m.h * s);
  Object.assign(markEl.style, { left: `${cx - w / 2}px`, top: `${cy - h / 2}px`, width: `${w}px`, height: `${h}px`, transform: `rotate(${m.ang}deg)`, borderRadius: m.round ? '50%' : '3px' });
  ringEl.style.left = `${cx}px`;
  ringEl.style.top = `${cy}px`;
  markEl.hidden = ringEl.hidden = false;
}
const dwgApply = () => {
  dwg.img.style.transform = `translate(${dwg.x}px, ${dwg.y}px) scale(${dwg.s})`;
  placeMark($('#dwg-mark'), $('#dwg-ring'), dwg.loaded ? dwg.mark : null, dwg.x, dwg.y, dwg.s);
};
function dwgFit() {
  const W = dwg.stage.clientWidth, H = dwg.stage.clientHeight, iw = dwg.img.naturalWidth, ih = dwg.img.naturalHeight;
  if (!iw || !W) return;
  dwg.fitS = Math.min((W - 20) / iw, (H - 20) / ih);
  dwg.s = dwg.fitS;
  dwg.x = (W - iw * dwg.s) / 2;
  dwg.y = (H - ih * dwg.s) / 2;
  dwgApply();
}
function dwgZoom(f, cx, cy) {
  if (cx === undefined) { cx = dwg.stage.clientWidth / 2; cy = dwg.stage.clientHeight / 2; }
  const ns = THREE.MathUtils.clamp(dwg.s * f, dwg.fitS * 0.8, 2.5);
  const k = ns / dwg.s;
  dwg.x = cx - (cx - dwg.x) * k;
  dwg.y = cy - (cy - dwg.y) * k;
  dwg.s = ns;
  dwgApply();
}
function dwgShow(i) {
  dwg.i = (i + dwg.list.length) % dwg.list.length;
  const d = dwg.list[dwg.i];
  $('#dwg-sub').textContent = `${d.sheet} · ${d.title} · ${d.pdf === 'plan' ? 'გეგმების' : 'ავეჯის'} PDF, გვ. ${d.page}`;
  document.querySelectorAll('#dwg-tabs button').forEach((b, k) => b.classList.toggle('active', k === dwg.i));
  const src = DWG_DIR + d.id + '.webp';
  $('#dwg-open').href = src;
  dwg.msg.textContent = 'ნახაზი იტვირთება…';
  dwg.img.style.visibility = 'hidden';
  dwg.mark = markPx(selected?.userData.info?.mark, d.id);
  dwg.loaded = false;
  dwgApply();
  dwg.img.onload = () => {
    dwg.msg.textContent = ''; dwg.img.style.visibility = ''; dwg.loaded = true; dwgFit();
    // მონიშნული ობიექტი — ეკრანის ცენტრში, წასაკითხ მასშტაბზე
    if (dwg.mark) { const W = dwg.stage.clientWidth, H = dwg.stage.clientHeight, sc = Math.max(dwg.fitS, 0.55); dwg.s = sc; dwg.x = W / 2 - dwg.mark.px * sc; dwg.y = H / 2 - dwg.mark.py * sc; dwgApply(); }
  };
  dwg.img.onerror = () => {
    dwg.msg.textContent = `ნახაზის ფაილი ვერ ჩაიტვირთა (${src}). branch-viewer.html-თან ერთად უნდა იყოს საქაღალდე „drawings“.`;
  };
  dwg.img.src = src;
  dwg.list.forEach((o) => { if (o !== d) new Image().src = DWG_DIR + o.id + '.webp'; }); // დანარჩენი გვერდები წინასწარ
}
function dwgOpen() {
  if (!curDrawings.length || !selected) return;
  dwg.list = curDrawings;
  const inf = selected.userData.info;
  $('#dwg-title').textContent = `ნახაზი PDF-დან — ${inf.code ? inf.code + ' · ' : ''}${inf.name}`;
  const tabs = $('#dwg-tabs');
  tabs.innerHTML = dwg.list.map((d, k) => `<button type="button" data-i="${k}">${d.sheet}${d.pdf === 'plan' ? ' — გეგმა' : ''}</button>`).join('');
  tabs.hidden = dwg.list.length < 2;
  dwg.el.hidden = false;
  dwgShow(0);
}
function dwgClose() { dwg.el.hidden = true; }

// ---- სქემის მინი-მნახველი ბარათში (ზუმი, გადაადგილება, მონიშვნა)
const sch = { s: 1, x: 0, y: 0, fitS: 1, mark: null, ids: [], i: 0, loaded: false };
const schEl = (id) => document.getElementById(id);
function schApply() {
  const img = schEl('sch-img');
  if (!img) return;
  img.style.transform = `translate(${sch.x}px, ${sch.y}px) scale(${sch.s})`;
  placeMark(schEl('sch-mark'), schEl('sch-ring'), sch.loaded ? sch.mark : null, sch.x, sch.y, sch.s);
}
function schZoom(f, cx, cy) {
  const st = schEl('sch-stage');
  if (!st) return;
  if (cx === undefined) { cx = st.clientWidth / 2; cy = st.clientHeight / 2; }
  const ns = THREE.MathUtils.clamp(sch.s * f, sch.fitS * 0.8, 2.5), k = ns / sch.s;
  sch.x = cx - (cx - sch.x) * k; sch.y = cy - (cy - sch.y) * k; sch.s = ns;
  schApply();
}
function schFit(focus) {
  const st = schEl('sch-stage'), img = schEl('sch-img');
  if (!st || !img?.naturalWidth) return;
  const W = st.clientWidth, H = st.clientHeight, iw = img.naturalWidth, ih = img.naturalHeight;
  sch.fitS = Math.min(W / iw, H / ih);
  if (focus && sch.mark) { sch.s = 0.3; sch.x = W / 2 - sch.mark.px * sch.s; sch.y = H / 2 - sch.mark.py * sch.s; }
  else { sch.s = sch.fitS; sch.x = (W - iw * sch.s) / 2; sch.y = (H - ih * sch.s) / 2; }
  schApply();
}
function schShow(i) {
  const inf = selected?.userData.info;
  if (!inf) return;
  sch.i = i;
  const list = drawingsFor(inf), id = sch.ids[i], d = list.find((q) => q.id === id);
  schEl('sch-sheets').innerHTML = sch.ids.map((q, k) => `<button type="button" data-i="${k}" class="${k === i ? 'active' : ''}">${list.find((z) => z.id === q)?.sheet || q}</button>`).join('') + `<span>${d?.title || ''}</span>`;
  const img = schEl('sch-img'), msg = schEl('sch-msg');
  sch.mark = markPx(inf.mark, id);
  sch.loaded = false;
  img.style.visibility = 'hidden';
  msg.textContent = 'ნახაზი იტვირთება…';
  schApply();
  img.onload = () => { msg.textContent = ''; img.style.visibility = ''; sch.loaded = true; schFit(true); };
  img.onerror = () => { msg.textContent = 'ნახაზის ფაილი ვერ ჩაიტვირთა (საქაღალდე „drawings“).'; };
  img.src = DWG_DIR + id + '.webp';
}
function schOpen() {
  const inf = selected?.userData.info;
  if (!inf?.lum) return;
  sch.ids = (inf.drawings || []).filter((id) => DWG_BY_SHEET[id]);
  schShow(0);
}
$('#info-body').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (t) {
    document.querySelectorAll('#info-body .ltab').forEach((b) => b.classList.toggle('active', b === t));
    document.querySelectorAll('#info-body .lpane').forEach((p) => { p.hidden = p.dataset.pane !== t.dataset.tab; });
    if (t.dataset.tab === 'scheme') schOpen();
    return;
  }
  const sb = e.target.closest('#sch-sheets button');
  if (sb) { schShow(+sb.dataset.i); return; }
  if (e.target.closest('#sch-in')) schZoom(1.4);
  else if (e.target.closest('#sch-out')) schZoom(1 / 1.4);
  else if (e.target.closest('#sch-fit')) schFit(false);
  else if (e.target.closest('#sch-full')) { dwgOpen(); const k = curDrawings.findIndex((q) => q.id === sch.ids[sch.i]); if (k > 0) dwgShow(k); }
});
{
  // მინი-მნახველი: ბორბალი, გადათრევა, ორი თითი
  const body = $('#info-body');
  body.addEventListener('wheel', (e) => {
    const st = e.target.closest('#sch-stage');
    if (!st) return;
    e.preventDefault();
    const r = st.getBoundingClientRect();
    schZoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  const ptrs = new Map();
  let pinch = null;
  body.addEventListener('pointerdown', (e) => {
    const st = e.target.closest('#sch-stage');
    if (!st) return;
    st.setPointerCapture?.(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: sch.s }; }
  });
  body.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1 && !pinch) { sch.x += dx; sch.y += dy; schApply(); }
    else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], r = schEl('sch-stage').getBoundingClientRect();
      schZoom((pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) / sch.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    }
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; };
  body.addEventListener('pointerup', up);
  body.addEventListener('pointercancel', up);
}
// Esc — ბარათის დახურვა (როცა ნახაზის მნახველი არ არის გახსნილი)
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dwg.el.hidden && selected) select(null); });
$('#info-drawing').addEventListener('click', dwgOpen);
$('#dwg-close').addEventListener('click', dwgClose);
$('#dwg-in').addEventListener('click', () => dwgZoom(1.4));
$('#dwg-out').addEventListener('click', () => dwgZoom(1 / 1.4));
$('#dwg-fit').addEventListener('click', dwgFit);
$('#dwg-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) dwgShow(+b.dataset.i); });
dwg.stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = dwg.stage.getBoundingClientRect();
  dwgZoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
{
  const ptrs = new Map();
  let pinch = null, tap = null, lastTap = null;
  dwg.stage.addEventListener('pointerdown', (e) => {
    dwg.stage.setPointerCapture?.(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tap = ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: dwg.s }; }
  });
  dwg.stage.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1 && !pinch) { dwg.x += dx; dwg.y += dy; dwgApply(); }
    else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], r = dwg.stage.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      dwgZoom((pinch.s * d / pinch.d) / dwg.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    }
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (tap && ptrs.size === 0 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8 && performance.now() - tap.t < 350) {
      const now = performance.now();
      if (lastTap && now - lastTap.t < 380 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        const r = dwg.stage.getBoundingClientRect();
        if (dwg.s > dwg.fitS * 1.05) dwgFit(); else dwgZoom(1 / dwg.s, e.clientX - r.left, e.clientY - r.top);
        lastTap = null;
      } else lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
    tap = null;
  };
  dwg.stage.addEventListener('pointerup', up);
  dwg.stage.addEventListener('pointercancel', up);
}
document.addEventListener('keydown', (e) => {
  if (dwg.el.hidden) return;
  if (e.key === 'Escape') dwgClose();
  else if (e.key === 'ArrowRight') dwgShow(dwg.i + 1);
  else if (e.key === 'ArrowLeft') dwgShow(dwg.i - 1);
  else if (e.key === '+' || e.key === '=') dwgZoom(1.4);
  else if (e.key === '-') dwgZoom(1 / 1.4);
  else if (e.key === '0') dwgFit();
});
window.addEventListener('resize', () => { if (!dwg.el.hidden) dwgFit(); });

function setAutoCenter(on) {
  autoCenter = on;
  controls.zoomToCursor = !on;
  $('#auto-center').setAttribute('aria-pressed', String(on));
  applyViewOffset();
  fitOrtho();
  needsRender = true;
}
$('#auto-center').addEventListener('click', () => setAutoCenter(!autoCenter));

// სრული ეკრანი; თუ ბრაუზერი არ უშვებს (მაგ. iPhone), იმალება დამატებითი პანელები
function pseudoFs(on, msg) {
  document.body.classList.toggle('pseudo-fs', on);
  if (msg) toast(msg);
  setTimeout(resize, 50);
}
$('#fullscreen').addEventListener('click', () => {
  const el = document.documentElement;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); return; }
  if (document.body.classList.contains('pseudo-fs')) { pseudoFs(false); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  const fallback = () => pseudoFs(true, 'ბრაუზერმა სრული ეკრანი არ დაუშვა — დამალულია დამატებითი პანელები');
  if (!req) { fallback(); return; }
  let settled = false;
  const p = req.call(el);
  const done = () => { settled = true; };
  document.addEventListener('fullscreenchange', done, { once: true });
  document.addEventListener('webkitfullscreenchange', done, { once: true });
  if (p && p.catch) p.catch(() => { if (!settled) { settled = true; fallback(); } });
  setTimeout(() => { if (!settled && !(document.fullscreenElement || document.webkitFullscreenElement)) { settled = true; fallback(); } }, 1500);
});
const onFs = () => document.body.classList.toggle('is-fs', !!(document.fullscreenElement || document.webkitFullscreenElement));
document.addEventListener('fullscreenchange', onFs);
document.addEventListener('webkitfullscreenchange', onFs);

$('#glb').addEventListener('click', () => {
  const btn = $('#glb');
  btn.disabled = true;
  toast('GLB ფაილი მზადდება…');
  // სრული მოდელი — დამალული ჯგუფების ჩათვლით; ზომები, ბადე და მონიშვნა არ შედის
  swapInlayMaterials(true);
  swapProxyMaterials(true);
  new GLTFExporter().parse(root, (res) => {
    swapInlayMaterials(false);
    swapProxyMaterials(false);
    const blob = new Blob([res], { type: 'model/gltf-binary' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'branch-model.glb';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    btn.disabled = false;
    toast(`GLB ჩამოიტვირთა (${(blob.size / 1048576).toFixed(1)} MB)`);
  }, (err) => {
    swapInlayMaterials(false);
    swapProxyMaterials(false);
    btn.disabled = false;
    console.error(err);
    toast('GLB ექსპორტი ვერ მოხერხდა');
  }, { binary: true, onlyVisible: false });
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

const hint = $('#hint');
hint.querySelector('.txt').innerHTML = coarse
  ? '<b>1 თითი</b> — ტრიალი · <b>2 თითი</b> — ზუმი და გადაადგილება · <b>შეხება</b> — ინფორმაცია · <b>ორმაგი შეხება</b> — ფოკუსი'
  : '<b>მარცხენა ღილაკი</b> — ტრიალი · <b>ბორბალი</b> — ზუმი · <b>მარჯვენა ღილაკი</b> — გადაადგილება · <b>დაჭერა</b> — ინფორმაცია · <b>ორჯერ დაჭერა</b> — ფოკუსი';
function hideHint() { hint.classList.add('collapsed'); }
hint.querySelector('button').addEventListener('click', () => hint.classList.toggle('collapsed'));

// ------------------------------------------------------------------ ზომის ცვლილება
// ზომის ცვლილებისას (მაგ. ტელეფონზე მისამართის ზოლის გამოჩენა/დამალვა) კომპოზიტორი
// მხოლოდ ზომას იცვლის — თავიდან აწყობა ჟესტის დროს ციმციმს და შეფერხებას იწვევდა.
function resizeComposer(w, h) {
  if (!composer) { buildComposer(); return; }
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  if (aoPass) { const k = coarse ? 0.5 : 1; aoPass.setSize(Math.round(w * k), Math.round(h * k)); }
}

// ტელეფონზე ორი თითი მხოლოდ მოდელს ზუმავს — ბრაუზერის გვერდის ზუმი იბლოკება
// (სხვაგვარად გვერდი დიდდებოდა და ინტერფეისი რესპონსივობას კარგავდა; iOS Safari).
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  applyViewOffset();
  fitOrtho();
  resizeComposer(w, h);
  if (!userMoved && !tween) setView(viewName, false);
  needsRender = true;
}
new ResizeObserver(resize).observe(stage);

// ------------------------------------------------------------------ ციკლი
makeControls(persp, homeTarget);
resize();
setView('home', false);
setLayer('ceiling', false);
setLayer('exterior', true);
setLayer('furniture', true);
setLayer('dims', false);
setLayer('nav', true);
setNavLight(true);
setLayer('lighting', true);
setLayer('vents', true);
setLayer('hatches', true);
setCct(SIM.cctDefault);
setLightsOn(true);
// ზუსტი განათების (52 ფართობის წყარო) შეიდერები კომპილირდება ფონურად (KHR_parallel_shader_compile):
// ჩატვირთვისას მოდელი მაშინვე ჩანს სწრაფი წყაროებით, მზადყოფნისთანავე კი ზუსტ განათებაზე გადადის.
let fullLightsReady = false, fullCompileStarted = false;
setFastLights(true);
function startFullLightsCompile() {
  // იწყება პირველი კადრის შემდეგ — სხვაგვარად GPU ჯერ ამ შეიდერებს ამუშავებს და მოდელი გვიან ჩნდება
  fullCompileStarted = true;
  setTimeout(() => {
    setFastLights(false);
    renderer.compileAsync(scene, persp).catch(() => {}).finally(() => { fullLightsReady = true; aoDirty = true; needsRender = true; });
    setFastLights(true);
  }, 60);
}

// კონტაქტური ჩრდილები (AO) ითვლება მხოლოდ მაშინ, როცა კამერა გაჩერებულია —
// ტრიალი და ზუმი ამიტომ რჩება რბილი სუსტ მოწყობილობებზეც.
let lastMove = -1e9, aoDirty = true;
function loop(now) {
  const tw = stepTween(now);
  const changed = controls.update();
  const moving = tw || changed;
  if (moving) { lastMove = now; aoDirty = true; }
  // ავტომატური დაბრუნება ცენტრში (ხელის აღებიდან და მოძრაობის დამშვიდებიდან მცირე ხანში)
  if (autoCenter && !focused && !tween && !dragging && now - lastMove > 450) {
    const t = controls.target, dx = center.x - t.x, dz = center.z - t.z;
    if (dx * dx + dz * dz > 1e-4) {
      const nt = new THREE.Vector3(center.x, t.y, center.z);
      tweenTo({ pos: nt.clone().add(camera.position.clone().sub(t)), target: nt }, true, 650);
    }
  }
  const idle = now - lastMove > 180;
  if (composer && (moving || needsRender || (aoDirty && idle))) {
    if (aoPass) aoPass.enabled = idle && !moving;
    setFastLights(!(idle && !moving && fullLightsReady));
    composer.render();
    labelRenderer.render(scene, camera);
    if (!fullCompileStarted) startFullLightsCompile();
    needsRender = false;
    if (!aoPass || aoPass.enabled) aoDirty = false;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// შემოწმებისთვის (კონსოლიდან)
window.__branch = {
  THREE, scene, root, groups, renderer, get composer() { return composer; }, get camera() { return camera; }, get controls() { return controls; }, setView, setLayer, setNavLight, get navLightOn() { return navLightOn; }, select, focusOn, pick, zoomBy, dwgOpen, dwgState: () => ({ ...dwg, el: undefined, stage: undefined, img: undefined, msg: undefined, natural: [dwg.img.naturalWidth, dwg.img.naturalHeight] }), setAutoCenter, get autoCenter() { return autoCenter; }, lightRig, fastRig, setFastLights, get fullLightsReady() { return fullLightsReady; }, setLightsOn, setCct, get lightsOn() { return lightsOn; }, get cct() { return cct; }, cctColor, rigSimplified, schState: () => ({ ...sch }),
  capture() { controls.update(); if (aoPass) aoPass.enabled = true; composer.render(); return renderer.domElement.toDataURL("image/png"); },
};
