import { Module } from '../Module.js';
import { CONFIG } from '../config.js';

export class CapacityModule extends Module {
    constructor() {
        super({
            id: 'capacity_enhancement',
            name: 'Increased Capacity',
            description: 'Doubles the carrying capacity of individuals spawned by this node (2→4 food units)',
            type: 'enhancement',
            cost: 30,
            stackable: false,
            requirements: []
        });
        this.originalCapacity = CONFIG.INDIVIDUAL.CARRYING_CAPACITY;
        this.enhancedCapacity = 4;
    }

    applyEffects(target, simulation) {
        target.capacityEnhanced = true;
        
        // Apply to existing individuals from this node
        target.individuals.forEach(individual => {
            individual.carryingCapacity = this.enhancedCapacity;
        });
    }

    removeEffects(target, simulation) {
        target.capacityEnhanced = false;
        
        // Restore original capacity to existing individuals
        target.individuals.forEach(individual => {
            individual.carryingCapacity = this.originalCapacity;
        });
    }
}