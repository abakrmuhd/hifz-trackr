import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLowCountItems,
  buildMetadataFromPages,
  getPageRepetitionLevel,
  resolveActiveTarget
} from "../src/data/metadata-logic.js";

const juzRanges = [{ number: 1, startPage: 1, endPage: 2 }];

const samplePages = {
  1: {
    lines: [
      {
        type: "text",
        verseRange: "1:1-1:2",
        words: [
          { location: "1:1:1", word: "Word ١" },
          { location: "1:2:1", word: "Word ٢" }
        ]
      }
    ]
  },
  2: {
    lines: [
      {
        type: "text",
        verseRange: "2:1-2:2",
        words: [
          { location: "2:1:1", word: "Word ١" },
          { location: "2:2:1", word: "Word ٢" }
        ]
      }
    ]
  }
};

test("buildMetadataFromPages maps ayahs and transitions to exact pages", () => {
  const metadata = buildMetadataFromPages(samplePages, juzRanges);

  assert.deepEqual(metadata.pages["1"].ayahKeys, ["1:1", "1:2"]);
  assert.deepEqual(metadata.pages["1"].transitionKeys, ["1|1:1|1:2"]);
  assert.equal(metadata.ayahToPage["2:2"], 2);
});

test("getPageRepetitionLevel only uses ayahs that belong to the requested page", () => {
  const metadata = buildMetadataFromPages(samplePages, juzRanges);
  const thresholds = { weakMax: 9, buildingMax: 19, strongMax: 39 };
  const ayahProgress = {
    "1:1": { repetitionCount: 2 },
    "1:2": { repetitionCount: 3 },
    "2:1": { repetitionCount: 30 },
    "2:2": { repetitionCount: 30 }
  };

  assert.equal(getPageRepetitionLevel(1, metadata, ayahProgress, thresholds), "weak");
  assert.equal(getPageRepetitionLevel(2, metadata, ayahProgress, thresholds), "strong");
});

test("buildLowCountItems resolves ayah page by exact ayahToPage mapping", () => {
  const metadata = buildMetadataFromPages(samplePages, juzRanges);
  const lowCountItems = buildLowCountItems({
    metadata,
    ayahProgress: { "2:2": { repetitionCount: 1 } },
    transitionProgress: {},
    repetitionThresholds: { weakMax: 9, buildingMax: 19, strongMax: 39 },
    transitionCountThresholds: { weakMax: 9, buildingMax: 19, strongMax: 39 },
    labelAyah: (key) => key,
    labelTransition: (key) => key
  });

  assert.equal(lowCountItems[0].page, 2);
  assert.equal(lowCountItems[0].key, "2:2");
});

test("resolveActiveTarget prefers review target and falls back to route target", () => {
  const routeTarget = { kind: "Ayah", key: "2:282" };
  const reviewTarget = { kind: "Transition", key: "48|2:281|2:282" };

  assert.deepEqual(resolveActiveTarget({ review: null, routeTarget }), routeTarget);
  assert.deepEqual(
    resolveActiveTarget({ review: { queue: [reviewTarget], index: 0, done: false }, routeTarget }),
    reviewTarget
  );
});
