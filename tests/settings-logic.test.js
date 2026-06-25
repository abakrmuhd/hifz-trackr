import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTripleActivationState,
  getCountIncreaseSoundConfig,
  applyDeveloperThresholdMode,
  normalizeThresholdProfile,
  updateNumericSetting,
  updateThresholdProfile
} from "../src/data/settings-logic.js";

const defaults = { weakMax: 9, buildingMax: 19, strongMax: 39 };

test("updateThresholdProfile accepts increasing integer threshold values", () => {
  const result = updateThresholdProfile(defaults, "buildingMax", "24");

  assert.deepEqual(result, {
    profile: { weakMax: 9, buildingMax: 24, strongMax: 39 },
    error: null
  });
});

test("updateThresholdProfile rejects overlapping threshold ranges", () => {
  const result = updateThresholdProfile(defaults, "weakMax", "20");

  assert.deepEqual(result, {
    profile: defaults,
    error: "Thresholds must increase from Weak to Building to Strong."
  });
});

test("normalizeThresholdProfile falls back when stored thresholds are impossible", () => {
  assert.deepEqual(
    normalizeThresholdProfile({ weakMax: 10, buildingMax: 5, strongMax: 3 }, defaults),
    defaults
  );
});

test("normalizeThresholdProfile falls back when weak range is missing", () => {
  assert.deepEqual(
    normalizeThresholdProfile({ weakMax: 0, buildingMax: 10, strongMax: 20 }, defaults),
    defaults
  );
});

test("buildTripleActivationState activates on three clicks within the window", () => {
  let state = buildTripleActivationState(null, 1000, 250);
  state = buildTripleActivationState(state, 1200, 250);
  state = buildTripleActivationState(state, 1400, 250);

  assert.equal(state.activated, true);
  assert.equal(state.count, 0);
});

test("buildTripleActivationState resets when clicks are too far apart", () => {
  let state = buildTripleActivationState(null, 1000, 250);
  state = buildTripleActivationState(state, 1301, 250);
  state = buildTripleActivationState(state, 1500, 250);

  assert.equal(state.activated, false);
  assert.equal(state.count, 2);
});

test("applyDeveloperThresholdMode toggles developer thresholds and restores defaults", () => {
  const state = {
    settings: {
      developerMode: false,
      repetitionThresholds: { ...defaults },
      transitionCountThresholds: { ...defaults }
    }
  };

  const enabled = applyDeveloperThresholdMode(state, defaults);
  assert.equal(enabled.settings.developerMode, true);
  assert.deepEqual(enabled.settings.repetitionThresholds, { weakMax: 1, buildingMax: 2, strongMax: 3 });
  assert.deepEqual(enabled.settings.transitionCountThresholds, { weakMax: 1, buildingMax: 2, strongMax: 3 });

  const disabled = applyDeveloperThresholdMode(enabled, defaults);
  assert.equal(disabled.settings.developerMode, false);
  assert.deepEqual(disabled.settings.repetitionThresholds, defaults);
  assert.deepEqual(disabled.settings.transitionCountThresholds, defaults);
});

test("updateNumericSetting accepts valid stepped values", () => {
  assert.deepEqual(
    updateNumericSetting(250, "275", { min: 150, max: 600, step: 25, label: "Double tap window" }),
    { value: 275, error: null }
  );
});

test("updateNumericSetting rejects invalid and out-of-range values", () => {
  assert.deepEqual(
    updateNumericSetting(250, "", { min: 150, max: 600, step: 25, label: "Double tap window" }),
    { value: 250, error: "Double tap window must be a number between 150 and 600." }
  );
  assert.deepEqual(
    updateNumericSetting(12, "31", { min: 4, max: 30, step: 1, label: "Review queue size" }),
    { value: 12, error: "Review queue size must be a number between 4 and 30." }
  );
  assert.deepEqual(
    updateNumericSetting(250, "260", { min: 150, max: 600, step: 25, label: "Double tap window" }),
    { value: 250, error: "Double tap window must use increments of 25." }
  );
});

test("getCountIncreaseSoundConfig returns only the selected gentle chime when sound is enabled", () => {
  assert.equal(getCountIncreaseSoundConfig({ sound: false }), null);
  assert.deepEqual(getCountIncreaseSoundConfig({ sound: true }), {
    duration: 0.11,
    frequency: 830,
    gain: 0.045,
    secondFrequency: 1245,
    wave: "sine"
  });
});
