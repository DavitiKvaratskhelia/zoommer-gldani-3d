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
// თბილი შიდა განათება (ჭერის სანათების იმიტაცია; GLB-ში არ შედის)
for (const [x, z] of [[4.5, 4.0], [9.6, 10.2], [4.5, 13.0], [15.2, 11.0]]) {
  const l = new THREE.PointLight('#ffcf9c', 7, 12, 2);
  l.position.set(x, 3.7, z);
  helpers.add(l);
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
  controls.maxDistance = 95;
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
  for (const h of hits) {
    if (h.object.userData.noPick || !isShown(h.object)) continue;
    const ir = infoRoot(h.object);
    if (ir) return ir;
  }
  return null;
}

const STATUS = {
  pdf: ['PDF', 'ok'],
  measured: ['≈ ნახაზიდან', 'meas'],
  assumed: ['ვარაუდი', 'asm'],
};
function select(obj) {
  selected = obj;
  const card = $('#info');
  if (!obj) { focused = null; selHelper.visible = false; card.hidden = true; needsRender = true; return; }
  selBox.setFromObject(obj);
  selHelper.visible = true;
  const inf = obj.userData.info;
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
const layerTargets = { ceiling: groups.ceiling, exterior: groups.exterior, furniture: groups.furniture, dims };
function setLayer(key, on) {
  layerTargets[key].visible = on;
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
  new GLTFExporter().parse(root, (res) => {
    swapInlayMaterials(false);
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
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  applyViewOffset();
  fitOrtho();
  buildComposer();
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
    composer.render();
    labelRenderer.render(scene, camera);
    needsRender = false;
    if (!aoPass || aoPass.enabled) aoDirty = false;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// შემოწმებისთვის (კონსოლიდან)
window.__branch = {
  THREE, scene, root, groups, renderer, get composer() { return composer; }, get camera() { return camera; }, get controls() { return controls; }, setView, setLayer, select, focusOn, pick, zoomBy, setAutoCenter, get autoCenter() { return autoCenter; },
  capture() { controls.update(); if (aoPass) aoPass.enabled = true; composer.render(); return renderer.domElement.toDataURL("image/png"); },
};
