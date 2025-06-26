import { CONFIG } from './config.js';
import { Node } from './Node.js';
import { Individual } from './Individual.js';
import { FoodSource } from './FoodSource.js';
import { TrailSystem } from './TrailSystem.js';
import { ModuleManager } from './ModuleManager.js';
import { SpatialGrid } from './SpatialGrid.js';
import { ObjectPool } from './ObjectPool.js';
import { DirtyRectManager } from './DirtyRectManager.js';
import { LevelOfDetail } from './LevelOfDetail.js';
import { SimulationEventHandler } from './SimulationEventHandler.js';
import { SimulationRenderer } from './SimulationRenderer.js';
import { ContextMenuManager } from './ContextMenuManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

// Import modules for registration
import { VisionModule } from './modules/VisionModule.js';
import { SpeedModule } from './modules/SpeedModule.js';
import { EfficiencyModule } from './modules/EfficiencyModule.js';
import { CapacityModule } from './modules/CapacityModule.js';
import { RedThemeModule, BlueThemeModule, PurpleThemeModule, OrangeThemeModule } from './modules/ColorModule.js';
import { SizeModule } from './modules/SizeModule.js';
import { TrailModule } from './modules/TrailModule.js';
import { BeaconModule } from './modules/BeaconModule.js';
import { CommunicationModule } from './modules/CommunicationModule.js';
import { SpecializationModule } from './modules/SpecializationModule.js';
import { PriorityModule } from './modules/PriorityModule.js';
import { ClusterModule } from './modules/ClusterModule.js';

