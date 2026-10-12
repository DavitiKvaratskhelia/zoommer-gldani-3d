// ლაითბოქსებისა და ნავიგაციის ტექსტურები → src/assets/lightbox-textures.js (WebP, base64).
//  • სარეკლამო გამოსახულებები ამოჭრილია „Lightboxes“ PDF-ის გვერდებიდან (ჩარჩოს შიდა არე; ზომის ხაზები,
//    ისრები და სათაურები არ შედის); პროპორცია არ იცვლება — ფორმატამდე ივსება ფონის ფერით.
//  • ნავიგაციის სიმბოლოები ამოჭრილია ავეჯის PDF-ის ZGMF-27/28/29 ფურცლებიდან (Ø260 დისკი).
//  • ნავიგაციის წარწერები — Noto Sans Georgian Bold (მთავრული), ნახაზზე გაზომილი რკალის საზღვრებით.
// გაშვება: node tools/make-lightbox-textures.mjs  (საჭიროა ორივე PDF; გზები — LB_PDF / ZGMF_PDF)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { NAV_COMPOSITIONS, NAV_RAL } from '../src/lightboxes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const LB_PDF = process.env.LB_PDF || 'C:/Users/admin/Desktop/გლდანი სითი მოლი/გლდანი - სითი მოლი Lightboxes.pdf';
const ZGMF_PDF = process.env.ZGMF_PDF || 'C:/Users/admin/Desktop/გლდანი სითი მოლი/ZGMF - ავეჯი - Update 2.pdf';
GlobalFonts.registerFromPath(path.join(root, 'node_modules/@fontsource/noto-sans-georgian/files/noto-sans-georgian-georgian-700-normal.woff2'), 'NotoGeo');

