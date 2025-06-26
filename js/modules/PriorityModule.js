import { Module } from '../Module.js';

export class PriorityModule extends Module {
    constructor() {
        super({
            id: 'proximity_priority',
            name: 'Proximity Priority',
            description: 'Individuals prefer closer food sources, optimizing travel efficiency',
            type: 'behavior',
            cost: 25,
            stackable: false,
            requirements: []
        });
    }

    applyEffects(target, simulation) {
        target.proximityPriority = true;
        
        // Apply to existing individuals from this node
        target.individuals.forEach(individual => {
            individual.proximityPriority = true;
        });
    }

    removeEffects(target, simulation) {
        target.proximityPriority = false;
        
        target.individuals.forEach(individual => {
            individual.proximityPriority = false;
        });
    }
}