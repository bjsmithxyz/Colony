import { CONFIG } from './config.js';
import { Node } from './Node.js';
import { Individual } from './Individual.js';
import { FoodSource } from './FoodSource.js';
import { TrailSystem } from './TrailSystem.js';
import { SpatialGrid } from './SpatialGrid.js';
import { ObjectPool } from './ObjectPool.js';
import { DirtyRectManager } from './DirtyRectManager.js';
import { SimulationEventHandler } from './SimulationEventHandler.js';
import { SimulationRenderer } from './SimulationRenderer.js';
import { ContextMenuManager } from './ContextMenuManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

// Module implementations removed; no imports

/**
 * Main Simulation class - modular and focused architecture
 * Delegates responsibilities to specialized managers
 */
export class Simulation {
    constructor(canvas) {
        this.CONFIG = CONFIG;
        this.canvas = canvas;
        this.Node = Node; // For context menu manager
        
        this.initializeCanvas();
        this.initializeEntities();
    this.initializeSystemsAndManagers();
        
        this.generateFoodSources();
        
        // Simulation state
        this.isPaused = false;
        this.simulationSpeed = 1.0;
        this.frameCount = 0;
        this.selectedTarget = null;
        
    // Statistics
    this.totalFoodCollected = 0; // cumulative total collected
    this.totalIndividualsSpawned = 0;
    // Track milestones for node-dropping individuals
    this._nextDropAt = 150;
    this._markNextSpawnAsDropper = false;
    // Shared resource pool for nodes (nodes will reference this.sharedNodePool)
    this.sharedNodePool = { totalFood: 0 };

        // Player controls: allow one manual drop only (initially true)
        this.playerCanDropNodes = true;
        // Ensure cursor matches state
        this._updateCanvasCursor = () => {
            try {
                if (this.canvas && this.canvas.classList) {
                    if (this.playerCanDropNodes) {
                        this.canvas.classList.add('can-drop');
                        this.canvas.classList.remove('cannot-drop');
                    } else {
                        this.canvas.classList.remove('can-drop');
                        this.canvas.classList.add('cannot-drop');
                    }
                }
            } catch (e) {}
        };
        this._updateCanvasCursor();
    }

    /**
     * Called by Node.storeFood when food is added to a node.
     * Updates the shared pool total and checks milestone for dropper spawning.
     */
    checkFoodMilestone(node, amount) {
        // Update shared pool total
        if (node.sharedPool) node.sharedPool.totalFood = (node.sharedPool.totalFood || 0) + amount;

        // Update cumulative total
        this.totalFoodCollected += amount;

        // If totalFoodCollected reached next threshold, mark flag so that the next spawned individual will be a dropper
        if (this.totalFoodCollected >= this._nextDropAt) {
            this._nextDropAt += 150; // schedule next milestone
            this._markNextSpawnAsDropper = true;
        }
    }

    initializeCanvas() {
        try {
            this.ctx = this.canvas.getContext('2d', { alpha: false });
        } catch (e) {
            console.warn('Failed to get context with alpha: false, falling back to default');
            this.ctx = this.canvas.getContext('2d');
        }
        
        if (!this.ctx) {
            throw new Error('Failed to get 2D canvas context');
        }
        
        this.canvas.width = CONFIG.MAP.WIDTH;
        this.canvas.height = CONFIG.MAP.HEIGHT;
        this.ctx.imageSmoothingEnabled = false;
        // Ensure any canvas text uses the bundled Ubuntu font by default
        try {
            this.ctx.textBaseline = 'top';
            this.ctx.font = '14px Ubuntu';
        } catch (e) {
            // some contexts may not support text settings in certain environments
        }
    }

    initializeEntities() {
        this.nodes = [];
        this.individuals = [];
        this.foodSources = [];
    }

