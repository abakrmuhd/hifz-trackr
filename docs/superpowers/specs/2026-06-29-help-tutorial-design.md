# Help Tutorial Design

## Goal

Help first-time users understand the core Hifz Trackr workflow without changing the existing reading model. The immediate feature is a reusable Help button on Home and Reading screens. The later first-run walkthrough is intentionally deferred and documented as follow-up work.

## User Experience

Add a Help button immediately to the left of the Settings button on Home and to the left of the existing reader header actions on the Reading screen. For first-time users, the Help button shows a subtle pulsing ring so it is discoverable without blocking the app. Once the user opens or dismisses the help modal, the pulse stops.

Clicking Help opens a modal with a four-slide carousel:

1. **Progress colors** explains that empty/grey means not started and progress moves toward green as repetition counts increase. It also explains that page and juz cells stay conservative by reflecting the weakest tracked ayah or transition inside them.
2. **Open a page** explains that users can navigate from the Progress, Surahs, and Bookmarks tabs, and can also use search/jump and recent pages where available.
3. **Track practice** explains that tapping an ayah number increments repetition count, while double tapping logs the outgoing transition to the next ayah.
4. **Inspect details** explains that long pressing an ayah marker opens the progress detail view for decrement/reset/bookmark actions.

The modal should support Previous/Next navigation, close/dismiss, keyboard Escape close, and accessible labels. It should not autoplay or require users to finish the carousel before using the app.

## State

Persist a small `helpSeen` flag alongside the existing app state. The flag only controls the first-time pulse; the Help button remains visible after the flag is set. Opening Help is enough to mark the guide as seen.

## Visual Design

Use existing app surfaces, buttons, modal styling, and green progress palette. The pulsing animation should be implemented locally in CSS, inspired by the referenced CodePen, as a ring/halo around the Help button. Keep the animation restrained and disable it when `prefers-reduced-motion: reduce` is active.

## Testing

Add targeted tests for state merging/storage defaults if needed. Add source-level regression tests that verify:

- Home renders a Help button beside Settings.
- Reading renders a Help button in the header.
- The help modal contains the four expected tutorial topics.
- The pulsing first-time class is tied to the persisted `helpSeen` state.

Run `npm test` and `npm run check` before completion.

## Deferred Walkthrough Todo

Create a docs todo for a future first-run walkthrough. That later feature may use a guided sequence or coach marks, but it is out of scope for this implementation so the current change stays small and low-risk.
