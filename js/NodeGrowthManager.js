/**
 * Node Growth Manager
 * Handles all growth logic, direction tracking, and pixel expansion for nodes
 */
export class NodeGrowthManager {
    constructor(node) {
        this.node = node;
        
        // 8-directional growth tracking with support requirements
        this.growthDirections = {
            north: { length: 0, supportLevel: 0 },
            northeast: { length: 0, supportLevel: 0 },
            east: { length: 0, supportLevel: 0 },
            southeast: { length: 0, supportLevel: 0 },
            south: { length: 0, supportLevel: 0 },
            southwest: { length: 0, supportLevel: 0 },
            west: { length: 0, supportLevel: 0 },
            northwest: { length: 0, supportLevel: 0 }
        };
        this.totalGrowth = 0;
    }

    /**
     * Trigger growth based on food storage
     */
    processGrowth(amount, sourceDirection = null, depositLocation = null) {
        if (amount > 0) {
            const cfg = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
            const debug = this.node.simulation ? this.node.simulation.CONFIG.DEBUG : null;
            const perPixel = (cfg && cfg.FOOD_PER_PIXEL) ? cfg.FOOD_PER_PIXEL : 1;
            const oldPixels = Math.floor(this.node.lastFoodAmount / perPixel);
            const newPixels = Math.floor(this.node.food / perPixel);
            let delta = Math.max(0, newPixels - oldPixels);
            // apply safety cap if configured
            if (debug && typeof debug.MAX_GROWTH_PER_TICK === 'number') {
                delta = Math.min(delta, debug.MAX_GROWTH_PER_TICK);
            }
            if (delta > 0) {
                // If depositLocation provided, grow toward it delta times; otherwise grow randomly
                for (let i = 0; i < delta; i++) {
                    if (depositLocation) {
                        this.growTowardWorldPoint(depositLocation);
                    } else if (sourceDirection) {
                        this.growInDirection(sourceDirection, 1);
                    } else {
                        // fallback: small random growth
                        const dirs = Object.keys(this.growthDirections);
                        const dir = dirs[Math.floor(Math.random() * dirs.length)];
                        this.growInDirection(dir, 1);
                    }
                }
            }
        }
    }

    /**
     * Grow in a specific direction with pixel count
     */
    growInDirection(direction, pixels) {
        const growthData = this.growthDirections[direction];
        
        for (let i = 0; i < pixels; i++) {
            // Add length pixel first
            this.addPixelInDirection(direction);
            growthData.length++;
            this.totalGrowth++;
            
            // Check if we just reached a support milestone (5, 10, 15...)
            if (growthData.length % 5 === 0) {
                const requiredSupport = Math.floor(growthData.length / 5) * 2;
                if (growthData.supportLevel < requiredSupport) {
                    // Add support pixels after reaching milestone
                    const supportToAdd = requiredSupport - growthData.supportLevel;
                    this.addSupportPixels(direction, supportToAdd);
                    growthData.supportLevel = requiredSupport;
                }
            }
        }
    }

    /**
     * Add a single pixel in a direction
     */
    addPixelInDirection(direction) {
        const directionVectors = {
            north: { dx: 0, dy: -1 },
            northeast: { dx: 1, dy: -1 },
            east: { dx: 1, dy: 0 },
            southeast: { dx: 1, dy: 1 },
            south: { dx: 0, dy: 1 },
            southwest: { dx: -1, dy: 1 },
            west: { dx: -1, dy: 0 },
            northwest: { dx: -1, dy: -1 }
        };

        const vector = directionVectors[direction];
        if (!vector) return;

        // Find the furthest pixel in this direction and add a new one
        const existingPixels = this.node.pixels.filter(pixel => {
            const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
            return distance > 0;
        });

        let newPixel;
        if (existingPixels.length === 0) {
            // First pixel in this direction
            newPixel = { dx: vector.dx, dy: vector.dy };
        } else {
            // Find the furthest pixel
            const furthest = existingPixels.reduce((max, pixel) => {
                const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
                const maxDistance = max.dx * vector.dx + max.dy * vector.dy;
                return distance > maxDistance ? pixel : max;
            });

            newPixel = {
                dx: furthest.dx + vector.dx,
                dy: furthest.dy + vector.dy
            };
        }

        // Check if pixel already exists
        // use node.addPixel for fast set handling
        this.node.addPixel(newPixel.dx, newPixel.dy);
    }

