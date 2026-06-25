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

test("ayah marker gives immediate tap feedback before count commit", () => {
  assert.match(appSource, /handleAyahTap\(button\.dataset\.ayah,\s*button\)/);
  assert.match(appSource, /function playAyahTapFeedback\(marker\)/);
  assert.match(appSource, /marker\.animate\(/);
});

test("page shell pointerup routes non-drag ayah taps to feedback", () => {
  assert.match(appSource, /resolveAyahMarkerAtPoint\(event\.clientX,\s*event\.clientY\)/);
  assert.match(appSource, /lastPointerAyahTap/);
  assert.match(appSource, /handleAyahTap\(ayahMarker\.dataset\.ayah,\s*ayahMarker\)/);
});

test("long press detail modal cancels active page swipe gesture", () => {
  assert.match(appSource, /function cancelPageGesture\(\)/);
  assert.match(appSource, /bindLongPress\(button,\s*\(\) => \{[\s\S]*?cancelPageGesture\(\);[\s\S]*?detailTarget = \{ kind: "ayah"/);
  assert.match(appSource, /bindLongPress\(button,\s*\(\) => \{[\s\S]*?cancelPageGesture\(\);[\s\S]*?detailTarget = \{ kind: "transition"/);
});

test("desktop text selection bypasses page swipe startup", () => {
  assert.match(appSource, /shouldStartTrackGesture/);
  assert.match(appSource, /pointerType:\s*event\.pointerType/);
  assert.match(appSource, /startedOnSelectableText:\s*Boolean\(event\.target\.closest\?\.\("\.mushaf-line"\)\)/);
});

test("margin swipes suppress text selection before drag threshold", () => {
  assert.match(appSource, /pageShell\.classList\.add\("swipe-armed"\)/);
  assert.match(appSource, /event\.preventDefault\(\);\s*swipeStart = \{/);
  assert.match(appSource, /pageShell\.classList\.remove\("swipe-armed"\)/);
  assert.match(styles, /\.page-shell\.swipe-armed\s+\.mushaf-line[\s\S]*user-select:\s*none/);
});

test("ayah feedback animations stay visible in the app preview", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.pulse[\s\S]*animation-duration:\s*\.42s\s*!important/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.repetition-count-pop[\s\S]*animation-duration:\s*\.68s\s*!important/);
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

test("page navigation click binding excludes ayah marker buttons", () => {
  assert.match(appSource, /querySelectorAll\("\[data-page\]:not\(\[data-ayah\]\)"/);
});

test("reader exposes bottom previous and next buttons for desktop navigation", () => {
  assert.match(appSource, /class="reader-bottom-nav"/);
  assert.match(appSource, /class="reader-bottom-btn next" data-action="next-page"[^>]*aria-label="Next page"[\s\S]*?class="reader-bottom-btn previous" data-action="previous-page"[^>]*aria-label="Previous page"/);
  assert.match(appSource, /class="reader-bottom-btn previous" data-action="previous-page"[^>]*aria-label="Previous page"[\s\S]*?\$\{icons\.previousPage\}/);
  assert.match(appSource, /class="reader-bottom-btn next" data-action="next-page"[^>]*aria-label="Next page"[\s\S]*?\$\{icons\.nextPage\}/);
  assert.match(appSource, /previousPage:\s*`<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"\/><\/svg>`/);
  assert.match(appSource, /nextPage:\s*`<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"\/><\/svg>`/);
  assert.doesNotMatch(appSource, />Previous page<\/button>/);
  assert.doesNotMatch(appSource, />Next page<\/button>/);
  assert.match(styles, /\.reader-bottom-nav/);
  assert.match(styles, /\.reader-bottom-btn/);
});

test("reader no longer renders the swipe hint copy", () => {
  assert.doesNotMatch(appSource, /Swipe left for previous page/);
  assert.doesNotMatch(appSource, /class="swipe-hint"/);
  assert.doesNotMatch(styles, /\.swipe-hint/);
});

test("transition arc ring renders above the ayah marker surface", () => {
  assert.match(styles, /\.ayah-mark\.transition-count-weak::after,[\s\S]*z-index:\s*1/);
  assert.doesNotMatch(styles, /\.ayah-mark::after\s*\{[\s\S]*z-index:\s*-1/);
  assert.match(styles, /conic-gradient\(from -90deg,\s*#abda1a 0deg var\(--transition-arc, 0deg\),\s*rgba\(13, 20, 7, \.68\) var\(--transition-arc, 0deg\) 360deg\)/);
});

test("transition arc ring is thick enough to be visible around ayah marker", () => {
  assert.match(styles, /--transition-ring-width:\s*5px/);
  assert.match(styles, /\.ayah-mark::after\s*\{[\s\S]*inset:\s*0/);
  assert.match(styles, /transparent calc\(100% - var\(--transition-ring-width\)\)/);
  assert.doesNotMatch(styles, /transparent calc\(100% - 2px\), #000 calc\(100% - 1px\)/);
  assert.doesNotMatch(styles, /\.ayah-mark::after\s*\{[\s\S]*inset:\s*calc\(var\(--transition-ring-width\) \* -1\)/);
});
