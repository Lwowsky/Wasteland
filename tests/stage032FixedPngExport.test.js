import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  captureFinalPlanPng,
  FINAL_PLAN_PNG_WIDTH,
  FINAL_PLAN_PNG_PIXEL_RATIO,
  FINAL_PLAN_SIGNATURE_PNG,
} from "../src/pages/FinalPlan/services/finalPlanPngExport.js";

function makeBoard({
  signatureBottom = 1000,
  signatureHeight = 40,
  imageComplete = true,
  imageNaturalWidth = 360,
} = {}) {
  let removed = false;
  let currentSrc = "/images/final-plan/board-signature-flatflags.svg";
  const elements = [];
  const listeners = {};
  const image = {
    naturalWidth: imageNaturalWidth,
    complete: imageComplete,
    set src(value) { currentSrc = value; },
    get src() { return currentSrc; },
    addEventListener(type, fn) { listeners[type] = fn; },
    removeEventListener(type, fn) {
      if (listeners[type] === fn) delete listeners[type];
    },
    async decode() { image.decodeCalled = true; },
  };
  const signature = {
    querySelector(selector) { return selector === "img" ? image : null; },
    getBoundingClientRect: () => ({ bottom: signatureBottom, height: signatureHeight }),
  };
  const document = {
    body: { appendChild: (node) => elements.push(node) },
    createElement: () => ({
      style: {}, children: [],
      appendChild(node) { this.children.push(node); },
      remove() { removed = true; },
    }),
  };
  const clone = {
    style: {}, ownerDocument: document, scrollHeight: 1100,
    getBoundingClientRect: () => ({ top: 0, height: 1070 }),
    classList: { add(name) { clone.addedClass = name; } },
    querySelector(selector) { return selector === ".final-plan-signature" ? signature : null; },
  };
  const board = { ownerDocument: document, cloneNode: () => clone };
  return { board, clone, image, listeners, elements, isRemoved: () => removed };
}

test("PNG export uses independent fixed-width clone and does not resize visible board", async () => {
  const { board, clone, image, elements, isRemoved } = makeBoard();
  const dataUrl = await captureFinalPlanPng(board, async (node, options) => {
    assert.equal(node, clone);
    assert.equal(node.addedClass, "final-plan-board--export");
    assert.equal(node.style.width, "1480px");
    assert.equal(node.style.overflow, "visible");
    assert.equal(options.width, 1480);
    assert.equal(options.height, 1100);
    assert.equal(options.pixelRatio, 2);
    assert.equal(image.src, FINAL_PLAN_SIGNATURE_PNG);
    assert.equal(image.loading, "eager");
    assert.equal(image.decodeCalled, true);
    return "data:image/png;base64,test";
  });
  assert.equal(dataUrl, "data:image/png;base64,test");
  assert.equal(elements.length, 1);
  assert.equal(isRemoved(), true);
  assert.equal(board.style, undefined);
});

test("PNG export includes the signature bottom plus safe padding", async () => {
  const { board } = makeBoard({ signatureBottom: 1190 });
  await captureFinalPlanPng(board, async (_, options) => {
    assert.equal(options.height, 1232);
    return "data:image/png;base64,test";
  });
});

test("PNG export waits for the signature image before calling html-to-image", async () => {
  const { board, image, listeners, isRemoved } = makeBoard({
    imageComplete: false,
    imageNaturalWidth: 0,
  });
  let startedCapture = false;
  const promise = captureFinalPlanPng(board, async () => {
    startedCapture = true;
    return "data:image/png;base64,test";
  });
  await Promise.resolve();
  assert.equal(startedCapture, false);
  assert.equal(typeof listeners.load, "function");
  image.complete = true;
  image.naturalWidth = 360;
  listeners.load();
  await promise;
  assert.equal(startedCapture, true);
  assert.equal(isRemoved(), true);
});

test("PNG export does not silently download a file without its signature", async () => {
  const { board, isRemoved } = makeBoard({ imageNaturalWidth: 0 });
  await assert.rejects(captureFinalPlanPng(board, async () => {
    throw new Error("should never reach capture");
  }), /signature failed to load/);
  assert.equal(isRemoved(), true);
});

test("PNG export cleans up its detached clone even after failed capture", async () => {
  const { board, isRemoved } = makeBoard();
  await assert.rejects(captureFinalPlanPng(board, async () => {
    throw new Error("canvas error");
  }), /canvas error/);
  assert.equal(isRemoved(), true);
});

test("PNG export stylesheet reserves a visible signature and keeps five desktop columns", () => {
  assert.equal(FINAL_PLAN_PNG_WIDTH, 1480);
  assert.equal(FINAL_PLAN_PNG_PIXEL_RATIO, 2);
  assert.equal(FINAL_PLAN_SIGNATURE_PNG, "/images/final-plan/board-signature-flatflags.png");
  const css = readFileSync(new URL("../src/pages/FinalPlan/FinalPlan.responsive.css", import.meta.url), "utf8");
  assert.match(css, /final-plan-board--export \.final-plan-towers[\s\S]*?repeat\(5,/);
  assert.match(css, /final-plan-board--export \.final-plan-player-row[\s\S]*?grid-template-columns/);
  assert.match(css, /final-plan-board--export \.final-plan-signature img[\s\S]*?visibility: visible/);
  const toolbar = readFileSync(new URL("../src/pages/FinalPlan/components/FinalPlanToolbar.jsx", import.meta.url), "utf8");
  assert.match(toolbar, /captureFinalPlanPng\(board, toPng\)/);
});