    /**
     * Grow toward a world coordinate (depositLocation) using discrete stepping (Bresenham-like)
     */
    growTowardWorldPoint(worldPoint) {
        // Convert world point to relative pixel coordinates from node center
        const targetX = Math.round(worldPoint.x) - this.node.x;
        const targetY = Math.round(worldPoint.y) - this.node.y;

    // If the deposit lies on one of our existing pixels, start from that pixel to grow outward
    let startPixel = this._chooseEdgePixelTowards(targetX, targetY) || { dx: 0, dy: 0 };
    // If the worldPoint corresponds to a pixel on this node, prefer starting there
    const relX = targetX, relY = targetY;
    if (this.node.hasPixel(relX, relY)) startPixel = { dx: relX, dy: relY };

        // Build a short integer-stepped path (Bresenham-like) from startPixel toward (relX, relY)
        const maxSteps = 6; // cap path length per growth action
        const path = [];
        let sx = startPixel.dx, sy = startPixel.dy;
        for (let step = 0; step < maxSteps; step++) {
            const dx = relX - sx;
            const dy = relY - sy;
            if (dx === 0 && dy === 0) break;
            const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
            const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
            const nx = sx + stepX, ny = sy + stepY;
            // if pixel already exists, advance start to that pixel and continue
            if (this.node.hasPixel(nx, ny)) {
                sx = nx; sy = ny; continue;
            }
            path.push({ dx: nx, dy: ny });
            sx = nx; sy = ny;
        }

        // Apply path as a batch: add pixels and thickness and branching around each step
        const thickness = (this.node.simulation && this.node.simulation.CONFIG.NODE.GROWTH_THICKNESS) || 1;
        for (const newPixel of path) {
            this._addPixelIfMissing(newPixel.dx, newPixel.dy);
        const thickness = (this.node.simulation && this.node.simulation.CONFIG.NODE.GROWTH_THICKNESS) || 1;
            for (let t = 1; t <= thickness; t++) {
                this._addPixelIfMissing(newPixel.dx + t, newPixel.dy);
                this._addPixelIfMissing(newPixel.dx - t, newPixel.dy);
                this._addPixelIfMissing(newPixel.dx, newPixel.dy + t);
                this._addPixelIfMissing(newPixel.dx, newPixel.dy - t);
            }

        // Random branching: sometimes create additional neighbor pixels nearby
            // Random branching: sometimes create additional neighbor pixels nearby
            const branchChance = (this.node.simulation && this.node.simulation.CONFIG.NODE.GROWTH_BRANCH_CHANCE) || 0.12;
            if (Math.random() < branchChance) {
                // pick a nearby neighbor that's not already filled
                const neighbors = [
                    { x: newPixel.dx + 1, y: newPixel.dy },{ x: newPixel.dx - 1, y: newPixel.dy },
                    { x: newPixel.dx, y: newPixel.dy + 1 },{ x: newPixel.dx, y: newPixel.dy - 1 },
                    { x: newPixel.dx + 1, y: newPixel.dy + 1 },{ x: newPixel.dx - 1, y: newPixel.dy - 1 },
                    { x: newPixel.dx + 1, y: newPixel.dy - 1 },{ x: newPixel.dx - 1, y: newPixel.dy + 1 }
                ];
                const branchCandidates = neighbors.filter(nb => !this.node.hasPixel(nb.x, nb.y));
                if (branchCandidates.length > 0) {
                    const b = branchCandidates[Math.floor(Math.random() * branchCandidates.length)];
                    this._addPixelIfMissing(b.x, b.y);
                }
            }

        // Extra fork behavior: occasionally grow an additional step from a nearby existing pixel
            const forkExtraChance = (this.node.simulation && typeof this.node.simulation.CONFIG.NODE.GROWTH_BRANCH_CHANCE === 'number') ? (this.node.simulation.CONFIG.NODE.GROWTH_BRANCH_CHANCE * 0.6) : 0.07;
            if (Math.random() < forkExtraChance) {
                // find pixels near the newly added pixel within distance 2
                const nearby = this.node.pixels.filter(p => Math.abs(p.dx - newPixel.dx) <= 2 && Math.abs(p.dy - newPixel.dy) <= 2 && !(p.dx === newPixel.dx && p.dy === newPixel.dy));
                if (nearby.length > 0) {
                    const src = nearby[Math.floor(Math.random() * nearby.length)];
                    // pick a random neighbor of src and add it
                    const cand = [
                        { x: src.dx + 1, y: src.dy }, { x: src.dx - 1, y: src.dy },
                        { x: src.dx, y: src.dy + 1 }, { x: src.dx, y: src.dy - 1 },
                        { x: src.dx + 1, y: src.dy + 1 }, { x: src.dx - 1, y: src.dy - 1 }
                    ];
                    const picked = cand[Math.floor(Math.random() * cand.length)];
                    this._addPixelIfMissing(picked.x, picked.y);
                }
            }
        }

        // After adding, check for immediate merge: if the new pixel lies on another node, merge
        // After adding, check for immediate merge: require >=2 adjacent contact pixels to trigger merge
        if (this.node.simulation) {
            // count adjacent pixels belonging to other nodes around the endpoint of the path
            const endpoints = path.length > 0 ? [path[path.length-1]] : [];
            for (const ep of endpoints) {
                const worldX = this.node.x + ep.dx;
                const worldY = this.node.y + ep.dy;
                const candidates = this.node.simulation.nodeGrid.queryBox({ minX: worldX-1, minY: worldY-1, maxX: worldX+1, maxY: worldY+1 });
                for (const other of candidates) {
                    if (other === this.node) continue;
                    // count contacting pixels between this node and other within a 3x3 neighborhood
                    let contactCount = 0;
                    for (let oy = -1; oy <= 1; oy++) {
                        for (let ox = -1; ox <= 1; ox++) {
                            const nx = worldX + ox;
                            const ny = worldY + oy;
                            // check if other has a pixel at nx,ny
                            const relX = nx - other.x;
                            const relY = ny - other.y;
                            if (other.hasPixel && other.hasPixel(relX, relY)) contactCount++;
                        }
                    }
                    if (contactCount >= 2) {
                        this.node.simulation.mergeNodes(this.node, other);
                        return;
                    }
                }
            }
        }
    }

