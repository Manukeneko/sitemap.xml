#!/usr/bin/env node
// Builds docs/ (GitHub Pages source) from exams/*.json + template/*.html.
// Add a new quiz app: drop a new JSON file in exams/, then run `node build.js`.

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE_URL = process.env.SITE_URL || "https://manukeneko.github.io/sitemap.xml";
const EXAMS_DIR = path.join(ROOT, "exams");
const TEMPLATE_DIR = path.join(ROOT, "template");
const ASSETS_DIR = path.join(ROOT, "assets");
const OUT_DIR = path.join(ROOT, "docs");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fill(template, map) {
  return Object.keys(map).reduce(
    (out, key) => out.split("{{" + key + "}}").join(map[key]),
    template
  );
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function build() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  copyDir(ASSETS_DIR, path.join(OUT_DIR, "assets"));

  const examFiles = fs.readdirSync(EXAMS_DIR).filter((f) => f.endsWith(".json"));
  const examTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "exam.html"), "utf8");
  const indexTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, "index.html"), "utf8");

  const exams = examFiles.map((f) => readJson(path.join(EXAMS_DIR, f)));
  const today = new Date().toISOString().slice(0, 10);

  const cards = exams
    .map(
      (e) =>
        `    <a class="exam-card" href="exams/${e.slug}/index.html">` +
        `<div class="cat">${escapeXml(e.category)}</div>` +
        `<h3>${escapeXml(e.shortTitle)}</h3>` +
        `<p>${escapeXml(e.description)}</p></a>`
    )
    .join("\n");

  fs.writeFileSync(
    path.join(OUT_DIR, "index.html"),
    fill(indexTemplate, { EXAM_CARDS: cards, CANONICAL: SITE_URL + "/" })
  );

  const urls = [{ loc: SITE_URL + "/", priority: "1.0" }];

  for (const exam of exams) {
    const examDir = path.join(OUT_DIR, "exams", exam.slug);
    fs.mkdirSync(examDir, { recursive: true });
    const canonical = `${SITE_URL}/exams/${exam.slug}/`;
    const html = fill(examTemplate, {
      TITLE: exam.title,
      DESCRIPTION: exam.description,
      CATEGORY: exam.category,
      CANONICAL: canonical,
      QUIZ_JSON: JSON.stringify(exam).replace(/</g, "\\u003c"),
    });
    fs.writeFileSync(path.join(examDir, "index.html"), html);
    urls.push({ loc: canonical, priority: "0.8" });
  }

  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n") +
    "\n</urlset>\n";

  fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), sitemap);
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

  fs.writeFileSync(
    path.join(OUT_DIR, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );

  console.log(`Built ${exams.length} exam page(s) into docs/`);
}

build();
