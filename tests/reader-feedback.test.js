import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("ayah pulse starts at its peak and settles back to normal", () => {
  assert.match(styles, /0%\s*\{\s*transform:\s*scale\(1\.22\);\s*\}/);
  assert.match(styles, /100%\s*\{\s*transform:\s*scale\(1\);\s*\}/);
});

test("mutation feedback spawns a floating repetition count", () => {
  assert.match(appSource, /spawnRepetitionCountPop\(marker,\s*count,\s*app\)/);
  assert.match(styles, /\.repetition-count-pop/);
});

test("reader undo is persistent in the header and keeps a ten event stack", () => {
  assert.match(appSource, /const UNDO_HISTORY_LIMIT = 10/);
  assert.match(appSource, /<button class="icon-btn undo-btn" data-action="undo" aria-label="Undo last count" \$\{undoDisabled\}>\$\{icons\.undo\}<\/button>\s*<button class="icon-btn reader-bulk-fill-btn"/);
  assert.match(appSource, /const undoDisabled = hasUndoHistory\(\) \? "" : "disabled"/);
  assert.match(appSource, /function limitUndoEvents\(events = \[\]\)\s*\{[\s\S]*\.slice\(-UNDO_HISTORY_LIMIT\)/);
  assert.match(appSource, /state\.practiceEvents = limitUndoEvents\(\[\.\.\.state\.practiceEvents, event\]\)/);
  assert.match(appSource, /state\.practiceEvents = undoStack\.slice\(0, -1\)/);
  assert.match(appSource, /spawnRepetitionCountPop\(marker,\s*-last\.delta,\s*app,\s*\{ direction:\s*"down" \}\)/);
  assert.match(appSource, /undo:\s*`<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"\/><path d="M20 20v-5\.8c0-3\.15-2\.55-5\.7-5\.7-5\.7H4"\/><\/svg>`/);
  assert.doesNotMatch(styles, /\.undo-btn\s*\{/);
  assert.match(styles, /\.icon-btn:disabled\s*\{[\s\S]*opacity:\s*\.42/);
  assert.doesNotMatch(appSource, /undoVisible/);
  assert.doesNotMatch(styles, /\.floating-undo/);
});

test("settings icon keeps the old gear outline with mirrored closing curve", () => {
  assert.match(appSource, /settings:\s*`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3\.5"\/><path d="M19 14\.5[\s\S]*h-\.4a1\.8 1\.8 0 0 0-1\.7 1\.1Z"\/><\/svg>`/);
  assert.match(appSource, /V21a2 2 0 1 1-4 0v-\.4/);
  assert.match(appSource, /H3a2 2 0 1 1 0-4h\.4/);
  assert.match(appSource, /H21a2 2 0 1 1 0 4h-\.4/);
  assert.doesNotMatch(appSource, /settings:[\s\S]*M12 2\.8v3M12 18\.2v3/);
});

test("ayah marker tap feedback is driven by the committed mutation", () => {
  assert.match(appSource, /button\.addEventListener\("pointerup",\s*\(event\) => \{[\s\S]*?handleAyahTap\(button\.dataset\.ayah,\s*button\)/);
  assert.doesNotMatch(appSource, /function handleAyahTap\(key,\s*marker = null\)\s*\{\s*if \(marker\) playAyahTapFeedback\(marker\)/);
  assert.match(appSource, /function playAyahTapFeedback\(marker\)/);
  assert.match(appSource, /marker\.animate\(/);
});

test("count increase sound is prepared during the tap gesture before delayed commit", () => {
  assert.match(appSource, /function handleAyahTap\(key,\s*marker = null\)\s*\{[\s\S]*?prepareCountIncreaseSound\(\);[\s\S]*?setTimeout\(\(\) => \{/);
  assert.match(appSource, /let countIncreaseAudioContext = null/);
  assert.doesNotMatch(appSource, /context\.close\(\)/);
});

test("page shell pointerup routes non-drag ayah taps to feedback", () => {
  assert.match(appSource, /resolveAyahMarkerAtPoint\(event\.clientX,\s*event\.clientY\)/);
  assert.match(appSource, /lastPointerAyahTap/);
  assert.match(appSource, /handleAyahTap\(ayahMarker\.dataset\.ayah,\s*ayahMarker\)/);
  assert.match(appSource, /if \(event\.target\.closest\?\.\("\.ayah-marker\[data-ayah\], button\.ayah-mark\[data-ayah\]"\)\) \{/);
});

test("ayah count tracking ignores non-primary pointer buttons", () => {
  assert.match(appSource, /button\.addEventListener\("pointerup",\s*\(event\) => \{[\s\S]*?if \(event\.button !== 0\) return;[\s\S]*?handleAyahTap\(button\.dataset\.ayah,\s*button\)/);
  assert.match(appSource, /pageShell\.addEventListener\("pointerdown",\s*\(event\) => \{[\s\S]*?if \(event\.button !== 0\) return;[\s\S]*?swipeStart = \{/);
});

test("swiping from an ayah marker does not count as a marker tap", () => {
  const markerBinding = appSource.match(/app\.querySelectorAll\("\.page-slot\.current \.ayah-marker\[data-ayah\], \.page-slot\.current button\.ayah-mark\[data-ayah\]"\)\.forEach\(\(button\) => \{[\s\S]*?\n  \}\);/)?.[0] || "";
  assert.match(markerBinding, /let markerTapStart = null/);
  assert.match(markerBinding, /markerTapStart = \{ x: event\.clientX, y: event\.clientY, pointerId: event\.pointerId \}/);
  assert.match(markerBinding, /Math\.abs\(event\.clientX - markerTapStart\.x\) > SWIPE_DRAG_START/);
  assert.match(markerBinding, /Math\.abs\(event\.clientY - markerTapStart\.y\) > SWIPE_DRAG_START/);
  assert.match(markerBinding, /markerTapStart = null;[\s\S]*if \(moved\) return;[\s\S]*clearPageGestureForMarkerTap\(event\.pointerId\);[\s\S]*handleAyahTap\(button\.dataset\.ayah,\s*button\)/);
  assert.match(markerBinding, /button\.addEventListener\("pointercancel",\s*\(\) => \{[\s\S]*markerTapStart = null/);
  const markerPointerDown = markerBinding.match(/button\.addEventListener\("pointerdown",\s*\(event\) => \{[\s\S]*?\n    \}\);/)?.[0] || "";
  assert.doesNotMatch(markerPointerDown, /event\.stopPropagation\(\)/);
  assert.match(appSource, /function clearPageGestureForMarkerTap\(pointerId\)\s*\{[\s\S]*if \(swipeStart\?\.pointerId !== pointerId\) return;[\s\S]*swipeStart = null;[\s\S]*resetTrackState\(false\);/);
});

test("long press detail modal cancels active page swipe gesture", () => {
  assert.match(appSource, /function cancelPageGesture\(\)/);
  assert.match(appSource, /bindLongPress\(button,\s*\(\) => openAyahDetail\(button\)\)/);
  assert.match(appSource, /function openAyahDetail\(button\)\s*\{[\s\S]*?clearPendingTap\(\);[\s\S]*?cancelPageGesture\(\);[\s\S]*?detailTarget = \{ kind: "ayah"/);
  assert.match(appSource, /button\.dataset\.ayah \|\| button\.dataset\.ayahDetail/);
});

test("single tap ayah text highlights text without incrementing counts", () => {
  const ayahTextBinding = appSource.match(/app\.querySelectorAll\("\.page-slot\.current \.ayah-group\[data-ayah-detail\]"\)\.forEach\(\(group\) => \{[\s\S]*?\n  \}\);/)?.[0] || "";
  assert.match(appSource, /function buildQcf4AyahGroupAttrs\(key,\s*\{ pageNumber \}\)\s*\{[\s\S]*data-ayah-detail=/);
  assert.match(appSource, /buildAyahAttrs:\s*\(key\) => buildQcf4AyahGroupAttrs\(key,\s*\{ pageNumber \}\)/);
  assert.match(appSource, /function selectAyahText\(key\)\s*\{[\s\S]*selectedAyahTextKey = key;[\s\S]*render\(\);/);
  assert.match(appSource, /selectedAyahTextKey === key \? "selected-ayah-text" : ""/);
  assert.match(appSource, /selectedAyahTextKey = null;[\s\S]*loadTrackPages\(route\.page\)/);
  assert.match(appSource, /selectedAyahTextKey = null;[\s\S]*rememberCurrentRoute\(\)/);
  assert.match(ayahTextBinding, /group\.addEventListener\("pointerup",\s*\(event\) => \{[\s\S]*setTimeout\(\(\) => selectAyahText\(group\.dataset\.ayahDetail\),\s*0\)/);
  assert.doesNotMatch(ayahTextBinding, /event\.stopPropagation\(\)/);
  assert.match(ayahTextBinding, /bindLongPress\(group,\s*\(\) => openAyahDetail\(group\)\)/);
  assert.doesNotMatch(ayahTextBinding, /handleAyahTap/);
  assert.match(styles, /\.ayah-chars\s+\.ayah-group\.selected-ayah-text\s*\{[\s\S]*calc\(var\(--qcf-line-height\) \* \.75\)/);
  assert.match(styles, /\.ayah-chars\s+\.ayah-group\.bookmarked-ayah\.selected-ayah-text\s*\{/);
  assert.match(styles, /\.ayah-chars\s+\.ayah-group\s*\{[\s\S]*-webkit-tap-highlight-color:\s*transparent/);
});

test("same-page reader renders preserve the current scroll position", () => {
  assert.match(appSource, /function getRenderedReaderPage\(\)\s*\{[\s\S]*querySelector\("\.page-shell"\)\?\.getAttribute\("aria-label"\)/);
  assert.match(appSource, /const readerScrollTop = route\.screen === "reading" && renderedPage === route\.page[\s\S]*app\.querySelector\("\.page-slot\.current"\)\?\.scrollTop/);
  assert.match(appSource, /function restoreReaderScroll\(scrollTop\)\s*\{[\s\S]*slot\.scrollTop = Math\.min\(scrollTop,\s*slot\.scrollHeight - slot\.clientHeight\)/);
  assert.match(appSource, /restoreReaderScroll\(readerScrollTop\);[\s\S]*bindScreenEvents\(\)/);
});

test("detail modal exposes increment buttons beside repetition and transition decrements", () => {
  assert.match(appSource, /data-action="decrement-detail"[\s\S]*aria-label="Decrease transition count">-<\/button>[\s\S]*data-action="increment-detail"[\s\S]*aria-label="Increase transition count">\+<\/button>/);
  assert.match(appSource, /data-action="decrement-transition-detail"[\s\S]*aria-label="Decrease transition count">-<\/button>[\s\S]*data-action="increment-transition-detail"[\s\S]*aria-label="Increase transition count">\+<\/button>/);
  assert.match(appSource, /data-action="decrement-repetition-detail"[\s\S]*aria-label="Decrease repetition count">-<\/button>[\s\S]*data-action="increment-repetition-detail"[\s\S]*aria-label="Increase repetition count">\+<\/button>/);
});

test("quick ayah taps cancel long press even after page shell captures the pointer", () => {
  assert.match(appSource, /if \(event\.cancelable\) event\.preventDefault\(\)/);
  assert.match(appSource, /document\.addEventListener\("pointermove",\s*clearMovedPointer,\s*true\)/);
  assert.match(appSource, /Math\.abs\(nextEvent\.clientX - startX\) > SWIPE_DRAG_START/);
  assert.match(appSource, /function bindLongPress\(el,\s*callback\)\s*\{[\s\S]*?document\.addEventListener\("pointerup",\s*clearMatchingPointer,\s*true\)/);
  assert.match(appSource, /function bindLongPress\(el,\s*callback\)\s*\{[\s\S]*?if \(nextEvent\.pointerId === pointerId\) clear\(\);/);
  assert.match(appSource, /function bindLongPress\(el,\s*callback\)\s*\{[\s\S]*?document\.removeEventListener\("pointerup",\s*clearMatchingPointer,\s*true\)/);
  assert.match(appSource, /el\.addEventListener\("contextmenu",\s*\(event\) => \{[\s\S]*event\.preventDefault\(\)/);
  assert.match(appSource, /clearTextSelection\(\);[\s\S]*callback\(\);[\s\S]*clearTextSelection\(\)/);
  assert.match(styles, /\.detail-modal\s*\{[\s\S]*user-select:\s*none[\s\S]*-webkit-user-select:\s*none/);
});

test("mobile marker taps suppress native text selection rectangles", () => {
  assert.match(styles, /\.ayah-mark\s*\{[\s\S]*-webkit-user-select:\s*none[\s\S]*-webkit-tap-highlight-color:\s*transparent[\s\S]*-webkit-touch-callout:\s*none/);
  assert.match(styles, /\.ayah-chars\s+\.ayah-marker\.ayah-mark\s*\{[\s\S]*-webkit-tap-highlight-color:\s*transparent[\s\S]*-webkit-touch-callout:\s*none/);
  assert.match(appSource, /button\.addEventListener\("pointerdown",\s*\(event\) => \{[\s\S]*event\.preventDefault\(\);/);
});

test("right click ayah number opens the same detail modal as long press", () => {
  assert.match(appSource, /button\.addEventListener\("contextmenu",\s*\(event\) => \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?openAyahDetail\(button\);[\s\S]*?\}\)/);
});

test("desktop text selection bypasses page swipe startup", () => {
  assert.match(appSource, /shouldStartTrackGesture/);
  assert.match(appSource, /pointerType:\s*event\.pointerType/);
  assert.match(appSource, /startedOnSelectableText:\s*Boolean\(event\.target\.closest\?\.\("\.mushaf-line"\)\)/);
  assert.doesNotMatch(appSource, /startedOnSelectableText:\s*Boolean\(event\.target\.closest\?\.\("\.mushaf-line, \.ayah-group\[data-ayah-detail\]"\)\)/);
});

test("horizontal reader swipes arm after the drag axis locks", () => {
  assert.match(appSource, /pageShell\.classList\.add\("swipe-armed"\)/);
  assert.match(appSource, /resolveGestureAxis\(\{\s*dx,\s*dy,\s*startThreshold:\s*SWIPE_DRAG_START\s*\}\)/);
  assert.match(appSource, /if \(swipeStart\.axis === "horizontal"\) \{[\s\S]*pageShell\.setPointerCapture\?\.\(event\.pointerId\)/);
  assert.match(appSource, /pageShell\.classList\.remove\("swipe-armed"\)/);
  assert.match(styles, /\.page-shell\.swipe-armed\s+\.mushaf-line[\s\S]*user-select:\s*none/);
});

test("vertical reader drags scroll the current page instead of turning pages", () => {
  assert.match(appSource, /if \(swipeStart\.axis === "vertical"\) \{/);
  assert.match(appSource, /currentSlot\.scrollTop = swipeStart\.scrollTop - dy/);
  assert.doesNotMatch(appSource, /currentSlot && swipeStart\.pointerType === "mouse"/);
  assert.match(appSource, /axis === "horizontal" && trackState\.direction && shouldCommitTrackMove/);
  assert.match(styles, /\.page-slot\.current\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(styles, /\.page-slot\.current\s*\{[\s\S]*overscroll-behavior:\s*contain/);
  assert.match(styles, /\.page-slot\.current\s*\{[\s\S]*touch-action:\s*pan-y/);
  assert.match(styles, /\.page-slot\.current::-webkit-scrollbar\s*\{[\s\S]*display:\s*none/);
});

test("ayah feedback animations stay visible in the app preview", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.pulse[\s\S]*animation-duration:\s*\.42s\s*!important/);
  assert.match(styles, /\.repetition-count-pop\.increase\s*\{[\s\S]*animation:\s*repetition-count-pop 2\.36s/);
  assert.match(styles, /\.repetition-count-pop\.decrease\s*\{[\s\S]*background:\s*#ffd24c[\s\S]*animation:\s*repetition-count-pop-down 2\.36s/);
  assert.match(styles, /@keyframes repetition-count-pop[\s\S]*7\.6%,\s*50%\s*\{[\s\S]*opacity:\s*1;[\s\S]*translate\(-50%,\s*-78%\) scale\(1\)/);
  assert.match(styles, /@keyframes repetition-count-pop-down[\s\S]*7\.6%,\s*50%\s*\{[\s\S]*opacity:\s*1;[\s\S]*translate\(-50%,\s*-22%\) scale\(1\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.repetition-count-pop[\s\S]*animation-duration:\s*2\.36s\s*!important/);
});

test("ayah pulse can replay on repeated taps", () => {
  assert.match(appSource, /restartAyahPulse\(marker\)/);
  assert.match(appSource, /playAyahTapFeedback\(marker\)/);
});

test("ayah feedback pop is positioned in an app overlay outside the marker", () => {
  assert.match(appSource, /getBoundingClientRect\(\)/);
  assert.match(appSource, /container\.append\(pop\)/);
  assert.match(styles, /\.repetition-count-pop[\s\S]*position:\s*fixed/);
});

test("ayah feedback pop centers on the visual ayah glyph", () => {
  assert.match(appSource, /const rect = getAyahMarkerVisualRect\(marker\)/);
  assert.match(appSource, /function getAyahMarkerVisualRect\(marker\)\s*\{[\s\S]*marker\.querySelector\?\.\("\.ayah-mark-glyph"\)\?\.getBoundingClientRect\?\.\(\)/);
});

test("page navigation click binding excludes ayah marker buttons", () => {
  assert.match(appSource, /querySelectorAll\("\[data-page\]:not\(\[data-ayah\]\)"/);
});

test("reader omits bottom previous and next page buttons", () => {
  assert.match(appSource, /previousPage:\s*`<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"\/><\/svg>`/);
  assert.match(appSource, /nextPage:\s*`<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"\/><\/svg>`/);
  assert.doesNotMatch(appSource, /class="reader-bottom-nav"/);
  assert.doesNotMatch(appSource, /class="reader-bottom-btn/);
  assert.doesNotMatch(appSource, /aria-label="Previous page"/);
  assert.doesNotMatch(appSource, /aria-label="Next page"/);
  assert.doesNotMatch(appSource, />Previous page<\/button>/);
  assert.doesNotMatch(appSource, />Next page<\/button>/);
  assert.doesNotMatch(styles, /\.reader-bottom-nav/);
  assert.doesNotMatch(styles, /\.reader-bottom-btn/);
});

test("reader moves page metadata into side-line-safe page chrome", () => {
  assert.match(appSource, /function renderPageChrome\(page\)/);
  assert.match(appSource, /function renderPageTopChrome\(page\)/);
  assert.match(appSource, /function renderPageBottomChrome\(page\)/);
  assert.match(appSource, /renderPageTopChrome\(pageNumber\)[\s\S]*renderQcf4Page\([\s\S]*renderPageBottomChrome\(pageNumber\)/);
  assert.match(appSource, /renderPageTopChrome\(pageNumber\)[\s\S]*<div class="mushaf" dir="rtl">\$\{lines\}<\/div>[\s\S]*renderPageBottomChrome\(pageNumber\)/);
  assert.doesNotMatch(appSource, /renderPageChrome\(pageNumber\)/);
  assert.doesNotMatch(appSource, /renderPageChrome\(route\.page\)/);
  assert.match(appSource, /class="page-chrome page-top-meta"/);
  assert.match(appSource, /class="page-meta-surah"/);
  assert.match(appSource, /class="page-meta-range"/);
  assert.match(appSource, /class="page-meta-juz"/);
  assert.match(appSource, /class="page-chrome page-bottom-meta" aria-hidden="true">\$\{page\}<\/div>/);
  assert.doesNotMatch(appSource, /page-bottom-wrap/);
  assert.doesNotMatch(styles, /\.page-bottom-wrap/);
  assert.match(appSource, /formatPageAyahRange\(pageData\.ayahKeys\)/);
  assert.match(appSource, /getPagePrimarySurahName\(pageData\)/);
  assert.doesNotMatch(appSource, /`Page \$\{route\.page\} · \$\{metadata\.pages\[String\(route\.page\)\]\?\.label \|\| ""\}`/);
  const pageChromeRule = styles.match(/\.page-chrome\s*\{[^}]*\}/)?.[0] || "";
  assert.match(pageChromeRule, /pointer-events:\s*none/);
  assert.match(pageChromeRule, /padding-inline:\s*var\(--page-chrome-left\)\s*var\(--page-chrome-right\)/);
  assert.doesNotMatch(pageChromeRule, /position:\s*absolute/);
  assert.match(styles, /\.page-slot\s*\{[\s\S]*box-sizing:\s*border-box/);
  assert.match(styles, /\.page-slot\s*\{[\s\S]*grid-template-rows:\s*auto auto auto/);
  assert.match(styles, /\.page-slot\s*\{[\s\S]*align-content:\s*safe center/);
  assert.match(styles, /\.page-slot\s*\{[\s\S]*row-gap:\s*10px/);
  assert.match(styles, /\.page-slot\s*\{[\s\S]*min-height:\s*0;[\s\S]*height:\s*100%;[\s\S]*max-height:\s*100%/);
  assert.match(styles, /\.page-slot\.odd\s*\{[\s\S]*--page-chrome-right:\s*40px/);
  assert.match(styles, /\.page-slot\.even\s*\{[\s\S]*--page-chrome-left:\s*40px/);
  assert.match(styles, /\.page-shell\s*\{[\s\S]*--reader-page-available-height:\s*max\(430px,\s*calc\(100dvh - 82px\)\)/);
  assert.match(styles, /\.page-shell\s*\{[\s\S]*height:\s*min\([\s\S]*var\(--reader-page-available-height\)/);
});

test("reader vertical page lines span the full shell while slots reserve text-safe gutters", () => {
  assert.match(styles, /\.page-shell\s*\{[\s\S]*--page-shell-y-padding:\s*18px/);
  assert.match(styles, /\.page-shell\s*\{[\s\S]*margin-top:\s*0/);
  assert.match(styles, /\.page-shell\s*\{[\s\S]*padding:\s*var\(--page-shell-y-padding\) 0/);
  assert.doesNotMatch(styles, /\.page-shell\.odd\s*\{[^}]*padding-left/);
  assert.doesNotMatch(styles, /\.page-shell\.even\s*\{[^}]*padding-right/);
  assert.match(styles, /\.page-track\s*\{[\s\S]*height:\s*calc\(100% \+ \(var\(--page-shell-y-padding\) \* 2\)\)/);
  assert.match(styles, /\.page-track\s*\{[\s\S]*margin-block:\s*calc\(var\(--page-shell-y-padding\) \* -1\)/);
  assert.match(styles, /\.page-slot\s*\{[\s\S]*padding-block:\s*var\(--page-shell-y-padding\)/);
  assert.match(styles, /\.page-slot\.odd\s*\{[\s\S]*padding-right:\s*18px/);
  assert.match(styles, /\.page-slot\.even\s*\{[\s\S]*padding-left:\s*18px/);
  assert.match(styles, /\.page-slot\.odd::after,\s*\.page-slot\.even::before\s*\{[\s\S]*top:\s*0;[\s\S]*bottom:\s*0/);
  assert.match(styles, /\.page-slot\.odd::after\s*\{[\s\S]*right:\s*0/);
  assert.match(styles, /\.page-slot\.even::before\s*\{[\s\S]*left:\s*0/);
  assert.doesNotMatch(styles, /\.page-shell\.odd::after/);
  assert.doesNotMatch(styles, /\.page-shell\.even::before/);
  assert.doesNotMatch(styles, /right:\s*-15px/);
  assert.doesNotMatch(styles, /left:\s*-15px/);
});

test("reader no longer renders the swipe hint copy", () => {
  assert.doesNotMatch(appSource, /Swipe left for previous page/);
  assert.doesNotMatch(appSource, /class="swipe-hint"/);
  assert.doesNotMatch(styles, /\.swipe-hint/);
});

test("home and reader headers share height while home progress avoids horizontal overflow", () => {
  assert.match(styles, /\.topbar,\s*\.reading-top\s*\{[\s\S]*min-height:\s*48px/);
  assert.match(styles, /\.home-panel\s*\{[\s\S]*overflow-y:\s*auto;[\s\S]*overflow-x:\s*hidden/);
  assert.match(styles, /\.progress-card\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow-x:\s*hidden/);
  assert.match(styles, /\.mushaf-strip\s*\{[\s\S]*overflow:\s*hidden/);
});

test("settings modal is full-height with a sticky close header", () => {
  assert.match(styles, /\.modal-backdrop:has\(\.settings-modal\)\s*\{[\s\S]*place-items:\s*start center[\s\S]*padding:\s*0/);
  assert.match(styles, /\.settings-modal\s*\{[\s\S]*height:\s*100dvh[\s\S]*max-height:\s*100dvh[\s\S]*padding-top:\s*0[\s\S]*border-block:\s*0[\s\S]*overflow-y:\s*auto/);
  assert.match(styles, /\.settings-modal\s+\.modal-head\s*\{[\s\S]*position:\s*sticky[\s\S]*top:\s*0[\s\S]*z-index:\s*2[\s\S]*margin:\s*0 -14px 10px/);
});

test("transition underline renders as a centered source-ayah cue", () => {
  assert.match(styles, /--transition-progress:\s*0%/);
  assert.match(styles, /\.ayah-mark::before\s*\{[\s\S]*background:\s*linear-gradient\(90deg,\s*transparent,\s*color-mix\(in srgb,\s*var\(--text\) 34%,\s*transparent\)/);
  assert.match(styles, /\.ayah-mark::after\s*\{[\s\S]*inset-inline:\s*-\.16em/);
  assert.match(styles, /\.ayah-chars\s+\.ayah-marker\.ayah-mark\s*\{[\s\S]*--ayah-marker-visual-offset:\s*\.2em/);
  assert.match(styles, /\.ayah-chars\s+\.ayah-marker\.ayah-mark::before,[\s\S]*\.ayah-chars\s+\.ayah-marker\.ayah-mark::after\s*\{[\s\S]*transform:\s*translateX\(var\(--ayah-marker-visual-offset\)\)/);
  assert.match(styles, /\.ayah-chars\s+\.ayah-marker\.ayah-mark\s+\.ayah-mark-glyph\s*\{[\s\S]*transform:\s*translateX\(var\(--ayah-marker-visual-offset\)\)/);
  assert.match(styles, /clip-path:\s*inset\(0 var\(--transition-clip\)\)/);
  assert.match(styles, /linear-gradient\(90deg,\s*transparent,\s*var\(--transition-color\)[\s\S]*transparent\)/);
  assert.doesNotMatch(styles, /\.ayah-mark::after\s*\{[\s\S]*z-index:\s*-1/);
  assert.match(appSource, /resolveOutgoingTransition\(key,\s*metadata\)/);
});

test("transition increment triggers a center-out shine on the source ayah", () => {
  assert.match(styles, /\.transition-shine::after[\s\S]*animation:\s*transition-shine/);
  assert.match(styles, /@keyframes transition-shine[\s\S]*clip-path:\s*inset\(0 50%\)/);
  assert.match(styles, /@keyframes transition-track-shine[\s\S]*100%\s*\{[\s\S]*var\(--transition-color\)/);
  assert.match(appSource, /const sourceKey = sourceAyahKeyForMutation\(key\);[\s\S]*refreshVisibleAyahMarkerPresentation\(sourceKey\);[\s\S]*await saveState\(\)/);
  assert.match(appSource, /function refreshVisibleAyahMarkerPresentation\(key\)[\s\S]*--transition-color[\s\S]*ringState\.transitionCountColor/);
  assert.match(appSource, /if \(key\.includes\("\|"\)\) restartTransitionShine\(marker\)/);
  assert.match(appSource, /function restartTransitionShine\(marker\)/);
});

test("fully mastered ayah markers get a looped shine class and reduced-motion fallback", () => {
  assert.match(appSource, /ringState\.isFullyMastered \? "fully-mastered" : ""/);
  assert.match(appSource, /class="ayah-mark-glyph-base">\$\{value\}<\/span><span class="ayah-mark-glyph-shine" aria-hidden="true">\$\{value\}<\/span>/);
  assert.match(styles, /\.ayah-mark-glyph\s*\{[\s\S]*margin-inline:\s*-\.12em;[\s\S]*padding-inline:\s*\.12em/);
  assert.match(styles, /\.ayah-mark\.fully-mastered\s+\.ayah-mark-glyph-base\s*\{[\s\S]*color:\s*var\(--mastered\)/);
  assert.match(styles, /\.ayah-mark\.fully-mastered\s+\.ayah-mark-glyph-shine\s*\{[\s\S]*background-clip:\s*text/);
  assert.match(styles, /\.ayah-mark\.fully-mastered\s+\.ayah-mark-glyph-shine\s*\{[\s\S]*linear-gradient\(110deg,\s*transparent/);
  assert.match(styles, /\.ayah-mark\.fully-mastered\s+\.ayah-mark-glyph-shine\s*\{[\s\S]*animation:\s*ayah-fully-mastered-glyph-shine 2\.6s ease-in-out infinite/);
  assert.doesNotMatch(styles, /\.ayah-mark\.fully-mastered\s*\{[\s\S]*box-shadow:\s*inset 0 0 0 999px/);
  assert.match(styles, /@keyframes ayah-fully-mastered-glyph-shine[\s\S]*background-position:\s*-90% 0/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.ayah-mark\.fully-mastered\s+\.ayah-mark-glyph-shine\s*\{[\s\S]*animation:\s*none/);
});

test("double tap logs the outgoing transition from the tapped ayah", () => {
  assert.match(appSource, /const transition = resolveOutgoingTransition\(key,\s*metadata\)/);
  assert.match(appSource, /logTransition\(transition\.key\)/);
  assert.doesNotMatch(appSource, /const previous = previousVisibleAyah\(key\);[\s\S]*?logTransition\(transitionKey\(route\.page,\s*previous,\s*key\)\)/);
});

test("home and reader expose help buttons before settings and reader actions", () => {
  assert.match(appSource, /<div class="top-actions">\s*\$\{renderHelpButton\(\)\}\s*<button class="icon-btn" data-action="settings"/);
  assert.match(appSource, /<button class="icon-btn \$\{pageBookmarked[\s\S]*?\$\{renderHelpButton\(\)\}\s*<button class="icon-btn" data-action="settings"/);
});

test("help modal contains the four tutorial topics", () => {
  assert.match(appSource, /const helpSlides = \[/);
  assert.match(appSource, /const helpSlides = \[\s*\{[\s\S]*?title:\s*"Open a page"[\s\S]*?title:\s*"Track practice"[\s\S]*?title:\s*"Inspect details"[\s\S]*?title:\s*"Progress colors"/);
  assert.match(appSource, /title:\s*"Progress colors"/);
  assert.match(appSource, /Grey\/white means not started/);
  assert.match(appSource, /title:\s*"Open a page"/);
  assert.match(appSource, /title:\s*"Track practice"/);
  assert.match(appSource, /Use one tap when you repeat that ayah by itself/);
  assert.match(appSource, /two quick taps when you practice connecting that ayah into the next one/);
  assert.match(appSource, /both ayah strength and transition strength/);
  assert.match(appSource, /title:\s*"Inspect details"/);
  assert.match(appSource, /function renderHelpModal\(\)/);
});

test("progress color help visual uses real QCF4 ayah markers", () => {
  assert.match(appSource, /const colorLevels = \[/);
  for (const level of ["empty", "weak", "building", "strong", "mastered"]) {
    assert.match(appSource, new RegExp(`level: "${level}"`));
  }
  assert.match(appSource, /class="ayah-marker ayah-mark \$\{level\} transition-count-\$\{level\} help-color-marker"/);
  assert.match(appSource, /--count-color: var\(--\$\{level\}\)/);
  assert.match(appSource, /help-color-marker"[\s\S]*>&#xf1a3;<\/span>/);
  assert.match(styles, /\.help-color-marker\.ayah-marker\.ayah-mark/);
  assert.match(styles, /\.help-color-marker\.ayah-marker\.ayah-mark[\s\S]*background:\s*transparent/);
  assert.match(styles, /\.help-color-marker\.ayah-marker\.ayah-mark[\s\S]*font-size:\s*2\.12rem/);
  assert.doesNotMatch(styles, /\.help-color-row span\s*\{[\s\S]*width:\s*44px/);
});

test("open page help visual matches the home tab bar", () => {
  assert.match(appSource, /class="help-home-preview"/);
  assert.match(appSource, /class="help-search-box"/);
  assert.match(appSource, /Page 48, Al-Baqarah, Juz 3/);
  assert.match(appSource, /class="help-home-tabs"/);
  assert.match(appSource, /<span class="active">Progress<\/span>/);
  assert.match(appSource, /<span>Surahs<\/span>/);
  assert.match(appSource, /<span>Bookmarks<\/span>/);
  assert.match(styles, /\.help-search-box\s*\{[\s\S]*min-height:\s*46px/);
  assert.match(styles, /\.help-search-box\s*\{[\s\S]*border:\s*1px solid var\(--line\)/);
  assert.match(styles, /\.help-search-box\s*\{[\s\S]*background:\s*var\(--surface\)/);
  assert.match(styles, /\.help-home-tabs\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /\.help-home-tabs\s*\{[\s\S]*background:\s*rgba\(10,\s*22,\s*40,\s*\.45\)/);
  assert.match(styles, /\.help-home-tabs \.active\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*var\(--surface-2\),\s*var\(--surface\)\)/);
});

test("track practice help visual shows ayah marker, transition cue, and animated hand", () => {
  assert.match(appSource, /class="help-ayah-demo"/);
  assert.match(appSource, /class="ayah-marker ayah-mark building transition-count-building help-ayah-glyph"/);
  assert.match(appSource, /font-family:\s*'QCF2001'/);
  assert.match(appSource, /--count-color:\s*var\(--building\)/);
  assert.match(appSource, /--transition-progress:\s*62%/);
  assert.match(appSource, /class="ayah-marker ayah-mark building transition-count-building help-ayah-glyph"[\s\S]*>&#xf1a3;<\/span>/);
  assert.match(appSource, /class="help-plus-pop ayah"/);
  assert.match(appSource, /class="help-plus-pop transition"/);
  assert.match(appSource, /class="help-hand-tap"/);
  assert.match(appSource, /class="help-tap-label single">1 tap/);
  assert.match(appSource, /class="help-tap-label double">2 taps/);
  assert.match(styles, /\.help-ayah-demo\s*\{[\s\S]*height:\s*112px/);
  assert.match(styles, /\.help-ayah-glyph/);
  assert.match(styles, /\.help-ayah-glyph\s*\{[\s\S]*z-index:\s*2/);
  assert.match(styles, /\.help-ayah-glyph\s*\{[\s\S]*top:\s*-8px/);
  assert.match(styles, /\.help-ayah-glyph\.ayah-marker\.ayah-mark[\s\S]*background:\s*transparent/);
  assert.match(styles, /\.help-ayah-glyph\.ayah-marker\.ayah-mark[\s\S]*--transition-underline-gap:\s*-\[?\.22em/);
  assert.match(styles, /\.help-ayah-glyph\.ayah-marker\.ayah-mark[\s\S]*font-size:\s*2\.55rem/);
  assert.match(styles, /\.help-ayah-glyph\.ayah-marker\.ayah-mark[\s\S]*filter:\s*saturate\(1\.35\) brightness\(1\.18\)/);
  assert.match(styles, /\.help-ayah-glyph\.ayah-marker\.ayah-mark[\s\S]*text-shadow:\s*0 0 12px/);
  assert.match(styles, /\.help-hand-tap[\s\S]*z-index:\s*1/);
  assert.match(styles, /\.help-hand-tap[\s\S]*bottom:\s*-12px/);
  assert.match(styles, /\.help-plus-pop\.transition\s*\{[\s\S]*top:\s*24px/);
  assert.match(styles, /@keyframes help-single-label/);
  assert.match(styles, /@keyframes help-double-label/);
  assert.match(styles, /@keyframes help-hand-tap/);
  assert.match(styles, /@keyframes help-hand-ripple/);
  assert.match(styles, /@keyframes help-ayah-demo-tap/);
  assert.match(styles, /@keyframes help-transition-track-demo/);
  assert.match(styles, /@keyframes help-transition-demo/);
  assert.match(styles, /@keyframes help-ayah-plus-pop/);
  assert.match(styles, /@keyframes help-transition-plus-pop/);
  assert.match(styles, /15%,\s*62%,\s*66%\s*\{[\s\S]*translateX\(-50%\) translateY\(-22px\) scale\(\.88\)/);
});

test("inspect details help visual demonstrates long press", () => {
  assert.match(appSource, /class="help-long-press-demo"/);
  assert.match(appSource, /class="help-ayah-demo help-detail-marker-wrap"/);
  assert.match(appSource, /class="ayah-marker ayah-mark building transition-count-building help-ayah-glyph help-detail-glyph"/);
  assert.match(appSource, /class="help-long-press-ring"/);
  assert.match(appSource, /class="help-hand-tap help-long-press-hand"/);
  assert.match(appSource, /class="help-detail-card"/);
  assert.match(styles, /\.help-long-press-demo/);
  assert.match(styles, /\.help-detail-marker-wrap\s*\{[\s\S]*height:\s*112px/);
  assert.match(styles, /\.help-detail-glyph\s*\{[\s\S]*animation:\s*none/);
  assert.match(styles, /\.help-detail-glyph::before,\s*\.help-detail-glyph::after\s*\{[\s\S]*animation:\s*none/);
  assert.match(styles, /\.help-detail-glyph::before,\s*\.help-detail-glyph::after\s*\{[\s\S]*transform:\s*none/);
  assert.match(styles, /\.help-long-press-ring/);
  assert.match(styles, /\.help-long-press-ring\s*\{[\s\S]*top:\s*calc\(50% - 8px\)/);
  assert.match(styles, /\.help-long-press-hand/);
  assert.match(styles, /\.help-long-press-hand\s*\{[\s\S]*bottom:\s*-12px/);
  assert.match(styles, /\.help-detail-card/);
  assert.match(styles, /@keyframes help-long-press-hand/);
  assert.match(styles, /@keyframes help-long-press-ring/);
  assert.doesNotMatch(styles, /@keyframes help-long-press-marker/);
  assert.match(styles, /@keyframes help-detail-card-reveal/);
  assert.match(styles, /22%,\s*52%\s*\{[\s\S]*translateX\(-50%\) translateY\(-22px\) scale\(\.88\)/);
});

test("opening help marks the first-time guide as seen", () => {
  assert.match(appSource, /async function openHelp\(\)\s*\{[\s\S]*?helpOpen = true;[\s\S]*?state\.helpSeen = true;[\s\S]*?await saveState\(\);/);
});

test("help button pulse and modal styles are defined", () => {
  assert.match(styles, /\.help-btn\.first-run-pulse::after/);
  assert.match(styles, /\.help-btn\.first-run-pulse::after\s*\{[\s\S]*border-radius:\s*50%/);
  assert.match(styles, /\.help-btn\.first-run-pulse::after\s*\{[\s\S]*transform:\s*translate\(-50%,\s*-50%\) scale\(\.92\)/);
  assert.match(styles, /@keyframes help-pulse/);
  assert.match(styles, /\.help-modal/);
  assert.match(styles, /\.help-slide/);
  assert.match(styles, /\.help-progress/);
});

test("help modal is vertically centered", () => {
  assert.match(styles, /\.modal-backdrop:has\(\.help-modal\)\s*\{[\s\S]*place-items:\s*center/);
});

test("help pulse respects reduced motion", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.help-btn\.first-run-pulse::after[\s\S]*animation:\s*none/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.help-hand-tap,\s*\.help-hand-tap::after[\s\S]*animation:\s*none/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.help-tap-label\.single,[\s\S]*\.help-plus-pop\.transition[\s\S]*animation:\s*none/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.help-ayah-glyph::before,[\s\S]*\.help-ayah-glyph::after[\s\S]*animation:\s*none/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.help-long-press-ring,[\s\S]*\.help-detail-card[\s\S]*animation:\s*none/);
});
