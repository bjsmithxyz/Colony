/**
 * Module Drag Drop Manager
 * Handles drag and drop functionality for modules
 */
export class ModuleDragDropManager {
    constructor() {
        this.draggedModule = null;
        this.initializeDragAndDrop();
    }

    initializeDragAndDrop() {
        this.setupDraggableModules();
        this.setupDropTarget();
    }

    setupDraggableModules() {
        const moduleItems = document.querySelectorAll('.module-item.draggable');
        const moduleList = document.getElementById('moduleList');
        
        moduleItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.handleDragStart(e, item);
            });
            
            item.addEventListener('dragend', () => {
                this.handleDragEnd(item);
            });
        });
        
        if (moduleList) {
            this.setupModuleListDropTarget(moduleList);
        }
    }

    setupModuleListDropTarget(moduleList) {
        moduleList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            moduleList.classList.add('drag-over');
        });
        
        moduleList.addEventListener('dragleave', (e) => {
            if (!moduleList.contains(e.relatedTarget)) {
                moduleList.classList.remove('drag-over');
            }
        });
        
        moduleList.addEventListener('drop', (e) => {
            e.preventDefault();
            moduleList.classList.remove('drag-over');
            
            if (this.draggedModule) {
                this.addModuleToActive(this.draggedModule.type);
                this.draggedModule = null;
            }
        });
    }

    setupDropTarget() {
        // This will be called by the simulation to setup canvas drop target
        // when needed
    }

    handleDragStart(event, item) {
        this.draggedModule = {
            type: item.dataset.module,
            element: item.cloneNode(true)
        };
        item.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'copy';
    }

    handleDragEnd(item) {
        item.classList.remove('dragging');
    }

    addModuleToActive(moduleType) {
        const moduleList = document.getElementById('moduleList');
        const placeholder = moduleList?.querySelector('.module-placeholder');
        
        // Remove placeholder if it exists
        if (placeholder && moduleList.children.length === 1) {
            placeholder.remove();
        }
        
        // Create active module element
        const activeModule = document.createElement('div');
        activeModule.className = 'active-module-item new-module';
        activeModule.innerHTML = `
            <div class="module-icon">${this.getModuleIcon(moduleType)}</div>
            <div class="active-module-info">
                <div class="active-module-title">${this.getModuleName(moduleType)}</div>
                <div class="active-module-status">Active</div>
            </div>
            <div class="active-module-actions">
                <button class="module-action-btn remove" title="Remove Module">
                    <span>×</span>
                </button>
            </div>
        `;
        
        // Add remove functionality
        const removeBtn = activeModule.querySelector('.remove');
        removeBtn?.addEventListener('click', () => {
            activeModule.classList.add('removing-module');
            setTimeout(() => {
                activeModule.remove();
                this.checkModuleListPlaceholder();
            }, 300);
        });
        
        moduleList?.appendChild(activeModule);
        
        // Trigger animation
        setTimeout(() => {
            activeModule.classList.remove('new-module');
        }, 300);
        
        // Emit event for simulation to handle
        this.dispatchModuleEvent('moduleAdded', { type: moduleType });
    }

    checkModuleListPlaceholder() {
        const moduleList = document.getElementById('moduleList');
        if (moduleList && moduleList.children.length === 0) {
            moduleList.innerHTML = `
                <div class="module-placeholder">
                    <span class="placeholder-icon">🎯</span>
                    <p>Select a node to see active modules</p>
                    <small>Drag modules here to activate</small>
                </div>
            `;
        }
    }

    getModuleIcon(type) {
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

    getModuleName(type) {
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

    dispatchModuleEvent(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
    }
}
