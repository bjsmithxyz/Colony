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
    addNode(x, y) {
        if (this.nodes.length >= CONFIG.NODE.MAX_NODES) {
            console.warn('Maximum nodes reached:', CONFIG.NODE.MAX_NODES);
            return;
        }
        
        try {
            const node = new Node(x, y);
            node.simulation = this;
            this.nodes.push(node);
            
            // Create first individual if this is the first node
            if (this.nodes.length === 1) {
                const individual = this.individualPool.acquire(node);
                this.individuals.push(individual);
                node.individuals.push(individual);
                this.totalIndividualsSpawned++;
            }
            
            this.updateStats();
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

        const totalFood = this.nodes.reduce((sum, node) => sum + node.food, 0);

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
