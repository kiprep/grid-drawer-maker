/**
 * Print Queue Helper Functions
 * Utilities for hash generation, localStorage management, and progress calculation
 */

/**
 * Generate a stable hash from bins array to detect changes
 * @param {Array} bins - Array of bin objects
 * @returns {string} - Hash string
 */
export function generateBinsHash(bins) {
  if (!bins || bins.length === 0) {
    return 'empty';
  }

  // Sort bins by ID for stable hashing
  const sortedBins = [...bins].sort((a, b) => a.id.localeCompare(b.id));

  // Create a stable string representation using only relevant properties
  const hashString = JSON.stringify(sortedBins.map(bin => ({
    id: bin.id,
    type: bin.type,
    width: bin.width,
    depth: bin.depth,
    height: bin.height,
    x: bin.x,
    y: bin.y
  })));

  return simpleHash(hashString);
}

/**
 * Simple hash function for strings
 * @param {string} str - String to hash
 * @returns {string} - Hash value
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Load print queue from localStorage
 * @param {string} projectId - Project identifier
 * @returns {Object|null} - Print queue data or null if not found
 */
export function loadPrintQueue(projectId) {
  try {
    const stored = localStorage.getItem(`print-queue-${projectId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading print queue:', error);
    return null;
  }
}

/**
 * Save print queue to localStorage
 * @param {string} projectId - Project identifier
 * @param {Object} queueData - Print queue data to save
 */
export function savePrintQueue(projectId, queueData) {
  try {
    localStorage.setItem(`print-queue-${projectId}`, JSON.stringify(queueData));
  } catch (error) {
    console.error('Error saving print queue:', error);
  }
}

/**
 * Get all failed bin items across all plates
 * @param {Array} plates - Array of plate objects
 * @returns {Array} - Array of failed items with their source plate info
 */
export function getFailedBins(plates) {
  if (!plates) return [];

  const failed = [];
  for (const plate of plates) {
    if (!plate.items) continue;
    for (const item of plate.items) {
      if (item.status === 'failed') {
        failed.push(item);
      }
    }
  }
  return failed;
}

/**
 * Check if any plates have failed bins
 * @param {Array} plates - Array of plate objects
 * @returns {boolean} - True if any failed bins exist
 */
export function hasFailedBins(plates) {
  return getFailedBins(plates).length > 0;
}

/**
 * Calculate overall progress from plates
 * @param {Array} plates - Array of plate objects
 * @returns {Object} - Progress object with total, completed, percentage
 */
export function calculateProgress(plates) {
  if (!plates || plates.length === 0) {
    return { total: 0, completed: 0, failed: 0, percentage: 0 };
  }

  const total = plates.length;
  const completed = plates.filter(p => p.status === 'done').length;
  const failed = plates.filter(p => p.status === 'failed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, failed, percentage };
}

/**
 * Check if print queue needs regeneration
 * @param {Object} storedQueue - Stored print queue data
 * @param {Array} currentBins - Current project bins
 * @returns {boolean} - True if regeneration needed
 */
export function shouldRegeneratePlates(storedQueue, currentBins) {
  if (!storedQueue) {
    return true;
  }

  const currentHash = generateBinsHash(currentBins);
  return storedQueue.projectBinsHash !== currentHash;
}

/**
 * Attempt to preserve plate statuses when regenerating
 * @param {Array} oldPlates - Previous plates array
 * @param {Array} newPlates - Newly generated plates
 * @returns {Array} - New plates with preserved statuses where possible
 */
export function preservePlateStatuses(oldPlates, newPlates) {
  if (!oldPlates || oldPlates.length === 0) {
    return newPlates;
  }

  // Create a map of old plates by a stable key (skip reprint plates)
  const oldPlateMap = new Map();
  oldPlates.filter(p => p.type !== 'reprint').forEach(plate => {
    // Use plate type and dimensions as key
    const key = `${plate.type}-${plate.width}-${plate.depth}`;
    if (!oldPlateMap.has(key)) {
      oldPlateMap.set(key, []);
    }
    oldPlateMap.get(key).push(plate);
  });

  // Try to match new plates with old ones
  return newPlates.map(newPlate => {
    const key = `${newPlate.type}-${newPlate.width}-${newPlate.depth}`;
    const matches = oldPlateMap.get(key);

    if (matches && matches.length > 0) {
      // Found a match - preserve status and remove from available matches
      const match = matches.shift();
      return { ...newPlate, status: match.status };
    }

    return newPlate;
  });
}
