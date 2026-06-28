# Home Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compact Home-screen search with ranked mixed page, surah, and juz results, plus Enter-to-open-top-result behavior.

**Architecture:** Extend the pure navigation search helper in `src/data/navigation-logic.js` so it produces ranked UI-ready results and keeps `resolveNavigationTarget(...)` as a thin best-result wrapper. Then wire `src/app.js` to maintain small Home-only search state and render a capped scrollable result list under the existing field, with minimal supporting styles in `src/styles.css`.

**Tech Stack:** Static HTML app, browser ES modules, app-owned JSON metadata, Node built-in test runner, existing Home-screen DOM rendering.

---

### Task 1: Add failing ranked-search tests

**Files:**
- Modify: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\tests\navigation-logic.test.js`
- Test: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\src\data\navigation-logic.js`

- [ ] **Step 1: Write the failing imports and ranked-search assertions**

```js
import {
  normalizeSearchText,
  resolveNavigationTarget,
  searchNavigationTargets
} from "../src/data/navigation-logic.js";

test("searchNavigationTargets returns mixed ranked results with UI labels", () => {
  const results = searchNavigationTargets("baq", metadata, 604);
  assert.deepEqual(results[0], {
    kind: "surah",
    page: 2,
    primaryLabel: "Al-Baqarah",
    secondaryLabel: "Surah 2"
  });
});

test("searchNavigationTargets prefers page results for numeric-only input", () => {
  const results = searchNavigationTargets("36", metadata, 604);
  assert.equal(results[0].kind, "page");
  assert.equal(results[0].page, 36);
});

test("resolveNavigationTarget returns the top ranked result", () => {
  const results = searchNavigationTargets("juz 3", metadata, 604);
  assert.deepEqual(resolveNavigationTarget("juz 3", metadata, 604), {
    page: results[0].page,
    kind: results[0].kind
  });
});
```

- [ ] **Step 2: Run the focused test file to verify it fails**

Run: `npm.cmd test -- tests/navigation-logic.test.js`

Expected: FAIL because `searchNavigationTargets` is not exported yet and the new result shape does not exist.

- [ ] **Step 3: Expand the test data to cover mixed results and exact prefixed queries**

```js
test("searchNavigationTargets returns page, surah, and juz rows for broad input", () => {
  const results = searchNavigationTargets("3", metadata, 604);
  assert.ok(results.some((result) => result.kind === "page" && result.page === 3));
  assert.ok(results.some((result) => result.kind === "juz" && result.page === 42));
});

test("searchNavigationTargets keeps explicit prefixed queries deterministic", () => {
  assert.deepEqual(searchNavigationTargets("page 48", metadata, 604)[0], {
    kind: "page",
    page: 48,
    primaryLabel: "Page 48",
    secondaryLabel: null
  });
  assert.deepEqual(searchNavigationTargets("surah 36", metadata, 604)[0], {
    kind: "surah",
    page: 440,
    primaryLabel: "Ya-Sin",
    secondaryLabel: "Surah 36"
  });
});
```

- [ ] **Step 4: Run the focused test file again and confirm the failures are still the expected ones**

Run: `npm.cmd test -- tests/navigation-logic.test.js`

Expected: FAIL on missing ranked-search implementation rather than syntax errors in the tests.

- [ ] **Step 5: Commit the red tests**

```bash
git add tests/navigation-logic.test.js
git commit -m "Add home search ranking tests"
```

### Task 2: Implement ranked navigation search helpers

**Files:**
- Modify: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\src\data\navigation-logic.js`
- Test: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\tests\navigation-logic.test.js`

- [ ] **Step 1: Add result builders for page, surah, and juz rows**

```js
function buildPageResult(page) {
  return {
    kind: "page",
    page,
    primaryLabel: `Page ${page}`,
    secondaryLabel: null
  };
}

function buildSurahResult(surah) {
  return {
    kind: "surah",
    page: surah.startPage,
    primaryLabel: surah.transliteratedName || surah.englishName || `Surah ${surah.number}`,
    secondaryLabel: `Surah ${surah.number}`
  };
}

function buildJuzResult(juz) {
  return {
    kind: "juz",
    page: juz.startPage,
    primaryLabel: `Juz ${juz.number}`,
    secondaryLabel: `Pages ${juz.startPage}-${juz.endPage}`
  };
}
```

- [ ] **Step 2: Implement `searchNavigationTargets(...)` using one shared ranking pipeline**

