import { PRESETS, getPreset } from './config-presets.js';

export const CONFIG = {
    MAP: {
        WIDTH: 500,
        HEIGHT: 500,
        BACKGROUND_COLOR: '#1a1a1a'
    },
    NODE: {
        SIZE: 3,
        COLOR: '#4CAF50',
        MAX_NODES: 8,
        SPAWN_THRESHOLD: 10,
        SPAWN_COST: 10,
        SPAWN_COOLDOWN: 5000,
        FOOD_PER_PIXEL: 1,
        GROWTH_BRANCH_CHANCE: 0.18,
        GROWTH_THICKNESS: 1,
        GROWTH_RANDOM_DIR_CHANGE: 0.2,
        BASE_GROWTH_CHANCE: 0,
        MAX_PIXELS: 250
    },
    ALLOW_IMMEDIATE_MULTI_SPAWN: false,
    DEBUG_FORCE_MULTI_SPAWN: false,
    GROWTH_ACTIONS_PER_FRAME: 1,
    GROWTH_STEP_PIXELS: 1,
    GROWTH_CONTINUOUS: false,
    GROWTH_QUEUE_MAX_SIZE: 20,
    MAX_GROWTH_PER_TICK: 2,
    DEBUG: {
        startup: false,
        performance: false,
        spawn: false,
        growth: false
    },
    INDIVIDUAL: {
        SIZE: 1,
        COLOR: '#2196F3',
        MOVEMENT_SPEED: 1,
        DETECTION_RANGE: 15,
        CARRYING_CAPACITY: 2,
        ENERGY_CONSUMPTION: 1,
        MAX_ENERGY: 3000,
        INITIAL_ENERGY: 3000
    },
    FOOD: {
        COLOR_HIDDEN: '#1a1a1a',
        COLOR_REVEALED: '#FFC107'
    },
    SIMULATION: {
        FPS: 60,
        MAX_UPDATES_PER_FRAME: 1,
        MAX_INDIVIDUALS: 25,
        DROPPER_MILESTONE_INTERVAL: 150,
        INITIAL_IMMUNITY_ENABLED: true
    },
    TERRAIN: {
        ENABLED: false,
        NOISE_SCALE: 0.01,
        OCTAVES: 3,
        PERSISTENCE: 0.5,
        ENERGY_MULTIPLIER: 2.0,
        GROWTH_COST_MULTIPLIER: 1.5
    }
};

CONFIG.RENDER = {
    OFFSCREEN_CANVAS_ENABLED: false,
    OFFSCREEN_CANVAS_SAVE_MEMORY: false,
    DIRTY_RECT_ENABLED: true,
    TRAILS_ENABLED: false,
    SILHOUETTE_BLUR_ENABLED: false,
    SILHOUETTE_BLUR_RADIUS: 6,
    MARCHING_SQUARES_ENABLED: false,
    MARCHING_SQUARES_STROKE_WIDTH: 2
};

// Apply visual preset only — never override performance caps above
const defaultPreset = getPreset('tendrils') || {};
if (defaultPreset.NODE) {
    const keep = {
        MAX_PIXELS: CONFIG.NODE.MAX_PIXELS,
        MAX_NODES: CONFIG.NODE.MAX_NODES,
        GROWTH_BRANCH_CHANCE: CONFIG.NODE.GROWTH_BRANCH_CHANCE,
        GROWTH_RANDOM_DIR_CHANGE: CONFIG.NODE.GROWTH_RANDOM_DIR_CHANGE
    };
    Object.assign(CONFIG.NODE, defaultPreset.NODE, keep);
}

export { PRESETS, getPreset };

/** Re-apply caps that must not be overridden by presets or live config edits. */
export function applyPerformanceLocks() {
    CONFIG.GROWTH_CONTINUOUS = false;
    CONFIG.GROWTH_ACTIONS_PER_FRAME = 1;
    CONFIG.GROWTH_STEP_PIXELS = 1;
    CONFIG.NODE.MAX_PIXELS = 250;
    CONFIG.NODE.MAX_NODES = 8;
    CONFIG.NODE.GROWTH_BRANCH_CHANCE = 0;
    CONFIG.SIMULATION.MAX_UPDATES_PER_FRAME = 1;
    CONFIG.SIMULATION.MAX_INDIVIDUALS = 25;
    CONFIG.RENDER.OFFSCREEN_CANVAS_ENABLED = false;
    CONFIG.RENDER.TRAILS_ENABLED = false;
    CONFIG.RENDER.DIRTY_RECT_ENABLED = false;
    CONFIG.TERRAIN.ENABLED = false;
    CONFIG.MAX_GROWTH_PER_TICK = 1;
    CONFIG.GROWTH_QUEUE_MAX_SIZE = 12;
}

applyPerformanceLocks();

export default CONFIG;
