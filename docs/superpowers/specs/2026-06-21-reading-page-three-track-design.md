# Reading Page Three-Track Design

Date: 2026-06-21
Status: Proposed
Scope: Reader page navigation redesign

## Goal

Replace the current two-layer swipe reveal experiment with a true three-page carousel so the reader feels like moving across a physical sequence of mushaf pages.

The target interaction for this slice is:

- only the current page is visible at rest
- previous, current, and next pages all exist in a horizontal track
- swipe, arrow keys, and previous/next controls all drive the same track motion
- after each turn, the rail recenters so the current page remains in the middle slot

This slice changes the reader navigation model. It does not change ayah-counting rules, review semantics, or bookmark behavior.

## Why This Direction

The two-layer reveal approach still feels like one page sliding away from a hidden underlay. That can work for light content, but it is not giving the stronger “moving through real pages” feeling we want here.

A three-page track is a bigger rewrite, but it solves the spatial problem directly:

- every navigation path uses one motion model
- the neighboring pages are real peers, not a disguised underlay
- the track can be dragged or animated consistently regardless of input method

## Design Summary

Use a three-slot rail inside a clipped reader viewport:

- slot 0 = previous page
- slot 1 = current page
- slot 2 = next page

At rest, the rail is translated so only the center slot is visible. During navigation:

- swipe drags the rail with the finger
- key/button navigation animates the rail by one slot
- after the movement completes, the route updates and the rail contents are recycled so the new current page is back in the center slot

The side pages remain fully offscreen at rest. There should be no permanent “peek” of neighboring pages.

## Interaction Model

### Navigation mapping

Keep the app’s current direction mapping:

- swipe right navigates to the next page
- swipe left navigates to the previous page
- keyboard and explicit page controls follow the same page order they use today

The motion should reflect the direction of travel, not invent a separate mapping for non-touch controls.

### Swipe lifecycle

1. Pointer down stores the gesture origin.
2. Once horizontal intent is clear, the rail becomes draggable.
3. The entire three-page rail follows the drag.
4. On release:
   - a short swipe animates the rail back to center
   - a committed swipe animates the rail to the next or previous slot
5. After the animation completes, page data is recycled and the rail recenters around the new current page.

### Keyboard and button lifecycle

Arrow keys and existing previous/next controls should skip the drag phase but use the same slot-to-slot animation:

1. request navigation
2. animate the rail by one page width
3. recycle the page trio
4. snap the rail back to the centered resting transform

## Layout And Track Structure

The reader page shell becomes a viewport with:

- `page-track`
- `page-slot previous`
- `page-slot current`
- `page-slot next`

Requirements:

- all three slots use the same page styling and dimensions
- only the current slot is interactive
- the track width is stable and based on three equal page slots
- the viewport clips the side slots completely at rest
- the current page remains visually dominant while the side pages are offscreen

This should not look like a card carousel. It should feel like a page rail moving behind a narrow window.

## Data And State

Replace the current two-layer reveal state with track-oriented state:

- `trackPages.previous`
- `trackPages.current`
- `trackPages.next`
- `trackOffset`
- `trackDragging`
- `trackDirection`
- `pageNavigationInFlight`

State expectations:

- the center slot is always the source of truth for interactivity
- dragging never creates duplicate navigation requests
- after any committed navigation, the route and center slot update exactly once
- the track recenters after navigation rather than accumulating transforms

## Page Loading Strategy

The track requires immediate access to neighbors.

For this slice:

- when the current page is `n`, keep pages `n - 1`, `n`, and `n + 1` ready when valid
- neighbor fetch failure should degrade to `null` side slots, not break the current page
- after a turn, load the new outer neighbor needed by the recycled trio

This remains a local reader concern. It does not require a broader cache architecture.

## Boundary Behavior

At page `1` and page `604`:

- invalid-side slots stay empty
- dragging toward the invalid side should show resistance instead of exposing a blank full page
- key/button navigation toward the invalid side should keep the existing bounce feedback

The user should feel a boundary, not a broken carousel.

## Interaction Safety

To avoid accidental behavior:

- suppress click-through after a completed swipe
- keep only the center slot interactive
- cancel drag cleanly on pointer cancel
- ensure track transforms and dragging classes reset after release or interruption

## Visual Expectations

The interaction should feel:

- spatial
- smooth
- restrained

It should not feel like:

- stacked cards
- a mobile onboarding slider
- a decorative slideshow

The mushaf content is dense, so movement should stay controlled and readable.

## Files Expected To Change

- `src/app.js`
- `src/reader/swipe-reveal.js`
- `src/styles.css`
- `tests/swipe-reveal.test.js`
- `docs/superpowers/plans/2026-06-17-reading-page-swipe-reveal.md`

## Implementation Outline

1. Replace the two-layer page shell with a three-slot track.
2. Replace the temporary Task 2 direction scaffolding with track-state helpers.
3. Update reader loading so previous/current/next data are managed together.
4. Make swipe drag move the track instead of a single page surface.
5. Make arrow keys and previous/next controls use the same slot animation.
6. Keep center-slot interactivity only.
7. Verify that page boundaries, transforms, and route updates all reset cleanly.

## Out Of Scope

- page curl or fold effects
- 3D transforms
- permanent side peeks at rest
- changes to review logic
- changes to ayah progress or bookmarks

## Risks

- The current reader already contains partial two-layer scaffolding. We need to replace that cleanly rather than let old and new movement models coexist.
- Track recycling can create off-by-one errors if route updates and page-slot reassignment happen in the wrong order.
- Keeping only the center slot interactive requires careful event binding so side-slot controls never receive taps.

## Verification Plan

Manual verification for this slice:

1. Open a reader page and confirm only the current page is visible at rest.
2. Drag right slowly and confirm the rail follows the finger and reveals the next page from the right edge.
3. Drag left slowly and confirm the rail follows the finger and reveals the previous page from the left edge.
4. Release before threshold in both directions and confirm the rail snaps back to the centered page.
5. Commit a swipe in both directions and confirm the new current page recenters correctly.
6. Use arrow keys for both directions and confirm the same track animation is used.
7. Use previous/next controls and confirm the same track animation is used.
8. At page `1` and page `604`, confirm invalid-side movement shows resistance instead of a broken empty turn.
9. Confirm only the center page responds to ayah interactions.
10. Check browser console output for runtime errors or unhandled promise failures.
