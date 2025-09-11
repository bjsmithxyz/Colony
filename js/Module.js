// Module stub - module system removed
export class Module {
    constructor(config) {
        console.warn('Module: module system removed; Module instances are placeholders.');
        this.id = config?.id || 'module-removed';
        this.name = config?.name || 'Removed Module';
    }

    canApply() { return false; }
    apply() { return false; }
    remove() { return false; }
}