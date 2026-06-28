import test from "node:test";
import assert from "node:assert/strict";

import { limitRecentPages, pushRecentPage } from "../src/data/recent-pages.js";

test("limitRecentPages trims any existing list down to five items", () => {
  const result = limitRecentPages([1, 48, 577, 599, 4, 3]);

  assert.deepEqual(result, [1, 48, 577, 599, 4]);
});

test("pushRecentPage moves the newest page to the front and limits recents to five items", () => {
  const result = pushRecentPage([1, 48, 577, 599, 4], 3);

  assert.deepEqual(result, [3, 1, 48, 577, 599]);
});

test("pushRecentPage removes an existing page before re-adding it to the front", () => {
  const result = pushRecentPage([1, 48, 577, 599, 4], 577);

  assert.deepEqual(result, [577, 1, 48, 599, 4]);
});
