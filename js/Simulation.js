import { CONFIG } from './config.js';
import { Node } from './Node.js';
import { Individual } from './Individual.js';
import { FoodSource } from './FoodSource.js';
import { TrailSystem } from './TrailSystem.js';
import { ModuleManager } from './ModuleManager.js';
import { SpatialGrid } from './SpatialGrid.js';
import { ObjectPool } from './ObjectPool.js';
import { DirtyRectManager } from './DirtyRectManager.js';
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

export class Simulation {
    constructor(canvas) {
        this.canvas = canvas;
        
        try {
            this.ctx = canvas.getContext('2d', { alpha: false });
        } catch (e) {
            console.warn('Failed to get context with alpha: false, falling back to default');
            this.ctx = canvas.getContext('2d');
        }
        
        if (!this.ctx) {
            throw new Error('Failed to get 2D canvas context');
        }
        
        this.canvas.width = CONFIG.MAP.WIDTH;
        this.canvas.height = CONFIG.MAP.HEIGHT;
        
        this.ctx.imageSmoothingEnabled = false;
        
        this.nodes = [];
        this.individuals = [];
        this.foodSources = [];
        this.frameCount = 0;
        this.trailSystem = new TrailSystem(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT);
        this.moduleManager = new ModuleManager(this);
        this.selectedTarget = null;
        
        // FPS tracking
        this.fps = 0;
        this.fpsFrameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        // Performance monitoring
        this.performanceMetrics = {
            updateTime: 0,
            renderTime: 0,
            totalPixels: 0,
            memoryUsage: 0,
            lastPerformanceLog: 0
        };
        
        // Simulation controls
        this.isPaused = false;
        this.simulationSpeed = 1.0;
        this.animationId = null;
        
        // Context menu
        this.contextMenu = document.getElementById('contextMenu');
        this.contextMenuTarget = null;
        
        // Tooltip
        this.tooltip = document.getElementById('tooltip');
        this.hoveredNode = null;
        
        // Visual effects
        this.visualEffects = [];
        
        // Statistics tracking
        this.totalFoodCollected = 0;
        this.totalIndividualsSpawned = 0;
        
        // Spatial partitioning for performance
        this.spatialGrid = new SpatialGrid(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT, 32);
        
        // Object pooling for individuals
        this.individualPool = new ObjectPool(
            (node) => new Individual(node),
            (individual, node) => {
                individual.reset(node);
            },
            0 // Don't pre-populate since Individual needs a parentNode
        );
        
        // Dirty rectangle optimization
        this.dirtyRectManager = new DirtyRectManager(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT, 64);
        this.lastRenderTime = 0;
        
        this.setupEventListeners();
        this.generateFoodSources();
        this.initializeModules();
    }

