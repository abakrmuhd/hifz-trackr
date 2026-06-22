# Mushaf Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reading-page `.mushaf` width track realistically against `.page-shell` so the text block stays inset instead of expanding to a print-scale intrinsic width.

**Architecture:** Keep the current reader markup and typography, but constrain the `.mushaf` container itself with a shell-relative width and centered alignment. This fixes the proportion at the container level without changing the line rendering logic.

**Tech Stack:** Vanilla CSS, existing static app shell, `npm.cmd run check`, in-app browser verification

---

### Task 1: Constrain mushaf width to the page shell

**Files:**
- Modify: `src/styles.css`
- Test: `npm.cmd run check`

- [ ] **Step 1: Update the mushaf width rule**

Set `.mushaf` to a centered width that tracks the page shell:

```css
.mushaf {
  width: 88%;
  max-width: 100%;
  margin-inline: auto;
}
```

- [ ] **Step 2: Run the project verification**

Run: `npm.cmd run check`
Expected: PASS

- [ ] **Step 3: Verify the rendered proportion**

Reload the reader in the in-app browser and confirm the mushaf text block stays visibly inset inside `.page-shell` instead of sizing to an oversized intrinsic width.
