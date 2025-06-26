import { CONFIG } from './config.js';

export class Individual {
    constructor(parentNode) {
        this.parentNode = parentNode;
        this.x = parentNode.x;
        this.y = parentNode.y;
        this.color = parentNode.customColor ? parentNode.individuals.length > 0 ? 
            parentNode.individuals[0].color : CONFIG.INDIVIDUAL.COLOR : CONFIG.INDIVIDUAL.COLOR;
        this.size = CONFIG.INDIVIDUAL.SIZE;
        this.speed = parentNode.speedEnhanced ? 2 : CONFIG.INDIVIDUAL.MOVEMENT_SPEED;
        this.detectionRange = parentNode.visionEnhanced ? 10 : CONFIG.INDIVIDUAL.DETECTION_RANGE;
        this.carryingCapacity = parentNode.capacityEnhanced ? 4 : CONFIG.INDIVIDUAL.CARRYING_CAPACITY;
        this.energyConsumption = parentNode.efficiencyEnhanced ? 0.5 : CONFIG.INDIVIDUAL.ENERGY_CONSUMPTION;
        this.customColor = parentNode.customColor || false;
        
        // Behavioral properties
        this.communicationEnabled = parentNode.communicationEnabled || false;
        this.communicationRange = this.communicationEnabled ? 3 : 0;
        this.proximityPriority = parentNode.proximityPriority || false;
        this.clusterMovement = parentNode.clusterMovement || false;
        this.clusterRange = this.clusterMovement ? 8 : 0;
        this.clusterForce = this.clusterMovement ? 0.3 : 0;
        this.specialization = null;
        this.scoutMode = false;
        this.workerMode = false;
        
        this.state = 'SEARCHING';
        this.direction = Math.random() * Math.PI * 2;
        this.carrying = 0;
        this.targetFood = null;
        this.knownFoodSources = [];
        
        // Apply specialization if enabled
        if (parentNode.specializationEnabled) {
            this.assignSpecialization();
        }
        
        this.isDead = false;
    }
    
    reset(parentNode) {
        this.parentNode = parentNode;
        this.x = parentNode.x;
        this.y = parentNode.y;
        this.color = parentNode.customColor ? parentNode.individuals.length > 0 ? 
            parentNode.individuals[0].color : CONFIG.INDIVIDUAL.COLOR : CONFIG.INDIVIDUAL.COLOR;
        this.size = CONFIG.INDIVIDUAL.SIZE;
        this.speed = parentNode.speedEnhanced ? 2 : CONFIG.INDIVIDUAL.MOVEMENT_SPEED;
        this.detectionRange = parentNode.visionEnhanced ? 10 : CONFIG.INDIVIDUAL.DETECTION_RANGE;
        this.carryingCapacity = parentNode.capacityEnhanced ? 4 : CONFIG.INDIVIDUAL.CARRYING_CAPACITY;
        this.energyConsumption = parentNode.efficiencyEnhanced ? 0.5 : CONFIG.INDIVIDUAL.ENERGY_CONSUMPTION;
        this.customColor = parentNode.customColor || false;
        
        // Reset behavioral properties
        this.communicationEnabled = parentNode.communicationEnabled || false;
        this.communicationRange = this.communicationEnabled ? 3 : 0;
        this.proximityPriority = parentNode.proximityPriority || false;
        this.clusterMovement = parentNode.clusterMovement || false;
        this.clusterRange = this.clusterMovement ? 8 : 0;
        this.clusterForce = this.clusterMovement ? 0.3 : 0;
        this.specialization = null;
        this.scoutMode = false;
        this.workerMode = false;
        
        // Reset state
        this.state = 'SEARCHING';
        this.direction = Math.random() * Math.PI * 2;
        this.carrying = 0;
        this.targetFood = null;
        this.knownFoodSources = [];
        this.isDead = false;
        
        // Apply specialization if enabled
        if (parentNode.specializationEnabled) {
            this.assignSpecialization();
        }
    }