    setupEventListeners() {
        // Left click handler
        this.canvas.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click handler from interfering
            
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            // Click detected
            
            // Hide context menu on left click
            this.hideContextMenu();
            
            // Check if clicking on existing node
            const clickedNode = this.getNodeAt(x, y);
            
            if (clickedNode) {
                this.selectTarget(clickedNode);
            } else {
                this.addNode(Math.floor(x), Math.floor(y));
            }
        });
        
        // Right click handler
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            const clickedNode = this.getNodeAt(x, y);
            if (clickedNode) {
                this.showContextMenu(e.clientX, e.clientY, clickedNode);
            }
        });
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target) && e.target !== this.canvas) {
                this.hideContextMenu();
            }
        });
        
        // Save/Load buttons
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveSimulation();
        });
        
        document.getElementById('loadBtn').addEventListener('click', () => {
            this.loadSimulation();
        });
        
        // Pause/Play controls
        const pausePlayBtn = document.getElementById('pausePlayBtn');
        pausePlayBtn.addEventListener('click', () => {
            this.togglePause();
            pausePlayBtn.textContent = this.isPaused ? '▶️ Play' : '⏸️ Pause';
        });
        
        // Speed control
        const speedSlider = document.getElementById('speedSlider');
        const speedDisplay = document.getElementById('speedDisplay');
        speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            speedDisplay.textContent = `${this.simulationSpeed.toFixed(1)}x`;
        });
        
        // Context menu actions
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action && this.contextMenuTarget) {
                this.handleContextMenuAction(action, this.contextMenuTarget);
                this.hideContextMenu();
            }
        });
        
        // Mouse move for tooltips
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            const node = this.getNodeAt(x, y);
            
            if (node !== this.hoveredNode) {
                this.hoveredNode = node;
                if (node) {
                    this.showTooltip(e.clientX, e.clientY, node);
                } else {
                    this.hideTooltip();
                }
            } else if (node) {
                // Update tooltip position
                this.updateTooltipPosition(e.clientX, e.clientY);
            }
        });
        
        // Hide tooltip when mouse leaves canvas
        this.canvas.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
        
        // Statistics panel toggle
        const statsToggle = document.getElementById('statsToggle');
        const statsContent = document.getElementById('stats');
        statsToggle.addEventListener('click', () => {
            statsToggle.classList.toggle('collapsed');
            statsContent.classList.toggle('collapsed');
        });
        
        // Spawn button
        const spawnBtn = document.getElementById('spawnBtn');
        spawnBtn.addEventListener('click', () => {
            if (this.selectedTarget && this.selectedTarget.canSpawn()) {
                const success = this.selectedTarget.spawn();
                if (success) {
                    this.updateNodeControls();
                    this.updateStats();
                }
            }
        });
        
    }

    addNode(x, y) {
        if (this.nodes.length >= CONFIG.NODE.MAX_NODES) {
            console.warn('Maximum nodes reached:', CONFIG.NODE.MAX_NODES);
            return;
        }
        
        try {
            const node = new Node(x, y);
            node.simulation = this;
            this.nodes.push(node);
            // Node added successfully
            
            if (this.nodes.length === 1) {
                const individual = this.individualPool.acquire(node);
                this.individuals.push(individual);
                node.individuals.push(individual);
                this.totalIndividualsSpawned++;
                // First individual created
            }
            
            this.updateStats();
        } catch (error) {
            console.error('Error adding node:', error);
        }
    }

    generateFoodSources() {
        const numSources = 5 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < numSources; i++) {
            const x = Math.floor(Math.random() * (CONFIG.MAP.WIDTH - 40)) + 20;
            const y = Math.floor(Math.random() * (CONFIG.MAP.HEIGHT - 40)) + 20;
            this.foodSources.push(new FoodSource(x, y));
        }
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

    update() {
        if (this.isPaused) return;
        
        const updateStart = performance.now();
        
        // Apply speed multiplier by running multiple updates
        const updates = Math.floor(this.simulationSpeed);
        const fractionalUpdate = this.simulationSpeed - updates;
        
        for (let u = 0; u < updates; u++) {
            this.performUpdate();
        }
        
        // Handle fractional speed (e.g., 0.5x speed)
        if (fractionalUpdate > 0 && Math.random() < fractionalUpdate) {
            this.performUpdate();
        }
        
        this.performanceMetrics.updateTime = performance.now() - updateStart;
    }
    
    performUpdate() {
        this.frameCount++;
        
        // Clear and rebuild spatial grid
        this.spatialGrid.clear();
        
        // Update nodes
        this.nodes.forEach(node => node.update());
        
        // Insert individuals into spatial grid
        this.individuals.forEach(individual => {
            this.spatialGrid.insert(individual);
        });
        
        // Update individuals with spatial optimization and object pooling
        for (let i = this.individuals.length - 1; i >= 0; i--) {
            const individual = this.individuals[i];
            const prevX = individual.x;
            const prevY = individual.y;
            individual.update(this);
            
            if (individual.isDead) {
                // Mark dirty region before removal
                this.dirtyRectManager.markEntityDirty(individual);
                
                // Remove from simulation
                this.individuals.splice(i, 1);
                
                // Remove from parent node
                const nodeIndex = individual.parentNode.individuals.indexOf(individual);
                if (nodeIndex > -1) {
                    individual.parentNode.individuals.splice(nodeIndex, 1);
                }
                
                // Return to object pool
                this.individualPool.release(individual);
                continue;
            }
            
            // Mark dirty regions for movement
            if (Math.abs(individual.x - prevX) > 0.1 || Math.abs(individual.y - prevY) > 0.1) {
                this.dirtyRectManager.markEntityDirty(individual, prevX, prevY);
                
                const trailColor = individual.carrying > 0 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(33, 150, 243, 0.3)';
                this.trailSystem.addPoint(individual.x, individual.y, trailColor);
            }
        }
        
        this.trailSystem.update();
        this.moduleManager.update();
        
        if (this.frameCount % 30 === 0) {
            this.updateStats();
        }
    }

    render() {
        // For now, always do full render but with FPS limiting
        const now = performance.now();
        const deltaTime = now - this.lastRenderTime;
        
        // Limit to ~60 FPS
        if (deltaTime < 16) {
            return;
        }
        
        const renderStart = performance.now();
        
        this.lastRenderTime = now;
        this.renderFull();
        
        // Always render UI elements
        this.renderVisualEffects();
        this.updateAndRenderFPS();
        
        // Clear dirty regions for future optimization
        this.dirtyRectManager.clear();
        
        this.performanceMetrics.renderTime = performance.now() - renderStart;
        
        // Log performance metrics every 5 seconds
        if (now - this.performanceMetrics.lastPerformanceLog > 5000) {
            this.logPerformanceMetrics();
            this.performanceMetrics.lastPerformanceLog = now;
        }
    }
    
    renderFull() {
        this.ctx.fillStyle = CONFIG.MAP.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT);
        
        this.trailSystem.render(this.ctx);
        
        for (let i = 0; i < this.foodSources.length; i++) {
            this.foodSources[i].render(this.ctx);
        }
        
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].render(this.ctx);
        }
        
        for (let i = 0; i < this.individuals.length; i++) {
            this.individuals[i].render(this.ctx);
        }
    }
    
    renderDirtyRegions(dirtyRects) {
        this.ctx.save();
        
        for (const rect of dirtyRects) {
            // Set clipping region
            this.ctx.beginPath();
            this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
            this.ctx.clip();
            
            // Clear the region
            this.ctx.fillStyle = CONFIG.MAP.BACKGROUND_COLOR;
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            
            // Render trail system in this region
            this.trailSystem.render(this.ctx);
            
            // Render entities that intersect with this region
            this.renderEntitiesInRegion(rect);
        }
        
        this.ctx.restore();
    }
    
    renderEntitiesInRegion(rect) {
        // Render food sources in region
        for (let i = 0; i < this.foodSources.length; i++) {
            const food = this.foodSources[i];
            if (this.entityIntersectsRect(food, rect)) {
                food.render(this.ctx);
            }
        }
        
        // Render nodes in region
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (this.entityIntersectsRect(node, rect)) {
                node.render(this.ctx);
            }
        }
        
        // Render individuals in region
        for (let i = 0; i < this.individuals.length; i++) {
            const individual = this.individuals[i];
            if (this.entityIntersectsRect(individual, rect)) {
                individual.render(this.ctx);
            }
        }
    }
    
    entityIntersectsRect(entity, rect) {
        const entitySize = entity.size || 1;
        const entityLeft = entity.x - entitySize;
        const entityRight = entity.x + entitySize;
        const entityTop = entity.y - entitySize;
        const entityBottom = entity.y + entitySize;
        
        return !(entityRight < rect.x || 
                entityLeft > rect.x + rect.width ||
                entityBottom < rect.y || 
                entityTop > rect.y + rect.height);
    }

    updateStats() {
        document.getElementById('nodeCount').textContent = this.nodes.length;
        document.getElementById('individualCount').textContent = this.individuals.length;
        
        const totalFood = this.nodes.reduce((sum, node) => sum + node.food, 0);
        document.getElementById('totalFood').textContent = totalFood;
        
        // Food collected
        document.getElementById('foodCollected').textContent = this.totalFoodCollected;
        
        // Average efficiency (food collected per individual spawned)
        const efficiency = this.totalIndividualsSpawned > 0 
            ? Math.round((this.totalFoodCollected / this.totalIndividualsSpawned) * 100) 
            : 0;
        document.getElementById('avgEfficiency').textContent = `${efficiency}%`;
        
        // Active modules count
        let activeModuleCount = 0;
        this.nodes.forEach(node => {
            activeModuleCount += this.moduleManager.getModulesForTarget(node).length;
        });
        document.getElementById('activeModules').textContent = activeModuleCount;
        
        // Update node controls if a node is selected
        if (this.selectedTarget) {
            this.updateNodeControls();
        }
    }

    getNodeAt(x, y) {
        return this.nodes.find(node => {
            // Check if click is on any pixel of the node
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
        // Target selected
    }

    updateModuleUI() {
        const moduleList = document.getElementById('moduleList');
        
        if (!this.selectedTarget) {
            moduleList.innerHTML = '<p class="placeholder">Select a node to see available modules</p>';
            return;
        }
        
        const availableModules = this.moduleManager.getAvailableModules();
        const activeModules = this.moduleManager.getModulesForTarget(this.selectedTarget);
        
        if (availableModules.length === 0) {
            moduleList.innerHTML = '<p class="placeholder">No modules available yet</p>';
            return;
        }
        
        moduleList.innerHTML = '';
        
        // Group modules by type
        const modulesByType = {
            enhancement: [],
            visual: [],
            behavior: []
        };
        
        availableModules.forEach(module => {
            if (modulesByType[module.type]) {
                modulesByType[module.type].push(module);
            }
        });
        
        // Render each category
        Object.entries(modulesByType).forEach(([type, modules]) => {
            if (modules.length === 0) return;
            
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'module-category';
            categoryHeader.innerHTML = `<h4>${type.charAt(0).toUpperCase() + type.slice(1)} Modules</h4>`;
            moduleList.appendChild(categoryHeader);
            
            modules.forEach(module => {
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
                
                const button = moduleElement.querySelector('button');
                button.addEventListener('click', () => {
                    // Add visual feedback
                    moduleElement.classList.remove('activating', 'deactivating');
                    
                    if (isActive) {
                        moduleElement.classList.add('deactivating');
                        this.moduleManager.deactivateModule(module.id, this.selectedTarget);
                        this.addVisualEffect(this.selectedTarget.x, this.selectedTarget.y, 'deactivate');
                    } else {
                        moduleElement.classList.add('activating');
                        this.moduleManager.activateModule(module.id, this.selectedTarget);
                        this.addVisualEffect(this.selectedTarget.x, this.selectedTarget.y, 'activate');
                    }
                    
                    // Remove animation class after animation completes
                    setTimeout(() => {
                        moduleElement.classList.remove('activating', 'deactivating');
                    }, 400);
                });
                
                // Add drag and drop functionality
                this.setupModuleDragAndDrop(moduleElement, module);
                
                moduleList.appendChild(moduleElement);
            });
        });
    }
    
    setupModuleDragAndDrop(moduleElement, module) {
        let dragPreview = null;
        
        moduleElement.addEventListener('dragstart', (e) => {
            moduleElement.classList.add('dragging');
            
            // Create drag preview
            dragPreview = moduleElement.cloneNode(true);
            dragPreview.className = 'drag-preview';
            dragPreview.style.width = moduleElement.offsetWidth + 'px';
            document.body.appendChild(dragPreview);
            
            // Set drag data
            e.dataTransfer.setData('text/plain', module.id);
            e.dataTransfer.effectAllowed = 'copy';
            
            // Hide default drag image
            e.dataTransfer.setDragImage(new Image(), 0, 0);
        });
        
        moduleElement.addEventListener('dragend', (e) => {
            moduleElement.classList.remove('dragging');
            if (dragPreview) {
                document.body.removeChild(dragPreview);
                dragPreview = null;
            }
        });
        
        // Update drag preview position
        document.addEventListener('dragover', (e) => {
            if (dragPreview) {
                dragPreview.style.left = (e.clientX + 10) + 'px';
                dragPreview.style.top = (e.clientY + 10) + 'px';
            }
        });
        
        // Setup canvas as drop target
        this.setupCanvasDropTarget();
    }
    
    setupCanvasDropTarget() {
        if (this.canvasDropSetup) return; // Only setup once
        this.canvasDropSetup = true;
        
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.canvas.style.filter = 'brightness(1.1)';
        });
        
        this.canvas.addEventListener('dragleave', (e) => {
            this.canvas.style.filter = '';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.canvas.style.filter = '';
            
            const moduleId = e.dataTransfer.getData('text/plain');
            if (!moduleId) return;
            
            // Get drop coordinates
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            // Find node at drop location
            const targetNode = this.getNodeAt(x, y);
            if (targetNode) {
                // Apply module to the node
                const success = this.moduleManager.activateModule(moduleId, targetNode);
                if (success) {
                    this.addVisualEffect(targetNode.x, targetNode.y, 'activate');
                    this.updateModuleUI();
                    this.updateNodeControls();
                    // Module applied via drag-and-drop
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

    saveSimulation() {
        const state = {
            nodes: this.nodes.map(node => ({ x: node.x, y: node.y, food: node.food })),
            foodSources: this.foodSources.map(food => ({ 
                centerX: food.centerX, 
                centerY: food.centerY, 
                revealed: food.revealed, 
                depleted: food.depleted,
                remainingFood: food.remainingFood
            })),
            modules: this.moduleManager.saveState()
        };
        
        localStorage.setItem('pixsim_save', JSON.stringify(state));
        console.log('Simulation saved');
    }

    loadSimulation() {
        const saved = localStorage.getItem('pixsim_save');
        if (!saved) {
            console.log('No saved simulation found');
            return false;
        }
        
        try {
            const state = JSON.parse(saved);
            
            // Clear current simulation
            this.nodes = [];
            this.individuals = [];
            this.foodSources = [];
            
            // Restore nodes
            state.nodes.forEach(nodeData => {
                const node = new Node(nodeData.x, nodeData.y);
                node.food = nodeData.food;
                node.simulation = this;
                this.nodes.push(node);
            });
            
            // Restore food sources
            state.foodSources.forEach(foodData => {
                const food = new FoodSource(foodData.centerX, foodData.centerY);
                food.revealed = foodData.revealed;
                food.depleted = foodData.depleted;
                food.remainingFood = foodData.remainingFood;
                this.foodSources.push(food);
            });
            
            // Restore modules
            if (state.modules) {
                this.moduleManager.loadState(state.modules);
            }
            
            this.updateStats();
            console.log('Simulation loaded');
            return true;
        } catch (error) {
            console.error('Failed to load simulation:', error);
            return false;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    showContextMenu(x, y, node) {
        this.contextMenuTarget = node;
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        
        // Adjust position if menu goes off-screen
        const menuRect = this.contextMenu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            this.contextMenu.style.left = `${x - menuRect.width}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
            this.contextMenu.style.top = `${y - menuRect.height}px`;
        }
    }
    
    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.contextMenuTarget = null;
    }
    
    handleContextMenuAction(action, node) {
        switch (action) {
            case 'delete':
                this.deleteNode(node);
                break;
            case 'duplicate':
                this.duplicateNode(node);
                break;
            case 'clear-modules':
                this.clearNodeModules(node);
                break;
            case 'info':
                this.showNodeInfo(node);
                break;
        }
    }
    
    deleteNode(node) {
        const index = this.nodes.indexOf(node);
        if (index > -1) {
            // Remove all individuals belonging to this node
            this.individuals = this.individuals.filter(ind => ind.node !== node);
            
            // Remove the node
            this.nodes.splice(index, 1);
            
            // Clear selection if this was the selected node
            if (this.selectedTarget === node) {
                this.selectedTarget = null;
                this.updateModuleUI();
                this.updateNodeControls();
            }
        }
    }
    
    duplicateNode(node) {
        if (this.nodes.length >= CONFIG.NODE.MAX_NODES) {
            console.warn('Maximum nodes reached');
            return;
        }
        
        // Create new node at offset position
        const offsetX = 30;
        const offsetY = 30;
        const newNode = new Node(
            Math.min(node.x + offsetX, CONFIG.MAP.WIDTH - 20),
            Math.min(node.y + offsetY, CONFIG.MAP.HEIGHT - 20)
        );
        newNode.simulation = this;
        newNode.food = node.food;
        
        // Copy modules
        const nodeModules = this.moduleManager.getModulesForTarget(node);
        nodeModules.forEach(module => {
            const moduleClass = module.constructor;
            this.moduleManager.activateModule(moduleClass, newNode);
        });
        
        this.nodes.push(newNode);
        this.selectTarget(newNode);
    }
    
    clearNodeModules(node) {
        const modules = this.moduleManager.getModulesForTarget(node);
        modules.forEach(module => {
            this.moduleManager.deactivateModule(module.constructor, node);
        });
        this.updateModuleUI();
    }
    
    showNodeInfo(node) {
        const modules = this.moduleManager.getModulesForTarget(node);
        const moduleNames = modules.map(m => m.name).join(', ') || 'None';
        const individualCount = this.individuals.filter(ind => ind.node === node).length;
        
        alert(`Node Information:
Position: (${Math.round(node.x)}, ${Math.round(node.y)})
Food: ${node.food}
Individuals: ${individualCount}
Modules: ${moduleNames}`);
    }
    
    showTooltip(x, y, node) {
        const individualCount = this.individuals.filter(ind => ind.node === node).length;
        const modules = this.moduleManager.getModulesForTarget(node);
        const moduleCount = modules.length;
        
        let content = `Food: ${node.food}<br>Individuals: ${individualCount}`;
        if (moduleCount > 0) {
            content += `<br>Modules: ${moduleCount}`;
        }
        
        this.tooltip.innerHTML = content;
        this.tooltip.style.display = 'block';
        this.updateTooltipPosition(x, y);
    }
    
    updateTooltipPosition(x, y) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const offsetX = 10;
        const offsetY = -tooltipRect.height - 10;
        
        let left = x + offsetX;
        let top = y + offsetY;
        
        // Keep tooltip on screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = x - tooltipRect.width - offsetX;
        }
        if (top < 0) {
            top = y + 20;
        }
        
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }
    
    hideTooltip() {
        this.tooltip.style.display = 'none';
        this.hoveredNode = null;
    }
    
    addVisualEffect(x, y, type) {
        this.visualEffects.push({
            x: x,
            y: y,
            type: type,
            radius: 10,
            opacity: 1,
            age: 0
        });
    }
    
    renderVisualEffects() {
        // Update and render visual effects
        for (let i = this.visualEffects.length - 1; i >= 0; i--) {
            const effect = this.visualEffects[i];
            
            // Update effect
            effect.radius += 2;
            effect.opacity -= 0.03;
            effect.age++;
            
            // Remove old effects
            if (effect.opacity <= 0 || effect.age > 30) {
                this.visualEffects.splice(i, 1);
                continue;
            }
            
            // Render effect
            this.ctx.save();
            this.ctx.globalAlpha = effect.opacity;
            
            if (effect.type === 'activate') {
                this.ctx.strokeStyle = '#4CAF50';
                this.ctx.shadowColor = '#4CAF50';
            } else {
                this.ctx.strokeStyle = '#FF4444';
                this.ctx.shadowColor = '#FF4444';
            }
            
            this.ctx.shadowBlur = 10;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    updateAndRenderFPS() {
        // Update FPS calculation
        this.fpsFrameCount++;
        const now = performance.now();
        const elapsed = now - this.lastFpsUpdate;
        
        if (elapsed >= 1000) {
            this.fps = Math.round((this.fpsFrameCount * 1000) / elapsed);
            this.fpsFrameCount = 0;
            this.lastFpsUpdate = now;
        }
        
        // Render FPS counter
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(CONFIG.MAP.WIDTH - 80, 10, 70, 25);
        
        this.ctx.fillStyle = this.fps < 30 ? '#ff4444' : this.fps < 50 ? '#ffaa00' : '#44ff44';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`FPS: ${this.fps}`, CONFIG.MAP.WIDTH - 15, 28);
        
        // Show pause indicator
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', CONFIG.MAP.WIDTH / 2, 30);
        }
        
        this.ctx.restore();
    }
    
    logPerformanceMetrics() {
        // Calculate total pixels across all nodes
        let totalPixels = 0;
        this.nodes.forEach(node => {
            totalPixels += node.pixels.length;
        });
        this.performanceMetrics.totalPixels = totalPixels;
        
        // Memory usage estimation (rough)
        const estimatedMemory = (
            this.individuals.length * 200 + // ~200 bytes per individual
            totalPixels * 16 + // ~16 bytes per pixel
            this.foodSources.length * 100 // ~100 bytes per food source
        ) / 1024; // Convert to KB
        
        this.performanceMetrics.memoryUsage = estimatedMemory;
        
        console.log('=== PERFORMANCE METRICS ===');
        console.log(`FPS: ${this.fps}`);
        console.log(`Update Time: ${this.performanceMetrics.updateTime.toFixed(2)}ms`);
        console.log(`Render Time: ${this.performanceMetrics.renderTime.toFixed(2)}ms`);
        console.log(`Nodes: ${this.nodes.length}`);
        console.log(`Individuals: ${this.individuals.length}`);
        console.log(`Total Pixels: ${totalPixels}`);
        console.log(`Estimated Memory: ${estimatedMemory.toFixed(1)}KB`);
        console.log('==========================');
        
        // Performance warnings
        if (this.fps < 30) {
            console.warn('⚠️ Low FPS detected! Consider reducing entities or optimizing.');
        }
        if (this.performanceMetrics.updateTime > 10) {
            console.warn('⚠️ High update time! Check for expensive operations.');
        }
        if (this.performanceMetrics.renderTime > 10) {
            console.warn('⚠️ High render time! Consider reducing visual complexity.');
        }
        if (totalPixels > 10000) {
            console.warn('⚠️ High pixel count! Node growth may be impacting performance.');
        }
    }
    
    // Performance testing utility
    performanceStressTest(nodeCount = 10) {
        console.log(`Starting performance stress test with ${nodeCount} nodes...`);
        
        // Clear existing simulation
        this.nodes = [];
        this.individuals = [];
        this.foodSources = [];
        
        // Generate food sources
        this.generateFoodSources();
        
        // Add nodes in a grid pattern for consistent testing
        const gridSize = Math.ceil(Math.sqrt(nodeCount));
        const spacing = Math.min(CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT) / (gridSize + 1);
        
        for (let i = 0; i < nodeCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const x = spacing * (col + 1);
            const y = spacing * (row + 1);
            
            if (x < CONFIG.MAP.WIDTH - 20 && y < CONFIG.MAP.HEIGHT - 20) {
                this.addNode(Math.floor(x), Math.floor(y));
            }
        }
        
        console.log(`Created ${this.nodes.length} nodes for stress testing`);
        console.log('Monitor console for performance metrics every 5 seconds');
        console.log('Recommended: Open browser dev tools > Performance tab to profile');
        
        // Force immediate performance log
        this.performanceMetrics.lastPerformanceLog = 0;
    }

    start() {
        const gameLoop = () => {
            this.update();
            this.render();
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }
}