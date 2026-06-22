# Reading Page Three-Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current two-layer swipe reveal reader with a true three-page track so swipe, arrow keys, and previous/next controls all move the same centered page rail.

**Architecture:** Keep the existing single-page app, but replace the current `currentPageData` plus `revealedPageData` reader model with a track model that owns `previous`, `current`, and `next` page slots. The pure helper module should define track-oriented direction and slot math, while `src/app.js` coordinates loading, drag state, slot recycling, and reader interactivity.

**Tech Stack:** Vanilla JavaScript ES modules, CSS, `node --test`, local static server, in-app browser verification

---

### Task 1: Replace reveal helpers with track helpers

**Files:**
- Modify: `src/reader/swipe-reveal.js`
- Modify: `tests/swipe-reveal.test.js`
- Test: `tests/swipe-reveal.test.js`

- [ ] **Step 1: Replace the helper tests with track-oriented coverage**

Update `tests/swipe-reveal.test.js` to cover the new track helpers:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackPages,
  clampTrackOffset,
  getTrackDirection,
  getTrackTargetPage,
  shouldCommitTrackMove
} from "../src/reader/swipe-reveal.js";

test("getTrackDirection maps right drags to next and left drags to previous", () => {
  assert.equal(getTrackDirection({ dx: 72, dy: 12, startThreshold: 8 }), "next");
  assert.equal(getTrackDirection({ dx: -72, dy: 12, startThreshold: 8 }), "previous");
});

test("getTrackDirection treats equality and vertical drags as non-drags", () => {
  assert.equal(getTrackDirection({ dx: 8, dy: 0, startThreshold: 8 }), null);
  assert.equal(getTrackDirection({ dx: 24, dy: 24, startThreshold: 8 }), null);
  assert.equal(getTrackDirection({ dx: 24, dy: 60, startThreshold: 8 }), null);
});

test("shouldCommitTrackMove uses strict horizontal and vertical thresholds", () => {
  assert.equal(shouldCommitTrackMove({ dx: 61, dy: 30, commitDistance: 60, verticalLimit: 70 }), true);
  assert.equal(shouldCommitTrackMove({ dx: 60, dy: 30, commitDistance: 60, verticalLimit: 70 }), false);
  assert.equal(shouldCommitTrackMove({ dx: 90, dy: 70, commitDistance: 60, verticalLimit: 70 }), false);
});

test("clampTrackOffset damps large drags", () => {
  assert.equal(clampTrackOffset(40, { maxOffset: 120, dragRatio: 0.45 }), 18);
  assert.equal(clampTrackOffset(400, { maxOffset: 120, dragRatio: 0.45 }), 120);
  assert.equal(clampTrackOffset(-400, { maxOffset: 120, dragRatio: 0.45 }), -120);
});

test("getTrackTargetPage honors boundaries", () => {
  assert.equal(getTrackTargetPage({ currentPage: 12, direction: "next", pageCount: 604 }), 13);
  assert.equal(getTrackTargetPage({ currentPage: 12, direction: "previous", pageCount: 604 }), 11);
  assert.equal(getTrackTargetPage({ currentPage: 604, direction: "next", pageCount: 604 }), null);
  assert.equal(getTrackTargetPage({ currentPage: 1, direction: "previous", pageCount: 604 }), null);
});

test("buildTrackPages returns previous current next slots", () => {
  assert.deepEqual(
    buildTrackPages({ currentPage: 20, pageCount: 604 }),
    { previous: 19, current: 20, next: 21 }
  );
  assert.deepEqual(
    buildTrackPages({ currentPage: 1, pageCount: 604 }),
    { previous: null, current: 1, next: 2 }
  );
  assert.deepEqual(
    buildTrackPages({ currentPage: 604, pageCount: 604 }),
    { previous: 603, current: 604, next: null }
  );
});
```

- [ ] **Step 2: Run the focused tests to confirm they fail**

Run: `node --test tests/swipe-reveal.test.js`
Expected: FAIL because `buildTrackPages`, `clampTrackOffset`, `getTrackDirection`, `getTrackTargetPage`, and `shouldCommitTrackMove` do not exist yet

- [ ] **Step 3: Replace the helper implementation**

Update `src/reader/swipe-reveal.js` to export only the track-oriented helpers:

```js
export function getTrackDirection({ dx, dy, startThreshold }) {
  if (Math.abs(dx) <= startThreshold) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx > 0 ? "next" : "previous";
}