    update(simulation) {
        const prevState = this.state;
        
        switch (this.state) {
            case 'SEARCHING':
                // Communication with nearby individuals
                if (this.communicationEnabled) {
                    this.communicateWithNearby(simulation.individuals);
                }
                
                if (this.knownFoodSources.length > 0) {
                    this.checkKnownFoodSources();
                }
                if (this.state === 'SEARCHING') {
                    this.randomWalk(simulation.individuals);
                    this.detectFood(simulation.foodSources);
                }
                break;
            case 'MOVING_TO_FOOD':
                // Check if food was depleted while moving
                if (this.targetFood && this.targetFood.depleted) {
                    this.targetFood = null;
                    this.state = 'SEARCHING';
                } else {
                    this.moveToTarget(this.targetFood);
                }
                break;
            case 'COLLECTING':
                this.collectFood();
                break;
            case 'RETURNING':
                this.moveToTarget(this.parentNode);
                break;
            case 'DEPOSITING':
                this.depositFood();
                break;
        }
        
        // State transitions are now silent for performance
    }

    assignSpecialization() {
        const rand = Math.random();
        if (rand < 0.3) {
            // Scout - faster, better detection, less carrying capacity
            this.specialization = 'scout';
            this.scoutMode = true;
            this.speed *= 1.5;
            this.detectionRange *= 1.5;
            this.carryingCapacity = Math.max(1, Math.floor(this.carryingCapacity * 0.5));
        } else {
            // Worker - normal speed, normal detection, better carrying capacity
            this.specialization = 'worker';
            this.workerMode = true;
            this.carryingCapacity = Math.floor(this.carryingCapacity * 1.5);
        }
    }

    communicateWithNearby(allIndividuals) {
        if (!this.communicationEnabled) return;
        
        for (const other of allIndividuals) {
            if (other === this || other.parentNode !== this.parentNode) continue;
            
            const distance = Math.sqrt(
                (other.x - this.x) ** 2 + (other.y - this.y) ** 2
            );
            
            if (distance <= this.communicationRange) {
                // Share known food sources
                other.knownFoodSources.forEach(food => {
                    if (!food.depleted && !this.knownFoodSources.includes(food)) {
                        this.knownFoodSources.push(food);
                    }
                });
                
                this.knownFoodSources.forEach(food => {
                    if (!food.depleted && !other.knownFoodSources.includes(food)) {
                        other.knownFoodSources.push(food);
                    }
                });
            }
        }
    }

    calculateClusterForce(allIndividuals) {
        let forceX = 0;
        let forceY = 0;
        let nearbyCount = 0;
        
        for (const other of allIndividuals) {
            if (other === this || other.parentNode !== this.parentNode) continue;
            
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance <= this.clusterRange) {
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;
                
                // Attraction force (pull towards nearby individuals)
                forceX += normalizedDx * this.clusterForce;
                forceY += normalizedDy * this.clusterForce;
                nearbyCount++;
            }
        }
        
        if (nearbyCount > 0) {
            forceX /= nearbyCount;
            forceY /= nearbyCount;
        }
        
