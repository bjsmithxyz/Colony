import { Module } from '../Module.js';
import { CONFIG } from '../config.js';

export class VisionModule extends Module {
    constructor() {
        super({
            id: 'vision_enhancement',
            name: 'Enhanced Vision',
            description: 'Doubles the detection range of individuals spawned by this node (5→10 pixels)',
            type: 'enhancement',
            cost: 15,
            stackable: false,
            requirements: []
        });
        this.originalDetectionRange = CONFIG.INDIVIDUAL.DETECTION_RANGE;
        this.enhancedDetectionRange = 10;
    }

    applyEffects(target, simulation) {
        // This module affects the node, which then affects future individuals
        target.visionEnhanced = true;
        
        // Also apply to existing individuals from this node
        target.individuals.forEach(individual => {
            individual.detectionRange = this.enhancedDetectionRange;
        });
    }

    removeEffects(target, simulation) {
        target.visionEnhanced = false;
        
        // Restore original detection range to existing individuals
        target.individuals.forEach(individual => {
            individual.detectionRange = this.originalDetectionRange;
        });
    }
}