export function shouldCommitTrackMove({ dx, dy, commitDistance, verticalLimit }) {
  return Math.abs(dx) > commitDistance && Math.abs(dy) < verticalLimit;
}

export function clampTrackOffset(dx, { maxOffset, dragRatio }) {
  const scaled = dx * dragRatio;
  return Math.max(-maxOffset, Math.min(maxOffset, scaled));
}

export function getTrackTargetPage({ currentPage, direction, pageCount }) {
  if (direction === "next") return currentPage < pageCount ? currentPage + 1 : null;
  if (direction === "previous") return currentPage > 1 ? currentPage - 1 : null;
  return null;
}

export function buildTrackPages({ currentPage, pageCount }) {
  return {
    previous: currentPage > 1 ? currentPage - 1 : null,
    current: currentPage,
    next: currentPage < pageCount ? currentPage + 1 : null
  };
}
```

- [ ] **Step 4: Re-run the focused tests**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS with 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/reader/swipe-reveal.js tests/swipe-reveal.test.js
git commit -m "test: replace reveal helpers with track helpers"
```

### Task 2: Replace the two-layer reader state with a three-page track model

**Files:**
- Modify: `src/app.js`
- Test: `npm.cmd run check`

- [ ] **Step 1: Add a focused reader-track state test**

Append this helper-level test in `tests/swipe-reveal.test.js`:

```js
test("buildTrackPages keeps the current page centered after a move", () => {
  const afterNext = buildTrackPages({ currentPage: 21, pageCount: 604 });
  const afterPrevious = buildTrackPages({ currentPage: 19, pageCount: 604 });
  assert.deepEqual(afterNext, { previous: 20, current: 21, next: 22 });
  assert.deepEqual(afterPrevious, { previous: 18, current: 19, next: 20 });
});
```

- [ ] **Step 2: Run the tests to confirm the suite still passes before refactoring app state**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS

- [ ] **Step 3: Replace the reader globals and loading helpers**

In `src/app.js`, replace the current two-layer globals:

```js
let currentPageData = null;
let revealedPageData = null;
let revealState = {
  direction: null,
  offset: 0,
  dragging: false
};
let prefetchedPages = new Map();
```

with track-oriented state:

```js
let trackPages = {
  previous: null,
  current: null,
  next: null
};
let pageCache = new Map();
let trackState = {
  direction: null,
  dragging: false,
  offset: 0
};
```

Update the helper import block:

```js
import {
  buildTrackPages,
  clampTrackOffset,
  getTrackDirection,
  getTrackTargetPage,
  shouldCommitTrackMove
} from "./reader/swipe-reveal.js";
```

Add a track loader near `fetchPage()`:

```js
async function getPageData(page) {
  if (!page) return null;
  if (pageCache.has(page)) return pageCache.get(page);
  const data = await fetchPage(page);
  pageCache.set(page, data);
  return data;
}

async function loadTrackPages(currentPage) {
  const pages = buildTrackPages({ currentPage, pageCount: PAGE_COUNT });
  const [previous, current, next] = await Promise.all([
    pages.previous ? getPageData(pages.previous).catch(() => null) : Promise.resolve(null),
    getPageData(pages.current),
    pages.next ? getPageData(pages.next).catch(() => null) : Promise.resolve(null)
  ]);
  return {
    numbers: pages,
    data: { previous, current, next }
  };
}
```