```js
export function searchNavigationTargets(value, metadata, pageCount) {
  const text = normalizeSearchText(value);
  if (!text) return [];

  const explicitPage = text.match(/\bpage\s+(\d{1,3})\b/);
  if (explicitPage) {
    const page = Number(explicitPage[1]);
    return page >= 1 && page <= pageCount ? [buildPageResult(page)] : [];
  }

  const explicitJuz = text.match(/\bjuz\s+(\d{1,2})\b/);
  if (explicitJuz) {
    const juz = metadata.juz.find((item) => item.number === Number(explicitJuz[1]));
    return juz ? [buildJuzResult(juz)] : [];
  }

  const explicitSurah = text.match(/\bsurah\s+(\d{1,3})\b/);
  if (explicitSurah) {
    const surah = metadata.surahs.find((item) => item.number === Number(explicitSurah[1]));
    return surah ? [buildSurahResult(surah)] : [];
  }

  const results = [];
  if (/^\d{1,3}$/.test(text)) {
    const page = Number(text);
    if (page >= 1 && page <= pageCount) results.push({ rank: 0, result: buildPageResult(page) });
  }

  for (const surah of metadata.surahs) {
    const score = scoreSurahQuery(text, surah);
    if (score === null) continue;
    results.push({ rank: 10 + score, result: buildSurahResult(surah) });
  }

  for (const juz of metadata.juz) {
    if (`${juz.number}` === text) results.push({ rank: 20, result: buildJuzResult(juz) });
  }

  return results
    .sort((a, b) => a.rank - b.rank || a.result.page - b.result.page)
    .map((item) => item.result)
    .slice(0, 8);
}
```

- [ ] **Step 3: Refactor `resolveNavigationTarget(...)` to delegate to the ranked search**

```js
export function resolveNavigationTarget(value, metadata, pageCount) {
  const result = searchNavigationTargets(value, metadata, pageCount)[0];
  return result ? { page: result.page, kind: result.kind } : null;
}
```

- [ ] **Step 4: Run the focused test file to verify it passes**

Run: `npm.cmd test -- tests/navigation-logic.test.js`

Expected: PASS for the new ranked-search assertions and the existing resolver assertions.

- [ ] **Step 5: Refactor only if needed to keep helpers small and deterministic, then commit**

```bash
git add src/data/navigation-logic.js tests/navigation-logic.test.js
git commit -m "Add ranked home navigation search"
```

### Task 3: Add failing Home search rendering tests

**Files:**
- Modify: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\tests\navigation-logic.test.js`
- Modify: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\src\app.js`

- [ ] **Step 1: Add a small exported pure renderer helper in the test target before implementation**

```js
test("renderHomeSearchResults returns empty markup with no results", async () => {
  const { renderHomeSearchResults } = await import("../src/app.js");
  assert.equal(renderHomeSearchResults([]), "");
});

test("renderHomeSearchResults includes page chips and labels", async () => {
  const { renderHomeSearchResults } = await import("../src/app.js");
  const markup = renderHomeSearchResults([
    { kind: "surah", page: 2, primaryLabel: "Al-Baqarah", secondaryLabel: "Surah 2" }
  ]);
  assert.match(markup, /Page 2/);
  assert.match(markup, /Al-Baqarah/);
});
```

- [ ] **Step 2: Run the focused test file to verify it fails**

Run: `npm.cmd test -- tests/navigation-logic.test.js`

Expected: FAIL because `renderHomeSearchResults` is not exported from `src/app.js`.

- [ ] **Step 3: If importing `src/app.js` directly proves too coupled to browser globals, replace this task with a new pure helper file**

```js
// src/data/home-search-view.js
export function renderHomeSearchResults(results) {
  // pure string builder used by app.js
}
```

Use the same test idea, but target the new helper file instead of `src/app.js`.

- [ ] **Step 4: Re-run the focused test file and confirm the failure is still about missing implementation**

Run: `npm.cmd test -- tests/navigation-logic.test.js`

Expected: FAIL without new syntax or import errors.

- [ ] **Step 5: Commit the red UI-helper tests if a separate pure helper file is introduced**

```bash
git add tests/navigation-logic.test.js
git commit -m "Add home search view tests"
```

### Task 4: Wire Home search state and result rendering

