import { CONFIG } from './config.js';
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
    this.lastSpawnTime = 0; // timestamp (ms) of last automatic spawn (kept for compatibility)
    this.spawnCooldown = 5000; // cooldown in milliseconds between spawns
        
        // Initialize pixel array for organic shape
    this.pixels = [];
    // Fast lookup set for pixel existence, keys are "dx,dy"
    this.pixelSet = new Set();
    // Edge/frontier pixels for faster growth start selection
    this.edgePixels = new Set();
        
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

    markRendererDirty() {
        this.rendererDirty = true;
        // also notify renderer instance if present
        if (this.renderer) this.renderer._markDirty && this.renderer._markDirty();
    }

    hasPixel(dx, dy) {
        return this.pixelSet.has(`${dx},${dy}`);
    }

    addPixel(dx, dy) {
        const key = `${dx},${dy}`;
        if (this.pixelSet.has(key)) return false;
        this.pixelSet.add(key);
        this.pixels.push({ dx, dy });
        // update edgePixels: new pixel may create new frontier entries around it
        const neigh = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
        let isEdge = false;
        for (const [ox, oy] of neigh) {
            const nk = `${dx+ox},${dy+oy}`;
            if (!this.pixelSet.has(nk)) {
                isEdge = true;
                // mark neighbor as edge candidate (if neighbor is existing pixel, ensure it's marked)
                const neighborKey = `${dx+ox},${dy+oy}`;
                if (this.pixelSet.has(neighborKey)) this.edgePixels.add(neighborKey);
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
        return true;
    }

    _recomputeEdgePixels() {
        this.edgePixels.clear();
        const neigh = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
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
    }

    /**
     * Spawn a new individual at this node
     */
    spawn() {
    // Check cooldown and food cost (10 food)
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!this.simulation) return false;
    if (now - this.lastSpawnTime < this.spawnCooldown) return false;
    if (this.food < 10) return false;
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
                this.food -= 10;
                // Reflect spend in shared pool if present
                if (this.sharedPool) {
                    this.sharedPool.totalFood = Math.max(0, (this.sharedPool.totalFood || 0) - 10);
                }

                // Record spawn time for cooldown
                this.lastSpawnTime = now;

                this.simulation.individuals.push(individual);
                this.individuals.push(individual);
                this.simulation.totalIndividualsSpawned++;
                // pulse animation removed to prevent spawn flash

                return true;
    }
    
    /**
     * Check if node can spawn (has enough food)
     */
    canSpawn() {
        return this.food >= 10;
    }

    /**
     * Schedule a spawn attempt after the remaining cooldown elapses.
     * Uses a single timer per node and will retry spawning until food < 10 or spawn succeeds.
     */
    scheduleSpawnAttempt() {
        if (!this.simulation) return;
        try {
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const elapsed = now - this.lastSpawnTime;
            const remaining = Math.max(0, this.spawnCooldown - elapsed);
            if (this._spawnTimer) clearTimeout(this._spawnTimer);
            this._spawnTimer = setTimeout(() => {
                this._spawnTimer = null;
                // Try to spawn as many as possible now
                while (this.food >= 10) {
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
        
        this.lastFoodAmount = this.food;
        
        // Automatically spawn individuals when node accumulates enough food (10 per spawn).
        // Spawn as many as the available food allows to keep behavior deterministic.
        if (this.simulation) {
            // Try to spawn as many as possible now, respecting cooldown
            while (this.food >= 10) {
                const spawned = this.spawn();
                // If spawn fails due to cooldown, schedule remaining spawns and exit loop
                if (!spawned) {
                    this.scheduleSpawnAttempt();
                    break;
                }

                // Update stats after successful spawn
                if (this.simulation.updateStats) this.simulation.updateStats();
                // Continue loop to attempt further immediate spawns (until food < 10 or cooldown applies)
            }
        }
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
