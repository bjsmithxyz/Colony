import { CONSTANTS } from '../constants.js';
import { addPixelAndCheckMerge, addPixelIfMissing, chooseEdgePixelTowards, findNearestEdgePixel } from './pixelOps.js';

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

    const maxSteps = 6;
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
        growTowardFallback(manager, relX, relY);
        return;
    }

    const thickness = (node.simulation && node.simulation.CONFIG.NODE.GROWTH_THICKNESS) || 1;
    for (const newPixel of path) {
        addPixelAndCheckMerge(manager, newPixel.dx, newPixel.dy);
        for (let t = 1; t <= thickness; t++) {
            addPixelIfMissing(manager, newPixel.dx + t, newPixel.dy);
            addPixelIfMissing(manager, newPixel.dx - t, newPixel.dy);
            addPixelIfMissing(manager, newPixel.dx, newPixel.dy + t);
            addPixelIfMissing(manager, newPixel.dx, newPixel.dy - t);
        }

        const branchChance = (node.simulation && node.simulation.CONFIG.NODE.GROWTH_BRANCH_CHANCE) || 0.12;
        if (Math.random() < branchChance) {
            const neighbors = [
                { x: newPixel.dx + 1, y: newPixel.dy }, { x: newPixel.dx - 1, y: newPixel.dy },
                { x: newPixel.dx, y: newPixel.dy + 1 }, { x: newPixel.dx, y: newPixel.dy - 1 },
                { x: newPixel.dx + 1, y: newPixel.dy + 1 }, { x: newPixel.dx - 1, y: newPixel.dy - 1 },
                { x: newPixel.dx + 1, y: newPixel.dy - 1 }, { x: newPixel.dx - 1, y: newPixel.dy + 1 }
            ];
            const branchCandidates = neighbors.filter(nb => !node.hasPixel(nb.x, nb.y));
            if (branchCandidates.length > 0) {
                const b = branchCandidates[Math.floor(Math.random() * branchCandidates.length)];
                addPixelAndCheckMerge(manager, b.x, b.y);
            }
        }

        const forkExtraChance = (node.simulation && typeof node.simulation.CONFIG.NODE.GROWTH_BRANCH_CHANCE === 'number')
            ? (node.simulation.CONFIG.NODE.GROWTH_BRANCH_CHANCE * 0.6)
            : 0.07;
        if (Math.random() < forkExtraChance) {
            const nearby = node.pixels.filter(p =>
                Math.abs(p.dx - newPixel.dx) <= 2 &&
                Math.abs(p.dy - newPixel.dy) <= 2 &&
                !(p.dx === newPixel.dx && p.dy === newPixel.dy)
            );
            if (nearby.length > 0) {
                const src = nearby[Math.floor(Math.random() * nearby.length)];
                const cand = [
                    { x: src.dx + 1, y: src.dy }, { x: src.dx - 1, y: src.dy },
                    { x: src.dx, y: src.dy + 1 }, { x: src.dx, y: src.dy - 1 },
                    { x: src.dx + 1, y: src.dy + 1 }, { x: src.dx - 1, y: src.dy - 1 }
                ];
                const picked = cand[Math.floor(Math.random() * cand.length)];
                addPixelAndCheckMerge(manager, picked.x, picked.y);
            }
        }
    }
}

function growTowardFallback(manager, relX, relY) {
    const { node } = manager;
    try {
        const edgeCandidates = [];
        const edgeSet = node.edgePixels;
        if (edgeSet && edgeSet.size > 0) {
            for (const k of edgeSet) {
                const [ex, ey] = k.split(',').map(Number);
                edgeCandidates.push({ dx: ex, dy: ey });
            }
        } else if (node.pixels?.length > 0) {
            for (const p of node.pixels) edgeCandidates.push(p);
        } else {
            edgeCandidates.push({ dx: 0, dy: 0 });
        }

        for (let a = edgeCandidates.length - 1; a > 0; a--) {
            const j = Math.floor(Math.random() * (a + 1));
            [edgeCandidates[a], edgeCandidates[j]] = [edgeCandidates[j], edgeCandidates[a]];
        }

        const tryOffsets = CONSTANTS.NEIGHBOR_OFFSETS.map(([x, y]) => ({ x, y }));
        let added = false;
        const maxAttempts = Math.min(6, edgeCandidates.length);
        for (let attempt = 0; attempt < maxAttempts && !added; attempt++) {
            const candidate = edgeCandidates[attempt];
            const vx = candidate.dx;
            const vy = candidate.dy;
            let norm = { x: 0, y: 0 };
            if (vx === 0 && vy === 0) {
                norm = tryOffsets[Math.floor(Math.random() * tryOffsets.length)];
            } else {
                norm.x = vx === 0 ? 0 : (vx > 0 ? 1 : -1);
                norm.y = vy === 0 ? 0 : (vy > 0 ? 1 : -1);
            }

            for (let off = 0; off < tryOffsets.length && !added; off++) {
                const o = tryOffsets[Math.floor(Math.random() * tryOffsets.length)];
                const tx = candidate.dx + norm.x + o.x;
                const ty = candidate.dy + norm.y + o.y;
                if (!(node.hasPixel && node.hasPixel(tx, ty))) {
                    if (manager._dbg()) console.log('growTowardWorldPoint fallback add', tx, ty, 'from candidate', candidate, 'target', relX, relY);
                    if (addPixelAndCheckMerge(manager, tx, ty)) {
                        added = true;
                        break;
                    }
                }
            }
        }
        if (!added && manager._dbg()) console.log('growTowardWorldPoint fallback: no empty candidate found');
    } catch (e) {}
}
