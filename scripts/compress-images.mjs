import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const pubDir = path.join(root, 'public');

const jpgs = [
  'aggregates.jpg',
  'slide-1.jpg',
  'paint.jpg',
  'steel.jpg',
  'stone.jpg',
  'hardware.jpg',
  'glass.jpg',
  'suppliers-hero-bg.jpg',
  'scanners-hero-new.jpg',
  'scanners-hero-bg.jpg',
  'delivery-hero-bg.jpg',
  'auth-bg.jpg',
  'builders-hero-new.jpg',
  'builders-hero-bg.jpg',
  'monitoring-bg.jpg',
  'windows.jpg',
  'tiles.jpg',
  'cement.jpg',
  'blocks.jpg',
  'timber.jpg',
  'plywood.jpg',
  'doors.jpg',
  'iron-sheets.jpg',
  'plumbing.jpg',
  'wire.jpg',
  'electrical.jpg',
  'roofing.jpg',
  'sand.jpg'
];

const pngs = [
  'steel.png',
  'wire.png',
  'stone.png',
  'glass.png',
  'electrical.png',
  'hardware.png',
  'insulation.png',
  'roofing.png',
  'sand.png',
  'plywood.png',
  'doors.png',
  'iron-sheets.png',
  'plumbing.png',
  'windows.png',
  'tiles.png',
  'timber.png',
  'tools.png'
];

async function sizeKB(p) {
  try {
    const s = await fs.stat(p);
    return Math.round(s.size / 1024);
  } catch {
    return null;
  }
}

async function compressJpg(file, quality = 65) {
  const src = path.join(pubDir, file);
  try {
    const before = await sizeKB(src);
    if (before == null) return { file, skipped: true };
    const buf = await fs.readFile(src);
    const out = await sharp(buf).jpeg({ quality, mozjpeg: true }).toBuffer();
    await fs.writeFile(src, out);
    const after = await sizeKB(src);
    return { file, before, after };
  } catch (e) {
    return { file, error: e.message };
  }
}

async function compressPng(file, level = 9) {
  const src = path.join(pubDir, file);
  try {
    const before = await sizeKB(src);
    if (before == null) return { file, skipped: true };
    const buf = await fs.readFile(src);
    const out = await sharp(buf)
      .png({ compressionLevel: level, palette: true, quality: 80 })
      .toBuffer();
    await fs.writeFile(src, out);
    const after = await sizeKB(src);
    return { file, before, after };
  } catch (e) {
    return { file, error: e.message };
  }
}

async function toWebp(file, quality = 75) {
  const src = path.join(pubDir, file);
  try {
    const before = await sizeKB(src);
    if (before == null) return { file: file + '.webp', skipped: true };
    const buf = await fs.readFile(src);
    const out = await sharp(buf).webp({ quality }).toBuffer();
    const outPath = path.join(pubDir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
    await fs.writeFile(outPath, out);
    const after = await sizeKB(outPath);
    return { file: path.basename(outPath), before, after };
  } catch (e) {
    return { file: file + '.webp', error: e.message };
  }
}

async function run() {
  const results = [];
  for (const f of jpgs) results.push(await compressJpg(f, 65));
  for (const f of pngs) results.push(await compressPng(f, 9));
  for (const f of jpgs) results.push(await toWebp(f, 75));
  for (const f of pngs) results.push(await toWebp(f, 75));
  const summary = results.filter(r => !r.skipped).map(r => {
    if (r.error) return `${r.file}: ERROR ${r.error}`;
    return `${r.file}: ${r.before}KB -> ${r.after}KB`;
  });
  console.log(summary.join('\n'));
}

run().catch(e => {
  console.error('Compression run failed:', e);
  process.exit(1);
});