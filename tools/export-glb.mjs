// აგებს მოდელს Node-ში და ინახავს dist/branch-model.glb-ს, შემდეგ ხელახლა
// კითხულობს ფაილს და ამოწმებს გეომეტრიას/მასშტაბს.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildModel } from '../src/model.js';

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

const { root } = buildModel();
const glb = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: false });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(glb));
console.log(`GLB ჩაწერილია: ${out} (${(glb.byteLength / 1024).toFixed(0)} KB)`);

// ---- შემოწმება: ფაილის ხელახლა წაკითხვა ----
const buf = fs.readFileSync(out);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
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
  ['ZF-08', 'სალარო Ø3.88'], ['C-1', 'სვეტი C-1 1.00×0.69'],
];
for (const [p, label] of checks) {
  const o = find(p);
  if (!o) { console.log('  ✗ ვერ მოიძებნა:', p); continue; }
  const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3());
  console.log(`  ${p.padEnd(9)} ${label.padEnd(42)} → ${s.x.toFixed(3)} × ${s.y.toFixed(3)} × ${s.z.toFixed(3)}`);
}
const extras = find('ZF-08').userData;
console.log('extras (ZF-08):', JSON.stringify(extras).slice(0, 160) + '…');
