import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { CONSTANTS } from './constants.js';
import { NodeGrowthManager } from './NodeGrowthManager.js';
import { NodeRenderer } from './NodeRenderer.js';
import { NodeShapeGenerator } from './NodeShapeGenerator.js';

/**
 * Node class - modular architecture with separated concerns
 * Handles core state and delegates specialized responsibilities to managers
 */
export class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.food = 0;
        this.individuals = [];
        this.color = CONFIG.NODE.COLOR;
        this.size = CONFIG.NODE.SIZE;
        this.pulseAnimation = 0;
        this.simulation = null;
        this.lastFoodAmount = 0;
        this.lastSpawnTime = 0;             // Timestamp (ms) of last automatic spawn (kept for compatibility)
        this.spawnCooldown = CONFIG.NODE.SPAWN_COOLDOWN || 5000; // Cooldown in milliseconds between spawns
        
        // Multiple deposit locations (depots) - starts with node center, expands on merge
        this.depotLocations = [{ x: x, y: y }];
        
        // Initialize pixel array for organic shape
        this.pixels = [];
        // Fast lookup set for pixel existence, keys are "dx,dy"
        this.pixelSet = new Set();
        // Edge/frontier pixels for faster growth start selection
        this.edgePixels = new Set();
        // Cached bounding box (relative to node.x/node.y). Kept up-to-date in addPixel().
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        // Initialize specialized managers
        this.growthManager = new NodeGrowthManager(this);
        this.renderer = new NodeRenderer(this);
        this.shapeGenerator = new NodeShapeGenerator(this);
        
        // Renderer dirty flag for caching
        this.rendererDirty = true;

        // Generate initial organic shape
        this.shapeGenerator.generateOrganicShape();
        // ensure pixelSet and edgePixels are populated if shapeGenerator used direct pushes
        for (const p of this.pixels) {
            this.pixelSet.add(`${p.dx},${p.dy}`);
        }
        this._recomputeEdgePixels();
        this.markRendererDirty();
    }

    /**
     * Clean up timers and large references so node can be garbage collected.
     */
    destroy() {
        try {
            if (this._spawnTimer) {
                clearTimeout(this._spawnTimer);
                this._spawnTimer = null;
            }
        } catch (e) {}

        // Clear pixel data and helper sets to free memory
        try {
            this.pixels.length = 0;
            this.pixelSet.clear && this.pixelSet.clear();
            this.edgePixels.clear && this.edgePixels.clear();
        } catch (e) {}

        // Disconnect managers
        try { this.growthManager = null; } catch (e) {}
        try { this.renderer = null; } catch (e) {}
        try { this.shapeGenerator = null; } catch (e) {}
    }

    markRendererDirty() {
        this.rendererDirty = true;
        // also notify renderer instance if present
        if (this.renderer) this.renderer._markDirty && this.renderer._markDirty();
    }

    hasPixel(dx, dy) {
        return this.pixelSet.has(`${dx},${dy}`);
    }

    addPixel(dx, dy) {
        // Check canvas boundaries before adding pixel
        const worldX = this.x + dx;
        const worldY = this.y + dy;
        
        if (this.simulation && this.simulation.CONFIG) {
            const mapWidth = this.simulation.CONFIG.MAP.WIDTH;
            const mapHeight = this.simulation.CONFIG.MAP.HEIGHT;
            
            // Reject pixels outside canvas bounds
            if (worldX < 0 || worldX >= mapWidth || worldY < 0 || worldY >= mapHeight) {
                return false;
            }
        }
        
        const key = `${dx},${dy}`;
        if (this.pixelSet.has(key)) return false;
        this.pixelSet.add(key);
        this.pixels.push({ dx, dy });
        // Update cached bounds incrementally (first pixel initializes bounds)
        if (this.pixels.length === 1) {
            this.bounds.minX = dx;
            this.bounds.maxX = dx;
            this.bounds.minY = dy;
            this.bounds.maxY = dy;
        } else {
            if (dx < this.bounds.minX) this.bounds.minX = dx;
            if (dx > this.bounds.maxX) this.bounds.maxX = dx;
            if (dy < this.bounds.minY) this.bounds.minY = dy;
            if (dy > this.bounds.maxY) this.bounds.maxY = dy;
        }
        // Use centralized DEBUG flag if present (deferred import to avoid any circular import issues)
        try {
            if (this.simulation && this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.growth) {
                logger.debug('growth', 'Node.addPixel', this.x, this.y, dx, dy, 'total', this.pixels.length);
            }
        } catch (e) {}
        // update edgePixels: new pixel may create new frontier entries around it
        const neigh = CONSTANTS.NEIGHBOR_OFFSETS;
        let isEdge = false;
        for (const [ox, oy] of neigh) {
            const neighborKey = `${dx+ox},${dy+oy}`;
            if (!this.pixelSet.has(neighborKey)) {
                isEdge = true;
            } else {
                // Neighbor exists: ensure it's marked as an edge candidate
                this.edgePixels.add(neighborKey);
            }
        }
        if (isEdge) this.edgePixels.add(key);
        // newly filled pixel might remove edge status from neighbors
        for (const [ox, oy] of neigh) {
            const nk = `${dx+ox},${dy+oy}`;
            if (this.pixelSet.has(nk)) {
                // check if neighbor still has any empty neighbor; if not remove from edgePixels
                let stillEdge = false;
                for (const [ax, ay] of neigh) {
                    const ck = `${dx+ox+ax},${dy+oy+ay}`;
                    if (!this.pixelSet.has(ck)) { stillEdge = true; break; }
                }
                if (!stillEdge) this.edgePixels.delete(nk);
            }
        }
        this.markRendererDirty();
        
        // Mark dirty rect for rendering optimization
        if (this.simulation && this.simulation.dirtyRectManager) {
            const bounds = this.getBounds();
            const worldX = this.x + bounds.minX;
            const worldY = this.y + bounds.minY;
            const worldWidth = bounds.maxX - bounds.minX + 1;
            const worldHeight = bounds.maxY - bounds.minY + 1;
            this.simulation.dirtyRectManager.markDirty(worldX, worldY, worldWidth, worldHeight);
        }
        
        return true;
    }

    _recomputeEdgePixels() {
        this.edgePixels.clear();
        const neigh = CONSTANTS.NEIGHBOR_OFFSETS;
        for (const p of this.pixels) {
            const key = `${p.dx},${p.dy}`;
            for (const [ox, oy] of neigh) {
                if (!this.pixelSet.has(`${p.dx+ox},${p.dy+oy}`)) { this.edgePixels.add(key); break; }
            }
        }
    }

    /**
     * Update node state
     */
    update() {
        // Update size for compatibility (use largest dimension)
        const maxLength = this.growthManager.getMaxGrowthExtent();
        this.size = CONFIG.NODE.SIZE + maxLength * 2; // *2 because growth can be in both directions
        
        if (this.pulseAnimation > 0) {
            this.pulseAnimation -= 0.05;
        }
        // Process deferred growth actions queued by the growth manager
        if (this.growthManager && typeof this.growthManager.tick === 'function') this.growthManager.tick();
    }

    /**
     * Spawn a new individual at this node
     */
    spawn() {
    // Check cooldown and food cost
    const now = Date.now();
    if (!this.simulation) return false;
    const spawnCost = (this.simulation.CONFIG && this.simulation.CONFIG.NODE && this.simulation.CONFIG.NODE.SPAWN_COST) || 10;
    if (this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.spawn) logger.debug('spawn','[spawn] attempt',{ node: [this.x, this.y], now, lastSpawnTime: this.lastSpawnTime, food: this.food });
    if (now - this.lastSpawnTime < this.spawnCooldown) {
    if (this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.spawn) logger.debug('spawn','[spawn] blocked by cooldown',{ remaining: this.spawnCooldown - (now - this.lastSpawnTime) });
        return false;
    }
    if (this.food < spawnCost) {
        if (this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.spawn) logger.debug('spawn','[spawn] blocked by insufficient food',{ food: this.food, required: spawnCost });
        return false;
    }
            const individual = this.simulation.individualPool.acquire(this);
            // If simulation has marked next spawn as dropper, configure this individual
            if (this.simulation && this.simulation._markNextSpawnAsDropper) {
                individual.willDropNodeOnDeath = true;
                individual.ignoreFood = true; // dropper should wander and not react to food
                // consume the flag so only one individual is marked
                this.simulation._markNextSpawnAsDropper = false;
            }
            
            // Apply specialization if enabled
            if (this.specializationEnabled) {
                individual.assignSpecialization();
            }
            
                // Deduct food cost
                this.food -= spawnCost;
                // Reflect spend in shared pool if present
                if (this.sharedPool) {
                    this.sharedPool.totalFood = Math.max(0, (this.sharedPool.totalFood || 0) - spawnCost);
                }

                // Record spawn time for cooldown
                this.lastSpawnTime = now;
                if (this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.spawn) logger.debug('spawn','[spawn] succeeded',{ spawnedId: individual.id, foodLeft: this.food });

                this.simulation.individuals.push(individual);
                this.individuals.push(individual);
                this.simulation.totalIndividualsSpawned++;
                // pulse animation removed to prevent spawn flash

                return true;
    }

    /**
     * Try to spawn multiple individuals immediately without waiting for cooldown.
     * Used for testing or when `CONFIG.ALLOW_IMMEDIATE_MULTI_SPAWN` is true.
     */
    spawnImmediate() {
        if (!this.simulation) return 0;
        const spawnCost = (this.simulation.CONFIG && this.simulation.CONFIG.NODE && this.simulation.CONFIG.NODE.SPAWN_COST) || 10;
        let spawnedCount = 0;
    while (this.food >= spawnCost) {
            const ind = this.simulation.individualPool.acquire(this);
            if (this.simulation && this.simulation._markNextSpawnAsDropper) {
                ind.willDropNodeOnDeath = true;
                ind.ignoreFood = true;
                this.simulation._markNextSpawnAsDropper = false;
            }
            if (this.specializationEnabled) ind.assignSpecialization();
            this.food -= spawnCost;
            if (this.sharedPool) this.sharedPool.totalFood = Math.max(0, (this.sharedPool.totalFood || 0) - spawnCost);
            this.lastSpawnTime = Date.now();
            this.simulation.individuals.push(ind);
            this.individuals.push(ind);
            this.simulation.totalIndividualsSpawned++;
            if (this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.spawn) logger.debug('spawn','[spawnImmediate] spawned', ind.id, 'foodLeft', this.food);
            spawnedCount++;
            if (this.simulation.updateStats) this.simulation.updateStats();
        }
        return spawnedCount;
    }
    
    /**
     * Check if node can spawn (has enough food)
     */
    canSpawn() {
        const spawnCost = (this.simulation && this.simulation.CONFIG && this.simulation.CONFIG.NODE && this.simulation.CONFIG.NODE.SPAWN_COST) || 10;
        return this.food >= spawnCost;
    }

    /**
     * Schedule a spawn attempt after the remaining cooldown elapses.
     * Uses a single timer per node and will retry spawning until food < 10 or spawn succeeds.
     */
    scheduleSpawnAttempt() {
        if (!this.simulation) return;
        try {
            const now = Date.now();
            const elapsed = now - this.lastSpawnTime;
            const remaining = Math.max(0, this.spawnCooldown - elapsed);
            if (this._spawnTimer) clearTimeout(this._spawnTimer);
            this._spawnTimer = setTimeout(() => {
                this._spawnTimer = null;
                // Try to spawn as many as possible now
                const spawnCost = (this.simulation.CONFIG && this.simulation.CONFIG.NODE && this.simulation.CONFIG.NODE.SPAWN_COST) || 10;
                while (this.food >= spawnCost) {
                    const spawned = this.spawn();
                    if (!spawned) {
                        // still on cooldown or spawn failed, reschedule and exit
                        this.scheduleSpawnAttempt();
                        return;
                    }
                    if (this.simulation.updateStats) this.simulation.updateStats();
                }
            }, remaining);
        } catch (e) {
            // swallow scheduling errors
        }
    }

    /**
     * Store food and trigger growth
     */
    storeFood(amount, sourceDirection = null, depositLocation = null) {
        this.food += amount;
        // Notify simulation about food milestone so it can set dropper flags (if implemented)
        if (this.simulation && amount > 0 && this.simulation.checkFoodMilestone) {
            this.simulation.checkFoodMilestone(this, amount);
        }
        
        // Normalize depositLocation (if provided) to world integer coords within bounds
        if (depositLocation && typeof depositLocation.x === 'number' && typeof depositLocation.y === 'number') {
            const maxX = this.simulation ? this.simulation.CONFIG.MAP.WIDTH - 1 : Infinity;
            const maxY = this.simulation ? this.simulation.CONFIG.MAP.HEIGHT - 1 : Infinity;
            depositLocation = {
                x: Math.max(0, Math.min(maxX, Math.round(depositLocation.x))),
                y: Math.max(0, Math.min(maxY, Math.round(depositLocation.y)))
            };
        } else {
            depositLocation = null;
        }

        // Delegate growth processing to growth manager
        this.growthManager.processGrowth(amount, sourceDirection, depositLocation);

        // Automatically spawn individuals when node accumulates enough food (10 per spawn).
        // Spawn as many as the available food allows to keep behavior deterministic.
        if (this.simulation) {
            // If config allows, spawn multiple individuals immediately from a large deposit
            // This is disabled by default; `DEBUG_FORCE_MULTI_SPAWN` can enable it for debugging
            const immediateAllowed = !!(this.simulation.CONFIG && (this.simulation.CONFIG.ALLOW_IMMEDIATE_MULTI_SPAWN || this.simulation.CONFIG.DEBUG_FORCE_MULTI_SPAWN));
            if (immediateAllowed) {
                const spawned = this.spawnImmediate();
                if (spawned > 0 && this.simulation.updateStats) this.simulation.updateStats();
            } else {
                // Try to spawn as many as possible now, respecting cooldown
                const spawnCost = (this.simulation.CONFIG && this.simulation.CONFIG.NODE && this.simulation.CONFIG.NODE.SPAWN_COST) || 10;
                while (this.food >= spawnCost) {
                    const spawned = this.spawn();
                    // If spawn fails due to cooldown, schedule remaining spawns and exit loop
                    if (!spawned) {
                        this.scheduleSpawnAttempt();
                        break;
                    }

                    // Update stats after successful spawn
                    if (this.simulation.updateStats) this.simulation.updateStats();
                    // Continue loop to attempt further immediate spawns (until food < spawnCost or cooldown applies)
                }
            }
        }

        // Record the last observed food amount after any consumption (spawns)
        this.lastFoodAmount = this.food;
    }

    /**
     * Schedule a spawn attempt after the remaining cooldown elapses.
     * This ensures surplus food will be used as soon as the cooldown expires.
     */
    // spawn scheduling removed: spawning is attempted immediately in storeFood()

    /**
     * Get the closest pixel to given coordinates
     */
    getClosestPixelTo(x, y) {
        return this.shapeGenerator.getClosestPixelTo(x, y);
    }

    /**
     * Render the node
     */
    render(ctx) {
        this.renderer.render(ctx);
    }

    /**
     * Get node bounds for collision detection
     */
    getBounds() {
        return this.shapeGenerator.getBounds();
    }

    /**
     * Check if a point is within the node
     */
    containsPoint(x, y) {
        const relativeX = x - this.x;
        const relativeY = y - this.y;
        const key = `${Math.floor(relativeX)},${Math.floor(relativeY)}`;
        return this.pixelSet.has(key);
    }
}
