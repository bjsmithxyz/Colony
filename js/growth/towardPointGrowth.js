import { CONSTANTS } from '../constants.js';
import { addPixelAndCheckMerge, chooseEdgePixelTowards, findNearestEdgePixel } from './pixelOps.js';

export function growTowardWorldPoint(manager, worldPoint) {
    const { node } = manager;
    const targetX = Math.round(worldPoint.x) - node.x;
    const targetY = Math.round(worldPoint.y) - node.y;

    let startPixel = chooseEdgePixelTowards(node, targetX, targetY) || { dx: 0, dy: 0 };
    const relX = targetX;
    const relY = targetY;
    if (node.hasPixel(relX, relY)) {
        const nearest = findNearestEdgePixel(node, relX, relY);
        if (nearest) startPixel = nearest;
    }

    const maxSteps = 2;
    const path = [];
    let sx = startPixel.dx;
    let sy = startPixel.dy;
    for (let step = 0; step < maxSteps; step++) {
        const dx = relX - sx;
        const dy = relY - sy;
        if (dx === 0 && dy === 0) break;

        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        let stepX = 0;
        let stepY = 0;
        if (adx > ady * 1.2) {
            stepX = dx > 0 ? 1 : -1;
        } else if (ady > adx * 1.2) {
            stepY = dy > 0 ? 1 : -1;
        } else {
            stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
            stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
        }

        const nx = sx + stepX;
        const ny = sy + stepY;
        if (node.hasPixel(nx, ny)) {
            sx = nx;
            sy = ny;
            continue;
        }
        path.push({ dx: nx, dy: ny });
        sx = nx;
        sy = ny;
    }

    if (path.length === 0) {
        if (node.hasPixel(relX, relY)) return;
        growTowardFallback(manager);
        return;
    }

    const branchChance = node.simulation?.CONFIG?.NODE?.GROWTH_BRANCH_CHANCE ?? 0;
    for (const newPixel of path) {
        addPixelAndCheckMerge(manager, newPixel.dx, newPixel.dy);
        if (branchChance > 0 && Math.random() < branchChance) {
            const neighbors = [
                [newPixel.dx + 1, newPixel.dy], [newPixel.dx - 1, newPixel.dy],
                [newPixel.dx, newPixel.dy + 1], [newPixel.dx, newPixel.dy - 1]
            ];
            for (const [bx, by] of neighbors) {
                if (!node.hasPixel(bx, by) && Math.random() < 0.5) {
                    addPixelAndCheckMerge(manager, bx, by);
                    break;
                }
            }
        }
    }
}

function growTowardFallback(manager) {
    const { node } = manager;
    const edgeSet = node.edgePixels;
    if (!edgeSet?.size) return;

    const keys = Array.from(edgeSet);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const [ex, ey] = key.split(',').map(Number);
    for (const [ox, oy] of CONSTANTS.NEIGHBOR_OFFSETS) {
        const tx = ex + ox;
        const ty = ey + oy;
        if (!node.hasPixel(tx, ty) && addPixelAndCheckMerge(manager, tx, ty)) return;
    }
}
