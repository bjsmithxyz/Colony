import { CONSTANTS } from './constants.js';
import { directionToAngle } from './utils.js';

/**
 * TerrainMap - Generates and manages topographic terrain data
 * Provides height maps and gradient calculations for gameplay mechanics
 * (movement cost, growth cost) - no visual rendering
 */
export class TerrainMap {
    constructor(width, height, config = {}) {
        this.width = width;
        this.height = height;
        this.config = config;
        
        // Generate height map
        this.heightMap = this.generateHeightMap();
        
        // Pre-calculate gradients for performance
        this.gradientMap = this.calculateGradients();
    }

    /**
     * Generate height map using simple noise algorithm
     * Uses multiple octaves for natural-looking terrain
     */
    generateHeightMap() {
        const map = new Array(this.width * this.height);
        const scale = this.config.NOISE_SCALE || 0.01;
        const octaves = this.config.OCTAVES || 3;
        const persistence = this.config.PERSISTENCE || 0.5;
        
        let maxValue = -Infinity;
        let minValue = Infinity;
        
        // First pass: generate raw values
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let value = 0;
                let amplitude = 1;
                let frequency = scale;
                let maxAmp = 0;
                
                for (let i = 0; i < octaves; i++) {
                    value += this.noise(x * frequency, y * frequency) * amplitude;
                    maxAmp += amplitude;
                    amplitude *= persistence;
                    frequency *= 2;
                }
                
                // Normalize by max amplitude
                value = maxAmp > 0 ? value / maxAmp : 0;
                
                map[y * this.width + x] = value;
                if (value > maxValue) maxValue = value;
                if (value < minValue) minValue = value;
            }
        }
        
        // Second pass: normalize to 0-255 range
        const range = maxValue - minValue || 1;
        for (let i = 0; i < map.length; i++) {
            map[i] = Math.floor(((map[i] - minValue) / range) * CONSTANTS.TERRAIN_HEIGHT_RANGE);
        }
        
        return map;
    }

    /**
     * Simple 2D noise function (improved hash-based)
     */
    noise(x, y) {
        const n = Math.floor(x) + Math.floor(y) * 57;
        return this._hash(n) / 2147483647.0;
    }

    /**
     * Hash function for noise generation
     */
    _hash(n) {
        n = (n << 13) ^ n;
        return ((n * (n * n * CONSTANTS.HASH_PRIME_1 + CONSTANTS.HASH_PRIME_2) + CONSTANTS.HASH_PRIME_3) & CONSTANTS.HASH_MASK);
    }

    /**
     * Smooth interpolation between values
     */
    _smoothInterpolate(a, b, t) {
        t = t * t * (3 - 2 * t); // Smoothstep
        return a + (b - a) * t;
    }

    /**
     * Calculate gradient (steepness) at each point
     * Returns array of steepness values (0-1)
     */
    calculateGradients() {
        const gradients = new Array(this.width * this.height);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const center = this.getHeight(x, y);
                const right = this.getHeight(x + 1, y);
                const down = this.getHeight(x, y + 1);
                
                // Calculate gradient magnitude
                const dx = (right - center) / CONSTANTS.TERRAIN_HEIGHT_RANGE;
                const dy = (down - center) / CONSTANTS.TERRAIN_HEIGHT_RANGE;
                const gradient = Math.sqrt(dx * dx + dy * dy);
                
                // Normalize to 0-1 range
                gradients[y * this.width + x] = Math.min(1.0, gradient * 2);
            }
        }
        
        return gradients;
    }

    /**
     * Get height at specific coordinates
     */
    getHeight(x, y) {
        const ix = Math.floor(Math.max(0, Math.min(this.width - 1, x)));
        const iy = Math.floor(Math.max(0, Math.min(this.height - 1, y)));
        return this.heightMap[iy * this.width + ix];
    }

    /**
     * Get steepness/gradient at specific coordinates
     */
    getSteepness(x, y) {
        const ix = Math.floor(Math.max(0, Math.min(this.width - 1, x)));
        const iy = Math.floor(Math.max(0, Math.min(this.height - 1, y)));
        return this.gradientMap[iy * this.width + ix];
    }

    /**
     * Calculate movement cost multiplier based on terrain steepness
     * Returns multiplier (1.0 = flat, higher = steeper)
     */
    getMovementCost(x, y, dx = 0, dy = 0) {
        const steepness = this.getSteepness(x, y);
        const maxMultiplier = this.config.ENERGY_MULTIPLIER || 2.0;
        
        // Base cost from current position steepness
        let cost = 1.0 + (steepness * (maxMultiplier - 1.0));
        
        // If moving, consider direction of movement relative to gradient
        if (dx !== 0 || dy !== 0) {
            const nextX = x + dx;
            const nextY = y + dy;
            const nextSteepness = this.getSteepness(nextX, nextY);
            
            // Average cost of current and next position
            cost = (cost + (1.0 + (nextSteepness * (maxMultiplier - 1.0)))) / 2;
            
            // Additional cost if moving uphill
            const heightDiff = this.getHeight(nextX, nextY) - this.getHeight(x, y);
            if (heightDiff > 0) {
                cost += (heightDiff / CONSTANTS.TERRAIN_HEIGHT_RANGE) * 0.5; // Uphill penalty
            }
        }
        
        return cost;
    }

    /**
     * Get growth cost multiplier for node growth
     * Lower values = easier to grow, higher = harder
     */
    getGrowthCost(x, y, direction = null) {
        const steepness = this.getSteepness(x, y);
        const maxMultiplier = this.config.GROWTH_COST_MULTIPLIER || 1.5;
        
        // Base cost from steepness
        let cost = 1.0 + (steepness * (maxMultiplier - 1.0));
        
        // If direction provided, check if growing uphill
        if (direction) {
            const angle = typeof direction === 'string' ? directionToAngle(direction) : direction;
            const nextX = x + Math.cos(angle);
            const nextY = y + Math.sin(angle);
            const heightDiff = this.getHeight(nextX, nextY) - this.getHeight(x, y);
            
            if (heightDiff > 10) { // Significant uphill
                cost += 0.3; // Discourage uphill growth
            } else if (heightDiff < -10) { // Downhill
                cost -= 0.2; // Encourage downhill growth
            }
        }
        
        return Math.max(CONSTANTS.TERRAIN_MIN_GROWTH_COST, cost);
    }

    /**
     * Render method - no visual overlay, terrain data only affects gameplay
     */
    render(ctx) {
        // No visual rendering - terrain only affects movement and growth costs
        return;
    }


}

