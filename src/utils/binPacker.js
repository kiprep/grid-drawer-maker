/**
 * Bin Packer
 * 2D bin packing using First-Fit Decreasing with rotation support
 */

const GRIDFINITY_UNIT = 42; // mm

/**
 * Pack bins onto plates using First-Fit Decreasing algorithm
 * @param {Array} bins - Array of bin objects from project
 * @param {number} printerBedWidth - Maximum plate width in mm
 * @param {number} printerBedDepth - Maximum plate depth in mm
 * @returns {Array} - Array of plate objects with packed bins
 */
export function packBins(bins, printerBedWidth, printerBedDepth) {
  if (!bins || bins.length === 0) {
    return [];
  }

  // Convert bins to physical dimensions and prepare for packing
  const binItems = bins.map(bin => ({
    binId: bin.id,
    width: bin.width * GRIDFINITY_UNIT,
    depth: bin.depth * GRIDFINITY_UNIT,
    height: bin.height * 7, // Height in mm (for future print time estimation)
    label: bin.label || `${bin.type} bin`,
    binData: bin,
    rotation: 0,
    x: 0,
    y: 0
  }));

  // Sort by area (largest first) for better packing efficiency
  binItems.sort((a, b) => (b.width * b.depth) - (a.width * a.depth));

  const plates = [];

  // Try to pack each bin
  for (const binItem of binItems) {
    let placed = false;

    // Try to place in existing plates first
    for (const plate of plates) {
      if (tryPlaceOnPlate(binItem, plate, printerBedWidth, printerBedDepth)) {
        placed = true;
        break;
      }
    }

    // If not placed, try with 90° rotation
    if (!placed) {
      const rotatedItem = {
        ...binItem,
        width: binItem.depth,
        depth: binItem.width,
        rotation: 90
      };

      for (const plate of plates) {
        if (tryPlaceOnPlate(rotatedItem, plate, printerBedWidth, printerBedDepth)) {
          // Update original binItem with rotated placement
          Object.assign(binItem, rotatedItem);
          placed = true;
          break;
        }
      }
    }

    // If still not placed, create new plate
    if (!placed) {
      const newPlate = createNewPlate(plates.length + 1, printerBedWidth, printerBedDepth);

      // Try both orientations for the new plate
      const fitsNormal = binItem.width <= printerBedWidth && binItem.depth <= printerBedDepth;
      const fitsRotated = binItem.depth <= printerBedWidth && binItem.width <= printerBedDepth;

      if (fitsNormal) {
        // Place in normal orientation
        binItem.x = 0;
        binItem.y = 0;
        newPlate.items.push({ ...binItem });
        plates.push(newPlate);
      } else if (fitsRotated) {
        // Place in rotated orientation
        binItem.width = binItem.depth;
        binItem.depth = binItem.binData.width * GRIDFINITY_UNIT;
        binItem.rotation = 90;
        binItem.x = 0;
        binItem.y = 0;
        newPlate.items.push({ ...binItem });
        plates.push(newPlate);
      } else {
        // Bin is too large for printer bed - create oversized plate with warning
        plates.push(createOversizedBinPlate(binItem, plates.length + 1));
      }
    }
  }

  return plates;
}

/**
 * Try to place a bin item on a plate
 * @param {Object} binItem - Bin item to place
 * @param {Object} plate - Plate to place on
 * @param {number} maxWidth - Maximum plate width
 * @param {number} maxDepth - Maximum plate depth
 * @returns {boolean} - True if successfully placed
 */
function tryPlaceOnPlate(binItem, plate, maxWidth, maxDepth) {
  const positions = generateCandidatePositions(plate.items);

  for (const position of positions) {
    if (canFitAt(binItem, position.x, position.y, plate.items, maxWidth, maxDepth)) {
      binItem.x = position.x;
      binItem.y = position.y;
      plate.items.push({ ...binItem });
      return true;
    }
  }

  return false;
}

/**
 * Generate candidate positions using bottom-left heuristic
 * @param {Array} placedItems - Items already placed on plate
 * @returns {Array} - Array of {x, y} positions to try
 */
function generateCandidatePositions(placedItems) {
  const candidates = [{ x: 0, y: 0 }];

  // Add corners of each placed item as candidates
  for (const item of placedItems) {
    candidates.push({ x: item.x + item.width, y: item.y });
    candidates.push({ x: item.x, y: item.y + item.depth });
    candidates.push({ x: item.x + item.width, y: item.y + item.depth });
  }

  // Remove duplicates
  const uniqueCandidates = candidates.filter((pos, index, self) =>
    index === self.findIndex(p => p.x === pos.x && p.y === pos.y)
  );

  // Sort by bottom-left priority (y first, then x)
  uniqueCandidates.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  return uniqueCandidates;
}

/**
 * Check if a bin item can fit at a specific position
 * @param {Object} binItem - Bin item to check
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Array} placedItems - Items already on the plate
 * @param {number} maxWidth - Maximum plate width
 * @param {number} maxDepth - Maximum plate depth
 * @returns {boolean} - True if item fits without overlap
 */
function canFitAt(binItem, x, y, placedItems, maxWidth, maxDepth) {
  // Check bounds
  if (x + binItem.width > maxWidth || y + binItem.depth > maxDepth) {
    return false;
  }

  // Check overlap with existing items
  for (const item of placedItems) {
    if (rectanglesOverlap(
      x, y, binItem.width, binItem.depth,
      item.x, item.y, item.width, item.depth
    )) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two rectangles overlap
 * @param {number} x1 - First rectangle x
 * @param {number} y1 - First rectangle y
 * @param {number} w1 - First rectangle width
 * @param {number} d1 - First rectangle depth
 * @param {number} x2 - Second rectangle x
 * @param {number} y2 - Second rectangle y
 * @param {number} w2 - Second rectangle width
 * @param {number} d2 - Second rectangle depth
 * @returns {boolean} - True if rectangles overlap
 */
function rectanglesOverlap(x1, y1, w1, d1, x2, y2, w2, d2) {
  return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + d1 <= y2 || y2 + d2 <= y1);
}

/**
 * Create a new empty plate
 * @param {number} plateNumber - Plate number (1-indexed)
 * @param {number} width - Plate width
 * @param {number} depth - Plate depth
 * @returns {Object} - New plate object
 */
function createNewPlate(plateNumber, width, depth) {
  return {
    id: `bins-${plateNumber}`,
    name: `Bin Plate ${plateNumber}`,
    type: 'bins',
    width,
    depth,
    status: 'none',
    items: []
  };
}

/**
 * Create a plate for an oversized bin (larger than printer bed)
 * @param {Object} binItem - Oversized bin item
 * @param {number} plateNumber - Plate number
 * @returns {Object} - Plate object with warning
 */
function createOversizedBinPlate(binItem, plateNumber) {
  return {
    id: `bins-oversized-${plateNumber}`,
    name: `Bin Plate ${plateNumber} (⚠️ OVERSIZED)`,
    type: 'bins',
    width: binItem.width,
    depth: binItem.depth,
    status: 'none',
    items: [{
      ...binItem,
      x: 0,
      y: 0,
      label: `${binItem.label} (⚠️ Too large for printer bed!)`
    }],
    warning: 'This bin exceeds your printer bed dimensions'
  };
}
