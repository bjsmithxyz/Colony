/**
 * Simulation Renderer
 * Handles all rendering operations and visual effects
 */
export class SimulationRenderer {
    constructor(simulation) {
        this.simulation = simulation;
        this.ctx = simulation.ctx;
        this.canvas = simulation.canvas;
        this.visualEffects = [];
        this.lastRenderTime = 0;
        
        // FPS tracking
        this.fps = 0;
        this.fpsFrameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.avgFpsHistory = [];
        this.avgFps = 0;
    }

    render() {
        const now = performance.now();
        const deltaTime = now - this.lastRenderTime;
        
        // Limit to ~60 FPS
        if (deltaTime < 16) {
            return;
        }
        
        const renderStart = performance.now();
        this.lastRenderTime = now;
        
        this.renderFull();
        this.renderVisualEffects();
        this.updateAndRenderFPS();
        
        // Clear dirty regions for future optimization
        this.simulation.dirtyRectManager.clear();
        
        this.simulation.performanceMonitor.performanceMetrics.renderTime = performance.now() - renderStart;
    }
    
    renderFull() {
        this.ctx.fillStyle = this.simulation.CONFIG.MAP.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.simulation.CONFIG.MAP.WIDTH, this.simulation.CONFIG.MAP.HEIGHT);
        
        this.simulation.trailSystem.render(this.ctx);
        
        // Render entities (LOD removed)
        this.renderEntities();
    }

    renderEntities() {
        // Render food sources
        for (const food of this.simulation.foodSources) {
            food.render(this.ctx);
        }
        
        // Render nodes
        for (const node of this.simulation.nodes) {
            node.render(this.ctx);
        }
        
        // Render individuals
        for (const individual of this.simulation.individuals) {
            individual.render(this.ctx);
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
            this.ctx.fillStyle = this.simulation.CONFIG.MAP.BACKGROUND_COLOR;
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            
            // Render trail system in this region
            this.simulation.trailSystem.render(this.ctx);
            
            // Render entities that intersect with this region
            this.renderEntitiesInRegion(rect);
        }
        
        this.ctx.restore();
    }
    
    renderEntitiesInRegion(rect) {
        // Render food sources in region
        for (const food of this.simulation.foodSources) {
            if (this.entityIntersectsRect(food, rect)) {
                food.render(this.ctx);
            }
        }
        
        // Render nodes in region
        for (const node of this.simulation.nodes) {
            if (this.entityIntersectsRect(node, rect)) {
                node.render(this.ctx);
            }
        }
        
        // Render individuals in region
        for (const individual of this.simulation.individuals) {
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
            
            // Update average FPS
            this.avgFpsHistory.push(this.fps);
            if (this.avgFpsHistory.length > 10) this.avgFpsHistory.shift();
            this.avgFps = Math.round(this.avgFpsHistory.reduce((a, b) => a + b, 0) / this.avgFpsHistory.length);
            
            this.updateFPSDisplay();
            this.updatePerformanceMetrics();
        }
    }

    updateFPSDisplay() {
        const fpsIndicator = document.getElementById('fpsIndicator');
        if (!fpsIndicator) return;

        fpsIndicator.textContent = `${this.fps} FPS`;
        
        // Update color based on performance
        if (this.fps < 30) {
            fpsIndicator.style.color = '#ef4444';
            fpsIndicator.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        } else if (this.fps < 50) {
            fpsIndicator.style.color = '#f59e0b';
            fpsIndicator.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        } else {
            fpsIndicator.style.color = '#10b981';
            fpsIndicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        }
    }

    updatePerformanceMetrics() {
        // Update enhanced UI performance metrics
        if (window.enhancedUI) {
            const performanceMetrics = {
                currentFPS: this.fps,
                avgFPS: this.avgFps,
                lodLevel: 'High',
                memoryUsage: performance && performance.memory ? performance.memory.usedJSHeapSize : null
            };
            window.enhancedUI.updatePerformanceMetrics(performanceMetrics);
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const progressBar = document.getElementById('loadingProgressBar');
        
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            
            // Simulate loading progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                progressBar.style.width = Math.min(progress, 100) + '%';
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        loadingScreen.classList.add('hidden');
                    }, 500);
                }
            }, 100);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
}