    initializeSystemsAndManagers() {
        // Core systems
        this.trailSystem = new TrailSystem(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT);
    // Module system removed
    this.spatialGrid = new SpatialGrid(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT, 32);
    // Separate grid for nodes where we insert node bounding boxes for faster pixel collision checks
    this.nodeGrid = new SpatialGrid(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT, 64);
        this.dirtyRectManager = new DirtyRectManager(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT, 64);
    // LevelOfDetail and LOD controls removed
        
        // Object pooling
        this.individualPool = new ObjectPool(
            (node) => new Individual(node),
            (individual, node) => individual.reset(node),
            0
        );
        
        // Specialized managers
        this.eventHandler = new SimulationEventHandler(this);
        this.renderer = new SimulationRenderer(this);
        this.contextMenuManager = new ContextMenuManager(this);
        this.performanceMonitor = new PerformanceMonitor(this);
        // spawn bar UI removed: cooldown bars not required
    }

    // Module system removed: no initializeModules

    // Core simulation methods
    update() {
        if (this.isPaused) return;
        
        const updateStart = performance.now();
        
        // Apply speed multiplier
        const updates = Math.floor(this.simulationSpeed);
        const fractionalUpdate = this.simulationSpeed - updates;
        
        for (let u = 0; u < updates; u++) {
            this.performUpdate();
        }
        
        if (fractionalUpdate > 0 && Math.random() < fractionalUpdate) {
            this.performUpdate();
        }
        
        this.performanceMonitor.updateMetric('updateTime', performance.now() - updateStart);
        this.performanceMonitor.shouldLogPerformance();
    }
    
    performUpdate() {
        this.frameCount++;
        
        // Clear and rebuild spatial grid
        this.spatialGrid.clear();
        this.nodeGrid.clear();
        
        // Update entities
        this.updateNodes();
        this.updateIndividuals();
        
    // Update systems
    this.trailSystem.update();
        
        // Update statistics periodically
        if (this.frameCount % 30 === 0) {
            this.updateStats();
        }

    // spawn bar UI removed: cooldown bars not required
    }

    // spawn bar UI removed: no updateSpawnBars

    updateNodes() {
        this.nodes.forEach(node => {
            node.update();
            // Insert node into nodeGrid using its bounds
            try {
                const b = node.getBounds();
                const box = {
                    minX: Math.floor(node.x + b.minX),
                    minY: Math.floor(node.y + b.minY),
                    maxX: Math.floor(node.x + b.maxX),
                    maxY: Math.floor(node.y + b.maxY)
                };
                this.nodeGrid.insertBox(node, box);
            } catch (e) {}
        });
    }

    updateIndividuals() {
        // Insert individuals into spatial grid
        this.individuals.forEach(individual => {
            this.spatialGrid.insert(individual);
        });
        
        // Insert food sources into spatial grid
        this.foodSources.forEach(food => {
            if (!food.depleted) {
                this.spatialGrid.insert(food);
            }
        });
        
        // Update individuals with spatial optimization
        for (let i = this.individuals.length - 1; i >= 0; i--) {
            const individual = this.individuals[i];
            const prevX = individual.x;
            const prevY = individual.y;
            individual.update(this);
            
            if (individual.isDead) {
                this.handleIndividualDeath(individual, i);
                continue;
            }
            
            this.handleIndividualMovement(individual, prevX, prevY);
        }
    }

    handleIndividualDeath(individual, index) {
        // Mark dirty region before removal
        this.dirtyRectManager.markEntityDirty(individual);
        
        // Remove from simulation
        this.individuals.splice(index, 1);
        
        // Remove from parent node
        const nodeIndex = individual.parentNode.individuals.indexOf(individual);
        if (nodeIndex > -1) {
            individual.parentNode.individuals.splice(nodeIndex, 1);
        }
        
        // If this individual was designated to drop a node, create it at death location
        if (individual.willDropNodeOnDeath) {
            const x = Math.max(0, Math.min(individual.x, this.CONFIG.MAP.WIDTH - 1));
            const y = Math.max(0, Math.min(individual.y, this.CONFIG.MAP.HEIGHT - 1));
            const newNode = this.addNode(x, y, { createInitialIndividual: true });
            if (newNode) {
                // Initialize a timed drop ping that lasts for 3 seconds
                try {
                    newNode.dropPingStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                    newNode.dropPingDuration = 2000; // milliseconds (2s)
                } catch (e) {
                    // Node may be removed immediately in some edge cases
                }
            }
        }

        // Return to object pool
        this.individualPool.release(individual);
    }

