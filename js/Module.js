export class Module {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.type = config.type; // 'enhancement', 'visual', 'behavior'
        this.cost = config.cost || 0;
        this.effects = config.effects || {};
        this.stackable = config.stackable || false;
        this.requirements = config.requirements || [];
        this.active = false;
        this.appliedTo = new Set();
    }

    canApply(target, simulation) {
        // Check if module can be applied to target
        if (!this.stackable && this.appliedTo.has(target)) {
            return false;
        }

        // Check requirements
        for (const req of this.requirements) {
            if (!this.checkRequirement(req, target, simulation)) {
                return false;
            }
        }

        // Check cost
        if (this.cost > 0 && target.food !== undefined && target.food < this.cost) {
            return false;
        }

        return true;
    }

    checkRequirement(req, target, simulation) {
        // Override in subclasses for specific requirement checks
        return true;
    }

    apply(target, simulation) {
        if (!this.canApply(target, simulation)) {
            return false;
        }

        // Deduct cost
        if (this.cost > 0 && target.food !== undefined) {
            target.food -= this.cost;
        }

        // Apply effects
        this.applyEffects(target, simulation);
        
        // Track application
        this.appliedTo.add(target);
        this.active = true;

        console.log(`Module ${this.name} applied to target`);
        return true;
    }

    applyEffects(target, simulation) {
        // Override in subclasses
        for (const [property, value] of Object.entries(this.effects)) {
            if (target[property] !== undefined) {
                if (typeof value === 'number' && typeof target[property] === 'number') {
                    target[property] = value;
                } else if (typeof value === 'function') {
                    value(target, simulation);
                }
            }
        }
    }

    remove(target, simulation) {
        if (!this.appliedTo.has(target)) {
            return false;
        }

        this.removeEffects(target, simulation);
        this.appliedTo.delete(target);
        
        if (this.appliedTo.size === 0) {
            this.active = false;
        }

        return true;
    }

    removeEffects(target, simulation) {
        // Override in subclasses to properly remove effects
    }
}