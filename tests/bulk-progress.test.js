import test from "node:test";
import assert from "node:assert/strict";

import { bulkFillAyahRangeCounts } from "../src/data/bulk-progress.js";

const metadata = {
  ayahToPage: {
    "2:1": 1,
    "2:2": 1,
    "2:3": 1,
    "2:4": 2,
    "2:5": 2,
    "3:1": 2,
    "3:2": 3,
    "3:3": 3,
    "3:4": 3
  },
  pages: {
    "1": { ayahKeys: ["2:1", "2:2", "2:3"] },
    "2": { ayahKeys: ["2:4", "2:5", "3:1"] },
    "3": { ayahKeys: ["3:2", "3:3", "3:4"] }
  }
};

const state = {
  ayahProgress: {
    "2:1": { repetitionCount: 1 },
    "2:2": { repetitionCount: 1 },
    "2:3": { repetitionCount: 1 },
    "2:4": { repetitionCount: 1 },
    "2:5": { repetitionCount: 1 },
    "3:1": { repetitionCount: 8 }
  },
  transitionProgress: {
    "1|2:1|2:2": { repetitionCount: 1 },
    "1|2:2|2:3": { repetitionCount: 1 },
    "1|2:3|2:4": { repetitionCount: 1 },
    "2|2:4|2:5": { repetitionCount: 1 },
    "2|2:5|3:1": { repetitionCount: 9 }
  },
  settings: {}
};

test("bulkFillAyahRangeCounts replace mode overwrites ayahs and in-range transitions only", () => {
  const updated = bulkFillAyahRangeCounts({
    state,
    metadata,
    startAyahKey: "2:2",
    endAyahKey: "2:5",
    repetitionCount: 12,
    transitionCount: 6,
    mode: "replace"
  });

  assert.equal(updated.ayahProgress["2:1"].repetitionCount, 1);
  assert.equal(updated.ayahProgress["2:2"].repetitionCount, 12);
  assert.equal(updated.ayahProgress["2:3"].repetitionCount, 12);
  assert.equal(updated.ayahProgress["2:4"].repetitionCount, 12);
  assert.equal(updated.ayahProgress["2:5"].repetitionCount, 12);
  assert.equal(updated.ayahProgress["3:1"].repetitionCount, 8);

  assert.equal(updated.transitionProgress["1|2:1|2:2"].repetitionCount, 1);
  assert.equal(updated.transitionProgress["1|2:2|2:3"].repetitionCount, 6);
  assert.equal(updated.transitionProgress["1|2:3|2:4"].repetitionCount, 6);
  assert.equal(updated.transitionProgress["2|2:4|2:5"].repetitionCount, 6);
  assert.equal(updated.transitionProgress["2|2:5|3:1"].repetitionCount, 9);
});

test("bulkFillAyahRangeCounts increment mode adds to existing counts and clamps at zero", () => {
  const updated = bulkFillAyahRangeCounts({
    state,
    metadata,
    startAyahKey: "2:5",
    endAyahKey: "2:2",
    repetitionCount: 3,
    transitionCount: -5,
    mode: "increment"
  });

  assert.equal(updated.ayahProgress["2:2"].repetitionCount, 4);
  assert.equal(updated.ayahProgress["2:3"].repetitionCount, 4);
  assert.equal(updated.ayahProgress["2:4"].repetitionCount, 4);
  assert.equal(updated.ayahProgress["2:5"].repetitionCount, 4);

  assert.equal(updated.transitionProgress["1|2:2|2:3"].repetitionCount, 0);
  assert.equal(updated.transitionProgress["1|2:3|2:4"].repetitionCount, 0);
  assert.equal(updated.transitionProgress["2|2:4|2:5"].repetitionCount, 0);
});

test("bulkFillAyahRangeCounts returns an equivalent copy when either ayah key is missing", () => {
  const updated = bulkFillAyahRangeCounts({
    state,
    metadata,
    startAyahKey: "9:9",
    endAyahKey: "2:5",
    repetitionCount: 12,
    transitionCount: 6,
    mode: "replace"
  });

  assert.deepEqual(updated, {
    ...state,
    ayahProgress: { ...state.ayahProgress },
    transitionProgress: { ...state.transitionProgress }
  });
  assert.notEqual(updated.ayahProgress, state.ayahProgress);
  assert.notEqual(updated.transitionProgress, state.transitionProgress);
});

test("bulkFillAyahRangeCounts updates only transitions fully inside the selected range", () => {
  const updated = bulkFillAyahRangeCounts({
    state,
    metadata,
    startAyahKey: "2:3",
    endAyahKey: "2:4",
    repetitionCount: 20,
    transitionCount: 11,
    mode: "replace"
  });

  assert.equal(updated.transitionProgress["1|2:3|2:4"].repetitionCount, 11);
  assert.equal(updated.transitionProgress["1|2:2|2:3"].repetitionCount, 1);
  assert.equal(updated.transitionProgress["2|2:4|2:5"].repetitionCount, 1);
});

test("bulkFillAyahRangeCounts creates missing transitions for untouched in-range pairs", () => {
  const updated = bulkFillAyahRangeCounts({
    state: {
      ...state,
      transitionProgress: {}
    },
    metadata,
    startAyahKey: "2:2",
    endAyahKey: "2:4",
    repetitionCount: 7,
    transitionCount: 5,
    mode: "replace"
  });

  assert.equal(updated.transitionProgress["1|2:2|2:3"].repetitionCount, 5);
  assert.equal(updated.transitionProgress["1|2:3|2:4"].repetitionCount, 5);
  assert.equal(updated.transitionProgress["2|2:4|2:5"], undefined);
});
