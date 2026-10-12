// ბრენდის ოფიციალური SVG ლოგოები → ბრტყელი ფიგურების JSON (model.js-ში ამოწევისთვის).
// ლოგოები არ არის გადახატული: გამოიყენება იგივე ვექტორები (src/assets/*.svg).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

globalThis.DOMParser = DOMParser;
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../src/assets');

function convert(file, out) {
  const data = new SVGLoader().parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const shapes = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of data.paths) {
    const fill = p.userData?.style?.fill;
    for (const s of SVGLoader.createShapes(p)) {
      const ex = s.extractPoints(10);
      const r = (pts) => pts.map((v) => [+v.x.toFixed(3), +v.y.toFixed(3)]);
      const shape = r(ex.shape);
      shape.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
      shapes.push({ fill, shape, holes: ex.holes.map(r) });
    }
  }
  fs.writeFileSync(path.join(dir, out), JSON.stringify({ source: file, bbox: [minX, minY, maxX, maxY], shapes }));
  console.log(out, shapes.length, 'shapes, bbox', [minX, minY, maxX, maxY].map((v) => v.toFixed(2)).join(' '));
}
convert('zoommer-latin-wordmark.svg', 'zoommer-latin-wordmark.json');
convert('zoommer-logo-emblem-georgian.svg', 'zoommer-logo-emblem-georgian.json');
