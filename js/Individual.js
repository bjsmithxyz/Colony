import { CONFIG } from './config.js';
import { IndividualAI } from './IndividualAI.js';

/**
 * Individual class - modular architecture with separated concerns
 * Handles state and rendering, delegates AI to IndividualAI
 */
export class Individual {
    constructor(parentNode) {
        this.parentNode = parentNode;
        this.initializeProperties();
        this.initializeAI();
        this.isDead = false;
    }

    initializeProperties() {
        // Position
        this.x = this.parentNode.x;
        this.y = this.parentNode.y;
        
        // Visual properties
        this.color = this.determineColor();
        this.size = CONFIG.INDIVIDUAL.SIZE;
        this.customColor = this.parentNode.customColor || false;
        
        // Enhanced properties from parent node
        this.speed = this.parentNode.speedEnhanced ? 2 : CONFIG.INDIVIDUAL.MOVEMENT_SPEED;
        this.detectionRange = this.parentNode.visionEnhanced ? 10 : CONFIG.INDIVIDUAL.DETECTION_RANGE;
        this.carryingCapacity = this.parentNode.capacityEnhanced ? 4 : CONFIG.INDIVIDUAL.CARRYING_CAPACITY;
        this.energyConsumption = this.parentNode.efficiencyEnhanced ? 0.5 : CONFIG.INDIVIDUAL.ENERGY_CONSUMPTION;
        
        // Behavioral properties
        this.communicationEnabled = this.parentNode.communicationEnabled || false;
        this.communicationRange = this.communicationEnabled ? 3 : 0;
        this.proximityPriority = this.parentNode.proximityPriority || false;
        this.clusterMovement = this.parentNode.clusterMovement || false;
        this.clusterRange = this.clusterMovement ? 8 : 0;
        this.clusterForce = this.clusterMovement ? 0.3 : 0;
        
        // State
        this.carrying = 0;
        this.specialization = null;
        this.scoutMode = false;
        this.workerMode = false;
    // Immortality until initial food is found (used for the very first individual)
    this.initialImmune = false;
    // If true the individual will ignore/ not react to food sources
    this.ignoreFood = false;
    // If true the individual will drop a new node at death
    this.willDropNodeOnDeath = false;
        
        // Apply specialization if enabled
        if (this.parentNode.specializationEnabled) {
            this.assignSpecialization();
        }
    }

    initializeAI() {
        this.ai = new IndividualAI(this);
    }

    determineColor() {
        if (this.parentNode.customColor && this.parentNode.individuals.length > 0) {
            return this.parentNode.individuals[0].color;
        }
        return CONFIG.INDIVIDUAL.COLOR;
    }

    assignSpecialization() {
        const nodeIndividuals = this.parentNode.individuals;
        const totalIndividuals = nodeIndividuals.length + 1; // +1 for this individual
        
        // Assign specialization based on spawn order and node needs
        if (totalIndividuals <= 2) {
            this.specialization = 'scout';
            this.scoutMode = true;
            this.speed *= 1.2;
            this.detectionRange *= 1.5;
        } else if (totalIndividuals <= 5) {
            this.specialization = 'worker';
            this.workerMode = true;
            this.carryingCapacity = Math.floor(this.carryingCapacity * 1.3);
        } else {
            this.specialization = 'gatherer';
            this.energyConsumption *= 0.8;
        }
    }

    reset(parentNode) {
        this.parentNode = parentNode;
        this.initializeProperties();
        this.initializeAI();
        this.isDead = false;
    }

    update(simulation) {
        // Store reference to simulation for AI
        this.simulation = simulation;
        
        // Delegate AI behavior
        this.ai.update(simulation);
        
        // Handle energy consumption and death
        this.updateEnergy();
        
        // Apply priority system if enabled
        if (this.proximityPriority) {
            this.applyProximityPriority(simulation);
        }
    }

    updateEnergy() {
        // Simple energy system - individuals die if they don't find food
        if (this.carrying === 0) {
            this.energyLevel = (this.energyLevel || 3000) - this.energyConsumption;
            if (this.energyLevel <= 0) {
                // Respect initial immunity: the very first spawned individual may be immune
                if (!this.initialImmune) {
                    this.isDead = true;
                }
            }
        } else {
            this.energyLevel = 3000; // Reset energy when carrying food
        }
    }

    applyProximityPriority(simulation) {
        // Prioritize closer food sources when multiple are available
        if (this.ai.getState() === 'SEARCHING') {
            const nearbyEntities = simulation.findNearbyEntities(this.x, this.y, this.detectionRange * 1.5);
            const foodSources = nearbyEntities.filter(entity => entity.amount !== undefined && entity.amount > 0);
            
            if (foodSources.length > 1) {
                // Sort by distance and prefer closer ones
                foodSources.sort((a, b) => {
                    const distA = Math.sqrt(Math.pow(a.x - this.x, 2) + Math.pow(a.y - this.y, 2));
                    const distB = Math.sqrt(Math.pow(b.x - this.x, 2) + Math.pow(b.y - this.y, 2));
                    return distA - distB;
                });
                
                this.ai.targetFood = foodSources[0];
                this.ai.state = 'TARGETING';
            }
        }
    }

    render(ctx) {
        // Use custom color if available, otherwise show carrying status
        let renderColor;
        if (this.customColor) {
            renderColor = this.color;
        } else {
            renderColor = this.carrying > 0 ? CONFIG.FOOD.COLOR_REVEALED : this.color;
        }
        
        ctx.fillStyle = renderColor;
        ctx.fillRect(
            Math.floor(this.x),
            Math.floor(this.y),
            this.size,
            this.size
        );
        
        // Add a small indicator for carrying food if using custom colors
        if (this.customColor && this.carrying > 0) {
            ctx.fillStyle = CONFIG.FOOD.COLOR_REVEALED;
            ctx.fillRect(
                Math.floor(this.x),
                Math.floor(this.y),
                1,
                1
            );
        }

        // Draw dropper marker (small red ring) if this individual will drop a node on death
        if (this.willDropNodeOnDeath) {
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Getters for external access to AI state
    getState() { return this.ai.getState(); }
    getDirection() { return this.ai.getDirection(); }
    getTargetFood() { return this.ai.getTargetFood(); }
}