    _addPixelIfMissing(dx, dy) {
        if (this.node && typeof this.node.addPixel === 'function') {
            return this.node.addPixel(dx, dy);
        }
        const exists = this.node.pixels.some(p => p.dx === dx && p.dy === dy);
        if (!exists) this.node.pixels.push({ dx, dy });
        // Mark renderer dirty so caches can be rebuilt
        if (this.node && typeof this.node.markRendererDirty === 'function') this.node.markRendererDirty();
        return true;
    }

    _chooseEdgePixelTowards(targetX, targetY) {
        if (this.node.pixels.length === 0) return null;
        // Find pixel with maximum projection toward target vector
        let best = null;
        let bestProj = -Infinity;
        for (const p of this.node.pixels) {
            const proj = p.dx * targetX + p.dy * targetY;
            if (proj > bestProj) { bestProj = proj; best = p; }
        }
        return best;
    }

    _stepTowards(sx, sy, tx, ty) {
        // Compute delta and normalize to nearest integer step each axis (-1,0,1)
        const dx = tx - sx;
        const dy = ty - sy;
        const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

        return { x: sx + stepX, y: sy + stepY };
    }

    _perpendicularStep(sx, sy, tx, ty) {
        const dx = tx - sx;
        const dy = ty - sy;
        // Perpendicular vector
        const px = -dy;
        const py = dx;
        if (px === 0 && py === 0) return null;
        const nx = sx + (px > 0 ? 1 : (px < 0 ? -1 : 0));
        const ny = sy + (py > 0 ? 1 : (py < 0 ? -1 : 0));
        return { x: nx, y: ny };
    }

