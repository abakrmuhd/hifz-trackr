# Home Search Design

## Summary

Add compact Home-screen search that supports direct navigation by page number, surah name/number, and juz number. Search results appear as a short mixed list under the existing field, stay capped to the visible height of five rows, and open the Reading screen at the selected page.

## Goals

- Keep Home search fast and lightweight.
- Reuse one shared search/ranking model for both result-list rendering and Enter-to-open behavior.
- Preserve existing navigation surfaces and RTL reading behavior.
- Favor pure-function matching logic that can be tested without DOM-heavy tests.

## Non-Goals

- Replacing the Surahs tab or Progress navigation.
- Adding ayah-level search.
- Adding broad fuzzy search across every page label or metadata fragment.
- Changing Reading-screen navigation or bookmark behavior.

## User Interaction

The existing Home search field remains in place near the top of the Home screen.

As the user types:

- A mixed result list appears directly below the field.
- The list contains page, surah, and juz results in one ranked stack.
- The list uses the tighter visual treatment chosen during review.
- Each row shows a primary label on the left and a small page chip on the right.
- Rows may include a short secondary line for context such as `Surah 2`, `Pages 42-61`, or a surah/juz hint for a page result.

List behavior:

- The list is scrollable.
- The list is visually capped to the height of five result rows.
- If there are fewer than five results, the list shrinks naturally.
- If the query is empty or unmatched, no result list is shown.

Selection behavior:

- Tapping a result opens the Reading screen at that page.
- Pressing `Enter` opens the top-ranked result when one exists.
- Search stays additive to the current Home screen; it does not replace tabs or other navigation elements.

## Matching And Ranking

Search accepts:

- Plain page numbers such as `48`
- Explicit page queries such as `page 48`
- Explicit juz queries such as `juz 3`
- Explicit surah number queries such as `surah 2`
- Partial or full surah-name queries across transliterated, English, Arabic, and alias forms such as `baq`, `baqarah`, `the cow`, `يس`, or `yasin`

Ranking rules:

1. Exact typed entity matches rank first within their entity type.
2. Numeric-only input prefers page results over surah or juz interpretations.
3. Explicit prefixes such as `page`, `surah`, and `juz` keep their existing deterministic meaning.
4. Partial surah-name matches are allowed, but only the strongest small set of results should be returned.
5. The same ranking source must drive both result-list ordering and the best-target result used for Enter.

Result model:

- `kind`: `page`, `surah`, or `juz`
- `page`: destination page
- `primaryLabel`: main row label
- `secondaryLabel`: optional context line

## Implementation Shape

### `src/data/navigation-logic.js`

Extend the current navigation resolver into a shared search module.

Responsibilities:

- Normalize input consistently.
- Produce ranked search results for Home rendering.
- Preserve a best-target helper for Enter behavior by reusing the ranked results.
- Keep explicit `page`, `surah`, and `juz` parsing deterministic.

Preferred API shape:

- `searchNavigationTargets(value, metadata, pageCount)` returns ranked result objects.
- `resolveNavigationTarget(value, metadata, pageCount)` continues to return the best single destination by delegating to the shared search logic.

### `src/app.js`

Add minimal Home-only state for:

- Current search text
- Current ranked results

Responsibilities:

- Update results live while the Home search field changes.
- Render the result list under the field only when results exist.
- Open the tapped result page.
- Open the top-ranked result on `Enter`.
- Clear or hide results naturally when the query becomes empty or unmatched.

The feature should stay local to the Home search UI and should not alter Surahs-tab rendering or other page-opening flows.

### `src/styles.css`

Add only the styling needed for the result list:

- Stacked result list below the existing search field
- Max-height sized to five visible rows
- Vertical overflow scrolling
- Tight Option A row spacing
- Small right-side page chip

The visual treatment should stay consistent with the existing Home cards, list rows, and compact controls.

## Testing

Primary correctness should live in pure-function tests for navigation logic.

Update [tests/navigation-logic.test.js](/C:/Users/user/Documents/Business/Quran%20Memorization/tap_hifz/tests/navigation-logic.test.js) to cover:

- Exact page queries
- Exact prefixed surah and juz queries
- Numeric-only queries preferring page results
- Partial surah-name matching
- Mixed ranked results containing `page`, `surah`, and `juz`
- Consistency between the top search result and `resolveNavigationTarget(...)`

Verification before completion:

- Run `npm test`
- Run `npm run check`

## Risks And Guardrails

- Avoid duplicating matching logic in `app.js`; ranking must stay centralized in `navigation-logic.js`.
- Keep search result counts intentionally small so broad surah-prefix matches do not flood the UI.
- Do not change RTL page semantics; search only chooses a page destination.
- Keep the list compact so it supports navigation without visually taking over the Home screen.
