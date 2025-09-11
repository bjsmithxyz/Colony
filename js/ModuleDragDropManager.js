/**
 * Drag Drop Manager (subsystem removed)
 * Drag/drop functionality removed; file kept for compatibility
 */
export class ModuleDragDropManager {
    constructor() {
        // kept for compatibility; no drag state
        this.draggedItem = null;
    }

    initializeDragAndDrop() {
    // No-op
    }

    setupDraggableItems() {
        // No-op
    }

    setupListDropTarget(list) {
        // No-op
    }

    setupDropTarget() {
        // This will be called by the simulation to setup canvas drop target
        // when needed
    }

    handleDragStart(event, item) {
    // No-op
    }

    handleDragEnd(item) {
    // No-op
    }

    addToActive(type) {
        // No-op
    }

    checkListPlaceholder() {
        // No-op
    }

    getIcon(type) {
        const icons = {
            speed: '⚡',
            efficiency: '⚙️',
            vision: '👁️',
            communication: '📡',
            specialization: '🎯',
            capacity: '📦',
            trail: '🛤️',
            beacon: '🔍',
            cluster: '🔗',
            color: '🎨',
            priority: '⭐',
            size: '📏'
        };
        return icons[type] || '🔧';
    }

    getName(type) {
        const names = {
            speed: 'Speed Enhancement',
            efficiency: 'Efficiency Boost',
            vision: 'Enhanced Vision',
            communication: 'Communication',
            specialization: 'Specialization',
            capacity: 'Increased Capacity',
            trail: 'Trail System',
            beacon: 'Beacon Signal',
            cluster: 'Cluster Movement',
            color: 'Color Theme',
            priority: 'Priority System',
            size: 'Size Enhancement'
        };
        return names[type] || 'Unknown Module';
    }

    dispatchEvent(eventType, data) {
        // No-op
    }
}
