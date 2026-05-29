import { CONSTANTS } from '../constants.js';

/** Check if a newly added pixel should trigger a merge with another node. */
export function checkForMerge(manager, dx, dy) {
    const { node } = manager;
    if (!node.simulation) return false;

    const worldX = node.x + dx;
    const worldY = node.y + dy;

    const candidates = node.simulation.nodeGrid.queryBox({
        minX: worldX - 1,
        minY: worldY - 1,
        maxX: worldX + 1,
        maxY: worldY + 1
    });

    for (const other of candidates) {
        if (other === node) continue;

        let contactCount = 0;
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const nx = worldX + ox;
                const ny = worldY + oy;
                const relX = nx - other.x;
                const relY = ny - other.y;
                if (other.hasPixel && other.hasPixel(relX, relY)) {
                    contactCount++;
                }
            }
        }

        if (contactCount >= CONSTANTS.MERGE_CONTACT_THRESHOLD) {
            node.simulation.mergeNodes(node, other);
            return true;
        }
    }

    return false;
}
