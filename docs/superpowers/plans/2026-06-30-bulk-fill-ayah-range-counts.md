# Bulk Fill Ayah Range Counts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reading-page bulk-fill workflow that lets users open a modal from a green `+` button, prefill an ayah range from the current page, and apply exact or incremental repetition and transition counts over that normalized range.

**Architecture:** The feature is split into a pure data helper plus small UI integration points. The pure helper in `src/data/` owns range normalization and count application, while `src/app.js` owns reading-page defaults, modal state, submit wiring, and persistence. Source-level tests cover UI affordances and pure tests cover range and transition behavior.

**Tech Stack:** Plain ES modules, static PWA app state in `src/app.js`, Node test runner with `assert/strict`, existing metadata JSON and reading-page DOM rendering.

---

## File Structure

- Create: `src/data/bulk-progress.js`
  Responsibility: Pure helper for normalized ayah-range bulk fill in `replace` and `increment` modes.
- Modify: `src/app.js`
  Responsibility: Reading-page `+` button, modal state/defaults, page-local surah/ayah detection, submit flow, save/re-render.
- Modify: `src/styles.css`
  Responsibility: Floating green button placement, non-overlapping layout, modal field styling, and note text.
- Create: `tests/bulk-progress.test.js`
  Responsibility: Pure unit tests for helper range semantics and transition selection.
- Modify: `tests/developer-seed.test.js`
  Responsibility: Source-level assertions for the reading-page `+` button and modal wiring.
- Modify: `package.json`
  Responsibility: Only if `src/data/bulk-progress.js` needs to be added to `npm run check`.

### Task 1: Add the Pure Bulk Range Helper

**Files:**
- Create: `src/data/bulk-progress.js`
- Test: `tests/bulk-progress.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { bulkFillAyahRangeCounts } from "../src/data/bulk-progress.js";

const metadata = {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/bulk-progress.test.js`
Expected: FAIL with `Cannot find module '../src/data/bulk-progress.js'` or `bulkFillAyahRangeCounts is not exported`

- [ ] **Step 3: Write minimal implementation**

```js
function cloneValue(value) {
  return globalThis.structuredClone
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function buildOrderedAyahKeys(metadata) {
  return Object.entries(metadata?.pages || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([, page]) => page.ayahKeys || []);
}

function clampCount(value) {
  return Math.max(0, value);
}

export function bulkFillAyahRangeCounts({
  state,
  metadata,
  startAyahKey,
  endAyahKey,
  repetitionCount,
  transitionCount,
  mode = "replace"
}) {
  const orderedAyahs = buildOrderedAyahKeys(metadata);
  const startIndex = orderedAyahs.indexOf(startAyahKey);
  const endIndex = orderedAyahs.indexOf(endAyahKey);

  if (startIndex < 0 || endIndex < 0) {
    return {
      ...state,
      ayahProgress: { ...(state.ayahProgress || {}) },
      transitionProgress: { ...(state.transitionProgress || {}) }
    };
  }

  const rangeStart = Math.min(startIndex, endIndex);
  const rangeEnd = Math.max(startIndex, endIndex);
  const inRangeKeys = orderedAyahs.slice(rangeStart, rangeEnd + 1);
  const inRangeSet = new Set(inRangeKeys);
  const ayahProgress = cloneValue(state.ayahProgress || {});
  const transitionProgress = cloneValue(state.transitionProgress || {});

  inRangeKeys.forEach((key) => {
    const current = ayahProgress[key]?.repetitionCount || 0;
    const next = mode === "increment"
      ? clampCount(current + repetitionCount)
      : repetitionCount;
    ayahProgress[key] = { repetitionCount: next };
  });

  Object.entries(transitionProgress).forEach(([key, value]) => {
    const [, from, to] = key.split("|");
    if (!inRangeSet.has(from) || !inRangeSet.has(to)) return;
    const current = value?.repetitionCount || 0;
    const next = mode === "increment"
      ? clampCount(current + transitionCount)
      : transitionCount;
    transitionProgress[key] = { repetitionCount: next };
  });

  return {
    ...state,
    ayahProgress,
    transitionProgress
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/bulk-progress.test.js`
Expected: PASS for `replace mode overwrites ayahs and in-range transitions only`

- [ ] **Step 5: Commit**

