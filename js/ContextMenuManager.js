/**
 * Context Menu Manager
 * Handles node context menu actions and management
 */
export class ContextMenuManager {
    constructor(simulation) {
        this.simulation = simulation;
    }

    deleteNode(node) {
        const index = this.simulation.nodes.indexOf(node);
        if (index > -1) {
            // Remove all individuals belonging to this node
            this.simulation.individuals = this.simulation.individuals.filter(ind => ind.parentNode !== node);
            
            // Remove the node
            this.simulation.nodes.splice(index, 1);
            
            // Clear selection if this was the selected node
            if (this.simulation.selectedTarget === node) {
                this.simulation.selectedTarget = null;
                this.simulation.updateModuleUI();
                this.simulation.updateNodeControls();
            }
        }
    }
    
    duplicateNode(node) {
        if (this.simulation.nodes.length >= this.simulation.CONFIG.NODE.MAX_NODES) {
            console.warn('Maximum nodes reached');
            return;
        }
        
        // Create new node at offset position
        const offsetX = 30;
        const offsetY = 30;
        const newNode = new this.simulation.Node(
            Math.min(node.x + offsetX, this.simulation.CONFIG.MAP.WIDTH - 20),
            Math.min(node.y + offsetY, this.simulation.CONFIG.MAP.HEIGHT - 20)
        );
        newNode.simulation = this.simulation;
        newNode.food = node.food;
        
        // Copy modules
        const nodeModules = this.simulation.moduleManager.getModulesForTarget(node);
        nodeModules.forEach(module => {
            const moduleClass = module.constructor;
            this.simulation.moduleManager.activateModule(moduleClass, newNode);
        });
        
        this.simulation.nodes.push(newNode);
        this.simulation.selectTarget(newNode);
    }
    
    clearNodeModules(node) {
        const modules = this.simulation.moduleManager.getModulesForTarget(node);
        modules.forEach(module => {
            this.simulation.moduleManager.deactivateModule(module.constructor, node);
        });
        this.simulation.updateModuleUI();
    }
    
    showNodeInfo(node) {
        const modules = this.simulation.moduleManager.getModulesForTarget(node);
        const moduleNames = modules.map(m => m.name).join(', ') || 'None';
        const individualCount = this.simulation.individuals.filter(ind => ind.parentNode === node).length;
        
        alert(`Node Information:
Position: (${Math.round(node.x)}, ${Math.round(node.y)})
Food: ${node.food}
Individuals: ${individualCount}
Modules: ${moduleNames}`);
    }
}
