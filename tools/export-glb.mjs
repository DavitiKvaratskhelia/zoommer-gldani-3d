// აგებს მოდელს Node-ში და ინახავს dist/branch-model.glb-ს, შემდეგ ხელახლა
// კითხულობს ფაილს და ამოწმებს გეომეტრიას/მასშტაბს.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildModel } from '../src/model.js';
import { setTextureFactory } from '../src/lightbox-model.js';
import { LB_TEX } from '../src/assets/lightbox-textures.js';
import { loadImage } from '@napi-rs/canvas';

// ფაქტურების (ბადე, პერფორაცია) PNG-ად ჩასაწერად Node-ში საჭიროა canvas
import { createCanvas, ImageData as NapiImageData } from '@napi-rs/canvas';
globalThis.ImageData ??= NapiImageData;
globalThis.OffscreenCanvas ??= class {
  constructor(w, h) { this._c = createCanvas(w, h); }
  get width() { return this._c.width; }
  set width(v) { this._c.width = v; }
  get height() { return this._c.height; }
  set height(v) { this._c.height = v; }
  getContext(type, opts) { return this._c.getContext(type, opts); }
  async convertToBlob({ type = 'image/png', quality } = {}) { return new Blob([await this._c.encode(type === 'image/jpeg' ? 'jpeg' : 'png', type === 'image/jpeg' ? Math.round((quality ?? 0.88) * 100) : undefined)], { type }); }
};

// GLTFExporter იყენებს FileReader-ს — Node-ში არ არსებობს
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../dist/branch-model.glb');

// ლაითბოქსების/ნავიგაციის ტექსტურები: WebP → პიქსელები (DataTexture; რიგები შებრუნებულია, რომ ბრაუზერის ვერსიას დაემთხვეს)
const decoded = new Map();
for (const [id, url] of Object.entries(LB_TEX)) {
  const img = await loadImage(Buffer.from(url.split(',')[1], 'base64'));
  const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const src = g.getImageData(0, 0, img.width, img.height).data, row = img.width * 4, data = new Uint8Array(src.length);
  for (let y = 0; y < img.height; y++) data.set(src.subarray(y * row, (y + 1) * row), (img.height - 1 - y) * row);
  decoded.set(id, { data, w: img.width, h: img.height });
}
setTextureFactory((id) => { const d = decoded.get(id); const t = new THREE.DataTexture(d.data, d.w, d.h, THREE.RGBAFormat); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t; });

const { root } = buildModel();
const glb = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: false });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(glb));
console.log(`GLB ჩაწერილია: ${out} (${(glb.byteLength / 1024).toFixed(0)} KB)`);

// ---- შემოწმება: ფაილის ხელახლა წაკითხვა ----
const buf = fs.readFileSync(out);
// Node-ში სურათების დეკოდირება შეუძლებელია — შემოწმებისთვის ფაქტურების მითითებები დროებით ამოიღება
// (გეომეტრია, მასალები და ზომები უცვლელია; თავად ფაილი ხელუხლებელია).
function stripImages(b) {
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'));
  const imgCount = (json.images || []).length;
  delete json.images; delete json.textures; delete json.samplers;
  for (const m of json.materials || []) {
    if (m.pbrMetallicRoughness) delete m.pbrMetallicRoughness.baseColorTexture;
    delete m.normalTexture; delete m.emissiveTexture; delete m.occlusionTexture;
  }
  json.extensionsUsed = (json.extensionsUsed || []).filter((e) => e !== 'KHR_texture_transform');
  let js = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (js.length % 4)) % 4;
  js = Buffer.concat([js, Buffer.alloc(pad, 0x20)]);
  const rest = b.subarray(20 + jsonLen);
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + js.length + rest.length, 8);
  head.writeUInt32LE(js.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  return { glb: Buffer.concat([head, js, rest]), imgCount };
}
const { glb: stripped, imgCount } = stripImages(buf);
console.log('ჩაშენებული ტექსტურები:', imgCount);
const ab = stripped.buffer.slice(stripped.byteOffset, stripped.byteOffset + stripped.byteLength);
const gltf = await new GLTFLoader().parseAsync(ab, '');
const scene = gltf.scene;
scene.updateMatrixWorld(true);
let meshes = 0, tris = 0;
const mats = new Set();
scene.traverse((o) => {
  if (o.isMesh) {
    meshes++;
    mats.add(o.material.name);
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  }
});
const box = new THREE.Box3().setFromObject(scene);
const size = box.getSize(new THREE.Vector3());
const top = scene.children[0];
console.log('ძირეული ობიექტი:', top.name);
console.log('ჯგუფები:', top.children.map((c) => `${c.name} (${c.children.length})`).join(', '));
console.log(`მეშები: ${meshes}, სამკუთხედები: ${Math.round(tris)}, მასალები: ${mats.size}`);
console.log(`საზღვრები (მ): X ${box.min.x.toFixed(3)}…${box.max.x.toFixed(3)}, Y ${box.min.y.toFixed(3)}…${box.max.y.toFixed(3)}, Z ${box.min.z.toFixed(3)}…${box.max.z.toFixed(3)}`);
console.log(`ზომა (მ): ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`);

// საკონტროლო ზომები
const find = (prefix) => { let r = null; scene.traverse((o) => { if (!r && o.name.startsWith(prefix)) r = o; }); return r; };
const checks = [
  ['W-bottom', 'ქვედა კედელი (18.16 + 0.10 + 2.16 + ...)'],
  ['G-A1', 'ვიტრაჟი A 3.70'], ['G-B2', 'ვიტრაჟი B 7.38'], ['P-banks', 'ბანკების კედელი 3.47'],
  ['ZF-08', 'სალარო Ø3.90'], ['C-1', 'სვეტი C-1 1.00×0.69'], ['ZF-01-1', 'ვიტრინა 1000×350×2050'], ['ZF-03-1', 'მაგიდა 2000×1000×900'], ['ZF-20-1', 'კედლის ლაითბოქსი 1800×800×120'], ['ZF_19_1', 'ნავიგაცია ZF-19-1'],
];
for (const [p, label] of checks) {
  const o = find(p);
  if (!o) { console.log('  ✗ ვერ მოიძებნა:', p); continue; }
  const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3());
  console.log(`  ${p.padEnd(9)} ${label.padEnd(42)} → ${s.x.toFixed(3)} × ${s.y.toFixed(3)} × ${s.z.toFixed(3)}`);
}
const extras = find('ZF-08').userData;
console.log('extras (ZF-08):', JSON.stringify(extras).slice(0, 160) + '…');
