/**
 * Ensures public brand PNG, favicon.ico, and PWA PNG icons exist for deploys.
 * Source: public/ujenzixform-logo.png, or copy from public/ujenzipro-logo.png.
 * Run: npm run favicon:generate (also runs automatically before vite build).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const preferred = path.join(publicDir, "ujenzixform-logo.png");
const fallback = path.join(publicDir, "ujenzipro-logo.png");

let pngPath = preferred;
if (!fs.existsSync(preferred)) {
  if (!fs.existsSync(fallback)) {
    console.error(
      "Missing brand PNG. Add public/ujenzixform-logo.png or public/ujenzipro-logo.png"
    );
    process.exit(1);
  }
  fs.copyFileSync(fallback, preferred);
  console.log("Copied ujenzipro-logo.png -> ujenzixform-logo.png");
  pngPath = preferred;
}

const icoPath = path.join(publicDir, "favicon.ico");
const buf = await pngToIco(pngPath);
fs.writeFileSync(icoPath, buf);
console.log("Wrote", icoPath);

await sharp(pngPath)
  .resize(192, 192, { fit: "cover" })
  .png()
  .toFile(path.join(publicDir, "pwa-icon-192.png"));
await sharp(pngPath)
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile(path.join(publicDir, "pwa-icon-512.png"));
console.log("Wrote pwa-icon-192.png, pwa-icon-512.png");
