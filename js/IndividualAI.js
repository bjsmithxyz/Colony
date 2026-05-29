import { CONSTANTS } from './constants.js';

/**
 * Individual AI Behavior System
 * Handles decision making, pathfinding, and behavioral logic
 */
export class IndividualAI {
    constructor(individual) {
        this.individual = individual;
        this.state = 'SEARCHING';
        this.direction = Math.random() * Math.PI * 2;
        this.targetFood = null;
        this.knownFoodSources = [];
        this.lastDirectionChange = 0;
        this.stuckCounter = 0;
        this.lastPosition = { x: individual.x, y: individual.y };
    }

    update(simulation) {
        this.updateStuckDetection();
        
        // If individual is a dropper, force DROPPER behavior
        if (this.individual.willDropNodeOnDeath) {
            this.state = 'DROPPER';
        }

        switch (this.state) {
            case 'DROPPER':
                this.handleDropper(simulation);
                break;
            case 'SEARCHING':
                this.handleSearching(simulation);
                break;
            case 'TARGETING':
                this.handleTargeting(simulation);
                break;
            case 'RETURNING':
                this.handleReturning(simulation);
                break;
        }
        
        this.move();
        this.updateLastPosition();
    }

    updateStuckDetection() {
        const distanceMoved = Math.sqrt(
            Math.pow(this.individual.x - this.lastPosition.x, 2) + 
            Math.pow(this.individual.y - this.lastPosition.y, 2)
        );
        
        if (distanceMoved < CONSTANTS.STUCK_THRESHOLD) {
            this.stuckCounter++;
            if (this.stuckCounter > CONSTANTS.STUCK_FRAME_COUNT) {
                this.direction = Math.random() * Math.PI * 2;
                this.stuckCounter = 0;
            }
        } else {
            this.stuckCounter = 0;
        }
    }

    /**
     * Handle searching state - look for food and apply behaviors
     * 
     * @param {Simulation} simulation - The simulation instance
     */
    handleSearching(simulation) {
        // Look for food sources
        const nearbyFood = this.scanForFood(simulation);
        if (nearbyFood) {
            this.targetFood = nearbyFood;
            this.state = 'TARGETING';
            this.setDirectionToTarget(nearbyFood);
            return;
        }

        // Check for communication from other individuals
        if (this.individual.communicationEnabled) {
            const sharedFood = this.getCommunicatedFoodSource(simulation);
            if (sharedFood) {
                this.targetFood = sharedFood;
                this.state = 'TARGETING';
                this.setDirectionToTarget(sharedFood);
                return;
            }
        }

        // Apply specialization behavior
        if (this.individual.specialization) {
            this.applySpecializationBehavior(simulation);
        } else {
            this.randomWalk();
        }

        // Apply cluster movement if enabled
        if (this.individual.clusterMovement) {
            this.applyClusterMovement(simulation);
        }
    }

    /**
     * Handle targeting state - move toward food source
     * 
     * @param {Simulation} simulation - The simulation instance
     */
    handleTargeting(simulation) {
        if (!this.targetFood || this.targetFood.amount <= 0) {
            this.state = 'SEARCHING';
            this.targetFood = null;
            return;
        }

        const distance = this.getDistanceToTarget(this.targetFood);
        
        if (distance < 2) {
            // Close enough to collect food
            const collected = this.targetFood.collect(this.individual.carryingCapacity - this.individual.carrying);
            this.individual.carrying += collected;
            
            // Remember this food source
            if (!this.knownFoodSources.includes(this.targetFood)) {
                this.knownFoodSources.push(this.targetFood);
            }

            // If this individual was immune until finding initial food, clear that flag now
            if (collected > 0 && this.individual.initialImmune) {
                this.individual.initialImmune = false;
            }
            
            if (this.individual.carrying >= this.individual.carryingCapacity) {
                this.state = 'RETURNING';
                this.setDirectionToTarget(this.individual.parentNode);
            } else if (this.targetFood.amount <= 0) {
                this.state = 'SEARCHING';
                this.targetFood = null;
            }
        } else {
            this.setDirectionToTarget(this.targetFood);
        }
    }

    /**
     * Handle returning state - return to node to deposit food
     * 
     * @param {Simulation} simulation - The simulation instance
     */
    handleReturning(simulation) {
        // Find nearest depot location (node center or merged node locations)
        const node = this.individual.parentNode;
        let nearestDepot = node.depotLocations[0]; // Default to first depot
        let nearestDistance = Infinity;
        
        // Find closest depot location
        for (const depot of node.depotLocations) {
            const dist = Math.sqrt(
                Math.pow(depot.x - this.individual.x, 2) + 
                Math.pow(depot.y - this.individual.y, 2)
            );
            if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestDepot = depot;
            }
        }
        
