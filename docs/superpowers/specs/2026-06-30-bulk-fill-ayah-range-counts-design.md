# Bulk Fill Ayah Range Counts Design

## Goal

Add a page-aware reading workflow for bulk filling repetition and transition counts over a single continuous ayah range, backed by a pure helper that stays decoupled from the UI layer.

## Recommended Approach

Add a new pure helper in `src/data/`, tentatively `src/data/bulk-progress.js`.

Expose that helper through a reading-page modal opened from a floating green `+` action button.

This helper will:

- accept a state snapshot and metadata
- accept a single inclusive ayah range
- accept a repetition count and a separate transition count
- support both exact replacement and additive increment behavior
- return a new updated state object

This keeps the behavior reusable for future developer tooling or UI actions while making it straightforward to test in isolation.

## Reading Page Entry Point

Add a floating green `+` button on the reading page.

### Placement

- The button appears only on the reading page.
- It sits in the bottom-right area of the reading UI.
- It must not overlap the bottom page navigation buttons.
- The placement should visually pair with the existing reading controls while remaining distinct as an edit action.

### Interaction

- Tapping the button opens a bulk-fill modal.
- The modal is prefilled from the current page context.
- The modal is intended for fast page-local bulk entry while reading, not for global settings management.

## Modal Defaults

### Default Surah

- Use the first surah visible on the current page.

This is important for pages that contain multiple surahs.

### Default Ayah Range

- Use the first visible ayah of that default surah on the current page as the starting ayah number.
- Use the last visible ayah of that default surah on the current page as the ending ayah number.

This keeps the default operation page-local and aligned with the current reading context.

### Multiple Surahs On One Page

- The initial default surah is always the first surah visible on the page.
- The modal still allows the user to choose another surah manually.

If the user changes to a surah that is also visible on the current page, the range defaults should update to that surah’s visible ayah span on the current page.

If the user changes to a surah that is not visible on the current page, the range should fall back to full-surah ayah bounds from metadata when available. If those bounds are not available, the fields should remain user-editable and require manual entry.

## Modal Fields

The modal should include:

- a surah selector
- a starting ayah number input
- an ending ayah number input
- a repetition count input
- a transition count input
- a mode selector with `replace` and `increment`
- a confirm action
- a cancel/close action

## API Shape

Proposed function signature:

```js
bulkFillAyahRangeCounts({
  state,
  metadata,
  startAyahKey,
  endAyahKey,
  repetitionCount,
  transitionCount,
  mode = "replace"
})
```

Proposed return value:

```js
{
  ...state,
  ayahProgress: { ...updatedAyahProgress },
  transitionProgress: { ...updatedTransitionProgress }
}
```

## Range Semantics

- The range is inclusive of both `startAyahKey` and `endAyahKey`.
- The range follows mushaf order as already represented by the metadata.
- If the caller passes the range in reverse order, the helper automatically normalizes it by swapping the endpoints.
- The helper handles one continuous ayah span per call.

## Mode Semantics

### Replace Mode

When `mode === "replace"`:

- every ayah in the range is set to exactly `repetitionCount`
- every transition fully inside the range is set to exactly `transitionCount`

### Increment Mode

When `mode === "increment"`:

- every ayah in the range adds `repetitionCount` on top of its current count
- every transition fully inside the range adds `transitionCount` on top of its current count

Increment mode should clamp at a minimum of `0` if negative values are ever passed.

## Selection Rules

### Ayahs

The helper updates every ayah whose mushaf-order position falls inside the normalized inclusive range.

### Transitions

The helper updates only transitions whose `from` ayah and `to` ayah are both inside the normalized range.

This means transitions that cross the range boundary are left unchanged.

## Behavior Rules

- Only ayahs inside the selected range are updated.
- Only transitions fully inside the selected range are updated.
- Unrelated ayahs and transitions remain unchanged.
- `repetitionCount` and `transitionCount` are independent inputs.
- `0` is valid in both modes.
- The helper is pure: it does not mutate the incoming `state`.
- Other state fields such as bookmarks, settings, recent pages, and practice history are preserved unchanged.

## Submit Flow

1. Open the bulk-fill modal from the reading-page `+` button.
2. Prepopulate the form from the current page context.
3. Let the user adjust surah, ayah bounds, counts, and mode.
4. Build normalized `startAyahKey` and `endAyahKey`.
5. Call the pure bulk-fill helper.
6. Save the updated state once.
7. Re-render the reading page so the updated counts are immediately visible.

## Data Flow

1. Build a mushaf-order list of ayah keys from metadata.
2. Find the positions of `startAyahKey` and `endAyahKey`.
3. Normalize the range order if the start comes after the end.
4. Collect all ayah keys inside the normalized range.
5. Update `ayahProgress` according to the chosen mode.
6. Resolve transitions whose `from` and `to` keys are both inside the normalized range.
7. Update `transitionProgress` according to the chosen mode.
8. Return a cloned state with updated progress maps.

## Error Handling

The helper should stay simple and deterministic:

- If either ayah key is missing from metadata, return an equivalent state copy.
- Treat an empty or invalid range lookup as a no-op.
- Assume callers pass recognized modes and integer counts; UI validation can stay in the caller.

The modal layer should provide ordinary form validation for empty or invalid numeric input before submit.

## Testing Plan

Add targeted unit tests covering:

- replace mode overwrites existing ayah counts in range
- replace mode overwrites existing transition counts in range
- increment mode adds on top of existing ayah counts
- increment mode adds on top of existing transition counts
- reversed ranges auto-normalize correctly
- outside ayahs remain untouched
- boundary-crossing transitions remain untouched
- zero values behave correctly in replace mode
- zero and negative increments clamp correctly at `0`
- missing ayah keys behave as a no-op

Add UI-focused coverage for:

- the green `+` button rendering on the reading page only
- the `+` button not overlapping page navigation controls
- the modal defaulting to the first surah visible on a multi-surah page
- the modal defaulting to the first and last visible ayah of that surah on the current page
- changing surah updating page-local defaults when the selected surah is visible on the page

## Scope Boundary

This design adds:

- the pure ayah-range bulk-fill helper
- the reading-page green `+` button
- the bulk-fill modal
- the necessary tests for helper behavior and modal defaults

It does not yet add:

- developer controls
- practice event generation for each bulk change

Those can be added later on top of the helper if needed.
