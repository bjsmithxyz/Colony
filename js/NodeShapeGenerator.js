import { CONFIG } from './config.js';

/**
 * Node Shape Generator
 * Handles organic shape generation and pixel management for nodes
 */
export class NodeShapeGenerator {
    constructor(node) {
        this.node = node;
    }

    /**
     * Generate initial organic shape for the node
     */
    generateOrganicShape() {
        // Generate a small organic cluster of pixels around the center
        const visited = new Set();
        const toVisit = [[0, 0]]; // Relative to node center
        const targetPixels = CONFIG.NODE.SIZE * CONFIG.NODE.SIZE; // Start with area equivalent to original square
        
        while (this.node.pixels.length < targetPixels && toVisit.length > 0) {
            const [dx, dy] = toVisit.shift();
            const key = `${dx},${dy}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Add this pixel to the node (use helper for pixelSet/edge tracking)
            if (this.node && typeof this.node.addPixel === 'function') {
                this.node.addPixel(dx, dy);
            } else {
                this.node.pixels.push({ dx, dy });
            }
            
            // Add neighbors to queue with organic probability
            if (this.node.pixels.length < targetPixels) {
                const neighbors = [
                    [dx + 1, dy], [dx - 1, dy],
                    [dx, dy + 1], [dx, dy - 1],
                    [dx + 1, dy + 1], [dx - 1, dy - 1],
                    [dx + 1, dy - 1], [dx - 1, dy + 1]
                ];
                
                neighbors.forEach(([nx, ny]) => {
                    if (!visited.has(`${nx},${ny}`)) {
                        toVisit.push([nx, ny]);
                    }
                });
            }
        }
    }

    /**
     * Find the closest pixel in the node to given coordinates
     */
    getClosestPixelTo(x, y) {
        let closestPixel = null;
        let minDistance = Infinity;

        const candidates = this.node.edgePixels?.size > 0
            ? Array.from(this.node.edgePixels, key => {
                const [dx, dy] = key.split(',').map(Number);
                return { dx, dy };
            })
            : this.node.pixels;

        for (const pixel of candidates) {
            const px = this.node.x + pixel.dx;
            const py = this.node.y + pixel.dy;
            const dx = x - px;
            const dy = y - py;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < minDistance) {
                minDistance = distanceSq;
                closestPixel = { x: px, y: py, pixel };
            }
        }

        return closestPixel;
    }

    /**
     * Calculate bounding box of the node's pixels
     */
    getBounds() {
        // Prefer cached bounds if available (updated in Node.addPixel)
        if (this.node.bounds && typeof this.node.bounds.minX === 'number') {
            return {
                minX: this.node.bounds.minX,
                maxX: this.node.bounds.maxX,
                minY: this.node.bounds.minY,
                maxY: this.node.bounds.maxY
            };
        }

        if (this.node.pixels.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }

        return {
            minX: Math.min(...this.node.pixels.map(p => p.dx)),
            maxX: Math.max(...this.node.pixels.map(p => p.dx)),
            minY: Math.min(...this.node.pixels.map(p => p.dy)),
            maxY: Math.max(...this.node.pixels.map(p => p.dy))
        };
    }
}