Update `init()` and `openPage()` so the center slot becomes the source of truth:

```js
const firstTrack = await loadTrackPages(1);
trackPages = firstTrack.data;
route = { screen: "home", tab: "progress", page: 1, target: null };
```

```js
async function openPage(page, options = {}) {
  route = { screen: "reading", tab: route.tab, page: clampPage(page), target: options.target || null };
  const loaded = await loadTrackPages(route.page);
  trackPages = loaded.data;
  trackState = { direction: null, dragging: false, offset: 0 };
  if (!options.silent) {
    state.recentPages = [route.page, ...state.recentPages.filter((item) => item !== route.page)].slice(0, 20);
    await saveState();
  }
  render();
}
```

- [ ] **Step 4: Re-run syntax and tests**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS

Run: `npm.cmd run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app.js tests/swipe-reveal.test.js src/reader/swipe-reveal.js
git commit -m "refactor: replace reader reveal state with track state"
```

### Task 3: Replace the page shell with a centered three-slot track

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Test: `npm.cmd run check`

- [ ] **Step 1: Add a test that captures boundary slot behavior**

Append to `tests/swipe-reveal.test.js`:

```js
test("buildTrackPages leaves missing side slots null at boundaries", () => {
  assert.deepEqual(buildTrackPages({ currentPage: 1, pageCount: 604 }), { previous: null, current: 1, next: 2 });
  assert.deepEqual(buildTrackPages({ currentPage: 604, pageCount: 604 }), { previous: 603, current: 604, next: null });
});
```

- [ ] **Step 2: Re-run tests to confirm the helper suite still passes**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS

- [ ] **Step 3: Replace reader markup with a three-slot track**

In `src/app.js`, replace the current two-surface `renderReading()` section:

```js
<section class="page-shell ${route.page % 2 ? "odd" : "even"}" aria-label="Mushaf page ${route.page}">
  ${renderPageSurface(revealedPageData, surfaces.revealedPage, null, "revealed-page", true)}
  ${renderPageSurface(page, surfaces.activePage, activeTarget, "active-page")}
</section>
```

with a track viewport:

```js
<section class="page-shell ${route.page % 2 ? "odd" : "even"}" aria-label="Mushaf page ${route.page}">
  <div class="page-track" data-track-direction="${trackState.direction || ""}">
    ${renderPageSlot(trackPages.previous, buildTrackPages({ currentPage: route.page, pageCount: PAGE_COUNT }).previous, "previous", true)}
    ${renderPageSlot(trackPages.current, route.page, "current", false, activeTarget)}
    ${renderPageSlot(trackPages.next, buildTrackPages({ currentPage: route.page, pageCount: PAGE_COUNT }).next, "next", true)}
  </div>
</section>
```

Add a new slot helper:

```js
function renderPageSlot(pageData, pageNumber, slotName, inert = false, activeTarget = null) {
  if (!pageNumber || !pageData) {
    return `<div class="page-slot ${slotName} empty" aria-hidden="true"></div>`;
  }
  const previousAyahMap = buildPreviousAyahMap(pageData);
  const lines = pageData.lines.map((line) => renderLine(line, activeTarget, { inert, pageNumber, previousAyahMap })).join("");
  return `
    <div class="page-slot ${slotName}" ${inert ? 'aria-hidden="true"' : ""}>
      <div class="mushaf" dir="rtl">${lines}</div>
    </div>
  `;
}
```

In `src/styles.css`, replace the two-layer surface styles with track styles:

```css
.page-shell {
  position: relative;
  overflow: hidden;
  margin-top: 8px;
  padding: 18px 15px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  touch-action: pan-y;
}

.page-track {
  display: grid;
  grid-template-columns: 100% 100% 100%;
  width: 300%;
  transform: translateX(calc(-100% + var(--track-offset, 0px)));
  will-change: transform;
}

.page-slot {
  min-width: 0;
}

.page-slot.empty {
  visibility: hidden;
}
```

