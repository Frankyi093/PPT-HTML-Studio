"use strict";

importScripts("/static/jszip.min.js", "/static/pptx-local-core.js?v=20260802-fixed-stage-v2");

self.onmessage = async (event) => {
  const payload = event.data || {};
  try {
    if (payload.type === "render") {
      const html = self.PptxLocalCore.renderDeck(payload.deck, payload.patches || [], payload.stylePack || null);
      self.postMessage({ type: "result", html });
      return;
    }
    if (payload.type !== "convert" || !(payload.arrayBuffer instanceof ArrayBuffer)) {
      throw new Error("Invalid local converter request.");
    }
    const result = await self.PptxLocalCore.convertPptx(payload.arrayBuffer, self.JSZip, (progress) => {
      self.postMessage({ type: "progress", ...progress });
    });
    result.deck.fileName = payload.fileName || result.deck.fileName;
    result.html = self.PptxLocalCore.renderDeck(result.deck, [], payload.stylePack || null);
    self.postMessage({ type: "result", ...result });
  } catch (error) {
    self.postMessage({ type: "error", message: error?.message || String(error), stack: error?.stack || "" });
  }
};