```bash
git add tests/bulk-progress.test.js src/data/bulk-progress.js
git commit -m "Add bulk ayah range count helper"
```

### Task 2: Cover Increment, Reverse Range, and No-Op Cases

**Files:**
- Modify: `tests/bulk-progress.test.js`
- Modify: `src/data/bulk-progress.js`

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/bulk-progress.test.js`
Expected: FAIL on increment behavior, reverse normalization, or no-op copy semantics

- [ ] **Step 3: Update the helper minimally**

```js
// keep the helper shape from Task 1 and make sure these behaviors exist:
const rangeStart = Math.min(startIndex, endIndex);
const rangeEnd = Math.max(startIndex, endIndex);

if (startIndex < 0 || endIndex < 0) {
  return {
    ...state,
    ayahProgress: { ...(state.ayahProgress || {}) },
    transitionProgress: { ...(state.transitionProgress || {}) }
  };
}

const next = mode === "increment"
  ? clampCount(current + delta)
  : delta;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/bulk-progress.test.js`
Expected: PASS for all helper tests

- [ ] **Step 5: Commit**

```bash
git add tests/bulk-progress.test.js src/data/bulk-progress.js
git commit -m "Cover bulk range increment and normalization"
```

### Task 3: Add Reading-Page Modal State and Defaults

**Files:**
- Modify: `src/app.js`
- Test: `tests/developer-seed.test.js`

- [ ] **Step 1: Write the failing source-level test**

```js
test("reading page exposes a bulk-fill action button and modal wiring", () => {
  assert.match(appSource, /data-action="open-bulk-fill"/);
  assert.match(appSource, /function openBulkFill\(\)/);
  assert.match(appSource, /function buildBulkFillDefaults\(/);
  assert.match(appSource, /data-bulk-fill-modal/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/developer-seed.test.js`
Expected: FAIL because the reading-page button and modal helpers do not exist

- [ ] **Step 3: Add minimal app state and defaults scaffolding**

```js
let bulkFillOpen = false;
let bulkFillForm = null;

function buildBulkFillDefaults(pageData, currentPage) {
  const ayahKeys = visibleAyahKeysForPage(pageData);
  const firstSurah = ayahKeys.map((key) => Number(key.split(":")[0]))[0] || 1;
  const matching = ayahKeys.filter((key) => Number(key.split(":")[0]) === firstSurah);
  const startAyah = Number((matching[0] || `${firstSurah}:1`).split(":")[1]);
  const endAyah = Number((matching[matching.length - 1] || `${firstSurah}:${startAyah}`).split(":")[1]);

  return {
    surahNumber: firstSurah,
    startAyah,
    endAyah,
    repetitionCount: 0,
    transitionCount: 0,
    mode: "replace",
    currentPage
  };
}

function openBulkFill() {
  bulkFillForm = buildBulkFillDefaults(trackPages.current, route.page);
  bulkFillOpen = true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/developer-seed.test.js`
Expected: PASS for the new bulk-fill source-level assertion

- [ ] **Step 5: Commit**

```bash
git add tests/developer-seed.test.js src/app.js
git commit -m "Add bulk fill modal state scaffolding"
```

### Task 4: Render the Green `+` Button and Modal

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `tests/developer-seed.test.js`

- [ ] **Step 1: Write the failing source-level test**

```js
test("reading page renders a bottom-right bulk-fill button without replacing page navigation", () => {
  assert.match(appSource, /class="reader-bulk-fill-btn" data-action="open-bulk-fill"/);
  assert.match(styles, /\.reader-bulk-fill-btn/);
  assert.match(styles, /position:\s*absolute|position:\s*fixed/);
  assert.match(styles, /inset-inline-end/);
  assert.match(styles, /bottom:/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/developer-seed.test.js`
Expected: FAIL because the button and styles are not rendered yet

- [ ] **Step 3: Render the button and modal markup**

```js
${route.screen === "reading" ? `<button class="reader-bulk-fill-btn" data-action="open-bulk-fill" aria-label="Bulk fill counts">+</button>` : ""}

${bulkFillOpen ? `
  <div class="modal-backdrop" data-action="close-bulk-fill">
    <section class="modal settings-modal" data-bulk-fill-modal role="dialog" aria-modal="true" aria-label="Bulk fill counts">
      <header class="modal-head">
        <strong>Bulk Fill Counts</strong>
        <button class="icon-btn small" data-action="close-bulk-fill" aria-label="Close">${icons.close}</button>
      </header>
      <!-- form fields go here in Task 5 -->
    </section>
  </div>
` : ""}
```

```css
.reader-bulk-fill-btn {
  position: fixed;
  inset-inline-end: 1rem;
  bottom: 6.25rem;
  width: 3rem;
  height: 3rem;
  border: 0;
  border-radius: 999px;
  background: #3f9b4b;
  color: #f7f7ef;
  font-size: 1.8rem;
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(16, 24, 40, .22);
  z-index: 30;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/developer-seed.test.js`
Expected: PASS for button and style assertions

- [ ] **Step 5: Commit**

```bash
git add tests/developer-seed.test.js src/app.js src/styles.css
git commit -m "Render reading page bulk fill action button"
```

### Task 5: Add Modal Form Fields and Surah/Range Default Updates

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing source-level test**

```js
test("bulk-fill modal includes surah, ayah range, counts, and mode fields", () => {
  assert.match(appSource, /data-bulk-fill-field="surahNumber"/);
  assert.match(appSource, /data-bulk-fill-field="startAyah"/);
  assert.match(appSource, /data-bulk-fill-field="endAyah"/);
  assert.match(appSource, /data-bulk-fill-field="repetitionCount"/);
  assert.match(appSource, /data-bulk-fill-field="transitionCount"/);
  assert.match(appSource, /data-bulk-fill-field="mode"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/developer-seed.test.js`
Expected: FAIL because the modal fields are still missing

- [ ] **Step 3: Add the form fields and change handlers**

```js
function updateBulkFillField(key, value) {
  if (!bulkFillForm) return;
  bulkFillForm = {
    ...bulkFillForm,
    [key]: ["surahNumber", "startAyah", "endAyah", "repetitionCount", "transitionCount"].includes(key)
      ? Number(value)
      : value
  };
}

function applyBulkFillSurahDefaults(surahNumber) {
  const ayahKeys = visibleAyahKeysForPage(trackPages.current).filter((key) => Number(key.split(":")[0]) === surahNumber);
  if (ayahKeys.length) {
    bulkFillForm = {
      ...bulkFillForm,
      surahNumber,
      startAyah: Number(ayahKeys[0].split(":")[1]),
      endAyah: Number(ayahKeys[ayahKeys.length - 1].split(":")[1])
    };
    return;
  }
}
```

```js
<label class="setting-row">
  <span>Surah</span>
  <input data-bulk-fill-field="surahNumber" type="number" min="1" max="114" value="${bulkFillForm.surahNumber}" />
</label>
<label class="setting-row">
  <span>Start ayah</span>
  <input data-bulk-fill-field="startAyah" type="number" min="1" value="${bulkFillForm.startAyah}" />
</label>
<label class="setting-row">
  <span>End ayah</span>
  <input data-bulk-fill-field="endAyah" type="number" min="1" value="${bulkFillForm.endAyah}" />
</label>
<label class="setting-row">
  <span>Repetition count</span>
  <input data-bulk-fill-field="repetitionCount" type="number" min="0" value="${bulkFillForm.repetitionCount}" />
</label>
<label class="setting-row">
  <span>Transition count</span>
  <input data-bulk-fill-field="transitionCount" type="number" value="${bulkFillForm.transitionCount}" />
</label>
<label class="setting-row">
  <span>Mode</span>
  <select data-bulk-fill-field="mode">
    <option value="replace"${bulkFillForm.mode === "replace" ? " selected" : ""}>Replace</option>
    <option value="increment"${bulkFillForm.mode === "increment" ? " selected" : ""}>Increment</option>
  </select>
</label>
<div class="actions">
  <button class="secondary-btn" data-action="close-bulk-fill">Cancel</button>
  <button class="primary-btn" data-action="submit-bulk-fill">Apply</button>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/developer-seed.test.js`
Expected: PASS for modal field assertions

- [ ] **Step 5: Commit**

```bash
git add tests/developer-seed.test.js src/app.js src/styles.css
git commit -m "Add bulk fill modal fields and defaults"
```

### Task 6: Wire Submit to the Pure Helper and Save Once

**Files:**
- Modify: `src/app.js`
- Modify: `src/data/bulk-progress.js`

- [ ] **Step 1: Write the failing helper integration test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails if needed**

Run: `npm.cmd test -- tests/bulk-progress.test.js`
Expected: FAIL if transition boundary selection is incomplete; otherwise continue

- [ ] **Step 3: Implement submit flow in `src/app.js`**

```js
import { bulkFillAyahRangeCounts } from "./data/bulk-progress.js";

async function submitBulkFill() {
  if (!bulkFillForm) return;
  const startAyahKey = `${bulkFillForm.surahNumber}:${bulkFillForm.startAyah}`;
  const endAyahKey = `${bulkFillForm.surahNumber}:${bulkFillForm.endAyah}`;

  state = bulkFillAyahRangeCounts({
    state,
    metadata,
    startAyahKey,
    endAyahKey,
    repetitionCount: bulkFillForm.repetitionCount,
    transitionCount: bulkFillForm.transitionCount,
    mode: bulkFillForm.mode
  });

  bulkFillOpen = false;
  bulkFillForm = null;
  await saveState();
  render();
}
```

```js
if (action === "open-bulk-fill") openBulkFill();
if (action === "close-bulk-fill") { bulkFillOpen = false; bulkFillForm = null; }
if (action === "submit-bulk-fill") { await submitBulkFill(); return; }
```

- [ ] **Step 4: Run targeted tests to verify it passes**

Run: `npm.cmd test -- tests/bulk-progress.test.js tests/developer-seed.test.js`
Expected: PASS for helper and source-level integration assertions

- [ ] **Step 5: Commit**

```bash
git add tests/bulk-progress.test.js tests/developer-seed.test.js src/data/bulk-progress.js src/app.js
git commit -m "Wire bulk fill modal submit flow"
```

### Task 7: Add Check Script Coverage and Final Verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Write the failing verification expectation**

```json
{
  "scripts": {
    "check": "node --check src/app.js && node --check src/data/bulk-progress.js"
  }
}
```

- [ ] **Step 2: Run syntax check to confirm current gap**

Run: `npm.cmd run check`
Expected: If `src/data/bulk-progress.js` is missing from `check`, it still passes without validating the new file

- [ ] **Step 3: Update `package.json` minimally**

```json
"check": "node --check src/app.js && node --check src/startup-loader.js && node --check src/data/bulk-progress.js && node --check src/data/detail-logic.js && node --check src/data/developer-seed.js && node --check src/data/home-search-view.js && node --check src/data/juz.js && node --check src/data/metadata-logic.js && node --check src/data/mushaf-line-fit.js && node --check src/data/navigation-logic.js && node --check src/data/offline-assets.js && node --check src/data/settings-logic.js && node --check src/data/storage.js && node --check src/reader/qcf4-data.js && node --check src/reader/qcf4-logic.js && node --check src/reader/qcf4-renderer.js && node --check src/reader/swipe-reveal.js && node --check sw.js && node --check scripts/generate-mushaf-metadata.js && node --check scripts/generate-navigation-metadata.js"
```

- [ ] **Step 4: Run full verification**

Run: `npm.cmd test`
Expected: PASS for all tests

Run: `npm.cmd run check`
Expected: PASS with `src/data/bulk-progress.js` included

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "Verify bulk fill range workflow"
```

## Self-Review

- Spec coverage:
  - Reading-page green `+` button: Task 4
  - Non-overlapping placement: Task 4
  - First visible surah default on multi-surah pages: Task 3 and Task 5
  - Visible ayah start/end defaults: Task 3 and Task 5
  - Pure helper with normalized range: Task 1 and Task 2
  - Replace and increment modes: Task 2 and Task 5
  - Submit/save/re-render flow: Task 6
  - Verification coverage: Task 7
- Placeholder scan: no `TODO`, `TBD`, or deferred “appropriate handling” text remains in tasks
- Type consistency:
  - helper name is consistently `bulkFillAyahRangeCounts`
  - modal field names consistently use `surahNumber`, `startAyah`, `endAyah`, `repetitionCount`, `transitionCount`, and `mode`

Plan complete and saved to `docs/superpowers/plans/2026-06-30-bulk-fill-ayah-range-counts.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
