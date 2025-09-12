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
    this.lastSpawnTime = 0; // timestamp (ms) of last automatic spawn
    this.spawnCooldown = 5000; // cooldown in milliseconds between spawns
    this.spawnTimer = null; // timeout id for scheduled spawn attempts
        
        // Initialize pixel array for organic shape
        this.pixels = [];
        
        // Initialize specialized managers
        this.growthManager = new NodeGrowthManager(this);
        this.renderer = new NodeRenderer(this);
        this.shapeGenerator = new NodeShapeGenerator(this);
        
        // Generate initial organic shape
        this.shapeGenerator.generateOrganicShape();
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
    scheduleSpawnAttempt() {
        // If there's already a timer scheduled, don't schedule another
        if (this.spawnTimer) return;

        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const timeSinceLast = now - this.lastSpawnTime;
        const remaining = Math.max(0, this.spawnCooldown - timeSinceLast);

        this.spawnTimer = setTimeout(() => this.attemptScheduledSpawn(), remaining + 10); // small buffer
    }

    /**
     * Attempt to spawn when timer fires. If multiple spawns are possible, continue scheduling
     * until food < 10.
     */
    attemptScheduledSpawn() {
        this.spawnTimer = null;

        if (!this.simulation) return;

        // Try to spawn as many as cooldown permits; spawn() itself will enforce cooldown
        while (this.food >= 10) {
            const spawned = this.spawn();
            if (!spawned) {
                // If still blocked by cooldown (rare), schedule another attempt
                this.scheduleSpawnAttempt();
                return;
            }

            if (this.simulation.updateStats) this.simulation.updateStats();
        }
    }

    cancelScheduledSpawn() {
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
            this.spawnTimer = null;
        }
    }

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
        
        return this.pixels.some(pixel => 
            pixel.dx === Math.floor(relativeX) && 
            pixel.dy === Math.floor(relativeY)
        );
    }
}
