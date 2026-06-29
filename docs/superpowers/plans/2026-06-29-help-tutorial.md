# Help Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-time pulsing Help button on Home and Reading screens that opens a four-slide tutorial modal, and document the later first-run walkthrough as deferred work.

**Architecture:** Keep the feature inside the existing single-file UI shell in `src/app.js`, reusing the current modal/action/render pattern rather than adding a router or component system. Persist only one new top-level state flag, `helpSeen`, and keep the modal's current slide as ephemeral runtime state. Styling goes in `src/styles.css`, using the existing green progress palette and `prefers-reduced-motion` media block.

**Tech Stack:** Static PWA, vanilla ES modules, IndexedDB/localStorage persistence through `src/data/storage.js`, CSS animations, Node `node:test` regression tests.

---

## File Structure

- Modify `src/app.js`: add `helpSeen` default state, `helpOpen` and `helpSlideIndex` runtime state, Help icon, Help buttons in Home/Reading headers, help modal renderer, carousel actions, and Escape close handling.
- Modify `src/styles.css`: add Help button pulse, tutorial modal/carousel layout, color legend, interaction cards, and reduced-motion behavior.
- Modify `tests/storage.test.js`: add default `helpSeen` and verify stored state can preserve it.
- Modify `tests/reader-feedback.test.js`: add source/CSS regression tests for Help button placement, modal topics, first-time pulse, and reduced-motion pulse handling.
- Create `docs/help-walkthrough-backlog.md`: record the deferred first-run walkthrough scope for later implementation.

---

### Task 1: Persist Help Seen State

**Files:**
- Modify: `src/app.js`
- Modify: `tests/storage.test.js`

- [ ] **Step 1: Write the failing storage test**

Append this test to `tests/storage.test.js`:

```js
test("mergeStoredState preserves the help seen flag when stored", () => {
  const merged = mergeStoredState(defaultState, {
    helpSeen: true
  });

  assert.equal(merged.helpSeen, true);
});
```

Also add `helpSeen: false,` to the `defaultState` object in `tests/storage.test.js` immediately after `practiceEvents: [],`:

```js
  practiceEvents: [],
  helpSeen: false,
  settings: {
```

- [ ] **Step 2: Run the storage test to verify it fails**

Run: `node --test tests/storage.test.js`

Expected: the new test fails before app state includes the default flag, or source-level follow-up tests will fail because `src/app.js` has not defined `helpSeen`.

- [ ] **Step 3: Add the app default state flag**

In `src/app.js`, update `defaultState` by adding `helpSeen: false,` after `practiceEvents: [],`:

```js
  pageBookmarks: [],
  practiceEvents: [],
  helpSeen: false,
  settings: {
```

- [ ] **Step 4: Run the storage test to verify it passes**

Run: `node --test tests/storage.test.js`

Expected: PASS for all storage tests.

- [ ] **Step 5: Commit**

```bash
git add src/app.js tests/storage.test.js
git commit -m "Add help seen state"
```

---

### Task 2: Add Help Button And Modal Behavior

**Files:**
- Modify: `src/app.js`
- Modify: `tests/reader-feedback.test.js`

- [ ] **Step 1: Write failing source regression tests**

Append these tests to `tests/reader-feedback.test.js`:

```js
test("home and reader expose help buttons before settings and reader actions", () => {
  assert.match(appSource, /<div class="top-actions">\s*\$\{renderHelpButton\(\)\}\s*<button class="icon-btn" data-action="settings"/);
  assert.match(appSource, /<div class="top-actions">\s*\$\{renderHelpButton\(\)\}\s*<button class="icon-btn \$\{pageBookmarked/);
});

test("help modal contains the four tutorial topics", () => {
  assert.match(appSource, /const helpSlides = \[/);
  assert.match(appSource, /title:\s*"Progress colors"/);
  assert.match(appSource, /title:\s*"Open a page"/);
  assert.match(appSource, /title:\s*"Track practice"/);
  assert.match(appSource, /title:\s*"Inspect details"/);
  assert.match(appSource, /function renderHelpModal\(\)/);
});

test("opening help marks the first-time guide as seen", () => {
  assert.match(appSource, /async function openHelp\(\)\s*\{[\s\S]*?helpOpen = true;[\s\S]*?state\.helpSeen = true;[\s\S]*?await saveState\(\);/);
});
```

- [ ] **Step 2: Run the focused regression test to verify it fails**

Run: `node --test tests/reader-feedback.test.js`

