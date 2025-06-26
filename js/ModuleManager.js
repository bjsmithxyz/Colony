import { Module } from './Module.js';

export class ModuleManager {
    constructor(simulation) {
        this.simulation = simulation;
        this.availableModules = new Map();
        this.activeModules = new Map();
        this.moduleDefinitions = [];
    }

    registerModule(moduleConfig) {
        const module = new Module(moduleConfig);
        this.availableModules.set(module.id, module);
        this.moduleDefinitions.push(moduleConfig);
        console.log(`Module registered: ${module.name}`);
    }

    registerModuleClass(moduleClass) {
        const instance = new moduleClass();
        this.availableModules.set(instance.id, instance);
        console.log(`Module class registered: ${instance.name}`);
    }

    activateModule(moduleId, target) {
        const module = this.availableModules.get(moduleId);
        if (!module) {
            console.error(`Module ${moduleId} not found`);
            return false;
        }

        if (module.apply(target, this.simulation)) {
            if (!this.activeModules.has(moduleId)) {
                this.activeModules.set(moduleId, []);
            }
            this.activeModules.get(moduleId).push({ module, target });
            this.simulation.updateModuleUI();
            return true;
        }

        return false;
    }

    deactivateModule(moduleId, target) {
        const module = this.availableModules.get(moduleId);
        if (!module) {
            return false;
        }

        if (module.remove(target, this.simulation)) {
            const activeList = this.activeModules.get(moduleId);
            if (activeList) {
                const index = activeList.findIndex(item => item.target === target);
                if (index !== -1) {
                    activeList.splice(index, 1);
                }
                if (activeList.length === 0) {
                    this.activeModules.delete(moduleId);
                }
            }
            this.simulation.updateModuleUI();
            return true;
        }

        return false;
    }

    getAvailableModules() {
        return Array.from(this.availableModules.values());
    }

    getActiveModules() {
        const result = [];
        for (const [moduleId, activeList] of this.activeModules) {
            for (const { module, target } of activeList) {
                result.push({ module, target });
            }
        }
        return result;
    }

    getModulesForTarget(target) {
        const modules = [];
        for (const [moduleId, activeList] of this.activeModules) {
            for (const { module, target: t } of activeList) {
                if (t === target) {
                    modules.push(module);
                }
            }
        }
        return modules;
    }

    update() {
        // Update any modules that need per-frame updates
        for (const [moduleId, activeList] of this.activeModules) {
            for (const { module, target } of activeList) {
                if (module.update) {
                    module.update(target, this.simulation);
                }
            }
        }
    }

    saveState() {
        const state = {
            activeModules: []
        };

        for (const [moduleId, activeList] of this.activeModules) {
            for (const { module, target } of activeList) {
                // Save references that can be restored
                state.activeModules.push({
                    moduleId,
                    targetType: target.constructor.name,
                    targetIndex: this.getTargetIndex(target)
                });
            }
        }

        return state;
    }

    loadState(state) {
        // Clear current active modules
        this.activeModules.clear();

        // Restore modules
        for (const { moduleId, targetType, targetIndex } of state.activeModules) {
            const target = this.findTargetByTypeAndIndex(targetType, targetIndex);
            if (target) {
                this.activateModule(moduleId, target);
            }
        }
    }

    getTargetIndex(target) {
        if (target.constructor.name === 'Node') {
            return this.simulation.nodes.indexOf(target);
        } else if (target.constructor.name === 'Individual') {
            return this.simulation.individuals.indexOf(target);
        }
        return -1;
    }

    findTargetByTypeAndIndex(type, index) {
        if (type === 'Node' && index >= 0 && index < this.simulation.nodes.length) {
            return this.simulation.nodes[index];
        } else if (type === 'Individual' && index >= 0 && index < this.simulation.individuals.length) {
            return this.simulation.individuals[index];
        }
        return null;
    }
}