    handleIndividualMovement(individual, prevX, prevY) {
        // Mark dirty regions for movement
        if (Math.abs(individual.x - prevX) > 0.1 || Math.abs(individual.y - prevY) > 0.1) {
            this.dirtyRectManager.markEntityDirty(individual, prevX, prevY);
            
            const trailColor = individual.carrying > 0 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(33, 150, 243, 0.3)';
            this.trailSystem.addPoint(individual.x, individual.y, trailColor);
        }
    }

    render() {
        this.renderer.render();
    }

    // Entity management
    addNode(x, y, opts = {}) {
        if (this.nodes.length >= CONFIG.NODE.MAX_NODES) {
            console.warn('Maximum nodes reached:', CONFIG.NODE.MAX_NODES);
            return;
        }
        
        try {
            const node = new Node(x, y);
            node.simulation = this;
            // Link node to shared pool so resources can be treated as shared
            node.sharedPool = this.sharedNodePool;
            this.nodes.push(node);

            // spawn bar UI removed
            
            // Create first individual if this is the first node
            if (this.nodes.length === 1) {
                const individual = this.individualPool.acquire(node);
                // first individual should be immune until it finds initial food
                individual.initialImmune = true;
                this.individuals.push(individual);
                node.individuals.push(individual);
                this.totalIndividualsSpawned++;
            }

            // Optionally create an initial individual for newly created nodes (e.g., dropped nodes)
            if (opts.createInitialIndividual) {
                if (node.food >= 0) {
                    const ind = this.individualPool.acquire(node);
                    this.individuals.push(ind);
                    node.individuals.push(ind);
                    this.totalIndividualsSpawned++;
                }
            }
            
            this.updateStats();
            return node;
        } catch (error) {
            console.error('Error adding node:', error);
        }
    }

    /**
     * Merge two nodes: larger node survives and absorbs smaller node's pixels, food, and individuals.
     * Removes the smaller node from simulation.nodes and updates stats/UI.
     */
    mergeNodes(nodeA, nodeB) {
        try {
            if (!nodeA || !nodeB || nodeA === nodeB) return;

            // Determine sizes by pixel count
            const sizeA = nodeA.pixels.length || 0;
            const sizeB = nodeB.pixels.length || 0;

            let survivor = nodeA;
            let absorbed = nodeB;
            if (sizeB > sizeA) {
                survivor = nodeB;
                absorbed = nodeA;
            }

            // Transfer pixels (avoid duplicates)
            for (const p of absorbed.pixels) {
                const rebasedX = p.dx + (absorbed.x - survivor.x);
                const rebasedY = p.dy + (absorbed.y - survivor.y);
                if (survivor && typeof survivor.hasPixel === 'function') {
                    if (!survivor.hasPixel(rebasedX, rebasedY)) survivor.addPixel(rebasedX, rebasedY);
                } else {
                    const exists = survivor.pixels.some(sp => sp.dx === rebasedX && sp.dy === rebasedY);
                    if (!exists) survivor.pixels.push({ dx: rebasedX, dy: rebasedY });
                }
            }

            // Transfer food
            survivor.food += absorbed.food || 0;

            // Transfer individuals: reassign parentNode and move into survivor.individuals
            while (absorbed.individuals && absorbed.individuals.length > 0) {
                const ind = absorbed.individuals.pop();
                ind.parentNode = survivor;
                survivor.individuals.push(ind);
            }

            // Remove absorbed node from simulation list
            const idx = this.nodes.indexOf(absorbed);
            if (idx > -1) {
                this.nodes.splice(idx, 1);
            }

            // After absorption, ensure survivor recomputes its edge pixels and marks renderer dirty
            if (survivor && typeof survivor._recomputeEdgePixels === 'function') survivor._recomputeEdgePixels();
            if (survivor && typeof survivor.markRendererDirty === 'function') survivor.markRendererDirty();

            // spawn bar UI removed

            // Update stats
            this.updateStats();
        } catch (e) {
            console.error('Error merging nodes:', e);
        }
    }