const load = async (f) => pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), verbosity: 0 }).promise;
const pageCache = new Map();
async function render(doc, key, n, scale) {
  const k = `${key}:${n}:${scale}`;
  if (pageCache.has(k)) return pageCache.get(k);
  const p = await doc.getPage(n), vp = p.getViewport({ scale });
  const c = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height)), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  await p.render({ canvasContext: g, viewport: vp }).promise;
  pageCache.set(k, c);
  return c;
}
// ამოჭრა (pt) და შევსება საჭირო პროპორციამდე (aspect = სიგანე / სიმაღლე) — გაწელვის გარეშე
function cropPad(src, scale, [x0, y0, x1, y1], aspect, outW) {
  let w = x1 - x0, h = y1 - y0;
  let W = w, Hh = h;
  if (w / h > aspect) Hh = w / aspect; else W = h * aspect;
  const k = outW / (W * scale);
  const c = createCanvas(Math.round(W * scale * k), Math.round(Hh * scale * k)), g = c.getContext('2d');
  // ფონი — ამოჭრილის კიდის ფერი (ზედა-მარცხენა კუთხის მახლობლად)
  const px = src.getContext('2d').getImageData(Math.round((x0 + 2) * scale), Math.round((y0 + h / 2) * scale), 1, 1).data;
  g.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`; g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, x0 * scale, y0 * scale, w * scale, h * scale, ((W - w) / 2) * scale * k, ((Hh - h) / 2) * scale * k, w * scale * k, h * scale * k);
  return c;
}

const out = {};
const add = async (id, canvas, q = 86) => { out[id] = 'data:image/webp;base64,' + (await canvas.encode('webp', q)).toString('base64'); };

// ---------------------------------------------------------------- სარეკლამო გამოსახულებები
const lb = await load(LB_PDF);
const S = 6;
// გვ. 2 — 8 პანელი (1800 × 800), ჩარჩოს ბიჯი ≈ 178.8 pt
const p2 = await render(lb, 'lb', 2, S);
['h_xiaomi_pad', 'h_nothing', 'h_pixel', 'h_accessories', 'h_apple_watch', 'h_iphone17', 'h_iphone_air', 'h_iphone17pro'].forEach((id, k) => {
  const L = 4.8 + k * 178.8;
  out[id] = cropPad(p2, S, [L + 1.4, 87.4, L + 174.6, 164.1], 1800 / 800, 1100);
});
const p3 = await render(lb, 'lb', 3, S);
out.h_robot = cropPad(p3, S, [110.2, 60.2, 433.8, 238.6], 1400 / 800, 1100);
out.h_smarthome = cropPad(p3, S, [445.6, 60.2, 761.6, 238.6], 1400 / 800, 1100);
out.h_dyson_bonus = cropPad(p3, S, [37.0, 453.0, 386.5, 646.0], 1400 / 800, 1100);
const p4 = await render(lb, 'lb', 4, S);
out.h_laptop_bags = cropPad(p4, S, [158.6, 428.6, 615.8, 630.2], 1800 / 800, 1300);
const p5 = await render(lb, 'lb', 5, S);
out.h_projectors = cropPad(p5, S, [772.2, 455.6, 1273.8, 680.8], 1800 / 800, 1300);
// ვერტიკალური: ჩარჩოს შიდა არე (928 × 1728 მმ, ზედა კუთხეები R114)
const V = {
  7: [['v_iphone', 63.9, 237.0, 396.9, 717.6], ['v_macbook', 255.4, 428.5, 397.7, 717.6], ['v_apple_watch', 447.0, 620.1, 396.9, 717.6], ['v_airpods', 638.7, 811.8, 396.9, 717.6]],
  8: [['v_ps5', 588.7, 771.8, 385.7, 723.6], ['v_switch', 803.5, 986.8, 385.7, 723.6], ['v_asus', 1018.5, 1201.8, 385.7, 723.6], ['v_meta_quest', 1233.4, 1416.6, 385.7, 723.6]],
  9: [['v_marshall', 276.0, 449.1, 372.5, 693.0], ['v_rog', 467.7, 642.5, 369.5, 692.5]],
  10: [['v_segway', 642.7, 815.8, 402.9, 722.8], ['v_roborock', 834.4, 1007.5, 402.9, 722.8], ['v_dreame', 1026.0, 1199.1, 402.9, 722.8], ['v_dyson', 1217.5, 1390.6, 402.9, 722.8]],
};
for (const [pg, list] of Object.entries(V)) {
  const c = await render(lb, 'lb', +pg, S);
  for (const [id, L, R, T, B] of list) out[id] = cropPad(c, S, [L + 1.0, T + 0.8, R - 1.0, B - 0.8], 928 / 1728, 720);
}
for (const [id, c] of Object.entries(out)) if (typeof c !== 'string') await add(id, c, 84);

// ---------------------------------------------------------------- ნავიგაცია
const zg = await load(ZGMF_PDF);
const NS = 10; // ფურცელი 1:20, 1 pt ≈ 7.12 მმ
const DARK = '#383e42'; // RAL 7016 — PVC წარწერა და სიმბოლო
for (const comp of NAV_COMPOSITIONS) {
  const page = await render(zg, 'zgmf', comp.sheetPage + 0, NS);
  const mains = comp.rings.filter((r) => r.kind === 'main');
  const m0 = mains[0];
  const k = m0.D / (2 * m0.sheet[2]); // მმ / pt
  // სიმბოლო
  const sym = comp.rings.find((r) => r.kind === 'symbol');
  if (sym && !out[`n_sym_${sym.symbol}`]) {
    const cx = m0.sheet[0] + (sym.r - m0.r) / k;
    const cy = m0.sheet[1] - ((sym.bottom + sym.D / 2) - (m0.bottom + m0.D / 2)) / k;
    const R = (sym.inner / 2) / k;
    const N = 512, c = createCanvas(N, N), g = c.getContext('2d');
    g.drawImage(page, (cx - R) * NS, (cy - R) * NS, 2 * R * NS, 2 * R * NS, 0, 0, N, N);
    const id = g.getImageData(0, 0, N, N), d = id.data;
    const dr = [0x38, 0x3e, 0x42];
    // სხვა რგოლების კონტურები (ნახაზზე წინ/უკან გადაფარვა) და ზომის ხაზები ამოიშლება
    const ppt = N / (2 * R); // px / pt
    const erase = new Uint8Array(N * N);
    for (const o of comp.rings) {
      if (o === sym || o.f <= sym.f) continue; // მხოლოდ სიმბოლოს წინ მდებარე რგოლების კონტურები ფარავს მას ნახაზზე
      const ox = m0.sheet[0] + (o.r - m0.r) / k, oy = m0.sheet[1] - ((o.bottom + o.D / 2) - (m0.bottom + m0.D / 2)) / k;
      const radii = [o.D / 2, (o.hole || o.inner || 0) / 2, o.kind === 'main' ? o.D / 2 - 10 : 0, o.kind === 'main' ? (o.hole / 2 + 10) : 0].filter((v) => v > 0).map((v) => v / k);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = cx - R + (x + 0.5) / ppt, py = cy - R + (y + 0.5) / ppt, dd = Math.hypot(px - ox, py - oy);
        if (radii.some((rr) => Math.abs(dd - rr) < 1.1)) erase[y * N + x] = 1;
      }
    }
    const dark = (i) => (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) < 110;
    // გრძელი თხელი ვერტიკალური/ჰორიზონტალური ხაზები (≤ 5 px სისქე, ≥ 45% სიგრძე)
    const thinRuns = (vertical) => {
      for (let a = 0; a < N; a++) {
        let st = -1;
        for (let b = 0; b <= N; b++) {
          const i = vertical ? (b * N + a) : (a * N + b);
          const v = b < N && dark(i * 4);
          if (v && st < 0) st = b;
          if (!v && st >= 0) {
            if (b - st > N * 0.45) {
              let wsum = 0;
              for (let q = st; q < b; q++) { let w = 0; for (let o = -6; o <= 6; o++) { const aa = a + o; if (aa < 0 || aa >= N) continue; const j = vertical ? (q * N + aa) : (aa * N + q); if (dark(j * 4)) w++; } wsum += w; }
              if (wsum / (b - st) <= 5) for (let q = st; q < b; q++) for (let o = -3; o <= 3; o++) { const aa = a + o; if (aa < 0 || aa >= N) continue; erase[vertical ? (q * N + aa) : (aa * N + q)] = 1; }
            }
            st = -1;
          }
        }
      }
    };
    thinRuns(true); thinRuns(false);
    // ნახაზზე სიმბოლოს დისკს კვეთს სხვა ელემენტის ხაზები — ამ ზონებში სიმბოლო არ არის (ხელით შემოწმებული)
    const MASKS = { check: [[0, 0.76, 1, 1]], speaker: [[0, 0.81, 1, 1], [0, 0.7, 0.2, 1]] };
    // სახლის სიმბოლოს კვეთს სამი თხელი გამოსატანი ხაზი (ზომები) — იშლება მხოლოდ ამ ხაზების ზოლი
    // [x0, y0, x1, y1, დაცული y-ზოლი (სიმბოლოს საკუთარი ხაზები)]
    const SEGS = { house: [[0.545, 0.05, 0.552, 0.335, 0.085, 0.2], [0.574, 0.44, 0.646, 0.64, 0, 0.47], [0.688, 0.715, 0.818, 0.895, 0.785, 0.86]] };
    for (const [ax, ay, bx, by, p0, p1] of SEGS[sym.symbol] || []) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = x / N, py = y / N, vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
        const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2));
        if (Math.hypot(px - ax - t * vx, py - ay - t * vy) < 0.011 && !(py >= p0 && py <= p1)) erase[y * N + x] = 1;
      }
    }
    for (const [x0, y0, x1, y1] of MASKS[sym.symbol] || []) for (let y = Math.floor(y0 * N); y < y1 * N; y++) for (let x = Math.floor(x0 * N); x < x1 * N; x++) erase[y * N + x] = 1;
    // სიმბოლოს გარეთ გამავალი ხაზები (დისკის კიდეს ეხება) და წყვეტილი ხაზის მცირე ნაწილები
    {
      const dk = new Uint8Array(N * N);
      for (let i = 0; i < N * N; i++) { const x = i % N, y = (i - x) / N; dk[i] = dark(i * 4) && !erase[i] && Math.hypot(x - N / 2, y - N / 2) / (N / 2) < 0.9 ? 1 : 0; }
      const lab = new Int32Array(N * N).fill(-1);
      for (let s0 = 0; s0 < N * N; s0++) {
        if (!dk[s0] || lab[s0] >= 0) continue;
        const st = [s0], comp = []; lab[s0] = s0; let edge = false;
        while (st.length) {
          const p = st.pop(); comp.push(p);
          const x = p % N, y = (p - x) / N;
          if (Math.hypot(x - N / 2, y - N / 2) / (N / 2) > 0.875) edge = true;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
            const q = Y * N + X; if (dk[q] && lab[q] < 0) { lab[q] = s0; st.push(q); }
          }
        }
        if (comp.length < 40) for (const p of comp) erase[p] = 1; void edge;
      }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4, rr = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2);
      const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      let mn = 255; for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue; const j = (Y * N + X) * 4; mn = Math.min(mn, 0.3 * d[j] + 0.59 * d[j + 1] + 0.11 * d[j + 2]); }
      let t = rr > 0.9 || sat > 60 || erase[y * N + x] || mn > 95 ? 0 : Math.min(1, Math.max(0, (200 - lum) / 120)); // ნაცრისფერი წყვეტილი ხაზები (mn > 95) იშლება
      d[i] = 255 + (dr[0] - 255) * t; d[i + 1] = 255 + (dr[1] - 255) * t; d[i + 2] = 255 + (dr[2] - 255) * t; d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    await add(`n_sym_${sym.symbol}`, c, 92);
  }
  // წარწერიანი რგოლის ფასადი (ორგმინა, თეთრი) + RAL 2003 კიდეები 10 მმ + RAL 7016 წარწერა
  for (const m of mains) {
    const key = `n_txt_${comp.code}_${m.text}`;
    if (out[key]) continue;
    const N = 1024, c = createCanvas(N, N), g = c.getContext('2d'), s = N / m.D; // px / მმ
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, N, N);
    g.strokeStyle = NAV_RAL[2003]; g.lineWidth = 10 * s;
    g.beginPath(); g.arc(N / 2, N / 2, (m.D / 2 - 5) * s, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(N / 2, N / 2, (m.hole / 2 + 5) * s, 0, Math.PI * 2); g.stroke();
    const rIn = m.hole / 2 + 10, rOut = m.D / 2 - 10, band = rOut - rIn, rm = (rIn + rOut) / 2;
    const fontPx = band * 0.96 * s; // ასოს სიმაღლე ≈ 0.7 ზოლის (როგორც ნახაზზე)
    g.font = `700 ${fontPx}px NotoGeo`;
    g.fillStyle = DARK; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const chars = [...m.text];
    const adv = chars.map((ch) => g.measureText(ch).width / s); // მმ
    const capH = (() => { const mt = g.measureText('Ა'); return (mt.actualBoundingBoxAscent) / s; })();
    const [a0, a1] = m.arc; // ნახაზის კუთხეები (ბეჭდვის სიგანის ჩათვლით)
    const span = ((a1 - a0) * Math.PI) / 180 * rm; // რკალის სიგრძე მმ
    const first = adv[0] / 2, last = adv[adv.length - 1] / 2;
    const natural = adv.reduce((a, v) => a + v, 0);
    const extra = chars.length > 1 ? (span - natural) / (chars.length - 1) : 0;
    let pos = 0;
    chars.forEach((ch, i) => {
      const center = pos + adv[i] / 2;
      pos += adv[i] + extra;
      if (ch === ' ') return;
      const ang = (a0 * Math.PI) / 180 + center / rm;
      g.save();
      g.translate(N / 2 + Math.cos(ang) * rm * s, N / 2 + Math.sin(ang) * rm * s);
      g.rotate(ang + Math.PI / 2);
      g.fillText(ch, 0, (capH / 2) * s);
      g.restore();
    });
    void first; void last;
    await add(key, c, 92);
  }
}

const lines = Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
const file = path.join(root, 'src/assets/lightbox-textures.js');
fs.writeFileSync(file, `// ავტომატურად შექმნილი — tools/make-lightbox-textures.mjs. ხელით არ შეცვალოთ.\nexport const LB_TEX = {\n${lines.join('\n')}\n};\n`);
const total = Object.values(out).reduce((a, v) => a + v.length, 0);
console.log(`${Object.keys(out).length} ტექსტურა, ${(total / 1048576).toFixed(2)} MB (base64) → ${file}`);
