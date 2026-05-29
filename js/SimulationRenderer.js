import { CONSTANTS } from './constants.js';

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
        this.firstFrame = true; // Track first frame for full render
        
        // FPS tracking
        this.fps = 0;
        this.fpsFrameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.avgFpsHistory = [];
        this.avgFps = 0;
    }

    render() {
        const renderStart = performance.now();
        this.lastRenderTime = renderStart;
        
        // Check if dirty rect optimization is enabled
        const dirtyRectEnabled = this.simulation.CONFIG &&
                                 this.simulation.CONFIG.RENDER &&
                                 this.simulation.CONFIG.RENDER.DIRTY_RECT_ENABLED;
        
        const dirtyRects = this.simulation.dirtyRectManager.getDirtyRects();
        const hasDirtyRects = dirtyRects && dirtyRects.length > 0;
        // Partial redraw is safe when paused (trails don't fade) or when trails are cleared
        const canUseDirtyRects = dirtyRectEnabled && hasDirtyRects && !this.firstFrame &&
            this.simulation.isPaused;
        
        if (canUseDirtyRects) {
            // Fallback to full render if too many dirty regions (optimization not helping)
            const totalDirtyArea = dirtyRects.reduce((sum, rect) => sum + (rect.width * rect.height), 0);
            const canvasArea = this.simulation.CONFIG.MAP.WIDTH * this.simulation.CONFIG.MAP.HEIGHT;
            const dirtyPercentage = totalDirtyArea / canvasArea;
            
            // If more than 50% of canvas is dirty, just do a full render
            if (dirtyPercentage > 0.5 || dirtyRects.length > 50) {
                this.renderFull();
            } else {
                this.renderDirtyRegions(dirtyRects);
            }
        } else {
            // Full render on first frame or when dirty rects disabled/empty
            this.renderFull();
            this.firstFrame = false;
        }
        
        this.renderVisualEffects();
        this.updateAndRenderFPS();
        
        // Clear dirty regions for future optimization
        this.simulation.dirtyRectManager.clear();
        
        this.simulation.performanceMonitor.performanceMetrics.renderTime = performance.now() - renderStart;
    }
    
    renderFull() {
        this.ctx.fillStyle = this.simulation.CONFIG.MAP.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.simulation.CONFIG.MAP.WIDTH, this.simulation.CONFIG.MAP.HEIGHT);
        
        // Render terrain contour lines (before trails and entities)
        if (this.simulation.terrainMap) {
            this.simulation.terrainMap.render(this.ctx);
        }
        
        this.simulation.trailSystem.render(this.ctx);
        
        // Render entities
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
        this.ctx.fillStyle = this.simulation.CONFIG.MAP.BACKGROUND_COLOR;
        for (const rect of dirtyRects) {
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        this.ctx.globalCompositeOperation = 'source-over';
        for (const rect of dirtyRects) {
            this.simulation.trailSystem.renderRegion(this.ctx, rect);
        }

        this.renderEntities();
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
        
        if (elapsed >= CONSTANTS.FPS_UPDATE_INTERVAL) {
            this.fps = Math.round((this.fpsFrameCount * 1000) / elapsed);
            this.fpsFrameCount = 0;
            this.lastFpsUpdate = now;
            
            // Update average FPS
            this.avgFpsHistory.push(this.fps);
            if (this.avgFpsHistory.length > CONSTANTS.FPS_HISTORY_SIZE) {
                this.avgFpsHistory.shift();
            }
            this.avgFps = Math.round(this.avgFpsHistory.reduce((a, b) => a + b, 0) / this.avgFpsHistory.length);
            
            this.updateFPSDisplay();
            this.updatePerformanceMetrics();
        }
    }

    updateFPSDisplay() {
        const fpsIndicator = document.getElementById('fpsIndicator');
        if (!fpsIndicator) return;

        fpsIndicator.textContent = `${this.fps} FPS`;
        // Map fps to a value between 0 (bad) and 1 (good) using 60 as target
        const clamped = Math.max(0, Math.min(1, this.fps / 60));
        // Interpolate between red (#ef4444) at 0 and white (#ffffff) at 1
        const lerp = (a, b, t) => Math.round(a + (b - a) * t);
        const hexToRgb = (hex) => hex.replace('#','').match(/.{2}/g).map(h => parseInt(h,16));
        const rgbToHex = (r,g,b) => '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
        const redRgb = hexToRgb('ef4444');
        const whiteRgb = hexToRgb('ffffff');
        const r = lerp(redRgb[0], whiteRgb[0], clamped);
        const g = lerp(redRgb[1], whiteRgb[1], clamped);
        const b = lerp(redRgb[2], whiteRgb[2], clamped);
        fpsIndicator.style.color = rgbToHex(r,g,b);
    }

    updatePerformanceMetrics() {
        // Update enhanced UI performance metrics
        if (window.enhancedUI) {
            const performanceMetrics = {
                currentFPS: this.fps,
                avgFPS: this.avgFps,
                memoryUsage: performance && performance.memory ? performance.memory.usedJSHeapSize : null
            };
            window.enhancedUI.updatePerformanceMetrics(performanceMetrics);
        }
    }
}
