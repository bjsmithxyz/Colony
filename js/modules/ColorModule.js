import { Module } from '../Module.js';

export class ColorModule extends Module {
    constructor(colorConfig) {
        super({
            id: `color_${colorConfig.name.toLowerCase()}`,
            name: `${colorConfig.name} Theme`,
            description: `Changes node and individual colors to ${colorConfig.name.toLowerCase()} theme`,
            type: 'visual',
            cost: 5,
            stackable: false,
            requirements: []
        });
        this.nodeColor = colorConfig.nodeColor;
        this.individualColor = colorConfig.individualColor;
        this.originalNodeColor = null;
        this.originalIndividualColor = null;
    }

    applyEffects(target, simulation) {
        // Store original colors for restoration
        this.originalNodeColor = target.color;
        
        // Change node color
        target.color = this.nodeColor;
        target.customColor = true;
        
        // Change colors of existing individuals from this node
        target.individuals.forEach(individual => {
            if (!this.originalIndividualColor) {
                this.originalIndividualColor = individual.color;
            }
            individual.color = this.individualColor;
            individual.customColor = true;
        });
    }

    removeEffects(target, simulation) {
        // Restore original colors
        target.color = this.originalNodeColor;
        target.customColor = false;
        
        target.individuals.forEach(individual => {
            individual.color = this.originalIndividualColor;
            individual.customColor = false;
        });
    }
}

// Predefined color themes
export class RedThemeModule extends ColorModule {
    constructor() {
        super({
            name: 'Red',
            nodeColor: '#F44336',
            individualColor: '#FFCDD2'
        });
    }
}

export class BlueThemeModule extends ColorModule {
    constructor() {
        super({
            name: 'Blue',
            nodeColor: '#2196F3',
            individualColor: '#BBDEFB'
        });
    }
}

export class PurpleThemeModule extends ColorModule {
    constructor() {
        super({
            name: 'Purple',
            nodeColor: '#9C27B0',
            individualColor: '#E1BEE7'
        });
    }
}

export class OrangeThemeModule extends ColorModule {
    constructor() {
        super({
            name: 'Orange',
            nodeColor: '#FF9800',
            individualColor: '#FFE0B2'
        });
    }
}