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
        // Check if node has enough food (10 food cost)
        if (this.simulation && this.food >= 10) {
            const individual = this.simulation.individualPool.acquire(this);
            
            // Apply specialization if enabled
            if (this.specializationEnabled) {
                individual.assignSpecialization();
            }
            
            // Deduct food cost
            this.food -= 10;
            
            this.simulation.individuals.push(individual);
            this.individuals.push(individual);
            this.simulation.totalIndividualsSpawned++;
            this.pulseAnimation = 1;
            
            return true;
        }
        return false;
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
        if (this.simulation && amount > 0) {
            this.simulation.totalFoodCollected += amount;
        }
        
        // Delegate growth processing to growth manager
        this.growthManager.processGrowth(amount, sourceDirection, depositLocation);
        
        this.lastFoodAmount = this.food;
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
