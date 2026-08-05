(function () {
  "use strict";

  const clean = (value, limit = 1200) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

  function buildMarkdown(paper = {}) {
    const pages = Array.isArray(paper.pages) ? paper.pages : [];
    const figures = Array.isArray(paper.figures) ? paper.figures : [];
    const tables = Array.isArray(paper.tables) ? paper.tables : [];
    const lines = [`# ${clean(paper.title || paper.sourceFile || "Academic paper", 260)}`, "", `> Source: ${clean(paper.sourceFile || "uploaded PDF", 180)}`, ""];
    pages.forEach((page) => {
      const heading = clean(page.section || page.title || `Page ${page.page}`, 180);
      lines.push(`## ${heading} {p.${Number(page.page) || 1}}`);
      if (page.text) lines.push(clean(page.text, 4200));
      lines.push("");
      figures.filter((asset) => Number(asset.page) === Number(page.page)).forEach((asset) => {
        lines.push(`[FIGURE: ${asset.id}] {p.${asset.page}} ${clean(asset.caption, 320)}`);
        lines.push(`- bbox: ${JSON.stringify(asset.bbox || null)}`);
      });
      tables.filter((asset) => Number(asset.page) === Number(page.page)).forEach((asset) => {
        lines.push(`[TABLE: ${asset.id}] {p.${asset.page}} ${clean(asset.caption, 320)}`);
      });
      lines.push("");
    });
    return lines.join("\n").slice(0, 140000);
  }

  function buildBundle(paper = {}) {
    const figures = Array.isArray(paper.figures) ? paper.figures : [];
    const tables = Array.isArray(paper.tables) ? paper.tables : [];
    return {
      version: "PdfResearchBundleV3",
      title: clean(paper.title, 260),
      sourceFile: clean(paper.sourceFile, 260),
      language: paper.language === "en" ? "en" : "zh",
      markdown: buildMarkdown(paper),
      assets: figures.concat(tables).map((asset) => ({
        id: clean(asset.id, 80),
        kind: asset.kind || (asset.headers?.length ? "table" : "figure"),
        page: Number(asset.page) || 1,
        caption: clean(asset.caption, 320),
        context: clean(asset.context, 700),
        bbox: asset.bbox || null,
        width: Number(asset.width) || 0,
        height: Number(asset.height) || 0,
      })),
      pages: (paper.pages || []).map((page) => ({ page: Number(page.page) || 1, title: clean(page.title, 180), section: clean(page.section, 120), text: clean(page.text, 4200) })),
    };
  }

  window.PdfResearchCoreV3 = Object.freeze({ buildMarkdown, buildBundle });
  window.PdfResearchCoreV4 = window.PdfResearchCoreV3;
})();
