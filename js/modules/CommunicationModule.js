import { Module } from '../Module.js';

export class CommunicationModule extends Module {
    constructor() {
        super({
            id: 'communication_network',
            name: 'Communication Network',
            description: 'Individuals share food locations when they meet, improving colony efficiency',
            type: 'behavior',
            cost: 40,
            stackable: false,
            requirements: ['vision_enhancement'] // Requires enhanced vision
        });
        this.communicationRange = 3;
    }

    checkRequirement(req, target, simulation) {
        if (req === 'vision_enhancement') {
            return target.visionEnhanced === true;
        }
        return true;
    }

    applyEffects(target, simulation) {
        target.communicationEnabled = true;
        
        // Apply to existing individuals from this node
        target.individuals.forEach(individual => {
            individual.communicationEnabled = true;
            individual.communicationRange = this.communicationRange;
        });
    }

    removeEffects(target, simulation) {
        target.communicationEnabled = false;
        
        target.individuals.forEach(individual => {
            individual.communicationEnabled = false;
            individual.communicationRange = 0;
        });
    }
}