    generateFoodSources() {
        const numSources = 20 + Math.floor(Math.random() * 15); // Increased to 20-35 sources
        
        for (let i = 0; i < numSources; i++) {
            const x = Math.floor(Math.random() * (CONFIG.MAP.WIDTH - 40)) + 20;
            const y = Math.floor(Math.random() * (CONFIG.MAP.HEIGHT - 40)) + 20;
            this.foodSources.push(new FoodSource(x, y));
        }
    }

    // Utility methods
    getNodeAt(x, y) {
        // Query nodeGrid first to reduce candidate nodes
        try {
            const candidates = this.nodeGrid.queryBox({ minX: x, minY: y, maxX: x, maxY: y });
            for (const node of candidates) {
                // Use node.hasPixel for fast containment checks
                const relX = Math.floor(x - node.x);
                const relY = Math.floor(y - node.y);
                if (node.hasPixel && node.hasPixel(relX, relY)) return node;
            }
        } catch (e) {
            // fallback to brute force
            for (const node of this.nodes) {
                const relX = Math.floor(x - node.x);
                const relY = Math.floor(y - node.y);
                if (node.hasPixel && node.hasPixel(relX, relY)) return node;
            }
        }

        return undefined;
    }
    
    findNearbyEntities(x, y, radius) {
        const results = this.spatialGrid.queryRadius(x, y, radius);
        return results.map(result => result.entity);
    }

    selectTarget(target) {
        this.selectedTarget = target;
        this.updateModuleUI();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }

    // UI update methods
    updateStats() {
        // Update simplified overview stats (floating top-right)
        const ovNode = document.getElementById('ov_nodeCount');
        const ovInd = document.getElementById('ov_individualCount');
        const ovFood = document.getElementById('ov_totalFood');
        const ovCollected = document.getElementById('ov_foodCollected');

        // If nodes are linked to a shared pool, use that authoritative total
        let totalFood = 0;
        if (this.nodes.length > 0 && this.nodes[0].sharedPool) {
            totalFood = this.sharedNodePool.totalFood || 0;
        } else {
            totalFood = this.nodes.reduce((sum, node) => sum + node.food, 0);
        }

        if (ovNode) ovNode.textContent = this.nodes.length;
        if (ovInd) ovInd.textContent = this.individuals.length;
        if (ovFood) ovFood.textContent = totalFood;
        if (ovCollected) ovCollected.textContent = this.totalFoodCollected;
        
    // Node controls UI removed; nothing to update here.
    }

    updateModuleUI() {
        // Module system removed — nothing to update in UI
    }
    // Module-related UI and drag/drop removed from this build.

    // updateNodeControls removed: UI removed and spawning is automated in Node.storeFood().

    // Delegate context menu actions to ContextMenuManager
    deleteNode(node) {
        this.contextMenuManager.deleteNode(node);
    }
    
    duplicateNode(node) {
        this.contextMenuManager.duplicateNode(node);
    }
    
    clearNodeModules(node) {
        this.contextMenuManager.clearNodeModules(node);
    }
    
    showNodeInfo(node) {
        this.contextMenuManager.showNodeInfo(node);
    }

    resetSimulation() {
        if (confirm('Are you sure you want to reset the simulation? This will clear all nodes and data.')) {
            this.nodes = [];
            this.individuals = [];
            this.foodSources = [];
            this.totalIndividualsSpawned = 0;
            this.selectedTarget = null;
            // spawn bar UI removed
            
            this.generateFoodSources();
            // Reset shared pool and counters
            if (this.sharedNodePool) this.sharedNodePool.totalFood = 0;
            this.totalFoodCollected = 0;
            this.updateStats();
            // updateNodeControls call removed
            // Re-enable player's ability to drop the initial node after reset
            this.playerCanDropNodes = true;
            if (this._updateCanvasCursor) this._updateCanvasCursor();
            
            console.log('Simulation reset');
        }
    }

    // Module integration methods
    handleModuleAdded(moduleData) {
    // Module addition events ignored; modules removed
    }
    
    handleModuleRemoved(moduleData) {
    // Module removal events ignored; modules removed
    }
    
    getModuleClass(moduleType) {
    return null; // Modules removed
    }

    // Main game loop
    start() {
        const gameLoop = () => {
            this.update();
            this.render();
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }
}
