/**
 * Compose Supabase Auth HTML emails from partials; optional browser preview with mock data.
 *
 * Usage:
 *   node scripts/email-templates.mjs build
 *   node scripts/email-templates.mjs preview [--port 4750] [--open]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { exec } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const TEMPLATES_ROOT = join(PROJECT_ROOT, "email-templates");
const PAGES_DIR = join(TEMPLATES_ROOT, "pages");
const OUT_DIR = join(TEMPLATES_ROOT, "supabase-ready");
const PREVIEW_DIR = join(TEMPLATES_ROOT, "preview-html");
const CONFIG_PATH = join(TEMPLATES_ROOT, "config.json");

function readUtf8File(path) {
  const buf = readFileSync(path);
  if (buf.length >= 2 && buf[1] === 0) return buf.toString("utf16le");
  return buf.toString("utf8");
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return {
      siteUrl: "http://localhost:5173",
      mockEmail: "preview@example.com",
      mockConfirmationUrlMagicLink: "http://localhost:5173/auth?preview=1",
      mockConfirmationUrlConfirm: "http://localhost:5173/auth?preview=1&type=signup",
      mockConfirmationUrlRecovery: "http://localhost:5173/reset-password?preview=1",
    };
  }
  const buf = readFileSync(CONFIG_PATH);
  const asUtf8 = buf.toString("utf8");
  try {
    return JSON.parse(asUtf8);
  } catch {
    if (buf.length >= 2 && buf[1] === 0) return JSON.parse(buf.toString("utf16le"));
    throw new Error(`Invalid JSON in ${CONFIG_PATH}`);
  }
}

function resolveIncludes(html) {
  let result = html;
  for (;;) {
    const match = /@@INCLUDE:([^@]+)@@/.exec(result);
    if (!match) break;
    const rel = match[1].trim();
    const abs = join(TEMPLATES_ROOT, rel);
    if (!existsSync(abs)) throw new Error(`Missing partial: ${rel}`);
    const partial = readUtf8File(abs);
    result = result.replace(match[0], partial);
  }
  return result;
}

function composePage(filename) {
  const pagePath = join(PAGES_DIR, filename);
  const raw = readUtf8File(pagePath);
  return resolveIncludes(raw);
}

function applyPreviewMocks(html, { confirmationUrl, email, siteUrl }) {
  return html
    .replaceAll("{{ .ConfirmationURL }}", confirmationUrl)
    .replaceAll("{{ .Email }}", email)
    .replaceAll("{{ .SiteURL }}", siteUrl);
}

function buildAll() {
  mkdirSync(OUT_DIR, { recursive: true });
  const pages = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".html"));
  for (const page of pages) {
    const composed = composePage(page);
    writeFileSync(join(OUT_DIR, page), composed, "utf8");
    console.log(`Wrote ${relative(PROJECT_ROOT, join(OUT_DIR, page))}`);
  }
}

function openBrowser(url) {
  if (process.platform === "win32") {
    exec(`cmd /c start "" "${url}"`, () => {});
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`, () => {});
  } else {
    exec(`xdg-open "${url}"`, () => {});
  }
}

function previewAll(port, openBrowserFlag) {
  const cfg = loadConfig();
  mkdirSync(PREVIEW_DIR, { recursive: true });
  buildAll();

  const mapping = [
    { src: "magic-link.html", confirmationUrl: cfg.mockConfirmationUrlMagicLink },
    { src: "confirm-signup.html", confirmationUrl: cfg.mockConfirmationUrlConfirm },
    { src: "reset-password.html", confirmationUrl: cfg.mockConfirmationUrlRecovery },
  ];

  for (const { src, confirmationUrl } of mapping) {
    const composed = composePage(src);
    const mocked = applyPreviewMocks(composed, {
      confirmationUrl,
      email: cfg.mockEmail,
      siteUrl: cfg.siteUrl,
    });
    writeFileSync(join(PREVIEW_DIR, src), mocked, "utf8");
    console.log(`Preview: ${relative(PROJECT_ROOT, join(PREVIEW_DIR, src))}`);
  }

  const indexHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Auth email previews</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem}a{display:block;margin:.75rem 0}</style></head><body>
<h1>Supabase Auth email previews (mock data)</h1>
<p>Source: <code>email-templates/pages/</code> plus partials. Dashboard-ready HTML with Go placeholders: <code>email-templates/supabase-ready/</code>.</p>
<ul>
<li><a href="/magic-link.html">Magic link</a></li>
<li><a href="/confirm-signup.html">Confirm signup</a></li>
<li><a href="/reset-password.html">Reset password</a></li>
</ul>
</body></html>`;
  writeFileSync(join(PREVIEW_DIR, "index.html"), indexHtml, "utf8");

  let boundPort = port;
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${boundPort}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const safe = pathname.replace(/^\/+/, "").replace(/\//g, sep);
    const filePath = resolve(PREVIEW_DIR, safe);
    const base = resolve(PREVIEW_DIR) + sep;
    if (!filePath.startsWith(base) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const body = readFileSync(filePath);
    const ct = safe.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": ct, "Cache-Control": "no-store" });
    res.end(body);
  });

  const portMax = port + 40;
  const listenFrom = (tryPort) => {
    if (tryPort > portMax) {
      console.error(`No free port between ${port} and ${portMax} (EADDRINUSE). Close the other preview or use --port.`);
      process.exit(1);
    }
    const onErr = (err) => {
      if (err.code === "EADDRINUSE") {
        server.off("error", onErr);
        listenFrom(tryPort + 1);
      } else {
        console.error("Preview server error:", err.message);
        process.exit(1);
      }
    };
    server.once("error", onErr);
    server.listen(tryPort, "127.0.0.1", () => {
      server.off("error", onErr);
      boundPort = tryPort;
      if (tryPort !== port) {
        console.log(`Port ${port} was busy; using ${tryPort} instead.`);
      }
      const url = `http://127.0.0.1:${boundPort}/`;
      console.log(`\nEmail preview: ${url}\n`);
      if (openBrowserFlag) openBrowser(url);
    });
  };
  listenFrom(port);
}

const cmd = process.argv[2] || "build";
if (cmd === "build") {
  buildAll();
} else if (cmd === "preview") {
  let port = 4750;
  const i = process.argv.indexOf("--port");
  if (i !== -1 && process.argv[i + 1]) port = Number(process.argv[i + 1]) || 4750;
  const openFlag = process.argv.includes("--open");
  previewAll(port, openFlag);
} else {
  console.error("Usage: node scripts/email-templates.mjs build|preview [--port 4750] [--open]");
  process.exit(1);
}
