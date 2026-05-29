import { CONSTANTS } from './constants.js';
import { pickRandomDirection } from './growth/terrainWeights.js';
import { growInDirection } from './growth/directionalGrowth.js';
import { growTowardWorldPoint } from './growth/towardPointGrowth.js';
import { flushPendingMerges } from './growth/pixelOps.js';

/**
 * Node Growth Manager — orchestrates queue processing and delegates growth logic
 * to focused modules under js/growth/.
 */
export class NodeGrowthManager {
    constructor(node) {
        this.node = node;

        this.growthDirections = {
            north: { length: 0, supportLevel: 0 },
            northeast: { length: 0, supportLevel: 0 },
            east: { length: 0, supportLevel: 0 },
            southeast: { length: 0, supportLevel: 0 },
            south: { length: 0, supportLevel: 0 },
            southwest: { length: 0, supportLevel: 0 },
            west: { length: 0, supportLevel: 0 },
            northwest: { length: 0, supportLevel: 0 }
        };
        this.totalGrowth = 0;
        this._growthQueue = [];
        this._lastProcessedFood = (this.node && typeof this.node.lastFoodAmount === 'number') ? this.node.lastFoodAmount : 0;
        this._reservedPixels = 0;
        this._updateMaxQueueSize();
    }

    _updateMaxQueueSize() {
        const cfg = this.node?.simulation?.CONFIG;
        this._maxQueueSize = (cfg && typeof cfg.GROWTH_QUEUE_MAX_SIZE === 'number') ? cfg.GROWTH_QUEUE_MAX_SIZE : 100;
    }

    _dbg() {
        return !!(this.node?.simulation?.CONFIG?.DEBUG?.growth);
    }

    processGrowth(amount, sourceDirection = null, depositLocation = null) {
        if (amount <= 0) return;

        const cfgNode = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
        const perPixel = (cfgNode && cfgNode.FOOD_PER_PIXEL) ? cfgNode.FOOD_PER_PIXEL : 1;
        const oldPixels = Math.floor(this.node.lastFoodAmount / perPixel);
        const newPixels = Math.floor(this.node.food / perPixel);
        let delta = Math.max(0, newPixels - oldPixels);

        try {
            if (this._dbg()) console.log('processGrowth computed', { nodeX: this.node.x, nodeY: this.node.y, amount, oldPixels, newPixels, delta });
            else console.debug?.('processGrowth', { x: this.node.x, y: this.node.y, amount, oldPixels, newPixels, delta });
        } catch (e) {}

        const topCfg = this.node.simulation ? this.node.simulation.CONFIG : null;
        if (topCfg && typeof topCfg.MAX_GROWTH_PER_TICK === 'number') delta = Math.min(delta, topCfg.MAX_GROWTH_PER_TICK);
        if (delta <= 0) return;

        const continuous = topCfg && topCfg.GROWTH_CONTINUOUS;
        this._updateMaxQueueSize();

        for (let i = 0; i < delta; i++) {
            if (this._growthQueue.length >= this._maxQueueSize) {
                if (this._dbg()) console.warn('Growth queue full, dropping growth action', this.node.x, this.node.y);
                break;
            }

            if (depositLocation) {
                this._growthQueue.push({ type: 'toward', point: depositLocation });
                if (this._dbg()) console.log('Enqueued toward growth', this.node.x, this.node.y, depositLocation);
                this._reservedPixels++;
                continue;
            }

            if (sourceDirection) {
                if (!continuous) {
                    this._growthQueue.push({ type: 'direction', direction: sourceDirection });
                    this._reservedPixels++;
                    if (this._dbg()) console.log('Enqueued dir growth', this.node.x, this.node.y, sourceDirection);
                }
                continue;
            }

            if (continuous) {
                this._lastProcessedFood = this.node.food;
                continue;
            }

            const dir = pickRandomDirection(this.node, this.growthDirections);
            this._growthQueue.push({ type: 'direction', direction: dir });
            this._reservedPixels++;
            if (this._dbg()) console.log('Enqueued rand growth', this.node.x, this.node.y, dir);
        }
    }