    /**
     * Add support pixels for structural integrity
     */
    addSupportPixels(direction, count) {
        const directionVectors = {
            north: { dx: 0, dy: -1, perpendicular: [{dx: 1, dy: 0}, {dx: -1, dy: 0}] },
            northeast: { dx: 1, dy: -1, perpendicular: [{dx: -1, dy: 0}, {dx: 0, dy: -1}] },
            east: { dx: 1, dy: 0, perpendicular: [{dx: 0, dy: 1}, {dx: 0, dy: -1}] },
            southeast: { dx: 1, dy: 1, perpendicular: [{dx: 0, dy: -1}, {dx: -1, dy: 0}] },
            south: { dx: 0, dy: 1, perpendicular: [{dx: 1, dy: 0}, {dx: -1, dy: 0}] },
            southwest: { dx: -1, dy: 1, perpendicular: [{dx: 0, dy: -1}, {dx: 1, dy: 0}] },
            west: { dx: -1, dy: 0, perpendicular: [{dx: 0, dy: 1}, {dx: 0, dy: -1}] },
            northwest: { dx: -1, dy: -1, perpendicular: [{dx: 0, dy: 1}, {dx: 1, dy: 0}] }
        };
        
        const vector = directionVectors[direction];
        if (!vector) return;
        
        // Find pixels in the growth direction, focusing on the closest ones to the center
        const growthPixels = this.node.pixels.filter(pixel => {
            const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
            return distance > 0 && distance <= 3; // Focus on closest growth pixels
        }).sort((a, b) => {
            // Sort by distance from center
            const distA = Math.abs(a.dx) + Math.abs(a.dy);
            const distB = Math.abs(b.dx) + Math.abs(b.dy);
            return distA - distB;
        });

        let supportAdded = 0;
        
        // Add support pixels perpendicular to the growth direction
        for (let attempt = 0; attempt < count * 3 && supportAdded < count; attempt++) {
            if (growthPixels.length === 0) break;
            
            // Prioritize pixels closer to the center for support
            const pixelIndex = Math.min(attempt % growthPixels.length, growthPixels.length - 1);
            const growthPixel = growthPixels[pixelIndex];
            const perpendicular = vector.perpendicular[attempt % 2]; // Alternate sides
            
            const supportPixel = {
                dx: growthPixel.dx + perpendicular.dx,
                dy: growthPixel.dy + perpendicular.dy
            };
            // Check if this pixel already exists and add via node helper
            if (!this.node.hasPixel(supportPixel.dx, supportPixel.dy)) {
                this.node.addPixel(supportPixel.dx, supportPixel.dy);
                supportAdded++;
            }
        }
    }

    /**
     * Grow from a specific location (used for deposit-based growth)
     */
    growFromLocation(depositPixel, direction, pixels) {
        // Legacy directional method retained for compatibility, convert depositPixel to a world point
        // depositPixel expected as { x, y } in world coords
        for (let i = 0; i < pixels; i++) {
            this.growTowardWorldPoint({ x: depositPixel.x, y: depositPixel.y });
        }
    }

    /**
     * Add thickness to growth for more organic appearance
     */
    addThicknessToGrowth(growthPixels, direction) {
        // Define perpendicular directions for thickness
        const thicknessDirections = {
            north: [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }],      // east/west
            south: [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }],      // east/west
            east: [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }],       // north/south
            west: [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }],       // north/south
            northeast: [{ dx: -1, dy: 1 }, { dx: 1, dy: -1 }], // perpendicular diagonals
            northwest: [{ dx: 1, dy: 1 }, { dx: -1, dy: -1 }], // perpendicular diagonals
            southeast: [{ dx: -1, dy: 1 }, { dx: 1, dy: -1 }], // perpendicular diagonals
            southwest: [{ dx: 1, dy: 1 }, { dx: -1, dy: -1 }]  // perpendicular diagonals
        };
        
        const perpDirs = thicknessDirections[direction] || [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];
        
        // For each growth pixel, add thickness pixels around it
        for (const growthPixel of growthPixels) {
            // Add 2 pixels of thickness on each side
                for (let thickness = 1; thickness <= 2; thickness++) {
                    for (const perpDir of perpDirs) {
                        const thickPixel = {
                            dx: growthPixel.dx + (perpDir.dx * thickness),
                            dy: growthPixel.dy + (perpDir.dy * thickness)
                        };
                        if (!this.node.hasPixel(thickPixel.dx, thickPixel.dy)) {
                            this.node.addPixel(thickPixel.dx, thickPixel.dy);
                        }
                    }
                }
            
            // Also add diagonal thickness for more organic shape
            const diagonalOffsets = [
                { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
                { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
            ];
            
            for (const diagOffset of diagonalOffsets) {
                const diagPixel = {
                    dx: growthPixel.dx + diagOffset.dx,
                    dy: growthPixel.dy + diagOffset.dy
                };
                if (!this.node.hasPixel(diagPixel.dx, diagPixel.dy)) {
                    this.node.addPixel(diagPixel.dx, diagPixel.dy);
                }
            }
        }
    }

    /**
     * Get the maximum growth extent in any direction (for size calculation)
     */
    getMaxGrowthExtent() {
        return Math.max(...Object.values(this.growthDirections).map(g => g.length));
    }
}
