(function () {
  const DB_NAME = "ppt-html-studio-history";
  // Version 2 is already present in browsers that used the academic rebuild.
  // Opening this store at v1 makes IndexedDB reject every read/write with
  // "requested version (1) is less than existing version (2)".
  const DB_VERSION = 2;
  const STORE_NAME = "records";
  let dbPromise = null;

  function hasIndexedDb() {
    return typeof window !== "undefined" && "indexedDB" in window;
  }

  function friendlyError(error) {
    const message = error?.message || String(error || "Unknown IndexedDB error");
    if (/quota|storage|disk|space/i.test(message)) {
      return new Error("Browser storage is full. Delete old history records or download backups, then try again.");
    }
    return new Error(message);
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(friendlyError(request.error));
    });
  }

  function openDb() {
    if (!hasIndexedDb()) {
      return Promise.reject(new Error("IndexedDB is unavailable in this browser. Local history cannot be saved."));
    }
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("source", "source", { unique: false });
          store.createIndex("mode", "mode", { unique: false });
        } else {
          // Keep records created by v1/v2 and add only indexes that are absent.
          const store = request.transaction.objectStore(STORE_NAME);
          [
            ["updatedAt", "updatedAt"],
            ["createdAt", "createdAt"],
            ["source", "source"],
            ["mode", "mode"],
          ].forEach(([name, keyPath]) => {
            if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique: false });
          });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(friendlyError(request.error));
      };
      request.onblocked = () => reject(new Error("History database is blocked by another tab. Close other PPT HTML Studio tabs and retry."));
    });
    return dbPromise;
  }

  function withStore(mode, worker) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(friendlyError(tx.error));
      tx.onabort = () => reject(friendlyError(tx.error));
      try {
        result = worker(store, tx);
      } catch (error) {
        tx.abort();
        reject(friendlyError(error));
      }
    }));
  }

  function now() {
    return Date.now();
  }

  function makeId() {
    const random = Math.random().toString(36).slice(2, 8);
    return `history_${Date.now().toString(36)}_${random}`;
  }

  function stripTags(value) {
    return String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleFromHtml(html) {
    const source = String(html || "");
    const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch?.[1]) return stripTags(titleMatch[1]).slice(0, 120);
    const headingMatch = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (headingMatch?.[1]) return stripTags(headingMatch[1]).slice(0, 120);
    return "";
  }

  function detectSlideCount(html) {
    const source = String(html || "");
    if (typeof DOMParser !== "undefined") {
      try {
        const doc = new DOMParser().parseFromString(source, "text/html");
        const candidates = [...doc.querySelectorAll("#deckStage > .slide,.deck-stage > .slide,deck-stage > .slide,.ppt-runtime-slide,.slide,.ai-slide,[data-slide-page],[data-slide]")];
        const slides = candidates.filter((node, index) => !candidates.some((other, otherIndex) => otherIndex !== index && other.contains(node)));
        if (slides.length) return slides.length;
      } catch {}
    }
    const matches = source.match(/class=["'][^"']*(?:ppt-runtime-slide|ai-slide|\bslide\b)[^"']*["']|data-slide-page=/gi);
    if (matches?.length) return matches.length;
    const navMatch = source.match(/(\d+)\s*\/\s*(\d+)/);
    return navMatch ? Number(navMatch[2]) || 0 : 0;
  }

  function createThumbnail(title, source, style) {
    const label = stripTags(title || "Presentation").slice(0, 46);
    const sourceLabel = stripTags(source || "deck").replace(/_/g, " ").slice(0, 18);
    const styleLabel = stripTags(style || "style").slice(0, 18);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#eef6ff"/>
          <stop offset="1" stop-color="#dce8ff"/>
        </linearGradient>
      </defs>
      <rect width="480" height="270" rx="24" fill="url(#g)"/>
      <rect x="28" y="28" width="424" height="214" rx="18" fill="#ffffff" opacity=".82"/>
      <rect x="56" y="64" width="190" height="12" rx="6" fill="#3f6df6"/>
      <rect x="56" y="92" width="320" height="10" rx="5" fill="#8fb2ff"/>
      <rect x="56" y="112" width="248" height="10" rx="5" fill="#c1d2ff"/>
      <text x="56" y="168" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="800" fill="#0f1b3d">${escapeSvg(label)}</text>
      <text x="56" y="208" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="700" fill="#66748f">${escapeSvg(sourceLabel)} · ${escapeSvg(styleLabel)}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function cdata(value) {
    return String(value || "").replace(/\]\]>/g, "]]]]><![CDATA[>");
  }

  function removeUnsafeNodes(root) {
    root.querySelectorAll("script, iframe, video, audio, object, embed").forEach((node) => node.remove());
    root.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attr) => {
        if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      });
    });
  }

  function thumbnailFromHtml(html, title, source, style) {
    const fallback = createThumbnail(title || titleFromHtml(html), source, style);
    const input = String(html || "");
    if (!input.trim() || typeof DOMParser === "undefined") return fallback;
    try {
      const doc = new DOMParser().parseFromString(input, "text/html");
      const candidates = [...doc.querySelectorAll(".slide, .ppt-runtime-slide, .ai-slide, [data-slide-page], [data-slide]")];
      const firstSlide = candidates.find((node) => !candidates.some((other) => other !== node && other.contains(node))) || doc.querySelector("section");
      if (!firstSlide) return fallback;
      const clone = firstSlide.cloneNode(true);
      removeUnsafeNodes(clone);
      clone.classList.add("history-cover-slide");
      clone.style.display = "block";
      clone.style.visibility = "visible";
      clone.style.opacity = "1";
      clone.style.position = "absolute";
      clone.style.left = "0";
      clone.style.top = "0";
      const styles = [...doc.querySelectorAll("style")]
        .map((node) => node.textContent || "")
        .join("\n")
        .slice(0, 150000)
        .replace(/<\/style/gi, "<\\/style")
        .replace(/\bhtml\b/g, ".history-cover-viewport")
        .replace(/\bbody\b/g, ".history-cover-body");
      const slideMarkup = new XMLSerializer().serializeToString(clone);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
        <foreignObject width="480" height="270">
          <div xmlns="http://www.w3.org/1999/xhtml" class="history-cover-viewport">
            <style><![CDATA[
              ${styles}
              .history-cover-viewport{margin:0!important;padding:0!important;width:480px!important;height:270px!important;overflow:hidden!important;background:#fff!important}
              .history-cover-body{display:block!important;width:480px!important;height:270px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
              .history-cover-stage{position:relative!important;width:1280px!important;height:720px!important;overflow:hidden!important;transform:scale(.375)!important;transform-origin:0 0!important;background:#fff!important}
              .history-cover-stage>.history-cover-slide{position:absolute!important;inset:0!important;width:1280px!important;height:720px!important;min-width:1280px!important;min-height:720px!important;max-width:none!important;max-height:none!important;margin:0!important;box-sizing:border-box!important;display:block!important;visibility:visible!important;opacity:1!important;overflow:hidden!important;transform:none!important}
              .history-cover-stage .ppt-runtime-nav,.history-cover-stage .ppt-paged-player-nav,.history-cover-stage .editor-toolbar,.history-cover-stage .ppt-ve-sidebar,.history-cover-stage .ppt-ve-inspector{display:none!important}
              .history-cover-stage *{animation:none!important;transition:none!important}
            ]]></style>
            <div class="history-cover-body ${String(doc.body.className || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"><div class="history-cover-stage" data-history-cover="v2">${slideMarkup}</div></div>
          </div>
        </foreignObject>
      </svg>`;
      const thumbnail = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      return thumbnail.length <= 200000 ? thumbnail : fallback;
    } catch {
      return fallback;
    }
  }

  function escapeSvg(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeRecord(record) {
    const timestamp = now();
    const html = String(record?.html || record?.editedHtml || "");
    const requestedScrollHtml = String(record?.scrollHtml || "");
    const title = stripTags(record?.title || titleFromHtml(html) || record?.fileName || "Untitled presentation") || "Untitled presentation";
    return {
      id: record?.id || makeId(),
      title,
      source: record?.source || "converter",
      mode: record?.mode || "local_rules",
      style: record?.style || "default",
      createdAt: Number(record?.createdAt) || timestamp,
      updatedAt: timestamp,
      slideCount: Number(record?.slideCount) || detectSlideCount(html),
      thumbnail: record?.thumbnail && String(record.thumbnail).length <= 200000
        ? record.thumbnail
        : createThumbnail(title, record?.source, record?.style),
      thumbnailKind: record?.thumbnailKind || (String(record?.thumbnail || "").includes("data-history-cover%3D%22v2%22") || String(record?.thumbnail || "").includes("data-history-cover=\"v2\"") ? "cover-v2" : "placeholder"),
      html,
      scrollHtml: requestedScrollHtml && requestedScrollHtml !== html ? requestedScrollHtml : "",
      editedHtml: String(record?.editedHtml || ""),
      fileName: record?.fileName || "",
      status: record?.status || "ready",
      metadata: record?.metadata || {},
    };
  }

  async function saveRecord(record) {
    const normalized = normalizeRecord(record);
    if (record?.id) {
      const existing = await getRecord(record.id).catch(() => null);
      if (existing) {
        normalized.createdAt = existing.createdAt || normalized.createdAt;
        normalized.editedHtml = record.editedHtml !== undefined ? String(record.editedHtml || "") : existing.editedHtml || "";
      }
    }
    await withStore("readwrite", (store) => {
      store.put(normalized);
    });
    return normalized;
  }

  async function updateRecord(id, patch) {
    const existing = await getRecord(id);
    if (!existing) throw new Error("History record was not found.");
    const updated = {
      ...existing,
      ...patch,
      id,
      createdAt: existing.createdAt,
      updatedAt: now(),
    };
    await withStore("readwrite", (store) => {
      store.put(updated);
    });
    return updated;
  }

  async function getRecord(id) {
    if (!id) return null;
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    return requestToPromise(tx.objectStore(STORE_NAME).get(id));
  }

  async function listRecords(options = {}) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const records = await new Promise((resolve, reject) => {
      const summaries = [];
      const request = tx.objectStore(STORE_NAME).openCursor();
      request.onerror = () => reject(friendlyError(request.error));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(summaries);
          return;
        }
        const record = cursor.value || {};
        summaries.push({
          id: record.id,
          title: record.title,
          source: record.source,
          mode: record.mode,
          style: record.style,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          slideCount: record.slideCount,
          thumbnail: String(record.thumbnail || "").length <= 200000 ? record.thumbnail : "",
          thumbnailKind: record.thumbnailKind || "placeholder",
          fileName: record.fileName,
          status: record.status,
          metadata: record.metadata || {},
        });
        cursor.continue();
      };
    });
    const query = String(options.query || "").toLowerCase().trim();
    const source = options.source || "";
    const mode = options.mode || "";
    let filtered = records;
    if (source) filtered = filtered.filter((record) => record.source === source);
    if (mode) filtered = filtered.filter((record) => record.mode === mode);
    if (query) {
      filtered = filtered.filter((record) => [
        record.title,
        record.fileName,
        record.source,
        record.mode,
        record.style,
      ].join(" ").toLowerCase().includes(query));
    }
    filtered.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return options.limit ? filtered.slice(0, options.limit) : filtered;
  }

  async function deleteRecord(id) {
    await withStore("readwrite", (store) => {
      store.delete(id);
    });
    return true;
  }

  async function deleteRecords(ids) {
    const uniqueIds = [...new Set(ids || [])].filter(Boolean);
    if (!uniqueIds.length) return 0;
    await withStore("readwrite", (store) => {
      uniqueIds.forEach((id) => store.delete(id));
    });
    return uniqueIds.length;
  }

  async function clearAllRecords() {
    await withStore("readwrite", (store) => {
      store.clear();
    });
    return true;
  }

  function renameRecord(id, title) {
    return updateRecord(id, { title: stripTags(title || "Untitled presentation") || "Untitled presentation" });
  }

  async function saveEditedHtml(id, html, scrollHtml) {
    const existing = await getRecord(id);
    if (!existing) throw new Error("History record was not found.");
    const latestHtml = String(html || "");
    const patch = {
      editedHtml: latestHtml,
      thumbnail: thumbnailFromHtml(latestHtml, existing.title, existing.source, existing.style),
      thumbnailKind: "cover-v2",
      status: "edited",
    };
    if (scrollHtml !== undefined) patch.scrollHtml = String(scrollHtml || latestHtml);
    return updateRecord(id, patch);
  }

  async function estimateStorage() {
    if (navigator.storage?.estimate) return navigator.storage.estimate();
    return { usage: 0, quota: 0 };
  }

  window.PptHistory = {
    init: openDb,
    saveRecord,
    updateRecord,
    getRecord,
    listRecords,
    deleteRecord,
    deleteRecords,
    clearAllRecords,
    renameRecord,
    saveEditedHtml,
    estimateStorage,
    createThumbnail,
    thumbnailFromHtml,
    titleFromHtml,
    detectSlideCount,
    isAvailable: hasIndexedDb,
  };
})();