        return { x: forceX, y: forceY };
    }

    randomWalk(allIndividuals) {
        this.direction += (Math.random() - 0.5) * 0.5;
        
        let dx = Math.cos(this.direction) * this.speed;
        let dy = Math.sin(this.direction) * this.speed;
        
        // Apply cluster movement if enabled
        if (this.clusterMovement && allIndividuals) {
            const clusterForce = this.calculateClusterForce(allIndividuals);
            dx += clusterForce.x;
            dy += clusterForce.y;
        }
        
        this.x += dx;
        this.y += dy;
        
        if (this.x < 0 || this.x >= CONFIG.MAP.WIDTH) {
            this.x = Math.max(0, Math.min(CONFIG.MAP.WIDTH - 1, this.x));
            this.direction = Math.PI - this.direction;
        }
        
        if (this.y < 0 || this.y >= CONFIG.MAP.HEIGHT) {
            this.y = Math.max(0, Math.min(CONFIG.MAP.HEIGHT - 1, this.y));
            this.direction = -this.direction;
        }
    }

    detectFood(foodSources) {
        for (const food of foodSources) {
            if (!food.depleted && food.getDistance(this.x, this.y) <= this.detectionRange) {
                this.targetFood = food;
                this.state = 'MOVING_TO_FOOD';
                food.reveal();
                
                if (!this.knownFoodSources.includes(food)) {
                    this.knownFoodSources.push(food);
                }
                break;
            }
        }
    }

    moveToTarget(target) {
        if (!target) {
            this.state = 'SEARCHING';
            return;
        }
        
        let targetX, targetY;
        
        if (target === this.parentNode) {
            // When returning to parent node, find closest pixel
            const closestPixel = this.parentNode.getClosestPixelTo(this.x, this.y);
            if (closestPixel) {
                targetX = closestPixel.x;
                targetY = closestPixel.y;
            } else {
                targetX = this.parentNode.x;
                targetY = this.parentNode.y;
            }
        } else {
            // Handle FoodSource (centerX,centerY)
            targetX = target.centerX;
            targetY = target.centerY;
        }
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) {
            if (this.state === 'MOVING_TO_FOOD') {
                this.state = 'COLLECTING';
            } else if (this.state === 'RETURNING') {
                this.state = 'DEPOSITING';
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    collectFood() {
        if (this.targetFood && !this.targetFood.depleted) {
            const collected = this.targetFood.deplete(CONFIG.FOOD.DEPLETION_RATE);
            this.carrying = Math.min(collected, this.carryingCapacity);
            this.targetFood = null; // Clear reference after collecting
            this.state = 'RETURNING';
        } else {
            this.targetFood = null;
            this.state = 'SEARCHING';
        }
    }

    checkKnownFoodSources() {
        // Remove depleted food sources
        for (let i = this.knownFoodSources.length - 1; i >= 0; i--) {
            if (this.knownFoodSources[i].depleted) {
                this.knownFoodSources.splice(i, 1);
            }
        }
        
        if (this.knownFoodSources.length === 0) return;
        
        let targetFood;
        if (this.proximityPriority) {
            // Choose closest food source
            targetFood = this.knownFoodSources.reduce((closest, food) => {
                const closestDist = food.getDistance(this.x, this.y);
                const currentDist = closest.getDistance(this.x, this.y);
                return closestDist < currentDist ? food : closest;
            });
        } else {
            // Choose first available food source
            targetFood = this.knownFoodSources[0];
        }
        
        this.targetFood = targetFood;
        this.state = 'MOVING_TO_FOOD';
    }

    depositFood() {
        // Find where the individual is depositing (closest pixel to their position)
        const closestPixel = this.parentNode.getClosestPixelTo(this.x, this.y);
        let sourceDirection = null;
        let depositLocation = null;
        
        if (closestPixel) {
            // Calculate direction from the deposit point toward where food came from
            const dx = this.x - closestPixel.x;
            const dy = this.y - closestPixel.y;
            depositLocation = closestPixel.pixel; // The actual pixel object
            
            // Convert to 8-directional system
            const angle = Math.atan2(dy, dx);
            const octant = Math.round(angle / (Math.PI / 4));
            
            switch (octant) {
                case 0: sourceDirection = 'east'; break;
                case 1: sourceDirection = 'southeast'; break;
                case 2: sourceDirection = 'south'; break;
                case 3: sourceDirection = 'southwest'; break;
                case 4: case -4: sourceDirection = 'west'; break;
                case -3: sourceDirection = 'northwest'; break;
                case -2: sourceDirection = 'north'; break;
                case -1: sourceDirection = 'northeast'; break;
            }
        } else {
            // Fallback to old method if no closest pixel found
            const dx = this.x - this.parentNode.x;
            const dy = this.y - this.parentNode.y;
            const angle = Math.atan2(dy, dx);
            const octant = Math.round(angle / (Math.PI / 4));
            
            switch (octant) {
                case 0: sourceDirection = 'east'; break;
                case 1: sourceDirection = 'southeast'; break;
                case 2: sourceDirection = 'south'; break;
                case 3: sourceDirection = 'southwest'; break;
                case 4: case -4: sourceDirection = 'west'; break;
                case -3: sourceDirection = 'northwest'; break;
                case -2: sourceDirection = 'north'; break;
                case -1: sourceDirection = 'northeast'; break;
            }
        }
        
        this.parentNode.storeFood(this.carrying - this.energyConsumption, sourceDirection, depositLocation);
        this.carrying = 0;
        this.state = 'SEARCHING';
        this.direction = Math.random() * Math.PI * 2;
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
    }
}