**Files:**
- Modify: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\src\app.js`
- Modify: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\src\styles.css`
- Test: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\tests\navigation-logic.test.js`

- [ ] **Step 1: Add Home-only search state near the other top-level UI state**

```js
let homeSearch = {
  query: "",
  results: []
};
```

- [ ] **Step 2: Render the search results directly under the existing field**

```js
function renderHomeSearchResults(results) {
  if (!results.length) return "";
  return `
    <div class="search-results" role="listbox" aria-label="Navigation results">
      ${results.map((result) => `
        <button class="search-result" data-search-page="${result.page}" role="option">
          <span class="search-result-copy">
            <strong>${escapeHtml(result.primaryLabel)}</strong>
            ${result.secondaryLabel ? `<small>${escapeHtml(result.secondaryLabel)}</small>` : ""}
          </span>
          <span class="search-result-page" aria-label="Page ${result.page}">Page ${result.page}</span>
        </button>
      `).join("")}
    </div>
  `;
}
```

- [ ] **Step 3: Include the helper in `renderHome()`**

```js
      <label class="search-box">
        ${icons.search}
        <input id="jumpInput" type="search" placeholder="Page 48, Al-Baqarah, Juz 3" autocomplete="off" value="${escapeHtml(homeSearch.query)}" />
      </label>
      ${renderHomeSearchResults(homeSearch.results)}
```

- [ ] **Step 4: Update Home search event handling so typing updates results and Enter opens the top row**

```js
  const jump = app.querySelector("#jumpInput");
  if (jump) {
    jump.addEventListener("input", () => {
      homeSearch.query = jump.value;
      homeSearch.results = searchNavigationTargets(homeSearch.query, metadata, PAGE_COUNT);
      render();
    });
    jump.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const target = homeSearch.results[0]?.page || parseJump(jump.value);
      if (target) openPage(target);
    });
  }
```

- [ ] **Step 5: Handle result-row taps in the shared action/click flow**

```js
  const searchPage = Number(el.dataset.searchPage);
  if (searchPage) {
    homeSearch = { query: "", results: [] };
    openPage(searchPage);
    return;
  }
```

- [ ] **Step 6: Add compact list styling with five-row max height**

```css
.search-results {
  display: grid;
  gap: 8px;
  max-height: calc((58px * 5) + (8px * 4));
  margin-top: 0;
  padding: 8px 0 0;
  overflow-y: auto;
}

.search-result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  text-align: left;
}

.search-result-page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--text);
  color: var(--bg);
  font-size: .74rem;
  font-weight: 900;
}
```

- [ ] **Step 7: Run the focused test file to verify the new helper behavior passes**

Run: `npm.cmd test -- tests/navigation-logic.test.js`

Expected: PASS for both the ranked-search logic and the result-markup helper assertions.

- [ ] **Step 8: Reload the local app and manually verify the Home result list**

Run: `npm.cmd run dev`

Expected manual checks:
- Typing `48` shows `Page 48` first.
- Typing `baq` shows `Al-Baqarah`.
- Typing `juz 3` shows `Juz 3`.
- Long result sets scroll instead of stretching past five visible rows.

- [ ] **Step 9: Commit the Home UI wiring**

```bash
git add src/app.js src/styles.css tests/navigation-logic.test.js
git commit -m "Add compact home search results"
```

### Task 5: Full verification and cleanup

**Files:**
- Test: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\tests\navigation-logic.test.js`
- Test: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\src\app.js`
- Test: `C:\Users\user\Documents\Business\Quran Memorization\tap_hifz\src\styles.css`

- [ ] **Step 1: Run the full automated test suite**

Run: `npm.cmd test`

Expected: PASS with the new search tests and no regressions in existing logic tests.

- [ ] **Step 2: Run the project syntax and module checks**

Run: `npm.cmd run check`

Expected: PASS with no new module or syntax errors.

- [ ] **Step 3: Manually verify Home-to-Reading navigation in the browser**

Manual checks:
- `Enter` on a populated query opens the top result.
- Clicking a result opens the expected page.
- Empty search text hides the list.
- Unmatched text hides the list.
- Existing Surahs, Progress, and Bookmarks navigation still work.

- [ ] **Step 4: Remove any temporary helper approach that proved unnecessary and keep the final file boundaries small**

```bash
git status --short
```

Expected: only intentional source, style, and test changes remain.

- [ ] **Step 5: Commit the verified final feature state**

```bash
git add src/data/navigation-logic.js src/app.js src/styles.css tests/navigation-logic.test.js
git commit -m "Implement home search results"
```
