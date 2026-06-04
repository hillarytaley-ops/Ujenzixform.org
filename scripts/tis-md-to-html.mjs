/**
 * Convert TIS certification Markdown to print-ready HTML.
 * Usage: node scripts/tis-md-to-html.mjs <input.md> [output.html]
 */
import fs from "fs";
import path from "path";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath.replace(/\.md$/i, ".html");

if (!inputPath) {
  console.error("Usage: node scripts/tis-md-to-html.mjs <input.md> [output.html]");
  process.exit(1);
}

const md = fs.readFileSync(inputPath, "utf8");
const titleMatch = md.match(/^#\s+(.+)$/m);
const title = titleMatch ? titleMatch[1].replace(/\*\*/g, "") : path.basename(inputPath, ".md");

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function isTableRow(line) {
  return line.trim().startsWith("|");
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line) {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

function convertMarkdown(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code${lang ? ` class="language-${lang}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (isTableRow(line)) {
      const tableLines = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2 && isTableSeparator(tableLines[1])) {
        const headers = parseTableRow(tableLines[0]);
        out.push("<table><thead><tr>");
        for (const h of headers) out.push(`<th>${inlineFormat(h)}</th>`);
        out.push("</tr></thead><tbody>");
        for (let r = 2; r < tableLines.length; r++) {
          const cells = parseTableRow(tableLines[r]);
          out.push("<tr>");
          for (const c of cells) out.push(`<td>${inlineFormat(c)}</td>`);
          out.push("</tr>");
        }
        out.push("</tbody></table>");
      }
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push("<hr />");
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inlineFormat(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${inlineFormat(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    const ol = line.match(/^(\d+)\.\s+(.+)$/);
    if (ol) {
      out.push("<ol>");
      while (i < lines.length) {
        const m = lines[i].match(/^(\d+)\.\s+(.+)$/);
        if (!m) break;
        out.push(`<li>${inlineFormat(m[2])}</li>`);
        i++;
      }
      out.push("</ol>");
      continue;
    }

    if (/^-\s+/.test(line)) {
      out.push("<ul>");
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        out.push(`<li>${inlineFormat(lines[i].replace(/^-\s+/, ""))}</li>`);
        i++;
      }
      out.push("</ul>");
      continue;
    }

    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("```") && !isTableRow(lines[i]) && !/^---+$/.test(lines[i].trim()) && !lines[i].startsWith(">") && !/^-\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      out.push(`<p>${inlineFormat(paraLines.join(" "))}</p>`);
    }
  }

  return out.join("\n");
}

const body = convertMarkdown(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      max-width: 7.4in;
      margin: 0 auto;
      padding: 0.35in 0.2in;
      color: #111;
    }
    .hint {
      font-size: 9pt;
      background: #ecfdf5;
      border: 1px solid #99f6e4;
      padding: 0.5rem 0.65rem;
      margin-bottom: 0.85rem;
    }
    h1 { font-size: 16pt; margin: 0 0 0.6rem; color: #0f172a; page-break-after: avoid; }
    h2 { font-size: 12.5pt; margin: 1.1rem 0 0.45rem; color: #1e293b; page-break-after: avoid; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.15rem; }
    h3 { font-size: 11pt; margin: 0.85rem 0 0.35rem; color: #334155; page-break-after: avoid; }
    h4 { font-size: 10.5pt; margin: 0.65rem 0 0.25rem; color: #475569; page-break-after: avoid; }
    p { margin: 0.35rem 0 0.55rem; }
    ul, ol { margin: 0.35rem 0 0.65rem; padding-left: 1.25rem; }
    li { margin: 0.15rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 0.55rem 0 0.85rem; font-size: 9.5pt; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 0.28rem 0.4rem; vertical-align: top; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    tr:nth-child(even) td { background: #fcfdff; }
    code, pre code { font-family: Consolas, "Courier New", monospace; font-size: 9pt; }
    p code, li code, td code, th code { background: #f1f5f9; padding: 0.05rem 0.25rem; border-radius: 3px; }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 0.65rem 0.75rem;
      border-radius: 6px;
      overflow-x: auto;
      page-break-inside: avoid;
      margin: 0.5rem 0 0.75rem;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    blockquote {
      margin: 0.5rem 0 0.75rem;
      padding: 0.45rem 0.75rem;
      border-left: 3px solid #14b8a6;
      background: #f0fdfa;
      color: #134e4a;
    }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
    a { color: #0f766e; word-break: break-all; }
    @media print {
      .hint { display: none; }
      body { padding: 0; }
      h2 { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <div class="hint">UjenziXform TIS certification document — Ctrl+P → Save as PDF if needed.</div>
  ${body}
</body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, "utf8");
console.log(`Wrote ${outputPath}`);
