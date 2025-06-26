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
        
        switch (this.state) {
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
        
        if (distanceMoved < 0.1) {
            this.stuckCounter++;
            if (this.stuckCounter > 30) { // Stuck for 30 frames
                this.direction = Math.random() * Math.PI * 2;
                this.stuckCounter = 0;
            }
        } else {
            this.stuckCounter = 0;
        }
    }

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

    handleReturning(simulation) {
        const distance = this.getDistanceToTarget(this.individual.parentNode);
        
        if (distance < 3) {
            // Close enough to deposit food
            this.individual.parentNode.food += this.individual.carrying;
            simulation.totalFoodCollected += this.individual.carrying;
            this.individual.carrying = 0;
            this.state = 'SEARCHING';
        } else {
            this.setDirectionToTarget(this.individual.parentNode);
        }
    }

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
        
        const nearbyIndividuals = simulation.findNearbyEntities(
            this.individual.x, 
            this.individual.y, 
            this.individual.communicationRange
        );
        
        for (const entity of nearbyIndividuals) {
            if (entity.targetFood && entity !== this.individual && entity.targetFood.amount > 0) {
                // Share known food source
                if (!this.knownFoodSources.includes(entity.targetFood)) {
                    this.knownFoodSources.push(entity.targetFood);
                    return entity.targetFood;
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

    randomWalk(changeFrequency = 0.2) {
        if (Math.random() < changeFrequency) {
            this.direction += (Math.random() - 0.5) * Math.PI / 4;
        }
    }

    setDirectionToTarget(target) {
        this.direction = Math.atan2(target.y - this.individual.y, target.x - this.individual.x);
    }

    getDistanceToTarget(target) {
        return Math.sqrt(
            Math.pow(target.x - this.individual.x, 2) + 
            Math.pow(target.y - this.individual.y, 2)
        );
    }

    move() {
        const dx = Math.cos(this.direction) * this.individual.speed;
        const dy = Math.sin(this.direction) * this.individual.speed;
        
        this.individual.x += dx;
        this.individual.y += dy;
        
        // Boundary checking
        this.individual.x = Math.max(0, Math.min(this.individual.x, this.individual.simulation?.CONFIG?.MAP?.WIDTH || 1024));
        this.individual.y = Math.max(0, Math.min(this.individual.y, this.individual.simulation?.CONFIG?.MAP?.HEIGHT || 1024));
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
