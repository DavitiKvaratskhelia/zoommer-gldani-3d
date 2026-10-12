// PDF ფურცლების გამოტანა სურათებად: dist/drawings/<id>.webp (ბარათის ღილაკი „ნახაზი PDF-დან“).
// PDF-ები რეპოზიტორიში არ არის — გზები: გარემოს ცვლადები ZGMF_PDF და ZGMP_PDF, ან ნაგულისხმევი ადგილები ქვემოთ.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { DRAWING_PAGES } from '../src/drawings.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../dist/drawings');
const SRC = {
  furniture: process.env.ZGMF_PDF || 'C:/Users/admin/Desktop/გლდანი სითი მოლი/ZGMF - ავეჯი - Update 2.pdf',
  plan: process.env.ZGMP_PDF || 'C:/Users/admin/Desktop/გლდანი სითი მოლი/ZGMP - გეგმები - Update 6.pdf',
  lightbox: process.env.LB_PDF || 'C:/Users/admin/Desktop/გლდანი სითი მოლი/გლდანი - სითი მოლი Lightboxes.pdf',
};
const SCALE = 3, QUALITY = 82;   // 3573 × 2526 px — ზომები და შენიშვნები იკითხება სრულ მასშტაბზე

fs.mkdirSync(out, { recursive: true });
const docs = {};
for (const [k, f] of Object.entries(SRC)) {
  if (!fs.existsSync(f)) { console.error('PDF ვერ მოიძებნა:', f); process.exit(1); }
  docs[k] = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), verbosity: 0 }).promise;
}
let total = 0;
const only = process.argv.slice(2); // მაგ.: node tools/render-drawings.mjs f29 l02 — მხოლოდ ეს ფურცლები
for (const [id, d] of Object.entries(DRAWING_PAGES)) {
  if (only.length && !only.includes(id)) continue;
  const page = await docs[d.pdf].getPage(d.page);
  const vp = page.getViewport({ scale: d.pdf === 'lightbox' ? SCALE * 0.8 : SCALE });
  const c = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const buf = await c.encode('webp', QUALITY);
  fs.writeFileSync(path.join(out, `${id}.webp`), buf);
  total += buf.length;
  console.log(`${id}  ${d.sheet.padEnd(9)} გვ.${String(d.page).padStart(2)}  ${c.width}×${c.height}  ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log(`სულ: ${Object.keys(DRAWING_PAGES).length} ფურცელი, ${(total / 1048576).toFixed(1)} MB → ${out}`);
