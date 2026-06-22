# Ayah Transition Modal Design

Date: 2026-06-22
Status: Proposed
Scope: Ayah detail modal redesign with transition companion

## Goal

Redesign the shared ayah detail modal so it always shows both the ayah repetition count and the page-local incoming transition count for that ayah.

The redesign should:

- preserve the ayah modal as the main detail surface for reading-page long press
- keep ayah count as the primary signal
- make transition progress visible without requiring a separate transition modal
- keep interaction simple: close, bookmark, decrement, reset
- match the finalized `Option B` mockup in `docs/mockups/ayah-transition-modal-options.html`

This slice changes the ayah modal presentation and the information shown inside it. It does not change counting rules, threshold semantics, bookmarks data, or the separate transition detail target behavior.

## Why Change It

The current shared detail modal is structurally simple, but it only shows one numeric count at a time. That works for isolated ayah or transition inspection, yet it hides the relationship between a memorized ayah and the page-local transition leading into it.

For ayah review, the more useful mental model is:

- ayah count = primary memorization progress
- transition count = companion fluency signal into that ayah

The redesign should expose both signals at once while still feeling like one calm, compact modal rather than two separate tools stitched together.

## Approved Direction

Use the finalized visual direction from `Option B`.

That means:

- keep the ayah count in the main, first block
- place the transition information in a dedicated row beneath it
- avoid a duplicated second transition stat card
- keep both decrement controls compact and right-aligned inside their own blocks
- keep reset as a full-width footer action

The modal should not continue showing the alternate `Option A` layout during implementation. `Option A` was only a comparison aid for design review.

## Visual Model

### Header

The modal header should include:

- the ayah title on the left, such as `Ayah 2:255`
- bookmark control in the header, using the same bookmark icon shape already used on the reading page
- close button in the header

Close behavior should remain:

- tapping the close button closes the modal
- tapping outside the modal closes the modal

### Main Content

The approved structure is:

1. ayah progress block
2. transition companion row
3. full-width reset button

The old outer content wrapper styling around both blocks should be removed. The ayah block and transition row should each stand on their own, with matched internal padding and aligned controls.

### Ayah Block

The ayah block should contain:

- label: `Ayah count`
- strength pill in the top-right of the block
- large count value
- small target value beside or just after the large value, e.g. `24 /30`
- compact decrement button in the bottom-right of the block showing `-`

The count numeral should remain the strongest text treatment in the block.

### Transition Row

The transition companion row should contain:

- transition path in the upper-left, e.g. `2:254 -> 2:255`
- strength pill pinned to the same top-right alignment pattern as the ayah block
- label: `Transition count`
- large count numeral with the same bright color treatment as the ayah count numeral
- small target value, e.g. `8 /10`, with the target portion muted
- compact decrement button in the bottom-right of the row showing `-`

The transition count should visually echo the ayah count styling, but the row as a whole should still read as secondary because it is positioned beneath the ayah block.

## Information Rules

### For ayah detail targets

When the detail target is an ayah:

- always show ayah count
- always attempt to show the page-local incoming transition companion
- if there is a valid previous visible ayah on the same page, render the resolved transition path and transition count
- if no valid incoming transition exists for that ayah, render a stable fallback row showing the label `Transition count`, a muted `No incoming transition` message, no decrement button for that row, and unchanged modal spacing

### For transition detail targets

This spec focuses on the ayah modal redesign.

Unless implementation reveals a strong simplification opportunity, the existing transition detail target can remain separately supported. The ayah redesign should not block that path.

## Interaction Model

### Bookmark

- remove the old full-width bookmark button from the modal body
- move bookmarking into the header
- keep bookmark behavior ayah-only

### Decrement

- ayah block decrement button reduces ayah count
- transition row decrement button reduces transition count
- both buttons use the compact square treatment and display `-`

### Reset

- reset remains a full-width action at the bottom of the modal content
- reset should continue to affect the active ayah detail target in the implemented app logic

## Layout And Spacing Requirements

The approved mockup establishes these layout expectations:

- ayah block and transition row must use matching internal padding
- strength pills must align to the same top-right inset in both blocks
- decrement buttons must align to the same bottom-right inset in both blocks
- the transition row should not feel cramped compared with the ayah block
- the header spacing should feel tighter and cleaner than the earlier mockup revisions

These alignment rules matter as much as the content itself, because the final design relies on visual consistency to make the secondary transition row feel intentional rather than improvised.

## Accessibility

The redesign should remain understandable with assistive technology:

- keep the modal title descriptive
- keep bookmark and close controls individually labeled
- keep decrement controls distinguishable by target, not just by identical `-` glyphs
- avoid making the pill the only source of strength information for non-visual users

If aria labels need refinement during implementation, prefer explicit labels such as:

- `Decrease ayah count`
- `Decrease transition count`
- `Bookmark ayah`
- `Close details`

## Error Handling And Fallbacks

If a valid incoming transition cannot be resolved for the ayah:

- do not break the modal structure
- render a predictable fallback row state
- avoid shifting reset or header actions because transition data is missing

If header bookmarking cannot apply to a non-ayah detail target:

- do not show a broken or inert bookmark affordance
- keep the control ayah-specific

## Testing And Verification

Verification should focus on both content correctness and the final visual arrangement.

### Functional checks

- long-pressing an ayah opens the redesigned modal
- header bookmark toggles the ayah bookmark state
- close button closes the modal
- tapping outside the modal closes the modal
- ayah decrement changes only ayah count
- transition decrement changes only transition count
- reset still behaves correctly for the active detail target

### Content checks

- ayah modal always shows ayah count
- ayah modal shows the page-local incoming transition path for ayahs that have one
- transition count in the ayah modal matches the same underlying transition key used elsewhere
- first visible ayah on a page handles the missing incoming transition gracefully

### Visual checks

- bookmark icon matches the existing reading-page bookmark shape
- both strength pills align to the same top-right inset
- both decrement buttons align to the same bottom-right inset
- transition numeral styling matches ayah numeral styling
- target values remain visibly secondary to the large count numerals

## Scope Boundaries

This design does not include:

- changing how ayah counts are incremented
- changing how transition keys are resolved
- changing thresholds or strength bucket rules
- redesigning the separate transition-only detail flow beyond what is required to keep the app coherent
- changing review queue ordering or storage format

## Recommendation

Implement the ayah detail modal using the approved `Option B` structure:

- header bookmark and close
- main ayah count block
- secondary transition companion row
- full-width reset

That keeps the ayah as the primary object of attention while giving transition fluency a stable, visible place in the same modal.
