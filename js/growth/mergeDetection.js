import { CONSTANTS } from '../constants.js';

/** Check if a newly added pixel should trigger a merge with another node. */
export function checkForMerge(manager, dx, dy) {
    const { node } = manager;
    const simulation = node.simulation;
    if (!simulation) return false;

    const worldX = node.x + dx;
    const worldY = node.y + dy;

    for (const other of simulation.nodes) {
        if (other === node) continue;

        let contactCount = 0;
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const relX = worldX + ox - other.x;
                const relY = worldY + oy - other.y;
                if (other.hasPixel?.(relX, relY)) {
                    contactCount++;
                }
            }
        }

        if (contactCount >= CONSTANTS.MERGE_CONTACT_THRESHOLD) {
            simulation.mergeNodes(node, other);
            return true;
        }
    }

    return false;
}