- [ ] **Step 4: Re-run syntax and tests**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS

Run: `npm.cmd run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app.js src/styles.css tests/swipe-reveal.test.js src/reader/swipe-reveal.js
git commit -m "feat: replace reader surfaces with three-page track"
```

### Task 4: Make swipe, keys, and buttons drive the same rail movement

**Files:**
- Modify: `src/app.js`
- Test: `npm.cmd run check`

- [ ] **Step 1: Add a target-page helper test**

Append to `tests/swipe-reveal.test.js`:

```js
test("getTrackTargetPage returns the committed target from the current page", () => {
  assert.equal(getTrackTargetPage({ currentPage: 20, direction: "next", pageCount: 604 }), 21);
  assert.equal(getTrackTargetPage({ currentPage: 20, direction: "previous", pageCount: 604 }), 19);
});
```

- [ ] **Step 2: Re-run the helper tests**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS

- [ ] **Step 3: Wire drag-follow and shared movement**

In `bindScreenEvents()`, replace the current page-shell pointer handling with track movement:

```js
const pageShell = app.querySelector(".page-shell");
const pageTrack = app.querySelector(".page-track");
if (pageShell && pageTrack) {
  pageShell.addEventListener("pointerdown", (event) => {
    if (pageNavigationInFlight) return;
    swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, dragging: false, offset: 0 };
    trackState = { direction: null, dragging: false, offset: 0 };
    pageShell.setPointerCapture?.(event.pointerId);
  });

  pageShell.addEventListener("pointermove", (event) => {
    if (!swipeStart || pageNavigationInFlight) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    const direction = getTrackDirection({ dx, dy, startThreshold: SWIPE_DRAG_START });
    if (!direction) return;
    const targetPage = getTrackTargetPage({ currentPage: route.page, direction, pageCount: PAGE_COUNT });
    if (!targetPage) return;
    swipeStart.dragging = true;
    swipeStart.offset = clampTrackOffset(dx, { maxOffset: pageShell.clientWidth, dragRatio: 1 });
    trackState = { direction, dragging: true, offset: swipeStart.offset };
    applyTrackState();
    event.preventDefault();
  });

  pageShell.addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = Math.abs(event.clientY - swipeStart.y);
    const didDrag = swipeStart.dragging;
    const dragOffset = swipeStart.offset || 0;
    swipeStart = null;
    pageShell.releasePointerCapture?.(event.pointerId);
    if (didDrag) suppressClickUntil = Date.now() + 350;
    if (trackState.direction && shouldCommitTrackMove({ dx, dy, commitDistance: SWIPE_COMMIT_DISTANCE, verticalLimit: SWIPE_CANCEL_VERTICAL_LIMIT })) {
      moveTrack(trackState.direction, { dragOffset });
      return;
    }
    resetTrackState(true);
  });

  pageShell.addEventListener("pointercancel", () => {
    swipeStart = null;
    resetTrackState(true);
  });
}
```

Replace `navigatePage()` with a shared track mover:

```js
async function moveTrack(direction, options = {}) {
  if (pageNavigationInFlight) return;
  const targetPage = getTrackTargetPage({ currentPage: route.page, direction, pageCount: PAGE_COUNT });
  const pageTrack = app.querySelector(".page-track");
  if (!targetPage) {
    pageTrack?.animate(
      [
        { transform: "translateX(-100%)" },
        { transform: `translateX(calc(-100% + ${direction === "next" ? "12px" : "-12px"}))` },
        { transform: "translateX(-100%)" }
      ],
      { duration: 180 }
    );
    return;
  }

  pageNavigationInFlight = true;
  try {
    const slotShift = direction === "next" ? "0%" : "-200%";
    const dragOffset = Number(options.dragOffset) || 0;
    await pageTrack.animate(
      [
        { transform: `translateX(calc(-100% + ${dragOffset}px))` },
        { transform: `translateX(${slotShift})` }
      ],
      { duration: PAGE_TURN_DURATION, easing: PAGE_TURN_EASING }
    ).finished;

    route = { screen: "reading", tab: route.tab, page: targetPage, target: null };
    const loaded = await loadTrackPages(targetPage);
    trackPages = loaded.data;
    trackState = { direction: null, dragging: false, offset: 0 };
    state.recentPages = [route.page, ...state.recentPages.filter((item) => item !== route.page)].slice(0, 20);
    await saveState();
    render();
  } finally {
    pageNavigationInFlight = false;
  }
}
```

