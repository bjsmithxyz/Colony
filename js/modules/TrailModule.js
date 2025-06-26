import { Module } from '../Module.js';

export class TrailModule extends Module {
    constructor() {
        super({
            id: 'persistent_trails',
            name: 'Persistent Trails',
            description: 'Individual paths remain visible longer for tracking movement patterns',
            type: 'visual',
            cost: 8,
            stackable: false,
            requirements: []
        });
        this.originalFadeRate = 0.98;
        this.enhancedFadeRate = 0.995;
    }

    applyEffects(target, simulation) {
        // Affect the global trail system
        if (simulation.trailSystem) {
            simulation.trailSystem.fadeRate = this.enhancedFadeRate;
        }
        target.persistentTrails = true;
    }

    removeEffects(target, simulation) {
        // Check if any other nodes have this module active
        const otherNodesWithTrails = simulation.nodes.filter(node => 
            node !== target && node.persistentTrails
        );
        
        if (otherNodesWithTrails.length === 0) {
            // No other nodes have persistent trails, restore original fade rate
            if (simulation.trailSystem) {
                simulation.trailSystem.fadeRate = this.originalFadeRate;
            }
        }
        
        target.persistentTrails = false;
    }
}