/**
 * Main Simulation class - refactored to be much more focused
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
        this.initializeModules();
        
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
        this.moduleManager = new ModuleManager(this);
        this.spatialGrid = new SpatialGrid(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT, 32);
        this.dirtyRectManager = new DirtyRectManager(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT, 64);
        this.levelOfDetail = new LevelOfDetail(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT);
        this.lodEnabled = false; // Default to off
        
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

    initializeModules() {
        // Register enhancement modules
        this.moduleManager.registerModuleClass(VisionModule);
        this.moduleManager.registerModuleClass(SpeedModule);
        this.moduleManager.registerModuleClass(EfficiencyModule);
        this.moduleManager.registerModuleClass(CapacityModule);
        
        // Register visual modules
        this.moduleManager.registerModuleClass(RedThemeModule);
        this.moduleManager.registerModuleClass(BlueThemeModule);
        this.moduleManager.registerModuleClass(PurpleThemeModule);
        this.moduleManager.registerModuleClass(OrangeThemeModule);
        this.moduleManager.registerModuleClass(SizeModule);
        this.moduleManager.registerModuleClass(TrailModule);
        this.moduleManager.registerModuleClass(BeaconModule);
        
        // Register behavior modules
        this.moduleManager.registerModuleClass(CommunicationModule);
        this.moduleManager.registerModuleClass(SpecializationModule);
        this.moduleManager.registerModuleClass(PriorityModule);
        this.moduleManager.registerModuleClass(ClusterModule);
        
        console.log('Modules initialized:', this.moduleManager.getAvailableModules().length);
    }

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
        this.moduleManager.update();
        
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
        const numSources = 10 + Math.floor(Math.random() * 10); // Doubled from 5 + 0-4 to 10 + 0-9
        
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
        return this.spatialGrid.queryRadius(x, y, radius);
    }

    selectTarget(target) {
        this.selectedTarget = target;
        this.updateModuleUI();
        this.updateNodeControls();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }

    // UI update methods
    updateStats() {
        // Update basic statistics displays
        document.getElementById('nodeCount').textContent = this.nodes.length;
        document.getElementById('individualCount').textContent = this.individuals.length;
        
        const totalFood = this.nodes.reduce((sum, node) => sum + node.food, 0);
        document.getElementById('totalFood').textContent = totalFood;
        document.getElementById('foodCollected').textContent = this.totalFoodCollected;
        
        // Update enhanced UI charts if available
        if (window.enhancedUI) {
            const statsData = {
                nodeCount: this.nodes.length,
                individualCount: this.individuals.length,
                totalFood: totalFood,
                foodCollected: this.totalFoodCollected
            };
            window.enhancedUI.updateChartData(statsData);
        }
        
        // Update node controls if a node is selected
        if (this.selectedTarget) {
            this.updateNodeControls();
        }
    }

    updateModuleUI() {
        const moduleList = document.getElementById('moduleList');
        
        if (!this.selectedTarget) {
            moduleList.innerHTML = '<div class="module-placeholder"><span class="placeholder-icon">🎯</span><p>Select a node to see active modules</p><small>Drag modules here to activate</small></div>';
            return;
        }
        
        // Delegate complex module UI logic to a separate method
        this.renderModuleUI(moduleList);
    }

    renderModuleUI(moduleList) {
        const availableModules = this.moduleManager.getAvailableModules();
        const activeModules = this.moduleManager.getModulesForTarget(this.selectedTarget);
        
        if (availableModules.length === 0) {
            moduleList.innerHTML = '<p class="placeholder">No modules available yet</p>';
            return;
        }
        
        moduleList.innerHTML = '';
        
        // Group modules by type and render
        const modulesByType = this.groupModulesByType(availableModules);
        this.renderModuleCategories(moduleList, modulesByType, activeModules);
    }

    groupModulesByType(modules) {
        const modulesByType = {
            enhancement: [],
            visual: [],
            behavior: []
        };
        
        modules.forEach(module => {
            if (modulesByType[module.type]) {
                modulesByType[module.type].push(module);
            }
        });
        
        return modulesByType;
    }

    renderModuleCategories(moduleList, modulesByType, activeModules) {
        Object.entries(modulesByType).forEach(([type, modules]) => {
            if (modules.length === 0) return;
            
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'module-category';
            categoryHeader.innerHTML = `<h4>${type.charAt(0).toUpperCase() + type.slice(1)} Modules</h4>`;
            moduleList.appendChild(categoryHeader);
            
            modules.forEach(module => {
                const moduleElement = this.createModuleElement(module, activeModules, type);
                moduleList.appendChild(moduleElement);
            });
        });
    }

    createModuleElement(module, activeModules, type) {
        const isActive = activeModules.includes(module);
        const canApply = module.canApply(this.selectedTarget, this);
        
        const moduleElement = document.createElement('div');
        moduleElement.className = `module-item ${isActive ? 'active' : ''} ${type}`;
        moduleElement.draggable = true;
        moduleElement.dataset.moduleId = module.id;
        
        moduleElement.innerHTML = `
            <h4>${module.name}</h4>
            <p>${module.description}</p>
            <div class="module-cost">Cost: ${module.cost} food</div>
            <button ${(!canApply && !isActive) ? 'disabled' : ''}>
                ${isActive ? 'Deactivate' : 'Activate'}
            </button>
        `;
        
        this.setupModuleElementEvents(moduleElement, module, isActive);
        
        return moduleElement;
    }

    setupModuleElementEvents(moduleElement, module, isActive) {
        const button = moduleElement.querySelector('button');
        button.addEventListener('click', () => {
            moduleElement.classList.remove('activating', 'deactivating');
            
            if (isActive) {
                moduleElement.classList.add('deactivating');
                this.moduleManager.deactivateModule(module.id, this.selectedTarget);
                this.renderer.addVisualEffect(this.selectedTarget.x, this.selectedTarget.y, 'deactivate');
            } else {
                moduleElement.classList.add('activating');
                this.moduleManager.activateModule(module.id, this.selectedTarget);
                this.renderer.addVisualEffect(this.selectedTarget.x, this.selectedTarget.y, 'activate');
            }
            
            setTimeout(() => {
                moduleElement.classList.remove('activating', 'deactivating');
            }, 400);
        });
        
        this.setupModuleDragAndDrop(moduleElement, module);
    }

    setupModuleDragAndDrop(moduleElement, module) {
        let dragPreview = null;
        
        moduleElement.addEventListener('dragstart', (e) => {
            moduleElement.classList.add('dragging');
            
            dragPreview = moduleElement.cloneNode(true);
            dragPreview.className = 'drag-preview';
            dragPreview.style.width = moduleElement.offsetWidth + 'px';
            document.body.appendChild(dragPreview);
            
            e.dataTransfer.setData('text/plain', module.id);
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setDragImage(new Image(), 0, 0);
        });
        
        moduleElement.addEventListener('dragend', () => {
            moduleElement.classList.remove('dragging');
            if (dragPreview) {
                document.body.removeChild(dragPreview);
                dragPreview = null;
            }
        });
        
        document.addEventListener('dragover', (e) => {
            if (dragPreview) {
                dragPreview.style.left = (e.clientX + 10) + 'px';
                dragPreview.style.top = (e.clientY + 10) + 'px';
            }
        });
        
        this.setupCanvasDropTarget();
    }
    
    setupCanvasDropTarget() {
        if (this.canvasDropSetup) return;
        this.canvasDropSetup = true;
        
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.canvas.style.filter = 'brightness(1.1)';
        });
        
        this.canvas.addEventListener('dragleave', () => {
            this.canvas.style.filter = '';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.canvas.style.filter = '';
            
            const moduleId = e.dataTransfer.getData('text/plain');
            if (!moduleId) return;
            
            const coords = this.eventHandler.getCanvasCoordinates(e);
            const targetNode = this.getNodeAt(coords.x, coords.y);
            
            if (targetNode) {
                const success = this.moduleManager.activateModule(moduleId, targetNode);
                if (success) {
                    this.renderer.addVisualEffect(targetNode.x, targetNode.y, 'activate');
                    this.updateModuleUI();
                    this.updateNodeControls();
                }
            }
        });
    }

    updateNodeControls() {
        const spawnBtn = document.getElementById('spawnBtn');
        
        if (!this.selectedTarget) {
            spawnBtn.disabled = true;
            spawnBtn.textContent = 'Spawn Individual (10 food)';
            return;
        }
        
        const canSpawn = this.selectedTarget.canSpawn();
        spawnBtn.disabled = !canSpawn;
        
        if (canSpawn) {
            spawnBtn.textContent = `Spawn Individual (10 food) - ${this.selectedTarget.food} available`;
        } else {
            spawnBtn.textContent = `Spawn Individual (10 food) - Need ${10 - this.selectedTarget.food} more`;
        }
    }

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
            this.updateNodeControls();
            
            console.log('Simulation reset');
        }
    }

    // Module integration methods
    handleModuleAdded(moduleData) {
        if (!this.selectedTarget) {
            console.warn('No target selected for module addition');
            return;
        }
        
        const moduleClass = this.getModuleClass(moduleData.type);
        if (moduleClass) {
            try {
                this.renderer.addVisualEffect(this.selectedTarget.x, this.selectedTarget.y, 'activate');
                this.moduleManager.addModule(this.selectedTarget, moduleClass);
                this.updateStats();
                this.updateNodeControls();
            } catch (error) {
                console.error(`Failed to add module ${moduleData.type}:`, error);
            }
        }
    }
    
    handleModuleRemoved(moduleData) {
        if (!this.selectedTarget) return;
        
        const moduleClass = this.getModuleClass(moduleData.type);
        if (moduleClass) {
            try {
                this.moduleManager.removeModule(this.selectedTarget, moduleClass);
                this.updateStats();
                this.updateNodeControls();
            } catch (error) {
                console.error(`Failed to remove module ${moduleData.type}:`, error);
            }
        }
    }
    
    getModuleClass(moduleType) {
        const moduleMap = {
            'speed': SpeedModule,
            'efficiency': EfficiencyModule,
            'vision': VisionModule,
            'communication': CommunicationModule,
            'specialization': SpecializationModule,
            'capacity': CapacityModule,
            'trail': TrailModule,
            'beacon': BeaconModule,
            'cluster': ClusterModule,
            'color': RedThemeModule,
            'priority': PriorityModule,
            'size': SizeModule
        };
        
        return moduleMap[moduleType] || null;
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
