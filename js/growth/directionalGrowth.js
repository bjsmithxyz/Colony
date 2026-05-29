import { CONSTANTS } from '../constants.js';
import { directionToAngle } from '../utils.js';
import { addPixelAndCheckMerge, addPixelIfMissing, chooseEdgePixelTowards, queueMergeCheck } from './pixelOps.js';

export function growInDirection(manager, direction, pixels) {
    const { node, growthDirections } = manager;
    const growthData = growthDirections[direction];

    for (let i = 0; i < pixels; i++) {
        let growthCost = 1.0;
        if (node.simulation?.terrainMap) {
            const angle = directionToAngle(direction);
            const nextX = node.x + Math.cos(angle) * (growthData.length + 1);
            const nextY = node.y + Math.sin(angle) * (growthData.length + 1);
            growthCost = node.simulation.terrainMap.getGrowthCost(nextX, nextY, direction);
        }

        if (growthCost > 1.5 && Math.random() < (growthCost - 1.0) * 0.3) {
            continue;
        }

        addPixelInDirection(manager, direction);
        growthData.length++;
        manager.totalGrowth++;

        if (growthData.length % CONSTANTS.SUPPORT_MILESTONE_INTERVAL === 0) {
            const requiredSupport = Math.floor(growthData.length / CONSTANTS.SUPPORT_MILESTONE_INTERVAL) * CONSTANTS.SUPPORT_PIXELS_PER_MILESTONE;
            if (growthData.supportLevel < requiredSupport) {
                const supportToAdd = requiredSupport - growthData.supportLevel;
                addSupportPixels(manager, direction, supportToAdd);
                growthData.supportLevel = requiredSupport;
            }
        }

        try {
            const nodeCfg = node?.simulation?.CONFIG?.NODE;
            const branchChance = (nodeCfg && typeof nodeCfg.GROWTH_RANDOM_DIR_CHANGE === 'number')
                ? nodeCfg.GROWTH_RANDOM_DIR_CHANGE
                : 0.2;

            if (Math.random() < branchChance) {
                const dirs = Object.keys(growthDirections);
                const directionIndex = dirs.indexOf(direction);
                const adjacentIndices = [
                    (directionIndex - 1 + dirs.length) % dirs.length,
                    (directionIndex + 1) % dirs.length
                ];

                let pickIndex;
                if (Math.random() < 0.7 && adjacentIndices.length > 0) {
                    pickIndex = adjacentIndices[Math.floor(Math.random() * adjacentIndices.length)];
                } else {
                    const alternatives = dirs.filter((_, idx) => idx !== directionIndex);
                    pickIndex = dirs.indexOf(alternatives[Math.floor(Math.random() * alternatives.length)]);
                }

                const pick = dirs[pickIndex];
                addPixelInDirection(manager, pick);
                growthDirections[pick].length++;
                manager.totalGrowth++;
            }
        } catch (e) {}
    }
}

export function addPixelInDirection(manager, direction) {
    const { node } = manager;
    const cfgNode = node.simulation ? node.simulation.CONFIG.NODE : null;
    const jitter = (cfgNode && typeof cfgNode.GROWTH_ANGLE_JITTER === 'number') ? cfgNode.GROWTH_ANGLE_JITTER : CONSTANTS.DEFAULT_GROWTH_ANGLE_JITTER;
    const maxOutwardSteps = (cfgNode && typeof cfgNode.GROWTH_STEP_MAX === 'number') ? cfgNode.GROWTH_STEP_MAX : CONSTANTS.MAX_GROWTH_STEPS;

    let baseAngle = null;
    if (typeof direction === 'string') baseAngle = directionToAngle(direction);
    else if (typeof direction === 'number') baseAngle = direction;
    else if (direction && typeof direction.dx === 'number' && typeof direction.dy === 'number') {
        baseAngle = Math.atan2(direction.dy, direction.dx);
    }
    if (baseAngle === null || typeof baseAngle === 'undefined') return;

    const jitterAmount = (Math.random() * 2 - 1) * jitter;
    const angle = baseAngle + jitterAmount * 0.7;

    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const start = chooseEdgePixelTowards(node, Math.round(vx), Math.round(vy)) || { dx: 0, dy: 0 };

    let fx = start.dx + 0.0;
    let fy = start.dy + 0.0;
    let steps = 0;
    let added = false;
    while (steps < maxOutwardSteps && !added) {
        fx += vx;
        fy += vy;
        const nx = Math.round(fx);
        const ny = Math.round(fy);
        if (node.hasPixel && node.hasPixel(nx, ny)) { steps++; continue; }
        if (addPixelAndCheckMerge(manager, nx, ny)) {
            added = true;
            break;
        }
    }

    if (!added) {
        const tryOffsets = CONSTANTS.NEIGHBOR_OFFSETS.map(([x, y]) => ({ x, y }));
        for (let a = 0; a < tryOffsets.length; a++) {
            const o = tryOffsets[Math.floor(Math.random() * tryOffsets.length)];
            const tx = start.dx + o.x;
            const ty = start.dy + o.y;
            if (!(node.hasPixel && node.hasPixel(tx, ty))) {
                if (addPixelAndCheckMerge(manager, tx, ty)) break;
            }
        }
    }
}

export function addSupportPixels(manager, direction, count) {
    const { node } = manager;
    const directionVectors = {
        north: { dx: 0, dy: -1, perpendicular: [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }] },
        northeast: { dx: 1, dy: -1, perpendicular: [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }] },
        east: { dx: 1, dy: 0, perpendicular: [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }] },
        southeast: { dx: 1, dy: 1, perpendicular: [{ dx: 0, dy: -1 }, { dx: -1, dy: 0 }] },
        south: { dx: 0, dy: 1, perpendicular: [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }] },
        southwest: { dx: -1, dy: 1, perpendicular: [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }] },
        west: { dx: -1, dy: 0, perpendicular: [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }] },
        northwest: { dx: -1, dy: -1, perpendicular: [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }] }
    };

    const vector = directionVectors[direction];
    if (!vector) return;

    const growthPixels = node.pixels.filter(pixel => {
        const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
        return distance > 0 && distance <= 3;
    }).sort((a, b) => {
        const distA = Math.abs(a.dx) + Math.abs(a.dy);
        const distB = Math.abs(b.dx) + Math.abs(b.dy);
        return distA - distB;
    });

    let supportAdded = 0;
    for (let attempt = 0; attempt < count * 3 && supportAdded < count; attempt++) {
        if (growthPixels.length === 0) break;

        const pixelIndex = Math.min(attempt % growthPixels.length, growthPixels.length - 1);
        const growthPixel = growthPixels[pixelIndex];
        const perpendicular = vector.perpendicular[attempt % 2];
        const supportPixel = {
            dx: growthPixel.dx + perpendicular.dx,
            dy: growthPixel.dy + perpendicular.dy
        };

        if (!node.hasPixel(supportPixel.dx, supportPixel.dy)) {
            if (node.addPixel(supportPixel.dx, supportPixel.dy, { deferMaintenance: true })) {
                supportAdded++;
                queueMergeCheck(manager, supportPixel.dx, supportPixel.dy);
            }
        }
    }
}
