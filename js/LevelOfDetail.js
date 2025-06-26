import { CONFIG } from './config.js';

export class LevelOfDetail {
    constructor(viewportWidth, viewportHeight) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.viewportCenterX = viewportWidth / 2;
        this.viewportCenterY = viewportHeight / 2;
        
        // LOD distance thresholds
        this.LOD_DISTANCES = {
            HIGH: 80,    // Full detail rendering
            MEDIUM: 150, // Simplified rendering
            LOW: 250,    // Basic rendering
            CULL: 350    // No rendering (outside view)
        };
        
        // LOD rendering modes
        this.LOD_MODES = {
            HIGH: 'HIGH',
            MEDIUM: 'MEDIUM', 
            LOW: 'LOW',
            CULL: 'CULL'
        };
        
        // Performance tracking
        this.stats = {
            totalEntities: 0,
            highLOD: 0,
            mediumLOD: 0,
            lowLOD: 0,
            culled: 0
        };
    }
    
    /**
     * Calculate LOD level for an entity based on distance from viewport center
     */
    calculateLOD(entityX, entityY) {
        const dx = entityX - this.viewportCenterX;
        const dy = entityY - this.viewportCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.LOD_DISTANCES.HIGH) {
            return this.LOD_MODES.HIGH;
        } else if (distance <= this.LOD_DISTANCES.MEDIUM) {
            return this.LOD_MODES.MEDIUM;
        } else if (distance <= this.LOD_DISTANCES.LOW) {
            return this.LOD_MODES.LOW;
        } else {
            return this.LOD_MODES.CULL;
        }
    }
    
    /**
     * Batch calculate LOD for multiple entities
     */
    batchCalculateLOD(entities) {
        const lodData = [];
        
        // Reset stats
        this.stats.totalEntities = entities.length;
        this.stats.highLOD = 0;
        this.stats.mediumLOD = 0;
        this.stats.lowLOD = 0;
        this.stats.culled = 0;
        
        for (const entity of entities) {
            const lod = this.calculateLOD(entity.x, entity.y);
            lodData.push({ entity, lod });
            
            // Update stats
            switch (lod) {
                case this.LOD_MODES.HIGH:
                    this.stats.highLOD++;
                    break;
                case this.LOD_MODES.MEDIUM:
                    this.stats.mediumLOD++;
                    break;
                case this.LOD_MODES.LOW:
                    this.stats.lowLOD++;
                    break;
                case this.LOD_MODES.CULL:
                    this.stats.culled++;
                    break;
            }
        }
        
        return lodData;
    }
    
    /**
     * Group entities by LOD level for efficient batch rendering
     */
    groupByLOD(entities) {
        const groups = {
            [this.LOD_MODES.HIGH]: [],
            [this.LOD_MODES.MEDIUM]: [],
            [this.LOD_MODES.LOW]: [],
            [this.LOD_MODES.CULL]: []
        };
        
        const lodData = this.batchCalculateLOD(entities);
        
        for (const { entity, lod } of lodData) {
            groups[lod].push(entity);
        }
        
        return groups;
    }
    
    /**
     * Render individuals with appropriate LOD
     */
    renderIndividuals(ctx, individuals) {
        const groups = this.groupByLOD(individuals);
        
        // High LOD - full detail
        if (groups.HIGH.length > 0) {
            for (const individual of groups.HIGH) {
                individual.render(ctx);
            }
        }
        
        // Medium LOD - simplified rendering (no food indicators)
        if (groups.MEDIUM.length > 0) {
            ctx.fillStyle = CONFIG.INDIVIDUAL.COLOR;
            for (const individual of groups.MEDIUM) {
                ctx.fillRect(
                    Math.floor(individual.x),
                    Math.floor(individual.y),
                    individual.size,
                    individual.size
                );
            }
        }
        
        // Low LOD - basic dots
        if (groups.LOW.length > 0) {
            ctx.fillStyle = CONFIG.INDIVIDUAL.COLOR;
            for (const individual of groups.LOW) {
                ctx.fillRect(
                    Math.floor(individual.x),
                    Math.floor(individual.y),
                    1,
                    1
                );
            }
        }
        
        // Cull - don't render
        // (groups.CULL entities are not rendered)
    }
    
    /**
     * Render nodes with appropriate LOD
     */
    renderNodes(ctx, nodes) {
        const groups = this.groupByLOD(nodes);
        
        // High LOD - full detail with all pixels
        if (groups.HIGH.length > 0) {
            for (const node of groups.HIGH) {
                node.render(ctx);
            }
        }
        
        // Medium LOD - simplified circle representation
        if (groups.MEDIUM.length > 0) {
            ctx.fillStyle = CONFIG.NODE.COLOR;
            for (const node of groups.MEDIUM) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Low LOD - small square
        if (groups.LOW.length > 0) {
            ctx.fillStyle = CONFIG.NODE.COLOR;
            for (const node of groups.LOW) {
                ctx.fillRect(
                    node.x - 2,
                    node.y - 2,
                    4,
                    4
                );
            }
        }
        
        // Cull - don't render
    }
    
    /**
     * Render food sources with appropriate LOD
     */
    renderFoodSources(ctx, foodSources) {
        const groups = this.groupByLOD(foodSources);
        
        // High LOD - full detail
        if (groups.HIGH.length > 0) {
            for (const foodSource of groups.HIGH) {
                foodSource.render(ctx);
            }
        }
        
        // Medium LOD - simplified cluster
        if (groups.MEDIUM.length > 0) {
            ctx.fillStyle = CONFIG.FOOD.COLOR_REVEALED;
            for (const foodSource of groups.MEDIUM) {
                if (!foodSource.depleted && foodSource.revealed) {
                    ctx.beginPath();
                    ctx.arc(foodSource.centerX, foodSource.centerY, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Low LOD - single pixel
        if (groups.LOW.length > 0) {
            ctx.fillStyle = CONFIG.FOOD.COLOR_REVEALED;
            for (const foodSource of groups.LOW) {
                if (!foodSource.depleted && foodSource.revealed) {
                    ctx.fillRect(foodSource.centerX, foodSource.centerY, 1, 1);
                }
            }
        }
        
        // Cull - don't render
    }
    
    /**
     * Update viewport center (for camera movement in future)
     */
    updateViewport(centerX, centerY) {
        this.viewportCenterX = centerX;
        this.viewportCenterY = centerY;
    }
    
    /**
     * Adjust LOD distances based on performance
     */
    adjustLODDistances(performanceMetrics) {
        // If FPS is low, reduce LOD distances to improve performance
        if (performanceMetrics.fps < 30) {
            this.LOD_DISTANCES.HIGH = Math.max(60, this.LOD_DISTANCES.HIGH - 5);
            this.LOD_DISTANCES.MEDIUM = Math.max(120, this.LOD_DISTANCES.MEDIUM - 10);
            this.LOD_DISTANCES.LOW = Math.max(200, this.LOD_DISTANCES.LOW - 15);
        } 
        // If FPS is good, gradually increase LOD distances
        else if (performanceMetrics.fps > 55) {
            this.LOD_DISTANCES.HIGH = Math.min(100, this.LOD_DISTANCES.HIGH + 1);
            this.LOD_DISTANCES.MEDIUM = Math.min(180, this.LOD_DISTANCES.MEDIUM + 2);
            this.LOD_DISTANCES.LOW = Math.min(280, this.LOD_DISTANCES.LOW + 3);
        }
    }
    
    /**
     * Get performance statistics
     */
    getStats() {
        return {
            ...this.stats,
            cullingRatio: this.stats.totalEntities > 0 ? 
                (this.stats.culled / this.stats.totalEntities * 100).toFixed(1) + '%' : '0%',
            lodDistances: { ...this.LOD_DISTANCES }
        };
    }
}
