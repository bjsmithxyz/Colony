import { Module } from '../Module.js';
import { CONFIG } from '../config.js';

export class EfficiencyModule extends Module {
    constructor() {
        super({
            id: 'efficiency_enhancement',
            name: 'Energy Efficiency',
            description: 'Reduces energy consumption per trip for individuals from this node (1→0.5 food)',
            type: 'enhancement',
            cost: 25,
            stackable: false,
            requirements: []
        });
        this.originalConsumption = CONFIG.INDIVIDUAL.ENERGY_CONSUMPTION;
        this.enhancedConsumption = 0.5;
    }

    applyEffects(target, simulation) {
        target.efficiencyEnhanced = true;
        
        // Apply to existing individuals from this node
        target.individuals.forEach(individual => {
            individual.energyConsumption = this.enhancedConsumption;
        });
    }

    removeEffects(target, simulation) {
        target.efficiencyEnhanced = false;
        
        // Restore original consumption to existing individuals
        target.individuals.forEach(individual => {
            individual.energyConsumption = this.originalConsumption;
        });
    }
}