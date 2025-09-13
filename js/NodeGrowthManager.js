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
        // Queue for deferred growth actions when spreading across frames
        this._growthQueue = [];
        // Track last food amount we've processed into growth to support continuous draining
        this._lastProcessedFood = (this.node && typeof this.node.lastFoodAmount === 'number') ? this.node.lastFoodAmount : 0;
        // Number of pixels reserved by queued growth actions (not yet consumed from node.food)
        this._reservedPixels = 0;
    }

    _dbg() {
        return !!(this.node && this.node.simulation && this.node.simulation.CONFIG && this.node.simulation.CONFIG.DEBUG_GROWTH_LOG);
    }

    /**
     * Trigger growth based on food storage
     */
    processGrowth(amount, sourceDirection = null, depositLocation = null) {
        if (amount <= 0) return;

        const cfgNode = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
        const perPixel = (cfgNode && cfgNode.FOOD_PER_PIXEL) ? cfgNode.FOOD_PER_PIXEL : 1;
        const oldPixels = Math.floor(this.node.lastFoodAmount / perPixel);
        const newPixels = Math.floor(this.node.food / perPixel);
        let delta = Math.max(0, newPixels - oldPixels);

        // Debug log
        try {
            if (this._dbg()) console.log('processGrowth computed', { nodeX: this.node.x, nodeY: this.node.y, amount, oldPixels, newPixels, delta });
            else console.debug && console.debug('processGrowth', { x: this.node.x, y: this.node.y, amount, oldPixels, newPixels, delta });
        } catch (e) {}

        // Cap if top-level configured
        const topCfg = this.node.simulation ? this.node.simulation.CONFIG : null;
        if (topCfg && typeof topCfg.MAX_GROWTH_PER_TICK === 'number') delta = Math.min(delta, topCfg.MAX_GROWTH_PER_TICK);

        if (delta <= 0) return;

        // Enqueue growth actions unless continuous draining will handle them (except for deposit-directed growth)
        const continuous = topCfg && topCfg.GROWTH_CONTINUOUS;

        for (let i = 0; i < delta; i++) {
            if (depositLocation) {
                this._growthQueue.push({ type: 'toward', point: depositLocation });
                if (this._dbg()) console.log('Enqueued toward growth', this.node.x, this.node.y, depositLocation);
                this._reservedPixels++;
                this._lastProcessedFood = this.node.food;
                continue;
            }

            if (sourceDirection) {
                if (!continuous) {
                    this._growthQueue.push({ type: 'direction', direction: sourceDirection });
                    this._reservedPixels++;
                    if (this._dbg()) console.log('Enqueued dir growth', this.node.x, this.node.y, sourceDirection);
                }
                this._lastProcessedFood = this.node.food;
                continue;
            }

            // Generic/random growth: only enqueue if not continuous
            if (continuous) {
                this._lastProcessedFood = this.node.food;
                continue;
            }

            // Weighted random: prefer cardinals
            const weights = { north: 2, south: 2, east: 2, west: 2, northeast: 1, northwest: 1, southeast: 1, southwest: 1 };
            const dirs = Object.keys(this.growthDirections);
            const weighted = [];
            for (const d of dirs) {
                const w = weights[d] || 1;
                for (let k = 0; k < w; k++) weighted.push(d);
            }
            const dir = weighted[Math.floor(Math.random() * weighted.length)];
            this._growthQueue.push({ type: 'direction', direction: dir });
            this._reservedPixels++;
            if (this._dbg()) console.log('Enqueued rand growth', this.node.x, this.node.y, dir);
            this._lastProcessedFood = this.node.food;
        }
    }

    /**
     * Process up to configured number of growth actions per frame.
     * Call this from `Node.update()` once per frame.
     */
    tick() {
        const cfg = this.node.simulation ? this.node.simulation.CONFIG : null;
        const actionsPerFrame = (cfg && typeof cfg.GROWTH_ACTIONS_PER_FRAME === 'number') ? cfg.GROWTH_ACTIONS_PER_FRAME : 2;
        let processed = 0;
        // If continuous growth is enabled, use the per-frame action budget to convert food directly into growth
        try {
            if (cfg && cfg.GROWTH_CONTINUOUS) {
                const nodeCfg = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
                const perPixel = (nodeCfg && nodeCfg.FOOD_PER_PIXEL) ? nodeCfg.FOOD_PER_PIXEL : 1;
                const maxPerAction = (cfg && typeof cfg.GROWTH_STEP_PIXELS === 'number') ? cfg.GROWTH_STEP_PIXELS : 1;
                let availableActions = actionsPerFrame;
                // First, consume food-driven growth using this frame's budget
                // Respect spawn threshold so continuous growth doesn't prevent spawning
                const spawnThresh = (nodeCfg && typeof nodeCfg.SPAWN_THRESHOLD === 'number') ? nodeCfg.SPAWN_THRESHOLD : 0;
                while (availableActions > 0 && this.node.food >= perPixel) {
                    // compute max consumable food this step without dropping below spawn threshold
                    const maxConsumable = Math.max(0, this.node.food - spawnThresh);
                    if (maxConsumable < perPixel) break; // leave enough for spawn
                    const pixelsToGrow = 1 + Math.floor(Math.random() * maxPerAction);
                    // clamp pixels by available consumable pixels
                    const consumablePixels = Math.min(pixelsToGrow, Math.floor(maxConsumable / perPixel));
                    if (consumablePixels <= 0) break;
                    // choose a growth method: prefer directed toward deposit if available in queue else random direction
                    const dirs = Object.keys(this.growthDirections);
                    const dir = dirs[Math.floor(Math.random() * dirs.length)];
                    this.growInDirection(dir, consumablePixels);
                    // consume food for the pixels we just created
                    const consumed = consumablePixels * perPixel;
                    this.node.food = Math.max(0, this.node.food - consumed);
                    this._lastProcessedFood = this.node.food;
                    availableActions--;
                    processed++;
                }
                // Remaining action budget will be used to process queued growth below
            }
        } catch (e) {}
        // Baseline slow growth: small chance per tick to extend a tentacle even without food
        try {
            const nodeCfg = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
            const baseChance = (nodeCfg && typeof nodeCfg.BASE_GROWTH_CHANCE === 'number') ? nodeCfg.BASE_GROWTH_CHANCE : 0;
            if (Math.random() < baseChance) {
                // pick a random direction and grow a single pixel
                const dirs = Object.keys(this.growthDirections);
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                this.growInDirection(dir, 1);
            }
        } catch (e) {}
        // Debug: report queue size when non-empty
        try {
            if (this._growthQueue.length > 0) {
                if (this._dbg()) console.log('tick starting with queue', this._growthQueue.length, 'actionsPerFrame', actionsPerFrame, 'node', this.node.x, this.node.y);
                else console.debug && console.debug('tick queue', this._growthQueue.length, 'apf', actionsPerFrame, 'node', this.node.x, this.node.y);
            }
        } catch (e) {}
        while (processed < actionsPerFrame && this._growthQueue.length > 0) {
            const action = this._growthQueue.shift();
            // consuming one reserved pixel for this queued action
            if (this._reservedPixels > 0) this._reservedPixels = Math.max(0, this._reservedPixels - 1);
            if (this._dbg()) console.log('Processing growth action', action, 'for node', this.node.x, this.node.y);
            // Determine pixels per action
            const maxPerAction = (cfg && typeof cfg.GROWTH_STEP_PIXELS === 'number') ? cfg.GROWTH_STEP_PIXELS : 1;
            const pixelsToGrow = 1 + Math.floor(Math.random() * maxPerAction);
            if (action.type === 'toward') {
                for (let p = 0; p < pixelsToGrow; p++) this.growTowardWorldPoint(action.point);
            } else if (action.type === 'direction') {
                this.growInDirection(action.direction, pixelsToGrow);
            }
            processed++;
        }

        // If continuous growth is enabled, also convert stored food into growth here
        try {
            if (cfg && cfg.GROWTH_CONTINUOUS) {
                const nodeCfg = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
                const perPixel = (nodeCfg && nodeCfg.FOOD_PER_PIXEL) ? nodeCfg.FOOD_PER_PIXEL : 1;
                const maxPerAction = (cfg && typeof cfg.GROWTH_STEP_PIXELS === 'number') ? cfg.GROWTH_STEP_PIXELS : 1;
                // compute how many whole pixels are represented by current food and what we've already processed
                const availablePixels = Math.floor(this.node.food / perPixel);
                const processedPixels = Math.floor((this._lastProcessedFood || 0) / perPixel);
                let deltaPixels = Math.max(0, availablePixels - processedPixels);
                if (deltaPixels > 0) {
                    // cap how many pixels we convert this tick to avoid long stalls
                    const cap = Math.max(1, actionsPerFrame * maxPerAction - this._reservedPixels);
                    let toConvert = Math.min(deltaPixels, cap);
                    const weights = { north: 2, south: 2, east: 2, west: 2, northeast: 1, northwest: 1, southeast: 1, southwest: 1 };
                    const dirs = Object.keys(this.growthDirections);
                    const weighted = [];
                    for (const d of dirs) {
                        const w = weights[d] || 1;
                        for (let k = 0; k < w; k++) weighted.push(d);
                    }
                    // Respect spawn threshold when converting available food into growth
                    const spawnThresh2 = (nodeCfg && typeof nodeCfg.SPAWN_THRESHOLD === 'number') ? nodeCfg.SPAWN_THRESHOLD : 0;
                    while (toConvert > 0) {
                        // compute how many pixels we may consume without going below threshold
                        const maxConsumable = Math.max(0, this.node.food - spawnThresh2);
                        if (maxConsumable < perPixel) break;
                        const step = Math.min(toConvert, Math.min(1 + Math.floor(Math.random() * maxPerAction), Math.floor(maxConsumable / perPixel)));
                        if (step <= 0) break;
                        const dir = weighted[Math.floor(Math.random() * weighted.length)];
                        this.growInDirection(dir, step);
                        const consumed = step * perPixel;
                        this.node.food = Math.max(0, this.node.food - consumed);
                        toConvert -= step;
                        // reflect progress so subsequent ticks don't duplicate work
                        this._lastProcessedFood = this.node.food;
                    }
                }
            }
        } catch (e) {}
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

            // Small chance to deviate/jitter the growth direction to create meandering
            try {
                const rnd = (this.node && this.node.simulation && this.node.simulation.CONFIG && this.node.simulation.CONFIG.NODE && typeof this.node.simulation.CONFIG.NODE.GROWTH_RANDOM_DIR_CHANGE === 'number') ? this.node.simulation.CONFIG.NODE.GROWTH_RANDOM_DIR_CHANGE : 0.2;
                if (Math.random() < rnd) {
                    // pick a nearby direction (rotate left/right or diagonals)
                    const dirs = Object.keys(this.growthDirections);
                    const alternatives = dirs.filter(d => d !== direction);
                    const pick = alternatives[Math.floor(Math.random() * alternatives.length)];
                    // add a small branch immediately
                    this.addPixelInDirection(pick);
                    this.growthDirections[pick].length++;
                    this.totalGrowth++;
                }
            } catch (e) {}
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
        // Prefer starting from the node's edge/frontier pixels for outward growth
        let start = this._chooseEdgePixelTowards(vector.dx, vector.dy) || { dx: 0, dy: 0 };

        // Step outward from the chosen start until an empty spot is found
        let nx = start.dx + vector.dx;
        let ny = start.dy + vector.dy;
        let steps = 0;
        const maxOutwardSteps = 64; // safety cap
        while (this.node.hasPixel && this.node.hasPixel(nx, ny) && steps < maxOutwardSteps) {
            nx += vector.dx;
            ny += vector.dy;
            steps++;
        }

        // Add the first missing pixel along this ray
        this._addPixelIfMissing(nx, ny);
    }

    /**
     * Grow toward a world coordinate (depositLocation) using discrete stepping (Bresenham-like)
     */
    growTowardWorldPoint(worldPoint) {
        // Convert world point to relative pixel coordinates from node center
        const targetX = Math.round(worldPoint.x) - this.node.x;
        const targetY = Math.round(worldPoint.y) - this.node.y;

    // If the deposit lies on one of our existing pixels, prefer starting from the nearest edge pixel
    let startPixel = this._chooseEdgePixelTowards(targetX, targetY) || { dx: 0, dy: 0 };
    // If the worldPoint corresponds to a pixel on this node, find nearest frontier pixel instead
    const relX = targetX, relY = targetY;
    if (this.node.hasPixel(relX, relY)) {
        const nearest = this._findNearestEdgePixel(relX, relY);
        if (nearest) startPixel = nearest;
    }

        // Build a short integer-stepped path (Bresenham-like) from startPixel toward (relX, relY)
        const maxSteps = 6; // cap path length per growth action
        const path = [];
        let sx = startPixel.dx, sy = startPixel.dy;
        for (let step = 0; step < maxSteps; step++) {
            const dx = relX - sx;
            const dy = relY - sy;
            if (dx === 0 && dy === 0) break;
            // Prefer cardinal steps when one axis dominates to avoid strict diagonal growth
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);
            let stepX = 0, stepY = 0;
            if (adx > ady * 1.2) {
                stepX = dx > 0 ? 1 : -1;
                stepY = 0;
            } else if (ady > adx * 1.2) {
                stepY = dy > 0 ? 1 : -1;
                stepX = 0;
            } else {
                stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
                stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
            }
            const nx = sx + stepX, ny = sy + stepY;
            // if pixel already exists, advance start to that pixel and continue
            if (this.node.hasPixel(nx, ny)) {
                sx = nx; sy = ny; continue;
            }
            path.push({ dx: nx, dy: ny });
            sx = nx; sy = ny;
        }

        // Debug: log computed path and endpoints when enabled (explicit numeric values)
        try {
            if (this._dbg()) {
                console.log('growTowardWorldPoint', 'node', this.node.x, this.node.y, 'start', startPixel.dx, startPixel.dy, 'target', relX, relY, 'pathLen', path.length, 'path', path);
            } else {
                console.debug && console.debug('growTowardWorldPoint', 'start', startPixel.dx, startPixel.dy, 'target', relX, relY, 'pathLen', path.length);
            }
        } catch (e) {}

        // Fallback: if no path was found (all intermediate pixels already occupied or target adjacent),
        // attempt a small outward step from the chosen start pixel so growth remains visible.
        if (path.length === 0) {
            try {
                // Try multiple outward extension attempts to avoid stalls when direct path is blocked
                const edgeCandidates = [];
                const edgeSet = this.node.edgePixels;
                if (edgeSet && edgeSet.size > 0) {
                    for (const k of edgeSet) {
                        const [ex, ey] = k.split(',').map(Number);
                        edgeCandidates.push({ dx: ex, dy: ey });
                    }
                } else if (this.node.pixels && this.node.pixels.length > 0) {
                    // fallback to any pixel if edge set empty
                    for (const p of this.node.pixels) edgeCandidates.push(p);
                } else {
                    edgeCandidates.push({ dx: 0, dy: 0 });
                }

                // Shuffle edgeCandidates to randomize attempts
                for (let a = edgeCandidates.length - 1; a > 0; a--) {
                    const j = Math.floor(Math.random() * (a + 1));
                    const tmp = edgeCandidates[a]; edgeCandidates[a] = edgeCandidates[j]; edgeCandidates[j] = tmp;
                }

                const tryOffsets = [
                    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
                    { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
                ];

                let added = false;
                const maxAttempts = Math.min(6, edgeCandidates.length);
                for (let attempt = 0; attempt < maxAttempts && !added; attempt++) {
                    const candidate = edgeCandidates[attempt];
                    // Compute vector away from center for outward growth if possible
                    const vx = candidate.dx;
                    const vy = candidate.dy;
                    let norm = { x: 0, y: 0 };
                    if (vx === 0 && vy === 0) {
                        // center pixel: pick a random neighbor
                        norm = tryOffsets[Math.floor(Math.random() * tryOffsets.length)];
                    } else {
                        norm.x = vx === 0 ? 0 : (vx > 0 ? 1 : -1);
                        norm.y = vy === 0 ? 0 : (vy > 0 ? 1 : -1);
                    }

                    // Try a few offsets around the normalized direction to find an empty spot
                    for (let off = 0; off < tryOffsets.length && !added; off++) {
                        // Mix base norm with offset to increase variety
                        const offIdx = Math.floor(Math.random() * tryOffsets.length);
                        const o = tryOffsets[offIdx];
                        const tx = candidate.dx + norm.x + o.x;
                        const ty = candidate.dy + norm.y + o.y;
                        if (!(this.node.hasPixel && this.node.hasPixel(tx, ty))) {
                            if (this._dbg()) console.log('growTowardWorldPoint fallback add', tx, ty, 'from candidate', candidate, 'target', relX, relY);
                            this._addPixelIfMissing(tx, ty);
                            added = true;
                            break;
                        }
                    }
                }
                if (!added && this._dbg()) console.log('growTowardWorldPoint fallback: no empty candidate found');
            } catch (e) {}
        }

        // Apply path as a batch: add pixels and thickness and branching around each step
        const thickness = (this.node.simulation && this.node.simulation.CONFIG.NODE.GROWTH_THICKNESS) || 1;
        for (const newPixel of path) {
            this._addPixelIfMissing(newPixel.dx, newPixel.dy);
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

    _findNearestEdgePixel(x, y) {
        const edgeSet = this.node.edgePixels;
        if (!edgeSet || edgeSet.size === 0) return null;
        let best = null;
        let bestDist = Infinity;
        for (const key of edgeSet) {
            const [sx, sy] = key.split(',').map(Number);
            const dx = sx - x;
            const dy = sy - y;
            const d = dx*dx + dy*dy;
            if (d < bestDist) { bestDist = d; best = { dx: sx, dy: sy }; }
        }
        return best;
    }

    _addPixelIfMissing(dx, dy) {
        if (this.node && typeof this.node.addPixel === 'function') {
            try { if (this.node && this.node.simulation && this.node.simulation.CONFIG && this.node.simulation.CONFIG.DEBUG_GROWTH_LOG) console.log('Attempt addPixel', this.node.x, this.node.y, dx, dy); } catch (e) {}
            return this.node.addPixel(dx, dy);
        }
        const exists = this.node.pixels.some(p => p.dx === dx && p.dy === dy);
        if (!exists) this.node.pixels.push({ dx, dy });
        // Mark renderer dirty so caches can be rebuilt
        if (this.node && typeof this.node.markRendererDirty === 'function') this.node.markRendererDirty();
        return true;
    }

    _chooseEdgePixelTowards(targetX, targetY) {
        // Prefer using the edge/frontier pixels for outward growth start
        const edgeSet = this.node.edgePixels;
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

        // Fallback: choose from all pixels (older nodes or if edge set not populated)
        if (!this.node.pixels || this.node.pixels.length === 0) return null;
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
