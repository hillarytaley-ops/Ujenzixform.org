import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
const outDir = path.join(publicDir, 'optimized');

async function ensureDir(dir) {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch {}
}

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') return;
  const name = path.basename(filePath, ext);
  const input = path.join(publicDir, `${name}${ext}`);
  const avifOut = path.join(outDir, `${name}.avif`);
  const webpOut = path.join(outDir, `${name}.webp`);
  const jpgOut = path.join(outDir, `${name}.jpg`);

  const img = sharp(input).resize({ width: 800, withoutEnlargement: true, fit: 'inside' });
  await img.clone().avif({ quality: 50 }).toFile(avifOut);
  await img.clone().webp({ quality: 60 }).toFile(webpOut);
  await img.clone().flatten({ background: '#ffffff' }).jpeg({ quality: 65, progressive: true }).toFile(jpgOut);
}

async function main() {
  await ensureDir(outDir);
  const files = await fs.promises.readdir(publicDir);
  const targets = files.filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'));
  for (const f of targets) {
    const fp = path.join(publicDir, f);
    try {
      await optimizeFile(fp);
      process.stdout.write(`Optimized ${f}\n`);
    } catch (e) {
      process.stdout.write(`Skipped ${f} (${e?.message || 'error'})\n`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});