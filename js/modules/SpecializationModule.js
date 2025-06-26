import { Module } from '../Module.js';

export class SpecializationModule extends Module {
    constructor() {
        super({
            id: 'worker_specialization',
            name: 'Worker Specialization',
            description: 'Creates specialized Scout and Worker types with different abilities',
            type: 'behavior',
            cost: 50,
            stackable: false,
            requirements: ['communication_network']
        });
    }

    checkRequirement(req, target, simulation) {
        if (req === 'communication_network') {
            return target.communicationEnabled === true;
        }
        return true;
    }

    applyEffects(target, simulation) {
        target.specializationEnabled = true;
        
        // Apply to existing individuals - randomly assign specializations
        target.individuals.forEach(individual => {
            this.assignSpecialization(individual);
        });
    }

    removeEffects(target, simulation) {
        target.specializationEnabled = false;
        
        // Remove specializations from existing individuals
        target.individuals.forEach(individual => {
            individual.specialization = null;
            individual.scoutMode = false;
            individual.workerMode = false;
        });
    }

    assignSpecialization(individual) {
        const rand = Math.random();
        if (rand < 0.3) {
            // Scout - faster, better detection, less carrying capacity
            individual.specialization = 'scout';
            individual.scoutMode = true;
            individual.speed *= 1.5;
            individual.detectionRange *= 1.5;
            individual.carryingCapacity = Math.max(1, Math.floor(individual.carryingCapacity * 0.5));
        } else {
            // Worker - normal speed, normal detection, better carrying capacity
            individual.specialization = 'worker';
            individual.workerMode = true;
            individual.carryingCapacity = Math.floor(individual.carryingCapacity * 1.5);
        }
    }
}