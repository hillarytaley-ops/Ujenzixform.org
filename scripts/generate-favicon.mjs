/**
 * Writes public/ujenzixform-logo.png, favicon.ico, and PWA icons for deploys.
 * Prefers ujenzixform-logo-circular.svg. Skips corrupt .png files that are
 * data-URL text instead of binary PNG.
 * Run: npm run favicon:generate (also runs before vite build).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const outLogoPng = path.join(publicDir, "ujenzixform-logo.png");
const icoPath = path.join(publicDir, "favicon.ico");
const svgPath = path.join(publicDir, "ujenzixform-logo-circular.svg");
const preferredPng = path.join(publicDir, "ujenzixform-logo.png");
const fallbackPng = path.join(publicDir, "ujenzipro-logo.png");

function isBinaryPng(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const b = fs.readFileSync(filePath);
  return (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  );
}

function tryDecodeDataUrlPng(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  const m = raw.match(/^data:image\/png;base64,([A-Za-z0-9+/=\s]+)/m);
  if (!m) return null;
  const b64 = m[1].replace(/\s/g, "");
  try {
    const buf = Buffer.from(b64, "base64");
    if (
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return buf;
    }
  } catch {
    return null;
  }
  return null;
}

/** Drop data-URL-as-text “.png” files so png-to-ico / sharp never read garbage (CI cache, old branches). */
function scrubBrokenPngFiles() {
  for (const p of [preferredPng, fallbackPng]) {
    if (!fs.existsSync(p)) continue;
    if (isBinaryPng(p)) continue;
    if (tryDecodeDataUrlPng(p)) continue;
    try {
      fs.unlinkSync(p);
      console.warn("Removed invalid PNG (not binary):", path.basename(p));
    } catch (e) {
      console.warn("Could not remove", p, e);
    }
  }
}

scrubBrokenPngFiles();

/** @returns {{ kind: 'svg', path: string } | { kind: 'pngFile', path: string } | { kind: 'pngBuffer', buffer: Buffer }} */
function resolveBrandSource() {
  if (fs.existsSync(svgPath)) {
    console.log("Brand source: ujenzixform-logo-circular.svg");
    return { kind: "svg", path: svgPath };
  }
  for (const p of [preferredPng, fallbackPng]) {
    if (isBinaryPng(p)) {
      console.log("Brand source:", path.basename(p), "(binary PNG)");
      return { kind: "pngFile", path: p };
    }
    const decoded = tryDecodeDataUrlPng(p);
    if (decoded) {
      console.log("Brand source:", path.basename(p), "(decoded data URL)");
      return { kind: "pngBuffer", buffer: decoded };
    }
  }
  console.error(
    "No usable brand asset. Add public/ujenzixform-logo-circular.svg or a valid binary PNG."
  );
  process.exit(1);
}

const source = resolveBrandSource();

function raster(side) {
  if (source.kind === "svg") {
    return sharp(source.path, { density: 320 }).resize(side, side, {
      fit: "cover",
    });
  }
  if (source.kind === "pngFile") {
    return sharp(source.path).resize(side, side, { fit: "cover" });
  }
  return sharp(source.buffer).resize(side, side, { fit: "cover" });
}

await raster(512).png().toFile(outLogoPng);
console.log("Wrote", outLogoPng);

await raster(192).png().toFile(path.join(publicDir, "pwa-icon-192.png"));
await raster(512).png().toFile(path.join(publicDir, "pwa-icon-512.png"));
console.log("Wrote pwa-icon-192.png, pwa-icon-512.png");

const icoBuffers = await Promise.all(
  [16, 32, 48].map((s) => raster(s).png().toBuffer())
);
fs.writeFileSync(icoPath, await pngToIco(icoBuffers));
console.log("Wrote", icoPath);
