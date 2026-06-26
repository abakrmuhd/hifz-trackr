import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQcf4PreviousAyahMap,
  collectQcf4AyahKeys,
  qcf4PagePath
} from "../src/reader/qcf4-logic.js";

const page = {
  page: 1,
  lines: [
    { type: "surah-header", glyphs: [{ glyph: "a" }] },
    {
      type: "text",
      ayahGroups: [
        { key: "1:1", surah: 1, ayah: 1, items: [{ type: "word", glyph: "b" }] },
        { key: "1:2", surah: 1, ayah: 2, items: [{ type: "word", glyph: "c" }] }
      ]
    },
    {
      type: "text",
      ayahGroups: [
        { key: "1:3", surah: 1, ayah: 3, items: [{ type: "word", glyph: "d" }] }
      ]
    }
  ]
};

test("qcf4PagePath pads page numbers", () => {
  assert.equal(qcf4PagePath(1), "/public/mushaf-qcf4/page-001.json");
  assert.equal(qcf4PagePath(596), "/public/mushaf-qcf4/page-596.json");
});

test("collectQcf4AyahKeys returns page-local ayahs in visual order", () => {
  assert.deepEqual(collectQcf4AyahKeys(page), ["1:1", "1:2", "1:3"]);
});

test("buildQcf4PreviousAyahMap maps each ayah to its incoming page-local ayah", () => {
  const map = buildQcf4PreviousAyahMap(page);
  assert.equal(map.get("1:1"), null);
  assert.equal(map.get("1:2"), "1:1");
  assert.equal(map.get("1:3"), "1:2");
});