        if (nearestDistance < 3) {
            const amount = this.individual.carrying;
            if (amount > 0) {
                node.storeFood(amount, null, {
                    x: Math.round(nearestDepot.x),
                    y: Math.round(nearestDepot.y)
                });
                this.individual.carrying = 0;
            }
            
            // If we remember a food source that still has food, go back to it
            if (this.targetFood && this.targetFood.amount > 0) {
                this.state = 'TARGETING';
                this.setDirectionToTarget(this.targetFood);
            } else {
                this.state = 'SEARCHING';
                this.targetFood = null;
            }
        } else {
            // Move toward nearest depot
            this.setDirectionToTarget(nearestDepot);
        }
    }

    /**
     * Scan for nearby food sources
     * 
     * @param {Simulation} simulation - The simulation instance
     * @returns {FoodSource|null} The closest food source, or null if none found
     */
    scanForFood(simulation) {
        const nearbyEntities = simulation.findNearbyEntities(
            this.individual.x, 
            this.individual.y, 
            this.individual.detectionRange
        );
        
        let closestFood = null;
        let closestDistance = Infinity;
        
        for (const entity of nearbyEntities) {
            if (entity.amount !== undefined && entity.amount > 0) { // It's a food source
                // If this individual should ignore food (e.g., special dropper role), skip
                if (this.individual.ignoreFood) continue;
                const distance = this.getDistanceToTarget(entity);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestFood = entity;
                }
            }
        }
        
        return closestFood;
    }

    getCommunicatedFoodSource(simulation) {
        if (!this.individual.communicationEnabled) return null;
        if (this.individual.ignoreFood) return null;
        
        const nearbyIndividuals = simulation.findNearbyEntities(
            this.individual.x, 
            this.individual.y, 
            this.individual.communicationRange
        );
        
        for (const entity of nearbyIndividuals) {
            if (entity === this.individual) continue;
            const sharedTarget = entity.getTargetFood?.() ?? entity.ai?.targetFood;
            if (sharedTarget && sharedTarget.amount > 0) {
                if (!this.knownFoodSources.includes(sharedTarget)) {
                    this.knownFoodSources.push(sharedTarget);
                    return sharedTarget;
                }
            }
        }
        
        return null;
    }

    applySpecializationBehavior(simulation) {
        switch (this.individual.specialization) {
            case 'scout':
                // Scouts move faster and cover more ground
                this.individual.speed = Math.max(this.individual.speed, 1.5);
                this.randomWalk(0.3); // More frequent direction changes
                break;
            case 'worker':
                // Workers are more methodical and thorough
                this.randomWalk(0.1); // Less frequent direction changes
                break;
            case 'gatherer':
                // Gatherers focus on known food sources
                if (this.knownFoodSources.length > 0) {
                    const validSources = this.knownFoodSources.filter(source => source.amount > 0);
                    if (validSources.length > 0) {
                        this.targetFood = validSources[0];
                        this.state = 'TARGETING';
                        this.setDirectionToTarget(this.targetFood);
                    }
                }
                break;
        }
    }

    applyClusterMovement(simulation) {
        const nearbyIndividuals = simulation.findNearbyEntities(
            this.individual.x, 
            this.individual.y, 
            this.individual.clusterRange
        );
        
        if (nearbyIndividuals.length > 1) {
            let avgX = 0, avgY = 0;
            let count = 0;
            
            for (const entity of nearbyIndividuals) {
                if (entity !== this.individual && entity.parentNode === this.individual.parentNode) {
                    avgX += entity.x;
                    avgY += entity.y;
                    count++;
                }
            }
            
            if (count > 0) {
                avgX /= count;
                avgY /= count;
                
                // Apply cluster force
                const clusterDirection = Math.atan2(avgY - this.individual.y, avgX - this.individual.x);
                this.direction = this.direction * (1 - this.individual.clusterForce) + 
                                clusterDirection * this.individual.clusterForce;
            }
        }
    }

    /**
     * Dropper behavior: purely random wandering, no food interactions, no clustering or communication.
     * 
     * @param {Simulation} simulation - The simulation instance
     */
    handleDropper(simulation) {
        // Simple random walk with occasional direction changes
        this.randomWalk(0.4);
        // Slightly slower movement to increase lifetime so droppers wander visibly
        this.individual.speed = Math.max(this.individual.speed * 0.9, 0.4);
    }

    randomWalk(changeFrequency = 0.2) {
        if (Math.random() < changeFrequency) {
            this.direction += (Math.random() - 0.5) * Math.PI / 4;
        }
    }

    /**
     * Set movement direction toward target
     * 
     * @param {Object} target - Target object with x and y properties
     */
    setDirectionToTarget(target) {
        this.direction = Math.atan2(target.y - this.individual.y, target.x - this.individual.x);
    }

    /**
     * Calculate distance to target
     * 
     * @param {Object} target - Target object with x and y properties
     * @returns {number} Distance to target
     */
    getDistanceToTarget(target) {
        return Math.sqrt(
            Math.pow(target.x - this.individual.x, 2) + 
            Math.pow(target.y - this.individual.y, 2)
        );
    }

    move() {
        const dx = Math.cos(this.direction) * this.individual.speed;
        const dy = Math.sin(this.direction) * this.individual.speed;
        
        // Calculate terrain movement cost if terrain is enabled
        let terrainCost = 1.0;
        if (this.individual.simulation && this.individual.simulation.terrainMap) {
            terrainCost = this.individual.simulation.terrainMap.getMovementCost(
                this.individual.x,
                this.individual.y,
                dx,
                dy
            );
        }
        
        // Apply movement
        this.individual.x += dx;
        this.individual.y += dy;
        
        // Boundary checking
        this.individual.x = Math.max(0, Math.min(this.individual.x, this.individual.simulation?.CONFIG?.MAP?.WIDTH || 1024));
        this.individual.y = Math.max(0, Math.min(this.individual.y, this.individual.simulation?.CONFIG?.MAP?.HEIGHT || 1024));
        
        // Store terrain cost for energy calculation
        this.individual._terrainCost = terrainCost;
    }

    updateLastPosition() {
        this.lastPosition.x = this.individual.x;
        this.lastPosition.y = this.individual.y;
    }

    // Getters for external access
    getState() { return this.state; }
    getDirection() { return this.direction; }
    getTargetFood() { return this.targetFood; }
}