Expected: FAIL because `renderHelpButton`, `helpSlides`, `renderHelpModal`, and `openHelp` do not exist yet.

- [ ] **Step 3: Add Help runtime state and icon**

In `src/app.js`, add runtime state near the other top-level UI flags:

```js
let settingsOpen = false;
let helpOpen = false;
let helpSlideIndex = 0;
let settingsError = null;
```

Add a Help icon to the `icons` object before `settings`:

```js
  help: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.2 2.2 0 0 1 4.3.8c0 1.8-2.1 2-2.1 3.7"/><path d="M12 17h.01"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M19 14.5a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V21a2 2 0 1 1-4 0v-.4a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1.1H3a2 2 0 1 1 0-4h.4a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1.1-1.7V3a2 2 0 1 1 4 0v.4a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1H21a2 2 0 1 1 0 4h-.4a1.8 1.8 0 0 0-1.6 1Z"/></svg>`,
```

- [ ] **Step 4: Add Help button to Home and Reading headers**

In `renderHome()`, replace the standalone Settings button with a top actions wrapper:

```js
        <div class="top-actions">
          ${renderHelpButton()}
          <button class="icon-btn" data-action="settings" data-dev-mode-trigger aria-label="Settings">${icons.settings}</button>
        </div>
```

In `renderReading()`, place `${renderHelpButton()}` as the first item inside the existing `.top-actions`:

```js
        <div class="top-actions">
          ${renderHelpButton()}
          <button class="icon-btn ${pageBookmarked ? "active" : ""}" data-action="toggle-page-bookmark" aria-label="Toggle page bookmark">${icons.bookmark}</button>
          <button class="icon-btn" data-action="settings" data-dev-mode-trigger aria-label="Settings">${icons.settings}</button>
        </div>
```

- [ ] **Step 5: Add Help slide data and renderers**

Add this block after `renderReading()` and before `renderPageSlot()` in `src/app.js`:

```js
const helpSlides = [
  {
    title: "Progress colors",
    eyebrow: "Color logic",
    body: "Grey means not started. The more you repeat, the greener the ayah marker becomes. Page and juz cells stay honest by following the weakest ayah or transition inside them.",
    visual: "colors"
  },
  {
    title: "Open a page",
    eyebrow: "Navigation",
    body: "Use Progress to pick a juz and page, Surahs to jump by surah, Bookmarks to return to saved places, or search for a page, surah, or juz.",
    visual: "navigation"
  },
  {
    title: "Track practice",
    eyebrow: "Tap rhythm",
    body: "Tap an ayah number once to add a repetition. Double tap the same ayah to count the transition from that ayah into the next one.",
    visual: "tap"
  },
  {
    title: "Inspect details",
    eyebrow: "Long press",
    body: "Long press an ayah marker to open its detail view, where you can inspect counts, decrement mistakes, reset an item, or bookmark the ayah.",
    visual: "details"
  }
];

function renderHelpButton() {
  const pulse = state.helpSeen ? "" : " first-run-pulse";
  return `<button class="icon-btn help-btn${pulse}" data-action="open-help" aria-label="Open help tutorial">${icons.help}</button>`;
}

