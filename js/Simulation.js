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
        this.totalFoodCollected = 0;
        this.totalIndividualsSpawned = 0;
        // Track milestones for node-dropping individuals
        this._nextDropAt = 150;
        this._markNextSpawnAsDropper = false;
        // Shared resource pool for nodes (nodes will reference this.sharedNodePool)
        this.sharedNodePool = { totalFood: 0 };
    }

    /**
     * Called by Node.storeFood when food is added to a node.
     * Checks for milestones to mark the next spawned individual as a dropper.
     */
    checkFoodMilestone(node, amount) {
        // Update shared pool total
        if (node.sharedPool) node.sharedPool.totalFood += amount;

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
        // Create container for node spawn bars (bottom-left UI)
        this.nodeBarContainer = document.getElementById('nodeSpawnBars');
        if (!this.nodeBarContainer) {
            this.nodeBarContainer = document.createElement('div');
            this.nodeBarContainer.id = 'nodeSpawnBars';
            Object.assign(this.nodeBarContainer.style, {
                position: 'fixed',
                width: '50px',
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: '6px',
                pointerEvents: 'none',
                zIndex: 1000
            });
            document.body.appendChild(this.nodeBarContainer);

            // Position relative to the simulation canvas
            this._updateNodeBarPosition = () => {
                try {
                    const rect = this.canvas.getBoundingClientRect();
                    // place 10px inset from canvas left, and 10px above canvas bottom
                    this.nodeBarContainer.style.left = `${Math.round(rect.left + -40)}px`;
                    const bottomPx = Math.max(0, Math.round(window.innerHeight - rect.bottom + 10));
                    this.nodeBarContainer.style.bottom = `${bottomPx}px`;
                } catch (e) { }
            };

            // Initial position
            this._updateNodeBarPosition();
            // Update on resize/scroll so the bars stay anchored to the canvas
            window.addEventListener('resize', this._updateNodeBarPosition);
            window.addEventListener('scroll', this._updateNodeBarPosition, true);
        }
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
        
        // Update entities
        this.updateNodes();
        this.updateIndividuals();
        
    // Update systems
    this.trailSystem.update();
        
        // Update statistics periodically
        if (this.frameCount % 30 === 0) {
            this.updateStats();
        }

        // Update per-node spawn bars every update for smooth animation
        this.updateSpawnBars();
    }

    updateSpawnBars() {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (!node._spawnBarEl) continue;

            // Compute progress (left-to-right) until next spawn
            const elapsed = now - (node.lastSpawnTime || 0);
            const cooldown = node.spawnCooldown || 1;
            let progress = Math.max(0, Math.min(1, elapsed / cooldown));
            // If node doesn't have enough food to spawn, show empty bar
            if (node.food < 10) progress = 0;
            node._spawnBarEl.fill.style.width = `${progress * 100}%`;

            // Update fill color based on node color
            try {
                const base = (node.color && node.color.startsWith('#')) ? node.color : '#4CAF50';
                const hex = base.replace('#','');
                const r = parseInt(hex.substring(0,2),16);
                const g = parseInt(hex.substring(2,4),16);
                const b = parseInt(hex.substring(4,6),16);
                const mix = (c) => Math.min(255, Math.round(c + (255 - c) * 0.4));
                const lr = mix(r).toString(16).padStart(2,'0');
                const lg = mix(g).toString(16).padStart(2,'0');
                const lb = mix(b).toString(16).padStart(2,'0');
                const lighter = `#${lr}${lg}${lb}`;
                node._spawnBarEl.fill.style.background = `linear-gradient(90deg, ${base}, ${lighter})`;
            } catch (e) {}
        }
    }

    updateNodes() {
        this.nodes.forEach(node => node.update());
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
                newNode.droppedNode = true;
                // Clear the dropped marker after 10 seconds
                setTimeout(() => {
                    try { newNode.droppedNode = false; } catch (e) { /* node may be removed */ }
                }, 10000);
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

            // Create a spawn bar UI element for this node
            try {
                const barWrapper = document.createElement('div');
                Object.assign(barWrapper.style, {
                    width: '50px',
                    height: '5px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                });
                const fill = document.createElement('div');
                Object.assign(fill.style, {
                    height: '100%',
                    width: '0%',
                    transformOrigin: 'left center',
                    background: '#4CAF50'
                });
                barWrapper.appendChild(fill);
                this.nodeBarContainer.appendChild(barWrapper);
                node._spawnBarEl = { wrapper: barWrapper, fill: fill };
            } catch (e) {
                // DOM may not be available in some test environments
            }
            
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
        return this.nodes.find(node => {
            return node.pixels.some(pixel => {
                const px = node.x + pixel.dx;
                const py = node.y + pixel.dy;
                return x >= px && x < px + 1 && y >= py && y < py + 1;
            });
        });
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
            this.totalFoodCollected = 0;
            this.totalIndividualsSpawned = 0;
            this.selectedTarget = null;
            // Remove all spawn bar elements
            try {
                if (this.nodeBarContainer) {
                    while (this.nodeBarContainer.firstChild) this.nodeBarContainer.removeChild(this.nodeBarContainer.firstChild);
                }
            } catch (e) {}
            
            this.generateFoodSources();
            this.updateStats();
            // updateNodeControls call removed
            
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