Update the keyboard and button navigation callers:

```js
if (event.key === "ArrowLeft") moveTrack("previous");
if (event.key === "ArrowRight") moveTrack("next");
```

```js
if (action === "previous-page") moveTrack("previous");
if (action === "next-page") moveTrack("next");
```

- [ ] **Step 4: Re-run syntax and tests**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS

Run: `npm.cmd run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app.js tests/swipe-reveal.test.js src/reader/swipe-reveal.js
git commit -m "feat: make reader inputs drive one page track"
```

### Task 5: Restrict interactivity to the center slot and verify the whole flow

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Test: `npm.cmd run check`

- [ ] **Step 1: Ensure side slots stay inert**

In `src/app.js`, keep event binding limited to current-slot buttons only:

```js
app.querySelectorAll(".page-slot.current button.ayah-mark[data-ayah]").forEach((button) => {
  button.addEventListener("click", () => handleAyahTap(button.dataset.ayah));
  bindLongPress(button, () => {
    detailTarget = { kind: "ayah", key: button.dataset.ayah, page: Number(button.dataset.page) };
    render();
  });
});

app.querySelectorAll(".page-slot.current button.transition-mark[data-transition]").forEach((button) => {
  bindLongPress(button, () => {
    detailTarget = { kind: "transition", key: button.dataset.transition, page: Number(button.dataset.page) };
    render();
  });
});
```

In `src/styles.css`, reinforce the current slot as the only interactive surface:

```css
.page-slot.previous,
.page-slot.next {
  pointer-events: none;
}

.page-slot.current {
  pointer-events: auto;
}

.page-track.dragging {
  transition: none;
}

.page-track:not(.dragging) {
  transition: transform 220ms cubic-bezier(.2, .8, .2, 1);
}
```

- [ ] **Step 2: Run syntax and tests**

Run: `node --test tests/swipe-reveal.test.js`
Expected: PASS

Run: `npm.cmd run check`
Expected: PASS

Run: `npm.cmd test`
Expected: PASS for the full repository test suite

- [ ] **Step 3: Verify in the app browser**

Manual flow:

1. Open page 1 in the reader and confirm only the current page is visible at rest.
2. Drag right slowly and confirm the track follows the finger and the next page enters from the right.
3. Drag left slowly and confirm the track follows the finger and the previous page enters from the left.
4. Release before threshold in both directions and confirm the track snaps back centered.
5. Commit a right swipe and confirm the new page recenters as the current slot.
6. Commit a left swipe and confirm the new page recenters as the current slot.
7. Use arrow keys in both directions and confirm the same track animation runs.
8. Use previous/next controls and confirm the same track animation runs.
9. At page 1 and page 604, confirm invalid-side movement resists rather than breaking.
10. Tap ayahs only on the center page and confirm side slots remain inert.
11. Check console errors and warnings.

Expected:

- only one page visible at rest
- no stuck transforms or dragging classes
- no duplicate navigation requests
- no console `error` entries and no relevant app warnings

- [ ] **Step 4: Commit**

```bash
git add src/app.js src/styles.css tests/swipe-reveal.test.js src/reader/swipe-reveal.js
git commit -m "feat: finish reader three-track carousel"
```
