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
            // If using shared pool bookkeeping, subtract remaining food from pool
            try {
                if (node.sharedPool) {
                    node.sharedPool.totalFood = Math.max(0, (node.sharedPool.totalFood || 0) - (node.food || 0));
                }
            } catch (e) {}

            this.simulation.nodes.splice(index, 1);
            // Remove spawn bar UI if present
            try {
                if (node._spawnBarEl && node._spawnBarEl.wrapper && node._spawnBarEl.wrapper.parentNode) {
                    node._spawnBarEl.wrapper.parentNode.removeChild(node._spawnBarEl.wrapper);
                }
            } catch (e) {}
            
            // Clear selection if this was the selected node
            if (this.simulation.selectedTarget === node) {
                this.simulation.selectedTarget = null;
                this.simulation.updateModuleUI();
            }
        }
    }
    
    duplicateNode(node) {
        if (!this.simulation.playerCanDropNodes) {
            console.warn('Manual node creation disabled after initial drop');
            return;
        }

        if (this.simulation.nodes.length >= this.simulation.CONFIG.NODE.MAX_NODES) {
            console.warn('Maximum nodes reached');
            return;
        }

        // Create new node at offset position
        const offsetX = 30;
        const offsetY = 30;
        const x = Math.min(node.x + offsetX, this.simulation.CONFIG.MAP.WIDTH - 20);
        const y = Math.min(node.y + offsetY, this.simulation.CONFIG.MAP.HEIGHT - 20);
        const newNode = this.simulation.addNode(x, y);
        if (newNode) {
            newNode.food = node.food;
            this.simulation.selectTarget(newNode);
            // Mark that the player used their manual drop
            this.simulation.playerCanDropNodes = false;
            if (this.simulation._updateCanvasCursor) this.simulation._updateCanvasCursor();
        }
    }
    
    clearNodeModules(node) {
        // Module system removed: nothing to clear
    }
    
    showNodeInfo(node) {
    const individualCount = this.simulation.individuals.filter(ind => ind.parentNode === node).length;
        
    alert(`Node Information:
Position: (${Math.round(node.x)}, ${Math.round(node.y)})
Food: ${node.food}
Individuals: ${individualCount}`);
    }
}
