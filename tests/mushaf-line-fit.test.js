import test from "node:test";
import assert from "node:assert/strict";
import { getLineFitClass } from "../src/data/mushaf-line-fit.js";

test("getLineFitClass tightens long low-word-count lines", () => {
  assert.equal(getLineFitClass(10, 115), "fit-52");
  assert.equal(getLineFitClass(9, 111), "fit-52");
  assert.equal(getLineFitClass(9, 87), "fit-52");
  assert.equal(getLineFitClass(11, 83), "fit-52");
  assert.equal(getLineFitClass(6, 78), "fit-58");
  assert.equal(getLineFitClass(9, 73), "fit-58");
  assert.equal(getLineFitClass(10, 70), "fit-64");
  assert.equal(getLineFitClass(6, 68), "fit-64");
});

test("getLineFitClass applies word-count fitting tiers after density checks", () => {
  assert.equal(getLineFitClass(14, 60), "fit-72");
  assert.equal(getLineFitClass(12, 60), "fit-72");
  assert.equal(getLineFitClass(10, 60), "fit-84");
  assert.equal(getLineFitClass(8, 60), "fit-89");
  assert.equal(getLineFitClass(7, 60), "fit-93");
});
