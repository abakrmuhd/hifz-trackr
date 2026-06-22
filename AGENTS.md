# Repository Guidelines

## Project Structure & Module Organization

This repository is a static PWA for Quran memorization tracking. Core app code lives in `src/`: `src/app.js` drives the UI, `src/styles.css` holds global styles, `src/data/` contains pure logic and committed metadata JSON, and `src/reader/` contains reader-specific interaction modules such as `swipe-reveal.js`. Offline Quran page assets live in `public/mushaf/`. Build and metadata scripts live in `scripts/`. Tests live in `tests/` and mirror the source modules with `*.test.js` names. Generated production output goes to `dist/`.

## Build, Test, and Development Commands

- `npm run build` - builds the static output into `dist/`.
- `npm run dev` - serves the app locally at `http://localhost:4173` using Python's static server.
- `npm test` - runs the full Node test suite in `tests/*.test.js`.
- `npm run check` - syntax-checks app modules, service worker, and build/generation scripts.
- `npm run generate:metadata` - regenerates `src/data/mushaf-metadata.json` and `src/data/navigation-metadata.json`.

Run `npm run generate:metadata` whenever mushaf assets or navigation metadata inputs change.

## Coding Style & Naming Conventions

Use ES modules and keep files ASCII unless the file already contains Arabic text or metadata. Match the existing source style with 2-space indentation. Use descriptive camelCase for functions and variables, PascalCase only for constructor-like abstractions, and kebab-case for filenames such as `detail-logic.js`. Prefer small pure helpers in `src/data/` for logic that can be unit tested outside the DOM.

## RTL Reading & Page Arrangement

This app follows standard mushaf reading conventions, so preserve RTL behavior in both layout and navigation. Quran text lines must render in `dir="rtl"` order, and page browsing must respect mushaf order: page `1` is the rightmost starting point and page `604` is the far-left end of the full sequence. In juz strips, juz grids, and page grids, keep RTL visual ordering intact rather than converting them to left-to-right.

When changing reader interactions, keep the current mental model stable:
- keyboard: `ArrowLeft` moves to the next page, `ArrowRight` moves to the previous page
- swipe: swipe left goes to the previous mushaf page, swipe right goes to the next page

Ayah or transition logic must remain page-local to the currently visible page. If you touch reader rendering, verify line fitting, ayah-marker placement, and target highlighting on real mushaf pages instead of assuming generic text layout behavior.

## Testing Guidelines

Tests use Node's built-in runner with `node:test` and `assert/strict`. Add or update targeted `*.test.js` files alongside any logic change. Favor pure-function tests for parsing, metadata, storage, and reader behavior. Before finishing a change, run both `npm test` and `npm run check`.

## Commit & Pull Request Guidelines

The current history uses short, imperative commit messages such as `Add Cloudflare Pages build output` and `Initial tap hifz app`. Keep that style: concise, action-first, and scoped to one change. For pull requests, include a clear summary, note any generated metadata changes, link related issues, and attach screenshots or short screen recordings for UI-affecting work.

## Security & Configuration Tips

Do not hand-edit large generated metadata files unless necessary; update the generator script instead. Keep service worker and offline asset changes in sync with `src/data/offline-assets.js` and `sw.js`.
