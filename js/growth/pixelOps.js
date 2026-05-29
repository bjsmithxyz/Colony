import { checkForMerge } from './mergeDetection.js';

export function addPixelIfMissing(manager, dx, dy) {
    const { node } = manager;
    if (node && typeof node.addPixel === 'function') {
        try {
            if (manager._dbg()) {
                console.log('Attempt addPixel', node.x, node.y, dx, dy);
            }
        } catch (e) {}
        return node.addPixel(dx, dy);
    }

    const exists = node.pixels.some(p => p.dx === dx && p.dy === dy);
    if (!exists) node.pixels.push({ dx, dy });
    if (node && typeof node.markRendererDirty === 'function') {
        node.markRendererDirty();
    }
    return true;
}

export function addPixelAndCheckMerge(manager, dx, dy) {
    if (addPixelIfMissing(manager, dx, dy)) {
        checkForMerge(manager, dx, dy);
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
