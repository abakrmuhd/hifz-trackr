import test from "node:test";
import assert from "node:assert/strict";

import { describeDetailTarget } from "../src/data/detail-logic.js";

const settings = {
  repetitionThresholds: { weakMax: 9, buildingMax: 19, strongMax: 39 },
  transitionCountThresholds: { weakMax: 9, buildingMax: 19, strongMax: 39 }
};

test("describeDetailTarget builds ayah modal data with companion transition details", () => {
  const detail = describeDetailTarget(
    { kind: "ayah", key: "2:255" },
    {
      settings,
      getRepetitionCount: () => 24,
      getTransitionCount: (key) => key === "1|2:254|2:255" ? 8 : 0,
      labelAyah: (key) => `Surah ${key}`,
      labelTransition: (key) => {
        const [, from, to] = key.split("|");
        return `${from} -> ${to}`;
      },
      isAyahBookmarked: () => true,
      resolveIncomingTransition: () => ({ key: "1|2:254|2:255", path: "2:254 -> 2:255" })
    }
  );

  assert.equal(detail.mode, "ayah");
  assert.equal(detail.title, "Surah 2:255");
  assert.equal(detail.canBookmark, true);
  assert.equal(detail.bookmarked, true);
  assert.equal(detail.headerBookmarkLabel, "Remove ayah bookmark");
  assert.deepEqual(detail.ayah, {
    label: "Repetition count",
    count: 24,
    countLevel: "strong",
    target: 40
  });
  assert.deepEqual(detail.transition, {
    available: true,
    path: "2:254 -> 2:255",
    label: "Transition count",
    count: 8,
    countLevel: "weak",
    target: 10
  });
});

test("describeDetailTarget builds a stable no-incoming-transition fallback for first ayahs", () => {
  const detail = describeDetailTarget(
    { kind: "ayah", key: "1:1" },
    {
      settings,
      getRepetitionCount: () => 3,
      getTransitionCount: () => 0,
      labelAyah: (key) => `Surah ${key}`,
      labelTransition: () => "",
      isAyahBookmarked: () => false,
      resolveIncomingTransition: () => null
    }
  );

  assert.equal(detail.mode, "ayah");
  assert.equal(detail.headerBookmarkLabel, "Bookmark ayah");
  assert.deepEqual(detail.transition, {
    available: false,
    label: "Transition count",
    message: "No incoming transition"
  });
});

test("describeDetailTarget saturates mastered targets at the final milestone", () => {
  const detail = describeDetailTarget(
    { kind: "ayah", key: "2:256" },
    {
      settings,
      getRepetitionCount: () => 41,
      getTransitionCount: () => 0,
      labelAyah: (key) => `Surah ${key}`,
      labelTransition: () => "",
      isAyahBookmarked: () => false,
      resolveIncomingTransition: () => null
    }
  );

  assert.equal(detail.ayah.target, 40);
});

test("describeDetailTarget treats a missing incoming-transition resolver as no incoming transition", () => {
  const detail = describeDetailTarget(
    { kind: "ayah", key: "3:1" },
    {
      settings,
      getRepetitionCount: () => 7,
      getTransitionCount: () => 0,
      labelAyah: (key) => `Surah ${key}`,
      labelTransition: () => "",
      isAyahBookmarked: () => false
    }
  );

  assert.equal(detail.mode, "ayah");
  assert.deepEqual(detail.transition, {
    available: false,
    label: "Transition count",
    message: "No incoming transition"
  });
});

test("describeDetailTarget preserves transition-only detail targets", () => {
  const detail = describeDetailTarget(
    { kind: "transition", key: "10|2:1|2:2" },
    {
      settings,
      getRepetitionCount: () => 0,
      getTransitionCount: () => 3,
      labelAyah: (key) => `Ayah ${key}`,
      labelTransition: () => "2:1 -> 2:2",
      isAyahBookmarked: () => false,
      resolveIncomingTransition: () => null
    }
  );

  assert.equal(detail.mode, "transition");
  assert.equal(detail.title, "2:1 -> 2:2");
  assert.equal(detail.canBookmark, false);
  assert.deepEqual(detail.transitionOnly, {
    label: "Transition count",
    count: 3,
    countLevel: "weak",
    target: 10
  });
});
