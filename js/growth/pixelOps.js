import { checkForMerge } from './mergeDetection.js';

export function queueMergeCheck(manager, dx, dy) {
    if (!manager._pendingMerges) manager._pendingMerges = [];
    manager._pendingMerges.push({ dx, dy });
}

export function flushPendingMerges(manager) {
    if (!manager._pendingMerges?.length) return;
    const pending = manager._pendingMerges;
    manager._pendingMerges = [];
    for (const { dx, dy } of pending) {
        if (checkForMerge(manager, dx, dy)) break;
    }
}

export function addPixelIfMissing(manager, dx, dy) {
    const { node } = manager;
    if (node && typeof node.addPixel === 'function') {
        return node.addPixel(dx, dy, { deferMaintenance: true });
    }

    const exists = node.pixels.some(p => p.dx === dx && p.dy === dy);
    if (!exists) node.pixels.push({ dx, dy });
    return true;
}

export function addPixelAndCheckMerge(manager, dx, dy) {
    if (addPixelIfMissing(manager, dx, dy)) {
        queueMergeCheck(manager, dx, dy);
        return true;
    }
    return false;
}

export function chooseEdgePixelTowards(node, targetX, targetY) {
    const edgeSet = node.edgePixels;
    if (edgeSet && edgeSet.size > 0) {
        let best = null;
        let bestProj = -Infinity;
        for (const key of edgeSet) {
            const [sx, sy] = key.split(',').map(Number);
            const proj = sx * targetX + sy * targetY;
            if (proj > bestProj) { bestProj = proj; best = { dx: sx, dy: sy }; }
        }
        return best;
    }

    if (!node.pixels || node.pixels.length === 0) return null;
    let best = null;
    let bestProj = -Infinity;
    for (const p of node.pixels) {
        const proj = p.dx * targetX + p.dy * targetY;
        if (proj > bestProj) { bestProj = proj; best = p; }
    }
    return best;
}

export function findNearestEdgePixel(node, x, y) {
    const edgeSet = node.edgePixels;
    if (!edgeSet || edgeSet.size === 0) return null;
    let best = null;
    let bestDist = Infinity;
    for (const key of edgeSet) {
        const [sx, sy] = key.split(',').map(Number);
        const dx = sx - x;
        const dy = sy - y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = { dx: sx, dy: sy }; }
    }
    return best;
}
