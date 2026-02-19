# 3MF Positioning: Corner vs Center Origin

## The Problem

Exported 3MF plates were larger than the printer bed, even though the bin packer
correctly constrained items within bed dimensions.

## Root Cause

**CadQuery meshes are centered at XY origin.** A 1x1 gridfinity bin (42mm nominal)
spans roughly -20.75 to +20.75mm on each axis. The 3MF transform's `(xMm, yMm)`
places the **mesh center** at that coordinate.

The bin packer uses **corner-origin** coordinates: `item.x` is the top-left corner
of the bounding box. Sending corner positions as center positions shifts every item
by half its size. The first item on each plate extends into negative space, inflating
the total bounding box past the bed.

**Example:** Five 84mm bins packed at x = 0, 85, 170...
- Sending corner positions: mesh centers at 0, 85, 170 -> first bin extends -42 to +42
- Total X extent: -42 to 254 = 296mm on a 220mm bed

## The Fix

In `handleExport3MF`, convert corner to center before sending:

```javascript
xMm: item.x + item.width / 2,
yMm: item.y + item.depth / 2,
```

The server API docs (API.md lines 348-355) already documented this conversion.
We just weren't doing it.

## Bonus Bug: ITEM_GAP Not Working

The 1mm inter-item gap was also broken. The packer generated candidate positions at
exact item edges (`item.x + item.width`), then inflated the new item by 1mm during
overlap checks. But `rectanglesOverlap` uses `<=` (touching = not overlapping), so
a new item placed at the exact edge always passed — 0mm gap.

**Fix:** Bake the gap into candidate positions instead:

```javascript
// Before (broken): candidates at exact edges, inflation in overlap check
candidates.push({ x: item.x + item.width, y: item.y });

// After (working): gap-offset candidates, no inflation needed
candidates.push({ x: item.x + item.width + ITEM_GAP, y: item.y });
```

## Files Changed

- `src/pages/PrintQueuePage.jsx` — corner-to-center conversion in `handleExport3MF`
- `src/utils/binPacker.js` — gap-offset candidate positions in `generateCandidatePositions`,
  removed inflation from `canFitAt`

## Lesson

When an API says "center position" and your data structure stores "corner position",
the conversion is easy to forget — especially when everything looks right in the 2D
packer preview (which uses corner-origin). The bug only surfaces in the exported 3D file.
