// ModuleManager stub - module system removed
export class ModuleManager {
    constructor(simulation) {
        this.simulation = simulation;
        console.warn('ModuleManager: module system has been removed in this build.');
    }

    // No-op implementations to avoid runtime errors if referenced
    registerModule() {}
    registerModuleClass() {}
    activateModule() { return false; }
    deactivateModule() { return false; }
    getAvailableModules() { return []; }
    getActiveModules() { return []; }
    getModulesForTarget() { return []; }
    update() {}
    saveState() { return { activeModules: [] }; }
    loadState() {}
}