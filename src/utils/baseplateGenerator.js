/**
 * Baseplate Generator
 * Splits large drawers into printer-bed-sized baseplate sections
 */

const GRIDFINITY_UNIT = 42; // mm

/**
 * Generate baseplates optimized for printer bed size
 * @param {Object} project - Project with drawerWidth, drawerDepth, printerBedWidth, printerBedDepth, baseplateWithMagnets
 * @returns {Array} - Array of baseplate plate objects
 */
export function generateBaseplates(project) {
  const {
    drawerWidth,
    drawerDepth,
    printerBedWidth,
    printerBedDepth,
    baseplateWithMagnets
  } = project;

  // Calculate how many sections needed in each direction
  const cols = Math.ceil(drawerWidth / printerBedWidth);
  const rows = Math.ceil(drawerDepth / printerBedDepth);

  const baseplates = [];
  let baseplateIndex = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Calculate baseplate dimensions
      const startX = col * printerBedWidth;
      const startY = row * printerBedDepth;
      const endX = Math.min(startX + printerBedWidth, drawerWidth);
      const endY = Math.min(startY + printerBedDepth, drawerDepth);

      let width = endX - startX;
      let depth = endY - startY;

      // Snap to gridfinity grid (must be multiples of 42mm)
      const gridWidth = Math.floor(width / GRIDFINITY_UNIT);
      const gridDepth = Math.floor(depth / GRIDFINITY_UNIT);

      width = gridWidth * GRIDFINITY_UNIT;
      depth = gridDepth * GRIDFINITY_UNIT;

      // Only create baseplate if it's at least 1 unit in both dimensions
      if (gridWidth > 0 && gridDepth > 0) {
        baseplates.push({
          id: `baseplate-${row}-${col}`,
          name: `Baseplate ${baseplateIndex + 1}`,
          type: 'baseplate',
          width,
          depth,
          status: 'none',
          items: [{
            binId: null,
            x: 0,
            y: 0,
            width,
            depth,
            rotation: 0,
            label: `${gridWidth}×${gridDepth} units (${width}×${depth}mm)`,
            binData: {
              gridWidth,
              gridDepth,
              hasMagnets: baseplateWithMagnets
            }
          }]
        });
        baseplateIndex++;
      }
    }
  }

  return baseplates;
}

/**
 * Quick calculation of baseplate count (for UI preview)
 * @param {number} drawerWidth - Drawer width in mm
 * @param {number} drawerDepth - Drawer depth in mm
 * @param {number} printerBedWidth - Printer bed width in mm
 * @param {number} printerBedDepth - Printer bed depth in mm
 * @returns {number} - Estimated number of baseplates
 */
export function calculateBaseplateCount(drawerWidth, drawerDepth, printerBedWidth, printerBedDepth) {
  const cols = Math.ceil(drawerWidth / printerBedWidth);
  const rows = Math.ceil(drawerDepth / printerBedDepth);
  return cols * rows;
}
