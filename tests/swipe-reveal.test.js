import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackPages,
  clampTrackOffset,
  getTrackDirection,
  getTrackTargetPage,
  shouldCommitTrackMove,
  shouldStartTrackGesture
} from "../src/reader/swipe-reveal.js";

test("getTrackDirection maps left drags to previous and right drags to next", () => {
  assert.equal(getTrackDirection({ dx: -72, dy: 12, startThreshold: 8 }), "previous");
  assert.equal(getTrackDirection({ dx: 72, dy: 12, startThreshold: 8 }), "next");
});

test("getTrackDirection treats equality and vertical drags as non-drags", () => {
  assert.equal(getTrackDirection({ dx: 8, dy: 0, startThreshold: 8 }), null);
  assert.equal(getTrackDirection({ dx: 24, dy: 24, startThreshold: 8 }), null);
  assert.equal(getTrackDirection({ dx: 24, dy: 60, startThreshold: 8 }), null);
});

test("shouldCommitTrackMove uses strict horizontal and vertical thresholds", () => {
  assert.equal(shouldCommitTrackMove({ dx: 61, dy: 30, commitDistance: 60, verticalLimit: 70 }), true);
  assert.equal(shouldCommitTrackMove({ dx: 60, dy: 30, commitDistance: 60, verticalLimit: 70 }), false);
  assert.equal(shouldCommitTrackMove({ dx: 90, dy: 70, commitDistance: 60, verticalLimit: 70 }), false);
});

test("shouldStartTrackGesture lets desktop text drags select text", () => {
  assert.equal(shouldStartTrackGesture({ pointerType: "mouse", startedOnSelectableText: true }), false);
  assert.equal(shouldStartTrackGesture({ pointerType: "mouse", startedOnSelectableText: false }), true);
  assert.equal(shouldStartTrackGesture({ pointerType: "touch", startedOnSelectableText: true }), true);
});

test("clampTrackOffset damps large drags", () => {
  assert.equal(clampTrackOffset(40, { maxOffset: 120, dragRatio: 0.45 }), 18);
  assert.equal(clampTrackOffset(400, { maxOffset: 120, dragRatio: 0.45 }), 120);
  assert.equal(clampTrackOffset(-400, { maxOffset: 120, dragRatio: 0.45 }), -120);
});

test("getTrackTargetPage honors boundaries", () => {
  assert.equal(getTrackTargetPage({ currentPage: 12, direction: "next", pageCount: 604 }), 13);
  assert.equal(getTrackTargetPage({ currentPage: 12, direction: "previous", pageCount: 604 }), 11);
  assert.equal(getTrackTargetPage({ currentPage: 604, direction: "next", pageCount: 604 }), null);
  assert.equal(getTrackTargetPage({ currentPage: 1, direction: "previous", pageCount: 604 }), null);
});

test("getTrackTargetPage returns the committed target from the current page", () => {
  assert.equal(getTrackTargetPage({ currentPage: 20, direction: "next", pageCount: 604 }), 21);
  assert.equal(getTrackTargetPage({ currentPage: 20, direction: "previous", pageCount: 604 }), 19);
});

test("buildTrackPages returns previous current next slots", () => {
  assert.deepEqual(
    buildTrackPages({ currentPage: 20, pageCount: 604 }),
    { previous: 19, current: 20, next: 21 }
  );
  assert.deepEqual(
    buildTrackPages({ currentPage: 1, pageCount: 604 }),
    { previous: null, current: 1, next: 2 }
  );
  assert.deepEqual(
    buildTrackPages({ currentPage: 604, pageCount: 604 }),
    { previous: 603, current: 604, next: null }
  );
});

test("buildTrackPages keeps the current page centered after a move", () => {
  const afterNext = buildTrackPages({ currentPage: 21, pageCount: 604 });
  const afterPrevious = buildTrackPages({ currentPage: 19, pageCount: 604 });
  assert.deepEqual(afterNext, { previous: 20, current: 21, next: 22 });
  assert.deepEqual(afterPrevious, { previous: 18, current: 19, next: 20 });
});

test("buildTrackPages leaves missing side slots null at boundaries", () => {
  assert.deepEqual(buildTrackPages({ currentPage: 1, pageCount: 604 }), { previous: null, current: 1, next: 2 });
  assert.deepEqual(buildTrackPages({ currentPage: 604, pageCount: 604 }), { previous: 603, current: 604, next: null });
});