    tick() {
        const cfg = this.node.simulation ? this.node.simulation.CONFIG : null;
        const actionsPerFrame = (cfg && typeof cfg.GROWTH_ACTIONS_PER_FRAME === 'number') ? cfg.GROWTH_ACTIONS_PER_FRAME : 2;
        let processed = 0;

        try {
            const nodeCfg = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
            const baseChance = (nodeCfg && typeof nodeCfg.BASE_GROWTH_CHANCE === 'number') ? nodeCfg.BASE_GROWTH_CHANCE : 0;
            const spawnReserve = (nodeCfg && typeof nodeCfg.SPAWN_THRESHOLD === 'number') ? nodeCfg.SPAWN_THRESHOLD : 0;
            const hasGrowthFood = this.node.food > spawnReserve;
            if (hasGrowthFood && Math.random() < baseChance) {
                const dirs = Object.keys(this.growthDirections);
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                growInDirection(this, dir, 1);
            }
        } catch (e) {}

        try {
            if (this._growthQueue.length > 0) {
                if (this._dbg()) console.log('tick starting with queue', this._growthQueue.length, 'actionsPerFrame', actionsPerFrame, 'node', this.node.x, this.node.y);
                else console.debug?.('tick queue', this._growthQueue.length, 'apf', actionsPerFrame, 'node', this.node.x, this.node.y);
            }
        } catch (e) {}

        while (processed < actionsPerFrame && this._growthQueue.length > 0) {
            const action = this._growthQueue.shift();
            if (this._dbg()) console.log('Processing growth action', action, 'for node', this.node.x, this.node.y);
            const maxPerAction = (cfg && typeof cfg.GROWTH_STEP_PIXELS === 'number') ? cfg.GROWTH_STEP_PIXELS : 1;
            const pixelsToGrow = 1 + Math.floor(Math.random() * maxPerAction);

            if (action.type === 'toward') {
                for (let p = 0; p < pixelsToGrow; p++) growTowardWorldPoint(this, action.point);
                if (this._reservedPixels > 0) this._reservedPixels = Math.max(0, this._reservedPixels - pixelsToGrow);
            } else if (action.type === 'direction') {
                growInDirection(this, action.direction, pixelsToGrow);
                if (this._reservedPixels > 0) this._reservedPixels = Math.max(0, this._reservedPixels - pixelsToGrow);
            }
            processed++;
        }

        this._processContinuousGrowth(cfg, actionsPerFrame);
        if (typeof this.node.finalizePixelMaintenance === 'function') {
            this.node.finalizePixelMaintenance();
        }
        flushPendingMerges(this);
    }

    _processContinuousGrowth(cfg, actionsPerFrame) {
        try {
            if (!cfg?.GROWTH_CONTINUOUS) return;
            const maxPixels = this.node.simulation?.CONFIG?.NODE?.MAX_PIXELS ?? CONSTANTS.DEFAULT_MAX_PIXELS_PER_NODE;
            if (this.node.pixels.length >= maxPixels) return;

            const nodeCfg = this.node.simulation ? this.node.simulation.CONFIG.NODE : null;
            const perPixel = (nodeCfg && nodeCfg.FOOD_PER_PIXEL) ? nodeCfg.FOOD_PER_PIXEL : 1;
            const maxPerAction = (cfg && typeof cfg.GROWTH_STEP_PIXELS === 'number') ? cfg.GROWTH_STEP_PIXELS : 1;
            const availablePixels = Math.floor(this.node.food / perPixel);
            const processedPixels = Math.floor((this._lastProcessedFood || 0) / perPixel);
            let deltaPixels = Math.max(0, availablePixels - processedPixels);

            if (deltaPixels <= 0) return;

            const cap = Math.max(1, actionsPerFrame * maxPerAction - this._reservedPixels);
            let toConvert = Math.min(deltaPixels, cap);
            const spawnThresh2 = (nodeCfg && typeof nodeCfg.SPAWN_THRESHOLD === 'number') ? nodeCfg.SPAWN_THRESHOLD : 0;

            while (toConvert > 0) {
                const maxConsumable = Math.max(0, this.node.food - spawnThresh2);
                if (maxConsumable < perPixel) break;
                const step = Math.min(toConvert, Math.min(1 + Math.floor(Math.random() * maxPerAction), Math.floor(maxConsumable / perPixel)));
                if (step <= 0) break;

                const dir = pickRandomDirection(this.node, this.growthDirections);
                growInDirection(this, dir, step);
                const consumed = step * perPixel;
                this.node.food = Math.max(0, this.node.food - consumed);
                toConvert -= step;
                this._lastProcessedFood = this.node.food;
            }
        } catch (e) {}
    }

    getMaxGrowthExtent() {
        return Math.max(...Object.values(this.growthDirections).map(g => g.length));
    }
}
