import { Module } from '../Module.js';
import { CONFIG } from '../config.js';

export class SpeedModule extends Module {
    constructor() {
        super({
            id: 'speed_enhancement',
            name: 'Increased Speed',
            description: 'Doubles the movement speed of individuals spawned by this node (1→2 pixels/frame)',
            type: 'enhancement',
            cost: 20,
            stackable: false,
            requirements: []
        });
        this.originalSpeed = CONFIG.INDIVIDUAL.MOVEMENT_SPEED;
        this.enhancedSpeed = 2;
    }

    applyEffects(target, simulation) {
        target.speedEnhanced = true;
        
        // Apply to existing individuals from this node
        target.individuals.forEach(individual => {
            individual.speed = this.enhancedSpeed;
        });
    }

    removeEffects(target, simulation) {
        target.speedEnhanced = false;
        
        // Restore original speed to existing individuals
        target.individuals.forEach(individual => {
            individual.speed = this.originalSpeed;
        });
    }
}