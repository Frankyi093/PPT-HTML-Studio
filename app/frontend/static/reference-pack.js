/*
 * Shared reference-material ingestion for all three creation workflows.
 *
 * The Markdown outline parser follows the structure used by Anionex/banana-slides:
 * # Part / ## Page title / - point, with the first content point treated as the
 * page takeaway. This is an adaptation for the browser-only Cloudflare build.
 */
(function () {
  const MAX_TEXT_CHARS = 18000;
  const MAX_IMAGE_BYTES = 900 * 1024;
  const MAX_IMAGES = 6;

  function uid(prefix = "ref") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clean(value) {
    return String(value || "").replace(/\uFEFF/g, "").replace(/\r/g, "").trim();
  }

  function empty() {
    return { files: [], images: [], outlineText: "", outline: [], summary: "" };
  }

  function parseMarkdownOutline(markdown) {
    const lines = clean(markdown).split("\n");
    const pages = [];
    let part = "";
    let current = null;
    let sawStructure = false;
    const commit = () => {
      if (!current) return;
      current.points = current.points.filter(Boolean);
      if (current.title || current.points.length) {
        current.takeaway = current.points[0] || "";
        pages.push(current);
      }
      current = null;
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || /^```/.test(line) || /^---+$/.test(line)) continue;
      const partMatch = line.match(/^#\s+(.+)$/);
      if (partMatch) {
        commit();
        part = partMatch[1].replace(/^part\s*[:：-]?\s*/i, "").trim();
        sawStructure = true;
        continue;
      }
      const pageMatch = line.match(/^(?:##+|(?:第\s*\d+\s*页|page\s*\d+)\s*[:：.-]?)\s*(.+)$/i);
      if (pageMatch) {
        commit();
        const title = pageMatch[1].trim().replace(/^(?:page\s*\d+|第\s*\d+\s*页)\s*[:：.-]?\s*/i, "");
        current = { page: pages.length + 1, part, type: "Content", title, takeaway: "", points: [] };
        sawStructure = true;
        continue;
      }
      const pointMatch = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
      if (pointMatch) {
        if (!current) {
          current = { page: pages.length + 1, part: "", type: "Content", title: "", takeaway: "", points: [] };
        }
        current.points.push(pointMatch[1].replace(/^\[[ xX]\]\s*/, "").trim());
        continue;
      }
      if (current) {
        current.points.push(line.replace(/^>\s*/, ""));
      } else if (line) {
        current = { page: pages.length + 1, part: "", type: "Content", title: line, takeaway: "", points: [] };
        sawStructure = true;
      }
    }
    commit();
    return sawStructure ? pages.map((page, index) => ({ ...page, page: index + 1 })) : [];
  }

  function xmlText(xml) {
    const values = [];
    const matches = String(xml || "").matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
    for (const match of matches) {
      const value = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
      if (value) values.push(value);
    }
    return values.join(" ").replace(/\s+/g, " ").trim();
  }

  async function readDocx(file) {
    if (!window.JSZip) throw new Error("Word parsing needs the browser ZIP runtime. Please reload and try again.");
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const documentFile = zip.file("word/document.xml");
    if (!documentFile) throw new Error("This Word file does not contain a readable document body.");
    const xml = await documentFile.async("text");
    const paragraphs = [];
    for (const paragraph of xml.matchAll(/<w:p[\s\S]*?<\/w:p>/gi)) {
      const value = xmlText(paragraph[0]);
      if (value) paragraphs.push(value);
    }
    return paragraphs.join("\n").slice(0, MAX_TEXT_CHARS);
  }

  function readDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read image."));
      reader.readAsDataURL(file);
    });
  }

  function asImageEntry(file, dataUrl) {
    return {
      id: uid("img"),
      name: file.name,
      type: file.type || "image/*",
      size: file.size,
      dataUrl: file.size <= MAX_IMAGE_BYTES ? dataUrl : "",
      caption: "",
      usageHint: "Use this image as a real reference or editable visual asset; preserve its subject and proportions.",
    };
  }

  async function readFile(file) {
    const name = String(file.name || "file");
    const lower = name.toLowerCase();
    if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(lower)) {
      return { kind: "image", value: asImageEntry(file, await readDataUrl(file)) };
    }
    let text = "";
    if (/\.docx$/i.test(lower)) text = await readDocx(file);
    else if (/\.(md|markdown|txt|text)$/i.test(lower)) text = (await file.text()).slice(0, MAX_TEXT_CHARS);
    else if (/\.doc$/i.test(lower)) throw new Error(`${name}: legacy .doc is not readable in the browser; please save it as .docx.`);
    else throw new Error(`${name}: supported reference formats are .docx, .md, .txt and images.`);
    return {
      kind: "file",
      value: {
        id: uid("file"),
        name,
        type: file.type || "text/plain",
        size: file.size,
        text,
        summary: text.replace(/\s+/g, " ").slice(0, 240),
        sourcePages: parseMarkdownOutline(text),
      },
    };
  }

  function merge(base, entries) {
    const next = { ...(base || empty()) };
    next.files = [...(next.files || [])];
    next.images = [...(next.images || [])];
    for (const entry of entries || []) {
      if (entry.kind === "image" && next.images.length < MAX_IMAGES) next.images.push(entry.value);
      if (entry.kind === "file") next.files.push(entry.value);
    }
    const outlineFile = next.files.find((file) => /\.(md|markdown|docx|txt)$/i.test(file.name));
    next.outlineText = outlineFile?.text || next.outlineText || "";
    next.outline = parseMarkdownOutline(next.outlineText);
    next.summary = [
      next.files.length ? `${next.files.length} reference file(s)` : "",
      next.images.length ? `${next.images.length} reference image(s)` : "",
    ].filter(Boolean).join(", ");
    return next;
  }

  function remove(pack, id) {
    const next = { ...(pack || empty()) };
    next.files = (next.files || []).filter((item) => item.id !== id);
    next.images = (next.images || []).filter((item) => item.id !== id);
    next.outlineText = next.files[0]?.text || "";
    next.outline = parseMarkdownOutline(next.outlineText);
    next.summary = [next.files.length ? `${next.files.length} reference file(s)` : "", next.images.length ? `${next.images.length} reference image(s)` : ""].filter(Boolean).join(", ");
    return next;
  }

  function apiPayload(pack) {
    const source = pack || empty();
    return {
      summary: source.summary || "",
      outlineText: String(source.outlineText || "").slice(0, MAX_TEXT_CHARS),
      outline: Array.isArray(source.outline) ? source.outline.slice(0, 30) : [],
      files: (source.files || []).map((file) => ({ id: file.id, name: file.name, type: file.type, text: String(file.text || "").slice(0, MAX_TEXT_CHARS), summary: file.summary || "" })).slice(0, 8),
      images: (source.images || []).slice(0, MAX_IMAGES).map((image) => ({ id: image.id, name: image.name, type: image.type, caption: image.caption || "", usageHint: image.usageHint || "", dataUrl: String(image.dataUrl || "").length <= 900000 ? String(image.dataUrl || "") : "" })),
    };
  }

  function render(pack, root, onRemove) {
    if (!root) return;
    const files = (pack?.files || []).map((item) => `<span class="reference-chip"><b>DOC</b>${escapeHtml(item.name)}<button type="button" data-remove-ref="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">×</button></span>`).join("");
    const images = (pack?.images || []).map((item) => `<span class="reference-chip"><img src="${item.dataUrl || ""}" alt=""><b>IMG</b>${escapeHtml(item.name)}<button type="button" data-remove-ref="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">×</button></span>`).join("");
    root.innerHTML = files + images || `<span class="reference-empty">No reference materials yet.</span>`;
    root.querySelectorAll("[data-remove-ref]").forEach((button) => button.addEventListener("click", () => onRemove?.(button.dataset.removeRef)));
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function attach({ input, list, initial = empty(), onChange } = {}) {
    let pack = initial || empty();
    const repaint = () => render(pack, list, (id) => { pack = remove(pack, id); repaint(); onChange?.(pack); });
    input?.addEventListener("change", async () => {
      const files = [...(input.files || [])];
      if (!files.length) return;
      try {
        const entries = [];
        for (const file of files) entries.push(await readFile(file));
        pack = merge(pack, entries);
        repaint();
        onChange?.(pack);
      } catch (error) {
        onChange?.(pack, error);
      } finally {
        input.value = "";
      }
    });
    repaint();
    return { get: () => pack, set: (next) => { pack = next || empty(); repaint(); onChange?.(pack); } };
  }

  window.PptReferencePack = { empty, parseMarkdownOutline, readFile, merge, remove, apiPayload, render, attach, MAX_IMAGES, MAX_IMAGE_BYTES };
})();
