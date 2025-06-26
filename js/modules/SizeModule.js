import { Module } from '../Module.js';
import { CONFIG } from '../config.js';

export class SizeModule extends Module {
    constructor() {
        super({
            id: 'size_enhancement',
            name: 'Large Node',
            description: 'Increases node size for better visibility (3x3→5x5 pixels)',
            type: 'visual',
            cost: 10,
            stackable: false,
            requirements: []
        });
        this.originalSize = CONFIG.NODE.SIZE;
        this.enhancedSize = 5;
    }

    applyEffects(target, simulation) {
        target.size = this.enhancedSize;
        target.sizeEnhanced = true;
    }

    removeEffects(target, simulation) {
        target.size = this.originalSize;
        target.sizeEnhanced = false;
    }
}