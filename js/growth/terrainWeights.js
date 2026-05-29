import { directionToAngle } from '../utils.js';

const BASE_WEIGHTS = {
    north: 2, south: 2, east: 2, west: 2,
    northeast: 1, northwest: 1, southeast: 1, southwest: 1
};

/** Build a weighted direction list, adjusted for terrain when available. */
export function buildWeightedDirections(node, growthDirections) {
    const dirs = Object.keys(growthDirections);
    const weighted = [];
    const terrainMap = node.simulation?.terrainMap;

    if (terrainMap) {
        for (const d of dirs) {
            const baseWeight = BASE_WEIGHTS[d] || 1;
            const angle = directionToAngle(d);
            const checkX = node.x + Math.cos(angle) * 10;
            const checkY = node.y + Math.sin(angle) * 10;
            const terrainCost = terrainMap.getGrowthCost(checkX, checkY, d);
            const terrainWeight = Math.max(0.3, 2.0 - terrainCost);
            const adjustedWeight = Math.floor(baseWeight * terrainWeight);
            for (let k = 0; k < adjustedWeight; k++) weighted.push(d);
        }
    } else {
        for (const d of dirs) {
            const w = BASE_WEIGHTS[d] || 1;
            for (let k = 0; k < w; k++) weighted.push(d);
        }
    }

    return weighted;
}

export function pickRandomDirection(node, growthDirections) {
    const weighted = buildWeightedDirections(node, growthDirections);
    return weighted[Math.floor(Math.random() * weighted.length)];
}
