import { publicAsset } from "../../../utils/publicAsset.js";

// Capture a stable, desktop-width copy of the board without changing the live UI.
// Use the site's PNG signature for export: DOM clones don't retain React's SVG
// onError fallback, and an image still loading can disappear from html-to-image.
export const FINAL_PLAN_PNG_WIDTH = 1480;
export const FINAL_PLAN_PNG_PIXEL_RATIO = 2;
export const FINAL_PLAN_SIGNATURE_PNG = publicAsset("/images/final-plan/board-signature-flatflags.png");
const SIGNATURE_BOTTOM_SPACE = 42;

export function createFinalPlanExportBoard(board) {
  const document = board.ownerDocument;
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${FINAL_PLAN_PNG_WIDTH}px`;
  wrapper.style.pointerEvents = "none";

  const clonedBoard = board.cloneNode(true);
  clonedBoard.classList.add("final-plan-board--export");
  clonedBoard.style.width = `${FINAL_PLAN_PNG_WIDTH}px`;
  clonedBoard.style.minWidth = `${FINAL_PLAN_PNG_WIDTH}px`;
  clonedBoard.style.maxWidth = `${FINAL_PLAN_PNG_WIDTH}px`;
  clonedBoard.style.overflow = "visible";
  wrapper.appendChild(clonedBoard);
  document.body.appendChild(wrapper);

  return { board: clonedBoard, cleanup: () => wrapper.remove() };
}

async function ensureSignatureReady(exportBoard) {
  const signature = exportBoard.querySelector?.(".final-plan-signature");
  const img = signature?.querySelector?.("img");
  if (!img) throw new Error("Final plan signature image is missing");

  // Always use the existing raster asset in exported files. The visible board
  // keeps its SVG and its React fallback unchanged.
  img.loading = "eager";
  img.decoding = "sync";
  img.src = FINAL_PLAN_SIGNATURE_PNG;

  if (!img.complete) {
    await new Promise((resolve, reject) => {
      const onLoad = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error("Final plan signature failed to load")); };
      const cleanup = () => {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
      };
      img.addEventListener("load", onLoad);
      img.addEventListener("error", onError);
      // The asset might have loaded between `complete` and adding listeners.
      if (img.complete) {
        if (img.naturalWidth > 0) onLoad();
        else onError();
      }
    });
  }
  if (img.naturalWidth <= 0) throw new Error("Final plan signature failed to load");
  if (typeof img.decode === "function") {
    try { await img.decode(); } catch {
      // Some browsers reject decode() for an already-renderable image.
      if (img.naturalWidth <= 0) throw new Error("Final plan signature failed to decode");
    }
  }
  return signature;
}

export async function captureFinalPlanPng(board, toPng) {
  const { board: exportBoard, cleanup } = createFinalPlanExportBoard(board);
  try {
    if (exportBoard.ownerDocument.fonts?.ready) {
      await exportBoard.ownerDocument.fonts.ready;
    }
    const signature = await ensureSignatureReady(exportBoard);

    // Force layout *after* the PNG signature and fonts have loaded. scrollHeight
    // alone can omit a transformed/overflowing descendant in some viewports.
    const boardBounds = exportBoard.getBoundingClientRect();
    const signatureBounds = signature.getBoundingClientRect();
    const signatureBottom = signatureBounds.bottom - boardBounds.top;
    if (!signatureBounds.height || !Number.isFinite(signatureBottom)) {
      throw new Error("Final plan signature has no measurable size");
    }
    const height = Math.ceil(Math.max(
      exportBoard.scrollHeight,
      boardBounds.height,
      signatureBottom + SIGNATURE_BOTTOM_SPACE,
    ));

    return await toPng(exportBoard, {
      width: FINAL_PLAN_PNG_WIDTH,
      height,
      pixelRatio: FINAL_PLAN_PNG_PIXEL_RATIO,
      cacheBust: true,
      backgroundColor: "#dce6f3",
    });
  } finally {
    cleanup();
  }
}
