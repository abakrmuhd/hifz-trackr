import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRepetitionAriaLabel,
  buildRepetitionRingState
} from "../src/data/reader-halo-logic.js";

const repetitionThresholds = { weakMax: 9, buildingMax: 19, strongMax: 39 };
const transitionCountThresholds = { weakMax: 9, buildingMax: 19, strongMax: 39 };

test("buildRepetitionRingState maps repetition and transition counts into badge and ring classes", () => {
  assert.deepEqual(
    buildRepetitionRingState({
      repetitionCount: 22,
      transitionCount: 12,
      repetitionThresholds,
      transitionCountThresholds
    }),
    {
      repetitionCountLevel: "strong",
      transitionCountLevel: "building",
      hasTransitionRing: true,
      transitionArcDegrees: 216
    }
  );
});

test("buildRepetitionRingState computes transition arc from count over target", () => {
  assert.equal(
    buildRepetitionRingState({
      repetitionCount: 1,
      transitionCount: 5,
      repetitionThresholds,
      transitionCountThresholds
    }).transitionArcDegrees,
    180
  );

  assert.equal(
    buildRepetitionRingState({
      repetitionCount: 1,
      transitionCount: 80,
      repetitionThresholds,
      transitionCountThresholds
    }).transitionArcDegrees,
    360
  );
});

test("buildRepetitionRingState omits the ring when no transition is available", () => {
  assert.deepEqual(
    buildRepetitionRingState({
      repetitionCount: 3,
      transitionCount: null,
      repetitionThresholds,
      transitionCountThresholds
    }),
    {
      repetitionCountLevel: "weak",
      transitionCountLevel: null,
      hasTransitionRing: false,
      transitionArcDegrees: 0
    }
  );
});

test("buildRepetitionAriaLabel appends transition count level only when a transition exists", () => {
  assert.equal(
    buildRepetitionAriaLabel({
      ayahLabel: "Surah 2:5",
      repetitionCountLevel: "strong",
      transitionCountLevel: "building"
    }),
    "Surah 2:5, repetition count strong, transition count building"
  );

  assert.equal(
    buildRepetitionAriaLabel({
      ayahLabel: "Surah 1:1",
      repetitionCountLevel: "weak",
      transitionCountLevel: null
    }),
    "Surah 1:1, repetition count weak"
  );
});