function renderHelpModal() {
  const slide = helpSlides[helpSlideIndex] || helpSlides[0];
  return `
    <div class="modal-backdrop" data-action="close-help">
      <section class="modal help-modal" role="dialog" aria-modal="true" aria-label="Help tutorial">
        <header class="modal-head">
          <strong>How Hifz Trackr works</strong>
          <button class="icon-btn small" data-action="close-help" aria-label="Close">${icons.close}</button>
        </header>
        <div class="help-slide">
          <div class="help-visual ${slide.visual}" aria-hidden="true">${renderHelpVisual(slide.visual)}</div>
          <p class="section-caption">${slide.eyebrow}</p>
          <h2>${slide.title}</h2>
          <p>${slide.body}</p>
        </div>
        <div class="help-progress" aria-label="Help slide ${helpSlideIndex + 1} of ${helpSlides.length}">
          ${helpSlides.map((_, index) => `<span class="${index === helpSlideIndex ? "active" : ""}"></span>`).join("")}
        </div>
        <div class="help-actions">
          <button class="secondary-btn" data-action="previous-help" ${helpSlideIndex === 0 ? "disabled" : ""}>Previous</button>
          <button class="primary-btn" data-action="${helpSlideIndex === helpSlides.length - 1 ? "close-help" : "next-help"}">${helpSlideIndex === helpSlides.length - 1 ? "Done" : "Next"}</button>
        </div>
      </section>
    </div>
  `;
}
```

Add the visual helper immediately after `renderHelpModal()`:

```js
function renderHelpVisual(type) {
  if (type === "colors") {
    return `<div class="help-color-row"><span class="empty"></span><span class="weak"></span><span class="building"></span><span class="strong"></span><span class="mastered"></span></div>`;
  }
  if (type === "navigation") {
    return `<div class="help-nav-grid"><span>Progress</span><span>Surahs</span><span>Bookmarks</span></div>`;
  }
  if (type === "tap") {
    return `<div class="help-tap-demo"><span>1 tap</span><strong>١٢</strong><span>2 taps</span></div>`;
  }
  return `<div class="help-detail-demo"><strong>Ayah detail</strong><span>Count · Reset · Bookmark</span></div>`;
}
```

- [ ] **Step 6: Render the modal and wire actions**

In `render()`, insert the Help modal after Settings and before Details:

```js
  if (settingsOpen) app.insertAdjacentHTML("beforeend", renderSettings());
  if (helpOpen) app.insertAdjacentHTML("beforeend", renderHelpModal());
  if (detailTarget) app.insertAdjacentHTML("beforeend", renderDetails());
```

Add this function near the other action helpers:

```js
async function openHelp() {
  helpOpen = true;
  helpSlideIndex = 0;
  if (!state.helpSeen) {
    state.helpSeen = true;
    await saveState();
  }
  render();
}
```

In `handleAction()`, add Help action branches after settings actions:

```js
  if (action === "open-help") { await openHelp(); return; }
  if (action === "close-help") helpOpen = false;
  if (action === "next-help") helpSlideIndex = Math.min(helpSlides.length - 1, helpSlideIndex + 1);
  if (action === "previous-help") helpSlideIndex = Math.max(0, helpSlideIndex - 1);
```

- [ ] **Step 7: Add Escape handling**

In `bindGlobalEvents()`, before the Reading-only return, add:

```js
    if (event.key === "Escape") {
      if (helpOpen) {
        helpOpen = false;
        render();
        return;
      }
      if (settingsOpen) {
        settingsOpen = false;
        render();
        return;
      }
      if (detailTarget) {
        detailTarget = null;
        render();
        return;
      }
    }
```

Keep the existing Reading arrow-key behavior after that block:

```js
    if (route.screen !== "reading") return;
    if (event.key === "ArrowLeft") moveTrack("next");
    if (event.key === "ArrowRight") moveTrack("previous");
```

- [ ] **Step 8: Run the focused regression test to verify it passes**

Run: `node --test tests/reader-feedback.test.js`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app.js tests/reader-feedback.test.js
git commit -m "Add help tutorial modal"
```

---

### Task 3: Style Help Tutorial And Pulse

**Files:**
- Modify: `src/styles.css`
- Modify: `tests/reader-feedback.test.js`

- [ ] **Step 1: Write failing CSS regression tests**

Append these tests to `tests/reader-feedback.test.js`:

```js
test("help button pulse and modal styles are defined", () => {
  assert.match(styles, /\.help-btn\.first-run-pulse::after/);
  assert.match(styles, /@keyframes help-pulse/);
  assert.match(styles, /\.help-modal/);
  assert.match(styles, /\.help-slide/);
  assert.match(styles, /\.help-progress/);
});

test("help pulse respects reduced motion", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.help-btn\.first-run-pulse::after[\s\S]*animation:\s*none/);
});
```

- [ ] **Step 2: Run the focused regression test to verify it fails**

Run: `node --test tests/reader-feedback.test.js`

Expected: FAIL because Help CSS has not been added.

- [ ] **Step 3: Add Help button pulse CSS**

In `src/styles.css`, after the `.icon-btn.small` rule, add:

```css
.help-btn {
  position: relative;
}

.help-btn.first-run-pulse::after {
  content: "";
  position: absolute;
  inset: -5px;
  border: 1px solid rgba(171, 218, 26, .65);
  border-radius: inherit;
  animation: help-pulse 1.6s ease-out infinite;
  pointer-events: none;
}

@keyframes help-pulse {
  0% {
    opacity: .85;
    transform: scale(.92);
  }
  70% {
    opacity: 0;
    transform: scale(1.3);
  }
  100% {
    opacity: 0;
    transform: scale(1.3);
  }
}
```

