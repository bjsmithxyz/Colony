/**
 * Performance Monitor
 * Handles performance tracking, optimization, and logging
 */
import { logger } from './logger.js';

export class PerformanceMonitor {
    constructor(simulation) {
        this.simulation = simulation;
        this.performanceMetrics = {
            updateTime: 0,
            renderTime: 0,
            totalPixels: 0,
            memoryUsage: 0,
            lastPerformanceLog: 0
        };
    }

    logPerformanceMetrics() {
        // Calculate total pixels across all nodes
        let totalPixels = 0;
        this.simulation.nodes.forEach(node => {
            totalPixels += node.pixels.length;
        });
        this.performanceMetrics.totalPixels = totalPixels;
        
        // Memory usage estimation (rough)
        const estimatedMemory = (
            this.simulation.individuals.length * 200 + // ~200 bytes per individual
            totalPixels * 16 + // ~16 bytes per pixel
            this.simulation.foodSources.length * 100 // ~100 bytes per food source
        ) / 1024; // Convert to KB
        
        this.performanceMetrics.memoryUsage = estimatedMemory;
        
        try {
            if (this.simulation && this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.performance) {
                logger.debug('performance', '=== PERFORMANCE METRICS ===');
                logger.debug('performance', `FPS: ${this.simulation.renderer.fps}`);
                logger.debug('performance', `Update Time: ${this.performanceMetrics.updateTime.toFixed(2)}ms`);
                logger.debug('performance', `Render Time: ${this.performanceMetrics.renderTime.toFixed(2)}ms`);
                logger.debug('performance', `Nodes: ${this.simulation.nodes.length}`);
                logger.debug('performance', `Individuals: ${this.simulation.individuals.length}`);
                logger.debug('performance', `Total Pixels: ${totalPixels}`);
                logger.debug('performance', `Estimated Memory: ${estimatedMemory.toFixed(1)}KB`);
                logger.debug('performance', '==========================');
            }
        } catch (e) {}
        
        // Performance warnings
        this.checkPerformanceWarnings(totalPixels);
    }

    checkPerformanceWarnings(totalPixels) {
        try {
            if (this.simulation && this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.performance) {
                if (this.simulation.renderer.fps < 30) {
                    logger.warn('⚠️ Low FPS detected! Consider reducing entities or optimizing.');
                }
                if (this.performanceMetrics.updateTime > 10) {
                    logger.warn('⚠️ High update time! Check for expensive operations.');
                }
                if (this.performanceMetrics.renderTime > 10) {
                    logger.warn('⚠️ High render time! Consider reducing visual complexity.');
                }
                if (totalPixels > 10000) {
                    logger.warn('⚠️ High pixel count! Node growth may be impacting performance.');
                }
            }
        } catch (e) {}
    }
    
    // Performance testing utility
    performanceStressTest(nodeCount = 10) {
    try { if (this.simulation && this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.performance) logger.debug('performance',`Starting performance stress test with ${nodeCount} nodes...`); } catch(e){}
        
        // Clear existing simulation
        this.simulation.nodes = [];
        this.simulation.individuals = [];
        this.simulation.foodSources = [];
        
        // Generate food sources
        this.simulation.generateFoodSources();
        
        // Add nodes in a grid pattern for consistent testing
        const gridSize = Math.ceil(Math.sqrt(nodeCount));
        const spacing = Math.min(this.simulation.CONFIG.MAP.WIDTH, this.simulation.CONFIG.MAP.HEIGHT) / (gridSize + 1);
        
        for (let i = 0; i < nodeCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const x = spacing * (col + 1);
            const y = spacing * (row + 1);
            
            if (x < this.simulation.CONFIG.MAP.WIDTH - 20 && y < this.simulation.CONFIG.MAP.HEIGHT - 20) {
                this.simulation.addNode(Math.floor(x), Math.floor(y));
            }
        }
        
        try { if (this.simulation && this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.performance) {
            logger.debug('performance',`Created ${this.simulation.nodes.length} nodes for stress testing`);
            logger.debug('performance','Monitor console for performance metrics every 5 seconds');
            logger.debug('performance','Recommended: Open browser dev tools > Performance tab to profile');
        } } catch(e){}
        
        // Force immediate performance log
        this.performanceMetrics.lastPerformanceLog = 0;
        // Start realtime logging to help catch spikes during stress tests
        if (this._realtimeInterval) clearInterval(this._realtimeInterval);
        const self = this;
        this._realtimeInterval = setInterval(() => {
            try {
                const ut = this.performanceMetrics.updateTime || 0;
                const rt = this.performanceMetrics.renderTime || 0;
                const total = this.performanceMetrics.totalPixels || 0;
                if (ut > 10 || rt > 10 || total > 10000) {
                    logger.warn('Realtime performance spike detected', { updateTime: ut, renderTime: rt, totalPixels: total });
                    // Log top 5 nodes by pixel count for inspection
                    const ranked = (this.simulation.nodes || []).slice().sort((a,b) => (b.pixels.length||0) - (a.pixels.length||0)).slice(0,5);
                    try { if (this.simulation && this.simulation.CONFIG && this.simulation.CONFIG.DEBUG && this.simulation.CONFIG.DEBUG.performance) {
                        ranked.forEach((n, idx) => {
                            logger.debug('performance', `#${idx+1} node @ (${n.x},${n.y}) pixels=${n.pixels.length}`);
                        });
                    } } catch(e){}
                }
            } catch (e) { /* ignore logging errors */ }
        }, 1000);
    }

    stopRealtimeLogging() {
        if (this._realtimeInterval) {
            clearInterval(this._realtimeInterval);
            this._realtimeInterval = null;
        }
    }

    shouldLogPerformance() {
        const now = performance.now();
        if (now - this.performanceMetrics.lastPerformanceLog > 5000) {
            this.logPerformanceMetrics();
            this.performanceMetrics.lastPerformanceLog = now;
            return true;
        }
        return false;
    }

    updateMetric(metric, value) {
        this.performanceMetrics[metric] = value;
    }

    getMetrics() {
        return { ...this.performanceMetrics };
    }
}
