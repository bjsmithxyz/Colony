import { Module } from '../Module.js';

export class ClusterModule extends Module {
    constructor() {
        super({
            id: 'cluster_movement',
            name: 'Cluster Movement',
            description: 'Individuals form groups and move together, improving pathfinding',
            type: 'behavior',
            cost: 35,
            stackable: false,
            requirements: []
        });
        this.clusterRange = 8;
        this.clusterForce = 0.3;
    }

    applyEffects(target, simulation) {
        target.clusterMovement = true;
        
        // Apply to existing individuals from this node
        target.individuals.forEach(individual => {
            individual.clusterMovement = true;
            individual.clusterRange = this.clusterRange;
            individual.clusterForce = this.clusterForce;
        });
    }

    removeEffects(target, simulation) {
        target.clusterMovement = false;
        
        target.individuals.forEach(individual => {
            individual.clusterMovement = false;
            individual.clusterRange = 0;
            individual.clusterForce = 0;
        });
    }
}