- [ ] **Step 4: Add Help modal carousel CSS**

In `src/styles.css`, after the `.detail-modal` rule, add:

```css
.help-modal {
  width: min(100%, 420px);
}

.help-slide {
  display: grid;
  gap: 12px;
}

.help-slide h2 {
  font-size: 1.35rem;
}

.help-slide p {
  color: var(--muted);
  line-height: 1.48;
}

.help-visual {
  display: grid;
  place-items: center;
  min-height: 132px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background:
    radial-gradient(circle at top left, rgba(171, 218, 26, .14), transparent 48%),
    var(--surface);
}

.help-color-row,
.help-nav-grid,
.help-tap-demo,
.help-detail-demo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.help-color-row span {
  width: 44px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, .12);
}

.help-color-row .empty { background: var(--empty); }
.help-color-row .weak { background: var(--weak); }
.help-color-row .building { background: var(--building); }
.help-color-row .strong { background: var(--strong); }
.help-color-row .mastered { background: var(--mastered); }

.help-nav-grid span,
.help-tap-demo span,
.help-detail-demo span {
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: .86rem;
}

.help-tap-demo strong {
  display: inline-grid;
  place-items: center;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: var(--mastered);
  color: #263500;
  font-family: "QCF2001", serif;
  font-size: 2rem;
}

.help-detail-demo {
  flex-direction: column;
}

.help-detail-demo strong {
  color: var(--text);
}

.help-progress {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-top: 16px;
}

.help-progress span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--line);
}

.help-progress span.active {
  width: 24px;
  background: var(--mastered);
}

.help-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
}
```

- [ ] **Step 5: Add reduced-motion pulse handling**

Inside the existing `@media (prefers-reduced-motion: reduce)` block in `src/styles.css`, add:

```css
  .help-btn.first-run-pulse::after {
    animation: none;
    opacity: .7;
  }
```

- [ ] **Step 6: Run the focused regression test to verify it passes**

Run: `node --test tests/reader-feedback.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css tests/reader-feedback.test.js
git commit -m "Style help tutorial"
```

---

### Task 4: Document Deferred First-Run Walkthrough

**Files:**
- Create: `docs/help-walkthrough-backlog.md`

- [ ] **Step 1: Create the backlog document**

Create `docs/help-walkthrough-backlog.md` with:

```md
# First-Run Walkthrough Backlog

## Purpose

Add a guided first-run walkthrough after the Help button tutorial has shipped and real usage shows where users still get stuck.

## Proposed Scope

- Introduce lightweight coach marks or a modal sequence for the first app launch.
- Reuse the Help tutorial copy where possible instead of creating a separate explanation model.
- Highlight the Help button first so users know where to reopen guidance.
- Keep the walkthrough optional, skippable, and compatible with reduced-motion preferences.

## Constraints

- Do not change RTL mushaf navigation semantics.
- Do not block users from opening pages or tracking practice.
- Do not duplicate the Help carousel state unless a separate first-run completion flag proves necessary.
```

- [ ] **Step 2: Commit**

```bash
git add docs/help-walkthrough-backlog.md
git commit -m "Document first-run walkthrough backlog"
```

---

### Task 5: Full Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS for all `tests/*.test.js`.

- [ ] **Step 2: Run syntax checks**

Run: `npm run check`

Expected: PASS for app modules, service worker, and scripts.

- [ ] **Step 3: Build the static app**

Run: `npm run build`

Expected: PASS and `dist/` regenerated if the build script writes output.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: only intentional tracked changes or generated `dist/` changes remain. Do not stage unrelated pre-existing `tmp/`.

- [ ] **Step 5: Final implementation commit if verification changed generated output**

If `npm run build` changes committed build output, commit it:

```bash
git add dist
git commit -m "Update build output"
```

If no tracked generated files changed, do not create an empty commit.

---

## Self-Review

- Spec coverage: Task 1 implements persisted `helpSeen`; Task 2 implements Help buttons, modal, carousel behavior, and Escape close; Task 3 implements visual styling, pulse, and reduced motion; Task 4 documents the deferred walkthrough; Task 5 verifies the feature.
- Placeholder scan: The plan contains no unspecified placeholders. The backlog document intentionally describes future scope without requiring implementation in this feature.
- Type consistency: Runtime state uses `helpOpen` and `helpSlideIndex`; persisted state uses `state.helpSeen`; action names are `open-help`, `close-help`, `next-help`, and `previous-help` consistently across render and handler steps.
